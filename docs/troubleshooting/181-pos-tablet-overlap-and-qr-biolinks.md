# 181 — Provecchio v1.39.8: POS del mozo se solapa en tablet + QR de mesa abre BioLinks

## Área
Frontend / OmniGastro / POS / Routing público / Deploy

## Síntoma principal

Reportado en el despliegue **v1.39.8** (provecchio.com, 2026-10-19):

1. **POS del mozo en tablet** (`/admin/gastro/pos/:tableId`): el bloque del **TOTAL** se solapaba sobre la **lista de productos** (catálogo).
2. **QR de la mesa G10** (`https://provecchio.com/?t=7b0075a2-811e-440c-b426-26fbf2b52e33`): abría la landing de **BioLinks** ("¡Bienvenido a nuestra Bio!") en vez del **menú digital** con la opción de llamar al mozo.

---

## Causa Raíz

### Issue 1: solapamiento TOTAL ↔ catálogo en tablet

`frontend/src/styles/admin-mobile.css` (importado por `AdminApp.tsx`) definía una regla **global** para el sider del shell admin:

```css
@media (max-width: 768px) {
  .ant-layout-sider {
    position: fixed !important;
    z-index: 999 !important;
    height: 100vh !important;
  }
}
```

El POS del mozo (`frontend/src/pages/admin/gastro-pos.tsx`) usa dos componentes `Sider` de Ant Design:

- Catálogo de productos — `width={300}`
- Resumen (contiene el `TOTAL`) — `width={210}`

Al ser selectores de clase globales, la regla `!important` también los alcanzaba: en viewports ≤768px ambos siders pasaban a `position: fixed`, quedaban **fuera de flujo** y se apilaban en el **mismo origen** (`left: 24px`), de modo que el bloque del TOTAL se dibujaba encima del catálogo. Además las líneas del pedido quedaban por debajo de ambos paneles.

Medición (Playwright, 768x1024, antes del fix):

```
catalog  : position=fixed  left=24  width=300  (t=136, b=1160)
resumen  : position=fixed  left=24  width=210  (t=136, b=1160)   <-- mismo origen
contenido: position=static left=24  width=720                    <-- tapado por los dos anteriores
```

Agravantes detectados en la misma revisión:

- Fila de 3 anchos fijos (300 + 210) comprimía la columna de líneas a 216px en 1024px de ancho.
- El `Header` del POS tenía `height: 56` fijo con controles `Space` que hacen wrap: al envolver, la segunda fila se desbordaba **encima** del catálogo.
- La raíz del POS usaba `height: '100vh'` dentro del shell admin (topbar 64px + padding 24px + bottom-nav móvil 80px): ~140px del catálogo quedaban fuera de pantalla.

### Issue 2: QR de mesa abría BioLinks

`frontend/src/pages/public-storefront-page.tsx` elegía la página **antes** de mirar el token de mesa:

```tsx
const preset = tenantConfig?.config?.homepagePreset || tenantConfig?.branding?.config?.homepagePreset || "omnicatalog";
if (preset === "omnilinks" || preset === "biolinks" || preset === "biolinks_catalog") {
  return <PublicBioLinkPage />;   // <-- ganaba el preset
}
```

El tenant de Provecchio (`provecchio-dimora-001`) tiene `homepagePreset: "omnilinks"` en `config` y en `branding.config`, de modo que **toda** URL del dominio, incluido el QR de mesa `/?t=<token>`, renderizaba `PublicBioLinkPage`.

Verificación (producción, 2026-10-19):

```
https://provecchio.com/?t=7b0075a2-…  ->  "¡Bienvenido a nuestra Bio!"   (BioLinks)   BUG
https://provecchio.local/?t=7b0075a2-… -> "MODO RESTAURANTE | Mesa: G10 | Llamar al mozo"  OK
```

La diferencia local/prod es **solo de resolución de tenant**: en local el hostname `provecchio.local` no resuelve tenant y el `BrandingProvider` cae al fallback por `apiKey` (config sin preset), por lo que el bug **no se reprodujo en localhost**.

> Nota de deploy: el bundle desplegado en `provecchio.com` tiene `VITE_ROOT_DOMAIN=pesallaccia.com` bakeado (14 ocurrencias, 0 de `provecchio.com`) aunque `/srv/orderflow/.env.prod` sí declara `VITE_ROOT_DOMAIN=provecchio.com`. Con ese valor `provecchio.com` se detecta como "dominio dedicado" → `isSubdomainStore=true` → entra al storefront, por lo que **no es la causa de este bug**, pero deja la detección de subdominios de tenant inconsistente. Verificar siempre el bundle desplegado:
> `docker exec orderflow_frontend grep -o 'provecchio.com' /app/dist/assets/index-*.js`

---

## Solución Aplicada

### Fix 1 — scope de la regla mobile al sider del admin

`frontend/src/styles/admin-mobile.css`:

