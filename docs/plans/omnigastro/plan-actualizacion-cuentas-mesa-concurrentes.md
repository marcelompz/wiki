# Plan de Actualización — Cuentas de mesa y pedidos concurrentes
## FEAT-203 · FEAT-204 · FEAT-205 — `TableSession` + `Bill` (merge/split) + sync Odoo por cuenta

> **Estado:** 🟡 **PROPUESTO — pendiente de aprobación del usuario** (AGENTS.md Reglas #15 y #16)
> **Fecha:** 2026-10-23 · **Vertical:** OmniGastro
> **Rama base:** `product/omnigastro` → feature branches `feat/gastro-table-sessions`, `feat/gastro-bills-merge`, `feat/gastro-odoo-bill-sync`
> **Bump propuesto:** `minor` (1.41.5 → **1.42.0**) — nueva superficie de API y entidades (Regla #11)
> **Documento de flujo:** [`flujo-cuentas-mesa-concurrentes.md`](./flujo-cuentas-mesa-concurrentes.md)
> **Feature flag:** `gastro.tableSessions` (tenant config, default `false` hasta F2)

---

## 1. Problema y objetivo

### 1.1 Escenario reportado

Dos comensales en la misma mesa escanean el **mismo QR** (`/?t=<token>`) y envían su pedido
**al mismo tiempo**. Hoy el sistema crea **dos pedidos independientes** para la misma mesa, sin
vínculo entre ellos ni con la ocupación de la mesa. Al cobrar, la caja ve dos cuentas separadas y
Odoo recibe dos `pos.order` para la misma mesa.

### 1.2 Diagnóstico verificado en código

| # | Hallazgo | Evidencia |
|---|---|---|
| 1 | `POST /api/v1/guest/orders` **siempre crea un `Order` nuevo**; no busca pedidos activos de la mesa ni tiene idempotencia | `backend/src/guest/guest-orders.controller.ts` → `createDraft` |
| 2 | No existe una entidad de **sesión/visita** que agrupe los pedidos de una misma ocupación | `backend/prisma/schema.prisma` (no hay `TableSession`) |
| 3 | La mesa **no cambia de estado** al recibir un pedido QR (sigue `FREE`) | `createDraft` no escribe `restaurantTable.status` |
| 4 | Cada pedido crea su propio `WaiterCall` → **dos alertas** en la tablet del mozo | `createDraft` → `waiterCall.create` |
| 5 | El **Mozo POS** carga `?tableId=X&status=activos&limit=1` → sólo muestra **uno** de los pedidos | `frontend/src/pages/admin/gastro-pos.tsx` |
| 6 | La **caja** arma una tarjeta por pedido (no por mesa) y usa `key={b.tableId}` → **claves React duplicadas** con 2 pedidos en la misma mesa | `frontend/src/pages/admin/gastro-cashier.tsx` |
| 7 | El **claim** es por pedido, no por mesa: dos mozos pueden reclamar la misma mesa | `orders.service.ts` → `guestClaim` |
| 8 | Al cerrar un pedido se dispara **un sync Odoo por pedido** (`order_uuid`) → dos `pos.order` para la misma mesa | `orders.service.ts` → `guestClose` + `odoo-table-sync.processor.ts` |
| 9 | No hay idempotencia: doble tap en el mismo celular crea dos pedidos idénticos | `CartDrawer` no bloquea el envío; backend sin `idempotencyKey` |
| 10 | Sin lock ni índice único: dos requests concurrentes pasan aunque se agregue un “buscar si existe” | `schema.prisma` sin restricciones por mesa/estado |

### 1.3 Lo que ya existe (base reutilizable)

| Pieza | Modelo actual |
|---|---|
| ID por pedido | `Order.id` (UUID) |
| Pedido ↔ mesa | `Order.tableId` |
| Pedido ↔ cliente | `Order.customerId` |
| Pedido ↔ factura ERP | `Order.accountMoveId` |
| Atribución por comensal | `OrderLine.guestId` + `OrderLine.seatNumber` |
| Comensales por mesa | `TableGuest` (asiento) |
| División de cuenta | `BillSplit` + `SplitPayment` (`BY_SEAT`, `BY_ITEM`, `EQUAL_PARTS`, `CUSTOM_AMOUNT`) |
| Cuenta por persona | `metadata.guestDraft.openAccount` |
| Cobro | `POST /api/v1/pos-sessions/:id/collect` |

### 1.4 Objetivos

1. **Una sesión de mesa** (visita) que agrupe todos los pedidos de la misma ocupación.
2. **Identidad de comensal** por dispositivo/asiento (`guestKey` + `TableGuest` opcional).
3. **Idempotencia** en el alta de pedidos (un envío = un pedido).
4. **Capa de cuenta (`Bill`)** que permita:
   - facturar **cada pedido por separado**, o
   - **unir 2+ pedidos** en una sola cuenta/factura, y **desunir** sin perder datos.
5. **Caja y Mozo POS** mostrando la mesa completa (todas las cuentas/pedidos).
6. **Odoo**: una `pos.order` por cuenta facturada (no por pedido) en modo merge, sin duplicados.
7. **Trazabilidad**: telemetría `t0…t12` y métricas de concurrencia.

### 1.5 Fuera de alcance (por ahora)

- División de una cuenta entre personas con medios de pago distintos más allá de `BillSplit` (ya existe; se reutiliza).
- Facturación electrónica directa (SIFEN): se sigue usando `accountMoveId`/FacturaSend.
- Kiosco/autoservicio y delivery.
- Reasignación automática de mesas.

---

## 2. Decisiones de negocio a confirmar

| # | Decisión | Opciones | Impacto |
|---|---|---|---|
| D1 | ¿La cuenta es **por mesa** o **por comensal** por defecto? | A) por mesa (merge automático) · B) por comensal (pedidos separados) | Define el default de `Bill` |
| D2 | ¿El merge es **solo para cobrar** o **también fiscal**? | A) una factura por cuenta · B) una factura por pedido, pago conjunto | Odoo: 1 `pos.order` vs N |
| D3 | ¿Se pide nombre/asiento al comensal? | A) opcional · B) obligatorio para pedir | UX + atribución |
| D4 | ¿Qué pasa si dos mozos reclaman la misma mesa? | A) gana el primero (409) · B) permitir varios | Regla de claim |
| D5 | ¿Cierre de mesa bloquea si quedan pedidos abiertos? | A) bloquea (409) · B) avisa y fuerza con permiso | Integridad |

