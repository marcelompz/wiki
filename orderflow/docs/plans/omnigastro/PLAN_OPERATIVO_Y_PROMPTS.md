# Plan Operativo OmniGastro + Prompts de Implementación
**Roadmap priorizado por sprints + prompts individuales listos para delegar**

**Proyecto:** OrderFlow / OmniFlow → OmniGastro  
**Módulo comercial:** OmniDineIn (add-on instalable vía `ModuleInstallation`)  
**Versión base de código:** 1.24.04  
**Fecha:** 3 de septiembre 2026  
**Estado general:** FEAT-112 ✅ completed · FEAT-113 planned · FEAT-114/125 planned · resto planned  
**Documento:** `docs/planes/omnigastro/PLAN_OPERATIVO_Y_PROMPTS.md`

---

## 0. Cómo leer este documento

- **Sección 1** muestra el roadmap priorizado por sprints (Sprint 0 a Sprint 4+) con clasificación **P0 / P1 / P2**.
- **Sección 2** lista cada FEAT con: tipo, prioridad, dependencias, criterios de aceptación, **prompt listo** para delegar.
- Los prompts siguen el formato de `features/FEAT-113-omnidinein-cimientos.md` y `features/FEAT-125-guest-menu-claim-waiter.md`.

**Clasificación de prioridad:**
- **P0 demo alfa 2026-09-04 (Provecchio):** mínima expresión end-to-end que muestra el flujo al cliente. Sin migración Prisma, todo en JSON + status existentes.
- **P1 (Sprint 1, post-demo):** cimientos sólidos — modelo real, RBAC, migraciones, base para que la alfa no quede como prototipo.
- **P2 (Sprint 2+):** features completos del plan (cocina, hardware, franquicias).

---

## 1. Roadmap priorizado por sprints

### Sprint 0 — Data Safety (COMPLETADO 2026-08)
| FEAT | Título | Prioridad | Estado |
|------|--------|-----------|--------|
| FEAT-112 | OmniGastro Safeguards (Soft-delete + Restrict + @TenantPrisma linter + migrate deploy CI) | **P0** | ✅ completed |

### Sprint 1 — Cimientos de caja y roles (próximo, post-demo)
| FEAT | Título | Prioridad | Estado | Depende de |
|------|--------|-----------|--------|------------|
| FEAT-113 | OmniDineIn Cimientos: PosSession real + rol WAITER + permisos `cash:*` / `tables:*` | **P1** | planned | FEAT-093, FEAT-097, FEAT-112 |
| FEAT-118 | Live Escandallo Engine (POS BoM atómico + cache Redis) | **P1** | planned | FEAT-096, FEAT-097, FEAT-111 |

### Sprint 2 — Salón + Guest Experience
| FEAT | Título | Prioridad | Estado | Depende de |
|------|--------|-----------|--------|------------|
| FEAT-114 | Mesas, Zonas, Mapa de Piso y Ownership del Mozo | **P1** | planned | FEAT-113 |
| FEAT-115 | Asientos / Comensales (TableGuest) + Traspaso entre mesas | **P1** | planned | FEAT-114 |
| FEAT-125 | Guest Digital Menu + Table Claim + Waiter Call (Social Catalog como menú vivo) | **P0** (demo) / **P1** (completo) | **in_progress** | FEAT-113, FEAT-114, FEAT-097 |
| FEAT-119 | Seat-level Ordering + Punto Pivote + Cross-Table Gifting | **P2** | planned | FEAT-115 |

### Sprint 3 — Cocina + Costos
| FEAT | Título | Prioridad | Estado | Depende de |
|------|--------|-----------|--------|------------|
| FEAT-117 | KDS Coursing + Atribución de Mozo + Bump Bars | **P1** | planned | FEAT-097, FEAT-114 |
| FEAT-116 | Split Billing completo + Waiter Custody & Cashier Handover | **P1** | planned | FEAT-115 |

### Sprint 4 — Hardware + Escala
| FEAT | Título | Prioridad | Estado | Depende de |
|------|--------|-----------|--------|------------|
| FEAT-120 | Hardware Bridge Tauri/Rust (cajón, básculas, datáfonos) | **P2** | planned | FEAT-113 |
| FEAT-121 | Pagos Offline Store-and-Forward + SDK Datáfonos | **P2** | planned | FEAT-120 |
| FEAT-122 | Delivery Connectors (Rappi / PedidosYa / Uber Eats → KDS) | **P2** | planned | FEAT-117 |
| FEAT-123 | Sindicación de Menús Multi-Sucursal / Franquicias | **P2** | planned | FEAT-114 |
| FEAT-124 | Menu Engineering + Auditoría de Mermas en tiempo real | **P2** | planned | FEAT-118 |

### Demo alfa 2026-09-04 (Provecchio) — Alcance reducido
**Objetivo:** mostrar end-to-end el flujo "Cliente escanea QR → arma pedido → envía al mozo → mozo reclama → cocina prepara → mozo cobra". Sin KDS físico, sin split, sin pagos digitales. Persistencia en `Order` + `Order.metadata` + `Tenant.config` (sin migración).

