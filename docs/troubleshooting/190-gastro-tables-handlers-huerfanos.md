# 190 — `/admin/gastro/tables`: editar y eliminar mesas no hacía nada (handlers huérfanos) y dos mesas apuntaban al mismo `restaurant.table` de Odoo

> **Fecha:** 2026-10-22 · **Estado:** ✅ **Resuelto en v1.40.2** · **Rama:** `feat/gastro-tables-edit-delete`
> **Detectado en:** reporte del cliente (bug 8a) sobre `https://provecchio.com/admin/gastro/tables`

## Síntoma

El cliente reportaba que en `/admin/gastro/tables` **solo funcionaba crear mesas**: no se podía
editar ni eliminar. La API sí respondía (`PATCH` y `DELETE` devolvían 200 cuando se invocaban a mano),
pero la interfaz no ofrecía ningún control.

Síntoma secundario detectado durante la limpieza de datos de producción del 2026-10-22: las mesas
`G2` y `G02` apuntaban **ambas** a `restaurant.table` **40** de Odoo. Al confirmar un pedido, el
adapter resolvía la mesa de Odoo por `odoo_table_id`, de modo que dos mesas físicas distintas
escribían en la misma mesa del TPV.

## Causa raíz

### 1. Handlers huérfanos (el bug reportado)

`frontend/src/pages/admin/gastro-tables.tsx` tenía implementado todo el flujo de edición:

```text
handleEditTable()   → setFieldsValue + setEditModalVisible(true)
handleSaveTable()   → PATCH /api/v1/tables/:id
handleDeleteTable() → DELETE /api/v1/tables/:id
<Modal "Editar Mesa"> con número, nombre, sillas, forma, zona y odooTableId
```

Pero **ningún botón, tarjeta ni acción del drawer invocaba `handleEditTable` ni
`handleDeleteTable`**. El modal existía y era inalcanzable: código muerto que pasó el build y los
tests porque TypeScript no marca un handler no referenciado cuando `noUnusedLocals: false`.

La segunda pantalla (`frontend/src/pages/admin/gastro.tsx`) sí tenía botones, pero su modal
**solo editaba `tableNumber`**, así que tampoco cubría zona, sillas, forma ni el mapeo con Odoo.

### 2. `odooTableId` sin validación de unicidad

`PATCH /api/v1/tables/:id` escribía `odooTableId` en crudo. Nada impedía que dos mesas del mismo
tenant apuntaran al mismo `restaurant.table`. El endpoint dedicado
(`PATCH /api/v1/tables/:id/odoo-table`) sí validaba contra Odoo, pero el formulario usaba el PATCH
genérico.

## Solución (v1.40.2)

| Capa | Cambio |
|---|---|
| UI | Se crea `frontend/src/components/gastro-table-edit-modal.tsx` (modal compartido) y se conectan **Editar** y **Eliminar** en la grilla y en el drawer de `gastro-tables.tsx`, y en el listado de `gastro.tsx`. El select de Odoo **deshabilita** las mesas ya vinculadas por otra mesa. |
| Backend | `deleteTable` rechaza mesas con pedidos `DRAFT/CONFIRMED/PREPARING/READY` y resuelve las llamadas `PENDING` en la misma transacción. `updateTable` valida zona y **bloquea `odooTableId` duplicado**. `createTable` revive mesas soft-deleted. |
| Permisos | `PATCH /api/v1/tables/:id` pasa a exigir `tables:manage` (antes `tables:status`). |
| Tests | 5 unitarios nuevos (`backend/src/tables/tables.service.spec.ts`) + E2E `frontend/e2e/gastro-tables-crud.spec.ts`. |

## Prevención

- El test E2E verifica la **existencia de los botones** (`aria-label="Editar mesa …"`), no solo que la
  API responda: un handler sin control vuelve a fallar la suite.
- El backend ahora es la última línea de defensa de la unicidad del mapeo, independientemente de la UI.

## Referencias

- `docs/plans/omnigastro/plan-actualizacion-v1.40.2-tables-crud.md`
- `frontend/src/components/gastro-table-edit-modal.tsx`
- `backend/src/tables/tables.service.ts`
- `frontend/e2e/gastro-tables-crud.spec.ts`
