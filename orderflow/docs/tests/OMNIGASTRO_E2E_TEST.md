# OmniGastro E2E Test — Flujo Completo

## Datos de Conexión (Producción: dimoraserver1)

| Dato | Valor |
|------|-------|
| Tenant | `provecchio-dimora-001` |
| API Key Pública | `provecchio-api-key-2026` |
| Base URL | `https://provecchio.com` |
| QR Mesa 1 | `qr_dimora_mesa1_2026_09_04_a1b2c3d4` |
| QR Mesa 2 | `qr_dimora_mesa2_2026_09_04_e5f6g7h8` |
| Host Header | `provecchio.com` |

## Productos Disponibles (Mesa 1 - Provecchio Di Mora)

| ID | Nombre | Precio (PYG) |
|----|--------|-------------|
| `b0b55949-b1a7-4f8d-be27-9bd981e759e9` | Americano | 18,000 |
| `4bebcc22-8c33-4697-a68c-740f1482ff24` | Cappuccino | 22,000 |
| `d4cfd0bd-5b5c-4099-af13-8b6e860553b7` | Caramel latte caliente | 28,000 |
| `9fb72cde-3325-421b-b5ae-cb376a0b5d42` | Infusión ka'a yara | 15,000 |

## Estado del Arte — Endpoints

### Paso 1: Cliente hace pedido (QR)
- **Endpoint**: `POST /api/v1/guest/orders`
- **Auth**: `x-api-key` (pública)
- **Body**: `{ qrToken, lines: [{productId, quantity}], serviceMode? }`
- **Retorna**: `{ orderId, status: "DRAFT", totalAmount, tableId, tableName }`
- **WebSocket**: Emite `guestOrderUpdate` a `tenant:{id}`

### Paso 2: Mozo remite comanda al KDS
- **Endpoint 1**: `POST /api/v1/orders/:id/send-to-kitchen`
- **Auth**: `x-api-key` + PermissionsGuard (`orders:update`)
- **Endpoint 2**: `PATCH /api/v1/orders/:id/status` → `CONFIRMED`
- **Endpoint 3**: `GET /api/v1/orders/kds/tickets` (ver tickets activos)
- **WebSocket**: Emite `kds:ticket_new` a `tenant:{id}` con `{reference, station, items, timestamps}`

### Paso 3: Caja cobra el servicio
- **Endpoint 1**: `POST /api/v1/orders/:id/confirm` — confirma pago (cash/card)
- **Endpoint 2**: `POST /api/v1/pos/sessions/open` — abre sesión de caja
- **Endpoint 3**: `POST /api/v1/pos/sessions/close` — cierra sesión con `{sessionId, cashRealBalance}`

## Script de Prueba E2E — Flujo Corregido

> **Orden correcto**: Confirmar pago (CONFIRMED) ANTES de enviar a cocina (PREPARING), ya que `POST /orders/:id/confirm` requiere estado DRAFT.