| Pieza | Tipo | Estado demo |
|-------|------|-------------|
| Flag `omnigastroEnabled` en `Tenant.config` | JSON config | ⏳ |
| `GuestController`: `GET /guest/tables/by-token/:qrToken`, `POST /guest/orders`, `GET /guest/orders/:id`, `POST /guest/tables/:id/call-waiter` | backend (sin migración) | ⏳ |
| `OrdersController.claim` + `send` + `ready` | backend (status existentes) | ⏳ |
| `WaiterCallsController` (mozo) | backend (almacén JSON en `Tenant.config.waiterCalls`) | ⏳ |
| Gate `omni-catalog.tsx` con `?t=QR_TOKEN` + botones Enviar / Llamar Mozo | frontend | ⏳ |
| Mini-KDS simulado en `/admin/kds` | frontend | ⏳ |
| Seed `demo-omnigastro` (1 mesa, 5 productos, 1 mozo, 1 cocinero) | seed | ⏳ |
| Smoke test + troubleshooting doc con evidencia | docs | ⏳ |

---

## 2. Prompts individuales por FEAT

> Los prompts están escritos para **delegar a un agente Implementador**. Cada uno respeta las reglas de `AGENTS.md` (tenantId sagrado, sin `new PrismaClient()`, sin lógica por `ORDERFLOW_MODE`, sin comentarios, sin commits sin confirmación).

---

### FEAT-112 — Safeguards ✅ COMPLETADO

**Tipo:** fullstack  
**Prioridad:** P0  
**Estado:** completed (ver `featurelist.json`, `docs/troubleshooting/98-feat112-tenants-endpoint-protected.md`)

**Nota para auditoría:** los 3 safeguards de datos (extensión Prisma Client para soft-delete, `onDelete: Restrict` en entidades raíz, linter ESLint) **NO están en código** (gap detectado en `AUDITORIA_Y_SOCIAL_CATALOG_COMO_MENU.md` §2.1). El FEAT-112 está marcado completed porque `ProvisioningJob` + `TenantCreationGuard` están aplicados en Hetzner y Provecchio, pero los safeguards declarados en el plan maestro **deben cerrarse antes de tocar Fase 1**.

**Prompt:**

```text
Rol: Implementador (AGENTS.md v2.2.1).
Tarea: Cerrar gaps reales del FEAT-112 (omnigastro safeguards).

Contexto:
- FEAT-112 está marcado completed en featurelist.json y PLAN_MAESTRO.md.
- En código solo están: TenantCreationGuard, ProvisioningJob + enums + migración aplicada.
- Faltan 3 safeguards declarados en el plan: extensión Prisma Client para soft-delete,
  onDelete: Restrict en entidades raíz, linter ESLint que prohíba PrismaService singleton.

Cambios requeridos:
1. backend/prisma/extensions/soft-delete.extension.ts
   - Extensión Prisma Client (Prisma 5.x clientExtensions) que:
     a) Intercepte delete/deleteMany y los transforme en update { isDeleted: true, deletedAt: now() }.
     b) Intercepte findUnique/findFirst/findMany/findFirstOrThrow/findUniqueOrThrow
        para inyectar where: { isDeleted: false } salvo cuando se pida explícitamente
        withDeleted: true.
   - Aplicar en el cliente resuelto por TenantConnectionManager.

2. Revisar schema.prisma: cambiar onDelete: Cascade → onDelete: Restrict en
   RestaurantTable, TableGuest, PosSession, PosConfig, PaymentMethod, Order, OrderLine.
   (cuando esos modelos existan, ya están en el plan).
   No tocar entidades que ya están validadas (ej. CashMovement no se toca porque
   rompería FEAT-093).

3. .eslintrc.cjs: regla custom no-restricted-syntax que prohíba
   `new PrismaClient()` y `import { PrismaClient } from '@prisma/client'`
   excepto en backend/prisma/ y backend/src/common/tenant-connection.manager.ts.

4. .github/workflows/ci-omnigastro-migrations.yml:
   - Trigger: PR a branch product/omnigastro/**.
   - Job: validar que existe migration.sql nueva si hay cambios en schema.prisma.

5. Tests:
   - backend/test/omnigastro/soft-delete.spec.ts: crea Order → softDelete → findMany lo omite
     → withDeleted: true lo incluye → deleteMany se transforma en update.
   - backend/test/omnigastro/restrict-relations.spec.ts: intentar delete de RestaurantTable
     con Order abierta → PrismaClientKnownRequestError P2003 Restrict.

6. Documentar en docs/troubleshooting/100-feat112-soft-delete-restrict-linter.md
   con evidencia de init.sh pasando + screenshots de CI corriendo.

Reglas AGENTS.md: tenantId sagrado, sin new PrismaClient(), sin comentarios en código,
sin commits sin confirmación. Antes de mergear, ejecutar ./scripts/init.sh (con autorización
del usuario).
```

---

### FEAT-113 — OmniDineIn Cimientos (PosSession real + WAITER + permisos)

**Tipo:** fullstack  
**Prioridad:** P1  
**Estado:** planned  
**Depende de:** FEAT-093, FEAT-097, FEAT-112 ✅

**Documento de referencia:** `docs/planes/omnigastro/features/FEAT-113-omnidinein-cimientos.md` (prompt detallado ya redactado).

**Prompt resumido:**

