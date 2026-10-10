# Plan Maestro Consolidado: OmniGastro / OmniDineIn

**Proyecto:** OrderFlow / OmniFlow → OmniGastro  
**Módulo comercial:** OmniDineIn (add-on instalable vía `ModuleInstallation`)  
**Versión base de código:** 1.24.02  
**Fecha de actualización:** 27 de septiembre 2026  
**Documento oficial:** `docs/planes/pos-kds/PLAN_OMNIGASTRO.md`

---

## 0. Validación de Numeración de Features

Fuente de verdad: `featurelist.json` (last_updated 2026-09-01, `last_id: FEAT-111`).

Los IDs FEAT-105 a FEAT-111 ya están ocupados por otros módulos (OmniLedger, DataView, Capital Humano, Asistencia, Modifiers).  
Por tanto se asignó numeración nueva a partir de **FEAT-112**.

| ID | Título | Fase | Status | Depende de |
|----|--------|------|--------|------------|
| **FEAT-112** | OmniGastro Safeguards (Soft-delete + Restrict + @TenantPrisma linter + migrate deploy CI) | 0 | **completed** (3/3 en código, verificado 2026-09-18) | — |
| **FEAT-113** | OmniDineIn Cimientos: PosSession real + roles WAITER + permisos cash:* / tables:* | 1 | **completed** (PosSession + WAITER + permisos, verificado 2026-09-18) | FEAT-093, FEAT-097, FEAT-112 |
| **FEAT-114** | Mesas, Zonas, Mapa de Piso y Ownership del Mozo | 2 | planned | FEAT-113 |
| **FEAT-115** | Asientos / Comensales (TableGuest) + Traspaso entre mesas | 2 | planned | FEAT-114 |
| **FEAT-116** | Split Billing completo + Waiter Custody & Cashier Handover | 2 | planned | FEAT-115 |
| **FEAT-117** | KDS Coursing + Atribución de Mozo + Bump Bars | 3 | **completed** (KitchenTicketService + KdsController + assignCourseStage/advanceCourseStage + tests) | FEAT-097, FEAT-114 |
| **FEAT-118** | Live Escandallo Engine (POS BoM atómico completo + cache Redis) | 3 | **completed** (LiveEscandalloService + BomController + integración en OrdersService.sendToKitchen + tests) | FEAT-096, FEAT-097, FEAT-111 |
| **FEAT-119** | Seat-level Ordering + Punto Pivote + Cross-Table Gifting | 2/3 | planned | FEAT-115 |
| **FEAT-120** | Hardware Bridge Tauri/Rust avanzado (cajón, básculas, terminales de pago) | 4 | planned | FEAT-113 |
| **FEAT-121** | Pagos Offline Store-and-Forward + SDK Datáfonos | 4 | planned | FEAT-120 |
| **FEAT-122** | Delivery Connectors (Rappi / PedidosYa / Uber Eats → KDS) | 4 | planned | FEAT-117 |
| **FEAT-123** | Sindicación de Menús Multi-Sucursal / Franquicias | 4 | planned | FEAT-114 |
| **FEAT-124** | Menu Engineering + Auditoría de Mermas en tiempo real | 4 | planned | FEAT-118 |
| **FEAT-125** | Guest Digital Menu + Table Claim + Waiter Call (Social Catalog como menú vivo) | 2 | **completed** (DB migration 2026-09-18) | FEAT-113, FEAT-114, Social Catalog, FEAT-097 |
| **FEAT-147** | KDS Dynamic Routing por PreparationStation | 3 | **completed** | FEAT-121, FEAT-130 |
| **FEAT-148** | Product.showInKDS — Visibilidad por producto en KDS | 3 | **completed** | FEAT-147 |
| **FEAT-151** | KDS Configurable Multi-Estación + Impresión Selectiva (ESC/POS, cola BullMQ) | 3.1 | **completed** | FEAT-147, FEAT-148 |
| **FEAT-152** | KDS Product-Station Links (N:N) + Routing Multi-Destino por pedido | 3.1 | **completed** | FEAT-151 |

