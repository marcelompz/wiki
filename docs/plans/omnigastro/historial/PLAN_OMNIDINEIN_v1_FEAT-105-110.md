# Plan Maestro: OmniDineIn — Módulo Restaurante + KDS para OmniFlow POS

**Proyecto:** OrderFlow / OmniFlow
**Módulo comercial:** OmniDineIn (add-on "+" instalable sobre el POS core, patrón Odoo Restaurant App pero con más granularidad)
**IDs de Feature asignados:** FEAT-105 a FEAT-110 (próximo ID libre confirmado contra `featurelist.json` v1.20.24 — último ID real es FEAT-104; huecos existentes: FEAT-076, FEAT-101, FEAT-102)
**Ubicación de este documento en el repo:** `docs/planes/pos-kds/PLAN_OMNIDINEIN.md`

---

## 0. Resumen ejecutivo y decisiones de arquitectura

Validado contra el repo real (schema.prisma, orders.service.ts, rbac.service.ts, users/auth):

1. **No se crea una columna nueva para "dueño del pedido".** `Order.sellerId` / `OrderLine.sellerId` ya existen y se propagan automáticamente (FEAT-057, Seller Attribution Engine, completed). Se reutiliza como campo canónico de propiedad operativa: representa al **Mozo** en modo restaurante o al **Vendedor** en venta de salón sin mesas. La UI decide la etiqueta ("Mozo" vs "Vendedor") según si el tenant tiene OmniDineIn instalado.
2. **No se crea un rol obligatorio nuevo para "mozo cajero".** `rbac.service.ts` ya combina permisos de rol base (`RolePermission`) con overrides individuales (`UserTenantPermission`, `granted: true/false`). "Mozo que además cobra" = mismo rol `WAITER`/`SELLER` + permiso puntual `cash:collect` otorgado a esa persona. No estándar, sin duplicar roles.
3. **Inconsistencia detectada en `featurelist.json`:** FEAT-078 ("OmniPOS: Terminal POS Offline-First + KDS Nativo") sigue en estado `planned` y apunta a `backend/src/pos/`, `backend/src/kds/`, `backend/src/bom/` — carpetas que **nunca se crearon**. Su alcance quedó absorbido por FEAT-097 (completed), implementado dentro de `backend/src/orders/` e `backend/src/inventory/`. Recomendación para el rol Revisor: marcar FEAT-078 como `superseded_by: FEAT-097` en el próximo paso de sincronización, para no arrastrar una tarea fantasma.
4. **Cierre de caja actual (FEAT-093) es un reporte, no una sesión real.** El "cierre de caja" en `orders.service.ts` calcula un `sessionId` sintético al vuelo (`POS-${tenantId}-${Date.now()}`) agregando `CashMovement` del día completo del tenant — pensado para conciliar con `pos.session`/`account.journal` de Odoo, no para llevar apertura/cierre/arqueo por cajero o por tablet. Este plan lo reemplaza por un modelo `PosSession` real sin romper la conciliación con Odoo (FEAT-093 se mantiene como consumidor del nuevo modelo).
5. **El módulo se instala/desinstala** vía `ModuleInstallation` (igual que los demás módulos del ecosistema). Un tenant sin OmniDineIn instalado sigue operando con venta de salón plana (vendedor dueño del pedido, sin mesas/asientos) — no se rompe nada del comportamiento actual.

---

## 1. Mapa de fases

| Fase | FEAT-ID | Título | Depende de |
|---|---|---|---|
| 1 | FEAT-105 | Cimientos: rol CASHIER/WAITER, permisos `cash:*`/`tables:*`, `PosSession` real, `CashMovement.registeredBy` FK | FEAT-057, FEAT-093 |
| 2 | FEAT-106 | Mesas, Zonas y Mapa de Piso — propiedad del Mozo y traspaso por superior | FEAT-105 |
| 3 | FEAT-107 | Asientos/Comensales — traspaso de comensal entre mesas con sus pedidos | FEAT-106 |
| 4 | FEAT-108 | División de Cuentas (split billing): por asiento, por ítem, por monto, partes iguales | FEAT-107 |
| 5 | FEAT-109 | Caja Móvil en Tablet del Mozo — apertura/cierre, informe de arqueo | FEAT-105 |
| 6 | FEAT-110 | Atribución en KDS + Cursos/Pacing (entrada, principal, postre) | FEAT-097, FEAT-106 |

