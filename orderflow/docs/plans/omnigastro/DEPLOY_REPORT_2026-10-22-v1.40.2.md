# Deploy Report — v1.40.2 a `provecchio.com`

> **Fecha:** 2026-10-22 · **Target:** `provecchio` (`root@192.168.69.240`, path `/srv/orderflow`)
> **Versión anterior en producción:** `1.40.1` → **Versión desplegada:** **`1.40.2`** ✅
> **Tag:** `v1.40.2` sobre el commit `7a4c1679`
> **Protocolo aplicado:** AGENTS.md §3.1.1 (Deploy-to-Local-First) + §3.2 (Diagnóstico de Infraestructura)

---

## 1. Alcance de la release

| Commit | Contenido |
|---|---|
| `98b92fa6` | PR #19 — merge de FEAT-200: editar y eliminar mesas en `/admin/gastro/tables` |
| `d89be980` | PR #20 — sincronización de versión (`mobile/package.json`, `docs/ROADMAP.md`, `docs/guides/CHANGELOG.md`) |
| `fd0b24f3` | Fix infra: 502 de `pesallaccia.com` en Hetzner por nombres de contenedor en Traefik (afecta `docker-compose.prod.yml`, **no** a Provecchio) |
| `7a4c1679` | Docs: entrada de CHANGELOG del fix 502 |

**Tipo de bump:** `patch` (1.40.1 → **1.40.2**), conforme Regla #11 de AGENTS.md: corrección de
defectos dentro de una vertical existente. La release **no agrega endpoints nuevos** — usa
`PATCH /api/v1/tables/:id` y `DELETE /api/v1/tables/:id`, que ya existían en el controlador pero
eran **inalcanzables desde la UI**.

### El defecto corregido (FEAT-200)

| # | Síntoma | Causa raíz |
|---|---|---|
| 1 | En `/admin/gastro/tables` **solo funcionaba crear**; editar y borrar no hacían nada | `handleEditTable`, `handleSaveTable` y `handleDeleteTable` eran **código muerto**: ningún botón los invocaba |
| 2 | `/admin/gastro` solo permitía renombrar | Modal reducido a `tableNumber` |
| 3 | Se podía borrar una mesa con la cuenta abierta | `deleteTable` no verificaba pedidos activos |
| 4 | Dos mesas podían apuntar al mismo `restaurant.table` de Odoo | `PATCH` escribía `odooTableId` sin validar unicidad |
| 5 | Una mesa soft-deleted no podía volver a crearse con el mismo número | El `CREATE` chocaba con el registro histórico |

Detalle completo en [`docs/troubleshooting/190-gastro-tables-handlers-huerfanos.md`](../../troubleshooting/190-gastro-tables-handlers-huerfanos.md).

### Cambios de código

- `frontend/src/components/gastro-table-edit-modal.tsx` — modal compartido (número, nombre, zona, sillas, forma, `odooTableId`).
- `frontend/src/pages/admin/gastro-tables.tsx` — botones **Editar** / **Eliminar** en grilla y drawer, con confirmación.
- `backend/src/tables/tables.service.ts` — guard de pedidos abiertos (**400**), unicidad de `odooTableId`, revive de mesas soft-deleted, resolución de `waiterCalls` en la misma transacción.
- `backend/src/tables/tables.controller.ts` — `PATCH ':id'` protegido con `tables:manage`.
- `frontend/e2e/gastro-tables-crud.spec.ts` — 4 pruebas E2E del CRUD.

---

## 2. Protocolo ejecutado (evidencia)

