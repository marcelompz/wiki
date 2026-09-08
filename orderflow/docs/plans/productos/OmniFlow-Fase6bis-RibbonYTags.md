# OmniFlow — Módulo Productos: Fase 6-bis (Cinta / Ribbon y Etiquetas / Tags)

**Extensión del plan de Productos con Variantes**
Fecha: Agosto 2026

---

## 1. Objetivo

Incorporar al módulo Productos dos entidades ausentes en el plan original, siguiendo el patrón de Odoo (`product.ribbon` y `product.tag`), con dos decisiones de diseño ya confirmadas:

1. **Ribbon (Cinta):** el modo de activación — **automático** o **manual** — lo decide el **administrador de OmniFlow**, no el sistema por defecto.
2. **Tags (Etiquetas):** el filtro por Tags en catálogo se gestiona de forma **centralizada en el módulo Product** y es **heredado** por todos los módulos que consumen el catálogo: **POS, Compras, B2B, Ecommerce y Catálogo**.

---

## 2. Ribbon (Cinta) — Diseño

### 2.1. Relación y propósito
- Many2one: un producto tiene **como máximo una** cinta activa a la vez (igual que Odoo `website_ribbon_id`).
- Uso exclusivamente visual (badge sobre la imagen del producto): texto, color, posición.

### 2.2. Modo de activación configurable por el administrador
El administrador de OmniFlow define, **por tenant y con posibilidad de override por producto**, si un Ribbon se asigna:
- **MANUAL:** el administrador elige la cinta desde el formulario del producto (igual que Odoo).
- **AUTOMATIC:** el sistema evalúa reglas (`RibbonRule`) configuradas por el propio administrador — ej. "Nuevo" si `createdAt` < N días, "Oferta" si hay descuento activo, "Sin stock" si `totalStock = 0` — y asigna la cinta correspondiente sin intervención manual.

Esto implica que el modo no es una decisión de arquitectura fija sino un **dato de configuración**, editable desde el admin.

### 2.3. Schema de Prisma

```prisma
enum RibbonMode {
  MANUAL
  AUTOMATIC
}

model TenantSettings {
  id                String     @id @default(uuid())
  tenantId          String     @unique
  tenant            Tenant     @relation(fields: [tenantId], references: [id])
  defaultRibbonMode RibbonMode @default(MANUAL) // default para nuevos productos del tenant
}

model Ribbon {
  id        String    @id @default(uuid())
  name      String
  color     String?   // hex o token de color del design system
  position  String?   // ej. "left" | "right"
  tenantId  String
  tenant    Tenant    @relation(fields: [tenantId], references: [id])
  products  Product[]
  rules     RibbonRule[]
}

// Reglas de asignación automática, definidas por el administrador
model RibbonRule {
  id          String   @id @default(uuid())
  ribbonId    String
  ribbon      Ribbon   @relation(fields: [ribbonId], references: [id])
  condition   Json     // ej. { "type": "NEW_PRODUCT", "maxDays": 30 } | { "type": "ON_DISCOUNT" } | { "type": "OUT_OF_STOCK" }
  priority    Int      @default(0) // si varias reglas matchean, gana la de mayor prioridad
  active      Boolean  @default(true)
}
```

Cambios sobre `Product` (del plan original):

```prisma
model Product {
  // ...campos existentes...
  ribbonMode RibbonMode @default(MANUAL) // override por producto; hereda TenantSettings.defaultRibbonMode al crearse
  ribbonId   String?
  ribbon     Ribbon?    @relation(fields: [ribbonId], references: [id])
}
```

### 2.4. Job de BullMQ

**`evaluate-automatic-ribbons`**
- **Trigger:** cron periódico (ej. cada hora) + eventos puntuales (`ProductVariant` cambia de stock a 0, se activa un descuento, se recalculan agregados de template).
- **Payload:** `tenantId`, opcionalmente `productId` para evaluación puntual.
- **Acción:** para todo `Product` con `ribbonMode = AUTOMATIC`, evalúa las `RibbonRule` activas del tenant en orden de `priority` y asigna el primer `ribbonId` que matchea (o `null` si ninguna aplica). Los productos con `ribbonMode = MANUAL` quedan intactos.