**Recomendación:** D1=B (cada comensal puede pedir por separado), D2=A (la `Bill` es la unidad fiscal;
si se necesita factura por pedido, se crea una `Bill` 1:1), D3=A, D4=A, D5=A con override `bills:manage`.

---

## 3. Modelo de datos propuesto

### 3.1 Prisma (aditivo, `snake_case` según AGENTS §2.4)

```prisma
enum TableSessionStatus {
  OPEN
  CLOSED
}

enum BillStatus {
  OPEN
  PAID
  INVOICED
  VOID
}

enum BillMode {
  PER_ORDER // una Bill por pedido (factura individual)
  MERGED    // N pedidos -> una Bill (factura única)
}

model TableSession {
  id               String             @id @default(uuid())
  tenantId         String             @map("tenant_id")
  tableId          String             @map("table_id")
  status           TableSessionStatus @default(OPEN)
  guestCount       Int                @default(1) @map("guest_count")
  assignedWaiterId String?            @map("assigned_waiter_id")
  openedAt         DateTime           @default(now()) @map("opened_at")
  closedAt         DateTime?          @map("closed_at")
  closedById       String?            @map("closed_by_id")
  metadata         Json?

  tenant Tenant          @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  table  RestaurantTable @relation(fields: [tableId], references: [id], onDelete: Restrict)
  orders Order[]
  bills  Bill[]
  guests TableGuest[]

  @@index([tenantId, tableId, status])
  @@index([tenantId, status, openedAt])
  @@map("table_sessions")
}

model Bill {
  id             String     @id @default(uuid())
  tenantId       String     @map("tenant_id")
  tableSessionId String     @map("table_session_id")
  customerId     String?    @map("customer_id")
  status         BillStatus @default(OPEN)
  mode           BillMode   @default(MERGED)
  totalAmount    Decimal    @default(0) @db.Decimal(15, 2)
  currency       String     @default("PYG")
  odooOrderId    String?    @map("odoo_order_id")
  odooOrderRef   String?    @map("odoo_order_ref")
  accountMoveId  String?    @map("account_move_id")
  lockedAt       DateTime?  @map("locked_at")
  paidAt         DateTime?  @map("paid_at")
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt

  session  TableSession @relation(fields: [tableSessionId], references: [id], onDelete: Restrict)
  customer Customer?    @relation(fields: [customerId], references: [id], onDelete: SetNull)
  orders   Order[]
  splits   BillSplit[]

  @@index([tenantId, status])
  @@index([tableSessionId])
  @@map("bills")
}
```

