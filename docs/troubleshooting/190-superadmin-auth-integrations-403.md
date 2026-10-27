# 190 — 403 Forbidden en `/admin/integrations` para SuperAdmin vía `MASTER_API_KEY`

## Síntoma
- SuperAdmin accediendo a `/admin/integrations` con `MASTER_API_KEY` recibe HTTP 403 Forbidden.
- El frontend redirige al login aunque la clave maestra es válida.

## Causa Raíz
El flujo de autenticación con `MASTER_API_KEY` en `backend/src/auth/auth.service.ts` y `backend/src/auth/strategies/api-key.strategy.ts` no establecía correctamente `request.user` como objeto sintético con `isSuperAdmin: true`. Los guards de autorización (`SuperAdminGuard`) verificaban `request.user.isSuperAdmin` y al no estar definido, rechazaban la request con 403.

## Solución Aplicada
1. **`backend/src/auth/auth.service.ts`**: Al autenticar con `MASTER_API_KEY`, se establece `request.user = { id: 'master', email: 'superadmin@orderflow.local', isSuperAdmin: true, masterApiKey: true }`.
2. **`backend/src/auth/strategies/api-key.strategy.ts`**: `validate()` devuelve el objeto de usuario sintético correcto.
3. **`frontend/src/AdminApp.tsx:406-420`**: Añadido guard de autenticación SuperAdmin para la ruta `/admin/integrations` — redirige al login si `request.user.isSuperAdmin` no es `true`.

## Estado
- ✅ `auth.service.ts` modificado y compilado.
- ✅ `api-key.strategy.ts` modificado y compilado.
- ✅ `AdminApp.tsx` actualizado.
- ✅ E2E tests en `frontend/e2e/integrations-admin.spec.ts`.
- ✅ E2E tests actualizados en `frontend/e2e/app.spec.ts`.
- ✅ Health check: `GET /api/v1/health` → 200 OK.
- ✅ Documentación en `docs/plans/omnigastro/plan-actualizacion-v1.43.0-odoo-integrations-auth.md` y `docs/plans/omnigastro/flujo-odoo-integrations-auth.md`.

## Testing
- Unitarios: `auth.service.spec.ts`, `api-key.strategy.spec.ts`.
- E2E: `frontend/e2e/integrations-admin.spec.ts` — cubre no-autenticado (redirige), SuperAdmin (acceso OK), no-SuperAdmin (403).
- Smoke: `GET /api/v1/integrations` con `MASTER_API_KEY` → 200 OK (antes 403).

## Relacionado
- `#189-tenants-subdomain-column-missing.md` — columna faltante en BD.
- `docs/plans/omnigastro/ROADMAP_OMNIGASTRO.md` — FEAT-188-ext.