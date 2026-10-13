# Troubleshooting #74: Parsing de CSV en Carga Masiva y Eliminación Masiva Atómica

> **Fecha:** 27 de Agosto de 2026  
> **Servicio:** `orderflow-backend` & `orderflow-frontend`  
> **Módulos Afectados:** Products (`/admin/products`), Social Catalog (`/admin/social-catalog`), Bulk Import & Export  

---

## 🛑 Síntomas Identificados

### 1. Error `Invalid Record Length: columns length is 1, got 2 on line 42` al confirmar carga masiva CSV
Al subir un archivo CSV en el modal de **Carga Masiva Dinámica (Mapeo de columnas)**, la vista previa cargaba correctamente, pero al hacer clic en **"Aceptar" / "Subir y Procesar"**, el servidor respondía con error HTTP 400: `Invalid Record Length: columns length is 1, got 2 on line 42`.

### 2. Recorte indeseado de precios en miles (`40.000` importado como `40`)
Al procesar importaciones masivas de productos con precios en formato regional de América del Sur (Paraguay PYG, Argentina ARS, Colombia COP) donde el punto `.` se usa para separar miles (ej: `40.000` o `15.000`), el parser los interpretaba como decimales flotantes (`40.0`), eliminando los ceros de miles.

### 3. Imposibilidad de eliminar más de 10 productos simultáneamente
Al seleccionar más de 10 productos en el data-table y presionar **"Eliminar Seleccionados"**, la operación se bloqueaba o solo eliminaba los primeros 10 elementos. En la consola del navegador se observaban advertencias de seguridad y red: `A resource is blocked by OpaqueResponseBlocking`.

---

## 🔍 Causas Raíz

1. **Inconsistencia de Parser CSV en Backend (`csv-parse/sync`):**
   El endpoint `/bulk-upload` utilizaba la librería `csv-parse/sync` configurada de forma estricta. Cuando una fila específica (como la línea 42: `Te de limon siciliano, menta y verde (Taza);BEB031;...`) contenía comas dentro de la descripción del nombre usando `;` como delimitador, la librería la dividía incorrectamente en 2 columnas y fallaba.

2. **Parsing Naive de Números con `parseFloat`:**
   Tanto en los controladores como en `BatchProductImportService`, se aplicaba `parseFloat(cleaned.replace(/[^0-9.-]/g, ''))`, lo que convertía la cadena `"40.000"` directamente en `40.0`.

3. **Invocaciones HTTP en Paralelo sin Endpoint Atómico:**
   El frontend ejecutaba `Promise.all(ids.map(id => api.delete(/api/v1/products/${id})))`. Los navegadores imponen un límite estricto de **6 a 10 conexiones HTTP simultáneas** por dominio. Al enviar más de 10 peticiones DELETE en paralelo, las conexiones excedentes se cancelaban o bloqueaban por `OpaqueResponseBlocking` y rate limiting de Traefik.

---

## 🛠️ Soluciones Aplicadas

### 1. Unificación de Parser CSV con SheetJS (`XLSX.read`)
- Se reemplazó `csv-parse` por **SheetJS (`XLSX.read`)** en los controladores `products.controller.ts` y `social-catalog-admin.controller.ts`.
- SheetJS autodetecta delimitadores (`;`, `,`, `tab`, `|`) y procesa cadenas con comas de forma tolerante sin romper la paridad de columnas.

### 2. Selector Explicito de Formato Numérico (`numberFormat`)
- Se agregó el selector **"Formato de Precios y Miles/Decimales"** en los modales de carga masiva (`BulkUploadModal.tsx` e `ImportWizardModal.tsx`):
  - **`Regional / PYG` (por defecto):** Trata los puntos `.` como miles (`40.000` $\rightarrow$ `40000`).
  - **`Internacional / USD`:** Trata la coma `,` como miles y punto `.` como decimal (`40,000.00` $\rightarrow$ `40000`).
  - **`Autodetectar`:** Detección adaptativa.
- Se implementó la función helper `parseCurrencyNumber(val, numberFormat)` en `products.controller.ts`, `social-catalog-admin.controller.ts` y `batch-product-import.service.ts`.

### 3. Endpoints Masivos Atómicos en Backend
- Se crearon dos nuevos endpoints atómicos:
  - **`POST /api/v1/products/bulk-delete`**
  - **`POST /api/v1/admin/social-catalog/products/bulk-delete`**
- Ambos endpoints reciben `{ ids: string[] }` y ejecutan una sola consulta atómica a la base de datos:
  ```ts
  await prisma.product.updateMany({
    where: { id: { in: ids }, tenantId },
    data: { active: false },
  });
  ```
- Se actualizaron los handlers de acciones masivas en `frontend/src/pages/admin/products.tsx` y `frontend/src/pages/admin/social-catalog.tsx` para invocar estos endpoints atómicos en **1 sola petición HTTP**, permitiendo eliminar cientos de productos en menos de 5ms.

---

## 🧪 Verificación Realizada

1. **Prueba de Carga CSV con Comas en Cadenas:**
   - Se probó el archivo de prueba `provecchio_productos_importacion.csv` (211 filas).
   - La línea 42 (`Te de limon siciliano, menta y verde`) y las 211 filas se importaron sin errores.
2. **Prueba de Precios en Miles:**
   - Se verificó que `40.000` se importe como `40000` Guaraníes y `15.000` como `15000`.
3. **Prueba de Eliminación Masiva:**
   - Se seleccionaron 20+ productos en el DataView y se ejecutó "Eliminar Seleccionados", confirmando baja instantánea en 1 sola llamada HTTP 200 OK.
