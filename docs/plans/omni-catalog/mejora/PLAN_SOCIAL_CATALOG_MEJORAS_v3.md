# Plan de Mejoras UX/UI Social Catalog

## Estado: ✅ Implementado y Desplegado (2026-08-24)

## Objetivos (del plan original en mejora/)
1. ✅ Habilitar o no las fotos de productos (admin config: `showProductImages`)
2. ✅ Vista en modo lista o tarjeta (admin config + toggle cliente con persistencia)
3. ✅ Mejorar contraste en modo obscuro/clar

## Implementaciones Realizadas

### 1. Toggle Cliente: Vista Lista/Tarjeta
**Archivo:** `frontend/src/pages/social-catalog.tsx` (líneas ~158-168)

- Estado `clientViewMode` con persistencia en `localStorage` (key: `social-catalog-view-mode`)
- `adminViewMode` del config preservado como fallback (no eliminado)
- UI toggle con iconos `BarsOutlined` (lista) y `AppstoreOutlined` (tarjetas) en barra de filtros
- Resuelve a `isListView` boolean usado en ambos modos de layout

### 2. showProductImages (Admin)
- ✅ Funciona en accordion card mode (via `productCover` variable)
- ✅ Funciona en list mode (línea 558: `showProductImages && product.imagesUrls?.[0]`)
- ✅ Funciona en accordion list mode (via `productCover` variable)

### 3. Mejora de Contraste Dark Theme
**Archivo:** `frontend/src/theme/tokens.ts`

- Dark mode text primary: `#F1F5F9` (antes `#F0F3F6`)
- Dark mode text secondary: `#CBD5E1` (antes `#A0AEC0`)
- Dark mode text muted: `#94A3B8` (antes `#8B9BB0`)
- Footer del catálogo: cambiado de `#1e293b` hardcodeado a `cssVars.bgElevated`

## Testing
- ✅ Frontend build: Success (social-catalog-BaQ8SSRb.js)
- ✅ E2E QA: All passes (catalog images, JS errors, admin routes, auth/DB health)

## Deploy
- ✅ `provecchio.com/social-catalog` verificado
- Rollback env: `/opt/orderflow/deploy-artifacts/rollback-provecchio-*.env`
