# Troubleshooting #63: No se puede eliminar categoría "test" porque tiene productos

**Síntoma:**  
- Al intentar eliminar una categoría desde el panel admin, el sistema responde: *"La categoría tiene X productos. Elimina o mueve los productos primero."*  
- El admin no encuentra los productos asociados en el listado de productos.

**Causa raíz:**  
El endpoint `DELETE /api/v1/social-catalog/categories/:id` en `social-catalog-admin.controller.ts` **bloqueaba la eliminación** cuando existían productos activos con `category === id` (string).  
Además, **nunca eliminaba el registro de la categoría** ni desvinculaba los productos. Solo eliminaba placeholders y devolvía `success: true`, pero la categoría permanecía en la DB.

**Solución aplicada:**  
- Reemplazada la validación bloqueante por una transacción que:
  1. Desvincula productos (`category: null`) donde `category === id`.
  2. Desvincula productos (`categoryId: null`) donde `categoryId === id`.
  3. Elimina productos placeholder (`__CATEGORY_PLACEHOLDER__`).
  4. Elimina el registro de `ProductCategory`.
- Ahora la categoría se elimina correctamente sin dejar productos huérfanos.

**Archivos involucrados:**  
- `backend/src/social-catalog/social-catalog-admin.controller.ts`

**Validación:**  
- Eliminar categoría "test" → success, categoría removida del árbol.  
- Productos que pertenecían a "test" quedan con `category: null` y `categoryId: null`.  
- Listado de productos admin muestra esos productos sin categoría asignada.