### 3.2 Cambios en modelos existentes

```prisma
model Order {
  // ... campos actuales ...
  tableSessionId String? @map("table_session_id")
  tableGuestId   String? @map("table_guest_id")
  billId         String? @map("bill_id")
  guestKey       String? @map("guest_key")        // huella del dispositivo
  idempotencyKey String? @map("idempotency_key")  // UUID por envío

  tableSession TableSession? @relation(fields: [tableSessionId], references: [id], onDelete: SetNull)
  tableGuest   TableGuest?   @relation(fields: [tableGuestId], references: [id], onDelete: SetNull)
  bill         Bill?         @relation(fields: [billId], references: [id], onDelete: SetNull)

  @@unique([tenantId, idempotencyKey])
  @@index([tableSessionId, status])
  @@index([billId])
}

model TableGuest {
  tableSessionId String? @map("table_session_id")
  guestKey       String? @map("guest_key")
  session        TableSession? @relation(fields: [tableSessionId], references: [id], onDelete: Cascade)
}

model BillSplit {
  orderId String? @map("order_id") // pasa a nullable
  billId  String? @map("bill_id")
  bill    Bill?   @relation(fields: [billId], references: [id], onDelete: Cascade)
}
```

### 3.3 Índices parciales (SQL crudo; Prisma no los expresa)

Migración `20261024120000_gastro_table_sessions_bills`:

```sql
-- Una sola sesión abierta por mesa
CREATE UNIQUE INDEX IF NOT EXISTS table_sessions_one_open_per_table
  ON table_sessions (table_id)
  WHERE status = 'OPEN';

-- Un solo pedido activo por (sesión, comensal)
CREATE UNIQUE INDEX IF NOT EXISTS orders_one_active_per_guest
  ON orders (table_session_id, guest_key)
  WHERE status IN ('DRAFT','CONFIRMED','PREPARING','READY')
    AND guest_key IS NOT NULL;

-- Idempotencia del alta (por tenant)
CREATE UNIQUE INDEX IF NOT EXISTS orders_idempotency_key
  ON orders (tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Asiento único por sesión (reemplaza el unique legacy por mesa)
CREATE UNIQUE INDEX IF NOT EXISTS table_guests_session_seat
  ON table_guests (table_session_id, seat_number)
  WHERE table_session_id IS NOT NULL;

-- BillSplit: exactamente uno de order_id | bill_id
ALTER TABLE bill_splits ADD CONSTRAINT bill_splits_target_chk
  CHECK ((order_id IS NOT NULL)::int + (bill_id IS NOT NULL)::int = 1);
```

> **Nota:** el unique legacy `table_guests(table_id, seat_number)` se conserva para filas sin
> `table_session_id`. Revisar `docs/troubleshooting/06-postgresql-camelcase-column-names.md` y `#132`
> antes de escribir la migración.

### 3.4 Backfill de datos existentes

Script idempotente `scripts/backfill-table-sessions.ts`:

1. Para cada mesa con pedidos en estados activos (`DRAFT,CONFIRMED,PREPARING,READY`) **y** sin
   sesión abierta: crear una `TableSession` y asignar `tableSessionId` a esos pedidos.
2. Crear una `Bill` `OPEN` por cada pedido activo con `mode = PER_ORDER` (no cambia el
   comportamiento actual hasta activar el flag).
3. Pedidos `DELIVERED/CANCELLED` históricos: no se tocan (sin sesión).
4. Ejecutar con `--dry-run` por defecto; `--apply` para persistir.

---

## 4. Flujos y estados

### 4.1 Ciclo de vida de la sesión

```
[mesa FREE] --primer pedido QR / claim--> [session OPEN] --todos los pedidos cerrados + bills pagadas--> [session CLOSED] --> [mesa FREE/CLEANING]
```

- `session OPEN` es única por mesa (índice parcial).
- La sesión se crea en la **primera** creación de pedido o en el **claim** del mozo.
- Al cerrar: validar que no queden pedidos activos ni bills `OPEN`.
- `assignedWaiterId`: primer mozo que reclama; los demás reciben 409 (D4=A).

### 4.2 Alta de pedido QR (idempotente)

```
POST /api/v1/guest/orders
1. Resolver mesa por qrToken.
2. Abrir/obtener sesión (tx + lock de la mesa).
3. Si idempotencyKey ya existe -> devolver el pedido existente (200, idempotent=true).
4. Buscar pedido activo de (sesión, guestKey):
   - si existe y appendToOpenOrder=true -> agregar líneas (lock del pedido)
   - si no -> crear pedido nuevo con tableSessionId + guestKey
5. Crear/asignar TableGuest si viene seatNumber/guestName.
6. Crear UNA WaiterCall por pedido (no por línea).
7. Emitir WebSocket (newOrder / waiterCallNew).
```

### 4.3 Merge / unmerge / cobro

```
Caja: selecciona 2+ pedidos de la misma sesión
  POST /api/v1/bills { sessionId, orderIds[] }
    -> crea Bill MERGED, mueve orderIds (valida que no estén PAID/INVOICED)
    -> recalcula total
  POST /api/v1/bills/:id/orders { orderIds[] }   // agregar a una cuenta existente
  POST /api/v1/bills/:id/unmerge { orderIds[] }  // mover a una Bill nueva PER_ORDER
  POST /api/v1/bills/:id/pay { payments[] }      // suma exacta = total
  POST /api/v1/bills/:id/invoice { mode, customer }
```

Reglas:
- Un pedido pertenece a **una** `Bill` a la vez.
- No se puede mergear un pedido ya pagado/facturado (409).
- `Bill.mode` se define al crearla: `PER_ORDER` (1 pedido) o `MERGED` (N pedidos).
- El pago puede dividirse por asiento (`BillSplit` + `SplitPayment`), pero la **factura** es una
  sola por `Bill`.

### 4.4 Odoo

| Modo | Trigger | Payload | Resultado |
|---|---|---|---|
| `PER_ORDER` | cierre del pedido (actual) | `sync_table_order` | 1 `pos.order` por pedido |
| `MERGED` | pago/facturación de la `Bill` | **`sync_bill`** (nuevo) | 1 `pos.order` por cuenta |

- `sync_bill` es **upsert idempotente** por `bill_uuid` (`omniflow_bill_ref`).
- Si el `pos.order` está en `draft` → reemplaza líneas y recalcula.
- Si está pagado/publicado → 409 (requiere nota de crédito o void manual).
- El addon sube a **v14.0.1.4.0** (campo `omniflow_bill_ref` + método `sync_bill`).

---

## 5. Contratos REST

### 5.1 Público (sin auth)