```text
Rol: Implementador (AGENTS.md v2.2.1).
Tarea: FEAT-113 — OmniDineIn Cimientos.

Sigue el prompt completo en
docs/planes/omnigastro/features/FEAT-113-omnidinein-cimientos.md.

Resumen de alcance:
1. schema.prisma:
   - enum UserRole: agregar WAITER.
   - enum PosSessionStatus: OPENING_CONTROL, OPEN, CLOSING_CONTROL, CLOSED.
   - model PosConfig, PosSession, PaymentMethod, PosOrderAuditLog.
   - CashMovement.registeredBy: cambiar de String a User? @relation + onDelete: Restrict.
2. backend/src/pos-sessions/: módulo nuevo con service, controller, dto.
   openSession / closeSession con variance, /api/v1/pos-sessions/active.
3. backend/src/common/rbac.service.ts: seed de 8 permisos nuevos:
   cash:open_session, cash:close_session, cash:collect, cash:refund,
   tables:own, tables:reassign, tables:view, kds:view.
   Asignar a roles WAITER y MANAGER.
4. orders.service.ts.confirm(): exigir PosSession abierta para confirmar pedido.
5. Tests: pos-sessions.service.spec.ts (8 tests) + actualizar orders.service.spec.ts.
6. seed: 1 PosConfig default por tenant, 0 sesiones abiertas (las crea el demo seed).

Reglas AGENTS.md. Ejecutar init.sh al cerrar.
```

---

### FEAT-114 — Mesas, Zonas, Mapa de Piso y Ownership del Mozo

**Tipo:** fullstack  
**Prioridad:** P1  
**Estado:** planned  
**Depende de:** FEAT-113

**Prompt:**

```text
Rol: Implementador (AGENTS.md v2.2.1).
Tarea: FEAT-114 — Mesas, Zonas, Mapa de Piso y Ownership del Mozo.

Contexto: FEAT-113 (PosSession + WAITER) ya completado.

Cambios:
1. schema.prisma:
   - enum TableStatus: FREE, OCCUPIED, BILL_REQUESTED, CLEANING, RESERVED.
   - model Zone { id, tenantId, name, sortOrder, color, isActive, isDeleted, deletedAt, tables[] }.
   - model RestaurantTable {
       id, tenantId, zoneId?, number (unique per tenant), name?,
       capacity Int, posX Int?, posY Int?, shape String? ('square'|'round'|'rect'),
       status TableStatus @default(FREE), ownerId? (User con WAITER role),
       qrToken String @unique @default(uuid()), rfidTag String? @unique,
       isActive, isDeleted, deletedAt, createdAt, updatedAt,
       owner User? @relation(fields: [ownerId], references: [id], onDelete: SetNull),
       zone Zone? @relation(...), orders Order[]
     }
2. backend/src/tables/tables.service.ts: CRUD + assignOwner / releaseOwner / moveTable.
3. backend/src/tables/tables.controller.ts:
   - GET /api/v1/tables (admin)
   - POST /api/v1/tables (admin)
   - PATCH /api/v1/tables/:id (admin)
   - POST /api/v1/tables/:id/assign-owner (manager) — body: { waiterId }
   - POST /api/v1/tables/:id/release-owner (manager)
   - GET /api/v1/tables/floor-map (todos los roles con tables:view)
4. frontend/src/pages/admin/floor-map.tsx:
   - Drag & drop mesas sobre canvas con posX/posY.
   - Click en mesa → side panel con líneas + estado + botones (asignarme, liberar, transferir).
   - Color de mesa según status: FREE verde, OCCUPIED rojo, BILL_REQUESTED amarillo,
     CLEANING gris, RESERVED violeta.
5. Sidebar admin: nueva entrada "Salón" (entre Pedidos y Clientes) — solo visible si
   el tenant tiene omnigastroEnabled o el módulo OmniDineIn instalado.
6. Tests: tables.service.spec.ts (12 tests cubriendo CRUD + ownership + moves).
7. Seed: zona "Salón Principal" + 4 mesas (M-01..M-04) con qrTokens imprimibles.

Criterios de aceptación:
- Floor map renderiza con drag & drop funcional.
- Mozo con WAITER + tables:own puede autoasignarse una mesa FREE.
- Manager con tables:reassign puede mover el ownerId.
- Status de mesa cambia automáticamente cuando se crea Order con tableId.
- QR impreso en mesa M-01 lleva a /social-catalog/menudigital?t=<qrToken>.

Reglas AGENTS.md. Ejecutar init.sh al cerrar.
```

---

### FEAT-115 — Asientos / Comensales (TableGuest) + Traspaso

**Tipo:** fullstack  
**Prioridad:** P1  
**Estado:** planned  
**Depende de:** FEAT-114

**Prompt:**

```text
Rol: Implementador (AGENTS.md v2.2.1).
Tarea: FEAT-115 — TableGuest + Traspaso entre mesas.

Cambios:
1. schema.prisma:
   - model TableGuest { id, tenantId, tableId, name?, seatNumber, color, isActive, isDeleted, deletedAt, orderLines OrderLine[] }.
   - model TableTransferLog { id, tenantId, guestId, fromTableId, toTableId, transferredById, reason?, createdAt }.
2. backend/src/tables/table-guests.service.ts: CRUD + moveGuest (transaccional: actualiza TableGuest.tableId + registra TableTransferLog).
3. endpoints:
   - GET /api/v1/tables/:id/guests
   - POST /api/v1/tables/:id/guests  body: { name?, seatNumber, color }
   - PATCH /api/v1/guests/:id  body: { name?, seatNumber, color }
   - POST /api/v1/guests/:id/transfer  body: { toTableId, reason? }
4. OrderLine.guestId: FK opcional a TableGuest con onDelete: SetNull.
5. frontend/src/pages/admin/floor-map.tsx: panel de mesa muestra TableGuests como círculos de color en la cabecera de cada mesa.
6. Tests: table-guests.service.spec.ts (10 tests).

Reglas AGENTS.md. Ejecutar init.sh al cerrar.
```

