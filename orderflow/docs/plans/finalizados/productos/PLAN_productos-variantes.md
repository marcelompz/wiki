# OmniFlow — Módulo Productos con Variantes (patrón Odoo)

## 1. Objetivo

Rediseñar el módulo **Productos** de OmniFlow para soportar:

- Endpoint de detalle enriquecido por producto (ficha completa).
- Múltiples fotografías por producto y por variante.
- Campo de detalles/especificaciones flexible.
- Variantes genéricas y reutilizables (Atributos → Valores) aplicables a cualquier producto, siguiendo el patrón `product.template` / `product.product` de Odoo.
- Generación combinatoria de variantes (ej. Medidas × Colores) con posibilidad de materializar solo las combinaciones deseadas.

---

## 2. Plan de implementación

### Fase 1 — Modelo de datos (Prisma)

1. Crear entidades base: `Attribute`, `AttributeValue`, `Product` (template), `ProductAttributeLine`, `ProductVariant`, `VariantAttributeValue`, `Photo`.
2. Migrar productos existentes: cada producto actual se convierte en `Product` (template) con **una sola variante por defecto** (sin atributos), para no romper stock/ventas/POS ya cargados.
3. Índices: `@@unique([productId, sku])` en variantes, índice compuesto en `VariantAttributeValue` para búsquedas por combinación.
4. Definir si el stock/precio vive en `Product` (cuando no hay variantes) o siempre en `ProductVariant` (recomendado: **siempre en variante**, incluso si es la única — simplifica el resto del sistema).

### Fase 2 — Backend (NestJS)

1. Módulo `ProductsModule`: CRUD de `Product` (template) con fotos y detalles.
2. Módulo `AttributesModule`: CRUD de `Attribute` / `AttributeValue`, reutilizable entre productos y tenants.
3. Endpoint de generación de variantes: recibe un `productId` + lista de `attributeId` con sus `valueIds` seleccionados → genera el producto cartesiano y crea las filas de `ProductVariant` faltantes (idempotente, no duplica combinaciones existentes).
4. Endpoint de detalle de producto: devuelve template + fotos + atributos + lista de variantes con su stock/precio.
5. Endpoint de listado/catálogo: agregación por template (precio mínimo/máximo, stock total) para evitar explosión de filas en las grillas.
6. Validaciones: no permitir eliminar un `AttributeValue` en uso, no permitir variantes duplicadas (misma combinación de valores).

### Fase 3 — Procesamiento asíncrono (Redis/BullMQ)

1. Job `regenerate-variant-matrix`: para catálogos grandes, correr la generación combinatoria en background y notificar al finalizar.
2. Job de recalculo de vistas agregadas (precio/stock por template) cuando cambia una variante, en vez de calcularlo en caliente en cada request.

### Fase 4 — Frontend/Admin (Refine.dev + Ant Design)

1. Pantalla de gestión de Atributos y Valores (reutilizable, independiente del producto).
2. En el formulario de producto: selector multi-atributo con sus valores → botón "Generar variantes" que muestra preview de la matriz antes de confirmar.
3. Vista tipo **matriz/spreadsheet** para edición bulk de sobreprecio/stock por variante (evitar formulario uno por uno), con la posibilidad de aplicar un ajuste a toda una fila o columna de atributo de una sola vez (ej. "+$500 a todos los G").
4. Grilla de fotos: fotos generales del template + fotos específicas por variante (opcional, con fallback a las del template).
5. Listado de catálogo mostrando template con "desde $X" y expandible a variantes.

### Fase 5 — Integración con Odoo

1. Mapeo de campos: `Product` ↔ `product.template`, `ProductVariant` ↔ `product.product`, `Attribute`/`AttributeValue` ↔ `product.attribute`/`product.attribute.value`.
2. Definir dirección de sincronización (OmniFlow → Odoo, Odoo → OmniFlow, o bidireccional) y estrategia de resolución de conflictos por `sku`.

### Fase 6 — POS / Inventario

1. Asegurar que toda venta y movimiento de stock referencia `ProductVariant.id`, nunca `Product.id`.
2. Actualizar buscador de POS para filtrar por combinación de atributos (ej. escanear o tipear "Azul + M").

---

## 3. Prompt de implementación técnica

