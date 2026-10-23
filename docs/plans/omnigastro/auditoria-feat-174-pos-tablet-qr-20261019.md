# Auditoría FEAT-174 — POS responsivo en tablet + QR de mesa con menú digital (v1.39.9)

**Fecha:** 2026-10-19
**Vertical:** OmniGastro (POS & QR público)
**Origen:** bugs reportados en el despliegue v1.39.8 (provecchio.com)
**Rama:** `fix/gastro-pos-tablet-responsive`

---

## 1. Bugs reportados

| # | Reporte | Endpoint | Severidad |
|---|---------|----------|-----------|
| 1 | "al estar en la tablet (responsive design) el total y la lista de productos se solapa" | `/admin/gastro/pos/:tableId` | Alta — bloquea el uso del POS en tablet |
| 2 | "El QR de la mesa G10 abre bio-links, no el endpoint de social-catalog que muestra el menu digital y permite llamar al mozo" | `https://provecchio.com/?t=7b0075a2-811e-440c-b426-26fbf2b52e33` | Alta — el comensal no puede pedir ni llamar al mozo |

---

## 2. Diagnóstico (reproducción con Playwright + inspección del bundle desplegado)

### Bug 1 — solapamiento TOTAL ↔ catálogo

Reproducción en `https://provecchio.local/admin/gastro/pos/fa37f634-09b5-4743-8c56-baaab355a210` a 768x1024 (antes del fix):

```
catalog  : position=fixed  left=24  width=300
resumen  : position=fixed  left=24  width=210   <-- mismo origen => se superponen
contenido: position=static left=24  width=720   <-- tapado por ambos paneles
```

Causa raíz: `frontend/src/styles/admin-mobile.css` aplicaba `position: fixed !important` a **todo** `.ant-layout-sider` en ≤768px. El POS del mozo usa dos `Sider` de Ant Design (catálogo 300px y resumen 210px con el TOTAL), por lo que ambos se fijaban y se apilaban en el mismo origen.

Factores agravantes detectados: fila de 3 anchos fijos, `Header` de 56px con `Space` que hace wrap (desbordaba sobre el catálogo) y `height: '100vh'` del POS dentro del shell admin (topbar 64 + padding 24 + bottom-nav 80 → ~140px fuera de pantalla).

### Bug 2 — QR de mesa abre BioLinks

```
https://provecchio.com/?t=7b0075a2-…  ->  "¡Bienvenido a nuestra Bio!"        (BioLinks)  BUG
https://provecchio.local/?t=7b0075a2-… -> "MODO RESTAURANTE | Mesa: G10 | Llamar al mozo"  OK
```

Causa raíz: `frontend/src/pages/public-storefront-page.tsx` elegía la página por `homepagePreset` **antes** de mirar el token `?t=`. El tenant `provecchio-dimora-001` tiene `homepagePreset: "omnilinks"` (en `config` y en `branding.config`), por lo que el QR de mesa renderizaba `PublicBioLinkPage`.

La divergencia local/producción se explica por la resolución de tenant: en local el hostname `provecchio.local` no resuelve tenant y el `BrandingProvider` cae al fallback por `apiKey` (config sin preset) — el bug **no se reprodujo en localhost**, sí en producción.

Hallazgo de infra adicional: el bundle desplegado en `provecchio.com` tiene `VITE_ROOT_DOMAIN=pesallaccia.com` bakeado (14 ocurrencias, 0 de `provecchio.com`) aunque `/srv/orderflow/.env.prod` declara `VITE_ROOT_DOMAIN=provecchio.com`. No es la causa de este bug (con ese valor `provecchio.com` se detecta como dominio dedicado y entra al storefront), pero deja inconsistente la detección de subdominios de tenant. Verificar siempre con:

```bash
docker exec orderflow_frontend grep -o 'provecchio.com' /app/dist/assets/index-*.js | head
```

---

## 3. Cambios implementados

