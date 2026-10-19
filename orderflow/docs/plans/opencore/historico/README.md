# Historico de la vertical OpenCore

Registro del trabajo del "analisis y refactor del schema Prisma" que **no** llego a
`main` de forma directa, junto con el punto exacto donde queda archivado cada
pieza para poder recuperarla de forma controlada.

Contexto: la rama original de analisis fue revisada commit a commit y se
decidio separar la parte documental (segura, fusionada) del codigo (peligroso,
revisado aparte). Este documento deja constancia de lo que se descarto y de
como recuperarlo.

---

## 1. Trabajo fusionado en `main` (documentacion)

| Artefacto | Ubicacion en `main` | PR |
|---|---|---|
| Plan de analisis del schema v4 | `docs/plans/opencore/Plan_analisis_schema_prisma_v4.md` | #2 |
| Plan 2 - Schema splitting | `docs/plans/opencore/PLAN_2_SCHEMA_SPLITTING_SUMMARY.md` | #2 |
| Project status report | `docs/plans/opencore/PROJECT_STATUS_REPORT.md` | #2 |
| Deployment plan | `docs/plans/opencore/DEPLOYMENT_PLAN.md` | #2 |
| Diagrama de arquitectura backend | `backend/README_DIAGRAM.md` | #2 |
| Backlog de 9 bugs del cliente | `docs/plans/omnigastro/BACKLOG_CLIENTE_20261019.md` | #3 |
| Roadmap, plan maestro y auditoria | `docs/plans/opencore/{ROADMAP_OPENCORE.md,PLAN_MAESTRO.md,AUDITORIA_OPENCORE_20261019.md}` | #2 |

FEAT-177..FEAT-182 (OpenCore) y FEAT-183 (backlog OmniGastro) quedaron
registradas en `planned`.

---

## 2. Trabajo archivado (recuperable, NO fusionado)

### 2.1 `archive/schema-prisma-analysis-v3`

Etiqueta sobre `dac41b1f` (rama `feat/schema-prisma-analysis-v3`).

Contiene:

- La **reescritura completa de `backend/prisma/schema.prisma`** (2150 lineas
  modificadas): es el trabajo real de OpenCore y la unica pieza con valor
  tecnico pendiente.
- La documentacion v4, ya fusionada en `main` via PR #2.
- Un bump de version a `1.39.9` **rechazado** (la version vigente es `1.39.10`).
- Regresiones en `docker-compose.yml` (sin Redis, sin healthchecks, sin
  `env_file`) y en el runtime del backend (`start:prod` apuntando a
  `node dist/src/main`, pin de Prisma alterado).

Recuperacion controlada (nunca un merge directo):

```bash
git checkout archive/schema-prisma-analysis-v3
git diff main...archive/schema-prisma-analysis-v3 -- backend/prisma/schema.prisma
# extraer solo el schema y aplicarlo sobre main en un commit aislado
```

### 2.2 `archive/remove-legacy-schema-c872c1d5`

Etiqueta en el clon de trabajo `/opt/orderflow-branch-schema-prisma` sobre
`c872c1d5`. Commit **destructivo rechazado**: borra `backend/prisma/schema.prisma`,
las 38 migraciones historicas, las 4 migraciones RLS, los seeds y la extension
`soft-delete`, y agrega el log basura `backend/ters`. Deja `backend/prisma/`
vacio, por lo que el backend no compila (Prisma Client sin schema).

No fusionar. Solo se conserva como evidencia del intento.

### 2.3 Rama `staging` (30 commits, conservada)

`origin/staging` **no** es mergeable con `main`: arrastra 132.556 lineas
eliminadas que borrarian el nucleo del OrderFlow. Se conserva sin tocar por
contenido propio de la vertical, pero queda fuera de la integracion.

---

## 3. Reglas aplicadas en esta limpieza

1. Nada se fusiona a ciegas: cada commit se reviso y se clasifico en
   *documentacion segura* / *codigo a revisar* / *destructivo*.
2. Todo lo descartado queda etiquetado (`archive/*`) para no perder trabajo.
3. La version del repositorio no se toco: `1.39.10`. `1.40.0` queda reservado
   para Tauri Desktop & OmnIoT Edge.
4. La reescritura del schema se retomara en la rama de trabajo de OpenCore,
   con migraciones propias y validacion de `prisma migrate diff` antes de
   cualquier deploy.