Cada fase es un sprint independiente y deployable — no rompe producción si se corta ahí.

---

## 2. Modelo de datos (diff conceptual sobre `schema.prisma`)

```prisma
enum UserRole {
  ADMIN
  MANAGER
  SELLER
  WAITER      // NUEVO — mozo; hereda permisos base similares a SELLER
  VIEWER
}

model PosSession {
  id            String    @id @default(uuid())
  tenantId      String
  cashierId     String    // FK -> User, quien abrió la sesión
  deviceLabel   String?   // "Caja 1", "Tablet Mozo Juan", etc.
  openingFloat  Decimal   @db.Decimal(15, 2)
  closingCash   Decimal?  @db.Decimal(15, 2)   // contado físicamente al cierre
  expectedCash  Decimal?  @db.Decimal(15, 2)   // calculado por el sistema
  variance      Decimal?  @db.Decimal(15, 2)   // closingCash - expectedCash
  status        String    @default("OPEN")     // OPEN | CLOSED
  openedAt      DateTime  @default(now())
  closedAt      DateTime?
  tenant        Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  cashMovements CashMovement[]

  @@index([tenantId, status])
  @@index([cashierId])
  @@map("pos_sessions")
}

// CashMovement: registeredBy pasa de String? suelto a FK real; posSessionId gana relación
model CashMovement {
  // ...campos existentes...
  registeredById String?      @map("registered_by_id")
  registeredBy   User?        @relation(fields: [registeredById], references: [id])
  posSession     PosSession?  @relation(fields: [posSessionId], references: [id])
}

model RestaurantTable {
  id           String    @id @default(uuid())
  tenantId     String
  name         String                // "Mesa 5", "Terraza 2"
  zone         String?               // "Salón", "Terraza", "Barra"
  capacity     Int       @default(4)
  posX         Int?                  // coordenadas del mapa de piso
  posY         Int?
  status       String    @default("FREE") // FREE | OCCUPIED | BILL_REQUESTED | CLEANING
  ownerId      String?               // FK -> User, mozo dueño actual de la mesa
  currentOrderId String?  @unique    // Order/cuenta abierta de la mesa
  tenant       Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId, status])
  @@index([ownerId])
  @@map("restaurant_tables")
}

model TableTransferLog {
  id           String   @id @default(uuid())
  tenantId     String
  tableId      String
  fromOwnerId  String?
  toOwnerId    String
  authorizedById String?  // quien forzó el cambio si no fue el propio mozo (MANAGER/ADMIN)
  reason       String?
  createdAt    DateTime @default(now())

  @@index([tableId])
  @@map("table_transfer_logs")
}

model TableGuest {
  id          String   @id @default(uuid())
  tenantId    String
  tableId     String
  seatNumber  Int
  label       String?             // "Comensal 1" o nombre real si se carga
  status      String   @default("SEATED") // SEATED | MOVED | CHECKED_OUT
  createdAt   DateTime @default(now())

  @@index([tableId])
  @@map("table_guests")
}

// OrderLine gana referencia opcional a comensal — habilita split y traspaso
model OrderLine {
  // ...campos existentes...
  guestId String? @map("guest_id")
  guest   TableGuest? @relation(fields: [guestId], references: [id], onDelete: SetNull)
}

model BillSplit {
  id          String   @id @default(uuid())
  tenantId    String
  orderId     String
  method      String              // BY_SEAT | BY_ITEM | EQUAL_PARTS | CUSTOM_AMOUNT
  parts       Int?                // para EQUAL_PARTS
  createdById String
  createdAt   DateTime @default(now())

  splitPayments SplitPayment[]
  @@index([orderId])
  @@map("bill_splits")
}

model SplitPayment {
  id          String   @id @default(uuid())
  billSplitId String
  guestId     String?
  amount      Decimal  @db.Decimal(15, 2)
  paymentType String
  status      String   @default("pending") // pending | paid
  billSplit   BillSplit @relation(fields: [billSplitId], references: [id], onDelete: Cascade)

  @@map("split_payments")
}
```

