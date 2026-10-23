# Auditoría FEAT-201 — Provisioning de pisos y mesas OmniGastro → Odoo 14

> **Fecha:** 2026-10-22 · **Versión:** 1.41.0 · **Rama:** `feat/gastro-odoo-floor-provisioning`
> **Entorno de validación:** localhost (`provecchio.local`) con datos restaurados de producción
> **Estado:** ✅ Desplegado en `provecchio.com` (1.41.0) + fix de POS 1.41.1

---

## 1. Alcance verificado

| Capa | Artefacto | Estado |
|---|---|---|
| Schema | `restaurant_floors.odoo_floor_id` + índice único `(tenantId, odoo_floor_id)` | ✅ migración `20261022190000_restaurant_floors_odoo_floor_id` aplicada |
| Backend | `OdooTablesService` (`getFloorsSnapshot`, `provisionFloor`, `provisionTables`) | ✅ |
| Backend | `TablesService` (`getFloorById`, `linkFloorToOdoo`, `listUnmappedTables`) | ✅ |
| Backend | `TablesController` — `GET odoo-floors`, `POST odoo-provision/floor`, `POST odoo-provision/tables` | ✅ |
| Adapter | `GET /api/omniflow/odoo_floors`, `POST provision_floor`, `POST provision_tables` + `src/normalize.js` | ✅ |
| Frontend | `GastroOdooSyncModal` + botón “Sincronizar con Odoo” en `/admin/gastro/tables` | ✅ |

## 2. Pruebas unitarias

| Suite | Casos | Resultado |
|---|---|---|
| `backend/src/tables/odoo-tables.service.spec.ts` | 12 | ✅ 12/12 |
| `odoo-adapter/test/provisioning.test.js` (`npm test`) | 3 | ✅ 3/3 |
| Suite completa backend (vía `deploy-local.sh`) | 136 suites / 1032 tests | ✅ 1032/1032 |
| `tsc --noEmit` backend + frontend | — | ✅ sin errores |

Cobertura de los casos backend: contrato del snapshot, exigencia de `tenantId`, idempotencia
(`created:false` en la segunda llamada), rechazo de nombre vacío **sin** llamar al adapter,
traducción `4xx → 400 BadRequest` y `5xx/red → 503 ServiceUnavailable`, mapeo de
`created/reused/revived` y de `errors[]` por mesa.

## 3. Pruebas E2E (Playwright 1.61.1, chromium, `ignoreHTTPSErrors`)

Archivo: `frontend/e2e/gastro-odoo-provisioning.spec.ts`
Comando:

```bash
PLAYWRIGHT_BASE_URL=https://provecchio.local \
PLAYWRIGHT_API_URL=http://localhost:3010 \
E2E_ODOO_PROVISIONING=1 \
npx playwright test e2e/gastro-odoo-provisioning.spec.ts
```

| # | Test | Resultado |
|---|---|---|
| 1 | `GET /tables/odoo-floors` devuelve el contrato esperado (floors, duplicates, localFloors, mappedOdooFloorIds) | ✅ |
| 2 | UI: el botón “Sincronizar con Odoo” abre el modal y muestra ambos paneles | ✅ |
| 3 | Crea piso local, lo provisiona **dos veces** y no duplica (mismo `odooFloorId`, `created:false`, mapeo persistido) | ✅ |
| 4 | Provisiona las mesas del piso y persiste `odooTableId`; el reintento **no** vuelve a tocar la mesa mapeada | ✅ |
| 5 | Rechaza mapear dos pisos locales al mismo piso de Odoo (`400`, mensaje “ya está…”) | ✅ |

**Resultado: 5/5 passed (8.0 s).**

> Los tests de escritura crean registros reales en el Odoo **local**. El piso se llama
> `E2E QA Piso` de forma determinista, de modo que cada corrida **reutiliza** el mismo
> `restaurant.floor` (idempotencia) en lugar de acumular basura en el ERP. Las mesas llevan sufijo
> temporal y se eliminan de la DB local en `afterAll` (la mesa en Odoo se reutiliza en la corrida
> siguiente). Sin `E2E_ODOO_PROVISIONING=1` sólo corren los tests de lectura (1 y 2).

## 4. Protocolo §3.1.1 (deploy-to-local-first)

| Paso | Resultado |
|---|---|
| 1. Backup de producción (`backup-production.sh provecchio`) | ✅ `pre_deploy_provecchio_20261022_203557.sql` (2.25 MB) + `_uploads.tar.gz` (28.9 MB) |
| 2. Restore en localhost (`restore-provecchio.sh`) | ✅ 168 tablas, 1 tenant, 7 empleados, 4 cajas; migraciones al día |
| 3. `deploy-local.sh` | ✅ versiones 13/13, prisma generate, build backend/frontend, `tsc`, **1032 tests**, health `1.41.0` |
| 3.1 Persistencia tras `docker compose down` + `up -d` | ✅ conteos idénticos (1 tenant, 19 mesas, 226 productos, 30 pedidos, 6 pisos, 76 migraciones); `odoo_floor_id` presente; frontend 200 |
| 4. E2E FEAT-201 con datos reales | ✅ 5/5 |
| 5. Deploy a `provecchio.com` | ⏳ pendiente |