```
Actuás como arquitecto de software senior especializado en NestJS + Prisma + PostgreSQL.

CONTEXTO DEL PROYECTO:
OmniFlow es un ERP multi-tenant con:
- Backend: NestJS
- ORM: Prisma sobre PostgreSQL
- Frontend/admin: Refine.dev con Ant Design
- Procesamiento asíncrono: Redis + BullMQ
- Integración/alineación conceptual con Odoo

TAREA:
Necesito rediseñar el módulo Productos para soportar variantes genéricas y
reutilizables, siguiendo el patrón product.template / product.product de Odoo.

REQUISITOS FUNCIONALES:
1. Un producto (template) tiene: nombre, descripción, campo de detalles/
   especificaciones flexible, múltiples fotografías.
2. Existen Atributos globales (ej. "Medida", "Color") con Valores propios
   (ej. Medida: P, M, G, EG — Color: Azul, Verde, Rojo, Amarillo, Morado,
   Turquesa), reutilizables entre distintos productos y tenants.
3. Un producto puede tener asignados uno o más atributos con un subconjunto
   de sus valores posibles.
4. A partir de esa asignación, el sistema debe poder generar
   automáticamente el producto cartesiano de variantes (ej. 4 medidas x
   6 colores = hasta 24 variantes), de forma idempotente (no duplicar
   combinaciones ya creadas) y permitiendo generar solo un subconjunto.
5. Cada variante tiene su propio SKU y stock, y un sobreprecio (delta)
   que se suma al precio base del template — el precio base vive
   únicamente en el template y nunca se duplica por variante, para que
   un cambio de precio base se propague automáticamente a todas las
   variantes. Cada variante puede además tener fotografías propias,
   distintas a las del producto matriz; si una variante no tiene fotos
   propias, se muestran las del template como fallback.
6. Todo el stock y las ventas (incluyendo POS) deben referenciar siempre
   la variante, nunca el template directamente.
7. El listado/catálogo debe poder mostrar el template agregando datos de
   sus variantes (precio mínimo/máximo, stock total) sin calcular esa
   agregación en caliente en cada request para catálogos grandes —
   proponer una estrategia de cache o vista materializada con BullMQ.

ENTREGABLES ESPERADOS:
1. Schema completo de Prisma para: Product (template), Attribute,
   AttributeValue, ProductAttributeLine, ProductVariant,
   VariantAttributeValue, Photo — con relaciones, índices y constraints
   de unicidad necesarios (evitar variantes duplicadas por producto).
2. Estrategia de migración de productos ya existentes en producción hacia
   este nuevo modelo (cada producto actual pasa a tener una variante
   única por defecto, sin romper referencias de stock/ventas actuales).
3. Especificación de endpoints REST bajo /api/v1/products/, incluyendo
   como mínimo:
   - CRUD de productos (template)
   - CRUD de atributos y valores
   - Endpoint de generación de variantes a partir de atributos/valores
     seleccionados (con preview antes de confirmar)
   - Endpoint de detalle de producto (template + fotos + atributos +
     variantes con stock/precio)
   - Endpoint de listado/catálogo agregado
4. Definición de los jobs de BullMQ necesarios (generación masiva de
   variantes, recalculo de agregados por template) con su payload y
   trigger.
5. Recomendaciones específicas de índices/consultas en PostgreSQL para
   soportar filtros por combinación de atributos sin degradar
   performance a medida que crece el catálogo.
6. Notas de compatibilidad con el modelo de datos de Odoo
   (product.template / product.product / product.attribute) pensando en
   una futura sincronización.
7. Estrategia para mostrar el precio del template en listados/catálogo
   cuando tiene múltiples variantes con distinto sobreprecio (ej. "desde
   $X" tomando el menor delta, vs. mostrar el precio de una variante
   por defecto).
8. Diseño de un endpoint de "bulk update" de sobreprecio que permita
   aplicar un delta a un subconjunto de variantes filtradas por valor de
   atributo (ej. sumar $500 a todas las variantes con Medida = G, o
   $300 a todas las de Color = Rojo), pensado para alimentar una vista
   tipo matriz en el admin donde se edite por fila/columna en vez de
   variante por variante.

FORMATO DE RESPUESTA:
Markdown, con el schema de Prisma en un bloque de código y los endpoints
en formato tabla (método, ruta, descripción, payload/response resumido).
```

---

## 4. Decisiones de diseño confirmadas

- **Modelo de precio: base + sobreprecio por variante (estilo Odoo).** El precio base vive únicamente en el template (`Product.basePrice`); cada variante tiene un `priceDelta` que se suma. Nunca se duplica el precio base en cada variante, para que un cambio en el precio base se propague automáticamente.
- **Fotos por variante: opcionales, con fallback al template.** Una variante puede tener fotografías propias distintas a las del producto matriz; si no las tiene, se muestran las del template. Esto evita tener que cargar fotos para cada una de las combinaciones generadas.
- **Precio/stock siempre en variante**, incluso para productos sin atributos (variante única "default"), para no tener dos caminos de código distintos en POS/inventario.

## 5. Notas de diseño aún pendientes de decidir

- **¿Agregación de catálogo en tiempo real o precalculada?** Definir umbral de cantidad de productos/variantes a partir del cual conviene precalcular con BullMQ en vez de calcular en cada request.
- **¿Cómo se muestra el precio del template en el listado cuando hay múltiples deltas?** Ej. "desde $X" con el menor delta, vs. precio de una variante por defecto (ver punto 7 del prompt técnico).
