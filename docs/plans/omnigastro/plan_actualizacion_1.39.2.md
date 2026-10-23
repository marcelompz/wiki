# Plan de Actualización OmniGastro v1.39.2

## Objetivo
Corregir los bugs reportados tras el despliegue v1.39.1 en `provecchio.com` que aún afectan a OmniGastro.

- Selector de categorías/subcategorías independiente para estaciones KDS (Bug 1).
- Incoherencia entre el listado/edición de mesas en `/admin/gastro/tables` y el modal “Table Management and QR Codes (OmniGastro)” (Bug 2).
- Cargar pedidos por mesa o sin mesa (takeout) desde el modal (Bug 4).
- Modal “Table Management and QR Codes (OmniGastro)” demasiado pequeño y con texto desbordado (Bug 5).

Bug 3 (POS empty grid) ya está resuelto en v1.39.1.

Mantener cumplimiento del protocolo OmniGastro (AGENTS.md), no romper flujos existentes (QR→pedido→KDS→mozo→cobro), preparar bump a **v1.39.2** y ejecutar `./scripts/init.sh`.

## Alcance

### Frontend (React + Vite + Ant Design)
- `frontend/src/pages/admin/gastro.tsx` modal de gestión de mesas y QR, unificar fuente de tablas, botón de “Cargar Pedido”, modal de selección de órdenes, aumentar ancho del modal.
- `frontend/src/pages/admin/gastro-kds-stations.tsx` – UI independiente para categorías/padres y subcategorías (hojas), selectores “Excluir subcategorías”.
- `frontend/src/pages/admin/gastro-tables.tsx` – (sin cambios directos; las actualizaciones del modal afectan a su listado).
- `frontend/src/components/admin/CategoryAccordion.tsx` – (ya actualizado por el bug 3; sin cambios).
- Componentes UI relacionados – cambios menores de estilo para overflow de texto.

### Backend (NestJS + Prisma)
- No se requieren nuevas migraciones; reutilizar el campo `categories: string[]` existente en `PreparationStation` para la lista combinada.
- Ajustar `TablesController.getTables` para incluir `floorId` opcionalmente (sin cambios, solo mantener consistencia).
- Endpoint `/api/v1/orders` acepta `tableId` opcional/nulo – sin cambios (ya soportado).
- Rutas existentes – sin nuevas permisiones.

### Documentación y versionado
- Incrementar versión a `1.39.2` en `VERSION`, `package.json` (frontend/back‑end), `featurelist.json`.
- Añadir entrada a `CHANGELOG.md`, `ROADMAP.md`, `docs/timeline.md`, `docs/info/OmniGastro.md`, `docs/plans/omnigastro/plan_actualizacion_1.39.2.md`.
- Actualizar `docs/plans/omnigastro/auditoria-<feature>.md` con el estado de las pruebas E2E.
- Sincronizar entradas con Wiki `/opt/wiki/orderflow/`, `docs/troubleshooting/README.md`.

## Análisis por bug

### Bug 1 – KDS Stations: categorías/subcategorías independientes + lógica “todo menos cake"
**Síntoma:** Al crear/editar una estación KDS el árbol de categorías no cabe y se pide selección independiente (padres → hijos) y exclusión de una sub‑categoría (ejemplo, `cake`).

**Hipótesis raíz:** El formulario usa un solo `Select` multi (flattened) que renderiza todas las categorías juntos; no hay controles separados ni lógica de auto‑selección o exclusión.

**Archivos sospechosos:**
- `frontend/src/pages/admin/gastro-kds-stations.tsx` – estado/formulario.
- `frontend/src/services/gastro/kds-stations.service.ts` – payload enviado.
- `backend/src/modules/gastro/kds-stations/kds-stations.service.ts` – persistencia (usa `categories: string[]`).

**Requerido:**
- UI con **dos selects independientes** – uno para categorías padre (con hijos) y otro para subcategorías hoja.
- “Seleccionar todas las subcategorías de las categorías padre seleccionadas” e “Excluir subcategorías” (ejemplo, “cake”).
- Persistir categorías combinadas (padres + hojas) en `categories`; mantener compatibilidad con estaciones existentes.

### Bug 2 – Tables: listado/edición incoherente entre `/admin/gastro/tables` y modal “Table Management and QR Codes (OmniGastro)”
**Síntoma:** `/admin/gastro/tables` no lista mesas que aparecen en el modal; tampoco permite editar las mesas mostradas.