| Archivo | Cambio |
|---------|---------|
| `frontend/src/styles/admin-mobile.css` | Regla mobile de `position: fixed` scopeada a `.admin-sider` (el sider real del shell admin) en lugar de `.ant-layout-sider` global |
| `frontend/src/pages/admin/gastro-pos.tsx` | Layout responsivo con `Grid.useBreakpoint()`: ≥1200px 3 columnas (catálogo 300 + líneas + resumen 210), 768–1199px 2 columnas (catálogo 260 + líneas, resumen compacto arriba), <768px catálogo en `Drawer`; `Header` con `height:auto` + `flexWrap`; `minWidth:0` y wrap en las filas de línea; contenido de catálogo y de resumen extraídos a bloques reutilizables |
| `frontend/src/AdminApp.tsx` | Ruta `/admin/gastro/pos/*` renderizada a sangre (sin padding, sin `borderRadius`, sin bottom-nav móvil, `height: calc(100vh - 64px)`, `overflow:hidden`) |
| `frontend/src/pages/public-storefront-page.tsx` | `?t=` (token de mesa) fuerza `SocialCatalogPage` (modo restaurante) con independencia de `homepagePreset` |
| `frontend/src/App.tsx` | Misma garantía a nivel de routing: `?t=` resuelve al catálogo social antes de la detección de dominio/subdominio |
| `featurelist.json` | JSON inválido reparado (FEAT-173 estaba fuera del array `features`); FEAT-174 registrada; versión 1.39.9 |
| `frontend/e2e/pos-tablet-responsive.spec.ts` | Nueva spec Playwright (5 casos) |
| `frontend/e2e/omnigastro.spec.ts` | 3 tests preexistentes rotos (no relacionados con el fix): selectores que no matcheaban (`text=Buscar producto` sobre un `input`, `[class*="collapse"]` que matcheaba el sider del admin, `text=TOTAL` con strict-mode violation) y creación de comensales no idempotente → corregidos |

Sin cambios de backend, sin migraciones, `tenantId` intacto, sin colores hardcodeados (solo `theme.useToken()`).

---

## 4. Validación

### 4.1 Geometría del POS (post-fix)

| Viewport | Catálogo | Líneas | Resumen | Overlap | Scroll H | Header overflow |
|----------|----------|--------|---------|---------|----------|-----------------|
| 768x1024 | 0–260 (`relative`) | 260–768 (508px) | compacto arriba | ❌ | ❌ | 0px |
| 810x1080 | 0–260 (`relative`) | 260–810 (550px) | compacto arriba | ❌ | ❌ | 0px |
| 1024x768 | 250–510 (260px) | 510–1024 (514px) | compacto arriba | ❌ | ❌ | 0px |
| 1440x900 | 250–550 (300px) | 550–1230 (680px) | 1230–1440 (210px) | ❌ | ❌ | 0px |

### 4.2 E2E Playwright

- `frontend/e2e/pos-tablet-responsive.spec.ts` — **5/5 OK** contra `provecchio.local`
  - 3 viewports de tablet: sin intersección catálogo/TOTAL, sin `Sider` en `position:fixed`, sin desborde del header, sin scroll horizontal
  - catálogo, líneas y total visibles
  - `/?t=<token>`: muestra "Llamar al mozo" y **no** muestra "nuestra Bio"
- `frontend/e2e/omnigastro.spec.ts` — **22/22 OK** (antes 3 fallos preexistentes)
- Suite E2E completa — ver §4.4

### 4.3 Build

- `cd frontend && npm run build` → OK (tsc + vite + PWA)

### 4.4 Suite E2E completa

Resultado en `provecchio.local` (post-fix): ver `CHANGELOG.md` v1.39.9.

### 4.5 Importación de datos (AGENTS.md §14)

- `GET /api/v1/product-imports/suppliers` → 1 proveedor de catálogo activo para el tenant ✅
- `GET /api/v1/product-imports/jobs` → OK ✅

---

## 5. Pendiente para el deploy

1. `./scripts/init.sh` (requiere confirmación explícita del usuario por consumo de CPU/RAM).
2. `./scripts/deploy-production.sh provecchio` (requiere autorización explícita).
3. Verificar el bundle desplegado con `VITE_ROOT_DOMAIN=provecchio.com` (ver §2).
4. Tag `v1.39.9` + push, sincronización de la Wiki.
