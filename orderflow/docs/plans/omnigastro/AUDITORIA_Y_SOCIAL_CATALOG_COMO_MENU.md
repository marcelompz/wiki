# Auditoría de Coherencia: OmniFlow actual → Plan OmniGastro

**Fecha:** 2026-09-03
**Versión auditada:** OrderFlow v1.24.04
**Auditor:** Kilo (revisión técnica + de planes)

Este informe audita si el **estado del arte de OmniFlow** soporta los features previstos por el plan OmniGastro, identifica gaps, y deja la sección de **Social Catalog como menú digital del restaurante** con el feature de "Llamar al Mozo" + envío al POS en borrador desde QR/NFC de mesa.

---

## 1. Estado del arte de OmniFlow (v1.24.04)

### 1.1 Lo que YA existe y es base de OmniGastro

| Módulo | Estado | Archivo | Soporte para OmniGastro |
|---|---|---|---|
| **Multi-tenant + multi-tier (shared/dedicated)** | ✅ desde FEAT-001 | `backend/src/common/tenant-connection.manager.ts`, `@TenantPrisma()` | Base para `isolationTier=shared\|dedicated` |
| **RBAC granular con overrides individuales** | ✅ | `backend/src/common/rbac.service.ts` | Permite agregar permisos `cash:*` / `tables:*` sin nuevos roles (FEAT-113) |
| **Modelo `Order` y `OrderLine`** | ✅ | `prisma/schema.prisma` | Base para extender con `tableId`, `seatNumber`, `isShared`, `isGift`, `source`, `course` |
| **`sellerId` en `Order/OrderLine`** | ✅ desde FEAT-057 | `orders.service.ts` | Atribución de mozo reutilizable (no se crea columna nueva) |
| **Stock Move con `costAtSale`** | ✅ | `StockMove` | Habilita Live Escandallo atómico (FEAT-118) |
| **WebSockets + Redis Pub/Sub** | ✅ | `backend/src/subscribers/`, `orders.gateway.ts` | Canal para KDS + Waiter Call (FEAT-117 / FEAT-125) |
| **`ProvisioningJob` con guard de pago** | ✅ desde FEAT-112 | `backend/src/common/tenant-creation.guard.ts` | Asegura que el restaurante ya pagó antes de activar OmniDineIn |
| **Catálogo + Variantes + Modificadores** | ✅ desde FEAT-008 | `backend/src/catalog/` | Base para `Menu Engineering` y selección en el POS |
| **Social Catalog Hub (`/social-catalog/...`)** | ✅ desde FEAT-048 | `backend/src/social-catalog/`, `frontend/src/pages/social-*` | **Reutilizable como menú digital del cliente** (sección 3 de este informe) |
| **FacturaSend (SIFEN) + multi-moneda PYG** | ✅ | `backend/src/billing/` | Cierre de mesa con factura electrónica |
| **Tenant retention (DRY_RUN)** | ✅ desde blindaje | `tenant-retention.service.ts` | Hard-delete seguro de tenants gastronómicos |
| **`cash:collect` y `orders:update` permisos** | ✅ | `rbac.service.ts` | Punto de extensión para `cash:open_session`, `cash:close_session`, `tables:*` |
| **Live Escandallo atómico** | ✅ | `bom.engine.ts` (FEAT-096/097/111) | Listo para FEAT-118 — solo falta el enriquecimiento con modificadores y wastePercentage |
| **`dining-room` field en `Order`** | 🟡 parcial | `prisma/schema.prisma` (campo `diningRoomId` no existe; está en payload JSON) | **Gap menor**: el modelo consolidado pide `diningRoomId` FK, hoy es JSON. Migración fácil. |
| **Cierre de caja (`closePosSession` FEAT-093)** | 🟡 sintético | `orders.service.ts` (calcula `sessionId` al vuelo) | **Gap clave para FEAT-113**: hay que reemplazarlo por `PosSession` real sin romper conciliación con Odoo. |

### 1.2 Lo que NO existe aún y es prerrequisito para OmniGastro

