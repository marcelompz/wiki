# Plan: Mejoras de Social-Catalog — Ordenamiento, Etiquetas, Inventario y Banner de Destacados (v2)

> **Módulo:** `social-catalog`
> **Alcance:** Backend + Frontend
> **Base:** revisión de `PLAN_SOCIAL_CATALOG_MEJORAS.md` — correcciones marcadas con ⚠️, sección nueva al final.

---

## 1. Ordenamiento de productos

### Problema actual
- Los productos se muestran en el orden que devuelve la base de datos o por `createdAt`.
- No existe forma de elegir manualmente el orden ni de ordenar por precio, nombre o stock desde el catálogo público.

### Propuesta
Reutilizar el campo `order` existente en `Product`. Criterios de ordenamiento en el catálogo público:

- **Carta física**: respeta el agrupamiento por categoría tal como está impreso/definido en el menú físico (orden de categorías + orden de producto dentro de cada categoría).
- **Manual**: orden plano por `order`, cruzando categorías (ignora el agrupamiento).
- **Precio: menor a mayor / mayor a menor**
- **Nombre: A-Z**
- **Stock: mayor a menor**

> ⚠️ **Corrección sobre el plan original:** "Carta física" y "Manual" estaban descriptas como el mismo criterio ("usa el `order` preestablecido"). Si esta distinción (agrupada por categoría vs. plana) no es la intención real, hay que redefinir antes de pasarlo a implementación — tal como estaba, son dos nombres para un solo comportamiento.

### Cambios técnicos
- **Backend:** exponer `order` en el DTO del catálogo social; query param `sortBy=carta_fisica|manual|price_asc|price_desc|name|stock_desc` en `GET /api/v1/public/social-catalog/products`.
- **Frontend:** selector de ordenamiento en el catálogo público; drag & drop manual en el admin para reordenar productos.

### Criterios de aceptación
- [ ] El admin puede reordenar productos manualmente con drag & drop.
- [ ] El público puede cambiar el orden por precio, nombre o stock.
- [ ] "Carta física" y "Manual" producen resultados visiblemente distintos cuando hay productos de distintas categorías intercalados por `order`.
- [ ] El orden manual se mantiene al recargar la página.

---

## 2. Etiquetas y badges de producto

> ⚠️ **Corrección mayor sobre el plan original:** la propuesta original creaba `ProductLabel` y `ProductLabelAssignment` como tablas nuevas dentro de `social-catalog`. Eso duplica el **Ribbon** (many2one) y **Tag** (many2many) que ya existen en el módulo `Product` central, y contradice la decisión ya tomada de que el sistema de etiquetas debe gestionarse centralmente en Product y heredarse por POS, Compras, B2B, Ecommerce y Catálogo. **No se crean tablas nuevas en esta sección.**

### Propuesta (revisada)
- Si `Tag` (el existente, many2many) no tiene aún `color`/`textColor`, agregárselos ahí — es una migración sobre una tabla que ya existe, no una tabla nueva.
- El **Ribbon** existente cubre el caso "un badge destacado en la esquina superior del producto" (NUEVO, PROMOCIÓN, AGOTADO) — es literalmente su propósito en el patrón Odoo que ya adoptaste.
- Social-catalog solo **consume y renderiza** lo que el módulo Product ya expone (Ribbon activo + Tags asignados) — no gestiona etiquetas propias.

### Cambios técnicos
- **Backend:** si falta, agregar `color`/`textColor` a `Tag`. Incluir `ribbon` y `tags` en la respuesta de `GET /api/v1/public/social-catalog/products` (probablemente ya viajan si el admin de Productos ya los expone en otros módulos consumidores — verificar antes de tocar el endpoint).
- **Frontend:** público, mostrar el Ribbon activo como badge de esquina, usando `cssVars` de `theme/tokens.ts` para que el color de fondo del badge conserve contraste en ambos temas (no asumir que `color`/`textColor` definidos en el admin ya cumplen 4.5:1 — validar o recalcular luminosidad si hace falta).

### Criterios de aceptación
- [ ] El público ve el Ribbon activo del producto como badge de esquina.
- [ ] El público ve los Tags asignados, con el color/textColor definidos en el módulo Product.
- [ ] Cero tablas nuevas creadas para este punto.

---

## 3. Alertas de inventario

> ⚠️ **Antes de implementar:** auditar qué tan construido está ya esto. El componente público (`social-catalog.tsx`) ya referencia `stockStatus`, `stockAvailable` y un estado `'out_of_stock'` con badge "Agotado" — el binario disponible/agotado probablemente ya existe. Lo que falta auditar es si ya hay algo del escalonado de 3 niveles antes de construirlo de cero.

### Propuesta
Usar `stockAvailable`:
- **Agotado**: `stockAvailable <= 0` → "AGOTADO", badge rojo (`cssVars.danger`).
- **Última unidad**: `stockAvailable === 1` → "¡Última unidad!", badge naranja (`cssVars.warning`).
- **Stock bajo**: `stockAvailable <= 5` → "Pocas unidades", badge amarillo.
- **Disponible**: `stockAvailable > 5` → sin alerta.

### Cambios técnicos
- **Backend:** sin cambio de schema. Helper `getStockStatus(product)` → `{ status, label, color }` (si no existe ya con otro nombre — auditar `social-catalog.service.ts` primero).
- **Frontend:** admin, badge + filtro por estado en la tabla de productos. Público, badge en la tarjeta (extender el binario existente al escalonado de 3 niveles).

