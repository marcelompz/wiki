# Plan de Actualización v1.43.8 — FEAT-210: flujo cocina real (READY del KDS) + notificación al mozo + cobro por sesión (OCCUPIED)

**Fecha:** 2026-10-27 · **Rama:** `fix/omnigastro-kds-ready-notificaciones` (desde `product/omnigastro`) · **Versión:** `1.43.8` (patch)
**Origen:** QA del usuario en producción v1.43.7 (`docs/info/OmniGastro.md` § "2026-10-27 - prueba en producción v1.43.7")

---

## 1. Diagnóstico (causa raíz)

### Bug 1 — Cocina/mozo/cliente: el "listo" está roto de punta a punta (3 síntomas, 1 causa)

**Causa raíz única:** el botón "Enviar a cocina" del POS de mozo (FEAT-208, v1.43.6) **NO usa el endpoint real de cocina** `POST /orders/:id/send-to-kitchen` (que pone la orden en `PREPARING`, emite ticket KDS a la estación, telemetría t2/t3/t4 y sync Odoo). En su lugar hace `claim` → `POST /orders/:id/ready` (`guestMarkReady`), que **al mismo tiempo** setea `sentToKitchenAt` **y** `readyAt`, y status `READY`.

Cascada de efectos (los 3 síntomas del QA):

| # | Síntoma reportado | Explicación técnica |
|---|---|---|
| 1a | "En cocina, al marcar listo se elimina de la lista, no cambia de estado" | La comanda llega al KDS **ya `READY`** ("Listo para Retirar") sin pasar por `PREPARING` ("En Cocción") — nunca hubo transición visible. La única acción disponible es "Entregar a Mesa" (`DELIVERED`), que saca la carta del tablero. La cocina no tuvo nada que hacer. |
| 1b | "No da aviso al mozo que el pedido está listo para entregar" | Nadie emite un evento consumible por el dispositivo del mozo cuando cocina marca `READY`. El hook `useWaiterAlerts` solo escucha `waiterCallNew` / `waiterCallUpdate` / `order:new`. |
| 1c | "El endpoint del cliente marca ¡Listo! y todavía no recibió su pedido" | El tracker del cliente (`omni-catalog.tsx`) muestra "¡Listo!" con `done: !!meta.readyAt`; como "Enviar a cocina" setea `readyAt` al instante, el cliente ve ¡Listo! en el momento del **envío**, no de la entrega. |

### Bug 2 — POS del mozo: "OCCUPIED" al atender el pedido de cuenta

**Cadena:** cliente toca "Pedir la cuenta" → `call-waiter` (opción `opt-bill`) → mozo pulsa **Atender** (`take-order`, solo ACKNOWLEDGE) → el frontend navega a `/admin/gastro/pos/:tableId` → en `loadAll`, la consulta de pedidos activos (`DRAFT,CONFIRMED,PREPARING,READY`) vuelve **vacía** (los pedidos ya están `DELIVERED`, una vez entregados) → guard de `gastro-pos.tsx:207`: `!activeOrder && status !== 'FREE'` → mensaje `"Esta mesa tiene estado OCCUPIED. No se puede crear un nuevo pedido..."` + `navigate` fuera del POS.

Es decir: **precisamente cuando hay que cobrar la cuenta** (mesa ocupada, pedidos entregados, sesión abierta), el POS expulsa al mozo. El guard protege la *creación* de pedidos pero bloquea el *cobro por sesión* (FEAT-204), que es el caso de uso del "pedir la cuenta".

---

## 2. Alcance de la solución

### Backend (1 archivo + gateway)
1. **`orders.service.ts` `updateStatus`**: al transicionar a `READY`, emitir evento WebSocket `order:ready` a la sala del tenant con `{ orderId, tableId, tableNumber, sessionId, claimedBy, claimedById }` (nuevo método `emitOrderReady` en `orders.gateway.ts`). Es la notificación 1b; no hay endpoints REST nuevos.
2. `guestMarkReady` (`POST /orders/:id/ready`) queda **intacto** por compatibilidad (ya no lo usa el POS).

