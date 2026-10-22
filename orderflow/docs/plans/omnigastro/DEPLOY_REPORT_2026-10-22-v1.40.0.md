# Deploy Report — v1.40.0 a `provecchio.com`

> **Fecha:** 2026-10-22 · **Target:** `provecchio` (`root@192.168.69.240`, path `/srv/orderflow`)
> **Versión anterior en producción:** `1.39.28` → **Versión desplegada:** **`1.40.0`** ✅
> **Tag:** [`v1.40.0`](https://github.com/marcelompz/orderflow/releases/tag/v1.40.0) sobre el commit `273f90e0` (merge del PR #13)
> **Protocolo aplicado:** AGENTS.md §3.1.1 (Deploy-to-Local-First) + §3.2 (Diagnóstico de Infraestructura)

---

## 1. Alcance de la release

| Commit | Contenido |
|---|---|
| `8da98262` | Fix marca blanca: `GET /api/v1/tenants/:id/config` (resuelve por **id de tenant**, no por API key) + sanitización de `customDomain` en el `PATCH` |
| `273f90e0` | PR #13 — `id: true` en el `select` de Prisma de `getTenantConfig` (corregía `error TS2339` que rompía el build) + reconstrucción de `deploy-local.sh` (Fase 5 con `up --build -d`) |

**Tipo de bump:** `minor` (1.39.28 → **1.40.0**) por la incorporación de un **endpoint nuevo en el core** (`GET /api/v1/tenants/:id/config`), conforme Regla #11 de AGENTS.md.

---

## 2. Protocolo ejecutado (evidencia)

| Paso (§3.1.1) | Comando | Resultado |
|---|---|---|
| 0. Repo limpio y sincronizado | `git checkout main && git pull origin main` | ✅ `main` en `273f90e0`, `VERSION` = `1.40.0`, sin tag previo |
| 0b. Liberar disco | `docker builder prune -f` | ✅ 2.349 GB liberados → 32 GB libres en `/` |
| 0c. Diagnóstico de infraestructura (§3.2) | `./scripts/pre-deploy-diagnostic.sh provecchio` | ✅ **0 fallos críticos**, 11 warnings preexistentes (Docker storage 9.9 G, 8 contenedores huérfanos, volúmenes "will be created", versión remota indeterminable) |
| 1. Backup de producción | `./scripts/backup-production.sh provecchio` | ✅ `pre_deploy_provecchio_20261022_125507.sql` (**2.227.237 bytes**) + `_uploads.tar.gz` (**28.893.820 bytes**) + `rollback-provecchio-20261022_125507.env` + `backup_info.json` |
| 2. Restore en localhost | `./scripts/restore-provecchio.sh` | ⚠️ DB y uploads restaurados **correctamente**; el paso final `prisma migrate deploy` falló por un **bug del script** (`DB_PORT="null"`), documentado en [troubleshooting #188](../../troubleshooting/188-restore-provecchio-db-port-null.md). Migraciones verificadas **manualmente**: 39 encontradas, **0 pendientes** |
| 2b. Verificación del restore | `psql` sobre `orderflow_db` | ✅ **168 tablas, 1 tenant, 6 empleados, 4 cajas, 18 mesas, 226 productos, 10 usuarios** |
| 3. Paridad de datos vs producción | consultas SQL + API | ✅ Bandera de mozo correcta: **Ivan Castillo (PIN 1234)** y **Natalia Bogado (9876)** con `can_use_mozo_pos = true`; los otros 4 empleados en `false`. Migración `20261022120000_add_can_use_mozo_pos_to_employees` presente en `_prisma_migrations` |
| 4. Deploy local (`deploy-local.sh`) | `./scripts/deploy-local.sh` | ✅ **ALL CHECKS PASSED** — versión sincronizada **13/13** en `1.40.0`; Prisma generate, `nest build`, `vite build`, `tsc` OK; **135 suites / 1009 tests**; health local `1.40.0`; bundle fresco `assets/index-CUpN6zqo.js`; `GET /api/v1/tenants/:id/config` → **200** |
| 5. E2E en localhost | `npx playwright test mozo-flag.spec.ts order-history-server.spec.ts hr-endpoints.spec.ts` | ✅ **10/10 passed** (17.5 s) con datos reales de producción |
| 6. Traefik (§9.1) | `md5sum` local vs remoto | ✅ `c1bd80a6a9bee149e8cf6d0783e4ea7c` **idéntico** en `/opt/traefik-orderflow/dynamic/services.yml` y `/opt/srv/traefik/dynamic/services.yml` — sin cambios de ruteo en esta release |
| 7. Estado previo de producción | `curl /api/v1/health` + `docker ps` | ✅ `1.39.28`, **9/9 contenedores healthy** |
| 8. **Deploy a producción** | `./scripts/deploy-production.sh provecchio` | ✅ **🎉 Production Deploy Complete** — rollback env `deploy-artifacts/rollback-provecchio-20261022_130136.env`; backend `sha256:0667d07a...`; **40 migraciones, 0 pendientes**; Traefik v3.4 recargado; QA E2E: **8 rutas admin** OK; catálogo público **4 imágenes** OK; **0 errores JS** en consola; `/api/v1/health` HTTP 200 |

---

## 3. Verificación post-deploy

| Verificación | Resultado |
|---|---|
| `GET https://provecchio.com/api/v1/health` | ✅ `{"version":"1.40.0", ..., "status":"ok"}` — `database: ok`, `odoo_adapter: ok` |
| Contenedores en el host | ✅ `orderflow_backend`, `orderflow_frontend`, `orderflow_db`, `orderflow_redis`, `orderflow_odoo_adapter`, `orderflow_sync_standalone`, `orderflow_omnibi_standalone`, `orderflow-database-replica-prod` → **healthy** (9 con `traefik`) |
| Bundle servido | ✅ `assets/index-Bu8eRotJ.js` (build fresco del deploy, no caché) |
| Imagen backend | ✅ `orderflow-backend:latest` = `0667d07a65fb` |
| Migraciones en el contenedor | ✅ **40** directorios en `prisma/migrations` |
| Commit en el servidor | `ffa85109` (*deploy: sync local changes 20261022_130920*) |
| **Endpoint de la release** — `GET /api/v1/tenants/provecchio-dimora-001/config` | ✅ **HTTP 200** con `id: "provecchio-dimora-001"` y `whiteLabel.customDomain: "provecchio.com"` (antes del fix el modal de Marca Blanca no cargaba) |
| Login de admin | ✅ `POST /api/v1/auth/login` OK (token emitido) |

---

## 4. Incidencias y observaciones

### 4.1 Sonda de salud SSH durante el deploy (no bloqueante)

El script intentó el health check vía el proveedor de fallback `dimoraserver1` (`38.52.135.227:2021`)
y recibió `wget: can't connect to remote host: Connection refused`. El script **cayó al chequeo HTTP
público** (`https://provecchio.com/api/v1/health`) y éste pasó. El host primario
(`192.168.69.240`) respondió correctamente a SSH durante todo el proceso (rsync, build, migrate).
**Conclusión:** el fallo es del path de fallback por ProxyJump, no del deploy. La verificación
posterior por SSH directo confirmó 9/9 contenedores healthy.

### 4.2 Bug en `scripts/restore-provecchio.sh` — `DB_PORT` toma el literal `"null"`

**Síntoma:** el restore termina con `exit 1` justo después del mensaje
*"🔄 Applying pending migrations"*, sin imprimir el resumen final.

**Causa raíz:** el `backup_info.json` de producción trae `connection.port = null`. El script hace:

```bash
DB_PORT=$(jq -r '.connection.port' "$BACKUP_INFO_FILE")   # → "null" (string)
DB_PORT=${DB_PORT:-5433}                                  # "null" no está vacío → se conserva
```

y luego construye la URL local:

```bash
LOCAL_DATABASE_URL=$(echo "$LOCAL_DATABASE_URL" | sed -E "s#@[^/:@]+:[0-9]+/#@localhost:${DB_PORT}/#")
# → postgresql://orderflow:***@localhost:null/orderflow_db  ❌
```

`prisma migrate deploy` falla y, por `set -euo pipefail`, el script aborta.

**Impacto real:** **ninguno sobre los datos** — el dump y los uploads se restauraron completos y
verificados (168 tablas, conteos correctos) y las migraciones estaban al día. El único efecto es que
el script no es repetible de forma desatendida y no imprime su mensaje de cierre.

**Fix propuesto (2 líneas):** normalizar el literal antes del default
(`[ "$DB_PORT" = "null" ] && DB_PORT=""`) en los **dos** bloques que lo extraen (líneas 63-70 y 188-195).
Queda como **tarea de seguimiento** — no se aplicó durante el deploy para no introducir cambios de
código no planificados en mitad del protocolo (AGENTS.md Reglas #15/#16). Documentado en
[`docs/troubleshooting/188-restore-provecchio-db-port-null.md`](../../troubleshooting/188-restore-provecchio-db-port-null.md).

---

## 5. Rollback

| Artefacto | Ruta |
|---|---|
| Env de rollback (post-deploy) | `deploy-artifacts/rollback-provecchio-20261022_130136.env` |
| Env de rollback (pre-deploy) | `backups/rollback-provecchio-20261022_125507.env` |
| Dump de base de datos | `backups/pre_deploy_provecchio_20261022_125507.sql` |
| File store | `backups/pre_deploy_provecchio_20261022_125507_uploads.tar.gz` |

Procedimiento: restaurar el env, `docker compose up -d` en `/srv/orderflow` y, si hiciera falta,
restaurar el dump. La versión anterior (`1.39.28`) es compatible con el esquema actual
(la release **no** agrega migraciones nuevas).

---

## 6. Resultado

**v1.40.0 desplegada en producción y verificada.** El defecto de marca blanca que impedía cargar
la configuración del tenant en el modal del Super Admin queda resuelto y **por primera vez en
producción**. El protocolo deploy-to-local-first se cumplió de punta a punta con datos reales de
producción restaurados en localhost y 10/10 E2E en verde antes de tocar el servidor.
