# Plan de Actualización — v1.39.25 · Historial de pedidos y bandera de Mozo

> **Vertical:** OmniGastro (Restaurante / Bar)
> **Alcance:** 2 features nuevas + 1 fix estructural detectado durante el análisis
> **Estado del plan:** 🟡 **ESPERANDO APROBACIÓN DEL USUARIO** (ningún cambio de código de funcionalidad aplicado todavía)
> **Fecha:** 2026-10-22
> **Featurelist global:** `featurelist.json` (`FEAT-197` nueva, `FEAT-194` replanteada)
> **Flujo y telemetría:** [`flujo-historial-pedidos.md`](./flujo-historial-pedidos.md)

---

## 0. Contexto: qué se acaba de desplegar

El deploy del 2026-10-21 21:53 llevó a `provecchio.com` (host `192.168.69.240`) la release
acumulada **v1.39.22 + v1.39.23 + v1.39.24**:

| Versión | Qué corrigió |
|---|---|
| **v1.39.22** | 3 rutas admin devolvían *404 Página no encontrada* (`/admin/social-catalog`, `/admin/loyalty`, `/admin/gastro/kds-stations`) — borradas del router por el commit `7f6bae00` |
| **v1.39.23** | POS por mesa: *"El pedido aún no fue reclamado por el mozo"* (HTTP 400 en `POST /api/v1/orders/:id/ready`) — faltaba el `claim` previo y el guard `claimedBy` en `sendToKitchen` |
| **v1.39.24** | POS del mozo en tablet: el catálogo solo existía dentro de un `Drawer` cerrado → botón **☰ "Productos"** |

Estado verificado tras el deploy: health `1.39.24 ok`, 5 contenedores `healthy`, QA post-deploy
con las 8 rutas admin en verde, backup `pre_deploy_provecchio_20261021_211340.sql` y rollback
`deploy-artifacts/rollback-provecchio-20261021_212239.env`.

**Lo que este plan recoge es el resto del reporte del cliente del 2026-10-21** (ítem 2 de
`docs/info/OmniGastro.md`) **más FEAT-194**, que estaba planificada pero nunca detallada.

---

## 1. Análisis del problema (hallazgos verificados en código)

### 1.1 Cliente: el pedido se pierde tras confirmar

| Hallazgo | Ubicación exacta |
|---|---|
| Al confirmar el pedido se ejecuta `usePublicCartStore.getState().clearCart()` → el carrito queda vacío | `frontend/src/pages/omni-catalog.tsx:358` (dentro de `sendOrderWithMode`, L335-371) |
| El `orderId` (UUID) solo se conserva en la URL (`?track=<uuid>`) y en el estado React `trackingOrderId` | `frontend/src/pages/omni-catalog.tsx:269`, `L360-362` |
| **No se persiste en `localStorage`/`sessionStorage`** (los únicos `setItem` del archivo son config de catálogo, modo de vista y tema) | `frontend/src/pages/omni-catalog.tsx:83, L168, L239` |
| "Volver al menú" borra el `?track=` → el cliente pierde la referencia al pedido | `frontend/src/pages/omni-catalog.tsx:813-835` (L823 `delete('track')`, L825 `setTrackingOrderId(null)`) |
| El tracking es un *polling* cada 3 s contra `GET /api/v1/guest/orders/:id` | `frontend/src/pages/omni-catalog.tsx:282-298` |
| **No existe** ninguna UI de "mis pedidos" en `frontend/src` (hits de "historial/mis pedidos" solo en `admin/loyalty.tsx`, `admin/kds.tsx`, `admin/qr-generator.tsx`) | — |
| El backend solo expone `GET /api/v1/guest/orders/:id` (track puntual) y **ningún listado** de pedidos del cliente | `backend/src/guest/guest-orders.controller.ts:210-239` |
| Bio-Link: el pedido se guarda solo en estado React (`setOrderSuccess`), se pierde al recargar | `frontend/src/pages/public-biolink.tsx:242-243` |

**No existen** en `schema.prisma` los campos `publicId`, `shortCode`, `trackingCode` ni el modelo
`GuestOrder`: el estado del pedido guest vive en `Order.metadata.guestDraft` (JSON libre, sin esquema).

### 1.2 Panel de mozos: lo atendido se pierde al cambiar de dispositivo