> **Nota:** FEAT-078 (“OmniPOS: Terminal POS Offline-First + KDS Nativo”) permanece como `superseded_by: FEAT-097`.

---

## 1. Visión y Principios

OmniGastro convierte OmniFlow en el **Sistema Operativo Restaurantero** completo, alcanzando paridad operativa con Toast POS y superándola en:

- Offline-first nativo (Dexie + Outbox)
- Soberanía multi-tier (Shared / Dedicated DB)
- Live Escandallo atómico (elimina stock fantasma)
- Arquitectura API-first + microservicios
- Cross-Table Gifting y Seat-level ordering
- **Guest Experience**: menú digital vivo + precuenta → pedido draft + llamada al mozo + tracking en tiempo real

**Principios no negociables:**

1. Data Safety First (soft-delete + Restrict + migrate deploy) — **FEAT-112 completed**
2. Tenant isolation sagrada (`@TenantPrisma()` únicamente)
3. Dominio gastronómico nativo (no reutilizar `Order` genérico para mesas abiertas)
4. Sistema de Acción (descuento de stock en el momento de la venta/despacho por el mozo)
5. Modularidad (OmniDineIn se instala/desinstala vía `ModuleInstallation`)
6. El cliente puede armar y enviar pedidos; el mozo valida, edita y confirma (stock y cocina solo en ese momento)

---

## 2. Fase 0 — Safeguards (FEAT-112) — COMPLETED

- Entrypoint ya usa `prisma migrate deploy`
- Soft-delete universal + extensión Prisma Client
- `onDelete: Restrict` en entidades raíz
- Linter que prohíbe `PrismaService` singleton en módulos gastro
- CI que exige migraciones en PRs a `product/omnigastro`

---

## 3. Modelo de Datos Unificado (Migración Prisma)

### 3.1 Enums principales

```prisma
enum UserRole {
  ADMIN
  MANAGER
  SELLER
  WAITER
  VIEWER
}

enum PosSessionStatus {
  OPENING_CONTROL
  OPEN
  CLOSING_CONTROL
  CLOSED
}

enum TableStatus {
  FREE
  OCCUPIED
  BILL_REQUESTED
  CLEANING
  RESERVED
}

enum OrderSource {
  POS
  SOCIAL_CATALOG_GUEST
  DELIVERY
  KIOSK
}

enum CourseStage {
  BEVERAGES
  APPETIZERS
  MAINS
  DESSERTS
}

enum PrepStatus {
  HOLD
  FIRED
  IN_PREPARATION
  READY
  SERVED
  VOIDED
}

enum KitchenTicketStatus {
  QUEUED
  IN_PROGRESS
  READY
  SERVED
  CANCELLED
}

enum BomType {
  KIT_PHANTOM
  MANUFACTURE
}

enum UomCategory {
  UNIT
  WEIGHT
  VOLUME
}

enum PriorityLevel {
  LOW
  NORMAL
  HIGH
  URGENT
}
```

### 3.2 Modelos core (resumen)

- **PosConfig** / **PosSession** (caja real)
- **RestaurantTable** (con `qrToken`, `rfidTag`, `ownerId`, `zone`, `posX/posY`)
- **TableGuest** + **TableTransferLog**
- **PosOrder** / **Order** extendido con `source`, `guestSessionId`, `claimedAt`, `claimedById`, `tableId`
- **OrderLine** extendido con `seatNumber`, `isShared`, `isGift`, `targetTableNumber`, `targetSeatNumber`, `giftMessage`, `guestId`, `course`, `costAtSale`
- **ProductBom** + **BomLine** + **UnitOfMeasure** (Live Escandallo)
- **PreparationStation** + **KitchenTicket** + **KitchenTicketLine**
- **PaymentMethod** + **PosOrderAuditLog**
- **BillSplit** + **SplitPayment**
- **WaiterCallOption** + **WaiterCall** (FEAT-125)
- **CashMovement** con FK real a `PosSession` y `User`

Todos los modelos gastro llevan `isActive`, `isDeleted`, `deletedAt` y relaciones con `onDelete: Restrict`.

### 3.3 Estrategia de migración

