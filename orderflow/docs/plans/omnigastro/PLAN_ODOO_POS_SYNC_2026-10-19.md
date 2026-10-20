# Plan de actualización — Sincronización OrderFlow → Odoo 14 POS (bug #7 del reporte del cliente)

> **Vertical:** OmniGastro · **Fecha:** 2026-10-19 · **Versión objetivo:** `1.39.11` (patch: la
> vertical no amplía la superficie de API del core, solo corrige la integración existente)
> **Origen:** punto 7 del reporte del cliente sobre `https://provecchio.com` (v1.39.9),
> recuperado en [`BACKLOG_CLIENTE_20261019.md`](./BACKLOG_CLIENTE_20261019.md)
> **Estado del plan:** 🟡 En ejecución — Fase 0-4 completadas en código (v1.39.11), Fase 5 pendiente
> de autorización (barrera `init.sh`, deploy y verificación en producción)
> **Diagrama del flujo y telemetría:** [`flujo_odoo-pos-sync.md`](./flujo_odoo-pos-sync.md)

---

## 1. Contexto y alcance

**Reporte del cliente (punto 7):**

> When a server closes a table's bill via their POS interface and sends it to the cash register, the
> order **is not loaded into the Odoo 14 POS** (`http://192.168.69.246:8081/pos/ui?config_id=2`).
> The option for a server to process payments should be optional and configurable via the settings.

**Fuera de alcance de este plan** (tracked en el backlog del cliente, FEAT-183): puntos 1, 2a, 2b, 3,
4, 5, 6, 8a, 8b y 9. El punto 7 se atiende aquí porque requiere una cadena de 4 saltos
(OrderFlow → BullMQ → odoo-adapter → Odoo 14) y 4 defectos independientes.

**Hipótesis a verificar (del reporte):** *"el problema con Odoo puede estar relacionado con que el
contenedor del sincronizador esté detenido"*. → **Descartada**: en producción
`orderflow_sync_standalone` está `Up (healthy)`; el fallo es de contrato, no de disponibilidad.

---

## 2. Diagnóstico: la cadena verificada, salto por salto

```
OrderFlow (POS mozo / QR mesa)
   └─(1) emit 'odoo.table_order_sync'      backend/src/orders/orders.service.ts:1055
      └─(2) OdooTableSyncListener            backend/src/orders/odoo-table-sync.listener.ts
         └─(3) BullMQ 'odoo-table-sync'     backend/src/queues/odoo-table-sync.producer.ts
            └─(4) OdooTableSyncProcessor    backend/src/queues/odoo-table-sync.processor.ts
               └─(5) POST odoo_adapter:3005/api/omniflow/sync_table_order
                  └─(6) XML-RPC/JSON-RPC → Odoo 14 · addon pos_omniflow_sync
                     └─(7) create pos.order (draft) en la sesión POS de Odoo
```

### 2.1 Evidencia recolectada

| # | Comprobación | Resultado |
|---|---|---|
| E1 | Registro `integrations` (ODOO, activo) del tenant `provecchio-dimora-001` | `{"host":"192.168.69.246","port":8081,"database":"prod","username":"soporte@crossnexion.com",...}` → **correcto** (idéntico en local y prod) |
| E2 | Autenticación XML-RPC contra `192.168.69.246:8081` con `db=prod` | `uid=2` (Administrator) → **correcto** |
| E3 | `ODOO_DB` del `odoo-adapter` (env) | `wellnesscoffee` → **la base no existe** (la única de negocio es `prod`) → los plugins por env fallan |
| E4 | `ODOO_POS_CONFIG_ID` / `ODOO_TABLE_ID` del backend | `2` (Giardino, coincide con `config_id=2` del cliente) / `0` (sin mapeo de mesa) |
| E5 | Sesiones POS abiertas en Odoo | `1594` → config 2 (Giardino) · `1593` → config 1 (Di Mora) — ambas `opened` |
| E6 | `pos.order` con `pos_reference like 'OmniFlow'` en toda la DB `prod` | **0 registros** → la cadena **nunca** funcionó (no es una regresión de v1.39.x) |
| E7 | `restaurant.table` en Odoo | T1–T5, C1–C6, R1–R7, B1–B6, D1–D6, L1–L6, **G1 (25)**, **G2 (40)** → **G5 no existe en Odoo** |
| E8 | Tablas en OrderFlow (`restaurant_tables`) | Mesa G2…G10, M01, Giardino — **sin columna de mapeo a Odoo** |
| E9 | `POST /api/omniflow/sync_table_order` con el payload real del backend (`odoo_table_id:"G5"`) | **HTTP 500** → `invalid literal for int() with base 10: 'G5'` |
| E10 | El mismo endpoint con `odoo_table_id:25` (G1, numérico) y `odoo_config_id:2` | **HTTP 500** → `Model: Point of Sale Orders (pos.order), Field: Taxes (amount_tax)` |
| E11 | Creación directa por XML-RPC de `pos.order` (mismos campos, sin el addon) | **HTTP 500** → mismo error de `amount_tax` → el defecto es del **modelo Odoo**, no del payload |
| E12 | Definición en Odoo 14 (`point_of_sale/models/pos_order.py:220`) | `amount_tax = fields.Float('Taxes', digits=0, readonly=True, required=True)` → `required=True`, `store=True`, `readonly=True`, **sin `compute`** → el campo nunca se rellena en `create` |
| E13 | Flujo "cerrar mesa / enviar a caja" | **no emite** `odoo.table_order_sync` (el único emit está en *enviar a cocina*, `orders.service.ts:1055`) |
| E14 | `TableSyncWorker` del adapter (`redis.lpop('odoo-table-sync')`) | **camino muerto**: el backend usa BullMQ (`bull:odoo-table-sync`), nunca escribe en la lista plana |
| E15 | Contenedores en producción | `orderflow_sync_standalone` `Up (healthy)`, `orderflow_odoo_adapter` `Up (healthy)` → hipótesis de parada **descartada** |
| E16 | Logs del backend de producción | 0 coincidencias de `Encolado TableOrderSyncJob` en las últimas 4 h (no hubo pedidos enviados a cocina en esa ventana) |

