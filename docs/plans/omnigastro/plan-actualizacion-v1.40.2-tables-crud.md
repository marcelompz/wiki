# Plan de actualización — v1.40.2 · Editar y eliminar mesas (FEAT-200)

> **Fecha:** 2026-10-22 · **Versión:** `1.40.2` (patch) · **Rama:** `feat/gastro-tables-edit-delete`
> **Módulo:** OmniGastro / Mesas / Salón · **Feature:** FEAT-200
> **Estado:** ✅ Implementado y validado en local (pendiente de deploy autorizado)

---

## 1. Problema reportado (bug 8a del backlog del cliente)

> "En `/admin/gastro/tables` solo funciona el crear, no se actualiza ni borra."

Verificación en el código:

| Pantalla | Realidad encontrada |
|---|---|
| `frontend/src/pages/admin/gastro-tables.tsx` | `handleEditTable`, `handleSaveTable` y `handleDeleteTable` **existían** (con el modal completo de número, nombre, sillas, forma, zona y mapeo Odoo) pero **ningún botón los invocaba**: código muerto. |
| `frontend/src/pages/admin/gastro.tsx` | Sí había botones Editar/Eliminar, pero el modal **solo editaba `tableNumber`** (no zona, sillas, forma ni mapeo). |

Consecuencia: el usuario no podía renombrar, cambiar de zona, ajustar sillas ni corregir el mapeo a
`restaurant.table` de Odoo desde la UI. El único camino era la API.

### Incidente asociado

Dos mesas (`G2` y `G02`) quedaron apuntando al **mismo** `restaurant.table` de Odoo (id 40), porque
el `PATCH /api/v1/tables/:id` aceptaba `odooTableId` **sin validar unicidad**. En producción se
resolvió eliminando `G02` (soft-delete) y conservando el mapeo en `G2`; esta versión agrega la
validación para que no vuelva a ocurrir.

---

## 2. Alcance

### Frontend

| Archivo | Cambio |
|---|---|
| `frontend/src/components/gastro-table-edit-modal.tsx` | **Nuevo** componente compartido. Formulario: número, nombre, zona (con "sin zona"), sillas, forma y mesa de Odoo. Carga zonas (`GET /tables/floors`), mesas de Odoo (`GET /tables/odoo-tables`) y el mapa de `odooTableId` ya usados (`GET /tables`) para **deshabilitar** opciones ocupadas. Avisa si no hay sesión POS abierta. |
| `frontend/src/pages/admin/gastro-tables.tsx` | Se elimina el modal inline y su estado (`editForm`, `odooTables`, `loadOdooTables`). Se conectan **Editar** y **Eliminar** (con `Popconfirm`) en cada tarjeta de la grilla y en el drawer del mapa. El drawer ahora muestra **Zona** y **Mesa en Odoo**. Al eliminar la mesa abierta, el drawer se cierra. |
| `frontend/src/pages/admin/gastro.tsx` | El modal de renombrado se reemplaza por el componente compartido (edición completa). Tooltip e icono corregidos (`ClockCircleOutlined` → `EditOutlined`). |

### Backend

| Archivo | Cambio |
|---|---|
| `backend/src/tables/tables.service.ts` | (1) `deleteTable` **rechaza** mesas con pedidos `DRAFT/CONFIRMED/PREPARING/READY` y, en la misma transacción, **resuelve** las llamadas al mozo `PENDING` y limpia `ownerId/status`. (2) `updateTable` valida que la zona exista y esté activa en el tenant, **bloquea** `odooTableId` duplicado y traduce `P2002` a un 400 legible. (3) `createTable` **revive** una mesa soft-deleted del mismo número/zona en lugar de chocar con `@@unique([tenantId, floorId, tableNumber])`. |
| `backend/src/tables/tables.controller.ts` | `PATCH /api/v1/tables/:id` pasa de `tables:status` a **`tables:manage`** (era el único endpoint de Edición/CRUD fuera de su permiso). |

---

## 3. Reglas de negocio implementadas

1. **No se borra una mesa con consumos abiertos.** Mensaje:
   `No se puede eliminar la mesa G5: tiene 2 pedido(s) abierto(s). Cerralos o cancelalos antes de borrarla.`
2. **Una mesa de Odoo ↔ una mesa de OmniGastro.** Si `restaurant.table 40` ya está tomada:
   `La mesa de Odoo 40 ya está vinculada a la mesa G2. Liberá ese vínculo antes de reasignarlo.`
3. **Borrado reversible.** Soft-delete (`isDeleted=true`, `active=false`, `deletedAt`), historial y
   pedidos intactos; el QR público responde **404**.
4. **Recrear una mesa eliminada** con el mismo número y zona reutiliza el registro (no rompe el
   índice único y conserva el `token` del QR ya impreso).
5. **Llamadas al mozo** pendientes de una mesa eliminada se cierran como `RESOLVED`.

---

## 4. Testing

### Unitarios (`backend/src/tables/tables.service.spec.ts`)

5 casos nuevos FEAT-200:

- rechazo de borrado con pedidos abiertos (y `update` no se llama);
- resolución de llamadas `PENDING` al borrar;
- rechazo de `odooTableId` duplicado;
- rechazo de zona inexistente;
- revive de una mesa soft-deleted.

Resultado: `npx jest src/tables` → **2 suites / 30 tests OK**.

### E2E (`frontend/e2e/gastro-tables-crud.spec.ts`)

- API: crear → editar (sillas/forma/nombre) → eliminar → desaparece del `floor-map` y `GET /:id` 404.
- API: segundo mapeo al mismo `restaurant.table` → **400** `ya está vinculada`.
- UI: la grilla expone `button[aria-label^="Editar mesa"]` y el modal compartido abre con el campo
  "Mesa equivalente en Odoo POS".
- UI: el drawer de la mesa muestra **Editar mesa** y **Eliminar mesa**.

### Compilación

- `npx tsc --noEmit` (frontend) → limpio.
- `npx tsc -p tsconfig.build.json --noEmit` (backend) → limpio.

---

## 5. Compatibilidad y efectos secundarios

- `PATCH /tables/:id` ahora exige `tables:manage` (MANAGER/ADMIN/SUPER_ADMIN). El rol `WAITER`
  conserva `POST /tables/:id/status`, que es el endpoint pensado para mozos.
- El modal de `gastro.tsx` gana campos nuevos, pero el 100% de los cambios es aditivo.
- No hay migraciones de base de datos.

---

## 6. Documentación asociada

- `docs/troubleshooting/190-gastro-tables-handlers-huerfanos.md`
- `docs/info/OmniGastro.md` (sección 2026-10-22: limpieza de datos + saneamiento de pisos Odoo)
- `CHANGELOG.md`, `ROADMAP.md`, `featurelist.json` (FEAT-200)

---

## 7. Próximo paso

**v1.41.0 (minor) — FEAT-201:** provisioning de pisos y mesas OmniGastro → Odoo
(`GET /api/omniflow/odoo_floors`, `POST /api/omniflow/provision_floor`, `POST /api/omniflow/provision_tables`),
con UI de sincronización por piso y detección de duplicados.