1. Una migración grande `*_omnigastro_core` con todos los modelos de Fases 1-3 + FEAT-125 (aunque la lógica se implemente después).
2. Feature flags (`USE_OMNIGASTRO_TABLES`, `USE_GUEST_MENU`) para activación gradual.
3. Producción siempre `prisma migrate deploy`.

---

## 4. Motor Live Escandallo (FEAT-118)

- Explosión recursiva de `ProductBom` tipo `KIT_PHANTOM` dentro de `prisma.$transaction`.
- Ajuste dinámico por modificadores (`replacesVariantId`, `ingredientVariantId` + `qtyDelta`).
- Factor de merma (`wastePercentage`) + conversión UoM.
- Snapshot `costAtSale` / `unitCost` en `StockMove` y `OrderLine`.
- Caché Redis `bom:{tenantId}:{variantId}` con invalidación reactiva.
- Objetivo: < 100 ms. Se ejecuta **solo cuando el mozo confirma / envía a cocina**, nunca en el envío del cliente (GUEST_DRAFT).

---

## 5. Integración Tauri (FEAT-120)

El monorepo ya tiene `desktop/` con Tauri + Rust (ESC/POS nativo).

Periféricos prioritarios:
- Cajón de dinero (RJ12)
- Básculas (RS232)
- Terminales de pago / datáfonos (SDK local)
- Bump Bars (endpoint REST + HID)

Bridge con comandos tipados + fallback web-only + store-and-forward de pagos offline cifrado.

---

## 6. FEAT-125 — Guest Digital Menu + Table Claim + Waiter Call

> **Estado al 2026-09-18:** `completed` — DB migration finalizada. Los controladores usan tablas reales (`RestaurantTable.token`, `WaiterCall`, `WaiterCallOption`) en lugar de JSON en `Tenant.config.gastro`. La persistencia en JSON queda obsoleta.

### 6.0 Migración DB (2026-09-18)

| Controlador | Antes (JSON en Tenant.config) | Ahora (tablas DB) |
|-------------|-------------------------------|-------------------|
| `GuestTablesController` | `gastro.qrTokens[]` | `RestaurantTable.findFirst({ token })` |
| `GuestOrdersController` | `gastro.qrTokens[]` + `gastro.waiterCalls[]` | `RestaurantTable` + `WaiterCall.create()` |
| `GuestCallWaiterController` | `gastro.waiterOptions[]` + `gastro.waiterCalls[]` | `WaiterCallOption.findFirst()` + `WaiterCall.create()` |
| `WaiterCallsController` | `gastro.waiterCalls[]` (CRUD en JSON) | `WaiterCall.findMany/update` |
| `AdminWaiterCallOptionsController` | No existía | CRUD completo sobre `WaiterCallOption` |

### 6.1 Decisiones de negocio validadas

| Punto | Decisión |
|-------|----------|
| Stock en envío del cliente | **No se valida**. El stock se descuenta solo cuando el mozo confirma/envía a cocina. |
| Cuentas por mesa | **Varias cuentas abiertas por mesa** (una por comensal/grupo). Se pueden mover de mesa con el comensal. |
| Llamar al Mozo | Opciones **configurables** por el administrador en PosConfig (botones predefinidos + texto libre). |
| QR de mesa | **Fase 1: estático** (impreso). Alternativas dinámicas posteriores (token rotativo, NFC, PIN diario, e-ink). |
| Tracking cliente | Sí: `GUEST_DRAFT → CLAIMED → SENT_TO_KITCHEN → IN_PREPARATION → READY → SERVED`. Muestra hora de inicio de cocción y hora de “listo”. |

### 6.2 Reutilización de Social Catalog

El menú digital actual (`/social-catalog/menudigital`) se convierte en el menú vivo del restaurante:

- El cliente arma su precuenta (ya existe).
- Nuevo botón **“Enviar pedido”** → crea `Order` con `status: GUEST_DRAFT`, `source: SOCIAL_CATALOG_GUEST`, `tableId` (del QR), `sellerId: null`.
- El mozo ve los pedidos draft, los **reclama** (`claim`), edita y envía a cocina.
- El cliente recibe actualizaciones en tiempo real del estado de su pedido.

