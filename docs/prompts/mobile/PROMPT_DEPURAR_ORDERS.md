# Prompt: Depurar endpoints de Orders (alineación a visión OrderFlow)

## Contexto
Módulo core de pedidos. Controller actual: `api/v1/orders` con:

- `POST /` → create (DRAFT + lines; bookings vía metadata)
- `PATCH /:id/confirm` → confirm (stock, caja, webhook, WS, loyalty, FacturaSend)
- `GET /` → findAll (tenant, status, limit)
- `GET /:id` → findOne
- `PATCH /:id/cancel` → CANCELLED
- `PATCH /:id/status` → status libre + WS KDS

Stack: NestJS + Prisma multi-tenant (`@TenantPrisma`), `ApiKeyGuard` + `PermissionsGuard`.

Estados (`OrderStatus`): `DRAFT | CONFIRMED | PREPARING | READY | DELIVERED | CANCELLED`.

Visión de producto:
- **Cliente (app)**: solo sus pedidos; precios de catálogo no manipulables; flujos de compra/reserva.
- **Staff / POS**: operación del local (draft, cobro, listados del tenant).
- **KDS**: transiciones de cocina + WebSocket.
- **Admin web**: operación + visibilidad completa del tenant.
- **Integraciones**: side-effects post-confirm (webhook Odoo, loyalty, FacturaSend) sin tumbar la venta.

**No** implementar apps móviles ni feature flags en este prompt. Solo endurecer y segmentar la lógica de Orders.

---

## Matriz objetivo: endpoint × audiencia × reglas

| Endpoint | Public | Cliente | Staff/POS | KDS | Admin web | Reglas de negocio obligatorias |
|----------|--------|---------|-----------|-----|-----------|--------------------------------|
| `POST /orders` | No (usar public/checkout si existe) | Sí, canal `catalog`/`bookings` | Sí, canal `pos` | No | Sí | Products del **mismo tenant**; precio según canal (ver abajo); status inicial `DRAFT` |
| `POST /public/...` o checkout | Sí, según tenant | — | — | — | — | Fuera de este controller staff o DTO/canal explícito; no confiar precio cliente sin recálculo |
| `PATCH /:id/confirm` | No | Solo si política de auto-confirm / pago gateway | Sí | No | Sí | Solo desde `DRAFT`; ownership tenant; stock; caja; side-effects async |
| `GET /orders` | No | **No** listar todo el tenant | Sí | Opcional filtrado cocina | Sí | Staff: filtros status/fecha/mesa; paginación |
| `GET /orders/me` o equivalente | No | Sí | No | No | No | Solo pedidos del `customerId`/contacto del JWT |
| `GET /orders/:id` | No | Solo si es dueño | Sí (tenant) | Sí (tenant) | Sí | Tenant + ownership si rol cliente |
| `PATCH /:id/status` | No | No | Sí (permiso) | Sí | Sí | **Máquina de estados**; emitir WS |
| `PATCH /:id/cancel` | No | Solo propios + estados permitidos | Sí | No | Sí | Reglas por estado; revertir stock/caja si aplica; WS |

### Precio según canal (`create`)
| Canal | Fuente del precio |
|-------|-------------------|
| `pos` / staff | Puede aceptar `price_at_sale` del cliente API (confianza staff) opcionalmente con override auditado |
| `catalog` / cliente / public | **Recalcular** desde `Product.price` (y reglas tax) del tenant; ignorar o validar precio enviado |
| `bookings` | Precio del product/service del tenant + validar slot **antes** de crear assignment |

Pasar canal en DTO (`channel: 'pos' | 'catalog' | 'bookings' | ...`) o rutas separadas; documentar una sola convención.

---

## Máquina de estados

Transiciones permitidas (ajustar solo si el producto ya usa otras en producción; documentar desviaciones):

```
DRAFT       → CONFIRMED, CANCELLED
CONFIRMED   → PREPARING, CANCELLED
PREPARING   → READY, CANCELLED
READY       → DELIVERED, CANCELLED
DELIVERED   → (terminal; no cancelar sin flujo de nota de crédito futuro)
CANCELLED   → (terminal)
```

- `PATCH /:id/status`: rechazar transición inválida con `400` y mensaje claro.
- KDS debería usar solo `CONFIRMED|PREPARING|READY|DELIVERED` según rol.
- `confirm` es el único camino preferido `DRAFT → CONFIRMED` (idempotente si ya `CONFIRMED`).