Permisos nuevos en `rbac.service.ts` (`PERMISSION_SEED`):

```ts
{ name: 'cash:collect',        module: 'cash' },
{ name: 'cash:open_session',   module: 'cash' },
{ name: 'cash:close_session',  module: 'cash' },
{ name: 'cash:audit',          module: 'cash' },
{ name: 'tables:own',          module: 'tables' },   // ser dueño de una mesa
{ name: 'tables:transfer',     module: 'tables' },   // ceder la propia mesa
{ name: 'tables:reassign',     module: 'tables' },   // forzar cambio de dueño (superior)
{ name: 'tables:manage',       module: 'tables' },   // editar mapa de piso, crear/borrar mesas
```

---

## 3. Fase 1 — FEAT-105: Cimientos de Roles y Caja

**Objetivo:** habilitar el permiso granular de cobro y la sesión de caja real, sin romper FEAT-093/FEAT-057.

**Cambios de código:**
- `orders.controller.ts`: extraer `req.user` en `confirm()` (hoy no lo hace) y pasarlo al service.
- `orders.service.ts`: `confirm()` exige `cash:collect` (no `orders:update`), completa `CashMovement.registeredById` con el usuario autenticado, y valida que exista una `PosSession` OPEN para ese usuario/tenant antes de aceptar el cobro.
- Nuevo `pos-session.service.ts` (dentro de `backend/src/orders/` o un módulo nuevo `backend/src/pos-sessions/` según lo decida el Líder): `openSession`, `closeSession` (calcula `expectedCash` sumando `CashMovement` de esa sesión, recibe `closingCash` contado y calcula `variance`), `getActiveSession(userId, tenantId)`.
- `rbac.service.ts`: agregar el bloque `cash:*`/`tables:*` a `PERMISSION_SEED` y correr `seedPermissions()`.

### PROMPT — FEAT-105

```
Rol: Implementador (seguir AGENTS.md / docs/00-contexto-agentes.md).
Tarea: FEAT-105 — Cimientos de Roles y Caja para OmniDineIn.

Contexto: revisar backend/prisma/schema.prisma (modelos Order, OrderLine, CashMovement,
User, UserTenantAccess, Permission, RolePermission, UserTenantPermission) y
backend/src/common/rbac.service.ts antes de tocar nada.

Cambios requeridos:
1. schema.prisma: agregar rol WAITER al enum UserRole. Agregar modelo PosSession
   según el diff de docs/planes/pos-kds/PLAN_OMNIDINEIN.md sección 2. Convertir
   CashMovement.registeredBy (String?) en CashMovement.registeredById (FK real a
   User) y agregar relación a PosSession vía posSessionId existente.
2. rbac.service.ts: agregar a PERMISSION_SEED los permisos cash:collect,
   cash:open_session, cash:close_session, cash:audit, tables:own, tables:transfer,
   tables:reassign, tables:manage.
3. Crear servicio de sesión de caja (decidir módulo: dentro de orders/ o
   pos-sessions/ nuevo, siguiendo el patrón de módulos existente con .module.ts,
   .controller.ts, .service.ts, .manifest.json) con: openSession(tenantId,
   cashierId, openingFloat, deviceLabel?), closeSession(sessionId, closingCash) —
   calcula expectedCash sumando CashMovement.type=IN menos OUT de esa sesión y
   variance = closingCash - expectedCash —, getActiveSession(tenantId, userId).
4. orders.controller.ts: en confirm(), extraer (req as any)['user'] (hoy no se
   extrae) y pasarlo a ordersService.confirm(). Cambiar el guard de @RequirePermissions
   de 'orders:update' a 'cash:collect' para ese endpoint específico.
5. orders.service.ts: confirm() ahora recibe el user autenticado, valida que
   tenga una PosSession OPEN (si no, lanzar BadRequestException indicando que
   debe abrir caja antes de cobrar), y completa registeredById al crear el
   CashMovement.

Reglas obligatorias (AGENTS.md): tenantId nunca se omite de ninguna query.
Prohibido instanciar PrismaClient directamente — usar this.prisma o
@TenantPrisma(). No modificar lógica de negocio en base a ORDERFLOW_MODE.
No comentar código salvo pedido explícito. No hacer commit/push.

Al terminar: informar qué archivos se tocaron y dejar pendiente para el rol
Revisor correr ./scripts/init.sh (NO ejecutarlo sin confirmación explícita del
usuario) y actualizar featurelist.json con FEAT-105 (status: in_progress ->
completed cuando se valide), version en VERSION/backend/package.json/
frontend/package.json/README.md/ROADMAP.md/CHANGELOG.md/docs/02-architecture.md.
```