### 6.3 Modelo adicional FEAT-125

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

Campos nuevos en `RestaurantTable`: `qrToken String @unique`, `rfidTag String? @unique`.

### 6.4 Flujos principales

1. **Escaneo QR estático** → `?table={qrToken}` o `/menudigital/t/{qrToken}` → asocia `tableId`.
2. **Cliente envía pedido** → `POST /api/v1/guest/orders` → `GUEST_DRAFT` (sin stock ni KDS).
3. **Mozo reclama** → `POST /api/v1/orders/:id/claim` → `CLAIMED` + WebSocket al cliente.
4. **Mozo envía a cocina** → Live Escandallo + KitchenTickets + tracking visible para el cliente.
5. **Llamar al Mozo** → `POST /api/v1/guest/tables/:tableId/call-waiter` → alerta WebSocket en tablet del mozo (mismo canal estilo KDS).
6. **Tracking en tiempo real** en la SPA del cliente (estado + timestamps de cocción y listo).

### 6.5 Endpoints FEAT-125

| Método | Ruta | Actor | Descripción |
|--------|------|-------|-------------|
| GET | `/api/v1/guest/tables/by-token/:qrToken` | Público | Resuelve mesa |
| POST | `/api/v1/guest/orders` | Cliente | Crea GUEST_DRAFT |
| GET | `/api/v1/guest/orders/:id` | Cliente | Tracking |
| POST | `/api/v1/orders/:id/claim` | Mozo | Reclamar pedido |
| POST | `/api/v1/guest/tables/:tableId/call-waiter` | Cliente | Llamar al mozo |
| GET | `/api/v1/waiter/calls` | Mozo | Llamadas pendientes |
| PATCH | `/api/v1/waiter/calls/:id/acknowledge` | Mozo | Marcar vista |
| CRUD | `/api/v1/admin/waiter-call-options` | Admin | Configurar botones |

### 6.6 Alternativas futuras de QR dinámico (sin reimpresión diaria)

- Token rotativo de corta vida + pantalla pequeña / menú del mozo
- NFC/RFID regrabable desde la tablet
- QR genérico del restaurante + número de mesa o PIN diario
- E-ink / tablet de mesa con QR rotativo

---

## 7. Roadmap de Fases (Resumen)

| Fase | FEATs | Objetivo | Duración est. |
|------|-------|----------|---------------|
| **0 – Safeguards** | FEAT-112 | Data safety | **COMPLETED** |
| **1 – Cimientos + Caja** | FEAT-113 | PosSession real, roles, permisos | 3-4 semanas |
| **2 – Salón + Guest Experience** | FEAT-114, 115, 116, 119, **125** | Mesas, asientos, split, gifting, menú digital vivo, llamada al mozo | 8-10 semanas |
| **3 – Cocina + Costos** | FEAT-117, 118 | KDS coursing + Live Escandallo | 5-7 semanas |
| **3.1 – KDS Configurable + Impresión** | FEAT-151, 152 | Multi-estación, routing N:N, ESC/POS | ✅ **COMPLETED** |
| **4 – Hardware + Escala** | FEAT-120 → 124 | Tauri, pagos offline, delivery, franquicias, Menu Engineering | 10-14 semanas |

---

## 8. Branching

```
main
└── develop
    └── product/omnigastro
        ├── feat/gastro-00-safeguards          (FEAT-112) ✅
        ├── feat/gastro-01-pos-session-roles   (FEAT-113)
        ├── feat/gastro-02-tables-split-guest  (FEAT-114/115/116/119/125)
        ├── feat/gastro-03-kds-coursing-bom    (FEAT-117/118)
        ├── feat/gastro-04-hardware-payments   (FEAT-120/121)
        └── feat/gastro-05-franchises-menu     (FEAT-122/123/124)
```

---

## 9. Métricas de Éxito

