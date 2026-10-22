# Auditoría — FEAT-197 F4 + F4b · Historial en servidor del mozo y del cajero

> **Vertical:** OmniGastro · **Fecha:** 2026-10-22 · **Versión:** v1.39.27
> **Rama:** `feat/gastro-historial-servidor-f4` (desde `main` @ `141fa9dd`)
> **Plan maestro:** [`plan-actualizacion-v1.39.25-historial-pedidos-bandera-mozo.md`](./plan-actualizacion-v1.39.25-historial-pedidos-bandera-mozo.md) §2 (Capa 3 y 3b)
> **Flujo:** [`flujo-historial-pedidos.md`](./flujo-historial-pedidos.md)

---

## 1. Requerimiento del cliente

> *"Lo mismo sucede en el endpoint de los cajeros: los pedidos ya atendidos solo quedan en la memoria del
> dispositivo del mozo, pero si cambia de dispositivo no puede hacer seguimiento."*
>
> **Decisión (2026-10-22):** la "memoria del sistema" es para **mozo y cajeros** (usuarios que inician
> sesión), en endpoints autenticados propios, distintos de los del comensal.

---

## 2. Causa raíz verificada

| Hallazgo | Ubicación |
|---|---|
| El panel de mozos solo получает pedidos **en curso** (`DRAFT, CONFIRMED, PREPARING, READY`, `take: 50`); al cerrar el pedido (`DELIVERED`) desaparece | `backend/src/orders/orders.service.ts:1642-1695` (`guestPending`) |
| El panel filtraba por `order?.meta?.claimedById`, campo que **nunca se escribía** (el `claim` guardaba solo el nombre) → el filtro por mozo estaba roto | `frontend/src/pages/admin/gastro.tsx:190-197` vs `orders.service.ts:1176-1196` (`guestClaim`) |
| `Order.waiterId` existía en el schema pero **no se escribía** al reclamar, marcar listo ni cerrar | `backend/prisma/schema.prisma` (`Order.waiterId`) |
| La sesión de caja solo se podía listar **abierta** (`getOpenSessions`); no existía `GET /api/v1/pos-sessions` ni historial de turnos cerrados | `backend/src/pos-sessions/pos-sessions.controller.ts`, `pos-sessions.service.ts:243` |
| El panel de caja solo mostraba la sesión abierta | `frontend/src/pages/admin/gastro-cashier.tsx` |

---

## 3. Implementación

### Capa 3 — Mozo

| # | Tarea | Archivo |
|---|---|---|
| 1 | `guestHistory(tenantId, {status, tableId, waiterId, limit}, db)` — pedidos `DELIVERED`/`CANCELLED` por defecto, con el mismo shape que `guestPending` | `backend/src/orders/orders.service.ts` |
| 2 | `GET /api/v1/orders/guest/history` con `@RequirePermissions('orders:read')` | `backend/src/orders/orders.controller.ts` |
| 3 | `guestClaim` escribe `claimedById` en `metadata.guestDraft` **y** `waiterId` en el pedido | `orders.service.ts` |
| 4 | `guestMarkReady` y `guestClose` imputan el mozo (`waiterId`); el controller les pasa el `user` autenticado | `orders.service.ts`, `orders.controller.ts` |
| 5 | Vista **"📋 En curso / ✅ Atendidos"** en el panel de mozos, con filtro "solo los míos" (`waiterId`) | `frontend/src/pages/admin/gastro.tsx` |

### Capa 3b — Cajero

| # | Tarea | Archivo |
|---|---|---|
| 6 | `listSessions(tenantId, {cashRegisterId, cashierId, state, from, to, limit})` con `_count.orders` y `_count.cashMovements` | `backend/src/pos-sessions/pos-sessions.service.ts` |
| 7 | `GET /api/v1/pos-sessions` (listado) con `ApiKeyGuard` | `backend/src/pos-sessions/pos-sessions.controller.ts` |
| 8 | Card **"🗂️ Historial de Turnos"** en el panel de caja: turno, caja, cajero, inicio, cierre, estado, nº de pedidos y botón **"Ver Reporte Z"** | `frontend/src/pages/admin/gastro-cashier.tsx` |

---

## 4. Validación (localhost, `https://provecchio.local`, backend `1.39.27 ok`)

| Tipo | Resultado |
|---|---|
| E2E `frontend/e2e/order-history-server.spec.ts` | ✅ **4 passed** |
| Suite E2E completa | ✅ **86 passed / 5 skipped / 0 failed** (antes 79) |
| Unitarios backend (`orders`, `users`, `auth`) | ✅ **130 passed** (17 suites) |
| `tsc` backend y frontend | ✅ 0 errores |
| eslint | ✅ 0 errores |

### Qué cubre cada caso E2E

1. **Ciclo completo con imputación** — se crea un pedido guest real, se comprueba que **no** está en
   `guest/history` (está en curso), se hace `claim` → `ready` → `close` y se verifica que:
   - `meta.claimedById` viene persistido en el reclamo;
   - el pedido aparece en `guest/history` con `waiterId`, `claimedById`, `claimedBy` y `closedAt`;
   - el filtro `?waiterId=...` lo devuelve y el filtro `?tableId=...` también.
2. **Vista "Atendidos"** del panel de mozos — el botón existe, la tabla se renderiza con las columnas
   "Mozo" y "Cerrado".
3. **Listado de turnos** — `GET /api/v1/pos-sessions` devuelve turnos con `id`, `state`, `startAt` y
   `_count`; el filtro `?state=CLOSED` solo devuelve turnos cerrados.
4. **Panel de caja** — la card "Historial de Turnos" se renderiza con su tabla y el botón "Ver Reporte Z"
   abre el detalle del turno.

---

## 5. Comportamiento resultante

| Situación | Antes | Ahora |
|---|---|---|
| El mozo cierra un pedido | Desaparece del panel | Queda en **"✅ Atendidos"**, recuperable desde el servidor |
| El mozo recarga o cambia de dispositivo | Pierde el historial | Recupera todo con `GET /api/v1/orders/guest/history` |
| El panel filtra por mozo | No filtraba (campo inexistente) | Filtra por `claimedById` / `waiterId` reales |
| El cajero cierra un turno | No podía volver a verlo | Lo encuentra en **"🗂️ Historial de Turnos"** con su Reporte Z |
| El comensal | — | Sin cambios: su historial sigue siendo local del dispositivo |

---

## 6. Capa 2 (F3) — no implementada (decisión D5)

La **Capa 2** (código corto `publicCode` + `GET /api/v1/guest/orders/by-code/:code`) **queda como
opcional y NO se implementa**: el cliente confirmó que el historial del comensal puede quedar en la
memoria del dispositivo, de modo que no hace falta la recuperación desde otro dispositivo. Si el
comensal lo pide, se activa con su propia migración y su release.

---

## 7. Pendiente

- [ ] Deploy a producción de v1.39.26 y v1.39.27 (requiere autorización explícita).
- [ ] Verificación manual en la tablet del mozo y en el panel de caja de `provecchio.com`.
- [ ] F3 (opcional) si el comensal lo solicita.
