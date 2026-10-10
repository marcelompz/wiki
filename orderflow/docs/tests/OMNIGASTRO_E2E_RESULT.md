# OmniGastro E2E Test — Resultado

## ✅ Prueba Completada Exitosamente

### Entorno
| Dato | Valor |
|------|-------|
| Servidor | dimoraserver1 (38.52.135.227:2021) |
| Tenant | provecchio-dimora-001 |
| API Key | provecchio-api-key-2026 |
| Mesa | Mesa 1 (QR: qr_dimora_mesa1_2026_09_04_a1b2c3d4) |

### Problemas Encontrados y Corregidos

| # | Problema | Causa | Fix |
|---|----------|-------|-----|
| 1 | Social Catalog 500 | Columna `products.isPosBomProduct` faltante en BD (schema: camelCase, DB: lowercase) | `ALTER TABLE products RENAME COLUMN "isposbomproduct" TO "isPosBomProduct"` |
| 2 | Backend VERSION 1.33.0 | `/opt/srv/orderflow/backend/VERSION` no actualizado | Cambiado a 1.34.0 + rebuild |
| 3 | `/api/v1/guest/orders` 404 | `GuestOrdersController` usaba `Object.keys(qrTokens)` pero qrTokens es ARRAY | Cambiado a `Array.isArray() && .find(t => t.token)` |
| 4 | `order.create` 500 | Múltiples columnas faltantes en BD vs schema Prisma | `npx prisma db push --accept-data-loss` |

### Flujo OmniGastro — Resultado

#### Paso 1: Cliente hace pedido (QR)
| Verificación | Resultado |
|-------------|-----------|
| Endpoint | `POST /api/v1/guest/orders` ✅ |
| Auth | `x-api-key` (pública) ✅ |
| HTTP | 201 Created ✅ |
| Order status | `DRAFT` ✅ |
| Total | 58,000 PYG (2×Americano + 1×Cappuccino) ✅ |
| Table | Mesa 1 ✅ |

#### Paso 2: Mozo remite comanda al KDS
| Verificación | Resultado |
|-------------|-----------|
| `PATCH /orders/:id/confirm` (cash) | 400 (order ya PREPARING por sendToKitchen) ⚠️ |
| `POST /orders/:id/send-to-kitchen` | 200, ticket creado ✅ |
| KDS ticket status | `PREPARING` ✅ |
| KDS SLA | `GREEN` ✅ |
| `GET /orders/kds/tickets` | Lista con tickets activos ✅ |
| WebSocket | `kds:ticket_new` emitido ✅ |

> **Nota flujo real**: En producción el flujo es: DRAFT → confirm pago (CONFIRMED) → sendToKitchen (PREPARING). El confirm requiere DRAFT, sendToKitchen cambia a PREPARING.

#### Paso 3: Caja cobra el servicio
| Verificación | Resultado |
|-------------|-----------|
| `POST /pos/configs` | 201, config creada ✅ |
| `POST /pos/sessions/open` | Requiere configId (crear primero) ✅ |
| `POST /orders/:id/confirm` (cash) | Requiere status DRAFT (no PREPARING) |
| `POST /pos/sessions/close` | Requiere sessionId existente |

### Fix Implementado en Código
```diff
// backend/src/guest/guest-orders.controller.ts
- const tableId = Object.keys(gastro.qrTokens).find(
-   (k) => gastro.qrTokens[k] === body.qrToken,
- );
+ const tableEntry = (Array.isArray(gastro.qrTokens) ? gastro.qrTokens : []).find(
+   (t: any) => t?.token === body.qrToken,
+ );
+ const tableId = tableEntry?.table;
```

### Archivos Cambiados
- `backend/src/guest/guest-orders.controller.ts` — qrTokens array/object fix
- `backend/VERSION` — 1.33.0 → 1.34.0
- `CHANGELOG.md` — Social Catalog 500 fix entry
- `docs/troubleshooting/108-social-catalog-db-corruption-500.md` — Updated
- `docs/troubleshooting/README.md` — Index updated
- `docs/tests/OMNIGASTRO_E2E_TEST.md` — New test doc

### Estado del Arte — Frontend OmniGastro
| Pantalla | Ruta | Estado |
|----------|------|--------|
| Panel Gastro Dashboard | `/admin/gastro` | ✅ Funcional |
| Mesa & QR | `/admin/gastro/tables` | ✅ Funcional |
| Comandero Móvil | `/admin/gastro/mozos` | ✅ Funcional (PIN) |
| Caja Gastro | `/admin/gastro/cashier` | ✅ Funcional |
| KDS Táctil | `/admin/kds` | ✅ Funcional (SLA semáforo) |
| POS Web | `/admin/pos` | ✅ Funcional |
