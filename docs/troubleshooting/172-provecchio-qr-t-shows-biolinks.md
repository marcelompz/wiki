# 172 — Provecchio v1.38.22: QR ?t= muestra landing BioLinks en dominio raíz

## Área
Frontend / Routing / Deploy

## Síntoma principal
Tras deploy v1.38.22 en Provecchio, al acceder a `https://provecchio.com/?t=<token>` aparece la landing de BioLinks (LandingBioLinksCatalog) en lugar del menú digital de mesa (SocialCatalogPage en modo Gastro).

## Causa Raíz

En `frontend/src/App.tsx`, la detección `isSubdomainStore` no considera el caso de **dominio raíz del tenant**.

Con `hostname === provecchio.com` y `VITE_ROOT_DOMAIN=provecchio.com`:
- `matchesRootDomain = true`
- `parts.length === rootParts.length` (["provecchio","com"] vs ["provecchio","com"])
- `isTenantSubdomain` requiere `parts.length > rootParts.length` → `false`
- `isDedicatedDomain` requiere `!matchesRootDomain` → `false`
- Resultado: `isSubdomainStore = false` → renderiza `<LandingBioLinksCatalog />` directamente. Nunca entra a `<PublicStorefrontPage />` y por tanto no se evalúa `homepagePreset`.

La homepagePreset solo influye cuando `App.tsx` ya detectó tenant store y renderiza `PublicStorefrontPage`. **No influye cuando se va directo a LandingBioLinksCatalog**.

## Solución Aplicada

Añadir `isTenantRootDomain` en `App.tsx`:

```ts
const isTenantRootDomain = matchesRootDomain && !isSystemSubdomain && hostname !== 'localhost' && hostname !== '127.0.0.1' && parts.length === rootParts.length;
const isSubdomainStore = isDedicatedDomain || isTenantSubdomain || isTenantRootDomain;
```

Con esto, `provecchio.com` pasa a detectarse como tenant store → `App.tsx` renderiza `PublicStorefrontPage` → `SocialCatalogPage` recibe el query `?t=` y activa modo gastro correctamente.

## Archivos modificados
- `frontend/src/App.tsx` — agregar detección dominio raíz tenant

## Notas
- El QR generado desde `gastro-tables.tsx` apunta a `/social-catalog/menudigital?t=...` que bypass App.tsx (va directo a main.tsx route). `gastro.tsx` genera `/?t=...` que pasa por App.tsx. Ambos deben funcionar ahora.
- homepagePreset NO puede forzar biolinks cuando no se llega a PublicStorefrontPage; ese fue el punto clave.

## Referencias
- Troubleshooting #171 — Provecchio v1.38.21: POS Products Missing & QR URL Shows OmniLinks Page
