# Deploy Report — v1.40.1 a `provecchio.com`

> **Fecha:** 2026-10-22 · **Target:** `provecchio` (`root@192.168.69.240`, path `/srv/orderflow`)
> **Versión anterior en producción:** `1.40.0` → **Versión desplegada:** **`1.40.1`** ✅
> **Tag:** [`v1.40.1`](https://github.com/marcelompz/orderflow/releases/tag/v1.40.1) sobre el commit `f6ba3907` (merge del PR #16)
> **Protocolo aplicado:** AGENTS.md §3.1.1 (Deploy-to-Local-First) + §3.2 (Diagnóstico de Infraestructura)

---

## 1. Alcance de la release

| Commit | Contenido |
|---|---|
| `2715b484` | Fix: `PATCH /api/v1/tenants/:id` devolvía **500** y podía **borrar la configuración del tenant** |
| `f6ba3907` | PR #16 — merge a `main` |

**Tipo de bump:** `patch` (1.40.0 → **1.40.1**), conforme Regla #11 de AGENTS.md: corrección de
defectos dentro de una vertical existente, **sin** endpoints nuevos ni cambios de superficie de API.

### Los tres defectos corregidos

| # | Síntoma | Causa raíz |
|---|---|---|
| D1 | `PATCH` → **500** `Unknown argument 'customDomainVerified'` | El `update()` escribía un campo que **no existe** en `model Tenant` (el real es `domainVerified`) |
| D2 | `PATCH` → **500** `Unknown argument 'whiteLabel'` | El frontend enviaba un objeto `whiteLabel` anidado que no es columna de `Tenant` |
| D3 | **Pérdida de datos** (enmascarada por D1/D2) | El modal enviaba `config: { footerCredits }`; `Tenant.config` es `Json?` y un `update` de Prisma **reemplaza** el JSON completo (`gastro`, `qrTokens`, `homepageBlocks`, `subscription`…) |

> D1 y D2 abortaban la petición antes de escribir, y eso **enmascaraba** D3: corregir solo el 500
> habría habilitado el borrado de la configuración en el primer guardado.
> Detalle completo en [`docs/troubleshooting/189-white-label-patch-500-config-overwrite.md`](../../troubleshooting/189-white-label-patch-500-config-overwrite.md).

### Cambios de código

**`backend/src/tenants/tenants.controller.ts`**
```ts
select: { customDomain: true, subdomain: true, config: true },  // + config
const payload: any = { ...data };
delete payload.whiteLabel;                                       // D2
// ...
payload.domainVerified = true;                                   // D1
if (data.config && typeof data.config === 'object' && !Array.isArray(data.config)) {
  payload.config = { ...(existing?.config ?? {}), ...data.config };  // D3
}
```

**`frontend/src/pages/admin/super-admin-dashboard.tsx`** — se elimina el bloque `whiteLabel`
redundante del payload (los valores ya viajan en el nivel superior).

---

## 2. Protocolo ejecutado (evidencia)

| Paso (§3.1.1) | Comando | Resultado |
|---|---|---|
| 0. Repo limpio y sincronizado | `git checkout main && git pull origin main` | ✅ `main` en `f6ba3907`, `VERSION` = `1.40.1`, árbol limpio (0 cambios) |
| 0b. Liberar disco | `docker builder prune -f` | ✅ 3.589 MB liberados → 32 GB libres en `/` |
| 0c. Diagnóstico de infraestructura (§3.2) | `./scripts/pre-deploy-diagnostic.sh provecchio` | ✅ **0 fallos críticos**, 11 warnings preexistentes (Docker storage 9.2 G, 8 contenedores huérfanos, volúmenes "will be created", versión remota indeterminable) |
| 1. Backup de producción | `./scripts/backup-production.sh provecchio` | ✅ `pre_deploy_provecchio_20261022_160434.sql` (**2.235.722 bytes**) + `_uploads.tar.gz` (**28.893.820 bytes**) + `rollback-provecchio-20261022_160434.env` + `backup_info.json` |
| 2. Restore en localhost | `./scripts/restore-provecchio.sh` | ✅ **exit 0** (el fix de `DB_PORT` de v1.40.0 funciona en el flujo real): `port=5433`, *"No pending migrations to apply"*, `✅ Restore completed successfully!` |
| 2b. Verificación del restore | salida del propio script | ✅ **168 tablas, 1 tenant, 7 empleados, 4 cajas** |
| 3. Deploy local (`deploy-local.sh`) | `./scripts/deploy-local.sh` | ✅ **ALL CHECKS PASSED** — versión sincronizada en `1.40.1`; Prisma generate, `nest build`, `vite build`, `tsc` OK; **135 suites / 1015 tests**; health local `1.40.1`; bundle fresco |
| 4. E2E en localhost | `PLAYWRIGHT_BASE_URL=https://provecchio.local npx playwright test white-label-modal.spec.ts mozo-flag.spec.ts order-history-server.spec.ts hr-endpoints.spec.ts` | ✅ **14/14 passed** (incluye los **4 nuevos** de Marca Blanca: PATCH 200, `whiteLabel` tolerado, `config` preservada, modal carga `customDomain`) |
| 5. Traefik (§9.1) | `md5sum` local vs remoto | ✅ `c1bd80a6a9bee149e8cf6d0783e4ea7c` **idéntico** — sin cambios de ruteo en esta release |
| 6. Estado previo de producción | `curl /api/v1/health` | ✅ `1.40.0` → se actualizó a `1.40.1` |
| 7. **Deploy a producción** | `./scripts/deploy-production.sh provecchio` | ✅ **🎉 Production Deploy Complete** — rollback env `deploy-artifacts/rollback-provecchio-20261022_161656.env`; backend `sha256:fb3d9ecc4d07`; **39 migraciones, 0 pendientes**; Traefik recargado; QA E2E 8 rutas admin OK; catálogo público 4 imágenes OK; 0 errores JS |
| 8. Tag | `git tag -a v1.40.1 f6ba3907 && git push origin v1.40.1` | ✅ tag publicado |

---

## 3. Verificación post-deploy

| Verificación | Resultado |
|---|---|
| `GET https://provecchio.com/api/v1/health` | ✅ `{"version":"1.40.1", ..., "status":"ok"}` — `database: ok`, `odoo_adapter: ok` |
| Contenedores en el host | ✅ `orderflow_backend`, `orderflow_frontend`, `orderflow_db`, `orderflow_redis`, `orderflow_odoo_adapter`, `orderflow_sync_standalone`, `orderflow_omnibi_standalone`, `orderflow-database-replica-prod` → **healthy** (9 con `traefik`) |
| Bundle servido | ✅ `assets/index-BPoU28fx.js` (build fresco del deploy, no caché) |
| Imagen backend | ✅ `orderflow-backend:latest` = `fb3d9ecc4d07` (creada en el deploy) |
| Migraciones en el contenedor | ✅ **39** directorios en `prisma/migrations`, *"No pending migrations to apply"* (la release **no** agrega migraciones) |
| Commit en el servidor | `ac9597ae` (*deploy: sync local changes 20261022_162430*) |
| Sitio público | ✅ `GET /` → HTTP 200 |

### 3.1 Verificación funcional del endpoint de la release (en producción)

`PATCH /api/v1/tenants/provecchio-dimora-001` con un valor **idempotente** —`HTTPS://Provecchio.COM/admin/?x=1`—,
que normaliza exactamente al dominio actual, por lo que **no dispara ninguna llamada a Cloudflare**:

| Check | Antes (v1.40.0) | Después (v1.40.1) |
|---|---|---|
| `PATCH` con `customDomain` sucio | ❌ **HTTP 500** (`Unknown argument 'customDomainVerified'`) | ✅ **HTTP 200** |
| `customDomain` resultante | — | ✅ `"provecchio.com"` (normalizado) |
| `domainVerified` | — | ✅ `true` |
| `PATCH` con `whiteLabel` anidado | ❌ **HTTP 500** (`Unknown argument 'whiteLabel'`) | ✅ **HTTP 200** (se ignora) |
| `PATCH` con `config: { footerCredits }` | ❌ 500 (y latente: borrado de config) | ✅ **HTTP 200**, **merge** |

**Prueba de preservación de `config`** (la más importante, D3):

```text
claves config: 8  →  despues: 9
claves perdidas: NINGUNA
  homepageBlocks: identica
  subscription  : identica
  gastro        : identica
  fontFamily    : identica
```

La única diferencia es la clave `footerCredits` —que se agregó—, exactamente el comportamiento
esperado del merge aditivo. **Antes del fix, este mismo `PATCH` habría dejado `config` con una sola
clave.**

---

## 4. Incidencias y observaciones

### 4.1 Sonda de salud SSH durante el deploy (no bloqueante, conocida)

El script intentó el health check vía el proveedor de fallback `dimoraserver1`
(`38.52.135.227:2021`) y recibió `wget: can't connect to remote host: Connection refused`; cayó al
chequeo HTTP público y éste pasó. El host primario (`192.168.69.240`) respondió correctamente a SSH
durante todo el proceso (rsync, build, migrate). Verificación posterior por SSH directo: **9/9
contenedores healthy**. Es el mismo comportamiento benigno documentado en el reporte de v1.40.0.

### 4.2 Conteo de empleados distinto al backup anterior

El restore reportó **7 empleados** (el backup de v1.40.0 tenía **6**). Es un cambio de **datos de
producción**, no del código: alguien dio de alta un empleado entre ambos backups. El restore refleja
fielmente el estado actual de producción.

### 4.3 `footerCredits` no existía en el tenant

La verificación previa mostró que `config.footerCredits` **no estaba** en el tenant de producción
(8 claves). Tras el `PATCH` idempotente quedó la clave con valor vacío (9 claves). Es el efecto
esperado del modal al guardar; no altera el resto de la configuración.

---

## 5. Rollback

| Artefacto | Ruta |
|---|---|
| Env de rollback (post-deploy) | `deploy-artifacts/rollback-provecchio-20261022_161656.env` |
| Env de rollback (pre-deploy) | `backups/rollback-provecchio-20261022_160434.env` |
| Dump de base de datos | `backups/pre_deploy_provecchio_20261022_160434.sql` |
| File store | `backups/pre_deploy_provecchio_20261022_160434_uploads.tar.gz` |

Procedimiento: restaurar el env, `docker compose up -d` en `/srv/orderflow` y, si hiciera falta,
restaurar el dump. La versión anterior (`1.40.0`) es compatible con el esquema actual: la release
**no** agrega ni modifica migraciones.

---

## 6. Resultado

**v1.40.1 desplegada en producción y verificada funcionalmente.** El modal 🏷️ Marca Blanca del Super
Admin queda operativo de punta a punta —**lectura** (v1.40.0) y **guardado** (v1.40.1)— sin riesgo
de destruir la configuración del tenant.

El defecto más peligroso de la release (D3) estaba **enmascarado** por los dos 500: la verificación
post-deploy con datos reales de producción confirma que el `config` del tenant conserva íntegras
todas sus claves tras el guardado.

Se cumplió el protocolo deploy-to-local-first de punta a punta: backup de producción → restore en
localhost → **135 suites / 1015 tests** → **14/14 E2E** → deploy → verificación post-deploy con
`PATCH` idempotente.
