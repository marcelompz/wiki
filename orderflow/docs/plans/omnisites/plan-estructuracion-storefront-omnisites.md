# Plan de estructuración — storefront-builder (Core) y OmniSites (Enterprise)

**Objetivo:** unificar el modelo de datos de ambos módulos para que una plantilla community pueda "graduarse" a enterprise sin reescritura, y que ambos cumplan el checklist de UX Rank (usabilidad, rendimiento, accesibilidad, diseño visual, adaptación móvil, conversión) antes de cargar contenido.

---

## Fase 0 — Modelo de datos unificado (base para todo lo demás)

Hoy existen dos vocabularios distintos: `SiteSection` / `ThemeConfig` (OmniSites, rico) vs. `BlockDto` / `themeConfig` (storefront-builder, mínimo). Antes de escribir una sola plantilla nueva, hay que definir un **esquema común** del que ambos módulos sean subconjuntos.

1. **Tipo de bloque unificado**
   Tomar el `SectionType` de OmniSites (16 tipos: `navbar`, `hero`, `features`, `store`, `portfolio`, `blog`, `testimonials`, `pricing`, `stats`, `faq`, `contact`, `cta`, `gallery`, `custom_html`, `omnibar`, `footer`) como superset.
   storefront-builder pasa de 5 `BlockDto` fijos (`HERO`, `CATALOG_GRID`, `PROMO_BANNER`, `TESTIMONIALS`, `CONTACT_MAP`) a soportar el mismo enum, pero el **Core habilita solo un subconjunto curado** (hero, store/catalog, testimonials, faq, footer, contact). **Core+ / Enterprise** desbloquean el resto (pricing, stats, portfolio, blog, custom_html).

2. **Theme config unificado**
   Extender el `themeConfig` de storefront-builder (`primaryColor`, `secondaryColor`, `fontFamily`, `bannerUrl`) a la forma de `ThemeConfig` de OmniSites (`accentColor`, `backgroundColor`, `textColor`, `borderRadius`, `colorMode`, `customCss`).
   Community usa un subset con defaults fijos; Enterprise expone el control fino (incluye `customCss` libre).

3. **Accesibilidad de primera clase**
   Agregar `altText` obligatorio a toda imagen (`SectionItem.imageUrl`, `content.mediaUrl`) en ambos tipos, y un campo `ariaLabel` opcional en botones/CTAs. Este cambio toca `types.ts` (OmniSites) y `BlockDto` + `schema.prisma` (storefront-builder).

4. **`layoutVariant` en storefront-builder**
   Hoy cada `BlockDto` no tiene variantes de layout. Sumar `layoutVariant?: string` igual que en `SiteSection`. El Core solo ofrece 1-2 variantes por bloque; Enterprise ofrece todas.

**Entregable de la fase:** un archivo de tipos compartido (paquete interno tipo `shared-types`) que ambos módulos importen, evitando que sigan divergiendo.

---

## Fase 1 — Persistencia real en storefront-builder

Bloqueante antes de cargar plantillas ricas: hoy `StorefrontBuilderService` guarda todo en un `Map<string, any[]>` en memoria, que se pierde en cada reinicio, a pesar de tener ya un `schema.prisma` con el modelo `StorefrontTemplate`.

1. Reemplazar el `Map` en memoria por Prisma Client, usando el `schema.prisma` existente (`themeConfig` y `blocks` como campos `Json`).
2. Migrar `getTemplates()` para que el fallback "default" (hoy hardcodeado en el service) pase a ser un **seed de base de datos** por categoría (`RETAIL`, `GASTRONOMY`, `BEAUTY_SPA`, `B2B_WHOLESALE`), no un único default genérico. Conecta directo con la Fase 3.
3. Sumar `findOne`, `update`, `delete` y `duplicate` al controller/service — hoy solo existen `save` (`POST /templates`), `list` (`GET /templates`) y `export` (`GET /templates/:id/export`).
4. Mantener el endpoint `export` (JSON) tal cual: es el mecanismo de "graduación" hacia OmniSites. Un JSON exportado de storefront-builder debe ser importable por el `TemplateSelector` / `AiSiteGeneratorModal` de OmniSites sin transformación manual.

---

## Fase 2 — Ampliar catálogo de bloques en storefront-builder

Con el modelo unificado de la Fase 0 disponible, sumar al Core los bloques que le faltan frente a OmniSites, priorizados por impacto en conversión y usabilidad:

| Prioridad | Bloque nuevo | Por qué |
|---|---|---|
| Alta | `PRICING` | No existe hoy; crítico para B2B_WHOLESALE y Beauty/Spa (packs de servicios) |
| Alta | `FAQ_ACCORDION` | Reduce fricción de conversión, patrón validado en land-book |
| Alta | `FOOTER` estructurado | Hoy no existe como bloque, es solo copyright suelto en el default |
| Media | `STATS_COUNTER` | Social proof, barato de implementar (ya existe en OmniSites) |
| Media | `GALLERY` | Clave para GASTRONOMY y BEAUTY_SPA (fotos de platos/local) |
| Baja | `CUSTOM_HTML` | Válvula de escape para casos no cubiertos, ya probado en OmniSites |

---

## Fase 3 — Seed de plantillas por vertical

Con Fases 0-2 completas, definir la matriz de qué se construye dónde antes de diseñar cada plantilla en detalle:

- **storefront-builder (Core):** 1 plantilla rica por cada `TemplateCategory` existente en el enum — **RETAIL, GASTRONOMY, BEAUTY_SPA, B2B_WHOLESALE** — usando los bloques ampliados de la Fase 2. Nivel de detalle: bueno pero no tan customizado como enterprise (sin `customCss`, colores del sistema).
- **OmniSites (Enterprise):** sumar 2 verticales propias del ecosistema OmniFlow que hoy no existen — **Gastro/Catering** (alineada a OmniGastro/Vivento) y **Real Estate** (alineada a OmniRealState) — con el mismo nivel de detalle que las 4 plantillas actuales (ecommerce, portfolio, blog, saas).

---

## Checklist de aceptación por plantilla (basado en el research UX Rank)

Aplicar antes de publicar cualquier plantilla nueva, en cualquiera de los dos módulos:

| Dimensión | Peso | Qué revisar |
|---|---|---|
| Usabilidad y claridad | 25% | Jerarquía visual clara, navegación de 1 clic al objetivo (comprar, contactar, agendar) |
| Rendimiento | 20% | Imágenes optimizadas/lazy-load, HTML/CSS generado sin bloat |
| Accesibilidad | 20% | `altText` en todas las imágenes, contraste AA, navegación por teclado |
| Diseño visual | 15% | Consistencia de paleta/tipografía, pulido de detalles (hover, sombras, spacing) |
| Adaptación móvil | 10% | Probar cada `layoutVariant` en mobile real, no solo el preview del editor |
| Conversión | 10% | CTA único y visible por sección, formularios cortos |

---

## Orden de ejecución sugerido

1. **Fase 0** — Tipos unificados
2. **Fase 1** — Persistencia Prisma en storefront-builder
3. **Fase 2** — Bloques nuevos en el Core
4. **Fase 3** — Contenido de las plantillas (trabajo de diseño de cada plantilla en sí)