---

## 4. Fase 2 — FEAT-106: Mesas, Zonas y Mapa de Piso

**Objetivo:** el mozo es dueño de la mesa desde que abre la cuenta; un superior puede reasignarla.

**Reglas de negocio:**
- Al crear la primera `Order` de una mesa (`status: FREE` → `OCCUPIED`), `RestaurantTable.ownerId` se fija al `sellerId`/usuario autenticado (requiere permiso `tables:own`).
- Ceder la propia mesa a otro mozo: requiere `tables:transfer` en el mozo origen (o el mozo destino aceptando).
- Forzar cambio de dueño sin que el mozo origen participe: requiere `tables:reassign` (MANAGER/ADMIN). Todo cambio queda en `TableTransferLog` con motivo.
- Mapa de piso (`posX`/`posY` por mesa) editable solo con `tables:manage`.

### PROMPT — FEAT-106

```
Rol: Implementador.
Tarea: FEAT-106 — Mesas, Zonas y Mapa de Piso.
Depende de FEAT-105 ya aplicado (PosSession, permisos tables:*).

Cambios requeridos:
1. schema.prisma: agregar modelos RestaurantTable y TableTransferLog según
   docs/planes/pos-kds/PLAN_OMNIDINEIN.md sección 2. Order gana campo opcional
   tableId (relación a RestaurantTable.currentOrderId es 1:1 inversa).
2. Nuevo módulo backend/src/tables/ (tables.module.ts, tables.controller.ts,
   tables.service.ts, tables.manifest.json) con endpoints:
   - GET  /api/v1/tables            (mapa de piso, requiere tables:own o superior)
   - POST /api/v1/tables/:id/open   (abrir mesa -> crea Order, fija ownerId
     al usuario autenticado; requiere tables:own)
   - POST /api/v1/tables/:id/transfer  (body: toOwnerId, reason?; si el
     solicitante no es el ownerId actual, requiere tables:reassign en vez de
     tables:transfer; registra TableTransferLog)
   - PATCH /api/v1/tables/:id/status   (FREE|OCCUPIED|BILL_REQUESTED|CLEANING)
   - CRUD de mesas y posX/posY: requiere tables:manage
3. orders.service.ts: al crear un pedido con tableId, heredar sellerId del
   ownerId de la mesa si no viene explícito en el DTO.
4. Agregar tables.manifest.json al array moduleDirs de modules.registry.ts.

Reglas AGENTS.md: mismas de siempre (tenantId, @TenantPrisma(), Axios, sin
comentarios salvo pedido, sin commit/push).

Al terminar: reportar archivos tocados. No correr init.sh sin confirmación.
```

---

## 5. Fase 3 — FEAT-107: Asientos, Comensales y Traspaso entre Mesas

