# Plan de Actualización — v1.41.0 / FEAT-201
## Provisioning OmniGastro → Odoo 14 de pisos (`restaurant.floor`) y mesas (`restaurant.table`)

> **Estado:** 🟡 **PROPUESTO — pendiente de aprobación del usuario** (AGENTS.md Reglas #15 y #16)
> **Fecha:** 2026-10-22 · **Rama base:** `product/omnigastro` (a crear desde `main`) → feature branch `feat/gastro-odoo-floor-provisioning`
> **Bump:** `minor` (1.40.2 → **1.41.0**) — agrega superficie de API nueva (Regla #11)
> **Vertical:** OmniGastro (OmniFlow)

---

## 1. Problema y objetivo

Hoy el flujo de mesas está resuelto **de Odoo hacia OmniGastro**: se listan las mesas del ERP
(`GET /api/omniflow/odoo_tables`) y cada mesa local se **mapea** a una mesa de Odoo mediante
`odooTableId`. La dirección contraria **no existe**: si el restaurante crea un piso o una mesa nueva
en OmniGastro, el salón de Odoo queda desactualizado y el POS del mozo no puede sincronizar la venta
(no hay `restaurant.table` a la cual colgar el `pos.order`).

**Objetivo:** OmniGastro es la fuente de verdad. Crear/actualizar en Odoo 14 los pisos y las mesas que
el restaurante define en OmniGastro, de forma **idempotente**, **sin duplicar** y con capacidad de
**detectar y resolver duplicados** (el incidente de `G2`/`G02` apuntando ambas a `restaurant.table` 40
es el caso de referencia).

### Estado real de Odoo (verificado en producción, solo lectura)

| Piso | `id` | `pos_config_id` | `sequence` | Mesas |
|---|---|---|---|---|
| Giardino | 5 | 2 (Giardino) | 1 | 22 |
| Terraza | 1 | 2 | 2 | 8 |
| Café | 2 | 2 | 3 | 8 |
| Restó | 3 | 2 | 4 | 4 |
| Barra | 4 | 2 | 5 | 4 |

- Pisos **8, 9, 10 y 12** ya están **archivados** (`active = false`) del saneamiento del 2026-10-22.
- `restaurant.table.shape` es **requerido** y acepta **solo `square` y `round`**
  (OmniGastro modela `SQUARE | ROUND | RECT` → **`RECT` debe degradar a `square`**).
- `restaurant.floor` no tiene campo `config_id`: el piso se adjunta escribiendo
  `pos_config_id` (escribir `config.floor_ids` falla con sesión POS abierta — lección del saneamiento).

---

## 2. Alcance

### F0 — Fix rápido de infraestructura (rama aparte, antes de la feature)

| Archivo | Cambio |
|---|---|
| `scripts/deploy-production.sh` (líneas 338, 348, 376) | `http://localhost:3010/...` → `http://127.0.0.1:3010/...` |

**Motivo:** dentro del contenedor `localhost` resuelve primero a IPv6 (`::1`) y la app escucha solo
IPv4. El health check del deploy agotó sus 60 s y emitió una falsa alarma en el deploy de v1.40.2
(§4.1 del `DEPLOY_REPORT_2026-10-22-v1.40.2.md`). Se documenta como troubleshooting **#192**.

**Rama:** `fix/deploy-healthcheck-ipv6-localhost` → PR a `main`.

### F1 — Adapter Odoo (`odoo-adapter/`)

| Endpoint (adapter) | Contrato |
|---|---|
| `GET /api/omniflow/odoo_floors?tenant_id=` | `searchRead('restaurant.floor', ['id','name','pos_config_id','sequence','active'])` + conteo de mesas por piso + **detección de pisos duplicados** (mismo nombre normalizado) |
| `POST /api/omniflow/provision_floor` | Body `{ tenant_id, name, sequence?, pos_config_id? }`. Busca por nombre normalizado **y** `pos_config_id`; si existe lo devuelve (`created:false`). Si no, `restaurant.floor.create({ name, pos_config_id, sequence })`. Devuelve `{ odoo_floor_id, created, active }` |
| `POST /api/omniflow/provision_tables` | Body `{ tenant_id, floor_id, tables: [{ name, seats?, shape? }] }`. Por mesa: busca en ese piso por nombre (incluye archivadas) → **reusa**, **revive** (`write { active: true }`) o **crea** (`restaurant.table.create({ name, floor_id, seats, shape })`). Devuelve `results: [{ name, odoo_id, action: created\|reused\|revived }]` + `errors[]` |

Reglas de implementación:

- **Idempotencia obligatoria:** repetir el provisioning **no** debe crear duplicados.
- **Normalización de nombres:** `trim`, colapso de espacios, comparación case-insensitive
  (`Giardino` = `giardino ` sí; `G2` ≠ `G02` → se reporta como posible duplicado, no se fusiona solo).
- **`shape`:** `ROUND` → `round`; `SQUARE` y `RECT` → `square`.
- **No se requiere sesión POS abierta** para crear pisos/mesas (distinto de escribir `config.floor_ids`).
  Si no hay sesión abierta se devuelve `warning` pero la operación procede.
- **Sin `FORCE`:** el adapter nunca archiva ni borra nada en esta feature. Archivar sigue siendo manual.

### F2 — Backend core (`backend/src/tables/`)

**Schema + migración**

```prisma
model RestaurantFloor {
  // ...
  odooFloorId Int? @map("odoo_floor_id")   // columna NUEVA → snake_case (AGENTS.md §2.4)
  @@unique([tenantId, odooFloorId])         // un piso de Odoo no puede mapearse dos veces
}
```

- Migración `backend/prisma/migrations/20261022190000_restaurant_floors_odoo_floor_id/migration.sql`
  — timestamp completo (§2.4.4), `ALTER TABLE "restaurant_floors" ADD COLUMN odoo_floor_id INTEGER`,
  índice único parcial (`WHERE odoo_floor_id IS NOT NULL`), sin tocar columnas legacy.

**Servicios**

| Archivo | Cambio |
|---|---|
| `backend/src/tables/odoo-tables.service.ts` | `getFloorsSnapshot()`, `provisionFloor()`, `provisionTables()` (mismo patrón `fetch` + `ServiceUnavailableException` que `getTablesSnapshot`) |
| `backend/src/tables/tables.service.ts` | `linkFloorToOdoo(tenantId, floorId, odooFloorId)` (valida unicidad) y provisioning transaccional: crear/reusar piso local ↔ Odoo y escribir `odooTableId` en las mesas |

**Endpoints nuevos del core** (todos con `tables:manage`, JWT/API key — **no** públicos)

| Método | Ruta | Función |
|---|---|---|
| `GET` | `/api/v1/tables/odoo-floors` | Snapshot de pisos de Odoo + conteo de mesas + duplicados detectados + estado de mapeo local |
| `POST` | `/api/v1/tables/odoo-provision/floor` | `{ floorId }` (piso local) → crea/reusa en Odoo y persiste `odooFloorId` |
| `POST` | `/api/v1/tables/odoo-provision/tables` | `{ floorId, tableIds? }` → provisiona las mesas de ese piso sin `odooTableId` y lo persiste |

**Guardas de integridad** (reutilizan lo ya construido en FEAT-200)

- Dos pisos locales no pueden mapear al mismo `odooFloorId` (nuevo).
- Dos mesas locales no pueden mapear al mismo `odooTableId` (ya existe en `PATCH :id/odoo-table`).
- Si el piso local no tiene `odooFloorId`, el provisioning lo crea **o** lo mapea a un piso existente
  elegido por el usuario (nunca por nombre de forma automática y silenciosa).

### F3 — Frontend (`/admin/gastro/tables`)

- Botón **"Sincronizar con Odoo"** (junto a "Nueva mesa") → modal `gastro-odoo-sync-modal.tsx`:
  - Tabla de pisos de Odoo: nombre, `id`, `pos_config`, mesas, estado (`mapeado` / `sin mapear` / `duplicado`).
  - Por piso local: acción **"Crear en Odoo"** o **"Mapear a piso existente"** (selector).
  - Por piso: acción **"Provisionar mesas faltantes"** con resultado por mesa
    (`creada` / `reusada` / `revivida` / `error`).
  - Aviso destacado de **duplicados** (pisos y mesas con nombre repetido) con acción "mapear a existente".
- **Solo tokens de tema** (`theme.useToken()`), prohibido HEX (Regla #10).
- Estados de carga/error explícitos; el modal no bloquea el mapa de salón.

### F4 — Testing

| Tipo | Qué |
|---|---|
| Unit backend | `odoo-tables.service.spec.ts` (mock `fetch`): snapshot de pisos, idempotencia de `provision_floor`, mapeo de `shape` (`RECT`→`square`), errores del adapter (503), `@@unique` de piso |
| Unit adapter | `odoo-adapter/test/provisioning.test.js`: normalización de nombres, revive de mesa archivada, `errors[]` parcial |
| E2E | `frontend/e2e/gastro-odoo-provisioning.spec.ts`: (1) el modal lista pisos de Odoo, (2) piso `E2E-<ts>` se crea en Odoo y se **archiva en el teardown**, (3) provisionar mesas `E2E-*` y verificarlas en `/api/v1/tables/odoo-tables`, (4) segundo run **no duplica** (idempotencia), (5) detección de duplicado con dos mesas homónimas |
| Newman | Actualizar/crear colección en `docs/tests/newman/` con los 3 endpoints del core |
| Regresión | `gastro-tables-crud`, `tables-modal-sync`, `odoo-pos-sync` deben seguir verdes |

> ⚠️ **Autorización requerida:** `./scripts/init.sh` compila todo y corre Jest + Playwright.
> No se ejecutará sin confirmación explícita (Regla #3 de AGENTS.md).

### F5 — Documentación (Reglas #7, #12, #13)

| Archivo | Contenido |
|---|---|
| `docs/plans/omnigastro/flujo-provisioning-pisos-mesas.md` | **Obligatorio (Regla #13):** diagrama Mermaid de secuencia (OmniGastro → Backend → Adapter → Odoo), contratos REST y **hitos de telemetría `t0…tN`** |
| `docs/plans/omnigastro/plan-actualizacion-v1.41.0-floors-provisioning.md` | Este plan, versionado |
| `docs/info/OmniGastro.md` | Sección "Provisioning de pisos y mesas" |
| `docs/troubleshooting/192-*.md` | Healthcheck del deploy con `localhost` → `::1` (F0) |
| `VERSION`, `backend/package.json`, `frontend/package.json`, `mobile/package.json`, `README.md`, `ROADMAP.md`, `docs/ROADMAP.md`, `CHANGELOG.md`, `docs/guides/CHANGELOG.md`, `featurelist.json` | Bump **1.41.0** (11 archivos que valida `check-version-sync.sh`) |
| `/opt/wiki/orderflow/` | Sincronización completa + push |

---

## 3. Impacto y riesgos

| Riesgo | Mitigación |
|---|---|
| Crear pisos/mesas duplicados en el Odoo **productivo** | Idempotencia por nombre normalizado + detección de duplicados previa + E2E con prefijo `E2E-` y teardown de archivado |
| Provisionar mesas en el `pos_config` equivocado | Se usa el `pos_config_id` del piso; si el piso es nuevo se exige `pos_config_id` explícito (por defecto `omnigastro_settings.odoo_pos_config_id`) |
| La sesión POS abierta (`POS/01598`) rechaza cambios | Solo se escriben `restaurant.floor` y `restaurant.table` (nunca `config.floor_ids`) |
| Índice único de `odooFloorId` sobre datos existentes | Todos los pisos actuales tienen `odoo_floor_id = NULL` → índice parcial, sin conflicto |
| Ruptura del flujo actual Odoo → OmniGastro | Los endpoints existentes no se modifican; solo se agregan métodos al servicio |

**Sin cambios** en: `tenantId` (Regla #1), lógica de negocio por `ORDERFLOW_MODE` (Regla #2), endpoints
públicos QR/Bio-Link (Regla #4), ruteo Traefik.

---

## 4. Criterios de aceptación

1. `POST /api/v1/tables/odoo-provision/floor` sobre un piso local nuevo devuelve `created: true` y
   persistir `odooFloorId`; **repetirlo** devuelve `created: false` y **no** crea un segundo piso.
2. `POST /api/v1/tables/odoo-provision/tables` provisiona solo las mesas sin `odooTableId`,
   persiste cada `odooTableId` y **no** toca las ya mapeadas.
3. Una mesa archivada en Odoo con el mismo nombre se **revive** (`active: true`) en vez de duplicarse.
4. `GET /api/v1/tables/odoo-floors` reporta pisos duplicados por nombre y el estado de mapeo local.
5. El modal muestra los 5 pisos productivos y permite mapear/crear sin errores JS en consola.
6. `check-version-sync.sh` → 11/11 en `1.41.0`.
7. Regresión: `gastro-tables-crud`, `tables-modal-sync`, `odoo-pos-sync` verdes.
8. Ningún `pos.order` real ni movimiento de stock generado por las pruebas (solo `restaurant.floor`/
   `restaurant.table`, con teardown).

---

## 5. Secuencia de ejecución propuesta

1. **F0** — rama `fix/deploy-healthcheck-ipv6-localhost` → PR → merge (cierra el falso negativo del deploy).
2. Crear rama de integración **`product/omnigastro`** desde `main` (§2.5).
3. **FEAT-201** en `feat/gastro-odoo-floor-provisioning` (desde `product/omnigastro`):
   F1 adapter → F2 backend + migración → F3 frontend → F4 tests → F5 docs.
4. Validación local (`deploy-local.sh` + E2E) **con autorización**.
5. PR → `product/omnigastro` → merge → PR `product/omnigastro` → `main`.
6. Deploy a `provecchio` **solo con autorización explícita** (§3.1.1 completo: backup → restore local →
   diagnóstico → deploy → verificación → tag `v1.41.0` → wiki).

---

## 6. Fuera de alcance (backlog)

- Archivar/borrar automáticamente pisos o mesas en Odoo (sigue siendo manual, con confirmación).
- Sincronización bidireccional de nombres/posiciones gráficas (`position_h`/`position_v`, `background_image`).
- Cierre de la sesión de rescate `POS/00424` (2025) y decisión sobre `POS/01600` (config 1).
- Validación del ciclo automatizado de backup/restore por SFTP desde `/admin/backups` (§3.1.1.7).
