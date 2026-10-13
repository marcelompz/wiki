# Troubleshooting #90 — Persistencia Recursiva de Visibilidad y Categorías Virtuales ("Fuera de carta")

## 📋 Síntoma

En el panel de administración `/admin/social-catalog` -> tab **Categorías**, al intentar desmarcar el interruptor de visibilidad (`isVisible: false`) para la categoría **"Fuera de carta"** (o cualquier subcategoría anidad de Nivel 1), el cambio no se guardaba y la categoría permanecía visible al recargar o en el catálogo público.

---

## 🔍 Causa Raíz

1. **Falta de Actualización Recursiva de Estado en Frontend (`CategoryManagement.tsx`)**:
   `handleToggleVisibility` mapeaba únicamente la matriz raíz de `items`. Al desmarcar un nodo hijo (como una categoría de PDV anidada), `c.id === id` no coincidía a nivel 0 y el cambio de visibilidad no afectaba el estado local.
2. **Envío Incompleto de Nodos en `handleSaveOrder`**:
   `handleSaveOrder` enviaba a `onSave` únicamente los nodos de primer nivel (`items`), omitiendo los nodos hijos anidados.
3. **Categorías Virtuales sin Registro en Base de Datos (`social-catalog.service.ts`)**:
   Categorías como **"Fuera de carta"** eran generadas dinámicamente como nodos virtuales a partir del texto `product.category` / `product.posCategory` sin poseer un registro explícito en la tabla `productCategory`. Al ejecutar `reorderCategories`, la consulta `updateMany({ where: { id: item.id } })` no encontraba filas para actualizar.
4. **Filtro Rígido de Visibilidad en Backend**:
   `getCategoryTree` ejecutaba `findMany` con `isVisible: true` hardcodeado y no vinculaba la visibilidad guardada en DB con las categorías virtuales en modo `product_pos`.

---

## 🛠️ Solución Aplicada (`v1.20.84`)

1. **Actualización Recursiva de Estado en Frontend ([CategoryManagement.tsx](file:///opt/orderflow/frontend/src/components/admin/CategoryManagement.tsx))**:
   Se implementó `updateVisibilityRecursive` para recorrer tanto el nodo principal como sus arreglos `children`.

2. **Envío Completo de la Lista Plana al Guardar ([CategoryManagement.tsx](file:///opt/orderflow/frontend/src/components/admin/CategoryManagement.tsx))**:
   Se modificó `handleSaveOrder` para enviar `flattenTree(items)` a `onSave`, garantizando que todas las subcategorías e ítems "Fuera de carta" viajen en el payload hacia la API `/categories/reorder`.

3. **Búsqueda por Nombre y Auto-Creación en Backend ([social-catalog.service.ts](file:///opt/orderflow/backend/src/social-catalog/social-catalog.service.ts))**:
   Se actualizó `reorderCategories` para:
   * Buscar la categoría por `id` o por `name` (case-insensitive).
   * Si no existe un registro en `productCategory` para una categoría virtual (como `"Fuera de carta"`), **crear automáticamente el registro en la BD** con `isVisible: false` y `active: true`.

4. **Integridad de Consulta en `getCategoryTree` ([social-catalog.service.ts](file:///opt/orderflow/backend/src/social-catalog/social-catalog.service.ts))**:
   Se vinculó la visibilidad de la base de datos a los nodos devueltos en `product_pos` y se flexibilizó el filtro `where: { tenantId, active: true, ...(includeEmpty ? {} : { isVisible: true }) }`.