| Hallazgo | Ubicación exacta |
|---|---|
| `orders` y `calls` son estado local en memoria | `frontend/src/pages/admin/gastro.tsx:15-16` |
| La lista de pedidos solo trae los **activos**: `status: { in: ['DRAFT','CONFIRMED','PREPARING','READY'] }`, `take: 50` → al cerrar el pedido (`status:'DELIVERED'`) **desaparece** | `backend/src/orders/orders.service.ts:1642-1695` (L1647, L1650); cierre en L1590 |
| **No existe** endpoint de histórico de pedidos por mesa/turno/restaurante | `backend/src/orders/orders.controller.ts:56-69` (`GET /api/v1/orders`) es lo más cercano: acepta `status` CSV, `limit`, `tableId`, `stationId` → base reutilizable |
| El panel filtra por `order?.meta?.claimedById`, campo que **nunca se escribe** → filtro roto | `frontend/src/pages/admin/gastro.tsx:190-197` vs `backend/src/orders/orders.service.ts:1176-1196` (`guestClaim` escribe `claimedBy`/`claimedAt`, no `claimedById`) |
| La sesión de mozo vive 100 % en `localStorage` (`omniGastroActiveWaiter` + tokens) → otro dispositivo no sabe quién es el mozo | `frontend/src/pages/admin/gastro-mozos.tsx:38-48, L92-98, L110-116` |
| El KDS guarda su historial de sesión solo en memoria → se pierde al recargar | `frontend/src/pages/admin/kds.tsx:23` (`servedOrders`), L314-334, handler `order:status_updated` L182-206 |
| El histórico de *llamadas* sí existe en servidor (el cliente filtra) | `backend/src/waiter/waiter-calls.controller.ts:35-54` (`GET /api/v1/waiter/calls?waiterId=`, hasta 100, incluye `RESOLVED`) |

### 1.3 FEAT-194: la "bandera de Mozo" no existe

| Hallazgo | Ubicación exacta |
|---|---|
| `Employee` **no tiene** ningún campo `isWaiter` / `canWaiter` / `canUseMozoPos` / `isMozo` | `backend/prisma/schema.prisma:3695-3759` |
| El "gate" actual es un filtro por **texto de cargo**: `GASTRONOMY_POSITIONS` (incluye `WAITER`, `Mozo`, `Cocinero`, `Cajero`, `Jefe de Sala`, …) | `backend/src/users/services/users.service.ts:6-9, 185-205` (`getGastronomyStaff`) |
| El login del mozo es `POST /api/v1/auth/verify-pin` → busca el PIN **entre todos** los empleados de gastronomía | `backend/src/auth/auth.controller.ts:185-204`; `backend/src/auth/auth.service.ts:749-796` (L750 `getGastronomyStaff`, L751 match de PIN, L761-767 rol y `contactId`) |
| El selector de mozos de la UI consume `GET /api/v1/users/staff` → **misma** lista de gastronomía, sin distinguir cargos | `frontend/src/pages/admin/gastro-mozos.tsx:50-67` (L53); `backend/src/users/users.controller.ts:47-66` (clase con `ApiKeyGuard, PermissionsGuard` en L24) |
| El cargo del empleado se modela como texto libre `position` + `positionId` → `Position` (con `code`, `name`, `baseRole`) | `schema.prisma:3714, 3717, 3735`; `Position` en L2180-2206 |
| El alta/edición de empleado vive en HR: `POST /api/v1/hr/employees`, `PUT /api/v1/hr/employees/:id` | `backend/src/hr/hr.controller.ts:59-92`; `backend/src/hr/hr.service.ts:179-260` (create), `L273-340` (update) |
| La config del restaurante OmniGastro (donde el cliente quiere la lista de "Mozo") es la pestaña `gastro` de `/admin/settings` | `frontend/src/pages/admin/settings.tsx:64, 130, 159, 206-208` |
| **No existe** `RolesGuard` ni `@Roles(...)`; la autorización se hace con `ApiKeyGuard` + `PermissionsGuard` + `UserTenantAccess.role` | `backend/src/common/api-key.guard.ts`, `backend/src/common/permissions.guard.ts` |

### 1.4 Bug colateral detectado en el análisis (no estaba en el reporte)

`backend/src/orders/orders.controller.ts:271,276` espera `body.mode`, pero
`frontend/src/pages/admin/gastro.tsx:242` envía `{ closeMode, paidByWaiter }` y
`frontend/src/pages/admin/gastro-pos.tsx:280` envía `{ method }` → el modo de cierre cae siempre en
el default `'WITHOUT_PAYMENT'` (L276) y **`paidAt` nunca se setea desde el panel de mozos**.
→ Se incluye como **FEAT-197-d** (fix de 2 líneas + test) porque el historial de pagos que pide el
cliente no puede mostrar "pagado" si el flag nunca se escribe.

