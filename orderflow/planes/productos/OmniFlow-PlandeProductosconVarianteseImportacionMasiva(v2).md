# **OmniFlow — Módulo Productos con Variantes (patrón Odoo)**

## **1\. Objetivo**

Rediseñar el módulo **Productos** de OmniFlow para soportar:

* Endpoint de detalle enriquecido por producto (ficha completa).  
* Arquitectura de fotografías desacoplada: las fotos pertenecen al Producto (template) o a la Variante. Nunca son globales al atributo/valor. Implementar fallback automático: si la variante no tiene fotos específicas, se sirven las del template.  
* Campo de detalles/especificaciones flexible (JSON estructurado).  
* Variantes genéricas y reutilizables (Atributos → Valores) independientes a nivel de Tenant y aplicables a cualquier producto, siguiendo el patrón `product.template` / `product.product` de Odoo.  
* Asignación flexible de subconjuntos de valores por producto (un producto puede usar solo un subconjunto de los valores posibles de un atributo global).  
* Generación combinatoria de variantes (ej. Medidas × Colores) con posibilidad de materializar solo las combinaciones deseadas.  
* Módulo de Importación y Exportación masiva de productos (CSV y XLSX) que soporte productos con y sin variantes de forma unificada mediante identificador `handle`, con validación previa (dry-run) y procesamiento asíncrono en background.  
* Modelo de precios desacoplado: Precio Base en Template \+ Sobreprecio (`priceDelta`) en Variante. El sobreprecio es estrictamente contextual: vive en `ProductVariant` y es específico para cada producto; los atributos globales son puramente taxonómicos y no contienen información de precios.  
* Integración de stock, compras y POS referenciando exclusivamente la variante (`ProductVariant.id`).

---

## **2\. Plan de implementación**

### **Fase 1 — Modelo de datos (Prisma)**

* Crear entidades base: `Attribute`, `AttributeValue`, `Product` (template), `ProductAttributeLine`, `ProductVariant`, `VariantAttributeValue`, `Photo`, `ImportBatch`.  
* Definir la independencia de `Attribute` y `AttributeValue` a nivel Tenant, y la relación en `ProductAttributeLine` con el subconjunto de `AttributeValue` seleccionados (`values AttributeValue[]`, análogo a `value_ids` de Odoo).  
* Migrar productos existentes: cada producto actual se convierte en `Product` (template) con **una sola variante por defecto** (`isDefault: true`, sin atributos asociados, `priceDelta: 0`), para no romper stock/ventas/POS ya cargados.  
* Índices y constraints: `@@unique([productId, sku])` en variantes, `@@unique([tenantId, handle])` en templates, índice compuesto único en `VariantAttributeValue` para evitar combinaciones duplicadas por variante, e índices en `barcode` y `sku`.  
* **Regla arquitectónica de desacoplamiento total:** Precio base y fotos generales en `Product` (template); sobreprecio (`priceDelta`), stock y fotos contextuales en `ProductVariant`. Los Atributos/Valores maestros son puramente taxonómicos y descriptivos: NO contienen información de precios ni imágenes universales.

### **Fase 2 — Backend (NestJS)**

* Módulo `ProductsModule`: CRUD de `Product` (template) con fotos, specs y estados.  
* Módulo `AttributesModule`: CRUD de `Attribute` / `AttributeValue`, reutilizable entre productos y tenants, con normalización y búsqueda insensible a mayúsculas.  
* Módulo `VariantsModule`:  
  * Endpoint de generación de variantes: recibe un `productId` \+ lista de `attributeId` con sus `valueIds` seleccionados → genera el producto cartesiano y crea las filas de `ProductVariant` faltantes (idempotente, no duplica combinaciones existentes).  
  * Endpoint de actualización masiva (Bulk Update): actualización de sobreprecios (`priceDelta`) o stock filtrada por valor de atributo. Esta operación está acotada exclusivamente al producto editado (`PATCH /api/v1/products/:productId/variants/bulk-update`) sin afectar al resto del catálogo.  
  * CRUD puntual de variante: ajuste fino de SKU, código de barras, stock, delta y galería de fotos específica (contextual a la combinación).  
