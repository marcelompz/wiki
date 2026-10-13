# OmniFlow — Módulo Productos con Variantes (patrón Odoo)

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