### 2.2 Defectos raíz

| ID | Defecto | Ubicación | Severidad |
|---|---|---|---|
| **D1** | Se envía `odooTableId = dto.tableNumber` (p. ej. `"G5"`) donde Odoo espera el **id numérico** de `restaurant.table` → `int("G5")` revienta | `backend/src/orders/orders.service.ts:1055` + `odoo-table-sync.listener.ts` | 🔴 Crítico |
| **D2** | No existe **mapeo** OrderFlow `restaurant_tables` ↔ Odoo `restaurant.table` (ni columna, ni tabla puente) | `backend/prisma/schema.prisma` (modelo `RestaurantTable`) | 🔴 Crítico |
| **D3** | `pos.order.amount_tax` es `required=True` sin `compute` en el Odoo 14 desplegado → **ningún `pos.order` puede crearse por RPC** | Host Odoo `192.168.69.246` → `odoo_web_8081` (`point_of_sale/models/pos_order.py:220`) | 🔴 Crítico (bloquea la cadena completa) |
| **D4** | El flujo de **cierre de mesa / envío a caja** no dispara el sync a Odoo (solo "enviar a cocina") | `backend/src/orders/orders.service.ts` | 🟠 Alto |
| **D5** | `ODOO_DB=wellnesscoffee` (base inexistente) en el env del adapter, en local y en producción | `docker-compose.yml` (local) + compose de producción | 🟠 Alto (plugins por env) |
| **D6** | `TableSyncWorker` del adapter es un camino muerto que compite por el nombre de la cola | `odoo-adapter/src/workers/table-sync-worker.js` | 🟡 Medio |
| **D7** | Sin telemetría: los fallos del sync no se ven (solo `logger.error` disperso); el `pos.order` creado no se vincula de forma trazable | backend + adapter | 🟡 Medio |

> **D3 es el hallazgo crítico**: aunque se arreglaran D1, D2, D4 y D5, la creación del `pos.order`
> seguiría fallando por el modelo del ERP. Es un defecto **del lado Odoo**, fuera del código de
> OrderFlow, y requiere un parche en el host del ERP (o un addon que lo neutralize).

---

## 3. Alcance por feature

| FEAT | Título | D defects | Módulo | Depende de |
|---|---|---|---|---|
| **FEAT-184** | Mapeo de mesas OrderFlow ↔ Odoo (`restaurantTable.odooTableId` + validación de sesión POS abierta) | D1, D2 | `backend/prisma/schema.prisma`, `backend/src/gastro/`, `backend/src/orders/odoo-table-sync.listener.ts` | — |
| **FEAT-185** | Parche Odoo: `pos.order` creable por RPC (`amount_tax` computed) + prueba de contrato del addon | D3 | Host Odoo `192.168.69.246` (`odoo_web_8081`) + `odoo-adapter` | — |
| **FEAT-186** | Disparo del sync a Odoo en **cierre de mesa / envío a caja** (idempotente) | D4 | `backend/src/orders/orders.service.ts` | FEAT-184, FEAT-185 |
| **FEAT-187** | Unificación de la config del adapter y limpieza del worker legacy | D5, D6 | `docker-compose.yml`, `docker-compose.provecchio.yml`, `.env.provecchio`, `odoo-adapter/src/workers/` | — |
| **FEAT-188** | Telemetría y E2E del sync a Odoo POS (métricas t0…tN + Playwright) | D7 | backend + `frontend/e2e/` | FEAT-184…187 |