**Hipótesis raíz:** Diferente fuente de datos – modal usa `GET /api/v1/tables` mientras el listado de la página usa `GET /api/v1/tables/floor-map`. Parámetros de filtrado (`active`, `isDeleted`) o contexto de tenant diferentes.

**Archivos sospechosos:**
- `frontend/src/pages/admin/gastro.tsx` – `loadTables` (endpoint `/api/v1/tables`).
- `frontend/src/pages/admin/gastro-tables.tsx` – `loadFloorMap` (endpoint `/api/v1/tables/floor-map`).
- `backend/src/tables/tables.service.ts` – método `getTables`.
- `backend/src/tables/tables.controller.ts` – ruta `GET /api/v1/tables`.

**Requerido:**
- Unificar fuente de datos – modal ahora usa `GET /api/v1/tables/floor-map` y aplanar `floors` + `unassignedTables`.
- Mostrar todas las mesas activas/no eliminadas del tenant actual; preservar posición del mapa y nombre no asignado.
- Mantener sincronización tras CRUD (refetch ambas vistas).

### Bug 4 – Modal “Table Management and QR Codes (OmniGastro)”: cargar pedidos por mesa sin QR / sin mesa (takeout)
**Síntoma:** Falta UI para cargar pedidos de mesas que no generaron un pedido vía QR; falta opción para “Cargar pedidos por mesa” y “Sin mesa (takeout)”.

**Hipótesis raíz:** Modal solo muestra pedidos creados por QR (`orderSource`?) y filtra por `status`; no hay selector para crear/cargar órdenes sin QR o para takeout.

**Archivos sospechosos:**
- `frontend/src/pages/admin/gastro.tsx` – modal de gestión de mesas, nuevo botón “Cargar Pedido”.
- `frontend/src/components/admin/table-qr-modal.tsx` / `table-orders-modal.tsx` – posibles componentes reutilizables (si existen).
- `frontend/src/services/gastro/waiter.service.ts` / `orders.service.ts`.
- `backend/src/modules/orders/orders.controller.ts` – ajustes para aceptar `tableId=null` y `orderType=TAKEOUT`.

**Requerido:**
- Añadir botón **Cargar Pedido** en el modal que abre un segundo modal con un `Select` de mesas (incluyendo opción “Sin mesa”).
- Al seleccionar, llamar a `GET /api/v1/orders?tableId=…&status=DRAFT,CONFIRMED,PREPARING,READY` (o `tableId=null&orderType=TAKEOUT`).
- Mostrar lista de órdenes encontradas con acción **Gestionar Pedido** que navega a `/admin/gastro/pos/<order.tableId>` (o a la pestaña adecuada).
- Validar permisos (mozo/cajero) y evitar mezclar pedidos cerrados.

### Bug 5 – Modal en `/admin/gastro/mozos`: muy pequeño + texto desborda
**Síntoma:** El modal “Table Management and QR Codes (OmniGastro)” en la página de mozos es demasiado pequeño; el texto desborda el contenedor.

**Hipótesis raíz:** `Modal` con `width={750}` fijo, `bodyStyle` sin `overflowY`, columnas largas sin `ellipsis`, sin width responsivo.

**Archivos sospechosos:**
- `frontend/src/pages/admin/gastro-mozo.tsx` – modal (modal compartido usado en `/gastro` y `/mozos`).
- Componente modal genérico (si existe).
- CSS/AntD overrides.

**Requerido:**
- Aumentar `width` con breakpoints responsivos (`xs: '95vw', sm: '90vw', md: '800px', lg: '900px', xl: '1000px'`).
- `bodyStyle={{ maxHeight: 'calc(90vh - 120px)', overflowY: 'auto' }}`.
- Aplicar `ellipsis: true` en columnas, `scroll={{ x: true }}` para tablas, `word-break: break-word` para texto largo.
- Probar en viewport tablet (`1024x768`).

## Plan de acción detallado

### Fase 0 – Contexto y lectura obligatoria
1. Leer `docs/00-contexto-agentes.md`, `docs/troubleshooting/README.md`.
2. Inspeccionar archivos sospechosos (`glob` / `grep`).

### Fase 1 – Bug 1 (KDS Stations)
1. **Frontend** – Refactorizar `GastroKdsStationsPage`:
   - Añadir estados `selectedParentCategoryIds`, `selectedLeafCategoryIds`, `excludedSubcategoryIds`.
   - Calcular `parentCategories` (`children.length > 0`) y `leafCategories` (`children.length === 0`).
   - Renderizar tres `Select` multivalor (padres, hojas, excluir).
   - Implementar acciones rápidas: “Seleccionar todas las hojas de padres seleccionados”, “Limpiar exclusión”.
   - Combinar categorías para envío: hojas seleccionadas + hijos recursivos de padres seleccionados → enviar como `categories`.
