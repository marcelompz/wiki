# AUDITORÍA — OpenCore (Schema Prisma) · Estado inicial

**Fecha:** 2026-10-19
**Versión en `main`:** 1.39.10
**Rama de trabajo:** `feat/schema-analysis-v4-docs` (documentación) → `main`
**Alcance de esta auditoría:** verificación del estado real del schema, del historial de
migraciones y de las ramas con trabajo pendiente, sin ejecutar ningún cambio sobre
`provecchio.local` ni sobre producción.

---

## 1. Resumen ejecutivo

El trabajo de análisis del schema Prisma venía en la rama `feat/schema-prisma-analysis-v3`,
que mezclaba dos cosas con riesgos muy distintos: **documentación de valor** (análisis v4,
plan de división, reporte de estado, plan de despliegue) y **código obsoleto** (`schema.prisma`
reformateado, `docker-compose.yml` anterior a los fixes de deploy, bump de versión a 1.39.9).

Se promovió **solo la documentación** a `main`. La parte de código queda sin fusionar y debe
retomarse en ramas dedicadas, una por gate.

La vertical queda abierta con 6 features planificadas (FEAT-177 a FEAT-182) y 5 gates, todos
en estado `pending`. No hubo cambios de schema, de migraciones, de compose ni de versión.

## 2. Métricas verificadas contra el repositorio

| Métrica | Valor verificado | Fuente |
|---|---|---|
| Modelos en el core | 161 | `grep -cE '^\s*model\s+\w+\s*\{' backend/prisma/schema.prisma` |
| Enums en el core | 56 | `grep -cE '^\s*enum\s+\w+\s*\{' backend/prisma/schema.prisma` |
| Líneas del schema | 4.471 | `wc -l` |
| Carpetas de migración | 38 | `ls backend/prisma/migrations` |
| — con timestamp completo `YYYYMMDDHHMMSS` | 26 | cumple AGENTS.md §2.4.4 |
| — heredadas con nombre corto | 11 | zona legacy, no se renombran |
| — `migration_lock.toml` | 1 | |
| Última migración | `20261003180000_migrate_positions_to_snake_case` | |
| Schemas standalone | 11 | `services/*/prisma/schema.prisma` |

**Discrepancia detectada:** el plan v4 afirma "38 carpetas de migraciones"; el conteo real
divide esas 38 entradas en 26 con timestamp completo, 11 heredadas con nombre corto
(p. ej. `20260811_add_server_model`) y `migration_lock.toml`. La cifra de 38 es correcta como
total de entradas, pero no como cantidad de migraciones con nomenclatura §2.4.4.

**Nota de conteo:** dos modelos (`OmnigastroSettings` y `ProductCategory`) están declarados con
sangría, por lo que un `grep` literal de `^model` los omite (161 vs 159). Todo script de
conteo o división debe tolerar sangría y correr `prisma format` antes.

## 3. Estado de las ramas

| Rama | Commits sin fusionar | Veredicto |
|---|---|---|
| `feat/gastro-kds-multi-station-print` | 0 | ya fusionada |
| `feat/gastro-rbac-empleados` | 0 | ya fusionada |
| `feat/omnigastro-pos-fullscreen-1.38.14` | 0 | ya fusionada |
| `fix/gastro-pos-tablet-responsive` | 0 | ya fusionada |
| `feat/schema-prisma-analysis-v3` | 2 | **parcialmente promovible** (solo documentación) |
| `staging` | 30 | **no fusionable** |

### 3.1 `feat/schema-prisma-analysis-v3` — qué se promovió y qué no

Commits de la rama:

| Commit | Contenido | Decisión |
|---|---|---|
| `27cd950d` | Análisis v4, plan de splitting, reporte de estado, plan de despliegue + `schema.prisma` reformateado + `docker-compose.yml` antiguo + `backend/README_DIAGRAM.md` | **Docs promovidas** (4 archivos de `docs/plans/opencore/` + `backend/README_DIAGRAM.md`); schema y compose **descartados** |
| `dac41b1f` | Bump de versión a 1.39.9 en `VERSION`, `backend/package.json`, `frontend/package.json`, `mobile/package.json`, `featurelist.json` | **Descartado** |

Motivos de descarte:

- El bump a 1.39.9 es una **regresión de versión**: `main` está en 1.39.10.
- `backend/package.json` de la rama revierte `start:prod` de `node dist/main` a
  `node dist/src/main` y el pin de Prisma de `^5.0.0` a `^5.22.0`.
- `docker-compose.yml` de la rama es **anterior a los fixes de producción**: elimina el
  servicio `redis`, los healthchecks, el `env_file` y el `REDIS_URL`/`ENABLE_REDIS_WS` del
  backend — exactamente los arreglos que hoy sostienen el deploy a provecchio
  (ver `docs/troubleshooting/183-deploy-provecchio-root-ssh-frontend-build-standalone-fix.md`).
- La diferencia de `schema.prisma` entre la rama y `main` es **cosmética**: reindentado de dos
  modelos y reordenamiento de dos atributos `@@unique` (`git diff -w` = 10 líneas).