### 3.1 Criterios de aceptación por FEAT

**FEAT-184 — Mapeo de mesas**
- [ ] Nueva columna `odooTableId` (Int, nullable) en `RestaurantTable` + migración `YYYYMMDDHHMMSS_odoo_table_mapping`
  (snake_case, `@map("odoo_table_id")` — AGENTS.md §2.4).
- [ ] CRUD de mesas en `/admin/gastro/tables` (bug 8a del backlog) permite **editar y borrar**, y ahora también
  asignar/limpiar el `odooTableId` con validación contra Odoo.
- [ ] `OdooTableSyncListener` usa `odooTableId` numérico de la mesa; si falta, **no** encola y deja traza
  clara (nunca envía el número de mesa como id de Odoo).
- [ ] Validación: el `odooTableId` debe pertenecer a un `pos.config` con sesión POS abierta
  (consulta al adapter / endpoint de diagnóstico).

**FEAT-185 — Parche Odoo**
- [ ] Addon `pos_omniflow_sync` (o parche de `point_of_sale`) que hace `amount_tax` computable en `create`
  (p. ej. `amount_tax = fields.Float(..., compute='_compute_amount', store=True)` vía addon, sin tocar el core
  de Odoo; o `required=False` si el ERP no usa el campo).
- [ ] Reinicio del contenedor `odoo_web_8081` y confirmación de que el modelo actualizado quedó cargado.
- [ ] Prueba de contrato: `create pos.order` por XML-RPC con `session_id`, `table_id`, `state='draft'` y líneas
  → **200** y `odoo_order_id` devuelto; el registro de prueba se elimina al final.
- [ ] `pos_omniflow_sync` debe **reutilizar** el `pos.order` en draft de la misma mesa y sesión (evita duplicados).

**FEAT-186 — Cierre de mesa / envío a caja**
- [ ] El flujo de cierre de cuenta emite `odoo.table_order_sync` (o un evento equivalente) con el `odooTableId`
  real de la mesa.
- [ ] Idempotencia: reenviar el mismo pedido no duplica el `pos.order` en Odoo (clave: `order_uuid`).
- [ ] El "pago del mozo" queda **configurable** (setting por tenant): `gastroSettings.waiterCanCollectPayment`
  (por defecto `false` en Provecchio: "todo se manages desde la caja").

**FEAT-187 — Config y worker legacy**
- [ ] `ODOO_DB=prod` en el compose local **y** en el de producción (paridad; requiere deploy autorizado).
- [ ] `ODOO_POS_CONFIG_ID=2` explícito en ambos entornos (hoy implícito por default `1` en el backend).
- [ ] `TableSyncWorker` (camino muerto) eliminado o renombrado a cola propia (`redis-odoo-table-sync`) para que
  no compita con BullMQ.
- [ ] `ODOO_ADAPTER_URL` del backend apunta al nombre real del contenedor en cada entorno
  (local `odoo_adapter:3005`; prod `orderflow_odoo_adapter:3005`).

**FEAT-188 — Telemetría y E2E**
- [ ] Hitos `t0`…`tN` guardados en la.metadata del pedido con la nomenclatura de
      [`flujo_odoo-pos-sync.md`](./flujo_odoo-pos-sync.md) (§13 de AGENTS.md).
- [ ] Métricas Prometheus: `odoo_sync_enqueued_total`, `odoo_sync_success_total`, `odoo_sync_failed_total`,
      `odoo_sync_duration_seconds`.
- [ ] Alerta: fallo de sync por tenant → notificación a superadmin.
- [ ] Test Playwright `frontend/e2e/odoo-pos-sync.spec.ts`: pedido desde QR → cocina → cierre → verificación de
      el `pos.order` en Odoo (vía endpoint de diagnóstico) y cleanup.

---

## 4. Checklist de progreso

### Fase 0 — Replicación y contención (sin tocar producción)

- [x] E1–E16 recolectados y documentados en este plan
- [x] Tests reproducibles contra el adapter local (E9/E10) y creación directa en Odoo (E11)
- [x] Confirmado que la cadena **nunca** funcionó (E6: 0 pedidos `OmniFlow-*`)
- [x] Hipótesis "contenedor del sincronizador detenido" **descartada** (E15)
- [x] Snapshot de `acme.json`, `odoo.conf` y addons del host Odoo antes de tocar D3
      (backups en `/opt/odoo/backups/`: `pos_omniflow_sync_20261019_210937.tar.gz` = versión original)
