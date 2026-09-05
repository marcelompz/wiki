# FEAT-125 — Demo Alfa OmniGastro en Provecchio (2026-09-04)

**Rama:** `feat/gastro-02-tables-split-guest`  
**Entorno target:** Provecchio (`dimoraserverlocal`) — host público `orderflow.provecchio.com`  
**Tenant demo:** `demo-omnigastro` (subdomain `demo-omnigastro`, apiKey `demo-omnigastro-apikey-2026-09-04`)  
**Sin migración Prisma:** todos los datos guest viven en `Order.metadata.guestDraft` y `Tenant.config.gastro` (JSON).

---

## 1. Resumen funcional

El cliente en el restaurante:
1. Escanea el QR pegado a la mesa → abre `https://orderflow.provecchio.com/social-catalog/menudigital?t=<qrToken>`.
2. El omni-catalog detecta `?t=`, resuelve la mesa vía `GET /api/v1/guest/tables/by-token/:qrToken`, activa el **modo restaurante** (header naranja "MESA-01", botón "Llamar al mozo").
3. Cliente arma carrito y presiona "Confirmar pedido" en el drawer → en lugar de checkout normal, el frontend hace `POST /api/v1/guest/orders` con el qrToken y las líneas.
4. Backend crea un `Order` con `status=CONFIRMED` y `metadata.guestDraft={qrToken, tableId, tableName, ...}`. Emite WebSocket `order:new` y `guestOrderUpdate` al canal del tenant.
5. Mini-panel del mozo en `/admin/gastro` recibe el pedido en tiempo real. El mozo presiona **Reclamar** → `POST /api/v1/orders/:id/claim` → cliente ve "Tu pedido fue tomado por {mozo}" en su `/menudigital?track=<id>`.
6. Mozo presiona **Marcar listo** (o lo hace desde la cocina) → `POST /api/v1/orders/:id/ready` → cliente ve "¡Listo!".
7. Mozo presiona **Entregar y cobrar** → `POST /api/v1/orders/:id/paid` → flujo cerrado.
8. En cualquier momento, el cliente puede tocar **Llamar al mozo** → modal con opciones preconfiguradas (`Pedir la cuenta`, `Más pan`, `Ayuda` con texto libre) → `POST /api/v1/guest/tables/:tableId/call-waiter` → mozo ve alerta en `/admin/gastro`.

---

## 2. Pasos de despliegue (Provecchio)

### 2.1 Build (ejecutado en workstation)
- ✅ Backend: `cd backend && npm run build` (ver `dist/src/guest/`, `dist/src/waiter/`).
- ✅ Frontend: `cd frontend && npm run build` (ver `dist/` con assets de omni-catalog + gastro).

### 2.2 Sincronizar código a Provecchio
```bash
rsync -avz --delete \
  --exclude=node_modules --exclude=.git --exclude=dist --exclude=storage \
  /opt/orderflow/backend/dist /opt/orderflow/backend/prisma \
  marcelompz@dimoraserverlocal:/srv/orderflow/backend/
rsync -avz --delete \
  --exclude=node_modules --exclude=.git --exclude=dist \
  /opt/orderflow/frontend/dist \
  marcelompz@dimoraserverlocal:/srv/orderflow/frontend/
```

### 2.3 Rebuild de imagen backend en Provecchio
```bash
ssh dimoraserverlocal
cd /srv/orderflow
docker compose -f docker-compose.provecchio.yml build backend
docker compose -f docker-compose.provecchio.yml up -d --force-recreate backend
```

### 2.4 Aplicar seed SQL (idempotente)
```bash
ssh dimoraserverlocal
docker cp /srv/orderflow/backend/prisma/seed-demo-omnigastro.sql \
  $(docker compose -f docker-compose.provecchio.yml ps -q database):/tmp/seed.sql
docker compose -f docker-compose.provecchio.yml exec -e PGPASSWORD=orderflow_dev_password database \
  psql -h database -U orderflow -d orderflow_db -f /tmp/seed.sql
```

### 2.5 Crear usuarios demo (mozo, cocina, admin)
```bash
# Esperar ~10s a que el backend termine de bootear
sleep 10

# Admin demo (para crear la sesión)
curl -s -X POST https://orderflow.provecchio.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -H "x-api-key: demo-omnigastro-apikey-2026-09-04" \
  -d '{"email":"admin@demo.omnigastro","password":"demo12345","name":"Admin Demo","defaultTenantId":"demo-omnigastro-001"}'

# Mozo
curl -s -X POST https://orderflow.provecchio.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -H "x-api-key: demo-omnigastro-apikey-2026-09-04" \
  -d '{"email":"mozo@demo.omnigastro","password":"demo12345","name":"Carlos Mozo","defaultTenantId":"demo-omnigastro-001"}'

# Cocina
curl -s -X POST https://orderflow.provecchio.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -H "x-api-key: demo-omnigastro-apikey-2026-09-04" \
  -d '{"email":"cocina@demo.omnigastro","password":"demo12345","name":"Ana Cocina","defaultTenantId":"demo-omnigastro-001"}'
```