**Objetivo:** granularidad por comensal — si alguien de la mesa 5 se muda a la mesa 8, sus ítems (`OrderLine`) lo acompañan.

**Reglas de negocio:**
- Cada mesa abierta puede generar N `TableGuest` (uno por asiento ocupado, `seatNumber` 1..capacity).
- Cada `OrderLine` puede asociarse a un `guestId` opcional (si no se asocia, se entiende "para la mesa" sin dueño individual — ej. una picada compartida).
- `moveGuestToTable(guestId, toTableId)`: marca el `TableGuest.status = MOVED`, crea/reutiliza un `TableGuest` en la mesa destino, y **reasigna** las `OrderLine` de ese comensal desde el `Order` de la mesa origen al `Order` de la mesa destino (si la mesa destino no tiene `Order` abierta, se crea una). Se debe recalcular `totalAmount` de ambas órdenes afectadas dentro de una transacción Prisma.

### PROMPT — FEAT-107

```
Rol: Implementador.
Tarea: FEAT-107 — Asientos/Comensales y traspaso entre mesas.
Depende de FEAT-106.

Cambios requeridos:
1. schema.prisma: agregar modelo TableGuest. OrderLine gana guestId opcional
   (FK a TableGuest, onDelete: SetNull).
2. backend/src/tables/: agregar endpoints
   - POST /api/v1/tables/:id/guests          (crear comensal/asiento)
   - POST /api/v1/tables/guests/:guestId/move  (body: toTableId) -> ejecuta
     moveGuestToTable dentro de una transacción Prisma ($transaction): 
     a) valida que guestId y toTableId pertenezcan al mismo tenantId
     b) mueve/crea TableGuest en destino, marca el de origen como MOVED
     c) reasigna todas las OrderLine con guestId al orderId de la mesa
        destino (creando el Order de destino si la mesa está FREE)
     d) recalcula totalAmount de la Order origen y destino
     e) emite evento por WebSocket (ordersGateway) a ambas mesas para refrescar
        UI del mozo en tiempo real
3. orders.service.ts: exponer método interno reutilizable para recalcular
   totalAmount de una Order a partir de sus OrderLine (si no existe ya, no
   duplicar lógica — revisar antes de escribir).

Reglas AGENTS.md: transacciones Prisma para toda operación multi-tabla,
tenantId siempre presente, sin PrismaClient directo, Axios, sin comentarios
salvo pedido, sin commit/push.

Al terminar: reportar archivos tocados y casos límite no cubiertos (ej. mesa
destino sin capacidad, comensal con ítems ya enviados a cocina).
```

---

## 6. Fase 4 — FEAT-108: División de Cuentas (Split Billing)

**Objetivo:** cerrar una mesa dividiendo el pago por asiento, por ítem, en partes iguales, o por monto custom.

**Reglas de negocio:**
- `BillSplit.method`: `BY_SEAT` (agrupa `OrderLine` por `guestId` y genera un `SplitPayment` por comensal), `BY_ITEM` (el mozo/cajero arma manualmente qué línea va en cada `SplitPayment`), `EQUAL_PARTS` (divide `totalAmount` entre `parts`), `CUSTOM_AMOUNT` (montos libres que deben sumar el total).
- La `Order` solo pasa a `paymentStatus: paid` cuando **todos** los `SplitPayment` de su `BillSplit` activo están en `status: paid`.
- Cada `SplitPayment` pagado genera su propio `CashMovement` (mismo `posSessionId`/`registeredById` del cajero que lo cobra — puede ser el mismo mozo si tiene `cash:collect`, o un cajero fijo).

### PROMPT — FEAT-108

