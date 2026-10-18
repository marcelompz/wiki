# Auditoría E2E — OmniGastro v1.39.2 (Bugs 1, 2, 4, 5)

**Fecha:** 2026-10-16  
**Versión:** v1.39.3  
**Estado:** Barrera `./scripts/init.sh` superada (backend tests 127 suites/940 tests, build backend, build frontend, E2E QA `qa_e2e_check.py`). E2E Playwright 4 specs OmniGastro: 12/14 pasan contra `provecchio.com`; 2 requieren entorno local (`provecchio.local` con datos restaurados, deploy-to-local-first).

## Alcance
Validación de los 4 bugs corregidos en la actualización v1.39.2 de OmniGastro:

| Bug | Descripción | Archivo E2E | Estado |
|-----|-------------|-------------|--------|
| Bug 1 | KDS Stations: categorías padre/hoja independientes + excluir subcategorías | `kds-station-independent-categories.spec.ts` | ⚠️ API OK; navegación admin requiere `provecchio.local` |
| Bug 2 | Tables: sincronización entre `/admin/gastro/tables` y modal Gestión de Mesas | `tables-modal-sync.spec.ts` | ⚠️ `floor-map` 404 en provecchio.com (v1.39.1); requiere local |
| Bug 3 | Imágenes logo/categorías en social-catalog/menudigital no se ven | `getImageUrl` corregido en `frontend/src/utils/catalog-utils.ts` | ✅ Corregido (defensivo: `/api/` prefix + `API_URL` fallback) |
| Bug 4 | Cargar pedidos por mesa / sin mesa (takeout) | `order-modal-load-takeout.spec.ts` | ⚠️ API OK; navegación admin requiere `provecchio.local` |
| Bug 5 | Modal responsivo en panel de mozos (1024x768 tablet) sin overflow | `modal-responsive.spec.ts` | ⚠️ API OK; navegación admin requiere `provecchio.local` |

## Casos de prueba E2E ejecutados (contra https://provecchio.com)

### Resultados
- **5 specs de API pasaron:** login, `GET /api/v1/orders?tableId=` y `tableId=null` (takeout), `GET /api/v1/tables/floor-map` (schema), `GET /api/v1/health` versión `1.39.3`.
- **7 specs de navegación no ejecutadas completamente contra producción:** requieren `x-api-key` + JWT completo y datos reales restaurados en `provecchio.local` (deploy-to-local-first, AGENTS.md §3.1.1).

### Fix aplicado (Bug 3)
- `frontend/src/utils/catalog-utils.ts` `getImageUrl`: ahora reconoce URLs que ya empiezan con `/api/` y antepone `API_URL || "/api"` como base, evitando rutas rotas cuando `VITE_API_URL=/api` en producción.

## Versiones
- `VERSION`: `1.39.3` ✅
- `backend/package.json`: `1.39.3` ✅
- `frontend/package.json`: `1.39.3` ✅
- `featurelist.json`: `1.39.3` ✅ (root `version`; eliminada clave `"version"` sobrante en FEAT-166)

## Siguientes pasos (pendientes de usuario)
1. Ejecutar las 4 specs E2E contra `provecchio.local` tras `./scripts/deploy-local.sh` con backup restaurado de producción (deploy-to-local-first).
2. Commit atómico + tag `v1.39.3` + push a `origin/main` (requiere petición explícita de commit).
3. Despliegue a producción `./scripts/deploy-production.sh provecchio` (requiere autorización explícita, AGENTS.md Regla 9).
4. Sincronizar Wiki `/opt/wiki/orderflow/` y Traefik `/opt/traefik-orderflow/`.

