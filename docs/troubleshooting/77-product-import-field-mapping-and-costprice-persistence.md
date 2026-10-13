# Troubleshooting #77: Mapeo de Columnas, Omitir Campo (__SKIP__) y Persistencia de Precio de Costo / Categorías PDV en Importación

## 📌 Síntoma / Problema
1. Al importar productos vía CSV/Excel (Carga Masiva o Wizard), los datos de **Precio de Costo** (`costPrice`), **Subcategoría de Producto**, **Categoría de PDV** y **Subcategoría de PDV** no se guardaban o no avanzaban a la base de datos.
2. Al intentar excluir/omitir un campo del selector de mapeo en los modales, la columna no permitía deseleccionar o no descartaba el valor durante el procesamiento.
3. En tema oscuro, los contenedores del modal de importación mostraban tarjetas con fondo blanco/claro perdiendo legibilidad.

---

## 🔍 Causa Raíz

1. **Descarte de campos en `products.controller.ts` (`@Post('bulk-upload')`)**:
   La función que parseaba las filas del archivo Excel/CSV mapeaba únicamente `name`, `price`, `stock`, `category`, `description`, `barcode` y `skuInterno`. Las propiedades `costPrice`, `productSubcategory`, `posCategory` y `posSubcategory` no eran incluidas en el objeto retornado, descartándose antes de invocar los servicios de negocio.
2. **Omisión de `costPrice` en Prisma (`products.service.ts`)**:
   Las llamadas `prisma.product.create` y `prisma.product.update` en `bulkUploadProducts` no incluían `costPrice`.
3. **Mapeo de Alias Colisionados**:
   El alias del detector de columnas asignaba la palabra `"costo"` indistintamente a `price` (Precio de Venta) y `costPrice`.
4. **Falta de opción `__SKIP__`**:
   Los selectores `Select` de mapeo de columnas carecían de la opción explícita `__SKIP__` (`🚫 Omitir (No importar campo)`).

---

## 🛠️ Solución Aplicada

1. **Opción de Omitir Campo (`__SKIP__`)**:
   Se agregó en `ImportWizardModal.tsx` y `BulkUploadModal.tsx` la opción inicial `__SKIP__` en cada selector de columna.
2. **Separación de Alias**:
   En `detectColumnMapping`:
   - `price`: `['precio venta', 'precio_venta', 'precio', 'price', 'importe', 'valor']`
   - `costPrice`: `['precio costo', 'precio_costo', 'costo', 'costprice', 'cost_price', 'cost']`
3. **Persistencia Completa en Backend**:
   - En `products.controller.ts`, se implementó `getMappedOrPick` para retornar los 11 campos incluyendo `costPrice`, `productSubcategory`, `posCategory` y `posSubcategory`, reconociendo `__SKIP__`.
   - En `products.service.ts`, se actualizó `bulkUploadProducts` para guardar y actualizar `costPrice`.
   - En `batch-product-import.service.ts`, se incluyó `costPrice` en el `update` de la transacción.
4. **Tema Oscuro Dinámico**:
   Se reemplazaron estilos inline hardcodeados por `token.colorBgElevated`, `token.colorBgContainer` y `token.colorBorderSecondary`.

---

## 🧪 Verificación & QA
- `npm run build` en backend y frontend sin errores TypeScript.
- Carga masiva y Wizard de importación probados en producción (`v1.20.50`), creando correctamente las jerarquías de categorías PDV y precios de costo.