```
Rol: Implementador.
Tarea: FEAT-108 — División de Cuentas (Split Billing).
Depende de FEAT-107.

Cambios requeridos:
1. schema.prisma: agregar modelos BillSplit y SplitPayment según sección 2
   del plan.
2. orders.controller.ts / orders.service.ts: nuevo endpoint
   POST /api/v1/orders/:id/split (body: method, parts?, guestAssignments?)
   -> crea BillSplit + SplitPayment[] según el método (reutilizar
   agrupación por guestId ya disponible desde FEAT-107 para BY_SEAT).
   POST /api/v1/orders/split-payments/:id/pay (body: paymentType) -> exige
   cash:collect + PosSession abierta (mismo check que confirm() de FEAT-105),
   marca ese SplitPayment como paid, crea su CashMovement, y si es el último
   pendiente de su BillSplit, marca la Order como paymentStatus: paid y
   status CONFIRMED, libera la mesa (RestaurantTable.status = CLEANING).
3. Validación: la suma de amount de todos los SplitPayment de un BillSplit
   debe ser igual a Order.totalAmount (tolerancia de redondeo a definir con
   el Líder, sugerido 1 unidad de la moneda base).

Reglas AGENTS.md de siempre. Al terminar: reportar archivos tocados.
```

---

## 7. Fase 5 — FEAT-109: Caja Móvil en Tablet del Mozo

**Objetivo:** el mozo con tablet puede o no ser cajero. Si lo es, abre y cierra su propia caja con informe de arqueo.

**Reglas de negocio:**
- Un mozo con `cash:collect` otorgado (vía `UserTenantPermission`, no vía rol) puede abrir una `PosSession` propia con `deviceLabel` identificando la tablet (ej. "Tablet-Mozo-Juan").
- Sin `cash:collect`: el mozo solo toma pedidos y los envía a cocina; el cobro debe hacerlo un cajero fijo con su propia `PosSession`.
- Cierre de sesión = informe de arqueo: total esperado por método de pago (efectivo/tarjeta/transferencia, ya calculado como `breakdown` en la lógica actual de `orders.service.ts` líneas ~660-705, que se reutiliza), efectivo contado, diferencia (`variance`), y listado de `CashMovement` de esa sesión.

### PROMPT — FEAT-109

```
Rol: Implementador.
Tarea: FEAT-109 — Caja Móvil en Tablet del Mozo (apertura/cierre + arqueo).
Depende de FEAT-105 (PosSession) y FEAT-108 (split payments generan
CashMovement con posSessionId).

Cambios requeridos:
1. Servicio de PosSession de FEAT-105: agregar getSessionReport(sessionId)
   que devuelve: breakdown de CashMovement por paymentType (reutilizar la
   lógica de agrupación ya existente en orders.service.ts, NO reescribirla —
   extraerla a un método compartido si hoy está inline), openingFloat,
   expectedCash, closingCash, variance, y el listado de movimientos.
2. Endpoints en pos-sessions (o donde el Líder decida ubicarlos):
   POST /api/v1/pos-sessions/open   (requiere cash:open_session)
   POST /api/v1/pos-sessions/:id/close  (body: closingCash; requiere
     cash:close_session; devuelve el reporte de arqueo)
   GET  /api/v1/pos-sessions/:id/report (requiere cash:audit o ser el propio
     cashierId de la sesión)
3. Frontend (coordinar con el Líder si corresponde a este sprint o al
   siguiente): pantalla de tablet del mozo muestra botón "Abrir caja" /
   "Cerrar caja" SOLO si el usuario tiene el permiso cash:collect resuelto
   por rbac.service.ts — no hardcodear por rol.

Reglas AGENTS.md de siempre. Al terminar: reportar archivos tocados.
```

---

## 8. Fase 6 — FEAT-110: Atribución en KDS + Cursos/Pacing

**Objetivo:** la pantalla de cocina sabe quién tomó el pedido, y se puede escalonar el envío por curso (entrada/principal/postre) en vez de mandar todo junto.

