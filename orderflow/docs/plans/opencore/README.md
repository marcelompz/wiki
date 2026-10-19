# OpenCore — Análisis y Refactor del Schema Prisma

**Vertical:** schema core de OrderFlow (`backend/prisma/schema.prisma`) y su ecosystem de
11 schemas standalone (`services/*/prisma/schema.prisma`).

**Estado en `main`:** solo documentación (v1.39.10). No hay cambios de `schema.prisma`,
`docker-compose.yml`, `package.json` ni `VERSION` en esta vertical.

---

## Índice de documentos

| Documento | Contenido |
|---|---|
| [`Plan_analisis_schema_prisma_v4.md`](Plan_analisis_schema_prisma_v4.md) | Plan maestro verificado contra el repositorio: estado real, decisiones tomadas, gates, orden de ejecución y riesgos de despliegue |
| [`PLAN_2_SCHEMA_SPLITTING_SUMMARY.md`](PLAN_2_SCHEMA_SPLITTING_SUMMARY.md) | Plan 2 — división del schema único en dominios (`platform/`, `commerce/`, `pos/`, `inventory/`, `crm/`, `hr/`, `fiscal/`, `modules/`, `intel/`) y script de migración |
| [`PROJECT_STATUS_REPORT.md`](PROJECT_STATUS_REPORT.md) | Reporte de estado por fases (Planes 0A/0B/1/2/3): qué está completo, qué es parcial y qué falta |
| [`DEPLOYMENT_PLAN.md`](DEPLOYMENT_PLAN.md) | Plan de despliegue histórico de la rama de trabajo (redirección de `provecchio.local` a la rama de esquema). **Documento histórico:** el estado vigente es `main` v1.39.10 desplegado en `provecchio.com` |
| `backend/README_DIAGRAM.md` | Traza de ejecución del Plan 3 (diagrama de relaciones) |

## Métricas verificadas contra el repositorio (v1.39.10)

| Métrica | Valor |
|---|---|
| Modelos en el core | 161 (`grep -cE '^\s*model\s+\w+\s*\{'`) |
| Enums en el core | 56 |
| Líneas del schema | 4.471 |
| Carpetas en `backend/prisma/migrations` | 38 = 26 con timestamp completo `YYYYMMDDHHMMSS` + 11 heredadas con nombre corto + `migration_lock.toml` |
| Última migración | `20261003180000_migrate_positions_to_snake_case` |
| Schemas standalone | 11 |
| `VERSION` | 1.39.10 |

> Las 11 migraciones con nombre corto son zona legacy (AGENTS.md §2.4.4): toda migración
> nueva debe usar timestamp completo. No se renombran retroactivamente.

## Decisiones ya tomadas (dueño)

1. **Fuente de verdad:** `provecchio.local` (copia local de provecchio.com). Los `migrate diff`
   y el baseline corren contra esa copia, nunca contra producción.
2. **Standalone:** opción A — chequeo de deriva en CI entre modelos compartidos y core.
   Se eliminan los duplicados exactos (`bookings`/`omnibookings`, `omnicatalog`/`social-catalog`).
3. **`birthday_logs.type`:** se elimina con migración idempotente.
4. **RLS:** se recupera desde `pg_policies` en `provecchio.local` y se versiona la migración.
5. **Columnas con `@map` nuevo:** sin resolver; hay que verificarlas una por una en
   `provecchio.local` antes de decidir entre migración o corrección del schema.

## Gates pendientes (ninguno cumplido aún)

| Gate | Descripción |
|---|---|
| 1 | Baseline capturado |
| 2 | Todas las migraciones aplicadas sin error en `provecchio.local` (base existente con `migrate resolve --applied` y base vacía con `migrate deploy`) |
| 3 | `prisma migrate diff` entre migraciones y schema devuelve vacío |
| 4 | `./scripts/init.sh` en verde |
| 5 | E2E en localhost sobre un respaldo restaurado de producción |

Merge y deploy solo con los cinco gates; el deploy usa `./scripts/deploy-production.sh`
con autorización explícita (AGENTS.md §9) y después se borra la rama.

## Orden de ejecución

Plan 3 (diagrama) y Plan 1 (revisión) en paralelo, junto con el diagnóstico del Plan 0;
baseline después; división del schema (Plan 2) al final.

## Riesgos de despliegue inmediatos

- Desplegar una imagen con `@map("tenant_id")` en seis modelos y con `OmnigastroSettings`
  sin verificar columnas reales: las consultas fallan al arrancar.
- Contexto de build de más de 4,5 GB con `Dockerfile.dev` y un `.dockerignore` de 245 bytes.
- `migrate deploy` con `&&` en el compose de dev (el contenedor no levanta) frente al
  `|| true` del entrypoint de prod (el fallo queda oculto).
- `rsync` del deploy: `--exclude='backups'` / `--exclude='uploads'` sin `/` inicial coinciden
  a cualquier profundidad, incluida `backend/backups` (código).
- `ODOO_PASSWORD` en texto plano en `infra/docker-compose.yml` y `docs/info/files/docker-compose.yml`.

## Estado de `feat/schema-prisma-analysis-v3` (rama de trabajo)

Esa rama contiene la parte de código del trabajo (schema reformateado, `docker-compose.yml`
antiguo, bump de versión a 1.39.9) **y no está fusionada**: fusionarla completa revertiría
`VERSION` a 1.39.9, el `start:prod` (`node dist/main`), el pin de Prisma y los fixes de
deploy a provecchio (servicio Redis, healthchecks, `env_file`).

Solo se promovió la documentación de esta vertical. La parte de código debe retomarse en
ramas dedicadas, una por gate, con su propio PR.
