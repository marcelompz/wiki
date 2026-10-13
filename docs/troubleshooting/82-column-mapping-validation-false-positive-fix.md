# Troubleshooting #82 — Falso Positivo de Mapeo de Columnas en Importación Masiva ("Falta mapear la columna requerida: name / price")

## 📋 Síntoma
Al subir un archivo CSV o Excel en el modal de **Carga Masiva de Productos** (`BulkUploadModal`), el sistema mostraba el mensaje de error:
`Falta mapear la columna requerida: name`
`Falta mapear la columna requerida: price`
y mantenía deshabilitado el botón de importación, aun cuando el usuario o el autodetección tenían asignadas las columnas correspondientes (ej. "DESCRIPCION NOMBRE", "PRECIO DE VENTA").

## 🔍 Causa Raíz
La función de validación `validateMapping` obtenía los valores del mapa `Object.values(columnMapping)` (que contiene los nombres reales de las columnas en el Excel subido, como `"DESCRIPCION NOMBRE"` o `"P. VENTA 1"`) y los comparaba mediante igualdad estricta `===` contra una lista estática de palabras clave (`['name', 'nombre']` y `['price', 'precio']`). Al no coincidir exactamente la cadena del Excel con las palabras del alias, la validación fallaba erróneamente indicando que la columna no estaba mapeada.

## 🛠️ Solución Aplicada
1. **Lógica de Validación Directa por Clave**: Se reemplazó la comparación por alias por una comprobación directa de la clave asignada: `isFieldMapped('name')` y `isFieldMapped('price')`. Si la propiedad `columnMapping['name']` y `columnMapping['price']` contiene cualquier columna válida seleccionada del Excel, la validación aprueba inmediatamente.
2. **Detección Automática Ampliada**: Se agregaron más sinónimos habituales en archivos comerciales (`descripcion nombre`, `detalle`, `articulo`, `p.venta`, `pvp`, `monto`, `rubro`, `familia`, `cod.barras`, etc.) en `BulkUploadModal.tsx` e `ImportWizardModal.tsx`.
3. **Acceso Permanente a la Codificación en Wizard**: Se garantizó que el selector de codificación de archivos (UTF-8, Windows-1252, ISO-8859-1) permanezca siempre visible en el paso 0 de `ImportWizardModal.tsx`.
4. Compilado y desplegado exitosamente en la versión **`v1.20.58`**.