| Métrica | Objetivo |
|---------|----------|
| Apertura de POS / mesa | < 1,5 s |
| Latencia KDS / Waiter Call | < 50 ms |
| Procesamiento Live Escandallo | < 100 ms |
| Propagación 86ing | < 500 ms |
| Tasa de sincronización offline | > 99,9 % |
| Error en descuento de stock | < 0,1 % |
| Paridad funcional Toast | ≥ 90-95 % |
| Data-loss incidents post-Fase 0 | 0 |
| Tiempo desde “Enviar pedido” del cliente hasta alerta en tablet del mozo | < 1 s |

---

## 10. Próximos Pasos Inmediatos

1. ✅ **FEAT-125** (completed 2026-09-18): Migración JSON→DB completada. Controladores: `GuestTablesController`, `GuestOrdersController`, `GuestCallWaiterController`, `WaiterCallsController`, `AdminWaiterCallOptionsController`. Persistencia en `Tenant.config.gastro` eliminada.
2. ✅ **FEAT-113** (completed): PosSession real + rol WAITER + permisos cash:* / tables:*.
3. ✅ Migración Prisma consolidada (`20260918120000_omnigastro_core`) aplicada.
4. ✅ **FEAT-116**: Split Billing + Waiter Custody (BillSplit, SplitPayment services).
5. ✅ **FEAT-117**: KDS Coursing + Bump Bars (KitchenTicket, PreparationStation services).
6. ✅ **FEAT-118**: Live Escandallo Engine (BomEngine, Redis cache).
7. ✅ **FEAT-151/152** — KDS Configurable Multi-Estación + Impresión Selectiva: mergeado a main (commit 244078ed). Migración `20260927193000_kds_multi_station_printing` aplicada. Servicios: `KitchenPrintService`, `ProductStationService`, routing multi-destino en `sendToKitchen`, processor BullMQ `kitchen-print`. UI admin: `/admin/kds/stations`.
8. Tag `v1.25.0-alpha-omnigastro` + push tags.

---

**Este documento es la única fuente de verdad para OmniGastro / OmniDineIn.**  
Toda implementación futura debe alinearse con la numeración FEAT-112+ y con el modelo de datos y flujos aquí definidos.

*Fin del Plan Maestro Consolidado (actualizado con FEAT-125).*

---

## 11. Roadmap Ejecutivo

> **Véase también:** [`ROADMAP_OMNIGASTRO.md`](ROADMAP_OMNIGASTRO.md) — Roadmap ejecutivo con dependencias, timeline y bloqueadores.

| Fase | FEATs | Duración est. | Estado |
|------|-------|---------------|--------|
| **0 – Safeguards** | FEAT-112 | 1 semana | ✅ **COMPLETED** (3/3 en código) |
| **1 – Cimientos + Caja** | FEAT-113 | 3-4 semanas | ✅ **COMPLETED** |
| **2 – Salón + Guest Experience** | FEAT-114, 115, 116, 119, 125 | 8-10 semanas | 🚧 **DB READY** - modelos deployados (FEAT-125 DB migration completada 2026-09-18) |
| **3 – Cocina + Costos** | FEAT-117, 118 | 5-7 semanas | 🚧 **DB READY** - modelos deployados |
| **3.1 – KDS Configurable + Impresión** | FEAT-151, 152 | 3-4 semanas | ✅ **COMPLETED** — merge 244078ed a main |
| **4 – Hardware + Escala** | FEAT-120 → 124 | 10-14 semanas | ⏳ Pendiente |

**Bloqueadores restantes:**
1. ~~**FEAT-125 demo**: Persistencia temporal en `Tenant.config` (JSON)~~ → **RESUELTO 2026-09-18**: migración a tablas DB completada.
2. ~~**Lógica de negocio**: FEAT-114/115/116/117/118/119 requieren implementación de servicios y controladores sobre los modelos ya deployados.~~ → **RESUELTO 2026-09-24**.
3. ~~**KDS routing base**: FEAT-147/148 completaron routing por categoría y visibilidad `showInKDS`.~~ → **RESUELTO**.
4. ~~**Pendiente**: FEAT-151/152 requieren migración Prisma + servicio de impresión ESC/POS + UI admin.~~ → **RESUELTO 2026-09-27**: merge 244078ed. Próximo: hardening RBAC empleados (ver `diseno-rbac-empleados.md`).