```bash
#!/bin/bash
# OmniGastro E2E Test Script — Flujo Corregido
# Ejecutar contra producción (dimoraserver1): ssh marcelompz@dimoraserver1 -p 2021

BASE="https://provecchio.com"
HOST="Host: provecchio.com"
AUTH="x-api-key: provecchio-api-key-2026"

echo "=========================================="
echo "PASO 0: Crear config POS"
echo "=========================================="
POS_CONFIG=$(curl -sk "$BASE/api/v1/pos/configs" \
  -H "$HOST" \
  -H "$AUTH" \
  -H "Content-Type: application/json" \
  -d '{"name":"Caja Principal","code":"CP-001","isRestaurant":true,"cashControl":true,"currency":"PYG"}')
CONFIG_ID=$(echo "$POS_CONFIG" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "Config ID: $CONFIG_ID"

echo ""
echo "=========================================="
echo "PASO 1: Cliente hace pedido (QR Mesa 1)"
echo "=========================================="

ORDER_RESPONSE=$(curl -sk "$BASE/api/v1/guest/orders" \
  -H "$HOST" \
  -H "$AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "qrToken": "qr_dimora_mesa1_2026_09_04_a1b2c3d4",
    "lines": [
      {"productId": "b0b55949-b1a7-4f8d-be27-9bd981e759e9", "quantity": 2},
      {"productId": "4bebcc22-8c33-4697-a68c-740f1482ff24", "quantity": 1}
    ],
    "serviceMode": "TABLE",
    "notes": "Test E2E OmniGastro"
  }')

echo "Pedido creado:"
echo "$ORDER_RESPONSE" | python3 -m json.tool

ORDER_ID=$(echo "$ORDER_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['orderId'])")
TOTAL=$(echo "$ORDER_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['totalAmount'])")
TABLE=$(echo "$ORDER_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['tableName'])")

echo ""
echo "Order ID: $ORDER_ID | Total: $TOTAL | Table: $TABLE"

echo ""
echo "=========================================="
echo "PASO 2: Caja confirma pago (antes de cocina)"
echo "=========================================="

# 2a. Confirmar orden con pago cash (REQUIERE DRAFT)
echo "Confirmando orden con pago cash:"
curl -sk -w "\nHTTP:%{http_code}\n" \
  -X PATCH "$BASE/api/v1/orders/$ORDER_ID/confirm" \
  -H "$HOST" \
  -H "$AUTH" \
  -H "Content-Type: application/json" \
  -d '{"paymentType":"cash","posSessionId":"'$CONFIG_ID'","discountAmount":0}'

echo ""
echo "=========================================="
echo "PASO 3: Mozo remite comanda al KDS"
echo "=========================================="

# 3a. Enviar a cocina (KDS ticket)
echo "Enviando a cocina (sendToKitchen):"
curl -sk -w "\nHTTP:%{http_code}\n" \
  -X POST "$BASE/api/v1/orders/$ORDER_ID/send-to-kitchen" \
  -H "$HOST" \
  -H "$AUTH" \
  -H "Content-Type: application/json" \
  -d '{"station": "kitchen", "tableNumber": "'"$TABLE"'"}'

# 3b. Ver tickets KDS activos
echo ""
echo "Tickets KDS activos:"
curl -sk -w "\nHTTP:%{http_code}\n" \
  "$BASE/api/v1/orders/kds/tickets" \
  -H "$HOST" \
  -H "$AUTH"

echo ""
echo "=========================================="
echo "PASO 4: Caja cierra sesión"
echo "=========================================="

# 4a. Abrir sesión de caja
echo "Abriendo sesión de caja:"
curl -sk -w "\nHTTP:%{http_code}\n" \
  -X POST "$BASE/api/v1/pos/sessions/open" \
  -H "$HOST" \
  -H "$AUTH" \
  -H "Content-Type: application/json" \
  -d '{"configId":"'$CONFIG_ID'","cashOpeningBalance":100000,"cashControl":true,"userId":"test-cashier"}'

echo ""
echo "✅ E2E OmniGastro completado"
```

## Resultados Esperados

### Paso 0 — Crear Config POS
| Verificación | Resultado Esperado |
|-------------|-------------------|
| HTTP Status | 201 |
| Config created | `id`, `name: "Caja Principal"`, `code: "CP-001"` |

### Paso 1 — Cliente hace pedido
| Verificación | Resultado Esperado |
|-------------|-------------------|
| HTTP Status | 201 |
| Order status | `DRAFT` |
| Total | 58,000 PYG (2×18k + 1×22k) |
| Table | `Mesa 1` |
| WebSocket | `guestOrderUpdate` emitido |

### Paso 2 — Caja confirma pago
| Verificación | Resultado Esperado |
|-------------|-------------------|
| HTTP Status | 200 |
| Order status | `CONFIRMED` |
| Payment type | `cash` |
| Stock decrement | `products.stockAvailable` reduced by quantities |

### Paso 3 — Mozo remite al KDS
| Verificación | Resultado Esperado |
|-------------|-------------------|
| HTTP Status | 200 |
| KDS ticket | Created with `status: PREPARING`, `sla: GREEN` |
| WebSocket | `kds:ticket_new` emitido |
| GET kds/tickets | Lista con ticket activo |

### Paso 4 — Caja cierra sesión
| Verificación | Resultado Esperado |
|-------------|-------------------|
| POST sessions/open | 200, session created |
| POST sessions/close | 200, session `CLOSED` |

## Estado del Arte — Flujo Backend

```
[Cliente QR] → POST /api/v1/guest/orders → DRAFT order
     │
     ▼
[Caja] → PATCH /api/v1/orders/:id/confirm → CONFIRMED (payment)
     │
     ▼
[Mozo] → POST /api/v1/orders/:id/send-to-kitchen → PREPARING (KDS ticket)
     │
     ▼
[KDS] ← GET /api/v1/orders/kds/tickets ← tickets activos
     │
     ▼
[Caja] → POST /api/v1/pos/sessions/close → CLOSED
```

### Notas Importantes

1. **Orden obligatorio**: `confirm` (PATCH) debe ejecutarse ANTES de `sendToKitchen` porque `confirm` requiere estado `DRAFT` y `sendToKitchen` cambia a `PREPARING`.
2. **POS session**: `POST /pos/sessions/open` requiere `configId` (crear config primero con `POST /pos/configs`).
3. **Auth diferenciada**:
   - Endpoints guest (`/api/v1/guest/*`): API key pública (`x-api-key`)
   - Endpoints admin (`/api/v1/orders/*`, `/api/v1/pos/*`): API key + PermissionsGuard
4. **El flujo real en el frontend** (caja POS): abre sesión → crea/confirmar pedido → enviar a cocina → cierra sesión.
