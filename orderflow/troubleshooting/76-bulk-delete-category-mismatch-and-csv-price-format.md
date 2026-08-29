# Troubleshooting: Eliminación Masiva por Categoría & Formato de Precios CSV (Release v1.20.47)

**Fecha:** 2026-08-28  
**Área:** Backend / DynamicQueryBuilder / CSV Import / DataView  
**Estado:** ✅ Resuelto en Release `v1.20.47`  

---

## 🔍 Síntoma 1: Eliminación Masiva Requiere Varios Clics en Vistas Agrupadas

### Descripción:
Al seleccionar filas específicas en una vista agrupada por categoría en el DataView de productos y presionar **"Eliminar Seleccionados"**, los productos no se eliminaban a la primera y requerían volver a seleccionar y hacer clic varias veces.

### Causa Raíz:
- La interfaz enviaba simultáneamente la lista explícita de IDs (`selection.ids`) y el filtro de agrupación (`groupFilter = { field: 'category', value: 'BEBIDAS' }`).
- El generador de consultas `DynamicQueryBuilder` aplicaba un filtro relacional estricto sobre `category`. Si existía un descalce entre la cadena de texto `category` y las relaciones `categoryId` / `posCategoryId` en la base de datos PostgreSQL, la consulta SQL retornaba `0` registros afectados (`count: 0`).

### Solución Aplicada:
- En `DynamicQueryBuilder.buildPrismaWhere`, cuando la selección proviene de un conjunto explícito de filas (`selection.mode === 'selected'`), la consulta prioriza la lista de IDs directos (`WHERE tenantId = ... AND id IN (...)`), eliminando cualquier colisión con filtros de categoría.
- Para eliminación global (`mode === 'all'`), se implementó un bloque `OR` que busca simultáneamente en `category` (texto), `categoryId` y `posCategoryId`.

---

## 🔍 Síntoma 2: Formato de Precios Truncado al Importar Archivos CSV (`15.000` $\rightarrow$ `15`)

### Descripción:
Al importar catálogos de productos mediante archivos CSV con importes numéricos formateados con separadores de miles (ej. `15.000` o `18.000` PYG/ARS), los precios resultaban importados como `15` o `18`.

### Causa Raíz:
- La librería de lectura de hojas de cálculo (`SheetJS` / `xlsx`) interpretaba por defecto el punto de miles `.` de los textos CSV como separador decimal, convirtiendo el texto `"15.000"` al número float `15.0` antes de entregarlo a la función de parseo.

### Solución Aplicada:
- Se inyectó `{ raw: true, rawNumbers: false }` en las llamadas a `XLSX.read` en `products.controller.ts` y controladores asociados. Esto preserva las cadenas de texto originales `"15.000"`, permitiendo que la utilidad de parseo regional (`parseCurrencyNumber`) elimine los puntos de miles e importe el valor numérico exacto de `15000`.

---

## 🔍 Síntoma 3: Enriquecimiento de Columnas y Edición Completa en DataView de Productos

### Solución Aplicada:
- Se incorporaron las columnas de `skuInterno`, `barcode`, `description`, `posCategory`, `costPrice` y `active` en `columnsConfig` de `products.tsx`.
- Se amplió el formulario del modal de edición para visualizar y actualizar todos los campos del producto.
