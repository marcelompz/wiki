# Diagnóstico Paso 1 — Lectores y Escritores de `Product.stockAvailable`

**Objetivo:** mapear todos los puntos de código que leen o escriben `stockAvailable` antes de migrar a `StockQuant` como fuente de verdad.

## Tabla de diagnóstico

| Archivo | Línea | Lectura/Escritura | Tipo de escritura | Flujo |
|---------|-------|-------------------|-------------------|-------|
| `backend/src/orders/orders.service.ts` | 47 | Lectura | `select` | Venta |
| `backend/src/orders/orders.service.ts` | 242 | Lectura | `if (product.stockAvailable >= line.quantity)` | Venta |
| `backend/src/orders/orders.service.ts` | 245 | **Escritura** | `decrement` relativo | Venta |
| `backend/src/orders/orders.service.ts` | 483 | Lectura | `include` | Venta |
| `backend/src/orders/orders.service.ts` | 494 | **Escritura** | `increment` relativo | Devolución/Cancelación |
| `backend/src/products/products.service.ts` | 57 | Lectura | `where.stockAvailable = { gt: 0 }` | Catálogo |
| `backend/src/products/products.service.ts` | 97 | Lectura | `select` | Catálogo |
| `backend/src/products/products.service.ts` | 117 | Lectura | `select` | Catálogo |
| `backend/src/products/products.service.ts` | 178 | Lectura | `select` | Catálogo |
| `backend/src/products/products.service.ts` | 198 | Lectura | `select` | Catálogo |
| `backend/src/products/products.service.ts` | 289 | **Escritura** | `set absoluto` | Carga masiva |
| `backend/src/products/products.service.ts` | 311 | **Escritura** | `set absoluto` | Carga masiva |
| `backend/src/products/sync-products.controller.ts` | 67 | **Escritura** | `set absoluto` | Sync ERP |
| `backend/src/products/sync-products.controller.ts` | 89 | **Escritura** | `set absoluto` | Sync ERP |
| `backend/src/products/sync-products.controller.ts` | 132 | **Escritura** | `set absoluto` | Sync ERP |
| `backend/src/products/services/variants.service.ts` | 126 | **Escritura** | `set absoluto` | Variantes |
| `backend/src/products/services/variants.service.ts` | 176 | **Escritura** | `set absoluto` | Variantes |
| `backend/src/products/services/batch-product-import.service.ts` | 85 | **Escritura** | `set absoluto` | Import |
| `backend/src/products/services/batch-product-import.service.ts` | 187 | **Escritura** | `set absoluto` | Import |
| `backend/src/products/services/batch-product-import.service.ts` | 253 | **Escritura** | `set absoluto` | Import |
| `backend/src/products/services/batch-product-import.service.ts` | 349 | Lectura | `variantStock` | Import |
| `backend/src/products/services/batch-product-import.service.ts` | 367 | Lectura | `variantStock` | Import |
| `backend/src/social-catalog/social-catalog-admin.controller.ts` | 220 | **Escritura** | `set absoluto = 0` | Admin placeholder |
| `backend/src/product-imports/product-imports.service.ts` | 179 | **Escritura** | `set absoluto` | Import |
| `backend/src/product-imports/product-imports.service.ts` | 196 | **Escritura** | `set absoluto` | Import |
| `backend/src/catalog/catalog.service.ts` | 378 | **Escritura** | `set absoluto` | Catálogo/import |

## Resumen

- **Total escritores directos:** 14 archivos
- **Flujos críticos:** `orders.service.ts` (ventas), `sync-products.controller.ts` (ERP), `variants.service.ts` (variantes)
- **Lectores:** catálogo, social-catalog, biolinks, analytics — no requieren cambios funcionales, solo comentarios en Paso 5.

## Estado de migración por archivo (Paso 4)

| Archivo | Estado | Nota |
|---------|--------|------|
| `orders.service.ts` | ⏸️ No migrado | Flujo crítico de ventas. Queda para Paso 3 con feature flag. |
| `sync-products.controller.ts` | ✅ Migrado | Sync ERP ahora usa `InventoryService.adjustStock()` con referencia 'Ajuste por sincronización externa'. |
| `variants.service.ts` | ✅ Migrado (createVariants) | Stock total de variantes ahora usa `InventoryService.adjustStock()` al producto base. |
| `batch-product-import.service.ts` | ✅ Migrado | Importación masiva Excel ahora usa `InventoryService.adjustStock()`. |
| `products.service.ts` | ✅ Migrado (create/update/bulkUpload) | create/update ahora usan `InventoryService.adjustStock()` cuando reciben `stockAvailable`. |
| `social-catalog-admin.controller.ts` | ✅ Migrado | Placeholder de categorías ahora usa `InventoryService.adjustStock()`. |
| `product-imports.service.ts` | ✅ Migrado | Importación desde scraper ahora usa `InventoryService.adjustStock()`. |
| `catalog.service.ts` | ✅ Migrado | Importación de catálogo ahora usa `InventoryService.adjustStock()`. |

## Próximos pasos seguros

1. **Paso 4 (continuación):** Migrar `sync-products.controller.ts` usando `adjustStock()` con tipo "ajuste por sincronización externa".
2. **Paso 5:** Documentar lecturas y marcar `stockAvailable` como cache.
3. **Paso 3:** Solo después de validar Paso 4 completo, migrar `orders.service.ts` detrás de feature flag `USE_DOUBLE_ENTRY_STOCK`.
