# Troubleshooting: Propagación de Renombrado de Categorías en Social Catalog y Productos

## Síntomas
- Al cambiar el nombre de una categoría en el panel de administración (`social-catalog/admin` o `admin/products`, ej. de "COMIDAS" a "Para comer" o "BEBIDAS" a "Para beber"), los productos previamente asociados a la categoría original no reflejaban el nuevo nombre o dejaban de aparecer agrupados bajo la nueva categoría.

## Causa Raíz
1. **Falta de transmisión del nombre anterior (`oldName`)**: El frontend enviaba únicamente el nuevo nombre `{ name: newName }` al endpoint `PATCH /categories/:id`, impidiendo que el backend identificara qué string textual de categoría tenían asignado los productos en la columna `product.category`.
2. **Categorías virtuales sin registro UUID en BD**: En `social-catalog`, las categorías generadas dinámicamente desde strings de productos tenían identificadores virtuales (`cat-comidas` o `prodcat-bebidas`). El backend no encontraba un registro con UUID en `product_categories` y abortaba la actualización de los productos.
3. **Desincronización de metadatos JSON**: Además del campo principal `product.category`, campos secundarios almacenados en JSON `metadata` (`posCategory`, `posCategoryName`, `categoryName`, `productCategory`, `productSubcategory`) conservaban el string antiguo.

## Solución Aplicada
1. **Soporte de `oldName` y Nodos Virtuales (`social-catalog-admin.controller.ts`)**:
   - Se actualizó el payload del frontend en `social-catalog.tsx` y `products.tsx` para incluir `{ ...values, oldName }`.
   - El endpoint `PATCH /api/v1/admin/social-catalog/categories/:id` resuelve UUIDs, nombres textuales e IDs virtuales (`cat-*`, `prodcat-*`).
   - Si la categoría renombrada es virtual, la API crea automáticamente el registro oficial en `product_categories`.
2. **Propagación Masiva a Productos y Metadatos JSON**:
   - Se ejecuta `prisma.product.updateMany` buscando productos por `category` (igual a `oldName` o `id`), `categoryId` o `posCategoryId`, actualizando `product.category` al nuevo nombre.
   - Se recorren y actualizan las propiedades JSON en `metadata` (`posCategory`, `posCategoryName`, `categoryName`, `productCategory`, `productSubcategory`, `posSubcategory`).
3. **Propagación en CatalogService (`catalog.service.ts`)**:
   - `updateCategory` propaga automáticamente los cambios de nombre a los productos pertenecientes al tenant.