### Cancelación
| Estado actual | ¿Cancelar? | Efectos |
|---------------|------------|---------|
| DRAFT | Sí | Sin stock/caja que revertir |
| CONFIRMED / PREPARING / READY | Sí (staff; cliente según política) | Reponer stock si se descontó; compensar / marcar caja (política explícita: movimiento OUT o void); no borrar loyalty a ciegas sin regla |
| DELIVERED | No (MVP) | 400: usar flujo futuro de devolución |

Emitir WS en cancel/status para que KDS se actualice.

---

## Invariantes a implementar / verificar

1. **Tenant**: todo read/write filtra `tenantId`; productos de lines existen y son del tenant.
2. **Ownership cliente**: si el actor es cliente, `order.customerId` (o contacto equivalente) debe coincidir con el del token.
3. **Confirm**: solo `DRAFT` → `CONFIRMED` (idempotente si ya confirmado); transacción atómica para order + lines profit + stock + cashMovement.
4. **Side-effects post-confirm** (mantener no bloqueantes): webhook, `ordersGateway.emitNewOrder`, loyalty, FacturaSend si config.
5. **Stock**: si no `allowNegativeStock` y no hay stock → `400` dentro de la TX; si allow, log estructurado (no solo `console.warn`).
6. **Bookings en create**: si `booking_details`, validar service del product; fallar con `BadRequestException`; idealmente verificar disponibilidad (reusar servicio de bookings) antes del assignment.
7. **Errores HTTP**: “no encontrado” → `404`; sin permiso → `403`; regla de negocio → `400`. Evitar `BadRequest` para not found.
8. **Listados staff**: paginación (`cursor` o `page` + `limit` max); default razonable; índices ya existen en schema.
9. **No romper** `@TenantPrisma()` / multi-tier: usar `dbClient` inyectado como hoy.

---

## Cambios de API sugeridos (mínimos, compatibles si se puede)

### Opción A — Compatible (preferida si hay clientes en producción)
- Mantener rutas actuales para staff.
- Añadir:
  - `GET /api/v1/orders/me` (cliente autenticado)
  - Query `channel` o campo en body en `POST`
  - Validación interna de transiciones en `status` y `cancel`
- Documentar deprecación de listar “todos” con token de cliente (rechazar si rol es solo cliente).

### Opción B — Rutas por audiencia
- `/api/v1/staff/orders/...`
- `/api/v1/client/orders/...`
- Más limpio a largo plazo; más breaking.

Elegir A o B en la implementación y dejar constancia en el PR/README del módulo.

---

## Tests mínimos (aceptación)
- [ ] create con `productId` de otro tenant → 400/404
- [ ] create canal catalog ignora precio manipulado (usa precio DB)
- [ ] confirm dos veces → idempotente, no doble stock/caja
- [ ] confirm sin stock y `allowNegativeStock=false` → 400, sin order confirmada
- [ ] status `DRAFT → READY` → 400
- [ ] status `CONFIRMED → PREPARING → READY → DELIVERED` → 200 + WS invocado (mock)
- [ ] cancel `DELIVERED` → 400
- [ ] cancel `CONFIRMED` repone stock si se había descontado
- [ ] findAll con usuario/contexto cliente no devuelve pedidos ajenos (si se implementa guard de audiencia)
- [ ] findOne cliente de pedido ajeno → 403/404
- [ ] Side-effects de confirm: fallo de loyalty/FacturaSend no revierte order confirmada

---

## Fuera de alcance
- UI admin / apps Expo
- Feature flags module catalog
- Implementar pasarelas Stripe/MP desde cero
- Nota de crédito / reembolsos full (solo no permitir cancel delivered en MVP)
- Cambiar schema de Order salvo campos estrictamente necesarios (preferir metadata + validación)

---

## Entregables
1. Service + controller Orders actualizados (invariantes + estados + ownership).
2. DTOs ajustados (`channel`, status enum tipado, confirm).
3. Tests unitarios del service (casos de la lista).
4. Nota corta: opción A/B elegida, política de cancelación y de precios por canal.
5. Lista de breaking changes (si los hay) para frontend POS/KDS/checkout.

## Estilo
- TypeScript / NestJS alineado al repo.
- Mensajes de error en español para el cliente API.
- Logger en lugar de `console.warn/error` donde ya exista `Logger`.
- No instanciar `PrismaClient` directo; respetar `dbClient` / tenant prisma.
```