| Método | Ruta | Cambio |
|---|---|---|
| `GET` | `/api/v1/guest/tables/by-token/:qrToken` | Agrega `session` (`{id,status}` o `null`), `activeOrders`, `waiterOptions` normalizado a `{id,label,icon}` |
| `POST` | `/api/v1/guest/orders` | Agrega `guestKey`, `guestName?`, `seatNumber?`, `idempotencyKey`, `appendToOpenOrder?`; responde `sessionId`, `billId`, `merged`, `idempotent` |
| `GET` | `/api/v1/guest/orders/:id` | Agrega `sessionId`, `billId`, `guestName` |

> `waiterOptions`: normalizar también los valores legacy (`call_waiter`, `request_bill`,
> `waiter_take_order`) a etiquetas legibles; el fix del select vacío ya se aplicó en v1.41.5
> (troubleshooting #199).

### 5.2 Core (JWT + permisos)

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| `GET` | `/api/v1/tables/:tableId/session` | `tables:view` | Sesión actual + pedidos + bills + totales |
| `POST` | `/api/v1/table-sessions/:id/claim` | `orders:write` | Asigna mozo a la sesión (409 si ya tiene otro) |
| `POST` | `/api/v1/table-sessions/:id/close` | `tables:manage` | Cierra sesión (409 si hay pedidos/bills abiertas) |
| `GET` | `/api/v1/table-sessions/:id/bills` | `orders:read` | Cuentas de la sesión |
| `POST` | `/api/v1/bills` | `orders:write` | Crea cuenta con `{sessionId, orderIds[]}` (merge) |
| `POST` | `/api/v1/bills/:id/orders` | `orders:write` | Agrega pedidos a la cuenta |
| `POST` | `/api/v1/bills/:id/unmerge` | `orders:write` | Separa pedidos a una cuenta nueva |
| `POST` | `/api/v1/bills/:id/pay` | `pos:charge` | Registra pagos (suma exacta) |
| `POST` | `/api/v1/bills/:id/invoice` | `orders:write` | Emite/sincroniza factura |
| `GET` | `/api/v1/cashier/bills` | `pos:view` | Cuentas agrupadas por mesa/sesión |

### 5.3 Adapter / Odoo

| Método | Ruta | Cuerpo |
|---|---|---|
| `POST` | `/api/omniflow/sync_bill` | `{ tenant_id, bill_uuid, odoo_config_id, odoo_table_id, lines[], customer?, mode }` |

Respuesta: `{ status:'ok', odoo_order_id, uid, created|updated }` o `{ status:'error', message }`.

---

## 6. Concurrencia e idempotencia

| Operación | Mecanismo |
|---|---|
| Abrir sesión | `SELECT ... FOR UPDATE` sobre `restaurant_tables` + índice único parcial + `ON CONFLICT DO NOTHING` |
| Alta de pedido | `idempotency_key` único; en `P2002` devolver el pedido existente |
| Append de líneas | Lock `FOR UPDATE` del pedido + recálculo en la misma transacción |
| Merge/unmerge | Lock de la sesión y de los pedidos (`FOR UPDATE`), validar estados |
| Claim | `UPDATE ... WHERE assigned_waiter_id IS NULL` (atómico); si `rowcount=0` → 409 |
| Cierre de sesión | Lock de la sesión + conteo de pedidos/bills abiertas en la misma tx |
| Pago | `Bill.lockedAt` + validación `sum(payments) = total` en tx |
| Doble tap | `idempotencyKey` + botón deshabilitado en el cliente |

**Pruebas obligatorias de carrera:** dos conexiones concurrentes creando sesión/pedido sobre la
misma mesa; verificar un solo registro y respuesta idempotente.

---

## 7. Facturación y fiscalidad

| Escenario | `Bill.mode` | Facturas | Odoo |
|---|---|---|---|
| Cada comensal pide su factura | `PER_ORDER` (1 pedido por Bill) | N | N `pos.order` |
| Una cuenta para la mesa | `MERGED` | 1 | 1 `pos.order` con todas las líneas |
| Pago conjunto con facturas separadas | `PER_ORDER` + pago a nivel sesión (fase posterior) | N | N `pos.order` |

- En Paraguay la factura legal se emite por `Bill`; si se requiere RUC, la `Bill` debe tener
  `customerId` con `taxId`.
- **No** se puede fusionar fiscalmente un pedido ya facturado. El merge solo aplica a pedidos
  `DRAFT/CONFIRMED/PREPARING/READY` sin `Bill` facturada.
- `BillSplit` se reutiliza para dividir el pago de una `Bill` por asiento/ítem.

---

## 8. UX

### 8.1 Cliente (QR)

- Identidad liviana: `guestKey` en `localStorage` + nombre opcional.
- Tras enviar: “Pedido #ABC123 · Mesa G6 · Ana”.
- Historial del dispositivo (FEAT-197) sigue igual.
- Si la mesa ya tiene sesión: “Te sumaste a la mesa G6”; el pedido se agrega al de ese comensal.

### 8.2 Mozo POS (`gastro-pos.tsx`)

- Carga **todos** los pedidos activos de la sesión (no `limit=1`).
- Encabezado: mesa + sesión + mozo asignado + total de la mesa.
- Lista agrupada por comensal/pedido; acciones por pedido; botón **“Unir cuentas”**.
- El fallback de historial de mesa cerrada (#198) se mantiene.

### 8.3 Caja (`gastro-cashier.tsx`)

- Una tarjeta por **sesión/mesa** (no por pedido).
- Detalle expandible con pedidos/comensales.
- Selección múltiple → **Unir cuentas** / **Separar**.
- Cobro por cuenta; split por asiento.
- Claves React por `sessionId`/`billId` (elimina el bug de keys duplicadas).

---

## 9. Plan por fases

### F0 — Preparación (0.5–1 día)

| Archivo | Cambio |
|---|---|
| `backend/prisma/schema.prisma` | `TableSession`, `Bill`, enums, campos en `Order`/`TableGuest`/`BillSplit` |
| `backend/prisma/migrations/20261024120000_gastro_table_sessions_bills/` | Migración aditiva + índices parciales + backfill |
| `scripts/backfill-table-sessions.ts` | Backfill idempotente con `--dry-run`/`--apply` |
| Config del tenant | Flag `gastro.tableSessions=false` |

### F1 — Sesión + identidad + idempotencia (3–4 días)

| Archivo | Cambio |
|---|---|
| `backend/src/guest/guest-orders.controller.ts` | Abrir/reusar sesión, `guestKey`, `idempotencyKey`, append, guest |
| `backend/src/guest/guest-tables.controller.ts` | Devolver sesión + normalizar `waiterOptions` |
| `backend/src/orders/orders.service.ts` | `guestClaim` a nivel sesión; helpers de sesión |
| `backend/src/tables/tables.service.ts` | `GET /tables/:id/session`, cierre de sesión |
| `frontend/src/pages/admin/gastro-pos.tsx` | Cargar todos los pedidos de la sesión |
| `frontend/src/pages/admin/gastro-cashier.tsx` | Agrupar por sesión + keys correctas |
| `frontend/src/pages/omni-catalog.tsx` | `guestKey` + `idempotencyKey` + bloqueo de envío |
| Tests | Unit + integración de concurrencia + E2E 2 contextos |

### F2 — Cuentas (`Bill`) merge/unmerge + cobro (4–5 días)

| Archivo | Cambio |
|---|---|
| `backend/src/bills/` (nuevo módulo) | `BillsController`/`BillsService`: crear, agregar, separar, pagar |
| `backend/src/pos/pos-sessions.*` | Cobro por `billId` (compatibilidad con `orderId`) |
| `backend/src/bill-split/` | Soportar `billId` |
| `frontend/src/pages/admin/gastro-cashier.tsx` | UI de merge/unmerge, cobro por cuenta, split por asiento |
| `frontend/src/pages/admin/gastro-pos.tsx` | Acción “Unir cuentas” + total de mesa |
| Tests | Unit de totales + E2E merge/unmerge/pago |

### F3 — Odoo por cuenta + observabilidad (3–4 días)

| Archivo | Cambio |
|---|---|
| `odoo-adapter/src/index.js` | `POST /api/omniflow/sync_bill` |
| `odoo-adapter/odoo-addons/pos_omniflow_sync/` | `omniflow_bill_ref` + `sync_bill` (v14.0.1.4.0) |
| `backend/src/queues/odoo-table-sync.*` | Job `sync_bill` + telemetría |
| `backend/src/orders/odoo-table-sync.listener.ts` | Trigger por `Bill`, no por pedido (modo MERGED) |
| Docs | `flujo-cuentas-mesa-concurrentes.md`, troubleshooting, CHANGELOG |
| Tests | Newman `sync_bill`, E2E con Odoo de staging/local |

**Total estimado:** 11–14 días de desarrollo + pruebas.

---

## 10. Migración y despliegue

1. **Deploy-to-local-first** (AGENTS §3.1.1): backup de producción → restore local → migración → E2E.
2. Migración **aditiva**: no elimina columnas ni tablas; el código anterior sigue funcionando.
3. Backfill con `--dry-run` y revisión de conteos antes de `--apply`.
4. Feature flag `gastro.tableSessions`:
   - `false` → comportamiento actual (rollback instantáneo).
   - `true` → sesiones + bills.
5. Deploy con `./scripts/deploy-production.sh provecchio` (autorización previa), build forzado,
   health checks, QA de rutas.
6. Verificación post-deploy:
   - 2 contextos simultáneos → 1 sesión, 2 pedidos.
   - Caja: merge de 2 pedidos → 1 cuenta; pago; Odoo 1 `pos.order` con todas las líneas.
   - Cierre de sesión bloquea con pedidos abiertos.

---

## 11. Telemetría y KPIs (Telemetry-First)

| Hito | Nombre canónico | Dónde |
|---|---|---|
| t0 | `t0_session_opened` | `TableSessionsService.open` |
| t1 | `t1_order_created` | `GuestOrdersController.createDraft` |
| t2 | `t2_order_attached` | append a pedido/sesión existente |
| t3 | `t3_table_claimed` | claim de sesión |
| t4 | `t4_sent_to_kitchen` | envío a cocina |
| t5 | `t5_ready` | KDS listo |
| t6 | `t6_bill_opened` | creación de `Bill` |
| t7 | `t7_bill_merged` | merge/unmerge |
| t8 | `t8_payment_started` | inicio de cobro |
| t9 | `t9_paid` | pago confirmado |
| t10 | `t10_invoice_synced` | `sync_bill` OK |
| t11 | `t11_session_closed` | cierre de sesión |
| t12 | `t12_table_freed` | mesa liberada |

> Los hitos existentes `t0_order_created`, `t1_table_claimed`, `t11_table_closed` se mantienen como
> **alias** en `metadata.guestDraft` hasta migrar los dashboards.

**KPIs**

| KPI | Fórmula | Objetivo |
|---|---|---|
| Tasa de duplicados | pedidos con `idempotencyKey` repetida / total | < 0.1% |
| Pedidos por sesión | promedio | 1.2–2.0 |
| Tasa de merge | bills MERGED / bills totales | según negocio |
| Pedidos huérfanos | pedidos activos al cerrar sesión | 0 |
| Latencia de sesión | `t1 - t0` p95 | < 300 ms |
| Latencia sync factura | `t10 - t6` p95 | < 5 s |
| Errores de merge | 409/500 / intentos | < 1% |

---

## 12. Estrategia de testing

| Nivel | Casos |
|---|---|
| **Unit** | Apertura de sesión concurrente, idempotencia, append, merge/unmerge, recálculo de totales, validación de cierre, asignación de pagos |
| **Integración (Postgres)** | Índices parciales: dos inserts concurrentes → 1 fila; `idempotencyKey` duplicada → 1 pedido |
| **E2E Playwright** | 2 contextos con el mismo QR envían a la vez → 1 sesión, 2 pedidos; caja une 2 cuentas → 1 bill; pago; sesión cerrada; Mozo POS muestra todo |
| **Newman** | Contratos nuevos (`/bills`, `/table-sessions`, `sync_bill`) |
| **Datos** | Backfill sobre copia de producción; conteos antes/después; rollback |
| **Regresión** | Historial de mesa cerrada (#198), sync Odoo (#184–188), split billing (FEAT-116), cuenta abierta (FEAT-190) |

Ejecución obligatoria antes del merge: `npx tsc --noEmit`, unit tests, build, `deploy-local.sh`,
E2E, y `./scripts/init.sh` **con autorización del usuario** (Regla #3).

---

## 13. Riesgos y mitigaciones

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| POS de Odoo reescribe el pedido desde memoria (#198) | Alta | Alto | Merge/edición solo en `draft`; recargar POS antes de operar; documentar |
| Carrera en apertura de sesión | Media | Alto | Lock + índice parcial + test de concurrencia |
| Migración de `table_guests` (unique legacy) | Media | Medio | Índice parcial + conservar legacy; probar sobre backup |
| Ambigüedad fiscal (factura por pedido vs cuenta) | Alta | Alto | Decisión D2 antes de F2 |
| Pedidos huérfanos al cerrar | Media | Alto | Cierre bloqueante (409) + reporte |
| Doble cobro | Baja | Alto | Pago idempotente + `Bill.lockedAt` |
| Performance de la caja | Media | Medio | Índices `(tenant,status)`, `(session,status)`; paginación |
| Duplicados en Odoo | Media | Alto | `sync_bill` upsert por `bill_uuid` + tests |

---

## 14. Rollback

1. `gastro.tableSessions=false` (comportamiento anterior, sin desplegar).
2. Revertir el deploy a la imagen anterior (el script guarda rollback env).
3. Las tablas nuevas son aditivas; no afectan al código viejo.
4. Si se aplicó el backfill y hay que revertirlo: `TableSession`/`Bill` sin pagos pueden eliminarse
   en orden (`Order.billId = null` → bills → sessions); los pedidos conservan sus datos.

---

## 15. Criterios de aceptación

- [ ] Dos envíos simultáneos desde la misma mesa generan **una** sesión y **dos** pedidos vinculados.
- [ ] Un doble tap con la misma `idempotencyKey` devuelve **el mismo** pedido (sin duplicar líneas ni WaiterCall).
- [ ] La caja muestra **una** tarjeta por mesa/sesión y permite **unir** y **separar** cuentas.
- [ ] El pago de una cuenta unificada marca todos sus pedidos como pagados y no permite doble cobro.
- [ ] Odoo recibe **una** `pos.order` por cuenta (modo MERGED) con todas las líneas, sin duplicados.
- [ ] El cierre de sesión se bloquea si quedan pedidos o cuentas abiertas.
- [ ] El Mozo POS lista todos los pedidos de la mesa, con el historial de mesa cerrada intacto.
- [ ] Telemetría `t0…t12` visible y KPIs calculados.
- [ ] Suite unitaria, integración, E2E y Newman en verde; `deploy-local.sh` OK.

---

## 16. Referencias

- `backend/src/guest/guest-orders.controller.ts` — alta de pedido guest
- `backend/src/orders/orders.service.ts` — claim/close/history
- `backend/prisma/schema.prisma` — `Order`, `OrderLine`, `TableGuest`, `BillSplit`, `SplitPayment`
- `frontend/src/pages/admin/gastro-pos.tsx` — Mozo POS
- `frontend/src/pages/admin/gastro-cashier.tsx` — caja
- `odoo-adapter/src/index.js` + `pos_omniflow_sync` — sync Odoo
- `docs/plans/omnigastro/PLAN_CUENTA_ABIERTA_2026-10-20.md` — antecedente de cuenta por persona
- `docs/plans/omnigastro/flujo-cuentas-mesa-concurrentes.md` — diagramas y contratos
- `docs/troubleshooting/198-pos-odoo-items-faltantes-e-historial-mozo.md`
- `docs/troubleshooting/199-select-vacio-llamar-mozo-qr.md`
