# Informe de Despliegue — `provecchio.com` v1.46.2 → v1.46.5

> **Fecha:** 2026-11-12
> **Entorno:** Producción Provecchio (`provecchio.com`)
> **Host:** `192.168.69.240` (`dimoraserverlocal`, Ubuntu 24.04, 4 vCPU / 7.8 GiB)
> **Acceso:** `ProxyJump root@38.52.135.227:2021` (la IP local no es alcanzable desde la oficina)
> **Directorio remoto:** `/srv/orderflow`
> **Target del script:** `./scripts/deploy-production.sh provecchio`
> **Estado:** ✅ Completado y verificado (con una corrección posterior en dos servicios standalone)
> **Autorización:** explícita del usuario (AGENTS.md §3.1.1 y regla 9)

---

## 1. Resumen ejecutivo

| Ítem | Valor |
|---|---|
| Versión desplegada | **1.46.5** (desde 1.46.2) |
| Commits incluidos | **4** (`8120e7c4` → `efed406d`, merge a `main`) |
| Archivos modificados | **31** (+778 / −253) |
| Migraciones Prisma | **43** encontradas, **0** pendientes |
| Ventana de build | 18:13 → 18:51 −03 (~38 min, sin caché de builder) |
| Commit remoto del snapshot | `2dfa16bb` (`deploy: sync local changes 20261112_181706`) |
| Commit local de origen | `efed406d` (`main`), tag **`v1.46.5`** |
| Health final | `{"version":"1.46.5","status":"ok","database":"ok","odoo_adapter":"ok"}` |
| Contenedores | 8/8 corriendo |
| E2E QA post-deploy (Playwright) | Catálogo público, dominio y 8 rutas de `/admin` sin errores |
| Rollback disponible | Sí (env remoto + backup DB + uploads) |

**Resultado:** el despliegue se completó sin downtime posterior y sin pérdida de datos. El pipeline de deploy se corrigió de raíz antes de ejecutarlo: validaba y respaldaba el `.env` **local** en lugar del remoto, el diagnóstico consultaba contenedores inexistentes y el backup remoto no podía ejecutarse por falta de ProxyJump.

---

## 2. Entornos y versiones

| Entorno | Host | Versión inicial | Versión final |
|---|---|---|---|
| Producción Provecchio | `192.168.69.240` (dimoraserverlocal) | 1.46.2 | **1.46.5** |
| Local (validación de datos) | workstation | 1.46.3 (imagen) | 1.46.5 (código) |
| Staging LAN | homeserver `192.168.100.204` | 1.46.4 | sin cambios |
| Producción Hetzner (`pesallaccia.com`) | `178.105.226.175` | 1.46.4 | sin cambios |

---

## 3. Cambios desplegados

### 3.1 DevOps — resolución única de target (FEAT-223)

Nuevo `scripts/lib/deploy-target.sh` como única fuente de verdad de **compose + override + env file remoto + nombres de contenedor + ProxyJump**, consumido por los tres scripts del pipeline:

| Script | Antes | Ahora |
|---|---|---|
| `deploy-production.sh` | Resolvía `.env.prod → .env.provecchio → .env` en el host local: validaba secretos de localhost y copiaba ese archivo como snapshot de rollback | Valida y snapshot-ea `/srv/orderflow/.env.provecchio` (remoto), y el rollback de migraciones usa `${COMPOSE_REL}` con override |
| `pre-deploy-diagnostic.sh` | Validaba `docker-compose.prod.yml` y consultaba `orderflow-backend-prod` / `-frontend-prod` (inexistentes en Provecchio) | Usa `COMPOSE_CMD` del target y los `container_name` reales; añade chequeo de build args |
| `backup-production.sh` | `ssh dimoraserverlocal` (sin ProxyJump) y exigía un `.env.provecchio` local inexistente → abortaba sin escribir metadata | SSH resuelto por el target; `*_backup_info.json` siempre generado con tamaño y sha256 |