## 5. Hallazgos y correcciones durante la validación

1. **El contenedor local del adapter no tenía los endpoints nuevos.** `docker-compose.yml` monta
   `./odoo-adapter:/app`, pero `node src/index.js` no recarga: el primer E2E devolvió `503` en el
   snapshot y falló la creación del piso. **Solución:** `docker restart orderflow_odoo_adapter`.
   Para futuros cambios del adapter en local, el restart es obligatorio (el `deploy-local.sh` no lo
   recrea).
2. **`fullyParallel` rompía la dependencia entre tests de escritura.** El piso provisionado se
   guardaba en una variable de módulo, pero cada test corría en un worker distinto → 2 tests
   quedaban *skipped* silenciosamente. **Solución:** `test.describe.serial`, con lo que los 5 casos
   se ejecutan realmente.
3. **Nombres deterministas para no contaminar Odoo.** El nombre del piso pasó de `E2E Piso <ts>` a
   `E2E QA Piso` para que el adapter lo reutilice entre corridas.

## 5.1 Verificación en producción (1.41.0) y fix 1.41.1

Tras el deploy de 1.41.0 a `provecchio.com` (health `1.41.0`, 76 migraciones, `odoo_floor_id`
presente, QA E2E post-deploy OK), el smoke de `GET /api/v1/tables/odoo-floors` contra el Odoo real
reveló **dos defectos**:

1. **Incidente de datos:** las corridas E2E de escritura en localhost habían creado dos pisos de
   prueba (`E2E Piso 946311` #13 y `E2E QA Piso` #14) y una mesa en el **Odoo de producción**,
   porque el adapter local usa las credenciales del tenant restaurado (`ODOO_HOST=192.168.69.246`,
   `ODOO_DB=prod`). Se eliminaron por XML-RPC verificando antes que no tuvieran `pos.order`
   asociados. Documentado en `docs/troubleshooting/195`.
2. **Defecto funcional:** los pisos creados quedaban con `pos_config_id = false`, por lo que **no
   aparecían en el POS del mozo**. Corregido en **1.41.1**:
   - adapter: infiere el POS más usado (`pickDefaultPosConfigId`) cuando no se envía, y **repara**
     pisos huérfanos (`repaired: true`);
   - backend: `ProvisionFloorResult` expone `posConfigId` y `repaired`;
   - frontend: selector **“POS destino”** en el modal;
   - tests: 13 casos backend + 5 del adapter.

## 5.2 Deploy de 1.41.1 (fix de POS) — incidente operativo

El deploy de 1.41.1 se interrumpió por un corte de la sesión SSH (relay `38.52.135.227`) en medio del
build, dejando `provecchio.com` en **502** durante ~20 minutos y un contenedor huérfano reteniendo el
puerto 3010. Se recuperó con un rebuild desacoplado (`nohup setsid`), eliminando el huérfano y
levantando el stack. Detalle completo en `docs/troubleshooting/196`.

**Estado final verificado en producción (1.41.1):**

| Check | Resultado |
|---|---|
| `GET /api/v1/health` | `1.41.1` · `database:ok` · `odoo_adapter:ok` |
| Frontend | `200` |
| Contenedores núcleo | `backend`, `frontend`, `db`, `redis`, `odoo_adapter` → healthy |
| Migraciones | 76 aplicadas (sin pendientes) |
| Datos | 1 tenant · 18 mesas · 226 productos · 30 pedidos · 2 pisos locales |
| Bundle con fix | `assets/gastro-tables-CJcMX5bx.js` contiene “POS destino” |
| Snapshot Odoo | 5 pisos activos, **todos con `posConfigId=2`**; 6 archivados (incluye `QA POS Check (archivado)` #15) |
| QA post-deploy | `qa_e2e_check.py https://provecchio.com` → ✅ catálogo, dominio sin errores JS, 8 módulos admin, auth/DB sin 500 |

**Pendiente operativo:** el piso de prueba #15 (`QA POS Check (archivado)`) no se pudo borrar porque
Odoo rechaza `unlink` con una sesión POS abierta. Borrarlo cuando no haya sesión (ver anexo de
troubleshooting #195).

## 6. Riesgos residuales

- El E2E de escritura está **opt-in** (`E2E_ODOO_PROVISIONING=1`); en CI por defecto sólo corre la
  lectura. Decisión deliberada para no escribir en el Odoo compartido.
- No se probó el flujo contra el Odoo **de producción** desde localhost (el adapter local apunta al
  Odoo local). La verificación en `provecchio.com` tras el deploy es el paso que falta.
- La telemetría `t0…t8` está **declarada** en `flujo-provisioning-pisos-mesas.md` y expuesta vía
  `fetchedAt` / `results[].action`; la instrumentación de métricas queda como deuda técnica.

## 7. Referencias

- Plan: `docs/plans/omnigastro/plan-actualizacion-v1.41.0-floors-provisioning.md`
- Flujo + telemetría: `docs/plans/omnigastro/flujo-provisioning-pisos-mesas.md`
- Changelog: `CHANGELOG.md` → `## [1.41.0]`
- Doc funcional: `docs/info/OmniGastro.md` → sección v1.41.0