### 3.2 `staging` — no fusionable

Rama congelada en 2026-09-01 (era v0.5.0). Sus 30 commits contienen trabajo ya presente en
`main` por otra vía (Sentry, scripts k6, `ensureRootDomain`, selector de galería de imágenes,
manual 29, módulo de loyalty, QR) más merges antiguos de `main`.

Fusionarla **no** es una opción: el diff contra `main` es de **20.755 inserciones y 132.556
borrados sobre 1.177 archivos**, es decir, borraría el troubleshooting 179-183, los specs E2E
de `frontend/e2e/`, el fix del adapter Redis (`backend/src/common/redis-io.adapter.ts`), los
fixes de `scripts/deploy-production.sh`, los fixes de los standalones y el release 1.39.10.

Si alguna de esas features interesa, debe extraerse **una por una** en su propia
rama con su propio PR, no por merge masivo.

## 4. Verificación de versiones (sin cambios)

| Chequeo | Resultado |
|---|---|
| `VERSION` | 1.39.10 |
| `backend/package.json`, `frontend/package.json` | 1.39.10 |
| 41 `*.manifest.json` de backend y servicios | 1.39.10 |
| `backend/src/main.ts` (Swagger) | 1.39.10 |
| `README.md` / `ROADMAP.md` (marcadores `CURRENT_VERSION`) | 1.39.10 |
| `CHANGELOG.md` | entrada 1.39.10 |
| `featurelist.json` (global) | 1.39.10 |
| Health `https://provecchio.com/api/v1/health` | `{"version":"1.39.10","status":"ok"}` |
| Health local `http://localhost:3010/api/v1/health` | `{"version":"1.39.10","status":"ok"}` |
| Bundle desplegado (`/assets/index-CA5tim_H.js`) | `"1.39.10"` |
| Wiki `/opt/wiki/orderflow/VERSION` | 1.39.10 |

Las únicas apariciones de `1.39.1` en el repositorio son los reportes históricos del release
v1.39.1 (`docs/info/deployment_report_1.39.0.md` y `docs/info/sprint_report_v1.39.1.md`), que
no se modifican por ser archivo histórico.

## 5. Riesgos abiertos

| # | Riesgo | Impacto | Mitigación propuesta |
|---|---|---|---|
| 1 | Imagen con `@map("tenant_id")` en seis modelos y con `OmnigastroSettings` desplegada sin verificar columnas reales | Consultas fallan al arrancar | Verificar columna por columna contra `provecchio.local` antes de cualquier deploy de schema |
| 2 | Contexto de build > 4,5 GB (`Dockerfile.dev`, `.dockerignore` de 245 bytes) | Builds frágiles y lentos en el servidor | Medir con `du -sh backend/` y ampliar `.dockerignore` sin excluir `backend/backups` ni `migrations/**/*.sql` |
| 3 | `migrate deploy` con `&&` en dev vs `|| true` en el entrypoint de prod | Fallo silencioso o contenedor que no levanta | Unificar el comportamiento de arranque antes de tocar migraciones |
| 4 | `rsync` del deploy con `--exclude='backups'` / `--exclude='uploads'` sin `/` inicial | Puede excluir `backend/backups` (código) | Anclar los excludes con `/` inicial y confirmar que el módulo llega al servidor |
| 5 | `ODOO_PASSWORD` en texto plano (`infra/docker-compose.yml`, `docs/info/files/docker-compose.yml`) | Credencial expuesta en el repo | Rotar y mover al `.env` (FEAT-181) |
| 6 | 52 `CREATE TABLE` y 15 `CREATE TYPE` frente a 161 modelos y 56 enums | Historial de migraciones posiblemente incompleto | Confirmarlo contra la base en la Fase 0 (FEAT-177) |

## 6. Próximos pasos

1. FEAT-177 (Fase 0): capturar el baseline contra `provecchio.local` — requiere leer la base,
   no escribir.
2. FEAT-179 (Plan 3) y FEAT-178 (Plan 1) en paralelo: riesgo bajo, no dependen de acceso a datos.
3. FEAT-181: duplicados exactos, `birthday_logs.type`, RLS versionada, credencial ODOO.
4. FEAT-180 (Plan 2): división por dominios, al final por diseño.
5. FEAT-182: gates 1-5, merge y deploy con autorización explícita.

Ninguno de los pasos anteriores puede ejecutarse contra `provecchio.com` sin autorización
explícita del usuario (AGENTS.md §9).

## 7. Evidencia

- Ramas: `git branch --merged main`, `git rev-list --count main..<rama>`.
- Diff real del schema: `git diff -w main..feat/schema-prisma-analysis-v3 -- backend/prisma/schema.prisma`
  → 10 líneas (cosmético).
- Impacto de `staging`: `git diff --stat main..staging` → 1.177 archivos, 132.556 borrados.
- Métricas del schema: `grep -cE '^\s*model\s+\w+\s*\{' backend/prisma/schema.prisma` → 161.
- Versiones: `scripts/check-version.sh` → todo sincronizado en 1.39.10.