**Cambios de código:**
- `orders.service.ts` → `sendToKitchen()`: agregar `sellerId`/nombre del mozo (`order.sellerId`) al objeto `kdsTicket` que hoy se emite sin esa información.
- `OrderLine` gana campo opcional `course: Int` (1 = entrada, 2 = principal, 3 = postre, etc.) fijado por el mozo al tomar el pedido.
- `sendToKitchen()` acepta un parámetro `course?` para enviar solo las líneas de ese curso (permitiendo escalonar en vez de mandar todo el pedido de una).

### PROMPT — FEAT-110

```
Rol: Implementador.
Tarea: FEAT-110 — Atribución de mozo en KDS + envío por cursos.
Depende de FEAT-097 (ya completed) y FEAT-106.

Cambios requeridos:
1. schema.prisma: OrderLine gana campo course Int? (default null = sin curso
   definido, se envía siempre).
2. orders.service.ts sendToKitchen(): agregar al objeto kdsTicket los campos
   sellerId y sellerName (join simple a User) tomados de order.sellerId.
   Agregar parámetro opcional dto.course: si viene, filtrar order.orderLines
   por ese course antes de armar el ticket y de la explosión de BoM; si no
   viene, comportamiento actual (todas las líneas).
3. Revisar orders.gateway.ts: el evento kds:ticket_new ya emite el objeto
   completo, no requiere cambios de contrato, solo lleva los campos nuevos.

Reglas AGENTS.md de siempre. Al terminar: reportar archivos tocados.
```

---

## 9. Funcionalidades adicionales sugeridas (backlog, sin numerar aún)

No pediste esto explícitamente pero surgen directo de lo que ya estás construyendo — para que decidas si entran en el alcance "sin competencia":

- **Fusión y división de mesas**: juntar dos mesas para un grupo grande (`RestaurantTable.mergedIntoId`) o dividir una mesa grande en sub-cuentas sin mover comensales físicamente.
- **Propinas trazables**: `tipAmount` en `SplitPayment`/`CashMovement`, con reporte de distribución si hay pool de propinas entre mozos de un turno — encaja con el mismo `registeredById`/`sellerId` que ya vas a tener.
- **Anulación de ítems con motivo + aprobación**: hoy no vi ningún control de "void" sobre `OrderLine` ya enviada a cocina; sin esto, un mozo puede borrar un ítem consumido sin dejar rastro. Requiere motivo obligatorio y, sobre cierto monto, aprobación de superior (mismo patrón que `tables:reassign`).
- **Descuentos con motivo + aprobación**: mismo problema que arriba pero sobre `discountAmount` (ya existe en `confirm()`), hoy sin trazabilidad de quién autorizó.
- **PIN/login rápido en tablet compartida**: si varias mozas comparten una sola tablet física (no 1 tablet por persona), la sesión de usuario no alcanza — conviene un PIN corto por turno para no perder atribución.
- **Reporte de rotación de mesa** (tiempo promedio ocupada, cobertura por turno): dato que ya vas a tener con `openedAt`/`status` de `RestaurantTable`, solo falta el reporte — encaja bien como consumidor de OmniBI (FEAT-100).
- **Reservas de mesa** ligadas a `EventOps`/Vivento si en algún momento querés unificar reservas de salón con el módulo de eventos que ya diseñaste.
- **Modo offline-first en la tablet** con cola de sincronización: ya está referenciado como pendiente en FEAT-012/FEAT-078 (mobile) — vale la pena que OmniDineIn dependa de esa capa en vez de asumir conexión siempre activa, porque un mozo con la tablet en el salón es el caso de uso típico de mala señal WiFi.

---

## 10. Nota de proceso (Revisor)

Al cerrar cada fase, seguir el protocolo estándar: sincronizar `VERSION`, `backend/package.json`, `frontend/package.json`, `README.md`, `ROADMAP.md`, `CHANGELOG.md`, `docs/02-architecture.md`, el `*.manifest.json` correspondiente, y la Wiki en `/opt/wiki/orderflow/`. Marcar FEAT-078 como superseded en la misma pasada (ver sección 0, punto 3). No correr `./scripts/init.sh` sin confirmación explícita del usuario antes de cada merge.