### 2.6 Verificación (smoke test)
```bash
# 1) Resolver mesa por QR
curl -s -H "x-api-key: demo-omnigastro-apikey-2026-09-04" \
  "https://orderflow.provecchio.com/api/v1/guest/tables/by-token/qr_demo_mesa_01_2026_09_04_abcdef0123" | jq .

# Esperado: {"found":true,"tableId":"MESA-01","tableName":"MESA-01","tenantId":"...","tenantName":"Demo OmniGastro","waiterOptions":[...]}

# 2) Crear pedido guest
curl -s -X POST https://orderflow.provecchio.com/api/v1/guest/orders \
  -H "Content-Type: application/json" \
  -H "x-api-key: demo-omnigastro-apikey-2026-09-04" \
  -d '{
    "qrToken": "qr_demo_mesa_01_2026_09_04_abcdef0123",
    "lines": [
      {"productId":"demo-prod-milanesa","quantity":2,"unitPrice":35000,"name":"Milanesa con papas"},
      {"productId":"demo-prod-bebida","quantity":2,"unitPrice":8000,"name":"Coca-Cola 500ml"}
    ]
  }' | jq .

# Esperado: {"orderId":"...","status":"CONFIRMED","totalAmount":86000,"tableId":"MESA-01",...}

# 3) Login mozo y reclamar
TOKEN=$(curl -s -X POST https://orderflow.provecchio.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "x-api-key: demo-omnigastro-apikey-2026-09-04" \
  -d '{"email":"mozo@demo.omnigastro","password":"demo12345"}' | jq -r .accessToken)

ORDER_ID=<orderId del paso 2>
curl -s -X POST "https://orderflow.provecchio.com/api/v1/orders/${ORDER_ID}/claim" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-api-key: demo-omnigastro-apikey-2026-09-04" | jq .

# 4) Marcar listo
curl -s -X POST "https://orderflow.provecchio.com/api/v1/orders/${ORDER_ID}/ready" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-api-key: demo-omnigastro-apikey-2026-09-04" | jq .

# 5) Llamar al mozo
curl -s -X POST "https://orderflow.provecchio.com/api/v1/guest/tables/MESA-01/call-waiter" \
  -H "Content-Type: application/json" \
  -H "x-api-key: demo-omnigastro-apikey-2026-09-04" \
  -d '{"optionId":"waiter-bill"}' | jq .

# 6) Listar llamadas del mozo
curl -s -H "Authorization: Bearer $TOKEN" \
  -H "x-api-key: demo-omnigastro-apikey-2026-09-04" \
  https://orderflow.provecchio.com/api/v1/waiter/calls | jq .
```

### 2.7 Rollplay en vivo
1. **Cliente (tablet/celular del cliente)**: abrir `https://orderflow.provecchio.com/social-catalog/menudigital?t=qr_demo_mesa_01_2026_09_04_abcdef0123` → ver header naranja "MESA-01".
2. **Mozo (laptop)**: login en `https://orderflow.provecchio.com/login` con `mozo@demo.omnigastro / demo12345`, ir a `https://orderflow.provecchio.com/admin/gastro` → ver panel en tiempo real.
3. **Flujo demo:**
   - Cliente agrega 2× Milanesa + 2× Coca al carrito, "Confirmar pedido".
   - Aparece el card de MESA-01 en `/admin/gastro` como "Sin reclamar".
   - Mozo hace click en "Reclamar" → el cliente ve "Tomado por Carlos Mozo" en `?track=...`.
   - Mozo click "Ver y enviar a cocina" → modal → "Enviar a cocina y marcar listo".
   - Cliente ve "En cocina" → "¡Listo!".
   - Mozo click "Entregar y cobrar" → cliente ve "Entregado y pagado".
   - Volver al menú, click "Llamar al mozo" → "Pedir la cuenta" → mozo ve alerta en panel derecho.

---