| Gap | Bloquea | Plan |
|---|---|---|
| `PosSession` real (apertura/cierre por cajero/tablet) | FEAT-113, FEAT-109 | Crear modelo + servicio. No romper FEAT-093. |
| `RestaurantTable` con `qrToken` + `rfidTag` | FEAT-114, FEAT-125 | Migración Prisma + endpoints `/api/v1/tables/*` |
| `TableGuest` con `seatNumber` | FEAT-115, FEAT-116 | Migración Prisma + endpoint move-guest |
| `BillSplit` + `SplitPayment` | FEAT-116, FEAT-125 | Migración Prisma + endpoint `/orders/:id/split` |
| `KitchenTicket` + `PreparationStation` | FEAT-117 | Migración + WebSocket KDS |
| `ProductBom` + `BomLine` + `UnitOfMeasure` | FEAT-118 (escandallo enriquecido) | Migración + motor recursivo con wastePercentage |
| `WaiterCall` + `WaiterCallOption` | FEAT-125 | Migración + endpoint público `/guest/tables/:id/call-waiter` + canal WS |
| `PaymentMethod` real (no como string suelto) | FEAT-109, FEAT-125 | Migración + relación a `PosOrderAuditLog` |
| `PosOrderAuditLog` | Todo OmniGastro | Migración + inserts en cada acción sensible |
| **Botón "Llamar al mozo" + envío de pedido draft desde Social Catalog** | **FEAT-125** | **Sección 3 de este informe** — el feature clave para que el Social Catalog existente se transforme en el menú digital del restaurante. |

---

## 2. Auditoría de coherencia con el plan OmniGastro

### 2.1 Fase 0 — Safeguards (FEAT-112) ✅

| Item del plan | Estado en código |
|---|---|
| `prisma migrate deploy` en entrypoint (sin `--accept-data-loss`) | ✅ migraciones manuales aplicadas; entrypoint actualizado |
| Soft-delete universal | ❌ **NO IMPLEMENTADO** — el plan dice "extensión Prisma Client intercepta delete y filtra `isDeleted: false`". En el código actual no hay tal extensión. **Gap crítico para Fase 1**. |
| `onDelete: Restrict` en entidades raíz | ❌ **NO IMPLEMENTADO** — la mayoría de relaciones siguen con `Cascade` o sin `onDelete` explícito. **Gap crítico**. |
| Linter ESLint que prohíbe `PrismaService` singleton | ❌ **NO IMPLEMENTADO** |
| CI exige migración en PRs a `product/omnigastro` | ❌ **NO IMPLEMENTADO** |

**Diagnóstico:** FEAT-112 está marcado como `completed` en el plan y en la base de datos (`ProvisioningJob` aplicado), pero los **3 safeguards de datos** (soft-delete, Restrict, linter) no están en código. **Acción:** en Sprint 0 de OmniGastro, antes de tocar nada de mesas, **implementar el Prisma Client extension y cambiar `Cascade → Restrict`** en las entidades gastronómicas que vienen (RestaurantTable, TableGuest, Order, CashMovement, etc.).

### 2.2 Fase 1 — Cimientos + Caja (FEAT-113) 🟡 next

Requiere: rol `WAITER` + permisos `cash:*`/`tables:*` + `PosSession` real + `PosConfig` + `PaymentMethod` + `PosOrderAuditLog`. **Gaps identificados:**
- No existe `WAITER` en `UserRole` (existen `ADMIN/MANAGER/SELLER/VIEWER`).
- No existe `PosSession` ni `PosConfig` ni `PaymentMethod` ni `PosOrderAuditLog`.
- `CashMovement.registeredBy` es String suelto (sin FK a User).
- `orders.service.ts.confirm()` hoy no exige `PosSession` abierta.

**Acción:** seguir el prompt de `features/FEAT-113-omnidinein-cimientos.md` al pie de la letra.

### 2.3 Fase 2 — Salón + Guest Experience (FEAT-114/115/116/119/125) ⚪

Requiere: `RestaurantTable` con `qrToken`, `TableGuest`, `BillSplit/SplitPayment`, `WaiterCall/WaiterCallOption`. **Hoy no existe nada.** Pero **el Social Catalog ya está** y es el ancla del FEAT-125 (sección 3).