### Criterios de aceptación
- [ ] El público ve "AGOTADO", "¡Última unidad!" y "Pocas unidades" según corresponda.
- [ ] El admin puede filtrar productos por estado de stock.
- [ ] (Opcional) Notificación al admin al llegar a 1 unidad.

---

## 4. Banner de productos destacados (carrusel)

### Objetivo
Carrusel de productos destacados en el catálogo público, activable/desactivable por el admin, con dos modos de curación.

### Propuesta
**Modo A — Automático por etiqueta** (MVP, cero tablas nuevas):
- El admin activa el banner y elige qué `Tag` existente lo alimenta (ej. "Destacado", o reusa "Promoción").
- Cualquier producto con esa etiqueta aparece automáticamente en el carrusel.
- Orden dentro del carrusel: por `order` del producto (mismo campo de la Sección 1).

**Modo B — Curación manual**:
- El admin arma a mano la lista de productos del banner, con su propio orden — independiente de si el producto tiene o no esa etiqueta.
- Útil cuando se quiere destacar algo puntual sin taggearlo permanentemente (ej. una promo de fin de semana).
- Reutiliza el mismo componente de drag & drop de la Sección 1 para el reordenamiento.

El admin elige el modo por catálogo (tag / manual / deshabilitado); no son mutuamente excluyentes en el tiempo — puede cambiar de modo cuando quiera.

### Cambios técnicos
- **Backend:**
  - Config nueva en `CatalogChannelConfig` (no requiere migración de tabla nueva para el Modo A): `featuredBannerEnabled: boolean`, `featuredBannerMode: 'tag' | 'manual'`, `featuredTagId: string | null`.
  - Tabla nueva solo para el Modo B: `CatalogFeaturedProduct` (`tenantId`, `catalogId`, `productId`, `order`, `addedAt`) — respeta la regla de `tenantId` obligatorio en toda tabla/query.
  - Endpoint: `GET /api/v1/public/social-catalog/featured` → resuelve según `featuredBannerMode` (join por tag o por `CatalogFeaturedProduct`, según corresponda).
  - Admin: `POST/DELETE /api/v1/social-catalog/featured/:productId` para gestionar la lista manual (reordenamiento vía `PATCH` con array de `order`).
- **Frontend:**
  - Admin: toggle de habilitación, selector de modo, selector de Tag (modo A) o picker + drag & drop de productos (modo B).
  - Público: componente de carrusel nuevo en `social-catalog.tsx`, construido con `cssVars` desde el inicio (no hardcodear colores — evitar repetir el trabajo de migración que se hizo en el resto del componente).
  - Si `featuredBannerEnabled` es `false` o la lista/tag resuelve vacía, el carrusel no se renderiza (sin espacio vacío ni loading infinito).

### Criterios de aceptación
- [ ] El admin puede habilitar/deshabilitar el banner.
- [ ] El admin puede elegir modo tag o manual.
- [ ] Modo tag: productos con esa etiqueta aparecen automáticamente, sin gestión manual.
- [ ] Modo manual: el admin arma y reordena la lista con drag & drop.
- [ ] El carrusel respeta el tema claro/oscuro (contraste verificado, no solo "se ve bien a ojo").
- [ ] Banner deshabilitado o vacío = no se renderiza nada en su lugar.

---

## Orden de implementación recomendado

1. **Auditoría de inventario** (Sección 3) — antes de codificar nada, confirmar qué existe.
2. **Etiquetas/Ribbon** (Sección 2) — agregar `color`/`textColor` a `Tag` si falta; exponer en el endpoint público.
3. **Banner Modo A** (Sección 4) — depende directamente del punto anterior, es el de menor costo.
4. **Ordenamiento** (Sección 1) — el drag & drop que construyas acá se reutiliza en el Banner Modo B.
5. **Banner Modo B** (Sección 4) — última, porque reutiliza el componente de drag & drop de la Sección 1.
6. **Inventario — escalonado de 3 niveles** (Sección 3) — independiente, se puede intercalar en cualquier punto.

---

## Riesgos y consideraciones

- **Tabla nueva (`CatalogFeaturedProduct`, solo Modo B):** generar migración con `prisma migrate dev`, probar en staging antes de deploy — igual que cualquier migración según tu protocolo.
- **Contraste:** cualquier badge/color nuevo (Ribbon, Tag, carrusel) debe validarse contra `cssVars` en ambos temas, no solo copiar el color que definió el admin en el picker — un color de marca puede fallar 4.5:1 sin que sea evidente al elegirlo.
- **Performance:** el endpoint de featured no debería ir directo a producción sin `include` acotado ni caché — mismo riesgo que ya identificaba el plan original para etiquetas.

---

## Referencias

- `backend/prisma/schema.prisma` — modelos `Product`, `Tag`, `Ribbon`
- `frontend/src/pages/social-catalog.tsx` — catálogo público (ya migrado a `cssVars`/tema)
- `frontend/src/pages/admin/social-catalog.tsx` — admin de catálogo
- `backend/src/social-catalog/social-catalog.service.ts` — lógica de negocio
- `frontend/src/theme/tokens.ts`, `theme.ts` — sistema de tema/tokens de referencia