## 3. Endpoints nuevos

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/v1/guest/tables/by-token/:qrToken` | API key | Resuelve mesa por QR (lee `Tenant.config.gastro.qrTokens`) |
| POST | `/api/v1/guest/orders` | API key | Crea `Order` con `metadata.guestDraft` |
| GET | `/api/v1/guest/orders/:id` | API key | Tracking de pedido (parsea `metadata.guestDraft`) |
| POST | `/api/v1/guest/tables/:tableId/call-waiter` | API key | Crea `WaiterCall` en `Tenant.config.gastro.waiterCalls` |
| GET | `/api/v1/waiter/calls` | API key + JWT | Lista llamadas pendientes (lee JSON del tenant) |
| PATCH | `/api/v1/waiter/calls/:id/acknowledge` | API key + JWT | Marca vista |
| PATCH | `/api/v1/waiter/calls/:id/resolve` | API key + JWT | Marca resuelta |
| POST | `/api/v1/orders/:id/claim` | API key + JWT | Reclamar pedido guest |
| POST | `/api/v1/orders/:id/ready` | API key + JWT | Marcar listo |
| POST | `/api/v1/orders/:id/paid` | API key + JWT | Marcar entregado y pagado |
| GET | `/api/v1/orders/guest/pending` | API key + JWT | Lista pedidos guest activos (para `/admin/gastro`) |

---

## 4. Archivos del FEAT-125 demo

**Backend (nuevo):**
- `backend/src/guest/guest.module.ts`
- `backend/src/guest/guest-tables.controller.ts`
- `backend/src/guest/guest-orders.controller.ts`
- `backend/src/guest/guest-call-waiter.controller.ts`
- `backend/src/waiter/waiter.module.ts`
- `backend/src/waiter/waiter-calls.controller.ts`
- `backend/prisma/seed-demo-omnigastro.sql`
- `backend/src/orders/orders.controller.ts` — extendidos `claim`, `ready`, `paid`, `guest/pending`
- `backend/src/orders/orders.service.ts` — agregados `guestClaim`, `guestMarkReady`, `guestMarkPaid`, `guestPending`
- `backend/src/app.module.ts` — registrados `GuestModule`, `WaiterModule`

**Frontend (extendido):**
- `frontend/src/pages/omni-catalog.tsx` — gate `?t=`, header mesa, modal Llamar Mozo, vista tracking inline con polling 3s
- `frontend/src/pages/admin/gastro.tsx` (nuevo) — panel del mozo: pedidos en curso + WaiterCalls en tiempo real
- `frontend/src/AdminApp.tsx` — ruta `/admin/gastro` registrada + entrada sidebar

---

## 5. Diferencia con la versión completa del FEAT-125

Esta demo **no incluye**:
- Migración Prisma con `WaiterCall`, `WaiterCallOption`, `RestaurantTable.qrToken`, `Order.source`, `Order.claimedBy`, `Order.tableId`, `Order.sessionId`, `enum OrderSource` (de Fase 2 / post-demo).
- `PosSession` real (FEAT-113) — la sesión de caja es sintética.
- `RestaurantTable` real (FEAT-114) — la mesa es lógica, referenciada por `tableId = MESA-01`.
- Split payments, table-side custody, pay-link (FEAT-116) — flujo "Entregar y cobrar" marca PAID sin desglose.
- KDS físico (FEAT-117) — se simula con botones en `/admin/gastro`.

Cuando se ejecute la migración Prisma `*_omnigastro_core` (post-demo), los métodos `guestClaim/MarkReady/MarkPaid` deben reescribirse para escribir a `Order.source`, `Order.tableId`, `Order.claimedBy` directamente en vez de `metadata.guestDraft`. `WaiterCallsController` debe migrar de `Tenant.config.gastro.waiterCalls` (JSON) a la tabla `WaiterCall`.

---

## 6. Riesgos conocidos

1. **Concurrencia de claim**: dos mozos pueden reclamar el mismo pedido simultáneamente. El backend detecta `meta.claimedBy` ya seteado y devuelve 400. Sin transacción atómica (porque `metadata` es JSON); aceptable para demo.  
   *Mitigación post-FEAT-113:* `PosSession` real + audit log transaccional.
2. **WebSocket disconnect**: si el mozo pierde conexión, no recibe updates. Auto-reconnect con backoff (5 intentos) en el cliente.  
   *Mitigación:* polling de `/api/v1/orders/guest/pending` cada 5s.
3. **Tenant.config grande**: si se acumulan miles de `WaiterCalls` en JSON, las queries de lectura/escritura se vuelven lentas. El seed-demo trunca a 200.  
   *Mitigación post-FEAT-113:* tabla `WaiterCall` con índice `(tenantId, status)`.
4. **Sin auth de cliente**: el endpoint `/api/v1/guest/orders` solo valida API key del tenant (vía header `x-api-key`). En producción debe haber además un rate limit por IP y un token de mesa firmado.  
   *Mitigación:* `@nestjs/throttler` ya activo globalmente con 100 req/min.

---

## 7. Cleanup post-demo

```sql
-- Borrar pedidos guest del demo
DELETE FROM orders WHERE "tenantId" = 'demo-omnigastro-001' AND metadata->'guestDraft' IS NOT NULL;

-- Borrar productos demo
DELETE FROM products WHERE "tenantId" = 'demo-omnigastro-001';

-- Borrar tenant demo
DELETE FROM tenants WHERE id = 'demo-omnigastro-001';
```

(O dejar el tenant activo para que el cliente siga experimentando post-rollplay.)

---

## 8. Documentación vinculada

- `docs/planes/omnigastro/PLAN_OPERATIVO_Y_PROMPTS.md` §FEAT-125 (prompt completo)
- `docs/planes/omnigastro/AUDITORIA_Y_SOCIAL_CATALOG_COMO_MENU.md` §3 (flujos)
- `docs/planes/omnigastro/features/FEAT-125-guest-menu-claim-waiter.md` (versión completa con migración)
- `docs/planes/omnigastro/PLAN_MAESTRO.md` §6 (estado)