---

## 2. FEAT-197 — Historial y seguimiento de pedidos (cliente + panel de mozos)

> **Requisito del cliente (2026-10-21):** *"después de hacer el pedido se vació su lista de compra.
> Carece de un control de su pedido en el historial. Debe ver el pedido en su estado, así cuando pide
> más cosas sabe cuáles ya se le sirvieron en la mesa y cuántas están marchando. Lo mismo sucede en el
> endpoint de los cajeros: los pedidos ya atendidos solo quedan en la memoria del dispositivo del mozo,
> pero si cambia de dispositivo no puede hacer seguimiento."*

### 2.1 Decisiones de diseño (las que hay que validar antes de codificar)

| Decisión | Opción elegida | Alternativa descartada | Motivo |
|---|---|---|---|
| **Identificador recuperable por el cliente** | `Order.publicCode` — código corto legible (6 chars, alfabeto sin ambigüedades) + `orderId` UUID ya existente | Exponer los pedidos por `qrToken` de mesa | El token de mesa está impreso en el QR: listar por mesa **filtraría los pedidos de la mesa a cualquiera que tenga el QR**. El código corto lo conoce solo quien hizo el pedido. |
| **Fuente de verdad del historial del cliente** | Dispositivo (localStorage) + re-consulta por `orderId`/`publicCode` | Tabla nueva de sesiones de cliente | La Capa 1 resuelve el 90 % del caso real (mismo dispositivo) sin modelo de datos nuevo. La Capa 2 cubre "cambié de dispositivo" con el código corto. |
| **Historial del mozo** | Endpoint de servidor + `waiterId` en `Order` (campo ya existe, `schema.prisma:1104`) | Nuevo modelo `WaiterShift` | `waiterId` ya está en el schema y no se usa: reutilizarlo evita una tabla nueva. El "turno" de mozo se modela por `waiterId` + ventana temporal. |
| **Privacidad** | El historial del mozo requiere JWT (`JwtAuthGuard`); el del cliente, por código corto público | Listado público por mesa | Un pedido incluye datos de la mesa y el total. El código corto es el mismo nivel de acceso que el QR de la mesa, y se puede invalidar cerrando el pedido. |

### 2.2 Alcance por capas

#### Capa 1 — Cliente: "Mis pedidos" persistente (sin migración)

| # | Tarea | Archivo | Detalle |
|---|---|---|---|
| 1.1 | Nuevo store de pedidos del cliente | `frontend/src/store/public-orders-store.ts` (nuevo, kebab-case) | Zustand + `persist` (`name: 'gaia-spa-orders'`), guarda `{ orderId, publicCode, tableName, createdAt, total }[]`; limitado a 20 |
| 1.2 | Guardar al confirmar | `frontend/src/pages/omni-catalog.tsx` (~L357-362) | **Antes** de `clearCart()`, persistir el pedido; el `clearCart()` se mantiene (el cliente pidió que se vacíe) |
| 1.3 | Botón "Volver al menú" conserva el historial | `frontend/src/pages/omni-catalog.tsx:813-835` | Quitar solo el `?track=` de la URL; **no** borrar el pedido del store |
| 1.4 | UI "Mis pedidos" | `frontend/src/pages/omni-catalog.tsx` (nuevo `<Drawer>`/sección) | Lista de pedidos con estado en vivo; al pulsar uno, reutiliza el polling existente (`GET /api/v1/guest/orders/:id`, L282-298) |
| 1.5 | Estados de la UI | mismo archivo | `Preparando` / `En cocina` / `¡Listo!` / `Entregado` — reutilizar los pasos ya definidos en L724-840 |
| 1.6 | Acceso desde el header | mismo archivo | Botón "Mis pedidos (n)" junto al carrito, visible solo si hay pedidos |

#### Capa 2 — Cliente: recuperar el historial desde otro dispositivo (requiere migración)