---

### FEAT-125 — Guest Digital Menu + Table Claim + Waiter Call (in_progress para demo alfa)

**Tipo:** fullstack  
**Prioridad:** P0 (demo) / P1 (completo)  
**Estado:** in_progress  
**Depende de:** FEAT-113, FEAT-114, FEAT-097

**Documento de referencia:** `docs/planes/omnigastro/features/FEAT-125-guest-menu-claim-waiter.md` + sección 3 de `AUDITORIA_Y_SOCIAL_CATALOG_COMO_MENU.md`.

**Alcance demo (sin migración Prisma):**

```text
Rol: Implementador (AGENTS.md v2.2.1).
Tarea: FEAT-125 demo alfa 2026-09-04 en Provecchio (orderflow.provecchio.com).
Sin migración Prisma — usar Order.metadata + Tenant.config JSON + status existentes.

Alcance reducido (demo end-to-end con KDS simulado):
1. SIN schema.prisma nuevo. Todo persiste en:
   - Tenant.config.gastro: { enabled, qrTokens: { MESA-01: 'uuid' }, waiterCalls: [...], claims: {} }
   - Order.metadata.guestDraft: { qrToken, tableId, tableName, claimedBy, claimedAt, sendToKitchenAt, readyAt, paidAt }
2. backend/src/guest/guest.module.ts (nuevo, sin @TenantPrisma porque es público):
   - GuestTablesController: GET /api/v1/guest/tables/by-token/:qrToken → resuelve mesa leyendo Tenant.config.gastro.qrTokens.
   - GuestOrdersController: POST /api/v1/guest/orders body: { qrToken, lines: [{ productId, quantity }] } → crea Order con status='CONFIRMED' (reusamos), metadata.guestDraft={qrToken, tableId, ...}, source='SOCIAL_CATALOG_GUEST' (agregar al enum OrderStatus como tag en metadata, sin migración).
     GET /api/v1/guest/orders/:id → devuelve order + estado de tracking parseado de metadata.
   - CallWaiterController: POST /api/v1/guest/tables/:tableId/call-waiter body: { optionId, freeText? } → agrega a Tenant.config.gastro.waiterCalls[] + emite WebSocket al canal waiter-alerts:{tenantId}.
3. backend/src/orders/orders.controller.ts: agregar
   - POST /api/v1/orders/:id/claim (mozo): cambia metadata.guestDraft.claimedBy/claimedAt y estado Order a 'PREPARING'.
   - POST /api/v1/orders/:id/send-to-kitchen (mozo): metadata.guestDraft.sendToKitchenAt, status Order a 'PREPARING'.
   - POST /api/v1/orders/:id/ready (cocina): metadata.guestDraft.readyAt, status Order a 'READY'.
   - POST /api/v1/orders/:id/paid (mozo): metadata.guestDraft.paidAt, status Order a 'DELIVERED'.
4. backend/src/waiter/waiter-calls.controller.ts (nuevo, mozo):
   - GET /api/v1/waiter/calls → lee Tenant.config.gastro.waiterCalls filtrados status='PENDING'.
   - PATCH /api/v1/waiter/calls/:id/acknowledge → cambia a 'ACKNOWLEDGED'.
   - PATCH /api/v1/waiter/calls/:id/resolve → cambia a 'RESOLVED'.
5. backend/src/orders/orders.gateway.ts: agregar evento 'guestOrderUpdate' que se emite cuando cambia metadata.guestDraft.* (cualquiera de los 4 endpoints).
6. frontend/src/pages/omni-catalog.tsx: gate por Tenant.config.gastro.enabled.
   - Si disabled: comportamiento actual sin cambios.
   - Si enabled + URL tiene ?t=<qrToken>: resolver mesa via /guest/tables/by-token/:qrToken. Si mesa existe:
     - Mostrar header con "Mesa: MESA-01" y badge "Modo restaurante".
     - Agregar al Drawer del carrito dos botones: "Enviar pedido al mozo" (POST /guest/orders) y "Llamar al mozo" (abre modal con opciones preconfiguradas de Tenant.config.gastro.waiterOptions).
     - Después de "Enviar pedido": abrir /order-tracking?orderId=<id> que hace polling cada 3s a /guest/orders/:id y muestra timeline de estados (Enviado → Reclamado por {mozo} → En cocina → Listo → Pagado).
7. frontend/src/pages/admin/kds.tsx (mini-KDS simulado, solo si gastr.enabled):
   - Lista de Orders con metadata.guestDraft.claimedBy && !metadata.guestDraft.readyAt.
   - Botones: "Marcar listo" (PATCH /orders/:id/ready), "Marcar entregado" (PATCH /orders/:id/paid).
   - WebSocket subscription al canal guestOrderUpdate para actualizar en vivo.
8. seed-demo-omnigastro.ts: nuevo script seed que crea (idempotente):
   - Tenant 'demo-omnigastro' (subdomain=demo-omnigastro) con config.gastro.enabled=true y config.gastro.qrTokens.MESA-01='<uuid>' y config.gastro.waiterOptions=[{id:'waiter-bill',label:'Pedir la cuenta',icon:'🧾'},{id:'waiter-more-bread',label:'Más pan',icon:'🍞'},{id:'waiter-help',label:'Ayuda',icon:'❓',requiresText:true}].
   - 5 productos demo (Milanesa, Ensalada, Bebida, Postre, Café).
   - 1 mesa lógica MESA-01 (referenciada por qrToken, no en DB).
   - Usuarios: mozo@demo.omnigastro (role=WAITER), cocina@demo.omnigastro (role=MANAGER), admin@demo.omnigastro (role=ADMIN).
9. Smoke test con script bash: 1) login admin → 2) GET /guest/tables/by-token/<uuid> → 3) POST /guest/orders → 4) login mozo → 5) POST /orders/:id/claim → 6) POST /orders/:id/send-to-kitchen → 7) login cocina → 8) POST /orders/:id/ready → 9) POST /orders/:id/paid → verificar status en cada paso.
10. docs/troubleshooting/101-feat125-demo-alfa-provecchio.md con evidencia (logs + curl outputs + screenshots del rollplay).

Criterios de aceptación demo:
- Cliente escanea QR → ve menú + mesa MESA-01 + botones.
- Cliente arma carrito + "Enviar pedido" → backend crea Order + emite WebSocket → admin/kds lo ve aparecer.
- Mozo click "Reclamar" → cliente ve "Tu pedido fue tomado por {mozo}".
- Mozo click "Enviar a cocina" → cocina ve aparecer el ticket.
- Cocina click "Marcar listo" → cliente ve "¡Listo!".
- Mozo click "Marcar entregado y pagado" → flujo completo cierra.
- "Llamar al mozo" con opción "Pedir la cuenta" → mozo ve alerta en /admin/kds con sonido.
- Si el tenant NO tiene omnigastro, omni-catalog.tsx NO muestra mesa ni botones (gate funciona).

Reglas AGENTS.md. Ejecutar init.sh al cerrar (autorización requerida).
```