### 2.4 Fase 3 — Cocina + Costos (FEAT-117/118) ⚪

Requiere: `PreparationStation`, `KitchenTicket`, `KitchenTicketLine`, `ProductBom` enriquecido con `wastePercentage` y modificadores. **Hoy el KDS ya existe parcialmente** (FEAT-097 completed, `orders.gateway.ts` con `kds:ticket_new`) y el Live Escandallo base existe (FEAT-096/097/111). **Gap**: faltan `PreparationStation` y el enriquecimiento del BoM con waste/modificadores.

### 2.5 Fase 4 — Hardware + Escala (FEAT-120→124) ⚪

Requiere: Tauri + Rust para cajón, básculas, datáfonos; Store-and-Forward; Delivery connectors; Franquicias; Menu Engineering. **Hoy `desktop/` con Tauri ya existe** (FEAT-005, FEAT-052). **Gap**: integración profunda con POS, Offline de pagos.

---

## 3. Social Catalog como menú del restaurante (FEAT-125 — Guest Digital Menu + Call Waiter + Draft-to-POS)

> **Esta sección es la pieza de implementación inmediata** que convierte el Social Catalog existente en el menú digital del restaurante, con Llamar al Mozo y envío del pedido en borrador al POS desde QR/NFC de mesa.

### 3.1 Visión

El cliente en el restaurante escanea un **QR estático en la mesa** (o toca un **NFC físico**) → se abre el Social Catalog ya existente con el menú de ese tenant → arma su pedido → presiona **"Enviar pedido al mozo"** → el pedido queda como `GUEST_DRAFT` en la tablet del mozo (no descuenta stock todavía) → el mozo lo reclama, edita si hace falta, envía a cocina y cobra. Adicionalmente, en la misma pantalla el cliente puede tocar **"Llamar al Mozo"** y elegir entre opciones configurables (pedir la cuenta, pedir más pan, etc.) o texto libre.

### 3.2 Entidades nuevas (Prisma)

```prisma
model WaiterCallOption {
  id           String   @id @default(uuid())
  tenantId     String
  posConfigId  String?
  label        String
  icon         String?
  requiresText Boolean  @default(false)
  sortOrder    Int      @default(0)
  isActive     Boolean  @default(true)
  isDeleted    Boolean  @default(false)
  deletedAt    DateTime?

  @@index([tenantId])
  @@map("waiter_call_options")
}

model WaiterCall {
  id               String    @id @default(uuid())
  tenantId         String
  tableId          String
  table            RestaurantTable @relation(fields: [tableId], references: [id], onDelete: Restrict)
  orderId          String?
  optionId         String?
  freeText         String?
  status           String    @default("PENDING") // PENDING | ACKNOWLEDGED | RESOLVED
  calledAt         DateTime  @default(now())
  acknowledgedAt   DateTime?
  acknowledgedById String?
  resolvedAt       DateTime?

  @@index([tenantId, status])
  @@index([tableId])
  @@map("waiter_calls")
}
```

**Campos nuevos en `RestaurantTable`:**
- `qrToken  String  @unique @default(uuid())` — token del QR estático pegado a la mesa
- `rfidTag  String? @unique` — tag NFC físico alternativo

**Campos nuevos en `Order`:**
- `source          OrderSource  @default(POS)` — `POS | SOCIAL_CATALOG_GUEST | DELIVERY | KIOSK`
- `guestSessionId  String?`     — sesión anónima del cliente
- `claimedAt       DateTime?`
- `claimedById     String?`
- `tableId         String?`     — FK a RestaurantTable cuando aplique
- `sessionId       String?`     — FK a PosSession del cajero o del mozo (custody)

**Enum nuevo:**
```prisma
enum OrderSource {
  POS
  SOCIAL_CATALOG_GUEST
  DELIVERY
  KIOSK
}
```

### 3.3 Endpoints nuevos