### 2.5. Endpoints

| Método | Ruta | Descripción | Payload / Response |
|---|---|---|---|
| GET/PATCH | `/api/v1/settings/ribbon-mode` | Ver/editar el modo default del tenant | `{ defaultRibbonMode: 'MANUAL'\|'AUTOMATIC' }` |
| PATCH | `/api/v1/products/:id/ribbon-mode` | Override del modo por producto puntual | `{ ribbonMode: 'MANUAL'\|'AUTOMATIC' }` |
| POST | `/api/v1/ribbons` | Crear cinta | `{ name, color, position }` |
| GET | `/api/v1/ribbons` | Listar cintas del tenant | `[{ id, name, color, position }]` |
| POST | `/api/v1/ribbons/:id/rules` | Crear regla automática | `{ condition, priority }` |
| PATCH | `/api/v1/products/:id/ribbon` | Asignar cinta manualmente (solo si `ribbonMode = MANUAL`) | `{ ribbonId }` |

---

## 3. Tags (Etiquetas) — Diseño

### 3.1. Relación y propósito
- Many2many: un producto puede tener múltiples etiquetas.
- Uso: clasificación, búsqueda y filtros — tanto en backend como en los distintos frontends de venta/gestión.

### 3.2. Gestión centralizada en el módulo Product, heredada por los demás módulos
La fuente de verdad de los Tags es el `ProductsModule`. Ningún otro módulo crea, edita ni duplica su propio catálogo de etiquetas — **POS, Compras, B2B, Ecommerce y Catálogo consumen el mismo `Tag` vía relación con `Product`**, y filtran contra esa misma tabla. Esto evita el problema típico de tener "tags de ecommerce" y "tags de POS" desincronizados.

En la práctica esto se traduce en:
- Un único `TagsModule` (dentro de `ProductsModule`) expone el CRUD de `Tag`.
- El `CatalogModule` (que ya centraliza la consulta de catálogo agregado, definido en el plan original) expone el filtrado por `tagIds` como parámetro estándar de consulta.
- POS, Compras, B2B y Ecommerce **no implementan lógica propia de filtrado por tag**: consumen el mismo endpoint/query del `CatalogModule`, cada uno aplicando además sus propias reglas de visibilidad (ej. B2B puede filtrar tags visibles solo para mayoristas vía un flag en `Tag`, ver 3.4).

### 3.3. Schema de Prisma

```prisma
model Tag {
  id        String    @id @default(uuid())
  name      String
  tenantId  String
  tenant    Tenant    @relation(fields: [tenantId], references: [id])
  products  Product[]

  @@unique([tenantId, name])
}
```

Cambio sobre `Product`:

```prisma
model Product {
  // ...campos existentes...
  tags Tag[] // many-to-many implícito de Prisma
}
```

> Nota: se usa many-to-many implícito porque, a diferencia de `VariantAttributeValue`, no hay metadata adicional que guardar en la relación (ni orden ni datos extra). Si más adelante se necesita, se migra a tabla explícita del mismo modo que se hizo con los atributos de variante.

### 3.4. Visibilidad por canal (para que POS/B2B/Ecommerce hereden correctamente)

Para que un mismo Tag pueda existir pero no necesariamente aplicar a todos los canales de la misma forma (ej. un tag interno de compras no debería verse como filtro en Ecommerce), se agrega:

```prisma
model Tag {
  // ...campos anteriores...
  visibleInPos        Boolean @default(true)
  visibleInEcommerce  Boolean @default(true)
  visibleInB2B        Boolean @default(true)
  visibleInPurchasing Boolean @default(true)
}
```