**Alcance completo (P1, post-demo):** ver `features/FEAT-125-guest-menu-claim-waiter.md` — incluye migración Prisma para `WaiterCallOption`, `WaiterCall`, `Order.source`, `Order.guestSessionId`, `Order.claimedBy/At`, `Order.tableId`, `Order.sessionId`, `RestaurantTable.qrToken/rfidTag`, enum `OrderSource`. Cuando se ejecute la migración core (`*_omnigastro_core`), reemplazar el JSON-almacén por los modelos reales.

---

### FEAT-117 — KDS Coursing + Atribución de Mozo + Bump Bars

**Tipo:** fullstack  
**Prioridad:** P1  
**Estado:** planned  
**Depende de:** FEAT-097, FEAT-114

**Prompt:**

```text
Rol: Implementador (AGENTS.md v2.2.1).
Tarea: FEAT-117 — KDS Coursing + Atribución + Bump Bars.

KDS base ya existe (FEAT-097 con orders.gateway.ts evento kds:ticket_new).
Falta: coursing por CourseStage (BEVERAGES/APPETIZERS/MAINS/DESSERTS),
atribución de mozo, bump bars físicos.

Cambios:
1. schema.prisma:
   - model PreparationStation { id, tenantId, name, sortOrder, isActive, isDeleted, deletedAt, tickets KitchenTicket[] }.
   - model KitchenTicket { id, tenantId, orderId, stationId?, status KitchenTicketStatus @default(QUEUED), course CourseStage, firedAt, startedAt?, readyAt?, servedAt?, voidedAt?, priority PriorityLevel @default(NORMAL), isActive, isDeleted, deletedAt, lines KitchenTicketLine[] }.
   - model KitchenTicketLine { id, ticketId, orderLineId, productId, nameSnapshot, quantity, modifiersSnapshot Json, stationId?, status PrepStatus @default(HOLD), firedAt?, startedAt?, readyAt?, servedAt?, voidedAt? }.
2. OrderLine.course, .stationId (FK a PreparationStation), .fireAt (cuándo se debe disparar a cocina).
3. backend/src/orders/orders.service.ts.sendToKitchen():
   - En vez de un solo KitchenTicket, generar 1 ticket por CourseStage.
   - Cada ticket dirigido a la PreparationStation del producto (de Product.preparationStationId por defecto).
   - Atribuir sellerId (mozo) al ticket.
4. backend/src/orders/orders.gateway.ts:
   - eventos kds:ticket_new, kds:ticket_update, kds:ticket_bump con payload completo.
5. backend/src/kds/kds.controller.ts:
   - GET /api/v1/kds/tickets?station=&status= → tickets activos.
   - PATCH /api/v1/kds/tickets/:id/bump → transita a siguiente estado (FIRED→IN_PREP→READY→SERVED).
   - POST /api/v1/kds/tickets/:id/recall → vuelve a IN_PREP si se marcó READY por error.
   - POST /api/v1/kds/tickets/:id/void → requiere PIN supervisor + audit log.
6. frontend/src/pages/admin/kds.tsx (extender el mini-KDS de FEAT-125):
   - Tabs por PreparationStation.
   - Cada ticket muestra: mesa + mozo + líneas + tiempo transcurrido (semaforo SLA verde<5min, amarillo 5-10, rojo >10).
   - Bump bar: click en ticket o swipe para transicionar.
   - Filtros por CourseStage, status, station.
7. Hardening:
   - Redis cache para estado agregado de tickets por tenant (evitar queries repetidos).
   - BullMQ queue kds-bump-events para auditoría async.
8. Tests: kds.service.spec.ts (15 tests cubriendo coursing + bump + recall + void).

Criterios de aceptación:
- Mozo envía pedido con 3 líneas (entrada, principal, postre) → KDS genera 3 tickets
  cada uno en su CourseStage y PreparationStation correspondiente.
- Bump bar funciona vía click o swipe.
- Si el ticket está en READY > 2 min, suena alerta en el dashboard del mozo.
- Recall requiere PIN de manager.
- Voids quedan en PosOrderAuditLog con metadata completa.

Reglas AGENTS.md. Ejecutar init.sh al cerrar.
```