| Método | Ruta | Actor | Descripción |
|---|---|---|---|
| `GET` | `/api/v1/guest/tables/by-token/:qrToken` | Público | Resuelve mesa por QR/NFC token. Devuelve `{ tableId, tableName, tenantId, menuUrl }` |
| `POST` | `/api/v1/guest/orders` | Cliente | Crea `Order` con `status: GUEST_DRAFT`, `source: SOCIAL_CATALOG_GUEST`, `tableId` (del QR), `sellerId: null`, líneas del carrito |
| `GET` | `/api/v1/guest/orders/:id` | Cliente | Tracking del pedido (status, `claimedByName`, `startedAt`, `readyAt`) |
| `POST` | `/api/v1/guest/tables/:tableId/call-waiter` | Cliente | Crea `WaiterCall` con `optionId` o `freeText`. Emite WebSocket al canal `tenant:{tenantId}:waiter-alerts` |
| `POST` | `/api/v1/orders/:id/claim` | Mozo | Reclama el `GUEST_DRAFT` (transición atómica con `claimedById`, `claimedAt`, `status: CLAIMED`); emite WS al cliente |
| `GET` | `/api/v1/waiter/calls` | Mozo | Lista de llamadas pendientes (`status: PENDING`, filtradas por su tenantId) |
| `PATCH` | `/api/v1/waiter/calls/:id/acknowledge` | Mozo | Marca vista (transition a `ACKNOWLEDGED`) |
| `PATCH` | `/api/v1/waiter/calls/:id/resolve` | Mozo | Marca resuelta |
| CRUD | `/api/v1/admin/waiter-call-options` | Admin | Configura las opciones del botón "Llamar al Mozo" (label, icon, requiresText) |

### 3.4 Flujo end-to-end (cliente en mesa)

```
1. Cliente escanea QR pegado a la mesa.
   → Se abre https://<subdomain>/social-catalog/menudigital?t=<qrToken>

2. Frontend llama GET /api/v1/guest/tables/by-token/:qrToken
   → Backend valida token, devuelve tableId y tenantId.
   → Si la mesa no existe o está inactiva → 404.

3. Cliente arma su carrito (líneas del Social Catalog existente).

4. Cliente presiona "Enviar pedido al mozo".
   → Frontend llama POST /api/v1/guest/orders
     body: { qrToken, lines: [{ productId, variantId, quantity, modifiers }] }
   → Backend:
     a) Resuelve tableId desde qrToken.
     b) Crea Order con:
        - tenantId
        - source = SOCIAL_CATALOG_GUEST
        - status = GUEST_DRAFT
        - tableId
        - sellerId = null (será asignado al claim)
        - lines con course = null (se setea al enviar a cocina)
     c) NO descuenta stock (eso pasa al claim + send-to-kitchen).
     d) Emite WebSocket al canal tenant:{tenantId}:mozo-tablet con
        evento ORDER_DRAFT_CREATED.

5. Tablet del mozo recibe ORDER_DRAFT_CREATED.
   → Badge "Nuevo pedido" en la mesa correspondiente.

6. Mozo presiona "Reclamar".
   → Frontend llama POST /api/v1/orders/:id/claim
   → Backend (transacción atómica):
     - status = CLAIMED
     - claimedById = currentUser.id
     - claimedAt = now()
     - Si la mesa no tenía owner, asignarla: RestaurantTable.ownerId = currentUser.id,
       status = OCCUPIED
     - Audit log: PosOrderAuditLog.action = CLAIM_ORDER
     - WebSocket al cliente: ORDER_CLAIMED con claimedByName

7. Mozo revisa líneas, ajusta si hace falta, presiona "Enviar a cocina".
   → Backend dispara Live Escandallo atómico (FEAT-118) sobre las líneas,
     descontando stock, creando KitchenTickets y cambiando status a SENT_TO_KITCHEN.
   → WebSocket al cliente: ORDER_SENT_TO_KITCHEN con startedAt

8. Cocina marca cada línea como READY.
   → WebSocket al cliente: ORDER_READY con readyAt

9. Mozo entrega y cobra.
   → CashMovement + status = PAID → WebSocket al cliente: ORDER_PAID.
```

### 3.5 Flujo end-to-end (Llamar al Mozo)