* Lógica de Fallback de Imágenes: el servicio/DTO debe resolver la prioridad de visualización. Si variant.photos está vacío, retornar product.photos para asegurar que el POS/Ecommerce siempre muestre contenido visual.  
* Endpoint de detalle de producto: devuelve template \+ fotos \+ líneas de atributos con sus valores seleccionados \+ lista de variantes con su stock/precio final calculado.  
* Endpoint de listado/catálogo: agregación por template (precio mínimo/máximo, stock total, cantidad de variantes) para evitar explosión de filas en las grillas.  
* Validaciones: no permitir eliminar un `AttributeValue` en uso por variantes activas, no permitir variantes duplicadas (misma combinación de valores en el mismo template).

### **Fase 3 — Importación y Exportación Masiva (CSV / XLSX)**

* Diseño de plantilla unificada: soporte de columnas `template_photos` (lookbook/generales) y `variant_photos` (específicas por combinación), procesadas atómicamente por `handle`.  
* Servicio `ProductsImportService`:  
  * Parser en streaming con `csv-parser` y `exceljs` para procesamiento de alto volumen con consumo constante de memoria.  
  * Algoritmo de agrupación en memoria por `handle` para resolver la creación atómica del Template y sus N variantes.  
  * Auto-resolución y creación idempotente de `Attribute` y `AttributeValue` globales si no existen en el tenant.  
  * Vinculación automática del subconjunto de valores a `ProductAttributeLine`.  
  * Cálculo automático de `priceDelta` en base a precio base y precio final proporcionado.  
* Validación en Dos Fases:  
  * Endpoint de Pre-validación / Dry-run (`POST /products/import/validate`): analiza el archivo sin persistir cambios y retorna reporte exhaustivo de errores clasificados por fila, columna y severidad (SKUs duplicados, combinaciones repetidas, precios inconsistentes).  
  * Endpoint de Ejecución (`POST /products/import/execute`): encola la importación en background mediante BullMQ.  
* Exportador (`GET /products/export`): exportación completa del catálogo a CSV/XLSX preservando la estructura jerárquica de templates y variantes.

### **Fase 4 — Procesamiento asíncrono (Redis/BullMQ)**

* Job `import-products-process`: procesamiento en background de archivos masivos con reporte de progreso porcentual vía WebSocket/polling y almacenamiento del log de errores en `ImportBatch`.  
* Job `regenerate-variant-matrix`: para catálogos grandes, correr la generación combinatoria en background y notificar al finalizar.  
* Job `recalculate-template-aggregates`: recálculo de vistas agregadas (precio mínimo/máximo y stock total por template) cuando cambia una variante o tras una importación masiva, evitando cálculos en caliente en cada request.

### **Fase 5 — Frontend/Admin (Refine.dev \+ Ant Design)**

* Pantalla de gestión de Atributos y Valores (reutilizable, independiente del producto).  
* En el formulario de producto: selector multi-atributo con sus valores disponibles → botón "Generar variantes" que muestra preview de la matriz antes de confirmar.  
* Vista tipo **matriz/spreadsheet** para edición bulk de sobreprecio/stock por variante. Las acciones masivas (ej. "+$500 a todos los G") modifican únicamente los deltas de las variantes del producto actual a través del endpoint de bulk-update específico para ese `productId`.  
* Grilla de fotos: fotos generales del template \+ fotos específicas por variante (opcional, con fallback visual a las del template).  
* Listado de catálogo mostrando template con "desde $X" (precio mínimo entre variantes activas) y fila expandible con el desglose de variantes.  
* Módulo de Importación/Exportación: interfaz drag-and-drop con botón de descarga de plantilla (`.csv` / `.xlsx`), tabla de preview con badge de errores por fila y barra de progreso de importación en tiempo real.

### **Fase 6 — Integración con Odoo**

