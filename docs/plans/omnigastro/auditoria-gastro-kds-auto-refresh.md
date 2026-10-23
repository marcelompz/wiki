# Auditoría: El KDS no se actualiza solo al enviar el pedido a cocina (bug #5)

> **Punto:** 5 del [backlog del cliente](./BACKLOG_CLIENTE_20261019.md) (v1.39.9) — **crítico de sala**
> **Rama:** `fix/gastro-kds-auto-refresh` · **Versión:** v1.39.15 · **Feature:** FEAT-191
> **Fecha:** 2026-10-20

---

## 1. Reporte del cliente

> When an order is sent to the kitchen from the server's POS
> (`https://provecchio.com/admin/gastro/pos/5e6f1b69-…`), it does not appear
> automatically on the kitchen endpoint (`https://provecchio.com/admin/kds`);
> instead, the "Synchronize all" button must be pressed. This process should be
> automatic, as kitchen staff do not have time to interact with the KDS.

## 2. Causa raíz (dos fallos encadenados)

El backend **sí** notificaba la comanda, pero el evento se emitía a una sala y
con un nombre que el KDS no escuchaba:

**a) Sala equivocada.** `orders.service.ts` (en `sendToKitchen`) emitía:

```ts
this.ordersGateway.server
  .to(`tenant:${tenantId}:station:${stationId}`)   // <- nadie se une a esta sala
  .emit('kds:ticket_new', kdsTicket);
```

El KDS se une a la sala del **tenant**: `socket.emit("join:tenant", { tenantId })`
→ `client.join('tenant:{tenantId}')` (`orders.gateway.ts:43`). La sala de estación
**no la unía nadie**.

**b) Evento que nadie escuchaba.** El KDS escuchaba `order:new` y
`order:status_updated`, que se emiten al **crear/confirmar** el pedido por QR
(`guest-orders.controller.ts:147`, `orders.service.ts:385`). El evento del envío a
cocina era `kds:ticket_new`, sin ningún suscriptor en todo el frontend.

**Consecuencia:** la comanda del mozo solo aparecía en la pantalla de cocina
cuando alguien pulsaba "🔄 Sincronizar Todo".

## 3. Correcciones aplicadas

| # | Archivo | Cambio |
|---|---|---|
| 1 | `backend/src/orders/orders.gateway.ts` | Nuevo `emitKdsTicket(tenantId, stationId, ticket)`: emite `kds:ticket_new` a **la sala del tenant** (donde está el KDS) **y** a la de la estación (para setups multi-KDS) |
| 2 | `backend/src/orders/orders.service.ts` | `sendToKitchen` usa el gateway en lugar del `emit` directo a la sala de estación |
| 3 | `frontend/src/pages/admin/kds.tsx` | Escucha `kds:ticket_new` → **recarga automática debounceada (400 ms)** con la misma llamada que el botón "Sincronizar Todo", más el aviso y el sonido de nueva comanda |
| 4 | `frontend/e2e/kds-ticket-notification.cjs` | Prueba E2E: socket → API → socket, verificando que la comanda llega **sin** pulsar nada |

> La recarga usa la misma fuente que el botón manual (`loadActiveOrders`), de
> modo que la pantalla muestra exactamente lo mismo que la API devuelve (mismo
> shape, mismo filtro de estado, sin duplicados ni diferencias de formato).

## 4. Validación

**E2E local** (`frontend/e2e/kds-ticket-notification.cjs`):

```text
[kds-e2e] Socket conectado, uniendose a la sala del tenant...
[kds-e2e] Enviando a cocina...
[kds-e2e] EVENTO kds:ticket_new recibido: {"orderId":"3e40ba68-…","station":"Cocina","tableNumber":"E2E-KDS","lines":1}
[kds-e2e] OK: el KDS recibe la comanda automaticamente
```

**Unitarios:** 2 casos nuevos en `orders.gateway.spec.ts` (14/14 en verde).

## 5. Notas

- El sonido y el aviso se disparan **una vez por comanda** (no por estación): el
  debounce de 400 ms agrupa varias comandas seguidas en una sola recarga.
- El KDS sigue mostrando todas las comandas del tenant (el endpoint
  `/api/v1/orders?stationId=…` no filtra por estación; la estación es una
  etiqueta). Es el comportamiento previo y **no** se ha cambiado en este punto.
