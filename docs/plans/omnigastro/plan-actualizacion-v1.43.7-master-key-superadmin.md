# Plan de Actualización — FEAT-209 · Super-admin automation vía MASTER_API_KEY + credenciales E2E (v1.43.7)

**Rama:** `fix/omnigastro-master-key-superadmin` · **Estado del plan:** ✅ APROBADO por el usuario (2026-10-27) · **Origen:** hallazgos no bloqueantes post-deploy v1.43.6 ([auditoría FEAT-208](auditoria-feat-208-2026-10-27.md))

## 1. Alcance

| Hallazgo | Causa raíz | Arreglo |
|---|---|---|
| 403 "Missing user or tenant context" con MASTER_API_KEY vía `provecchio.com` | `api-key.guard.ts`: chequeo del master key en rama `else if` inaccesible cuando el host ya resuelve tenant | Evaluación independiente del host + synthetic `master` conservando tenant resuelto |
| 403 `tables:manage` en `POST /api/v1/table-sessions/:id/close` con `force:true` | `rbac.service.ts hasPermission` no reconocía synthetic `'master'`; `close(force)` llama `assertPermission()` directo (bypassea el shortcut del `PermissionsGuard`) | Shortcut `['super-admin-global','master']` en `hasPermission` |
| Password de specs desactualizada (`SuperAdmin123!` → 409 Invalid password, #201) | 18 specs con password hardcodeada en texto plano | Env-injection (`E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD`, `PLAYWRIGHT_ADMIN_*` en specs Odoo); password real en `.env` gitignored; nota en README de Newman |

## 2. Archivos

**Backend (2):** `backend/src/common/api-key.guard.ts`, `backend/src/common/rbac.service.ts`
**Tests (2):** `backend/src/common/api-key.guard.spec.ts` (nueva), `backend/src/common/rbac.service.spec.ts` (+2 casos)
** Specs (18):** `frontend/e2e/*.spec.ts` con credenciales admin (15 renombradas a `E2E_*`, 3 a `PLAYWRIGHT_ADMIN_*` sin fallback)
**Docs:** changelog raíz + espejo, ROADMAP + espejo, featurelist.json (FEAT-209), troubleshooting #209 + índice, README.md badge, `backend/src/main.ts` (Swagger), manifiestos,environment Newman sin password + README.

## 3. Efectos secundarios verificables

- Master key = super-admin sobre cualquier host: es la semántica ya existente en `localhost`; formalizada. Riesgo mitigado por secreto del key (rotación opcional futuro).
- `X-Tenant-Id` override mantiene prioridad (paso 1.5 del guard sin cambios).
- API keys de tenant (`apiKeySecret`) y 401 sin cambios (spec lo cubre).
- Sin endpoints nuevos, sin migraciones, sin cambios de ruteo Traefik → bump **patch 1.43.6 → 1.43.7**.

## 4. Estrategia de testing — resultados

1. ✅ `tsc --noEmit` backend limpio
2. ✅ Jest: `api-key.guard.spec.ts` (3 casos) + `rbac.service.spec.ts` (12) — **12/12**
3. ✅ Smoke funcional por API con `Host: provecchio.com` (backend local rebuilt): `tree` **200** (203/203 productos) y `POST /table-sessions/:id/close` `force:true` → **201 CLOSED** (antes 403)
4. ✅ Suite Playwright completa con credenciales reales por env: **99/101** (los 2 fallos = `pos-tablet-responsive`, pre-existentes e idénticos a la corrida de v1.43.6 — issue de layout/probes a investigar aparte, no relacionado; registrado como deuda)
5. ✅ Barrera `./scripts/init.sh` — **140/140 suites · 1058/1058 tests** (+5 por los casos del fix), builds limpios, QA E2E pública verde, `INIT_EXIT=0`
6. 🔒 Deploy-to-local-first (backup `20261027_123345` → restore 170 tablas OK → `deploy-local.sh` en curso) y producción con autorización explícita del usuario

### Notas operativas del smoke local

- El cleanup de una sesión residual se hizo vía `close(force)` **por la API** (que es justo lo que este fix habilita): sesión de G3 del 25-oct sin órdenes/cuentas → CLOSED, mesa G3 explícitamente en `FREE`. Como consulta la DB, ninguna sesión con órdenes/cuentas pendientes fue tocada.


## 5. Deploy a producción (2026-10-27 ~16:15 UTC)

- `pre-deploy-diagnostic.sh provecchio`: 0 críticos (12 warnings, 11 preexistentes + expected versión remota 1.43.6).
- `deploy-production.sh provecchio` → `DEPLOY_PROD_EXIT=0` · 0 migraciones pendientes · QA rutas admin **sin errores y sin imágenes rotas**.
- `https://provecchio.com/api/v1/health` → **200 · 1.43.7** (DB + odoo_adapter OK).
- **Prueba clave del fix:** `GET /catalog/categories/tree` con MASTER_API_KEY **desde fuera, vía Traefik** → **200** con 203/203 productos (antes 403 "Missing user or tenant context") — master key útil externamente en producción.
- `close(force)` no se probó en producción para **no tocar sesiones de servicio reales**; el camino es idéntico al validado localmente (mismo código del guard/RBAC).

## 6. Deuda registrada (no bloqueante)

- `pos-tablet-responsive.spec.ts`: 2 tests con probes nulos (Sider/header) en 768 → layout del POS a revisar (pre-existente, fuera de FEAT-209).