2. **Backend** – Sin cambios (usar `categories` existente).
3. **Validación** – Crear historias de usuario E2E Playwright para crear estación con selección independiente y verificar payload.

### Fase 2 – Bug 2 (Tables sync)
1. **Frontend** – Modificar `loadTables` en `gastro.tsx` para llamar a `/api/v1/tables/floor-map` y aplanar `floors` + `unassignedTables` en el mismo estado `tables`.
2. **UI** – Ajustar el modal de gestión de mesas (`width={900}`), `bodyStyle`, `ellipsis` en columnas, `scroll` horizontal.
3. **Sincronización** – Refetch tabla de `/admin/gastro/tables` cuando el modal crea/actualiza/elimina una mesa (invalidar `GET /api/v1/tables/floor-map`).
4. **E2E** – Verificar que ambas vistas listan exactamente las mismas filas; probar CRUD en ambos sitios.

### Fase 3 – Bug 4 (Cargar pedidos sin QR / takeout)
1. **Frontend** – Añadir botón **Cargar Pedido** en el modal (`<Button icon={<ClockCircleOutlined />} onClick={() => setOrderModalVisible(true)}>`).
2. **Nuevo modal** – `orderModalVisible` con:
   - `Select` de mesas (incluyendo opción `null` “Sin mesa (takeout)”).
   - Botón “Cargar Pedidos” que llama a `GET /api/v1/orders` con `tableId` (o `null`) y `status=DRAFT,CONFIRMED,PREPARING,READY` (o `orderType=TAKEOUT` cuando `null`).
   - Mostrar lista de órdenes en tarjetas compactas; cada tarjeta tiene un botón **Gestionar Pedido** que navega a `/admin/gastro/pos/${order.tableId}`.
3. **Backend** – Ajustar `OrdersController.findAll` para aceptar `tableId=null` e `orderType=TAKEOUT` si no está presente (`Prisma` ya soporta `IS NULL`); no son necesarias nuevas columnas.
4. **Pruebas** – E2E: seleccionar mesa y cargar órdenes; seleccionar “Sin mesa” y verificar que solo aparecen pedidos de tipo TAKEOUT.

### Fase 4 – Bug 5 (Modal responsivo en mozos)
1. **Modal** – Editar la prop `width` del modal de gestión de mesas (`width={{ xs: '95vw', sm: '90vw', md: '800px', lg: '900px', xl: '1000px' }}`).
2. **bodyStyle** – `maxHeight: 'calc(90dvh - 120px)', overflowY: 'auto'`.
3. **Tablas** – Añadir `ellipsis: true` a columnas que puedan contener texto largo; envolver `Table` con `scroll={{ x: true }}` y ancho fijo.
4. **Pruebas** – Probar visualmente en tamaños de pantalla `xs`, `sm`, `md`, `lg` (`1024×768`).

### Fase 5 – Validación E2E + Tests
- **Playwright** – Escribir / actualizar especificaciones en `frontend/e2e/`:
  - `kds-station-independent-categories.spec.ts`.
  - `tables-modal-sync.spec.ts`.
  - `order-modal-load-takeout.spec.ts`.
  - `modal-responsive.spec.ts`.
- Ejecutar `npm test` + `npx playwright test` (headless) y documentar resultados.
- Verificar `/api/v1/health` devuelve versión `1.39.2`.

### Fase 6 – Documentación y bump de versión
- Incrementar a `1.39.2` en `VERSION`, `backend/package.json`, `frontend/package.json`, `featurelist.json`.
- Añadir entrada a `CHANGELOG.md` con resumen de los 4 bugs corregidos.
- Añadir/actualizar `docs/info/OmniGastro.md` (`2026-10-16 — v1.39.2 DEPLOYED ✅`).
- Guardar `docs/plans/omnigastro/plan_actualizacion_1.39.2.md` (este documento).
- Actualizar `ROADMAP.md`, `docs/timeline.md` según sea necesario.
- Actualizar `docs/plans/omnigastro/auditoria-<feature>.md` con el estado de las pruebas.
- Sincronizar entradas con Wiki `/opt/wiki/orderflow/`.