- [x] Ventana de mantenimiento acordada con el cliente para el reinicio de `odoo_web_8081`
      (reinicio ejecutado a las 00:12 y 00:15; el POS volvió a vender con normalidad)

### Fase 1 — Lado Odoo (desbloquea todo lo demás)

- [x] Backup de `/opt/odoo/addons/pos_omniflow_sync` y del `odoo.conf`
- [x] Addon/parche que hace `amount_tax` computable (o `required=False`)
      → el addon `pos_omniflow_sync` aporta los importes y recalcula con
      `_compute_batch_amount_all()`; **el core de Odoo no se toca**
- [x] `docker restart odoo_web_8081` + verificación de que el POS sigue operando
      (venta real registrada a las 00:19:53 por `create_from_ui`)
- [x] Prueba de contrato: `pos.order` por RPC → 200
      (`odoo-adapter/test-pos-order-contract.js`: caso A reproduce el fallo, caso B crea el pedido)
- [x] Regresión: los pedidos del POS (venta normal) siguen funcionando tras el reinicio
- [x] Segundo defecto encontrado y corregido en el mismo parche: `pos.order.line.price_subtotal`
      y `price_subtotal_incl` también son `required=True` sin `compute` (D3-bis)
- [x] Corregida la notificación al bus, que usaba APIs de Odoo 18/19 inexistentes en Odoo 14
      (`_get_bus_channel_name` / `_sendone` → `sendone` best-effort)

### Fase 2 — Mapeo de mesas (OrderFlow)

- [x] Migración `odoo_table_id` (snake_case + `@map`) — `20261019233000_odoo_pos_sync_mapping`
- [x] `RestaurantTable.odooTableId` + DTO/validación
- [x] UI `/admin/gastro/tables`: editar/borrar (bug 8a) + selector de mesa Odoo
- [x] Script de correspondencia inicial: `backend/prisma/seed-odoo-table-mapping.ts`
      (empareja por nombre; **Odoo no tiene G5** → queda sin mapear hasta que el
      cliente cree la mesa en el ERP o renombre la de OrderFlow)
- [x] `OdooTableSyncListener` usa el id numérico y valida sesión POS abierta
- [x] `pos.config` de Odoo configurable por tenant (`odoo_pos_config_id`)

### Fase 3 — Flujo de cierre de mesa y settings

- [x] Emitir el sync desde el cierre de cuenta / envío a caja (`trigger=TABLE_CLOSED`)
- [x] Idempotencia por `order_uuid` (`pos_reference = "OmniFlow-<uuid>"` + reutilización
      del borrador de la mesa y la sesión)
- [x] Setting `waiterCanCollectPayment` (por tenant) + impacto en la UI del mozo

### Fase 4 — Config, telemetría y E2E

- [x] `ODOO_DB=prod` y `ODOO_POS_CONFIG_ID=2` parametrizados
- [x] Limpieza del worker legacy del adapter (`TableSyncWorker` eliminado)
- [x] Hitos `t0…tN` + métricas Prometheus + error de sync por tenant
- [x] Playwright `odoo-pos-sync.spec.ts`
- [x] Actualizar colección Newman (AGENTS.md §3.3): contrato `/api/omniflow/sync_table_order`
      + diagnóstico de mesas + opciones de cobro
- [x] **D8**: `BullModule` nunca conectaba (`REDIS_HOST` inexistente → `localhost:6379`
      = el propio contenedor) → el job **nunca se encolaba**. Ahora la conexión se
      deriva de `REDIS_URL`. Afecta a todas las colas (webhooks, follow-up, KDS, sync)
- [x] **D9**: el volumen anónimo `/app/node_modules` tapaba el `node_modules` de la
      imagen → Prisma Client viejo en runtime. Volumen eliminado + `ARG CACHE_BUST`
      en el Dockerfile (el deploy lo inyecta con la versión)
- [x] **D10**: la tabla `omnigastro_settings` **no existe ni en producción**
      (167 tablas en el dump, sin ella) → la migración la crea de forma idempotente
- [x] `scripts/backup-production.sh`: resolución dinámica del contenedor de BD
      (fallaba con "service 'database' is not running")
- [x] El adapter deja de reportar `success: true` cuando el addon devuelve
      `status: error` (BullMQ no reintentaba y la métrica contaba un fallo como acierto)

### Fase 5 — Barrera, release y despliegue

