# 🛠️ Troubleshooting #45 — QR Generate 500 con Master API Key (FK `tenantId` Violada)

## 📅 Fecha
2026-08-19

## 🎯 Síntoma
- `POST /api/v1/qr/generate` con header `x-api-key: sk_master_...` retorna **500**
- Log backend:
  ```
  Foreign key constraint violated: qr_code_history_tenantId_fkey (index)
  at QrCodeService.saveToHistory (/app/dist/src/qr/qr.service.js:117:25)
  at QrCodeService.generateQr (/app/dist/src/qr/qr.service.js:38:27)
  ```

## 🔍 Causa Raíz
El `QrCodeService.generateQr()` intenta guardar el QR en historial (`qr_code_history`) usando el `tenantId` extraído del request. 

Con **Master API Key** (`sk_master_...`):
- El guard `ApiKeyGuard` valida la key pero **no asocia un `tenantId`** (la master key es global, no pertenece a un tenant)
- `req.tenant` es `undefined` o apunta a un tenant inválido
- Al hacer `prisma.qrCodeHistory.create({ data: { tenantId, ... } })`, el `tenantId` no existe en tabla `tenants` → **FK violation**

## ✅ Solución
**Usar API Key de tenant real**, no la master key.

### Opciones:
1. **En UI (recomendado)**: Entrar a `/admin/qr-generator` logueado como usuario del tenant. La sesión tiene `tenantId` válido.
2. **Por API**: Usar API key específica del tenant:
   ```bash
   # Obtener API key del tenant (en /admin/settings → API Keys)
   curl -X POST https://provecchio.com/api/v1/qr/generate \
     -H "x-api-key: sk_tenant_xxxxxxxxxxxx" \
     -H "Content-Type: application/json" \
     -d '{"type":"url","url":"https://provecchio.com"}'
   ```
3. **Como super-admin**: Seleccionar tenant en el header `X-Tenant-Id` si el endpoint lo soporta.

## 🔧 Verificación Rápida
```bash
# Listar tenants y sus API keys
docker exec orderflow-database-1 psql -U orderflow -d orderflow_db -c "SELECT id, name, api_key FROM tenants WHERE api_key IS NOT NULL LIMIT 5"

# Probar con tenant key
curl -X POST http://localhost:3010/api/v1/qr/generate \
  -H "x-api-key: sk_tenant_abc123" \
  -H "Content-Type: application/json" \
  -d '{"type":"url","url":"https://example.com"}'
```

## 🔗 Referencias
- Relacionado: QR module implementation (`backend/src/qr/`)
- Permisos requeridos: `qr:generate` (asignado a Admin, Manager, Seller)