| Paso (§3.1.1) | Comando | Resultado |
|---|---|---|
| 0. Merge del PR | `gh pr merge 19 --merge --admin --delete-branch` | ✅ `98b92fa6` en `main` (checks en rojo por límite de gasto de GitHub Actions — troubleshooting #185) |
| 1. Backup de producción | `./scripts/backup-production.sh provecchio` | ✅ `pre_deploy_provecchio_20261022_181703.sql` (**2.243.755 B**) + `_uploads.tar.gz` (**28.893.820 B**) + `rollback-provecchio-20261022_181703.env` |
| 2. Restore en localhost | `./scripts/restore-provecchio.sh` | ✅ **168 tablas, 1 tenant, 7 empleados, 4 cajas**, *"No pending migrations to apply"* |
| 2b. Fidelidad de datos | consultas SQL comparativas | ✅ **10 mesas activas (10 mapeadas), 2 pisos, 30 pedidos, 0 llamadas pendientes, 4 clientes, 226 productos** — idéntico a producción |
| 2c. `GET /api/v1/tables` local | token de producción | ✅ 10 mesas con mapeos correctos: G10→2, T11→1, G2→40, G3–G9→75-81 |
| 3. Deploy local | `./scripts/deploy-local.sh` | ⚠️ **1er run: FAIL** en Phase 2 (`check-version-sync.sh`: `mobile/package.json`, `docs/ROADMAP.md`, `docs/guides/CHANGELOG.md` seguían en `1.40.1`) → corregido vía **PR #20** |
| 3b. Deploy local (re-run) | `./scripts/deploy-local.sh` | ✅ **ALL CHECKS PASSED** — **135 suites / 1020 tests**, builds OK, health `1.40.2`, Swagger `v1.40.2`, 11/11 archivos de versión sincronizados |
| 4. E2E en localhost | `npx playwright test gastro-tables-crud tables-modal-sync white-label-modal odoo-pos-sync` | ✅ **13 passed, 5 skipped** (skips = verificaciones opcionales contra Odoo) |
| 5. Persistencia de datos | `docker compose down` + `up -d` | ✅ health `1.40.2`, `odoo_adapter: ok`; **10 mesas activas / 13 total, 226 productos, 4 clientes** intactos |
| 6. Diagnóstico de infraestructura (§3.2) | `./scripts/pre-deploy-diagnostic.sh provecchio` | ✅ **0 fallos críticos**, 11 warnings preexistentes (contenedores huérfanos locales, volúmenes "will be created", versión remota indeterminable) |
| 7. **Deploy a producción** | `./scripts/deploy-production.sh provecchio` | ✅ **🎉 Production Deploy Complete** — rollback env `deploy-artifacts/rollback-provecchio-20261022_182901.env`; imagen backend `sha256:dfda8b451aaf`; **39 migraciones, 0 pendientes**; Traefik v3.4 recargado; QA E2E 8 rutas admin OK; catálogo público 4 imágenes OK; 0 errores JS |
| 8. Tag | `git tag -a v1.40.2 7a4c1679 && git push origin v1.40.2` | ✅ tag publicado |

---

## 3. Verificación post-deploy

| Verificación | Resultado |
|---|---|
| `GET https://provecchio.com/api/v1/health` | ✅ `{"version":"1.40.2", ..., "database":"ok", "odoo_adapter":"ok", "status":"ok"}` |
| Contenedores en el host | ✅ 8 contenedores `orderflow*` **healthy** (`backend`, `frontend`, `db`, `redis`, `odoo_adapter`, `sync_standalone`, `omnibi_standalone`, `database-replica-prod`) |
| `VERSION` en el servidor | ✅ `1.40.2` |
| Commit en el servidor | `4817f4b3` (*deploy: sync local changes 20261022_183632*) |
| Migraciones | ✅ **39** directorios, *"No pending migrations to apply"* (la release no agrega migraciones) |
| Bundle servido | ✅ `assets/index-BbPb-iYz.js` + chunk **`assets/gastro-table-edit-modal-BR477_0I.js`** (build fresco) |
| Datos de producción | ✅ **10 mesas activas**, todas mapeadas y en `FREE` (G10→2, T11→1, G2→40, G3–G9→75-81) |
| Diagnóstico Odoo | ✅ `GET /api/v1/tables/odoo-tables` → `configId: 2`, **46 mesas** de Odoo, `sessions` y `fetchedAt` presentes |

### 3.1 Verificación funcional del CRUD (en producción)

| Check | Resultado |
|---|---|
| `PATCH /api/v1/tables/:id` (sin token) | **400** → la ruta existe y valida contexto (no es 404) |
| `DELETE /api/v1/tables/:id` (sin token) | **400** → ídem |
| Ruta inexistente (control) | `GET /api/v1/tables/xyz/nope` → **404** |
| Bundle `gastro-tables-*` | 4 ocurrencias de `Editar`, 6 de `Eliminar`, importa `gastro-table-edit-modal` |
| Bundle `gastro-table-edit-modal-*` | 66.253 B; contiene `Editar Mesa` y 7 referencias a `odooTableId` |

---

## 4. Incidencias y observaciones

### 4.1 Sonda de salud SSH: falso negativo por `localhost` → `::1` (no bloqueante)

Durante el deploy, `Verifying backend application health...` agotó 60 s y reportó
`❌ Backend health check failed after 60s`; el script cayó al **fallback HTTP público**
(`https://provecchio.com/api/v1/health`), que respondió **200 OK**.

**Causa raíz identificada** (nueva, no documentada antes):

```bash
# scripts/deploy-production.sh:338,348,376
docker exec ${BACKEND_CONTAINER} wget -qO- http://localhost:3010/api/v1/health
```

Dentro del contenedor, `localhost` resuelve primero a **IPv6 (`::1`)** y la aplicación escucha solo
en IPv4 (`0.0.0.0:3010`). El healthcheck propio de la imagen usa `127.0.0.1` y por eso el contenedor
figura **healthy**:

```text
docker inspect orderflow_backend → wget --spider http://127.0.0.1:3010/api/v1/health   # OK
docker exec orderflow_backend wget -qO- http://localhost:3010/api/v1/health            # Connection refused
```

El deploy **no se vio afectado** (el fallback público validó la salud y el contenedor estaba healthy),
pero el script pierde 60 s y emite una falsa alarma. **Corrección pendiente de aprobación**:
`localhost` → `127.0.0.1` en las tres líneas citadas.

### 4.2 Sonda del host de fallback `dimoraserver1`

`wget: can't connect to remote host: Connection refused` desde `38.52.135.227:2021`. Es el mismo
comportamiento benigno documentado en los reportes de v1.40.0 y v1.40.1: el host primario
(`192.168.69.240`) respondió por SSH durante todo el proceso.

### 4.3 Commits de infraestructura posteriores al deploy

`fd0b24f3` y `7a4c1679` (fix del 502 de `pesallaccia.com` en **Hetzner**) se commitearon a las
`19:02`, después de finalizado el deploy de Provecchio (`19:00`). Modifican `docker-compose.prod.yml`,
que **Provecchio no usa** (usa `docker-compose.provecchio.yml`), por lo que no hay divergencia
funcional en `provecchio.com`. El tag `v1.40.2` los incluye.

### 4.4 Sincronización de versión incompleta detectada por el arnés

`check-version-sync.sh` validó correctamente 3 archivos que el bump de FEAT-200 había omitido
(`mobile/package.json`, `docs/ROADMAP.md`, `docs/guides/CHANGELOG.md`). Se corrigieron en el PR #20
**antes** de desplegar. Sin ese paso, `deploy-local.sh` habría abortado el protocolo.

---

## 5. Rollback

| Artefacto | Ruta |
|---|---|
| Env de rollback (post-deploy) | `deploy-artifacts/rollback-provecchio-20261022_182901.env` |
| Env de rollback (pre-deploy) | `backups/rollback-provecchio-20261022_181703.env` |
| Dump de base de datos | `backups/pre_deploy_provecchio_20261022_181703.sql` |
| File store | `backups/pre_deploy_provecchio_20261022_181703_uploads.tar.gz` |

Procedimiento: restaurar el env, `docker compose up -d` en `/srv/orderflow` y, si hiciera falta,
restaurar el dump. La versión anterior (`1.40.1`) es **compatible con el esquema actual**: la release
no agrega ni modifica migraciones.

---

## 6. Resultado

**v1.40.2 desplegada en producción y verificada.** El CRUD de mesas de OmniGastro queda operativo de
punta a punta en `provecchio.com`:

- **Editar** y **Eliminar** visibles en la grilla y en el drawer de `/admin/gastro/tables`.
- Borrado **bloqueado** (HTTP 400) si la mesa tiene pedidos activos; las llamadas al mozo `PENDING`
  se resuelven en la misma transacción.
- Mapeo a Odoo **único**: dos mesas no pueden apuntar al mismo `restaurant.table`.
- Los 10 mapeos productivos (`G2→40`, `G3–G9→75-81`, `G10→2`, `T11→1`) sobreviven al deploy intactos.