```css
@media (max-width: 768px) {
  /* Solo el sider del shell admin. El selector global `.ant-layout-sider` rompía
     los paneles internos del POS (catálogo + resumen) que usan antd Sider:
     los fijaba en position:fixed y los solapaba entre sí. */
  .admin-sider {
    position: fixed !important;
    z-index: 999 !important;
    height: 100vh !important;
  }
}
```

El `Sidebar` del admin ya usa `className="admin-sider"` (`frontend/src/components/Sidebar.tsx`), por lo que la intención original se conserva sin afectar a otras pantallas.

### Fix 2 — layout responsivo del POS (`gastro-pos.tsx`)

```tsx
const screens = Grid.useBreakpoint();
const isWide = !!screens.xl;      // >= 1200px -> 3 columnas
const isMedium = !!screens.md;    // >= 768px  -> catálogo en columna
const catalogWidth = isWide ? 300 : 260;
```

| Viewport | Layout |
|----------|--------|
| `>= 1200px` | Catálogo 300px + Líneas (flex) + Resumen 210px |
| `768–1199px` | Catálogo 260px + Líneas; el **resumen compacto** (con el TOTAL) se renderiza arriba de las líneas |
| `< 768px` | Líneas a ancho completo; el catálogo abre en `Drawer` overlay |

Además:

- `Header` con `height: 'auto'`, `minHeight: 56`, `flexWrap: 'wrap'`, `rowGap: 8` → los controles nunca desbordan sobre el catálogo.
- `Content` con `minWidth: 0` y filas de línea con `flexWrap` + `textOverflow: ellipsis` → los nombres largos no fuerzan scroll horizontal.
- `Sider` con `position: 'relative'` explícito (defensa en profundidad ante reglas `!important` globales).

### Fix 3 — POS a sangre en el shell admin (`AdminApp.tsx`)

```tsx
const isFullBleedRoute = location.pathname.startsWith('/admin/gastro/pos');
```

Con esa ruta el contenido del admin se renderiza sin padding de 24px, sin `borderRadius`, sin `paddingBottom` del bottom-nav móvil y con `height: calc(100vh - 64px)` → el POS usa el viewport completo (`100vh - 64px` del topbar) en vez de `100vh` dentro de una caja con padding.

### Fix 4 — el token de mesa fuerza el menú digital

`frontend/src/pages/public-storefront-page.tsx`:

```tsx
// QR de mesa (/?t=<token>) siempre debe abrir el menú digital (SocialCatalogPage
// en modo restaurante) con la opción de llamar al mozo, sin importar el
// homepagePreset del tenant (p.ej. "omnilinks"), que solo rige la portada.
const tableToken = new URLSearchParams(window.location.search).get('t');
if (tableToken) {
  return <SocialCatalogPage />;
}
```

`frontend/src/App.tsx` aplica la misma garantía a nivel de routing (antes de la detección de dominio/subdominio):

```tsx
const hasTableToken = new URLSearchParams(window.location.search).has("t");
if (hasTableToken) {
  return <SocialCatalogPage />;
}
```

### Fix 5 — `featurelist.json` inválido

FEAT-173 había quedado **fuera** del array `features` (coma y corchete mal cerrados), por lo que `jq`/`json.load` fallaban y `scripts/check-version.sh` reportaba ❌ para `featurelist.json`. JSON reparado y re-serializado.

---

## Verificación

| Test | Resultado |
|------|-----------|
| `frontend/e2e/pos-tablet-responsive.spec.ts` (768x1024, 810x1080, 1024x768) | 5/5 OK — sin intersección catálogo/TOTAL, sin siders `fixed`, sin overflow de header, sin scroll horizontal |
| `https://provecchio.local/?t=<token>` | Muestra "MODO RESTAURANTE · Mesa: G10 · Llamar al mozo" (antes: BioLinks) |
| `npm run build` (frontend) | OK (tsc + vite) |
| `scripts/check-version.sh` | Todos los checks en ✅ (tras re-sincronizar 37 `*.manifest.json` a la versión del core) |

Geometría después del fix (768x1024):

```
catalog  : position=relative  left=0   width=260
contenido: left=260  width=508   (sin solapamiento)
header   : scrollHeight 55 == clientHeight 55 (sin desborde)
docScrollWidth 768 == viewportWidth 768
```

---

## Referencias

- [#171](171-provecchio-pos-products-missing-qr-omnilinks.md) — Provecchio v1.38.21: POS products missing & QR URL shows OmniLinks (mismo síntoma, causa raíz distinta: `VITE_ROOT_DOMAIN`)
- [#172](172-provecchio-qr-t-shows-biolinks.md) — Provecchio v1.38.22: QR `?t=` muestra landing BioLinks (detección de dominio raíz del tenant)
- [#180](180-provecchio-homepage-social-catalog-images.md) — Provecchio homepage con preset `omnilinks`
- [34](34-mobile-admin-drawer-navigation.md) — Mobile Admin: Drawer Navigation & Topbar Compacto (misma familia de estilos responsive del admin)
- AGENTS.md §2.3 (taxonomía de `docs/`), §10 (tokens de tema, sin colores hardcodeados)
