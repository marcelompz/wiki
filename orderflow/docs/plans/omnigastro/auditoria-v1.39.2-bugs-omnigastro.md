# Auditoría E2E — OmniGastro v1.39.2 (Bugs 1, 2, 4, 5)

**Fecha:** 2026-10-16  
**Versión:** v1.39.2  
**Estado:** Pendiente de ejecución de `./scripts/init.sh` y E2E Playwright

## Alcance
Validación de los 4 bugs corregidos en la actualización v1.39.2 de OmniGastro:

| Bug | Descripción | Archivo E2E | Estado |
|-----|-------------|-------------|--------|
| Bug 1 | KDS Stations: categorías padre/hoja independientes + excluir subcategorías | `kds-station-independent-categories.spec.ts` | ⏳ Pendiente |
| Bug 2 | Tables: sincronización entre `/admin/gastro/tables` y modal Gestión de Mesas | `tables-modal-sync.spec.ts` | ⏳ Pendiente |
| Bug 4 | Cargar pedidos por mesa / sin mesa (takeout) | `order-modal-load-takeout.spec.ts` | ⏳ Pendiente |
| Bug 5 | Modal responsivo en panel de mozos (1024x768 tablet) sin overflow | `modal-responsive.spec.ts` | ⏳ Pendiente |

## Casos de prueba E2E definidos

### kds-station-independent-categories.spec.ts
1. Abrir página `/admin/gastro/kds-stations` y verificar renders de selects independientes (padres, hojas, excluir).
2. Crear estación vía `POST /api/v1/kds/stations` con lista combinada `[parentId, leafId]`; verificar que `categories` contenga ambos.
3. Listar estaciones vía `GET /api/v1/kds/stations`; verificar retrocompatibilidad (categorías como array).

### tables-modal-sync.spec.ts
1. Abrir `/admin/gastro/tables` y verificar que lista filas.
2. `GET /api/v1/tables/floor-map` retorna `floors` y `unassignedTables`.
3. Abrir modal de gestión de mesas desde `/admin/gastro` y verificar que muestra las mismas mesas.
4. CRUD: crear mesa en modal y verificar incremento en el listado; limpiar mesa de prueba.

### order-modal-load-takeout.spec.ts
1. `GET /api/v1/orders?tableId=…&status=DRAFT,CONFIRMED,PREPARING,READY` retorna 200.
2. `GET /api/v1/orders?tableId=null&status=…` retorna solo pedidos con `tableId` null (takeout).
3. Abrir modal "Cargar Pedido"; verificar Select de mesas + opción "Sin mesa (takeout)".
4. Cargar órdenes por mesa y verificar botón "Gestionar Pedido" visible.

### modal-responsive.spec.ts
1. Viewport tablet 1024x768: abrir modal de mesas y verificar ancho <= 1024px y > 0.
2. Verificar columnas con `ellipsis` y tabla con `scroll={{ x: true }}`.
3. `GET /api/v1/health` retorna versión `1.39.2`.

## Requisitos previos
- Backend levantado en `http://localhost:3010` (o `PLAYWRIGHT_API_URL`).
- Tenant `provecchio-dimora-001` con datos restaurados desde backup de producción (deploy-to-local-first).
- Usuario admin con credenciales `marcelo@pesallaccia.com` / `Provecchio2026!`.

## Hallazgos
- Ninguno aún (pruebas no ejecutadas).

## Siguientes pasos
1. Ejecutar `./scripts/init.sh` (con confirmación de usuario) — valida backend tests + build, frontend build, Traefik sync y E2E QA (`qa_e2e_check.py`).
2. Ejecutar `npx playwright test` para las 4 specs nuevas.
3. Documentar resultados en esta auditoría y marcar estado de cada caso.
4. Si todo pasa, crear tag `v1.39.2` y push a `origin/main`.
5. Sincronizar Wiki `/opt/wiki/orderflow/` y Traefik `/opt/traefik-orderflow/`.

## Criterios de aceptación (AGENTS.md §plan_actualizacion_1.39.2)
- `[Bug 1]` UI permite seleccionar padre y hojas independientemente; acción "Seleccionar todas las hojas" funciona; payload combinado; sin romper estaciones existentes.
- `[Bug 2]` Listado `/admin/gastro/tables` y modal muestran el mismo conjunto de mesas activas; edición en modal refleja en la página (refetch).
- `[Bug 4]` Modal "Cargar Pedido" muestra menú mesa/sin mesa; carga órdenes según selección; "Gestionar Pedido" navega; takeout visible.
- `[Bug 5]` Modal en mozos ancho responsivo, sin overflow, scroll interno, probado en tablet 1024x768.
- `./scripts/init.sh` pasa sin errores.
- Todas las pruebas E2E OmniGastro pasan.
- `/api/v1/health` devuelve versión `1.39.2`.
- Sin warnings críticos TS/Jest.
