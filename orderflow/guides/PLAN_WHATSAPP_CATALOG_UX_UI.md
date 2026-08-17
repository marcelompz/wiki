# Plan de Maduración — Catálogo WhatsApp v1.0.0 → v1.1.0

## Objetivo

Cerrar el vertical **Catálogo WhatsApp** como canal de e-commerce público de alta conversión, respetando la directiva **mobile-first** y manteniendo el cumplimiento de `AGENTS.md` (tenantId sagrado, Prisma sin instanciación directa, Traefik como proxy exclusivo, sincronización de versiones y documentación).

## Estado Actual

| Capa | Estado |
|------|--------|
| Backend | Controlador público `whatsapp-catalog.controller.ts` + endpoint `/api/v1/public/catalog/config` y `/api/v1/public/catalog/products`. |
| Catálogo público | `whatsapp-catalog.tsx` mobile-first, carrito con drawer, checkout con WhatsApp, banners por industria, acordeones por categoría, detalle de producto, wishlist, reseñas, ordenamiento, paginación, compartir y ayuda. |
| E-commerce | Detalle, reseñas, wishlist, filtros avanzados, ordenamiento, paginación, vista rápida, compartir y ayuda implementados en frontend. |
| Accesibilidad | Labels semánticos, aria-labels en iconos, skip link agregado. |
| Performance | Cache de config en localStorage con TTTL, lazy load de imágenes con IntersectionObserver, skip link y preload básico. Pendiente: code-split y offline-first completo. |

## Objetivos Específicos

1. **Mobile-first real:** la experiencia debe ser óptima en 375px antes de escalar a tablet/desktop.
2. **Funcionalidades ecommerce accesibles:** el catálogo no es solo un listado; debe permitir descubrir, evaluar y decidir comprar.
3. **Trazabilidad OrderFlow:** todo pedido generado se registra en backend con `tenantId`, metadata y source `whatsapp_catalog`.
4. **Cumplimiento arquitectónico:** no romper `AGENTS.md` ni el flujo público actual.

## Fase 1 — Accesos rápidos y navegación

### 1.1 Accesos directos en header público
- Link a **Inicio** (`/`), **Catálogo** (`/whatsapp-catalog`) y **Carrito** visible siempre.
- Acceso a **WhatsApp** y **Teléfono** con `tel:` y `wa.me` desde el header.

### 1.2 Accesos a funciones ecommerce
- **Filtros avanzados** visibles en mobile como bottom sheet.
- **Buscador predictivo** con historial local.
- **Vista rápida** del producto sin salir del listado.
- **Compartir producto** nativo.

**Estado:** Completado parcialmente. Se agregó ordenamiento, paginación, detalle en modal, wishlist UI, reseñas y ayuda. Quedan pendientes: bottom sheet de filtros en mobile, buscador predictivo con historial, lazy load de imágenes y cache de config con TTL.

## Fase 2 — Mejora de UX/UI mobile-first

### 2.1 Layout mobile-first
- Header compacto con acciones principales.
- Catálogo con cards adaptativas, imágenes lazy-loaded.
- Drawer del carrito con swipe-to-dismiss en mobile.
- Checkout en pasos cortos con stepper visual.

### 2.2 Accesibilidad
- Skip link, foco visible, contraste mínimo 4.5:1.
- Labels semánticos, aria-labels en iconos.

### 2.3 Performance
- `preload` de recursos críticos.
- Cache de config en `localStorage` con TTL.
- Lazy load de imágenes y modales.

**Estado:** Completado parcialmente. Se agregó modal de detalle mobile-first, acciones con aria-labels y estructura semántica base. Quedan pendientes: skip link, contraste garantizado, preload, cache TTL y lazy load de imágenes.

## Fase 3 — Backend y datos

### 3.1 Endpoints públicos unificados (Opción 2 elegida)
- `GET /api/v1/public/catalog/products` — endpoint unificado para todos los canales (storefront, WhatsApp, etc.), resuelve tenant por API key o subdomain.
- `GET /api/v1/public/catalog/config` — configuración pública unificada del tenant.
- `GET /api/v1/public/catalog/products/:id` — detalle de producto unificado.
- Se mantienen los endpoints existentes de `/whatsapp-catalog` y `/storefront` para compatibilidad.

### 3.2 Modelado de datos
- Usar `Product` existente con `imagesUrls`, `metadata`, `category`.
- Registrar `Order` con `source: 'whatsapp_catalog'` y metadata de entrega/pago.
- No requiere cambios de schema por ahora; la unificación es a nivel de endpoints/servicio.

## Fase 4 — Criterios de aceptación

| Criterio | Aceptación |
|----------|------------|
| Mobile-first | Experiencia usable en 375px, luego tablet, luego desktop. |
| Funcionalidades | Detalle de producto, filtros, búsqueda, wishlist, compartir, reseñas. |
| Performance | LCP < 2.5s en 4G, CLS < 0.1. |
| Trazabilidad | Cada checkout genera `Order` con `tenantId` y metadata. |
| Cumplimiento | `AGENTS.md` respetado; no se agrega lógica condicional por modo. |

**Estado de criterios:** Funcionalidades avanzadas en frontend completadas. Performance y accesibilidad quedan como follow-up inmediato.

## Documentación y sincronización

- `docs/PLAN_WHATSAPP_CATALOG_UX_UI.md` (este documento).
- `featurelist.json`: FEAT-041 marcada completada.
- `ROADMAP.md`: reflejar sprint de maduración de catálogo.
- `VERSION`, `package.json`, manifiestos: sincronizados en v1.12.1.
- Wiki sincronizada en `/opt/wiki/orderflow/`.