| # | Tarea | Archivo | Detalle |
|---|---|---|---|
| 2.1 | Migración Prisma | `backend/prisma/migrations/20261022HHMMSS_add_public_code_to_orders/migration.sql` | `ALTER TABLE "orders" ADD COLUMN "public_code" VARCHAR(12);` + índice único parcial. **snake_case + `@map("public_code")`** (AGENTS.md §2.4). Carpeta con timestamp completo `YYYYMMDDHHMMSS` |
| 2.2 | Campo en el modelo | `backend/prisma/schema.prisma` (`model Order`) | `publicCode String? @unique @map("public_code")` |
| 2.3 | Generador de código | `backend/src/orders/order-public-code.util.ts` (nuevo) | 6 chars de alfabeto `23456789ABCDEFGHJKLMNPQRSTUVWXYZ` (sin `0/O/1/I`), con reintento ante colisión (índice unique) |
| 2.4 | Endpoint público de consulta por código | `backend/src/guest/guest-orders.controller.ts` | `GET /api/v1/guest/orders/by-code/:code` — **público, SIN `@TenantPrisma()` y SIN `ApiKeyGuard`** (AGENTS.md Regla #4), resuelve el tenant desde el propio `Order.tenantId` con `this.prisma`; devuelve `{ orderId, status, totalAmount, tableName, createdAt, lines[], meta }` |
| 2.5 | Endpoint público de listado por mesa + ventana | mismo controller | `GET /api/v1/guest/orders/by-table/:tableId?minutes=240` — **opcional**, expone solo pedidos **abiertos** (no `DELIVERED`) de la mesa; se activa solo si el cliente lo pide explícitamente en una segunda iteración |
| 2.6 | Exponer el código al cliente | `frontend/src/pages/omni-catalog.tsx` (L724-840) | Mostrar "Código de tu pedido: **A7K3**" en la pantalla de tracking para poder recuperarlo en otro dispositivo |
| 2.7 | UI de recuperación | mismo archivo | Input "Tengo un código de pedido" → `GET /by-code/:code` → misma pantalla de tracking |
| 2.8 | Bio-Link | `frontend/src/pages/public-biolink.tsx:242-243` | Persistir el pedido en el mismo store y ofrecer la misma recuperación por código |

#### Capa 3 — Panel de mozos: historial en servidor (multi-dispositivo)

| # | Tarea | Archivo | Detalle |
|---|---|---|---|
| 3.1 | Endpoint de histórico del mozo | `backend/src/orders/orders.controller.ts` (junto a `guest/pending`, L282-287) | `GET /api/v1/orders/guest/history?status=DELIVERED,CANCELLED&tableId=&waiterId=&limit=50` — `JwtAuthGuard`, reutiliza `orders.service.findAll` (L516-561) + filtro por `metadata.guestDraft` |
| 3.2 | Escribir `waiterId` | `backend/src/orders/orders.service.ts` (`guestClaim` L1176-1196, `guestMarkReady` L1198-1220, `guestClose` L1555-1622) | Setear `Order.waiterId` (campo existente, `schema.prisma:1104`) con el id del usuario autenticado → el seguimiento por mozo funciona entre dispositivos |
| 3.3 | Escribir `claimedById` | `backend/src/orders/orders.service.ts:1183` | Añadir `claimedById` a `metadata.guestDraft` → arregla el filtro roto de `gastro.tsx:190-197` |
| 3.4 | Panel: pestañas "En curso" / "Atendidos" | `frontend/src/pages/admin/gastro.tsx` | Nueva pestaña con el histórico del servidor; al recargar o cambiar de dispositivo se recupera |
| 3.5 | Identidad de mozo entre dispositivos | `frontend/src/pages/admin/gastro-mozos.tsx` | Al entrar con PIN en un dispositivo nuevo, el panel muestra "pedidos atendidos por mí" (`waiterId`) |
| 3.6 | KDS: historial de sesión persistente | `frontend/src/pages/admin/kds.tsx:23, L314-334` | Reemplazar el array en memoria por `GET /api/v1/orders/kds/tickets?status=...` (ya existe, `orders.controller.ts:156-161`) |
| 3.7 | **FEAT-197-d** fix del modo de cierre | `backend/src/orders/orders.controller.ts:271,276` | Aceptar `mode` **y** `closeMode`/`method` (normalizar) para que `paidAt` se setee correctamente |

### 2.3 Contratos REST

```text
PÚBLICOS (sin guards, resuelven tenant desde el propio dato — AGENTS.md Regla #4)
  GET  /api/v1/guest/orders/:id                (existente) → estado puntual del pedido
  GET  /api/v1/guest/orders/by-code/:code      (nuevo)    → pedido por código corto
  GET  /api/v1/guest/orders/by-table/:tableId  (nuevo, iteración 2) → pedidos abiertos de la mesa

PROTEGIDOS (JwtAuthGuard)
  GET  /api/v1/orders/guest/history             (nuevo)    → histórico (atendidos/cerrados) por mesa y/o mozo
  GET  /api/v1/orders/kds/tickets               (existente) → tickets del KDS (hoy sin histórico)
```

### 2.4 Telemetría (AGENTS.md Regla 13)

Hitos declarados — **los nombres deben coincidir exactamente** con los que se guarden en
`Order.metadata.guestDraft` (los `t0`/`t1`/`t11` ya existen):

| Hito | Momento | Estado |
|---|---|---|
| `t0_order_created` | Pedido creado por el cliente | ✅ ya existe |
| `t1_table_claimed` | Mozo reclama el pedido | ✅ ya existe |
| `t2_cart_saved` | Cliente guarda el carrito | 🆕 |
| `t3_order_confirmed` | Cliente confirma el pedido | 🆕 (falta) |
| `t4_sent_to_kitchen` | Pedido enviado a cocina | ✅ `sentToKitchenAt` |
| `t5_order_ready` | Pedido listo | ✅ `readyAt` |
| `t6_waiter_viewed_history` | Mozo abre el historial | 🆕 (evento, no columna) |
| `t7_paid` | Pedido cobrado | 🆕 (`paidAt` — depende de FEAT-197-d) |
| `t11_table_closed` | Mesa cerrada | ✅ ya existe |

KPIs de negocio que medirán estas dos mejoras:
- **t4 − t0**: tiempo de atención al pedido (pedido creado → enviado a cocina).
- **t5 − t4**: tiempo de preparación real.
- **t11 − t4**: tiempo de ciclo completo (cocina → cobro).
- **t2 → t3 sin cerrar**: tasa de abandono del carrito.
- **% de pedidos con consulta de seguimiento por el cliente** (endpoint `by-code` + tracking polled).
- **% de mozos que recuperan pedidos tras cambiar de dispositivo** (histórico por `waiterId`).

### 2.5 Criterios de aceptación

1. El cliente confirma un pedido → el carrito se vacía **y** el pedido aparece en "Mis pedidos".
2. El cliente recarga o navega a otra página → "Mis pedidos" sigue listando el pedido con su estado.
3. El cliente pulsa "Volver al menú" → el historial **no** se pierde.
4. El cliente entra en otro dispositivo → puede escribir el código corto y recuperar el pedido.
5. El mozo cierra un pedido → el pedido **sigue visible** en la pestaña "Atendidos" del panel.
6. El mozo entra desde otro dispositivo con su PIN → ve los pedidos que atendió (`waiterId`).
7. `claimedById` queda persistido → el filtro por mozo del panel funciona.
8. Un pedido cerrado desde el panel queda con `paidAt` si se cobra (FEAT-197-d).
9. `GET /api/v1/guest/orders/by-code/:code` **no** filtra pedidos ajenos ni expone datos de otro tenant.
10. Migración Prisma reversible y aplicada en local antes de producción (protocolo §3.1.1).

### 2.6 Estrategia de testing

| Nivel | Qué | Dónde |
|---|---|---|
| Unitario (jest) | Generador de `publicCode` (unicidad, alfabeto), normalización del modo de cierre | `backend/src/orders/*.spec.ts` |
| Unitario (vitest) | Store de pedidos del cliente: persist, límite de 20, `clearCart` no borra el historial | `frontend/src/store/public-orders-store.test.ts` (nuevo) |
| E2E (Playwright) | Cliente: confirmar → ver "Mis pedidos" → recargar → recuperar por código; Mozo: cerrar → ver en "Atendidos" → cambiar de "dispositivo" (login de nuevo) | `frontend/e2e/order-tracking.spec.ts` (nuevo) + extender `frontend/e2e/omnigastro-field-flow.spec.ts` |
| QA | `scripts/qa_e2e_check.py` → 0 errores JS, 0 HTTP 500 en el flujo nuevo | post-deploy |

Helpers E2E a reutilizar: `loginByApi`, `loginAsAdmin`, `loginAsAdminByApi` (en
`frontend/e2e/omnigastro.spec.ts:9,19,53` y `omnigastro-field-flow.spec.ts:9,19`).

---

## 3. FEAT-194 — Bandera de Mozo: solo los empleados con la bandera pueden tener sesión en el POS de Mozo

> **Requisito del cliente (2026-10-21):** *"El endpoint que alimenta `/admin/gastro/mozos` debe
> desplegar SOLO los empleados que están configurados como Mozo en `/admin/settings` → OmniGastro
> (restaurante). Esa configuración se valida con una bandera en la tabla de empleados (Employee) que
> habilita la opción de tener sesión en el POS de Mozo."*

### 3.1 Decisión de diseño

| Decisión | Opción elegida | Alternativa descartada | Motivo |
|---|---|---|---|
| **Fuente de verdad de la bandera** | `Employee.canUseMozoPos Boolean @default(false) @map("can_use_mozo_pos")` | Lista de ids de empleados Mozo en la config de OmniGastro | Una sola fuente de verdad evita la divergencia "configuraciones que dicen una cosa y la tabla otra". La config de OmniGastro **deriva** de la tabla y la edita, en lugar de duplicar el estado. |
| **Nombre del campo** | `canUseMozoPos` (camelCase en Prisma, `can_use_mozo_pos` en la columna) | `isMozo` / `role` | `isMozo` implicaría que el empleado *es* mozo (identidad), mientras la bandera habilita una *capacidad* (poder abrir sesión en el POS de mozo). El texto del requisito dice exactamente eso: "habilita la opción de tener sesión en el POS de Mozo". |
| **Filtro actual vs. bandera** | La bandera **reemplaza** el filtro por `GASTRONOMY_POSITIONS` en el contexto de mozo | Mantener ambos | El filtro por texto de cargo es frágil (`'Mozo'`, `'WAITER'`, `'Jefe de Sala'`… depende de cómo lo escribió el usuario). El cargo se sigue usando para otras cosas (avatar, permisos), pero **la habilitación del POS de mozo** pasa a ser explícita. |
| **Compatibilidad** | Los empleados existentes quedan con `can_use_mozo_pos = false` → **el POS de mozo queda vacío** hasta configurar | Migrar con `true` para los que hoy son mozo | Riesgo de dejar fuera a los mozos actuales. **Propuesta: script de backfill** que marque `true` a los empleados cuyo `position` esté en `GASTRONOMY_POSITIONS` **y** que tengan `pinCode` → el comportamiento no cambia tras el deploy, y el administrador puede corregir la lista desde la UI. Decidir con el usuario. |
| **Doble factor (config + tabla)** | Solo la tabla; la UI de `/admin/settings → OmniGastro` la edita | Ambas por separado | Requisito del cliente: "se valida con una bandera en la tabla de empleados" → la tabla manda. |

### 3.2 Alcance

| # | Tarea | Archivo | Detalle |
|---|---|---|---|
| 1 | Migración Prisma | `backend/prisma/migrations/20261022HHMMSS_add_can_use_mozo_pos_to_employees/migration.sql` | `ALTER TABLE "employees" ADD COLUMN "can_use_mozo_pos" BOOLEAN NOT NULL DEFAULT false;` — **snake_case** (AGENTS.md §2.4), carpeta con timestamp completo |
| 2 | Campo en el modelo | `backend/prisma/schema.prisma` (`model Employee`, L3695-3759) | `canUseMozoPos Boolean @default(false) @map("can_use_mozo_pos")` |
| 3 | DTO de alta/edición | `backend/src/hr/dto/employee.dto.ts` | `canUseMozoPos?: boolean` en `CreateEmployeeDto` y `UpdateEmployeeDto` (con `@IsBoolean()`) |
| 4 | Service HR | `backend/src/hr/hr.service.ts` (create L179-260, update L273-340) | Persistir el campo (`updateData.canUseMozoPos`, como `pinCode` en L336) |
| 5 | Listado de mozos | `backend/src/users/services/users.service.ts` | Nuevo `getMozoStaff(tenantId)`: `status: 'ACTIVE'` **y** `canUseMozoPos: true` — separado de `getGastronomyStaff` (L185-205) para no romper cajeros/cocina |
| 6 | Endpoint | `backend/src/users/users.controller.ts` (L47-66) | `GET /api/v1/users/mozo-staff` (o `?role=mozo` sobre `staff`) con la misma clase de guards (`ApiKeyGuard, PermissionsGuard`, L24) |
| 7 | Verificación de PIN con alcance | `backend/src/auth/auth.service.ts:749-796` | `verifyPin` acepta `scope?: 'mozo'` → si `scope === 'mozo'` exige `canUseMozoPos` y devuelve mensaje explícito: *"Este empleado no está habilitado para el POS de Mozo"* |
| 8 | Selector de mozos | `frontend/src/pages/admin/gastro-mozos.tsx:50-67` | Consumir el listado con bandera; enviar `scope: 'mozo'` en el `verify-pin` (L88) |
| 9 | Panel de mozos | `frontend/src/pages/admin/gastro.tsx` | Mostrar el mozo activo y, si su token no tiene la bandera, avisar "sin habilitación de Mozo" |
| 10 | Configuración en OmniGastro | `frontend/src/pages/admin/settings.tsx` (pestaña `gastro`, L206-208) | Sección **"Empleados Mozo"**: tabla de empleados con `switch` de `canUseMozoPos` → `PUT /api/v1/hr/employees/:id` |
| 11 | Formulario de empleados | `frontend/src/pages/admin/hr.tsx` / `hr-organization.tsx` | Switch "Puede abrir sesión en el POS de Mozo" (visible para admins) |
| 12 | Avatar/rol | `backend/src/users/users.controller.ts:51-66` | Mantener `position` como rol mostrado; añadir `canUseMozoPos` al payload |

### 3.3 Criterios de aceptación

1. `/api/v1/users/mozo-staff` devuelve **solo** empleados `ACTIVE` con `canUseMozoPos = true`.
2. El selector de `/admin/gastro/mozos` lista únicamente esos empleados.
3. Un PIN de un empleado **sin** la bandera devuelve un mensaje claro y **no** emite tokens de sesión de mozo.
4. Un PIN de un empleado **con** la bandera inicia sesión y funciona igual que hoy.
5. Desde `/admin/settings → OmniGastro` se puede activar/desactivar la bandera de un empleado y el cambio
   surte efecto en el selector en la siguiente carga.
6. El backfill deja a los mozos actuales con la bandera activa (si se aprueba la opción del backfill).
7. La migración es reversible y los empleados existentes no se ven afectados en el resto del módulo HR.

### 3.4 Estrategia de testing

| Nivel | Qué |
|---|---|
| Unitario (jest) | `getMozoStaff` filtra por bandera + estado; `verifyPin` con `scope:'mozo'` rechaza sin bandera |
| API (jest e2e) | CRUD de empleado con la bandera; `/users/mozo-staff` con dos empleados (uno con, uno sin) |
| E2E (Playwright) | `/admin/gastro/mozos` solo lista al empleado con la bandera; PIN sin bandera → mensaje de error; PIN con bandera → sesión OK |
| QA | `scripts/qa_e2e_check.py` (sin regresiones en `/admin/gastro/mozos`) |

---

## 4. Fases, dependencias y secuencia de entrega

| Fase | Contenido | Depende de | Entregable | Versión |
|---|---|---|---|---|
| **F0** | Aprobación de este plan por el usuario | — | Decisiones §2.1 y §3.1 confirmadas | — |
| **F1** | FEAT-197 **Capa 1** (cliente, sin migración) + FEAT-197-d (fix modo de cierre) | F0 | El cliente ve "Mis pedidos" y no pierde el historial en su dispositivo | v1.39.25 |
| **F2** | FEAT-194 completa (migración `can_use_mozo_pos`, backend, UI, settings) | F0 | Solo los empleados con bandera tienen sesión de mozo | v1.39.26 |
| **F3** | FEAT-197 **Capa 2** (migración `public_code`, endpoints públicos, recuperación por código) | F1 | El cliente recupera su pedido desde otro dispositivo | v1.39.27 |
| **F4** | FEAT-197 **Capa 3** (histórico del mozo en servidor, `waiterId`, `claimedById`, KDS) | F1 | El mozo no pierde pedidos al cambiar de dispositivo | v1.39.28 |
| **F5** | Capa 2 iteración 2 (listado por mesa, opcional) + telemetría completa | F3, F4 | KPIs t2/t3/t6/t7 en producción | v1.39.29 |

**Reglas de la secuencia**
- Cada fase = **una rama** `feat/gastro-historial-pedidos-f1`, `feat/gastro-bandera-mozo-f2`, … y **un PR**
  hacia `product/omnigastro` (crear la rama de integración si no existe) → `main`.
- Las **migraciones Prisma** viajan en la misma rama de su fase (nunca directo a `main`).
- Cada fase que toque endpoints públicos o contratos REST actualiza la colección de Newman
  (`docs/tests/newman/`) — AGENTS.md §3.3.
- Cada fase que modifique flujos críticos incluye E2E Playwright (§14) y su auditoría
  `docs/plans/omnigastro/auditoria-<tema>.md`.
- Bump de versión por fase (menor si añade endpoints, patch si es fix) en `VERSION`, ambos
  `package.json`, `featurelist.json`, Swagger y `*.manifest.json` (§11).

**Orden de despliegue de las fases**: F1 → F2 → F3 → F4, cada una con el protocolo completo
(backup de producción → restore en localhost → pruebas → deploy → QA post-deploy).

---

## 5. Riesgos y efectos secundarios

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El backfill de `can_use_mozo_pos` deja fuera a un mozo | El mozo no puede abrir sesión | Backfill por `GASTRONOMY_POSITIONS` + `pinCode`; el admin ve la lista en `/admin/settings` y la ajusta; el mensaje de error de `verify-pin` lo dice explícitamente |
| Un endpoint público nuevo (`by-code`) filtra datos de otro tenant | Filtración de información | Resolver el tenant **desde el propio `Order`** (`order.tenantId`) con `this.prisma` — nunca `@TenantPrisma()` sin guard (§4 de AGENTS.md); el código corto es aleatorio y de 6 caracteres; tests de aislamiento por tenant |
| El código corto colisiona | Error de creación del pedido | Índice único + reintento generador (max 5) + test de unicidad con 10 000 generaciones |
| La persistencia en `localStorage` se pierde al limpiar el navegador | El cliente no ve el historial | La Capa 2 (código corto) cubre ese caso; el código se muestra siempre en pantalla |
| Cambiar `GET /api/v1/users/staff` rompe otros consumidores | Consumidores rotos | La lista con bandera se expone en un **endpoint nuevo** (`/users/mozo-staff`); `staff` no cambia de contrato |
| El histórico sin paginación carga demasiados pedidos | Rendimiento | `limit` por defecto (50) + filtros por `tableId`/`waiterId`/fecha; índices en `(tenantId, status, createdAt)` |
| Normalizar `mode`/`closeMode` cambia el comportamiento del cierre | Regresión en el cobro | Se **aceptan ambos** (retrocompatible) + test explícito de los 3 formatos |

---

## 6. Dependencias con el resto del proyecto

- **FEAT-197 Capa 2/3 depende de FEAT-197 Capa 1** (el store del cliente es el que consume el código corto).
- **FEAT-197 Capa 3 reutiliza FEAT-193** (`Order.posSessionId` para el turno de caja) y **FEAT-196**
  (cierre de turno y relevo de cajero) → el "turno" de mozo se apoya en `waiterId`, no en un modelo nuevo.
- **FEAT-194 reutiliza el RBAC** existente (`PermissionsGuard`, `UserTenantAccess.role`) — no introduce un
  sistema de roles nuevo; el `RolesGuard` sigue sin existir y no se crea en esta fase.
- **FEAT-197 Capa 3 toca `guestClaim`**, que es justo el endpoint arreglado en v1.39.23 → validar con el
  mismo escenario de la mesa G10 (`claim` → `ready` → `close`) para no romper el fix anterior.

---

## 7. Trazabilidad con la documentación

| Documento | Acción |
|---|---|
| `featurelist.json` (raíz) | `FEAT-194` → `planned` con referencia a este plan · **nueva `FEAT-197`** |
| `docs/plans/omnigastro/featurelist.json` | espejo de la vertical (FEAT-194/197) |
| `ROADMAP.md` + `docs/ROADMAP.md` | sección "Próximas actualizaciones" con FEAT-197 y FEAT-194 y su secuencia F1–F5 |
| `docs/plans/omnigastro/ROADMAP_OMNIGASTRO.md` | filas FEAT-194 / FEAT-197 en la tabla de estado |
| `docs/plans/omnigastro/README.md` | índice: nuevo plan + nuevo archivo de flujo |
| `docs/info/OmniGastro.md` | ítem 2 del reporte → enlazado a `FEAT-197` |
| `docs/plans/omnigastro/flujo-historial-pedidos.md` | diagrama Mermaid, contratos REST e hitos `t0…t11` (§13) |
| Wiki `/opt/wiki/orderflow/` | sincronización de los archivos anteriores (§7 de AGENTS.md) |

---

## 8. Estado y siguiente acción

**Este plan NO ejecuta cambios de funcionalidad.** Solo documentación y trazabilidad.

Para pasar a la implementación hace falta:

1. **Aprobación explícita** de este plan (§15 y §16 de AGENTS.md).
2. **Confirmar 4 decisiones abiertas**:
   - D1 · ¿Se aprueba el **backfill** de `can_use_mozo_pos` para los mozos actuales? (recomendado: sí)
   - D2 · ¿El código corto del cliente se llama `publicCode` y se muestra en pantalla? (recomendado: sí)
   - D3 · ¿Se implementa la **Capa 2 iteración 2** (listado de pedidos abiertos por mesa)? (recomendado: no, por privacidad)
   - D4 · ¿Se incluye el **fix del modo de cierre** (FEAT-197-d) en la F1? (recomendado: sí, es de 2 líneas y bloquea el histórico de pagos)
3. **Orden de fases**: ¿F1 → F2 → F3 → F4 (recomendado) o priorizar solo F1 + F2?