### Fase 7 – Barrera de validación
- Ejecutar `./scripts/init.sh` (con usuario aprobado) – validar que el despliegue local aplica correctamente las migraciones.
- Revisar warnings Jest/TS/Vite/Playwright y corregir.
- Commit atómico: `chore(omnigastro): bump to v1.39.2 and fix kds-stations/tables/order-modal/modal-responsive bugs`.
- Crear tag `v1.39.2` + push.

## Archivos a modificar (tentativo)

### Frontend:
- `frontend/src/pages/admin/gastro.tsx` – loadTables, nuevo modal de carga de pedidos, ancho y estilo del modal.
- `frontend/src/pages/admin/gastro-kds-stations.tsx` – UI independiente de categorías/subcategorías.
- `frontend/src/pages/admin/gastro-tables.tsx` – (sin cambios directos; usa endpoint floor‑map).
- `frontend/src/components/admin/CategoryAccordion.tsx` – (ya resuelto; sin cambios).
- `frontend/src/components/admin/table-qr-modal.tsx` / `table-orders-modal.tsx` – (si existen, posible refactor).

### Backend:
- `backend/src/modules/gastro/kds-stations/kds-stations.service.ts` – sin cambios (compatibilidad backward).
- `backend/src/tables/tables.controller.ts` / `.service.ts` – sin cambios (sigue sirviendo mismo conjunto).
- `backend/src/modules/orders/orders.controller.ts` / `.service.ts` – ajustar búsqueda para `tableId=null` (ya soportado).

### Documentación:
- `docs/plans/omnigastro/plan_actualizacion_1.39.2.md` – (este documento).

## Estrategia de testing

- **Unitarios** – Jest para servicios que manejan categorías/tablas/órdenes.
- **Integración** – probar endpoints con auth/tenant.
- **E2E Playwright** – flujos completas OmniGastro para cada bug.
- **QA manual** – validar contra `provecchio.local` con datos reales tras `init.sh`.
- **Regresión** – verificar KDS dashboard, WebSocket, notificaciones sonoras.

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Romper estaciones KDS existentes (cambio de esquema) | Alto | Reutilizar `categories: string[]` existente; no agregar nuevas columnas. |
| Desajuste entre `/api/v1/tables` y `/api/v1/tables/floor-map` oculta mesas | Alto | Unificar modal a usar `floor-map` y aplanar; preservar columnas para mapa. |
| Virtualización para POS rompe búsqueda/filtros | Medio‑Alto | Probar con fixtures; mantener fallback sin virtualización si pequeño. |
| `tableId=null` en órdenes afecta a otras consultas | Alto | Asegurar que el servicio `OrdersService.findAll` siempre aplica `tenantId` y nunca devuelve mesas de otros tenants. |
| Modal responsivo rompe mobile | Bajo | Usar `width` responsivo de AntD y pruebas en viewport móvil. |

## Criterios de aceptación

- **[Bug 1]** – UI del formulario de estación KDS permite seleccionar categorías padre y subcategorías hoja independientemente; acción “Seleccionar todas las subcategorías de Food” funciona; valor enviado al backend como lista combinada; sin romper estaciones existentes.
- **[Bug 2]** – Listado de `/admin/gastro/tables` e lista de modal `/admin/gastro` muestran el mismo conjunto de mesas activas; edición en modal refleja en la página de tablas (refetch).
- **[Bug 3]** – POS muestra todas las categorías y productos; scroll fluido (ya resuelto en v1.39.1).
- **[Bug 4]** – Modal “Cargar Pedido” muestra menú de selección de mesa/sin mesa; carga órdenes según selección; acción “Gestionar Pedido” navega correctamente; pedidos de takeout (sin mesa) visibles.
- **[Bug 5]** – Modal en mozos (`/admin/gastro/mozos`) tiene ancho responsivo, sin overflow de texto, scroll interno, probado en tablet (`1024x768`).
- `./scripts/init.sh` pasa sin errores.
- Todas las pruebas E2E OmniGastro pasan.
- `/api/v1/health` devuelve versión `1.39.2`.
- Sin warnings críticos TS/Jest.

## Notas

- Mantener `tenantId` sagrado en todas las consultas (`req.tenantId` / decorator `TenantPrisma`).
- Usar `kebab-case` para nuevos archivos.
- No colores hardcodeados: usar `theme.useToken()` / variables CSS.
- Seguir regla Deploy-to-Local-First (respaldar `provecchio.local`, restaurar localmente, validar antes de producción).
- Documentar cualquier hallazgo repetido como nueva entrada en `docs/troubleshooting/README.md`.

---
*Plan creado el 2026‑10‑16 – ready for implementation.*