---

### FEAT-116 — Split Billing + Waiter Custody & Cashier Handover

**Tipo:** fullstack  
**Prioridad:** P1  
**Estado:** planned  
**Depende de:** FEAT-115

**Documento de referencia:** `docs/planes/omnigastro/features/FEAT-116-split-payments.md` (flujo detallado completo).

**Prompt:**

```text
Rol: Implementador (AGENTS.md v2.2.1).
Tarea: FEAT-116 — Split Billing completo + Waiter Custody.

Sigue el flujo en features/FEAT-116-split-payments.md.

Cambios clave:
1. schema.prisma:
   - model BillSplit { id, tenantId, orderId, method SplitMethod (BY_SEAT|BY_ITEM|EQUAL_PARTS|CUSTOM_AMOUNT), parts Int?, status String @default('OPEN'), createdById, createdAt, closedAt? }.
   - model SplitPayment { id, tenantId, billSplitId, payerLabel, amount, paymentMethodId, tipPortion Decimal @default(0), gatewayRef?, status String @default('PENDING'), createdAt, confirmedAt? }.
2. backend/src/orders/orders.service.ts:
   - splitBill(orderId, method, parts?) → genera BillSplit + SplitPayments en draft.
   - addSplitPayment(splitId, paymentDto) → registra pago + actualiza BillSplit.status cuando suma == total.
3. backend/src/orders/pos-handover.controller.ts:
   - POST /api/v1/pos-sessions/handover body: { waiterId, orderIds[], cashAmount, cardAmount, handoverCode }.
   - POST /api/v1/pos-sessions/:id/pending-handovers → lista rendiciones pendientes.
4. frontend/src/pages/admin/orders.tsx: botón "Split" en OrderDetail → modal con 4 tabs (por asiento, por ítem, partes iguales, monto libre).
5. Tests: split-billing.service.spec.ts (12 tests).

Reglas AGENTS.md. Ejecutar init.sh al cerrar.
```

---

### FEAT-118 — Live Escandallo Engine

**Tipo:** backend (con frontend read-only)  
**Prioridad:** P1  
**Estado:** planned  
**Depende de:** FEAT-096, FEAT-097, FEAT-111

**Prompt:**

```text
Rol: Implementador (AGENTS.md v2.2.1).
Tarea: FEAT-118 — Live Escandallo atómico completo con cache Redis.

Base ya existe (FEAT-096/097/111 con bom.engine.ts). Falta:
modificadores dinámicos, wastePercentage, UoM, cache Redis, snapshot costAtSale.

Cambios:
1. schema.prisma:
   - model UnitOfMeasure { id, tenantId, code, name, category UomCategory, factorToBase Decimal }.
   - model ProductBom { id, tenantId, productId, name, type BomType, yieldQty Decimal, yieldUomId, wastePercentage Decimal @default(0), isActive, isDeleted, deletedAt, lines BomLine[] }.
   - model BomLine { id, bomId, ingredientVariantId, quantity Decimal, uomId, replacesVariantId?, qtyDelta Decimal @default(0), sortOrder Int @default(0) }.
2. backend/src/inventory/bom.engine.ts (extender):
   - explode(productId, modifiers) recursivo.
   - Conversión UoM (factorToBase).
   - Aplicar wastePercentage.
   - Retornar { ingredientVariantId, quantity, unitCost }.
3. backend/src/redis/redis.service.ts: cache bom:{tenantId}:{productId}:{modifiersHash} TTL 5min.
4. orders.service.ts.sendToKitchen(): llamar bom.engine.explode() en prisma.$transaction, descontar StockMove atómico, snapshot costAtSale en cada OrderLine.
5. Invalidación: hook Prisma en ProductBom / BomLine / ProductVariant → del cache.
6. Métricas: Prometheus counter bom_explode_duration_ms.
7. Tests: bom.engine.spec.ts (15 tests).

Criterios de aceptación:
- Explosion de 1 plato con 3 ingredientes + 1 modificador (sacar cebolla) descuenta
  correctamente el StockMove sin generar ingrediente fantasma.
- Conversión de unidades (kg → g) funciona con factorToBase.
- wastePercentage 5% se aplica al total.
- Latencia < 100 ms en plato complejo (cache hit).
- Cache invalidation al modificar BomLine.

Reglas AGENTS.md. Ejecutar init.sh al cerrar.
```