* Mapeo de campos: `Product` ↔ `product.template`, `ProductVariant` ↔ `product.product`, `Attribute`/`AttributeValue` ↔ `product.attribute`/`product.attribute.value`, `ProductAttributeLine` ↔ `product.template.attribute.line`.  
* Definir dirección de sincronización (OmniFlow → Odoo, Odoo → OmniFlow, o bidireccional) y estrategia de resolución de conflictos por `sku`.

### **Fase 7 — POS / Inventario**

* Asegurar que toda venta, ítem de comanda, remisión y movimiento de stock referencie `ProductVariant.id`, nunca `Product.id`.  
* Actualizar buscador de POS para filtrar por combinación de atributos (ej. escanear código de barras de variante o tipear "Remera \+ Negro \+ L").

---

## **3\. Prompt de implementación técnica**

Actuás como arquitecto de software senior especializado en NestJS \+ Prisma \+ PostgreSQL \+ BullMQ.  
CONTEXTO DEL PROYECTO:  
OmniFlow es un ERP / POS multi-tenant con:  
\- Backend: NestJS (TypeScript)  
\- ORM: Prisma sobre PostgreSQL  
\- Frontend/admin: Refine.dev con Ant Design  
\- Procesamiento asíncrono: Redis \+ BullMQ  
\- Integración/alineación conceptual con Odoo (product.template / product.product)  
TAREA:  
Necesito rediseñar el módulo Productos para soportar variantes genéricas y reutilizables siguiendo el patrón product.template / product.product de Odoo, e implementar un subsistema robusto de importación y exportación masiva en formatos CSV y XLSX.  
REQUISITOS FUNCIONALES:

* Un producto (template) tiene: nombre, handle único (slug), descripción, campo de detalles/especificaciones flexible (JSON), precio base y múltiples fotografías generales.  
* Existen Atributos globales (ej. "Medida", "Color", "Talle", "Calce") con Valores propios (ej. Medida: P, M, G, EG — Color: Azul, Verde, Rojo, Amarillo), independientes de los productos y reutilizables entre distintos productos y tenants.  
* Un producto template puede tener asignados uno o más atributos con un subconjunto de sus valores posibles (ej. Producto A usa Color: \[Blanco, Negro\], Producto B usa Color: \[Rojo, Azul, Verde\]).  
* A partir de esa asignación, el sistema debe poder generar automáticamente el producto cartesiano de variantes (ej. 4 medidas x 6 colores \= hasta 24 variantes), de forma idempotente (no duplicar combinaciones ya creadas) y permitiendo generar solo un subconjunto selectivo.  
* Cada variante tiene su propio SKU único, código de barras, stock, costo y un sobreprecio (priceDelta) que se suma al precio base del template. **Requisito no negociable:** el priceDelta debe residir en ProductVariant para garantizar el aislamiento por producto. Los Atributos/Valores globales son puramente taxonómicos; el mismo valor puede tener sobreprecios diferentes (o cero) en distintos productos según el contexto del template.  
* Los productos simples (sin variantes) se gestionan bajo la misma arquitectura teniendo exactamente una variante por defecto (isDefault: true, priceDelta: 0, sin líneas de atributos).  
* Todo el stock, compras, ventas y transacciones de POS deben referenciar siempre ProductVariant.id, nunca el template directamente.  
* El listado/catálogo debe poder mostrar el template agregando datos de sus variantes (precio mínimo/máximo "desde $X", stock total, conteo de variantes) con soporte de precalculado asíncrono vía BullMQ para evitar degradación.  
* Subsistema de Importación Masiva CSV/XLSX:  
  * Archivo unificado por filas donde filas consecutivas con el mismo 'handle' componen un template y sus variantes. Productos simples ocupan 1 fila.  
  * Parser en streaming (csv-parser / exceljs) con agrupación en memoria por handle.  
  * Creación/resolución idempotente de Atributos y Valores globales en el tenant.  
  * Validación en 2 etapas: Endpoint de Dry-run (pre-validación sin persistir con reporte de errores por fila/campo) y Endpoint de Ejecución con encolado en BullMQ.  
  * Cálculo automático de priceDelta cuando el archivo trae precio base y precio final.

