# Plan de Correcciones — OmniGastro Field Fixes (v1.39.0)

> **Fecha:** 2026-10-16
> **Estado:** ⏳ Pendiente aprobación del usuario
> **Origen:** Reporte de campo Provecchio (deploy 1.39.0)
> **Rama sugerida:** `fix/gastro-pos-list-kds-stations`

---

## Tarea 1 — POS del mozo: lista en vez de grid vacío

**Síntoma:** El catálogo del POS del mozo muestra una caja vacía (sin texto, sin productos). Se observa en formato grid, pero se requiere lista (más compacta, solo nombre sin descripción).

**Archivos a modificar:**
- `frontend/src/components/catalog/CategoryAccordion.tsx` — añadir prop `isListView` que renderice lista compacta (sin Card, sin imagen, solo nombre + precio).
- `frontend/src/pages/admin/gastro-pos.tsx` — pasar `isListView={true}` al `CategoryAccordion`.

**Riesgos:**
- El componente `CategoryAccordion` se usa también en catálogo público y admin. La prop `isListView` debe ser opcional y no alterar el comportamiento por defecto.
- Verificar que los productos se están cargando (`categories` no vacío) — si la respuesta de `/api/v1/catalog/categories/tree?includeProducts=true` llega anidada en `data.data` y el código ya lo maneja en `gastro-pos.tsx:108`, el problema puede ser otro (ej: `renderProductCard` no se está pasando correctamente).

---

## Tarea 2 — KDS stations: select de categorías vacío

**Síntoma:** Al crear/editar una estación en `/admin/gastro/kds-stations`, el `Select` de categorías muestra la lista correcta de categorías pero vacía (sin opciones).

**Archivo a modificar:**
- `frontend/src/pages/admin/gastro-kds-stations.tsx` — normalizar respuesta de `/api/v1/catalog/categories/tree` (puede venir como `{ data: [...] }` o `[{...}]`). Comparar con `gastro-pos.tsx:108` que usa `catsRes.data?.data || catsRes.data`. Añadir logging si `categories` llega vacío.

**Riesgos:**
- El `flattenCategories` filtra por `c.active` — si las categorías no tienen `active: true` o el campo se llama distinto, la lista quedará vacía.
- El `Select mode="multiple"` puede no renderizar opciones si `categoryOptions` es un array vacío por cualquier error silencioso en el mapeo.

---

## Tarea 3 — KDS: preselección de estación de trabajo

**Síntoma:** En `/admin/kds` se muestran las órdenes de mesa, pero no hay preselección de la estación de trabajo que se debe mostrar.

**Archivo a modificar:**
- `frontend/src/pages/admin/kds.tsx` — el `loadStations` (línea 42-54) ya auto-selecciona la primera estación activa, pero `loadActiveOrders` se ejecuta en un `useEffect` separado (línea 56-69) cuyas dependencias no incluyen `selectedStationId` en la carga inicial. Reordenar los efectos para que la primera carga de órdenes use la estación preseleccionada.

**Riesgos:**
- Cambiar el orden de efectos puede causar doble carga de órdenes. Usar `useCallback` para `loadActiveOrders` y dependencias correctas.
- La estación preseleccionada debe persistir al recargar la página (opcional, pero improves UX).

---

## Checklist de verificación

- [ ] Tarea 1: POS del mozo muestra lista de productos (nombre + precio, sin descripción, sin grid vacío).
- [ ] Tarea 2: Select de categorías en `/admin/gastro/kds-stations` muestra opciones al crear/editar estación.
- [ ] Tarea 3: `/admin/kds` preselecciona la estación de trabajo al cargar.
- [ ] `npm run build` (frontend) sin errores TypeScript.
- [ ] `npx playwright test` (E2E) sin errores JS en consola.
- [ ] Deploy a Provecchio con `./scripts/deploy-production.sh provecchio` (requiere autorización).
- [ ] Sincronizar Wiki `/opt/wiki/orderflow/` con `docs/`.
- [ ] Actualizar `docs/info/deployment_report_1.39.0.md` con estado final.
- [ ] Crear tag de versión y push.