---

### FEAT-119 — Seat-level Ordering + Cross-Table Gifting

**Tipo:** fullstack  
**Prioridad:** P2  
**Estado:** planned  
**Depende de:** FEAT-115

**Prompt:**

```text
Rol: Implementador (AGENTS.md v2.2.1).
Tarea: FEAT-119 — Seat-level Ordering + Cross-Table Gifting.

Cambios:
1. OrderLine.guestId (ya creado en FEAT-115). Frontend del menú digital del cliente
   permite seleccionar comensal antes de confirmar (selector de "Punto Pivote").
2. OrderLine: nuevos campos isGift Bool @default(false), targetTableNumber String?,
   targetSeatNumber Int?, giftMessage String?.
3. backend/src/orders/orders.service.ts.gift(orderLineId, { targetTable, targetSeat, message }):
   - Genera nueva OrderLine espejo con isGift=true en la Order del destinatario.
4. Frontend: drag & drop entre mesas en floor-map para regalar ítems.
5. Tests: seat-level-ordering.spec.ts (8 tests).

Reglas AGENTS.md. Ejecutar init.sh al cerrar.
```

---

### FEAT-120 — Hardware Bridge Tauri/Rust

**Tipo:** desktop (Tauri + Rust)  
**Prioridad:** P2  
**Estado:** planned  
**Depende de:** FEAT-113

**Prompt:**

```text
Rol: Implementador (AGENTS.md v2.2.1).
Tarea: FEAT-120 — Hardware Bridge Tauri/Rust avanzado.

Monorepo ya tiene desktop/ con Tauri (FEAT-005, FEAT-052).
Falta integración profunda con periféricos: cajón RJ12, básculas RS232, datáfonos.

Cambios:
1. desktop/src-tauri/src/commands/:
   - cash_drawer.rs (comando open_drawer con pulso RJ12).
   - scale.rs (lectura báscula RS232 + tara).
   - card_reader.rs (SDK datáfono: Stripe Terminal / Mercado Pago Point / Pagopar).
2. desktop/src-tauri/src/bridge/
   - IPC tipado con backend NestJS.
   - Store-and-forward cifrado AES-256-GCM para pagos offline.
3. Fallback web-only (si Tauri no disponible): endpoints REST + WebSerial API.
4. Tests: integration con hardware emulado.

Reglas AGENTS.md. Ejecutar init.sh al cerrar.
```

---

### FEAT-121 — Pagos Offline Store-and-Forward + SDK Datáfonos

**Tipo:** desktop + backend  
**Prioridad:** P2  
**Estado:** planned  
**Depende de:** FEAT-120

**Prompt:**

```text
Rol: Implementador (AGENTS.md v2.2.1).
Tarea: FEAT-121 — Pagos Offline + SDK Datáfonos.

Cambios:
1. desktop/src-tauri/src/payments/
   - Cola local cifrada de pagos pendientes (SQLite).
   - Retry con backoff exponencial al reconectarse.
2. backend/src/payments/replay.service.ts
   - Endpoint /api/v1/payments/replay que recibe lote de pagos offline.
   - Idempotencia por gatewayRef.
   - Audit log PosOrderAuditLog.action = REPLAY_OFFLINE_PAYMENT.
3. SDK adapters: stripe-terminal, mercado-pago-point, pagopar.
4. Tests: payments-replay.spec.ts (10 tests con escenarios offline).

Reglas AGENTS.md. Ejecutar init.sh al cerrar.
```

---

### FEAT-122 — Delivery Connectors (Rappi / PedidosYa / Uber Eats)

**Tipo:** backend  
**Prioridad:** P2  
**Estado:** planned  
**Depende de:** FEAT-117

**Prompt:**

```text
Rol: Implementador (AGENTS.md v2.2.1).
Tarea: FEAT-122 — Delivery Connectors.

Cambios:
1. backend/src/integrations/delivery/
   - rappi.adapter.ts (webhook + polling fallback).
   - pedidosya.adapter.ts.
   - ubereats.adapter.ts.
2. backend/src/integrations/delivery/delivery.controller.ts:
   - POST /api/v1/delivery/webhooks/:provider.
   - GET /api/v1/delivery/orders?provider=&status=.
3. Mapeo DeliveryOrder → Order interna (source=DELIVERY).
4. Inyección automática en KDS (FEAT-117) como un ticket más.
5. Tests: delivery-adapters.spec.ts (12 tests con webhooks simulados).

Reglas AGENTS.md. Ejecutar init.sh al cerrar.
```

---

### FEAT-123 — Sindicación de Menús Multi-Sucursal / Franquicias

**Tipo:** backend  
**Prioridad:** P2  
**Estado:** planned  
**Depende de:** FEAT-114

**Prompt:**

