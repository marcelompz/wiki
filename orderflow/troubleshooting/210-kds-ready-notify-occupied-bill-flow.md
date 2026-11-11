# Troubleshooting #210 — QA v1.43.7: el "listo" de cocina/mozo/cliente roto de punta a punta + "OCCUPIED" al cobrar la cuenta

**Fecha:** 2026-10-27 · **Versión fij:** v1.43.8 (FEAT-210) · **Severidad:** Alto (flujo de servicio de mesa completo bloqueado en 2 puntos)

## Síntomas (QA en producción v1.43.7)

1. **Cocina (KDS):** al "marcar listo" la comanda se elimina de la lista sin cambio de estado visible.
2. **Mozo:** nunca recibe aviso de que el pedido está listo para entregar (ni sonido ni pop-up en `/admin/gastro/mozos` o el POS).
3. **Cliente (QR `/?t=`):** el tracker muestra "¡Listo!" aunque todavía no recibió su pedido.
4. **POS del mozo:** al atender un "Pedir la cuenta", el POS de la mesa expulsa con `"Esta mesa tiene estado OCCUPIED. No se puede crear un nuevo pedido en una mesa que no esté FREE"` — el cobro es imposible.

## Causa raíz

### A) El "listo" (`sentToKitchenAt`/`readyAt`) se seteaba a la vez

`gastro-pos.tsx` "Enviar a cocina" (FEAT-208, v1.43.6) hacía `claim` → `POST /orders/:id/ready`. `guestMarkReady` setea **ambos** `sentToKitchenAt` **y** `readyAt` + status `READY` **al instante**, sin pasar por el endpoint real `POST /orders/:id/send-to-kitchen` (FEAT-117/147) que pone la orden en `PREPARING`, emite ticket al KDS y deja el `readyAt` para la cocina.

Efectos en cascada:
- El KDS recibía la comanda ya "Listo para Retirar" (nunca pasó por En Cocción) → única acción posible "Entregar a Mesa" (`DELIVERED`) → desaparece sin transición (síntoma 1).
- Nadie emitía un evento en la transición `READY` → el mozo nunca se enteraba (síntoma 2).
- El tracker del cliente muestra "¡Listo!" con `done: !!meta.readyAt` → lo veía apenas el mozo enviaba (síntoma 3).

### B) Guard del POS bloqueaba el único estado que necesitaba cobrar

Tras "Entregar a Mesa", los pedidos quedan `DELIVERED` (fuera del filtro de activos `DRAFT,CONFIRMED,PREPARING,READY`) y la sesión de mesa sigue abierta con la mesa `OCCUPIED`. El guard de `gastro-pos.tsx` (`!activeOrder && status !== 'FREE'` → error + `navigate`) diseñado para proteger la *creación* de pedidos expulsaba al mozo en el flujo de *cobro* (síntoma 4). Además `BillsService.lockOrders` rechazaba pedidos `DELIVERED` (`ORDER_ALREADY_BILLED`), así que ni por API se podía armar la cuenta por sesión.

## Solución (v1.43.8, FEAT-210)

| Archivo | Cambio |
|---|---|
| `backend/src/orders/orders.gateway.ts` | Nuevo `emitOrderReady()`: evento WS `order:ready` con `{orderId, tableId, tableNumber, sessionId, claimedBy, claimedById}` a la sala del tenant. |
| `backend/src/orders/orders.service.ts` | `updateStatus` emite `order:ready` **solo** al transicionar a `READY` (notificación al dispositivo del mozo). |
| `backend/src/bills/bills.service.ts` | `lockOrders` admite pedidos `DELIVERED` con `paymentStatus !== 'paid'` → el cliente pide la cuenta **después** de que la cocina entregó y el mozo igual cobra por sesión (FEAT-204). |
| `frontend/src/pages/admin/gastro-pos.tsx` | 1) "Enviar a cocina" → `POST /orders/:id/send-to-kitchen` (fallback `/ready` si responde 0 tickets). 2) El guard no expulsa: modo **cobro por sesión** (banner + `/bills/:id/pay` + `table-sessions/:id/close`). |
| `frontend/src/hooks/useWaiterAlerts.ts` | Listener `order:ready` → sonido + "🏁 Mesa X: pedido listo para entregar" (hook ya montado en `/admin/gastro/mozos`; ahora también en el POS de mesa). |
| `frontend/src/pages/admin/gastro.tsx` | Aviso `order:ready` en el panel de mozos. |

## Flujo correcto resultante

```
QR (DRAFT) → mozo reclama+edita → "Enviar a cocina" (PREPARING, ticket KDS, SIN readyAt)
→ KDS "En Cocción" → "Marcar Listo (Servir)" (READY + readyAt + evento order:ready)
→ dispositivo del mozo: "🏁 Mesa X: pedido listo para entregar"
→ POS del mozo habilita el cobro → cliente ve "¡Listo!" (real)
→ (detrás: "Pedir la cuenta" → Atender) → POS acepta mesa OCCUPIED sin pedidos activos
→ Cobrar en mesa (bills pay) o Cerrar sin cobrar → sesión CLOSED → mesa FREE
```

## Verificación (2026-10-27, localhost restore de producción)

- Unit: 32/32 de `orders.service.spec.ts` (incluye emisión de `order:ready` y negativa en otras transiciones).
- E2E `gastro-pos-send-kitchen.spec.ts` **6/6** (nueva assert: tras send-to-kitchen, `readyAt` debe SER falsy).
- Smoke bug-2 por API: pedido claim+ready+DELIVERED → `POST /bills` (MERGED, pedido entregado) `201` → `pay` `201` → `close` (sin force) `201` → mesa `FREE`.

## Lecciones

1. **Un endpoint por transición:** el "listo" es un milestone de la cocina; el envío no debe setear `readyAt`. Los endpoints de FEAT-117 (`send-to-kitchen`) existen para eso — usarlos en vez de simular con `/ready`.
2. **Los guards de creación no deben bloquear el cobro:** estado `OCCUPIED` sin pedidos activos ES el estado esperado del "pedir la cuenta".
3. FEAT-208 (v1.43.6) arregló la persistencia de líneas pero consolidó el atajo de `/ready`; el E2E de entonces validaba `readyAt` como "cobro habilitado" y congeló la semántica equivocada.
