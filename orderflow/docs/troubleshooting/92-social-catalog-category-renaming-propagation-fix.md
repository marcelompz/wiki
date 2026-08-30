# Troubleshooting: Propagación de Renombrado de Categorías en Social Catalog y Productos

## Síntomas
- Al cambiar el nombre de una categoría en el panel de administración (`social-catalog/admin` o `admin/products`, ej. de "COMIDAS" a "Para comer" o "BEBIDAS" a "Para beber"), los productos previamente asociados a la categoría original no reflejaban el nuevo nombre o las categorías desaparecían por completo dejando el catálogo vacío (`[]`).

## Causa Raíz
1. **Falta de transmisión del nombre anterior (`oldName`)**: El frontend enviaba únicamente el nuevo nombre `{ name: newName }` al endpoint `PATCH /categories/:id`, impidiendo que el backend identificara qué string textual de categoría tenían asignado los productos en la columna `product.category`.
2. **Categorías virtuales sin registro UUID en BD**: En `social-catalog`, las categorías generadas dinámicamente desde strings de productos tenían identificadores virtuales (`cat-comidas` o `prodcat-bebidas`). El backend no encontraba un registro con UUID en `product_categories` y abortaba la actualización de los productos.
3. **Desincronización de metadatos JSON**: Además del campo principal `product.category`, campos secundarios almacenados en JSON `metadata` (`posCategory`, `posCategoryName`, `categoryName`, `productCategory`, `productSubcategory`) conservaban el string antiguo.
4. **Filtrado por `includedCategoryIds` desactualizados en la configuración JSON del módulo**: Si el tenant tenía configurada la propiedad `includedCategoryIds` en `module_installations.config`, dicha lista guardaba IDs de nodos virtuales obsoletos (`prodcat-comidas` / `prodcat-bebidas`). Al renombrar las categorías, los nuevos IDs virtuales (`prodcat-para-comer` / `prodcat-para-beber`) eran excluidos por la lista de permitidos, filtrando el 100% de los productos y haciendo que `getCategoryTree` podara las categorías vacías y devolviera `[]`.

## Solución Aplicada
1. **Soporte de `oldName` y Nodos Virtuales (`social-catalog-admin.controller.ts`)**:
   - Se actualizó el payload del frontend en `social-catalog.tsx` y `products.tsx` para incluir `{ ...values, oldName }`.
   - El endpoint `PATCH /api/v1/admin/social-catalog/categories/:id` resuelve UUIDs, nombres textuales e IDs virtuales (`cat-*`, `prodcat-*`).
   - Si la categoría renombrada es virtual, la API crea automáticamente el registro oficial en `product_categories`.
2. **Propagación Masiva a Productos y Metadatos JSON**:
   - Se ejecuta `prisma.product.updateMany` buscando productos por `category` (igual a `oldName` o `id`), `categoryId` o `posCategoryId`, actualizando `product.category` al nuevo nombre.
   - Se recorren y actualizan las propiedades JSON en `metadata` (`posCategory`, `posCategoryName`, `categoryName`, `productCategory`, `productSubcategory`, `posSubcategory`).
3. **Sincronización de `includedCategoryIds` en Configuración de Módulo**:
   - Se incorporó la actualización automática de `includedCategoryIds` en `social-catalog-admin.controller.ts`: al renombrar una categoría, los identificadores virtuales previos (`prodcat-${oldSlug}`) se reemplazan por los nuevos (`prodcat-${newSlug}`) en la configuración JSON persistida en la BD.
4. **Propagación en CatalogService (`catalog.service.ts`)**:
   - `updateCategory` propaga automáticamente los cambios de nombre a los productos pertenecientes al tenant.
