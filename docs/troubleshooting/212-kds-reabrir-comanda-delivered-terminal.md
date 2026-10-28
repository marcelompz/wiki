# #212 — KDS "Reabrir Comanda" devolvía 400 (DELIVERED era terminal)

**Fecha:** 2026-10-28
**Versión:** encontrada en v1.44.3 · resuelta en v1.44.5

## Síntoma
En `https://provecchio.com/admin/kds`, al pulsar **Reabrir Comanda** sobre una
comanda servida (DELIVERED):

```
XHR PATCH https://provecchio.com/api/v1/orders/.../status  → HTTP 400
{"message":"Transición de estado inválida: DELIVERED → READY. Permitidas: ninguna", "statusCode":400}
```

## Causa raíz
El fix de v1.44.3 (KDS: comandas servidas visibles en pestaña 'Listo' + botón
'Reabrir Comanda') agregó **solo el botón en el frontend** (`kds.tsx:476`, envía
`PATCH /orders/:id/status {"status":"READY"}`). El backend sigue la máquina de
estados `OrdersService.ALLOWED_TRANSITIONS` (`orders.service.ts`), que definía:

```ts
DELIVERED: [],   // estado terminal: sin transiciones salientes
```

El frontend y el backend quedaron desacoplados: el panel azul no tenía
equivalente en el state machine.

## Corrección (v1.44.5)
`backend/src/orders/orders.service.ts`:

```ts
DELIVERED: ['READY', 'CANCELLED'],
```

Además, la transición `DELIVERED → READY` limpia los hitos de entrega de la
telemetría del `guestDraft` (`deliveredAt`, `t6_picked_up`, `t7_delivered`)
para que el historial del comensal, del mozo y del KDS no queden con una
"entrega" datada cuando la comanda volvió a cocina.

Cobertura:
- Unitarias: `OrdersService › updateStatus › should allow reopen DELIVERED -> READY and clear delivery timestamps` y `should reject transition CANCELLED -> READY`
- E2E: caso 7 de `frontend/e2e/gastro-pos-send-kitchen.spec.ts`

## Lecciones
- Cuando el frontend expone una acción de workflow (re-abrir, cancelar,
  transferir), verificar SIEMPRE que el state machine del backend la permita:
  el `init.sh` / Newmen contracts deben cubrir la transición y no solo la UI.

## Prevención
- Añadir la transición a la colección Newman permanente (hecho: la colección
  regenerada cubre READY→DELIVERED→CANCELLED y el ciclo completo).