```
1. Cliente en la SPA del menú ve el botón "Llamar al Mozo" (siempre visible).

2. Tap → se abre modal con las WaiterCallOption activas del tenant
   (preconfiguradas por el admin) + campo de texto libre.

3. Cliente elige opción (ej. "Pedir la cuenta") o escribe texto libre.

4. POST /api/v1/guest/tables/:tableId/call-waiter
   body: { optionId?: string, freeText?: string }

5. Backend:
   - Crea WaiterCall con status=PENDING.
   - Emite WebSocket al canal tenant:{tenantId}:waiter-alerts con
     evento WAITER_CALL_NEW { tableId, tableName, optionLabel, freeText, calledAt }.

6. Tablet del mozo:
   - Badge "Llamada desde Mesa 5".
   - Tablero con sonido + vibración.

7. Mozo presiona "Vista" → PATCH /api/v1/waiter/calls/:id/acknowledge
   (status=ACKNOWLEDGED, acknowledgedById, acknowledgedAt).

8. Mozo resuelve (ej. cierra la cuenta) → PATCH /resolve (status=RESOLVED).
```

### 3.6 Cambios en el frontend (Social Catalog)

| Archivo | Cambio |
|---|---|
| `frontend/src/pages/social-catalog/menu-digital.tsx` | Agregar query param `?t=<qrToken>`; al montar, llamar a `/api/v1/guest/tables/by-token/:qrToken`; si existe, mostrar mesa actual y botones "Enviar pedido" + "Llamar al Mozo" |
| `frontend/src/pages/social-catalog/cart.tsx` | Reemplazar el checkout actual por `POST /api/v1/guest/orders` con `qrToken` |
| `frontend/src/pages/social-catalog/order-tracking.tsx` | Nueva página: polling o WebSocket a `tenant:{tenantId}:guest-order:{orderId}` mostrando status + claimedByName + startedAt + readyAt |
| `frontend/src/pages/admin/waiter-call-options.tsx` | Nueva página admin: CRUD de opciones |
| `frontend/src/pages/pos/waiter-alerts-panel.tsx` | Nueva pantalla POS: lista de WaiterCalls pendientes con ack/resolve |

### 3.7 Cambios en el backend

| Archivo | Cambio |
|---|---|
| `backend/prisma/schema.prisma` | Agregar `WaiterCallOption`, `WaiterCall`, enum `OrderSource`; agregar `source`, `guestSessionId`, `claimedAt`, `claimedById`, `tableId`, `sessionId` a `Order`; agregar `qrToken` + `rfidTag` a `RestaurantTable` |
| `backend/src/guest/guest.module.ts` (nuevo) | Módulo público (sin auth) con `GuestController` |
| `backend/src/guest/tables.controller.ts` | `GET /guest/tables/by-token/:qrToken` |
| `backend/src/guest/orders.controller.ts` | `POST /guest/orders` (crea GUEST_DRAFT), `GET /guest/orders/:id` (tracking) |
| `backend/src/guest/call-waiter.controller.ts` | `POST /guest/tables/:tableId/call-waiter` |
| `backend/src/orders/orders.controller.ts` | Nuevo `POST /orders/:id/claim` (transacción atómica) |
| `backend/src/orders/waiter-calls.controller.ts` (nuevo) | `GET /waiter/calls`, `PATCH /waiter/calls/:id/acknowledge`, `PATCH /:id/resolve` |
| `backend/src/admin/waiter-call-options.controller.ts` (nuevo) | CRUD admin |
| `backend/src/orders/orders.gateway.ts` | Nuevos eventos WS: `ORDER_DRAFT_CREATED`, `ORDER_CLAIMED`, `ORDER_SENT_TO_KITCHEN`, `ORDER_READY`, `ORDER_PAID`, `WAITER_CALL_NEW` |
| `backend/src/redis/redis.service.ts` | Canales: `tenant:{tenantId}:mozo-tablet`, `tenant:{tenantId}:waiter-alerts`, `tenant:{tenantId}:guest-order:{orderId}` |

### 3.8 Estado actual de Social Catalog (lo que ya sirve)