ENTREGABLES ESPERADOS:  
1\. Schema Prisma: `Attribute` y `AttributeValue` sin campos de precio ni fotos. `Product` con `basePrice` y `photos[]`. `ProductVariant` con `priceDelta`, `stock` y `photos[]` específicos. Garantizar transaccionalidad e idempotencia en la creación del grafo de objetos por handle.  
2\. Estrategia de migración de productos ya existentes en producción hacia este nuevo modelo (cada producto actual pasa a tener una variante única por defecto, sin romper referencias de stock/ventas actuales).  
3\. Especificación de endpoints REST bajo /api/v1/products/ en formato tabla (método, ruta, descripción, payload/response resumido), incluyendo CRUD de templates, atributos/valores, preview de matriz, generación de variantes, bulk-update de deltas, descarga de plantilla, validación dry-run, ejecución de importación, estado de job y exportación.  
4\. Definición de los jobs de BullMQ necesarios (import-products-process, regenerate-variant-matrix, recalculate-template-aggregates) con su payload y trigger.  
5\. Servicio de importación ProductsImportService en TypeScript con parsing en stream, agrupación por handle, resolución de atributos y transaccionalidad atómica por template.  
6\. Recomendaciones específicas de índices/consultas en PostgreSQL para soportar filtros por combinación de atributos y búsqueda rápida por SKU/barcode.  
7\. Notas de compatibilidad con el modelo de datos de Odoo (product.template / product.product / product.attribute / product.template.attribute.line).  
8\. Diseño de un endpoint de "bulk update" de sobreprecio que permita aplicar un delta a un subconjunto de variantes filtradas por valor de atributo (ej. sumar $500 a todas las variantes con Medida \= G).  
FORMATO DE RESPUESTA:  
Markdown, con el schema de Prisma en un bloque de código y los endpoints en formato tabla.  
---

## **4\. Decisiones de diseño confirmadas**

* **Modelo de precio: base \+ sobreprecio por variante (estilo Odoo).** El `priceDelta` es 100% contextual y vive en `ProductVariant`. Los atributos y valores son maestros taxonómicos sin precio. Un cambio en el delta de un "Talle XL" en un producto no afecta a otros productos con el mismo atributo.  
* **Fotos por variante con fallback (Regla de Oro):** Las fotos pertenecen al contexto (Producto o Variante), nunca al Atributo global. Una variante muestra sus propias fotos si existen; de lo contrario, consume las del template automáticamente en API/Frontend.  
* **Precio/stock siempre en variante**, incluso para productos sin atributos (variante única "default"), para no tener dos caminos de código distintos en POS/inventario.  
* **Atributos globales reutilizables con subconjuntos por producto.** Los atributos y valores son maestros independientes por tenant. Cada producto matriz se vincula mediante `ProductAttributeLine` a los atributos que utiliza y almacena en su relación `values` (`value_ids`) el subconjunto específico de valores activos para ese template.  
* **Plantilla unificada por handle para importación CSV/XLSX.** Un producto simple equivale a 1 fila con columnas de atributos vacías; un producto con variantes equivale a N filas con el mismo `handle` y sus respectivas combinaciones de atributos.  
* **Validación en 2 fases para importación masiva.** Pre-validación (Dry-run) inmediata para feedback de errores por fila en UI \+ procesamiento asíncrono transaccional encolado en BullMQ.

---

## **5\. Notas de diseño aún pendientes de decidir**

* **¿Agregación de catálogo en tiempo real o precalculada?** Definir umbral de cantidad de productos/variantes a partir del cual conviene precalcular con BullMQ en vez de calcular en cada request (ej. calcular en caliente si `< 5.000` variantes totales en el tenant; precalcular y cachear en Redis si `>= 5.000`).  
* **¿Cómo se muestra el precio del template en el listado cuando hay múltiples deltas?** Se confirma la estrategia "desde $X" tomando `basePrice + min(priceDelta)` de las variantes activas con stock disponible.  
* **Estrategia ante errores parciales en importación masiva**: Definir si un template con una variante errónea debe fallar en bloque (rollback del template completo pero continuar con los demás templates del archivo vía `skipOnError: true`) o abortar la importación entera.

# 