```text
Rol: Implementador (AGENTS.md v2.2.1).
Tarea: FEAT-123 — Franquicias / Multi-Sucursal.

Cambios:
1. schema.prisma:
   - model Brand { id, tenantId, name, isActive, ... }.
   - model Franchise { id, brandId, tenantId, name, slug, address, ... }.
   - model MenuTemplate { id, brandId, name, version, publishedAt, isActive }.
   - MenuTemplateProduct, MenuTemplateCategory, MenuTemplateModifier.
2. backend/src/franchises/franchises.service.ts:
   - publishMenu(brandId, version) → snapshot del menú actual.
   - subscribeFranchise(franchiseId, templateVersion) → clona categorías + productos
     a la franchise con mapeo de precios por zona.
3. SuperAdmin: vista "Franquicias" para asignar templates.
4. Tests: franchises.service.spec.ts (10 tests).

Reglas AGENTS.md. Ejecutar init.sh al cerrar.
```

---

### FEAT-124 — Menu Engineering + Auditoría de Mermas

**Tipo:** fullstack  
**Prioridad:** P2  
**Estado:** planned  
**Depende de:** FEAT-118

**Prompt:**

```text
Rol: Implementador (AGENTS.md v2.2.1).
Tarea: FEAT-124 — Menu Engineering + Auditoría de Mermas.

Cambios:
1. backend/src/analytics/menu-engineering.service.ts:
   - Clasificación BCG: Stars (alta margin, alta popularity), Plowhorses (baja margin, alta),
     Puzzles (alta margin, baja), Dogs (baja margin, baja).
   - Cálculo basado en OrderLine.costPrice vs priceAtSale + frecuencia de venta últimos 30 días.
2. backend/src/analytics/waste-audit.service.ts:
   - Cruza StockMove quantity esperada (BoM explosion) vs consumida real.
   - Reporte de mermas por plato, por turno, por día.
3. frontend/src/pages/admin/menu-engineering.tsx:
   - Matriz BCG visual (scatter chart).
   - Tabla de mermas con drill-down por plato.
4. Integración con omnibi-standalone: exportar resultados a BI.
5. Tests: menu-engineering.service.spec.ts (8 tests).

Reglas AGENTS.md. Ejecutar init.sh al cerrar.
```

---

## 3. Convenciones para todos los prompts

- **Antes de codear:** leer `AGENTS.md` + `docs/00-contexto-agentes.md` + `docs/troubleshooting/README.md` (regla 2.1 del AGENTS.md).
- **Datos:** `tenantId` sagrado. Prohibido `new PrismaClient()`. Usar `@TenantPrisma()` o el cliente del `TenantConnectionManager`.
- **Sin comentarios en código** salvo que el usuario lo pida explícitamente.
- **Sin commits ni push** sin confirmación.
- **Tests:** mínimo 1 test unit por método nuevo, integración para flujos críticos, E2E para flujos de cara al cliente.
- **Build limpio:** `npm run build` en backend y frontend sin warnings críticos antes de cerrar.
- **init.sh:** pedir autorización al usuario antes de ejecutar (consume CPU/RAM).
- **Documentación:** cada FEAT cerrado actualiza `featurelist.json`, `VERSION` + Swagger + `ROADMAP.md` + `CHANGELOG.md` + `docs/planes/omnigastro/PLAN_MAESTRO.md` + `docs/planes/omnigastro/featurelist.json`. Si el FEAT toca ruteo o arquitectura, sincronizar con `/opt/wiki/orderflow/` y `/opt/traefik-orderflow/`.
- **Troubleshooting:** si tropezás con un bug o error de build, **primero** consultar `docs/troubleshooting/README.md`. Si no hay entrada previa, documentar la nueva al cerrar el FEAT.

---

## 4. Mapa de dependencias entre FEATs

```
FEAT-112 (✅) ──► FEAT-113 (P1) ──► FEAT-114 (P1) ──► FEAT-115 (P1) ──► FEAT-116 (P1)
                                  │                     │                  │
                                  ├─► FEAT-120 (P2)     ├─► FEAT-119 (P2)  └─► FEAT-118 (P1) ──► FEAT-124 (P2)
                                  │                     │
                                  │                     └─► FEAT-125 (P0 demo) ✅ in_progress
                                  │
                                  └─► FEAT-121 (P2) ──► FEAT-122 (P2)
```

**Paralelizable:** una vez cerrado FEAT-113, FEAT-118 puede correr en paralelo con FEAT-114.  
**Bloqueante para demo alfa 2026-09-04:** sólo FEAT-125 (alcance reducido). Todo lo demás puede esperar.

---

## 5. Próximo paso inmediato

**Esta noche (2026-09-03):** ejecutar el prompt de **FEAT-125 demo** (sin migración Prisma, gate en `omni-catalog.tsx`, `GuestController` con JSON-almacén, mini-KDS, seed Provecchio). Mañana 2026-09-04 rollplay en Provecchio con `orderflow.provecchio.com`.

**Mañana post-rollplay:** merge a `product/omnigastro` + retroalimentación al cliente. Cierre formal con troubleshooting #101 + bump a `v1.25.0-alpha-omnigastro`.

**Semana siguiente:** cerrar gaps reales del FEAT-112 (soft-delete + Restrict + linter), luego FEAT-113 (PosSession + WAITER), luego migración Prisma `*_omnigastro_core` para que FEAT-125 (alcance completo) pueda reemplazar el JSON-almacén.

---

*Fin del Plan Operativo + Prompts OmniGastro — 2026-09-03 — v1.24.04 base.*
