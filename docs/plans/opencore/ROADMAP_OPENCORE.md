# ROADMAP — OpenCore (Schema Prisma: revisión, división y govierno)

> Vertical: schema core de OrderFlow + 11 schemas standalone.
> Plan maestro de referencia: [`PLAN_MAESTRO.md`](PLAN_MAESTRO.md).
> Análisis verificado: [`Plan_analisis_schema_prisma_v4.md`](Plan_analisis_schema_prisma_v4.md).

---

## Estado global

| Métrica | Valor |
|---|---|
| Gates cumplidos | 0 de 5 |
| Fases iniciadas | 0 |
| `VERSION` en `main` | 1.39.10 (sin cambios de schema en producción) |
| Ramas de trabajo | `feat/schema-prisma-analysis-v3` (código, **no fusionada**), `feat/schema-analysis-v4-docs` (documentación, fusionada) |

---

## Fases

### Fase 0 — Diagnóstico y baseline (FEAT-177) — *bloqueante de todo lo demás*

| # | Entregable | Depende de | Estado |
|---|---|---|---|
| 0.1 | Baseline de `prisma/migrations` contra la base real de `provecchio.local` | — | planned |
| 0.2 | Verificación columna por columna de los `@map` snake_case frente a la reality de la base | 0.1 | planned |
| 0.3 | Confirmación de las 52 `CREATE TABLE` / 15 `CREATE TYPE` frente a 161 modelos / 56 enums | 0.1 | planned |
| 0.4 | Recuperación de las políticas RLS desde `pg_policies` y versionado de la migración | 0.1 | planned |

**Bloqueadores:** requiere acceso de lectura a `provecchio.local`; no se ejecuta contra producción.
**Gate que cierra:** Gate 1 (baseline capturado).

### Fase 1 — Revisión del schema (FEAT-178) — *paralela con la Fase 0*

| # | Entregable | Depende de | Estado |
|---|---|---|---|
| 1.1 | Aislamiento multi-tenant en tres capas (modelos sin `tenantId`, tablas con RLS, accesos con `this.prisma`) | — | planned |
| 1.2 | Auditoría de `Float` (13) y precisión de `Decimal` (nómina, propinas, tipos de cambio, facturación) | — | planned |
| 1.3 | Cruce FK ↔ índices, `unique` faltantes y `onDelete` cascadas | — | planned |
| 1.4 | Inventario de camelCase y mapeo mixto (AGENTS.md §2.4) | 0.2 | planned |
| 1.5 | Validación de `OmnigastroSettings.paymentRouting` (campo `Json` sin estructura) | — | planned |
| 1.6 | Duplicados dentro del core (`BillOfMaterials` vs `ProductBom`/`BomLine`, modelos de caja) | — | planned |

**Entregable:** informe priorizado (crítico / importante / mejora) con migraciones propuestas que
respeten AGENTS.md §2.4. **Gate que cierra:** ninguno por sí sola; alimenta la Fase 3.

### Fase 2 — División del schema por dominios (FEAT-180) — *al final, por diseño*

| # | Entregable | Depende de | Estado |
|---|---|---|---|
| 2.1 | Estructura de directorios: `base.prisma` + `platform/`, `commerce/`, `pos/`, `inventory/`, `crm/`, `hr/`, `fiscal/`, `modules/`, `intel/` | Fase 1, Fase 3 | planned |
| 2.2 | Script de migración del schema único a la nueva estructura | 2.1 | planned |
| 2.3 | Chequeo de deriva en CI entre los modelos compartidos y el core (opción A de standalone) | 2.1 | planned |

**Bloqueador crítico:** mientras exista un único archivo en producción, la división no puede
entrar: cualquier cambio de modelo es un deploy de schema. **Gate que cierra:** Gate 3
(`prisma migrate diff` vacío).

### Fase 3 — Diagrama de relaciones y acoplamiento (FEAT-179) — *punto de partida, riesgo bajo*

| # | Entregable | Depende de | Estado |
|---|---|---|---|
| 3.1 | `prisma validate` + `prisma format` sobre core y los 11 standalone | — | planned |
| 3.2 | Parseo y asignación de dominios con el mapa de la Fase 2 | 3.1 | planned |
| 3.3 | Nivel 1: mapa de dominios con relaciones cruzadas ponderadas | 3.2 | planned |
| 3.4 | Nivel 1b: core vs standalone (modelos compartidos, bases separadas, canales) | 3.2 | planned |
| 3.5 | Niveles 2 y 3: un diagrama por dominio + flujos clave (`Order → Payment → ElectronicDocument → StockMove`, `Employee → Attendance → Payroll`) | 3.3 | planned |
| 3.6 | Métricas de acoplamiento y candidatos a extracción bloqueados por dependencias | 3.5 | planned |

**Entregable:** diagrama de dominios, vista core vs standalone, diagramas por dominio y tabla
de acoplamiento. **Gate que cierra:** ninguno (habilita la Fase 2).

### Fase 4 — Standalone, RLS y limpieza (FEAT-181)

| # | Entregable | Depende de | Estado |
|---|---|---|---|
| 4.1 | Eliminar duplicados exactos: `bookings`/`omnibookings`, `omnicatalog`/`social-catalog` | Fase 0, Fase 1 | planned |
| 4.2 | Eliminar `birthday_logs.type` con migración idempotente | Fase 0 | planned |
| 4.3 | Versionar la migración de RLS recuperada de `pg_policies` | 0.4 | planned |
| 4.4 | Rotar `ODOO_PASSWORD` y sacarlo de `infra/docker-compose.yml` y `docs/info/files/docker-compose.yml` | — | planned |

### Fase 5 — Gates de salida (FEAT-182)

| Gate | Descripción | Estado |
|---|---|---|
| 1 | Baseline capturado | pending |
| 2 | Migraciones aplicadas sin error en `provecchio.local` (base existente con `migrate resolve --applied` + base vacía con `migrate deploy`) | pending |
| 3 | `prisma migrate diff` entre migraciones y schema devuelve vacío | pending |
| 4 | `./scripts/init.sh` en verde | pending |
| 5 | E2E en localhost sobre un respaldo restaurado de producción | pending |

**Merge y deploy** solo con los cinco gates, con autorización explícita del usuario
(AGENTS.md §9) y usando `./scripts/deploy-production.sh`. Después se borra la rama.

---

## Línea de tiempo estimada

No hay fechas comprometidas: la Fase 0 depende de acceso a `provecchio.local` y la Fase 2
depende de la Fase 1 y de la Fase 3. El orden de ejecución vigente es
**Fase 3 + Fase 1 en paralelo → baseline (Fase 0) → Fase 4 → Fase 2 → Fase 5**.

## Bloqueadores transversales

| Bloqueador | Impacto | Mitigación |
|---|---|---|
| Contexto de build > 4,5 GB con `Dockerfile.dev` | Builds de schema largos y frágiles en el servidor | Ampliar `.dockerignore` sin excluir `backend/backups` ni `migrations/**/*.sql` |
| `migrate deploy` con `&&` en dev vs `|| true` en prod | Fallos silenciosos o contenedores que no levantan | Unificar el comportamiento de arranque antes de tocar migraciones |
| `rsync` del deploy con `--exclude` sin `/` inicial | Puede excluir `backend/backups` (código) | Anclar los excludes con `/` inicial |
| `11` migraciones heredadas con nombre de carpeta corto | Orden de aplicación ambiguo (AGENTS.md §2.4.4) | No renombrar en retroactivo; todo nombre nuevo con timestamp completo |
