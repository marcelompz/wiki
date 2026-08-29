# **OmniFlow — Módulo Productos con Variantes e Importación Masiva (Patrón Odoo)**

# **1\. Objetivo y Alcance**

El presente documento detalla la arquitectura y el plan de ejecución para el sistema de gestión de productos de OmniFlow, adoptando el estándar de industria establecido por Odoo. El objetivo es proporcionar una estructura altamente escalable y flexible para catálogos complejos.

* **Ficha enriquecida por producto (product.template):** Centralización de la información general, metadatos y configuraciones globales del producto.  
* **Múltiples fotografías por template y por variante:** Soporte para galerías de imágenes con un sistema de fallback automático (si la variante no tiene foto, hereda la del template).  
* **Campo de especificaciones técnicas:** Implementación de un campo JSON estructurado para manejar detalles flexibles y fichas técnicas variables sin modificar el esquema.  
* **Atributos globales y reutilizables:** Modelo relacional Attribute \-\> AttributeValue para definir dimensiones (Talla, Color, Material) de forma estandarizada.  
* **Generación combinatoria cartesiana:** Motor de creación de variantes basado en el producto cartesiano de los atributos seleccionados, con capacidad de materialización selectiva.  
* **Módulo de Importación/Exportación masiva:** Procesamiento asíncrono de archivos CSV/XLSX con lógica de pre-validación (dry-run) para garantizar la integridad de los datos.  
* **Modelo de precio desacoplado:** Estructura basada en Precio Base (en el Template) sumado a un Sobreprecio o Delta (en la Variante).  
* **Integración de flujos:** Todos los módulos transaccionales (Stock, POS, Ventas) operan referenciando exclusivamente el identificador de la variante (ProductVariant.id).

# **2\. Plan de Implementación por Fases**

## **Fase 1: Modelo de datos (Prisma)**

Definición de las entidades base en el esquema de Prisma. Incluye la migración de productos existentes hacia el nuevo modelo creando una variante por defecto para cada uno, asegurando constraints de unicidad e índices para optimizar búsquedas por SKU y Handle.

## **Fase 2: Backend Core (NestJS)**

Desarrollo de los micro-servicios internos:

* **ProductsModule:** CRUD de plantillas de productos.  
* **AttributesModule:** Gestión de diccionarios de atributos y valores.  
* **VariantsModule:** Lógica del generador cartesiano y endpoints para actualizaciones masivas de deltas de precio y stock inicial.  
* **CatalogModule:** Motor de consulta optimizado para el frontend.

## **Fase 3: Módulo de Importación y Exportación Masiva**

Implementación de un sistema unificado por filas basado en un identificador único (handle). Utilización de parsers en streaming para manejar archivos de gran volumen y validación en dos etapas para minimizar errores en producción.

## **Fase 4: Procesamiento Asíncrono (Redis / BullMQ)**

Configuración de colas de trabajo para tareas pesadas:

* `import-products-process`: Procesamiento de filas del archivo.  
* `regenerate-variant-matrix`: Recalculo de combinaciones ante cambios en atributos.  
* `recalculate-template-aggregates`: Actualización de rangos de precios y stock total en el template.

## **Fase 5: Frontend / Admin (Refine.dev \+ Ant Design)**

Interfaz de administración avanzada:

* Gestor de atributos dinámico.  
* Ficha de producto con vista de matriz tipo hoja de cálculo para edición rápida.  
* Wizard de importación con mapeo de columnas y visualización de errores de validación.

## **Fase 6: Integración y Mapeo**

Alineación técnica con el estándar Odoo para facilitar interoperabilidad:

* `product.template` mapeado a la entidad `Product`.  
* `product.product` mapeado a la entidad `ProductVariant`.  
* Ajuste de los módulos de POS e Inventario para el consumo de variantes.

# **3\. Especificación de Endpoints REST (/api/v1/products/)**

| Método | Ruta | Descripción | Payload / Response |
| :---- | :---- | :---- | :---- |
| POST | `/` | Crear nuevo Product Template | `{ name, description, attributes: [] }` |
| GET | `/:id` | Obtener detalle de Template y sus variantes | `{ id, name, variants: [...] }` |
| POST | `/attributes` | Crear atributo global | `{ name, type, values: [] }` |
| GET | `/attributes` | Listar atributos y sus valores | `[{ id, name, values: [] }]` |
| POST | `/:id/matrix/preview` | Preview de variantes a generar | `{ attributeIds } -> [Combinaciones]` |
| POST | `/:id/variants/generate` | Ejecutar generación cartesiana | `{ selectedCombinations: [] }` |
| PATCH | `/variants/bulk-update` | Actualizar precios/deltas masivamente | `{ variants: [{ id, priceDelta }] }` |
| POST | `/import/template` | Descargar plantilla CSV/XLSX | Archivo binario |
| POST | `/import/validate` | Validar archivo (Dry-run) | `{ fileId } -> { errors: [], count: 0 }` |
| POST | `/import/execute` | Iniciar procesamiento real | `{ fileId } -> { jobId }` |
| GET | `/import/status/:jobId` | Consultar progreso de importación | `{ progress: 85, status: 'processing' }` |
| GET | `/export` | Exportar catálogo completo | Archivo CSV/XLSX |

# **4\. Schema Completo de Prisma**

model Tenant {

  id        String    @id @default(uuid())

  name      String

  products  Product\[\]

}

