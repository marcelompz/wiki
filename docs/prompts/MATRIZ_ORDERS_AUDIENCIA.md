# Matriz Orders — Endpoint × Audiencia × Reglas

Referencia rápida para depuración. Detalle ejecutable en `PROMPT_DEPURAR_ORDERS.md`.

## Estados

```
DRAFT → CONFIRMED → PREPARING → READY → DELIVERED
         ↘          ↘          ↘
           CANCELLED (según política; no desde DELIVERED en MVP)
```

## Matriz

| Endpoint | Public | Cliente | Staff/POS | KDS | Admin | Reglas clave |
|----------|:------:|:-------:|:---------:|:---:|:-----:|--------------|
| `POST /api/v1/orders` | ✗* | ✓ canal catalog/bookings | ✓ canal pos | ✗ | ✓ | Products del tenant; precio según canal; DRAFT |
| `PATCH /:id/confirm` | ✗ | △ pago/gateway | ✓ | ✗ | ✓ | Solo DRAFT→CONFIRMED; stock; caja; side-effects async |
| `GET /api/v1/orders` | ✗ | ✗ | ✓ | △ | ✓ | Scope tenant; filtros; paginación |
| `GET /api/v1/orders/me` *(añadir)* | ✗ | ✓ | ✗ | ✗ | ✗ | Solo pedidos del cliente del token |
| `GET /api/v1/orders/:id` | ✗ | ✓ dueño | ✓ tenant | ✓ tenant | ✓ | Tenant + ownership si cliente |
| `PATCH /:id/status` | ✗ | ✗ | ✓ | ✓ | ✓ | Transiciones válidas; WS |
| `PATCH /:id/cancel` | ✗ | △ propios + estado | ✓ | ✗ | ✓ | Revertir stock/caja si aplica; no DELIVERED |

\* Checkout público debe vivir en rutas `public/` o recálculo estricto de precios — no el mismo contrato staff sin canal.

**Leyenda:** ✓ sí · ✗ no · △ condicionado por política de producto

## Precio en create

| Canal | Precio |
|-------|--------|
| `pos` | Acepta `price_at_sale` staff (opcional auditoría) |
| `catalog` / cliente | Recalcular desde `Product` del tenant |
| `bookings` | Precio product/service + slot validado |

## Cancelación

| Estado | ¿Cancelar? | Efectos |
|--------|------------|---------|
| DRAFT | Sí | Sin reversiones |
| CONFIRMED / PREPARING / READY | Sí (staff; cliente según política) | Reponer stock; ajustar caja |
| DELIVERED | No (MVP) | 400 |

## Side-effects de `confirm` (post-TX, no bloquean)

1. Webhook `order.confirmed` (Odoo / URL tenant)
2. WebSocket nuevo pedido (KDS/POS)
3. Loyalty points
4. FacturaSend si config enabled y no sync-only-Odoo

## Prioridad de depuración

1. Invariantes tenant + productos en `create`
2. Máquina de estados en `status` + `cancel`
3. Ownership cliente (`/me` + findOne)
4. Precio por canal
5. Paginación listados staff
6. HTTP codes (404 vs 400) y tests
```