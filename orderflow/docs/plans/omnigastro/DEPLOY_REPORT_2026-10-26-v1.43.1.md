# Deploy Report — v1.43.1 a `provecchio.com`

> **Fecha:** 2026-10-26 · **Target:** `provecchio` (`root@192.168.69.240`, path `/srv/orderflow`, LAN)
> **Versión anterior en producción:** `1.41.x` → **Versión desplegada:** **`1.43.1`** ✅
> **Protocolo aplicado:** AGENTS.md §3.1 (verificación de repo) + §3.2 (Diagnóstico de Infraestructura) + §9.1 (Checklist Provecchio)
> **Nota:** despliegue ejecutado tras resolución del incidente de login SuperAdmin (troubleshooting #201).

---

## 1. Alcance de la release

| Commit | Contenido |
|---|---|
| `ffe85ac6` | PR #22 — FEAT-188-ext (v1.43.0): integración Odoo POS transfer + catalog sync multi-módulo |
| `2816367f` | Release v1.43.1: bump de versión, fixes E2E, docs de troubleshooting |
| `55bf8de7` | Docs: plan FEAT-188-ext, `flujo-odoo-integrations-auth`, troubleshooting #189–190, estado OmniGastro |
| `466fc7a0` | Guard SuperAdmin en `/admin/integrations` + locks bumped a 1.43.1 + cleanup artefactos Playwright + `.gitignore` |
| `8cf102f4` | Troubleshooting #201 — `passwordHash` corrompido por shell mangling en SQL manual (fix aplicado en producción) |
| `5caf37b1` | **PR #24 merge → `main`** (FEAT-188-ext + release v1.43.1) |
| `5f136f81` | Registro OmniGastro v1.43.1 en `docs/info/OmniGastro.md` (cherry-pick desde la rama, sin tokens en repo) |

**Tipo de bump:** `1.43.0` = `minor` (FEAT-188-ext amplía superficie de API: autenticación SuperAdmin para integraciones); `1.43.1` = `patch` (fixes E2E + docs), conforme Regla #11 de AGENTS.md.

### Cambios de código / config

- `backend/src/auth/auth.service.ts` + `api-key.strategy.ts` — `request.user` sintético SuperAdmin vía `MASTER_API_KEY` (FEAT-188-ext, ya desplegado como 1.43.0 en proceso; esta release consolidó y verificó).
- `frontend/src/AdminApp.tsx` — guard de autenticación SuperAdmin en la ruta `/admin/integrations` (+ ruta duplicada de `giveaways` eliminada).
- `frontend/e2e/app.spec.ts` — E2E de redirect a login sin auth de `/admin/integrations`.
- `.gitignore` — `frontend/playwright-report/`, `test-results/`, `playwright-report/` (55 artefactos quitados del tracking).
- `VERSION`, `backend/package.json`, `frontend/package.json` + locks — sincronizados en **1.43.1**.

---

## 2. Protocolo ejecutado (evidencia)

| Paso | Acción | Resultado |
|---|---|---|
| 0 | Estado del repo: `main` limpio, todo pusheado a `origin/main` | ✅ §3.1 cumplido (5 commits `origin/main..HEAD` tras merge del PR #24, working tree 0 cambios) |
| 1 | Merge PR #24 (`feat/odoo-pos-transfer-catalog-sync` → `main`) | ✅ merge commit `5caf37b1` (2026-10-26 12:47 UTC); + cherry-pick de docs (`5f136f81`) |
| 2 | Resolución incidente login SuperAdmin en producción (pre-requisito) | ✅ re-hash `passwordHash` vía base64 + `psql` por stdin → `UPDATE 1`, hash válido de 60 chars, login restaurado (ver #201) |
| 3 | Pre-deploy diagnóstico | ✅ 0 fallos críticos, 10 warnings leves (volúmenes "will be created", versión remota indeterminable, DB alcanzable) |
| 4 | Checklist §9.1 — Traefik | ✅ routers `provecchio-api` / `provecchio-frontend` (websecure + letsencrypt) correctos; targets `orderflow_backend:3010` / `orderflow_frontend:80` correctos; sin rutas nuevas (no se requiere recarga Traefik) |
| 5 | Backup pre-deploy | ✅ rollback env `deploy-artifacts/rollback-provecchio-20261026_094908.env` + uploads backup (volumen) + snapshot DB en el servidor |
| 6 | Sync de código al servidor | ✅ rsync + permisos + `VERSION` copiado al contexto build backend |
| 7 | Build forzado (`§9.1.5`) | ✅ frontend `tsc && vite build --mode provecchio` (vite 5.4.21); backend `tsc -p tsconfig.prod.json` con paths completos + rewrite `dist/tsconfig.json` (§9.1.7/8); standalones (`sync_standalone`, `omnibi_standalone`) reconstruidos |
| 8 | Migraciones Prisma | ✅ **41 encontradas**, *"No pending migrations to apply"* (la release no agrega migraciones) |
| 9 | QA automático post-deploy | ✅ sanidad auth/DB sin HTTP 500; rutas admin verificadas: `/admin/products`, `/admin/customers`, `/admin/bookings`, `/admin/loyalty`, `/admin/homepage-builder`, `/admin/social-catalog`, `/admin/gastro/kds-stations`, `/admin/follow-up-rules` |
| 10 | Limpieza remota | ✅ imágenes viejas, build cache, contenedores detenidos, logs antiguos; backups rotados (3 copias) |
| 11 | Deploy completo | ✅ `🎉 Production Deploy Complete` (≈35 min: 09:49 → 10:22 **-03:00**) |

---

## 3. Verificación post-deploy (smoke manual, 13:23 UTC)

| Verificación | Resultado |
|---|---|
| `GET https://provecchio.com/api/v1/health` | ✅ `{ "version":"1.43.1", database:"ok", odoo_adapter:"ok", status:"ok" }` |
| `POST /api/v1/auth/login` (SuperAdmin `marcelo@pesallaccia.com`) | ✅ JWT emitido, `isSuperAdmin: true`, tenant `provecchio-dimora-001`, `expiresIn 4h` — **el fix #201 sobrevivió al deploy** |
| `GET /api/v1/integrations` (Bearer JWT) | ✅ **HTTP 200** — FEAT-188-ext operativo en producción |
| `GET https://provecchio.com/login` | ✅ HTTP 200 (frontend servido) |

---

## 4. Incidencias y observaciones

### 4.1 Ninguna incidencia durante el deploy
El pipeline corrió de punta a punta sin fallas; la única alerta informativa del compose (`CLOUDFLARE_API_TOKEN` / `SENTRY_DSN` no seteados como blank string en el run de migraciones) es preexistente y no afecta runtime (usa env file real del servicio).

### 4.2 Incidente resuelto antes del deploy (crítico)
El login SuperAdmin de `provecchio.com` fallaba (`Invalid password`) porque el `passwordHash` en la DB estaba **corrompido (27 chars)** — un `UPDATE` manual desde shell expandió los `$` del hash bcrypt por comillas dobles. Resuelto con re-hash vía **base64 + `psql` por stdin** antes del deploy, y el deploy lo validó de punta a punta. Detalle completo: [`docs/troubleshooting/201-passwordHash-corrompido-shell-mangling-manual-sql.md`](../../troubleshooting/201-passwordHash-corrompido-shell-mangling-manual-sql.md).

---

## 5. Pendientes (tracking separado)

| # | Pendiente | Referencia |
|---|---|---|
| 1 | Tag `v1.43.1` (git tag + push) sobre `5f136f81` | Regla §9 checklist final |
| 2 | Rotación de password SuperAdmin (`SuperAdmin123!` expuesto en seeds/git) | doc #201 |
| 3 | Sync de Wiki oficial (`/opt/wiki/orderflow/`) con este reporte y CHANGELOG | Regla #7 |
| 4 | Deploy local (`deploy-local.sh`) + suite E2E completa (§3.1.1 Fase 4) para retrovalidar | §3.1.1 |

---

*Generado tras el deploy del 2026-10-26. La evidencia del pipeline (QA automático de rutas y endpoints) queda registrada por `deploy-production.sh provecchio` y respaldada en `deploy-artifacts/rollback-provecchio-20261026_094908.env`.*