- [ ] `./scripts/init.sh` en verde (127 suites / 940 tests + QA) — **requiere autorización**
- [x] Versión `1.39.10` → `1.39.11` en `VERSION`, `package.json` (backend/frontend), `featurelist.json`,
      `CHANGELOG.md`, `ROADMAP.md`, `README.md`, `docs/timeline.md`, `backend/src/main.ts` y manifiestos
      (`scripts/check-version-sync.sh` → 9/9 OK)
- [ ] Backup de producción + restore a local (AGENTS.md §3.1.1) y re-test local
- [ ] Deploy a `provecchio` **con autorización explícita** (§9) + checklist §9.1
- [ ] Verificación en producción: 1 pedido de prueba → `pos.order` visible en el POS de Odoo
- [ ] Wiki sincronizada (`/opt/wiki/orderflow`) + push
- [ ] Tag `v1.39.11` + push de tags

---

## 5. Estrategia de testing

| Nivel | Alcance | Herramienta |
|---|---|---|
| Unitario | Listener, productor, mapeo de mesa, idempotencia | Jest (`backend/src/orders/*.spec.ts`, `backend/src/gastro/*.spec.ts`) |
| Integración | Backend → BullMQ → adapter → Odoo (mock Odoo) | Jest + `ioredis-mock`/BullMQ en modo standalone |
| Contrato Odoo | `pos.order` por RPC + `pos_omniflow_sync` | script reproducible (el usado en E10/E11) + **Newman** (AGENTS.md §3.3) |
| E2E UI | QR → pedido → cocina → cierre → Odoo POS | Playwright (`frontend/e2e/odoo-pos-sync.spec.ts`) |
| Smoke QA | Rutas admin, catálogo, salud | `scripts/qa_e2e_check.py` (local + prod) |
| Operativo | Cola vacía, sin jobs fallidos acumulados, latencia t0→tN | Redis + Prometheus |

---

## 6. Riesgos y rollback

| Riesgo | Mitigación | Rollback |
|---|---|---|
| Parchear Odoo afecta al POS en producción | Snapshot de addons + ventana de mantenimiento + prueba de contrato previa | Revertir el addon y reiniciar `odoo_web_8081` (el POS sigue vendiendo con normality, solo pierde el sync) |
| Pedidos duplicados en el POS de Odoo | Idempotencia por `order_uuid` + limpieza de `pos.order` de prueba | `unlink` de los `pos.order` con `pos_reference like 'OmniFlow-%'` |
| El ERP no tiene la mesa (G5) | Script de correspondencia + validación previa al encolar | Desactivar el mapeo (columna nullable) sin tocar el flujo |
| Regresión en el flujo de cocina | `init.sh` + E2E Playwright del flujo crítico | Rollback del release por tag `v1.39.11^` |
| `ODOO_DB` incorrecto en producción | Aplicar el cambio en el mismo deploy, con verificación posterior | Revertir `.env`/compose y redesplegar el adapter |

---

## 7. Métrica de éxito

- **t0 → tN medido** (p95) de la sincronización OrderFlow → Odoo POS por debajo de 5 s.
- **100 %** de los pedidos cerrados desde el POS del mozo aparecen como `pos.order` en la sesión POS de Odoo
  (verificable con `pos_reference like 'OmniFlow-%'`).
- **0** jobs fallidos acumulados en la cola `odoo-table-sync` y **0** pedidos huérfanos sin `pos.order`.
- El bug 7 del reporte del cliente queda **cerrado** y verificado en `provecchio.com`.

---

## 8. Referencias

- Reporte original del cliente: `/opt/orderflow-branch-schema-prisma/docs/info/OmniGastro.md` (sección
  "v1.39.9 bugs on production")
- Backlog del cliente: [`BACKLOG_CLIENTE_20261019.md`](./BACKLOG_CLIENTE_20261019.md)
- Flujo y telemetría: [`flujo_odoo-pos-sync.md`](./flujo_odoo-pos-sync.md)
- Diseño previo del mismo dominio: [`PLAN_SINCRONIZACION_MOZO_OMNIFLOW_ODOO_POS.md`](./PLAN_SINCRONIZACION_MOZO_OMNIFLOW_ODOO_POS.md),
  [`Arquitectura de Sincronización OmniGastro-Odoo POS.md`](./Arquitectura%20de%20Sincronización%20OmniGastro-Odoo%20POS.md)
- Troubleshooting: `docs/troubleshooting/184-odoo14-nginx-test-page-and-odoo-db-name-mismatch.md`
- Informe de la sesión: `docs/info/INFORME_REDEPLOY_LOCAL_Y_ENLACE_ODOO_2026-10-19.md`