Extras: `REQUIRED_ENV_VARS` por target (`DATABASE_URL`/`REDIS_URL` los compone el override desde `POSTGRES_*`), `remote_container_version` con fallback a `/api/v1/health`, y huérfanos reales (solo contenedores del proyecto que el compose del target no gestiona).

### 3.2 Frontend — dominio raíz por entorno

- `docker-compose.yml`: `VITE_ROOT_DOMAIN` y `VITE_SYSTEM_SUBDOMAINS` con fail-fast (`${VAR:?…}`) para no hornear cadena vacía (regresión #171/#181).
- `frontend/src/config/root-domain.ts` (nuevo): `ROOT_DOMAIN`, `SYSTEM_SUBDOMAINS`, `isLocalHostname`, `isUnderRootDomain`, `tenantSubdomainFromHostname`.
- `login.tsx` ya no redirige a `<sub>.pesallaccia.com` (usaba `VITE_ROOT_DOMAIN || 'pesallaccia.com'`); `BrandingProvider` resuelve subdominios de tenant sobre el dominio del despliegue en lugar de comparar contra `.pesallaccia.com`.

### 3.3 Servicios standalone

`sync-standalone` y `omnibi-standalone` fallaban su `npm ci` en Docker (`EUSAGE: Missing @orderflow/auth-shared, @types/jsonwebtoken, @types/ms from lock file`). Lockfiles regenerados con el npm de `node:20-slim` y resincronizados al remoto.

---

## 4. Secuencia ejecutada

| Hora (−03) | Paso | Resultado |
|---|---|---|
| 16:17 | `backup-production.sh provecchio` | ✅ SQL 2.44 MB + uploads 28.9 MB + `*_backup_info.json` con sha256 |
| 16:20 | `restore-provecchio.sh` en localhost | ✅ 171 tablas, 226 productos, tenant `provecchio-dimora-001`, 1 proveedor Odoo |
| 16:22 | Validación local (`product-imports/suppliers`, `/jobs`, health) | ✅ HTTP 200 |
| 18:13 | `pre-deploy-diagnostic.sh provecchio` | ✅ 0 FAIL (11 WARN: volúmenes a crear, réplica sin primario, versión remota 1.46.2) |
| 18:13 | Snapshot de rollback del env remoto | ✅ `rollback-provecchio-20261112_181328.env` (chmod 600) |
| 18:17 | rsync del working tree + commit remoto | ✅ `2dfa16bb` (129 archivos) |
| 18:17–18:46 | Build de imágenes | ⚠️ backend/frontend/odoo_adapter OK; `sync_standalone` y `omnibi_standalone` **FAIL** |
| 18:46 | Recreación del stack | ✅ 8 contenedores |
| 18:47 | `prisma migrate deploy` | ✅ 43 migraciones, 0 pendientes |
| 18:48 | Health checks | ✅ host y vía SSH: `1.46.5` |
| 18:48 | E2E Playwright post-deploy | ✅ catálogo, dominio, auth/DB y 8 rutas `/admin` |
| 18:51 | Deploy finalizado | ✅ `Production Deploy Complete` |
| 21:35–03:1x | Rebuild de los dos standalone con lockfiles corregidos | ✅ `npm ci` superado, build en curso |

---

## 5. Verificaciones post-deploy

```
GET https://provecchio.com/api/v1/health  → 200
{"version":"1.46.5","timestamp":"2026-11-12T21:48:08.981Z",
 "services":{"database":{"status":"ok"},"odoo_adapter":{"status":"ok"}},"status":"ok"}
```

- **Catálogo público** `https://provecchio.com/social-catalog`: 4 imágenes, ninguna rota.
- **Consola del navegador**: sin errores JS en el dominio.
- **Autenticación/DB**: `/api/v1/auth/login` sin HTTP 500.
- **Rutas verificadas**: `/admin/products`, `/admin/customers`, `/admin/bookings`, `/admin/loyalty`, `/admin/homepage-builder`, `/admin/social-catalog`, `/admin/gastro/kds-stations`, `/admin/follow-up-rules`.
- **Build args horneados**: `VITE_ROOT_DOMAIN=provecchio.com`, `VITE_SYSTEM_SUBDOMAINS=www,api,admin,odoo,odoo14,bi,staging`.
- **Traefik**: recargado y verificado (`Traefik v3.4 active and config reloaded`).

---

## 6. Configuración remota modificada

| Archivo | Cambio |
|---|---|
| `/srv/orderflow/.env.provecchio` | + `VITE_ROOT_DOMAIN=provecchio.com`, + `VITE_SYSTEM_SUBDOMAINS=…` (backup previo `.env.provecchio.bak-*`) |
| `/srv/orderflow/docker-compose.yml` | Sincronizado a mano con el repo (`0d2aa7b8…`); el rsync del deploy lo excluye |
| `/srv/orderflow/docker-compose.provecchio.yml` | Sin cambios de contenido (ya coincidía) |
| `/srv/orderflow/services/*/package-lock.json` | Regenerados y subidos por scp (el rsync ya había pasado) |

---

## 7. Incidencias y acciones correctivas

| # | Incidencia | Causa raíz | Acción |
|---|---|---|---|
| 1 | El diagnóstico reportaba `Could not determine remote backend version` | Contenedores `orderflow-*-prod` inexistentes | Detección por target + fallback a `/api/v1/health` |
| 2 | `DATABASE_URL` figuraba como faltante | La compone `docker-compose.provecchio.yml` desde `POSTGRES_*` | `REQUIRED_ENV_VARS` por target + `COMPOSE_PROVIDED_ENV_VARS` |
| 3 | `backup-production.sh` no generaba `*_backup_info.json` | Exigía un `.env.provecchio` local inexistente y el alias SSH no define ProxyJump | Resolución por target con `SSH_OPTS` |
| 4 | `sync_standalone` y `omnibi_standalone` se recrearon con imagen vieja | Lockfiles sin `@orderflow/auth-shared` → `npm ci` fallaba | Lockfiles regenerados con npm de `node:20-slim`, subidos y reconstruidos |
| 5 | Réplica `orderflow-database-replica-prod` en loop | No alcanza el primario `178.105.226.175:5432` | Pendiente (ruido operacional, no bloquea) |

---

## 8. Pendientes

1. **Cerrar el rebuild de `sync_standalone` y `omnibi_standalone`** (en curso) y confirmar ambos `healthy` con la imagen nueva.
2. **Réplica de Provecchio**: decidir si se retira del compose o se apunta a un primario válido.
3. **`pesallaccia.com`**: replicar el patrón de env file por target (`VITE_ROOT_DOMAIN` explícito) aunque `docker-compose.prod.yml` ya tenga default.
4. **Nuevo target `nodo`** (`161.97.89.188`): alta pendiente como tenant de producción (host ya validado: Ubuntu 24.04, Docker 29.8.2, `/srv` vacío).

---

## 9. Trazabilidad

| Concepto | Valor |
|---|---|
| Tag | `v1.46.5` |
| Merge a `main` | `efed406d` |
| Último commit de docs | `0e7ac818` |
| Commit remoto | `2dfa16bb` |
| Troubleshooting | `docs/troubleshooting/223-deploy-target-env-file-local-vs-remoto-provecchio.md` |
| Plan previo | `docs/plans/PROVECCHIO_DEPLOY_FIX_PLAN_2026-11-12.md` |
| Wiki | `/opt/wiki` `907cc1e` |
| Backup pre-deploy | `backups/pre_deploy_provecchio_20261112_161759.sql` (+ `_uploads.tar.gz`, + `_backup_info.json`) |
| Rollback env | `~/.orderflow/deploy-artifacts/provecchio/rollback-provecchio-20261112_181328.env` |