model Product {

  id              String                 @id @default(uuid())

  handle          String                 @unique

  name            String

  description     String?

  basePrice       Decimal                @default(0)

  specs           Json?                  // Detalles técnicos flexibles

  tenantId        String

  tenant          Tenant                 @relation(fields: \[tenantId\], references: \[id\])

  attributes      ProductAttributeLine\[\]

  variants        ProductVariant\[\]

  photos          Photo\[\]

  createdAt       DateTime               @default(now())

  updatedAt       DateTime               @updatedAt

  @@index(\[tenantId\])

}

model Attribute {

  id       String           @id @default(uuid())

  name     String           @unique // Ej: Color, Talla

  values   AttributeValue\[\]

}

model AttributeValue {

  id          String                 @id @default(uuid())

  name        String                 // Ej: Rojo, XL

  attributeId String

  attribute   Attribute              @relation(fields: \[attributeId\], references: \[id\])

  variants    VariantAttributeValue\[\]

  productLines ProductAttributeLine\[\]

}

model ProductAttributeLine {

  id          String           @id @default(uuid())

  productId   String

  product     Product          @relation(fields: \[productId\], references: \[id\])

  attributeId String

  values      AttributeValue\[\] // Valores disponibles para este producto

}

model ProductVariant {

  id              String                 @id @default(uuid())

  sku             String                 @unique

  barcode         String?

  priceDelta      Decimal                @default(0) // Sobreprecio

  stock           Int                    @default(0)

  productId       String

  product         Product                @relation(fields: \[productId\], references: \[id\])

  attributeValues VariantAttributeValue\[\]

  photos          Photo\[\]

}

model VariantAttributeValue {

  variantId        String

  attributeValueId String

  variant          ProductVariant @relation(fields: \[variantId\], references: \[id\])

  attributeValue   AttributeValue @relation(fields: \[attributeValueId\], references: \[id\])

  @@id(\[variantId, attributeValueId\])

}

model Photo {

  id               String          @id @default(uuid())

  url              String

  order            Int             @default(0)

  productId        String?

  product          Product?        @relation(fields: \[productId\], references: \[id\])

  productVariantId String?

  variant          ProductVariant? @relation(fields: \[productVariantId\], references: \[id\])

}

model ImportBatch {

  id        String   @id @default(uuid())

  status    String   // PENDING, PROCESSING, COMPLETED, FAILED

  log       Json?

  createdAt DateTime @default(now())

}

# **5\. Jobs de BullMQ**

1. **import-products-process**:  
   * **Trigger:** Al confirmar la ejecución de una importación.  
   * **Payload:** `batchId`, `fileUrl`, `tenantId`.  
   * **Acción:** Parsea el archivo, agrupa por handle y ejecuta la creación/actualización de templates y variantes.  
2. **regenerate-variant-matrix**:  
   * **Trigger:** Cambio en los `ProductAttributeLine` de un producto existente.  
   * **Payload:** `productId`.  
   * **Acción:** Identifica nuevas combinaciones posibles y archiva las variantes que ya no tienen valores de atributos válidos.  
3. **recalculate-template-aggregates**:  
   * **Trigger:** Actualización de stock o precio en cualquier variante.  
   * **Payload:** `productId`.  
   * **Acción:** Calcula el `minPrice`, `maxPrice` y `totalStock` a nivel de `Product` para visualización rápida en catálogos.

# **6\. Consideraciones Técnicas de Importación CSV / XLSX**

* **Agrupación por Handle:** El sistema debe identificar filas que pertenecen al mismo producto (template) mediante una columna `handle`. Si el handle cambia, se considera un producto nuevo.  
* **Resolución en Memoria:** Durante el procesamiento de filas, los atributos y valores deben cargarse en un caché local de la ejecución para evitar miles de consultas a la base de datos (Look-up optimization).  
* **Reglas de Precios:** Si una fila de variante tiene un precio final, el sistema debe calcular automáticamente el `priceDelta` restando el `basePrice` del template.  
* **Validación Dry-run:** Antes de insertar, se debe verificar que todos los atributos existen o pueden ser creados, y que no hay SKUs duplicados en el archivo o en el tenant.  
* **Transaccionalidad:** Cada producto (incluyendo todas sus variantes) debe procesarse dentro de una transacción única de base de datos para evitar estados inconsistentes (productos a medias).

# **7\. Prompt de Implementación Técnica Actualizado**

**Actúa como Ingeniero Senior de Software en OmniFlow.**

**Tarea:** Implementar el Módulo de Productos con Variantes e Importación Masiva siguiendo el patrón de arquitectura de Odoo.**Requisitos Técnicos:**

1. Utilizar **NestJS** para el backend y **Prisma ORM** con PostgreSQL.  
2. Implementar la lógica de generación cartesiana de variantes en un `VariantsService` dedicado.  
3. Configurar **BullMQ** con Redis para el procesamiento asíncrono de importaciones, asegurando que las validaciones de "Dry-run" no persistan datos.  
4. El sistema de importación debe soportar archivos CSV/XLSX y agrupar variantes bajo un mismo `Product` usando el campo `handle`.  
5. Garantizar que el esquema de precios use `Decimal` para precisión financiera, aplicando la lógica de `basePrice + priceDelta`.  
6. Asegurar que las imágenes tengan lógica de fallback: `variant.photo || template.photo[0]`.  
7. Exponer los endpoints REST documentados en la especificación técnica.

**Entregables:** Código de modelos de Prisma, servicios de lógica de negocio, controladores de API y configuración de workers para Jobs.