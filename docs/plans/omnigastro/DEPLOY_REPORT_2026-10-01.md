# Deploy Report — OmniGastro + Odoo 18 Local Lab (provecchio.local)

**Fecha:** 2026-10-01  
**Entorno:** Laboratorio local Provecchio (`/opt/orderflow`, `/opt/traefik-orderflow`, `/opt/odoo-deploy/18`)  
**Objetivo:** Probar el flujo OmniGastro end-to-end con Odoo 18 localmente, sin modificar producción.

---

## Cambios realizados

### 1. Traefik local: dominio `odoo.provecchio.local`

- **Archivo:** `/opt/traefik-orderflow/dynamic/services.yml`
- **Cambio:** routers `odoo-18-local` y `odoo-18-local-http` apuntando a `odoo_init_db_18:8069`.
- **Redes:** `odoo_init_db_18` conectado a `traefik-public` y `orderflow-network`.
- **Dominios expuestos:** `odoo.provecchio.local` y `odoo.provecchio.com` (solo laboratorio).

### 2. Módulo puente Odoo `pos_omniflow_sync`

- **Ruta:** `/opt/odoo-addons/18/pos_omniflow_sync/`
- **Controlador:** `controllers/main.py`
  - `POST /api/omniflow/sync_table_order` (auth=`user`, JSON, CSRF=False)
  - Crea/actualiza `pos.order` draft por mesa y sesión activa.
  - Emite notificación `bus.bus` para actualizar la pantalla del POS en tiempo real.
- **Manifest:** `__manifest__.py` dependiendo de `base` y `pos_restaurant`.
- **Seguridad:** `security/ir.model.access.csv` para usuarios y managers.

### 3. Worker `odoo-table-sync` en `odoo-adapter`

- **Ruta:** `/opt/orderflow/odoo-adapter/src/workers/table-sync-worker.js`
- **Cola:** `odoo-table-sync` (Redis list, consumida por loop en el worker).
- **Flujo:**
  1. Autentica contra Odoo 18 (`OdooClient.authenticate`).
  2. Obtiene sesión activa de POS (`getActivePosSession`).
  3. Llama a `POST /api/omniflow/sync_table_order` en el odoo-adapter.
- **Inicio:** importado y arrancado desde `src/index.js` al hacer `app.listen`.

### 4. Backend OrderFlow: cola BullMQ + listener

- **Cola registrada:** `QueuesModule` → `BullModule.registerQueue({ name: 'odoo-table-sync' })`.
- **Producer:** `/opt/orderflow/backend/src/queues/odoo-table-sync.producer.ts`
- **Processor:** `/opt/orderflow/backend/src/queues/odoo-table-sync.processor.ts`
- **Listener:** `/opt/orderflow/backend/src/orders/odoo-table-sync.listener.ts`
  - Escucha evento `odoo.table_order_sync` emitido desde `OrdersService.sendToKitchen`.
- **Integración:** `OrdersService.sendToKitchen` ya emite el evento; el listener convierte las líneas a items Odoo y encola el job.

### 5. Variables de entorno locales

- **`.env`:** se restauró a valores de producción.
- **`.env.local`:** variables exclusivas del lab (`ODOO_WEB_HOST=odoo.provecchio.local`, `ODOO_POS_CONFIG_ID`, `ODOO_TABLE_ID`, `REDIS_HOST`, `REDIS_PORT`).
- **`.env.local.example`:** documentación del archivo local.

### 6. Configuración Docker

- **`docker-compose.prod.yml`:** servicio `odoo_adapter` ahora recibe `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` y `ODOO_ADAPTER_URL` explícitamente.
- **Rebuild:** `odoo-adapter` reconstruido y corriendo; healthcheck OK.
- **Red:** `odoo_init_db_18` conectado a `orderflow-network` y `traefik-public`.

---

## Estado de verificación

| Componente | Estado | Detalle |
|------------|--------|---------|
| Traefik local | OK | Router `odoo-18-local` activo |
| Odoo 18 | Accesible | `odoo.provecchio.local` / `odoo.provecchio.com` |
| odoo-adapter | OK | Redis conectado; worker `TableSyncWorker` escuchando |
| Backend OrderFlow | OK | `/api/v1/health` responde; `odoo_adapter: ok` |
| Cola `odoo-table-sync` | Registrada | Producer + Processor + Listener cargados |
| Módulo Odoo `pos_omniflow_sync` | Creado | Falta instalación manual en UI de Odoo 18 |
| `.env` producción | Intacto | Sin cambios de dominio/productivo |
| `.env.local` | Creado | Variables de lab separadas |

---

## Próximos pasos

1. Instalar el módulo `pos_omniflow_sync` desde la UI de Odoo 18 (`Apps` → buscar `POS OmniFlow Sync`).
2. Configurar `pos.config` y `restaurant.table` con IDs correctos.
3. Mapear `RestaurantTable.odooTableId` y `Product.odooProductId` en OrderFlow admin.
4. Enviar un pedido real desde OmniGastro (`POST /api/v1/orders/:id/claim` + `sendToKitchen`) y validar:
   - Job encolado en `odoo-table-sync`.
   - Worker procesa y llama a `/api/omniflow/sync_table_order`.
   - POS de Odoo 18 recibe la orden draft y emite `bus.bus`.
5. Documentar resultados en `docs/plans/omnigastro/DEPLOY_REPORT_2026-10-01.md`.

---

## Notas

- No se modificó producción ni se hicieron deploys remotos.
- Todos los cambios son en rama local de OrderFlow.
- El addon `pos_omniflow_sync` se instaló en `/opt/odoo-addons/18/` para que Odoo 18 lo reconozca en `/mnt/extra-addons-customize`.