### Frontend
3. **`gastro-pos.tsx` — "Enviar a cocina"**: `claim` (best effort) → **`POST /api/v1/orders/:id/send-to-kitchen`** (en vez de `/ready`). El cobro queda bloqueado hasta que cocina marque listo (`isReady` ya depende de `meta.readyAt`, correcto).
   - *Edge case:* si `sendToKitchen` responde con 0 tickets (todas las líneas ocultas p/ KDS), fallback a `/ready` para no dejar la orden eternamente `PREPARING` sin nadie que la marque.
4. **`useWaiterAlerts.ts`**: nuevo listener `order:ready` → sonido + avis "🏁 Mesa X: pedido listo para entregar". El hook ya está montado en `/admin/gastro/mozos` (dispositivo del mozo); **se agrega también en `gastro-pos.tsx`** (tablet abierta en una mesa).
5. **`gastro.tsx`** (panel): listener `order:ready` en su socket propio para el mismo aviso.
6. **`gastro-pos.tsx` — fix OCCUPIED (bug 2)**: quitar el `message.error` + `navigate` del guard. Cuando no hay pedidos activos y la mesa no está `FREE`:
   - Cargar la sesión (`GET /tables/:id/session`, ya existente) y sus cuentas (`GET /table-sessions/:id/bills`).
   - Banner informativo (Alert, tokens de tema — Regla 10): "Mesa X · pedidos entregados · cobro por sesión".
   - Botones: **"💵 Cobrar en mesa"** (`POST /bills/:id/pay`) y **"🍽️ Cerrar cuenta (paga en caja)"** → `POST /table-sessions/:id/close` (force solo si hay cuentas abiertas tras cobrar), que libera la mesa (`FREE`).

### Cliente (sin cambios de código)
El tracker ya es correcto una vez que `readyAt` se setea en el momento real (cocina): envío → "En cocina" (`sentToKitchenAt`), cocina marca listo → "¡Listo!", entrega/cobro → "Entregado y pagado".

---

## 3. Impacto y riesgos

- **No se agregan endpoints REST** ni se cambia el schema → sin migración, sin Traefik nuevo.
- El E2E `gastro-pos-send-kitchen.spec.ts` test 5 cambia de semántica: ahora `readyAt` aparece tras PATCH `READY` simulando cocina (antes tras `/ready` del envío). Se actualiza el spec.
- Riesgo de regresión controlado: `bills.service` y `guest/pending` ya incluyen `PREPARING|READY` en sus filtros de activos (compatibles con el pipeline real).
- Deliberadamente empezado TODO en el flujo del QR guest; otros canales (`gastro-tables` ya usa `send-to-kitchen`) no cambian.

## 4. Estrategia de testing

1. Unit: test del evento `order:ready` (emisión en transición READY) y del fallback de send.
2. E2E (Playwright): ampliar `gastro-pos-send-kitchen.spec.ts` — QR → claim → **send-to-kitchen** (verificar `PREPARING` + `sentToKitchenAt` **sin** `readyAt`) → PATCH `READY` tipo cocina (verificar `readyAt` + cobro habilitado) → cleanup 100% vía API (close con `force`).
3. Barrera `./scripts/init.sh` (con confirmación de recursos al usuario).
4. Deploy-to-local-first (§3.1.1): backup producción → restore → `deploy-local.sh` → smoke del flujo completo + E2E.
5. Producción **con autorización explícita** del usuario: `pre-deploy-diagnostic.sh provecchio` + `deploy-production.sh provecchio`; post-deploy: health + smoke de cocina→mozo vía API (sin tocar sesiones de servicio reales).
6. Cierre documental: bump `1.43.8` en `VERSION` / `backend` / `frontend` / `featurelist` (FEAT-210 `completed`); CHANGELOG; ROADMAP; troubleshooting **#210** (+ índice); `docs/info/OmniGastro.md`; Wiki sincronizada.

## 5. Definition of Done (según el QA)

1. Cocina recibe la comanda como **"En Cocción"** tras "Enviar a cocina" y con "Marcar Listo (Servir)" pasa a "Listo para Retirar" (permanece visible hasta entregar).
2. Al marcar listo en cocina, **el dispositivo del mozo suena y muestra** "Mesa X: pedido listo para entregar".
3. El cliente ve "¡Listo!" **solo cuando cocina marcó listo**, y "Entregado" tras la entrega.
4. Al atender un "Pedir la cuenta", el POS del mozo **abre la mesa en modo cobro por sesión** (sin mensaje OCCUPIED), permite cobrar/liberar y la mesa vuelve a `FREE`.