Cada módulo consumidor filtra su propio listado de tags disponibles usando el flag correspondiente, pero **siempre contra la misma tabla `Tag`** — la fuente sigue siendo única, solo cambia qué subconjunto se expone como filtro en cada canal.

### 3.5. Endpoints

| Método | Ruta | Descripción | Payload / Response |
|---|---|---|---|
| POST | `/api/v1/products/tags` | Crear tag (con flags de visibilidad por canal) | `{ name, visibleInPos, visibleInEcommerce, visibleInB2B, visibleInPurchasing }` |
| GET | `/api/v1/products/tags` | Listar tags del tenant | `[{ id, name, visibleIn... }]` |
| PATCH | `/api/v1/products/:id/tags` | Asignar/quitar tags de un producto | `{ tagIds: [] }` |
| GET | `/api/v1/catalog?tagIds=...&channel=pos\|ecommerce\|b2b\|purchasing` | Listado de catálogo filtrado por tags, ya aplicando la visibilidad del canal | `[{ productId, name, tags: [] }]` |

El parámetro `channel` en el endpoint del `CatalogModule` es lo que permite que POS, B2B, Ecommerce y Compras **hereden** el mismo motor de filtrado sin reimplementarlo — cada uno solo indica desde qué canal está consultando.

---

## 4. Prompt de implementación técnica

```
Actuás como arquitecto de software senior especializado en NestJS + Prisma + PostgreSQL.

CONTEXTO DEL PROYECTO:
OmniFlow es un ERP multi-tenant. Ya existe implementado el módulo Productos
con Variantes e Importación Masiva (Product/ProductVariant/Attribute/Tag
inexistentes aún — se agregan en esta fase).

TAREA:
Extender el módulo Productos con dos entidades del patrón Odoo: Ribbon
(product.ribbon) y Tag (product.tag).

REQUISITOS FUNCIONALES:
1. Ribbon es Many2one respecto a Product. Su modo de asignación (MANUAL o
   AUTOMATIC) es una decisión del administrador de OmniFlow, configurable
   por tenant (default) y con override por producto individual.
2. En modo AUTOMATIC, el ribbon se asigna evaluando reglas (RibbonRule)
   que el propio administrador configura (ej. producto nuevo, en
   descuento, sin stock), con prioridad entre reglas si más de una
   matchea. La evaluación corre como job periódico de BullMQ y también
   ante eventos puntuales (cambio de stock a cero, activación de
   descuento).
3. En modo MANUAL, el administrador asigna el ribbon manualmente desde el
   formulario de producto, igual que en Odoo.
4. Tag es Many2many respecto a Product. El CRUD de Tags vive únicamente
   en el módulo Product (fuente única de verdad) — ningún otro módulo
   mantiene su propio catálogo de etiquetas.
5. El filtro por Tags en catálogo se resuelve en el CatalogModule
   existente, exponiendo un parámetro de canal (pos, ecommerce, b2b,
   purchasing) que aplica los flags de visibilidad por canal del Tag,
   pero consultando siempre la misma tabla. POS, Compras, B2B y
   Ecommerce heredan este filtrado consumiendo ese mismo endpoint, sin
   reimplementar lógica propia.

ENTREGABLES ESPERADOS:
1. Extensión del schema de Prisma: Ribbon, RibbonRule, TenantSettings,
   Tag, y los campos nuevos en Product (ribbonMode, ribbonId, tags).
2. Especificación de endpoints REST para Ribbon y Tags bajo
   /api/v1/products/ y /api/v1/catalog, incluyendo el parámetro de canal.
3. Definición del job de BullMQ evaluate-automatic-ribbons: trigger,
   payload y lógica de resolución de prioridad entre reglas.
4. Estrategia para que POS, Compras, B2B y Ecommerce consuman el mismo
   filtrado de Tags sin duplicar lógica (reutilización del
   CatalogModule).

FORMATO DE RESPUESTA:
Markdown, con el schema de Prisma en un bloque de código y los endpoints
en formato tabla (método, ruta, descripción, payload/response resumido).
```