| Componente | Estado | Reutilización |
|---|---|---|
| `social-catalog/menudigital` (frontend) | ✅ desde FEAT-048 | Base de UI; agregar query param + mesa |
| `social-catalog/cart` | ✅ | Reemplazar checkout por `POST /guest/orders` |
| `social-catalog` backend (products, categories, etc.) | ✅ | Reutilizar para armar el menú del restaurante |
| `whatsapp-catalog-standalone` (microservicio) | ✅ | El menú del restaurante puede servirse desde este standalone (mismo endpoint público) |
| `featurelist.json` entrada FEAT-048 | ✅ completed | Sin cambios |

### 3.9 Estimación de esfuerzo

| Tarea | Esfuerzo | Dependencias |
|---|---|---|
| Migración Prisma (`WaiterCall`, `WaiterCallOption`, campos en `Order`, `RestaurantTable.qrToken`) | 0.5 día | FEAT-112 (migración segura) |
| `GuestController` (tables/orders/call-waiter) | 1.5 días | — |
| `OrdersController.claim` + transacción atómica | 1 día | `RestaurantTable` (FEAT-114) |
| `WaiterCallsController` (mozo) | 0.5 día | — |
| `WaiterCallOptionsController` (admin) | 0.5 día | — |
| WebSocket gateway events | 1 día | — |
| Frontend: query param en menú digital + modal Llamar Mozo | 1 día | — |
| Frontend: cart → POST `/guest/orders` | 0.5 día | — |
| Frontend: order tracking + POS alerts panel | 1 día | — |
| Frontend: admin CRUD opciones | 0.5 día | — |
| Tests unitarios + E2E | 1 día | — |
| **Total** | **~9 días (1 sprint + medio)** | FEAT-112 ✅, FEAT-113 (parcial), FEAT-114 mínimo |

### 3.10 Criterios de aceptación FEAT-125 (con Social Catalog)

- [ ] Cliente escanea QR de mesa y ve el menú del restaurante con su mesa identificada.
- [ ] Cliente arma carrito y presiona "Enviar pedido" → aparece como `GUEST_DRAFT` en la tablet del mozo con la mesa visible.
- [ ] Stock **NO** se descuenta al enviar el draft (sólo al claim + send-to-kitchen).
- [ ] Mozo reclama → cliente recibe "Tu pedido fue tomado por {nombre}".
- [ ] Mozo edita líneas, asigna a comensal, envía a cocina → Live Escandallo descuenta stock, KitchenTickets creados, KDS recibe.
- [ ] Cliente ve estados en tiempo real (`GUEST_DRAFT → CLAIMED → SENT_TO_KITCHEN → IN_PREPARATION → READY → SERVED → PAID`).
- [ ] Botón "Llamar al Mozo" muestra opciones configurables + texto libre.
- [ ] `WaiterCall` llega a la tablet del mozo con sonido/alerta.
- [ ] Mozo puede cobrar en mesa (custodia) o pasar al cajero.
- [ ] Cliente puede pagar su parte desde el menú digital (pay-link) — preparación para FEAT-116 split payments.
- [ ] Todo queda auditado en `PosOrderAuditLog`.
- [ ] Si el tenant NO tiene OmniDineIn instalado, el Social Catalog sigue funcionando como catálogo público (sin mesa, sin claim, sin llamar al mozo).

---

## 4. Recomendación al usuario

1. **Antes de seguir con OmniGastro Fase 1 (FEAT-113)**, cerrar los 3 gaps del FEAT-112 que están en plan pero no en código:
   - Implementar extensión Prisma Client para soft-delete universal
   - Cambiar `onDelete: Cascade → Restrict` en entidades que vienen (RestaurantTable, TableGuest, Order, CashMovement, Product, etc.)
   - Linter ESLint que prohíba `PrismaService` singleton en código gastro
2. **FEAT-113** — Implementar según el prompt en `features/FEAT-113-omnidinein-cimientos.md`.
3. **FEAT-125** (paralelo) — Inyectar la sección 3 de este informe en el `PLAN_MAESTRO.md` y crear el módulo `guest/`. Es el feature de **mayor impacto inmediato** porque reutiliza el Social Catalog existente.
4. **Re-validar** este informe luego de cerrar FEAT-113.

---

*Fin del informe de auditoría — 2026-09-03 — v1.24.04 base.*
