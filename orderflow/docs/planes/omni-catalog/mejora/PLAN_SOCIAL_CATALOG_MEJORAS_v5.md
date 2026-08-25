# Plan: Mejoras de Social-Catalog (v5)

> **Módulo:** `social-catalog`  
> **Alcance:** Backend + Frontend  
> **Base:** v3 (auditoría prod) + tema/móvil (screencast) + **unificación Carta física / Manual** en un solo orden de admin con label configurable.  
> **Principio:** no reimplementar lo ya desplegado; completar UI, datos, tema y banner.

---

## 0. Estado en producción (auditoría 2026-08-24)

| Capacidad | Estado |
|-----------|--------|
| `order` en productos públicos | Expuesto; en Di Mora todo en `0` |
| `sortBy` | API operativa (se simplifica en este plan) |
| `ribbon` / `tags` | Expuestos; sin asignaciones en Di Mora |
| `showRibbons: true` | Sí |
| `stockStatus` | AGOTADO + Pocas unidades; **no visto** last unit |
| Selector “Relevancia” | Visible; en móvil se corta |
| Búsqueda móvil | Solo icono |
| `theme: "system"` | En config; UI del screencast solo clara |
| `/featured` | **404** |
| Config banner | Ausente |

---

## 1. Tema claro / oscuro y contraste (transversal)

Pipeline: **tokens → `cssVars` → componentes**.

| Modo | Comportamiento |
|------|----------------|
| `light` / `dark` | Forzado |
| `system` (default) | `prefers-color-scheme` + listener |

- Tokens: superficies, texto, bordes, marca, `danger` / `warning` / `success`, controles, `focusRing`.
- Contraste ≥ 4.5:1 (texto/badges); Ribbon/Tag → `getContrastingTextColor(bg)`.
- `headerBgColor` / `bodyBgColor` = overrides de marca (variantes en oscuro; no hex literales que pisen el tema).
- `data-theme` en root; alinear Ant Design dark; evitar FOUC.
- Toggle opcional sol/luna + `localStorage` (SC-08).

**Criterios:** system/light/dark OK · contraste AA · header legible en oscuro.

---

## 2. Toolbar móvil: buscador, filtros y orden

Problema (screencast): 4 controles en una fila → “Relevancia” cortado; búsqueda solo icono.

**Mobile (< 768px):**

```
Fila 1: [ 🔍 Buscar productos…              ]
Fila 2: [ Categorías ▾ ] [ Filtros ] [ Orden ▾ ]
```

- Input siempre visible; bottom sheets para Categorías / Filtros / Orden.
- Desktop: una barra, labels completos.
- Targets ≥ 44px; `safe-area-inset-bottom`.

**Criterios:** usable ~390px · búsqueda explícita · misma función que desktop.

---

## 3. Alertas de inventario

| Condición | status | label | token |
|-----------|--------|-------|-------|
| `<= 0` | `out_of_stock` | AGOTADO | `danger` |
| `=== 1` | `last_unit` | ¡Última unidad! | `warning` |
| `> 1 && <= 5` | `low_stock` | Pocas unidades | `warning` light |
| `> 5` | `null` o `available` (documentar) | — | — |

Badges con `cssVars`; filtro admin; opcional notif a 1 unidad.

**Criterios:** tres estados visibles · stock > 5 sin alerta · legible claro/oscuro · filtro admin.

---

## 4. Ribbon + Tag (central Product)

- Sin tablas nuevas en social-catalog.
- API ya expone `ribbon` / `tags`.
- Render: badge esquina + chips; ocultar si vacío.
- Contraste con helper de luminosidad + tokens (§1).
- Datos de prueba desde admin Product.

**Criterios:** Ribbon/Tags visibles en prueba · cero tablas labels propias · contraste OK.

---

## 5. Ordenamiento (unificado)

### Decisión de producto

**Carta física** y **Manual** eran el mismo concepto: un orden preestablecido por el Admin.  
Se fusionan en **un solo criterio** `sortBy=admin`, con **nombre expuesto configurable**.

| Concepto | Quién | Qué |
|----------|-------|-----|
| Orden base | Admin | `categoryOrder` + `Product.order` (drag & drop) |
| Label público | Admin | ej. `"Carta física"`, `"Nuestra carta"`, `"Menú del día"` |
| Otros criterios | Sistema | precio, nombre, stock (labels fijos) |

**Selector público (ejemplo):**

```
Orden: [ Carta física ▾ ]     ← adminSortLabel
         Precio: menor a mayor
         Precio: mayor a menor
         Nombre: A-Z
         Stock: mayor a menor
```

Fallback si no hay label: `"Orden del menú"`.

### Contrato API

```text
sortBy = admin | price_asc | price_desc | name | stock_desc
```

- **`admin`:** categorías según `categoryOrder`; dentro de cada una, productos por `Product.order`.
- Deprecar `carta_fisica` y `manual` como valores distintos (alias → `admin` durante transición).

### Config

```ts
adminSortLabel?: string | null  // nombre en el selector público
```

### Drag & drop (admin)

1. Lista ordenable (por categoría o contexto del admin).
2. On drop → recalcular `order` (`0..n-1` o gaps de 10).
3. Persistencia optimista + rollback si falla el batch `PATCH`.
4. Mismo patrón reutilizable en Banner Modo B (`CatalogFeaturedProduct.order`).

### Criterios de aceptación

- [x] Admin reordena con drag & drop; `order` persiste al recargar.
- [x] Admin define el nombre del criterio (`adminSortLabel`).
- [x] El público ve ese nombre en el selector (no "Manual" fijo).
- [x] Público puede ordenar por precio, nombre y stock.
- [x] Selector usable en móvil (§2).

---

## 6. Banner de productos destacados

### Modo A — por Tag (COMPLETADO ✅ v1.20.18)

- Config: `featuredBannerEnabled`, `featuredBannerMode: 'tag'`, `featuredTagId`.
- Productos con ese tag; orden por `Product.order`.
- Sin tabla nueva.
- `GET /api/v1/public/social-catalog/featured` implementado.
- Frontend: carousel autoplay con `Carousel` de AntD + `LazyImage`; badge stock integrado; off/vacío = no render.

### Modo B — manual (COMPLETADO ✅ v1.20.19)

- Tabla `CatalogFeaturedProduct` (`tenantId`, catalog/instance key, `productId`, `order`, `addedAt`).
- CRUD + drag & drop (mismo patrón que §5).
- Endpoints admin: `GET /featured-products`, `POST /featured-products`, `DELETE /featured-products/:productId`, `PATCH /featured-products/order`.
- Picker multi-selección con `Table` rowSelection.
- Frontend público: reutiliza el carousel del Mode A (lee del endpoint `/featured`).

**Criterios:** enable/disable · modo tag | manual · contraste · vacío = cero UI.

---

## Orden de implementación

| # | ID | Entrega |
|---|-----|----------|
| 1 | SC-01 | Tema + tokens + `data-theme` | ✅ |
| 2 | SC-02 | Toolbar móvil (buscador / filtros / orden) | ✅ |
| 3 | SC-03 | Inventario: matriz + badges tokenizados | ✅ |
| 4 | SC-04 | Ribbon / Tags render + datos de prueba | ✅ |
| 5 | SC-05 | Orden admin unificado + DnD + `adminSortLabel` | ✅ |
| 6 | SC-06 | Banner Modo A (Tag) | ✅ |
| 7 | SC-07 | Banner Modo B (manual + migración) | ✅ |
| 8 | SC-08 | Opcionales (notif stock, toggle tema, caché featured, OpenAPI) | ⏳ Pendiente |

```
SC-01 (tema)
  ├─ SC-02 (toolbar móvil)
  ├─ SC-03 (stock badges)
  ├─ SC-04 (ribbon/tags) ──► SC-06 (banner A) ──► SC-07 (banner B)
  └─ SC-05 (orden + DnD) ────────────────────────────┘
SC-08 ← SC-01, SC-03, SC-06
```

**Sprints:** Sprint 1 → SC-01–03 · Sprint 2 → SC-04–05 · Sprint 3 → SC-06–07 · Backlog → SC-08

---

## Tickets (listos para GitHub / Linear)

### SC-01 — Sistema de tema claro/oscuro y tokens
**P0** · Frontend (theme) · Deps: —

Pipeline tokens → cssVars → componentes (`light` | `dark` | `system`).

- Tokens: superficies, texto, bordes, marca, danger/warning/success, controles, focusRing
- `data-theme` en root; system sin FOUC
- Overrides de marca sin pisar tema oscuro
- Alinear Ant Design / Refine dark

**AC:** theme config OK · contraste AA · header legible en oscuro

---

### SC-02 — Toolbar móvil: buscador, filtros y orden
**P0** · Frontend público · Deps: SC-01 (ideal)

Corregir overflow móvil (screencast).

- <768px: búsqueda full width + fila Categorías | Filtros | Orden
- Bottom sheets; desktop una barra con labels completos
- Targets ≥ 44px; safe-area

**AC:** ~390px sin cortes · búsqueda explícita · misma función que desktop

---

### SC-03 — Inventario: matriz completa + badges tokenizados
**P0** · Backend + Frontend · Deps: SC-01

Cerrar `last_unit`, contrato disponible y badges con cssVars.

- Matriz out_of_stock / last_unit / low_stock / (null|available)
- Público: 3 badges · Admin: badge + filtro

**AC:** tres estados · stock>5 sin alerta · legible claro/oscuro · filtro admin

---

### SC-04 — Ribbon y Tags: render público + datos de prueba
**P1** · Frontend (+ schema Tag si falta) · Deps: SC-01

Consumir Ribbon/Tag de Product. Sin tablas nuevas.

- Badge esquina + chips; contraste con luminosidad
- Datos de prueba en admin Product

**AC:** visibles en prueba · cero tablas labels en social-catalog · contraste OK

---

### SC-05 — Orden admin unificado + DnD + adminSortLabel
**P1** · Backend + Frontend · Deps: SC-02, SC-01

Un solo `sortBy=admin` (fusione carta/manual) + label configurable + drag & drop.

- Config `adminSortLabel` (ej. “Carta física”)
- API: `admin | price_asc | price_desc | name | stock_desc`
- Compat: mapear `carta_fisica`/`manual` → `admin` si hace falta
- Admin DnD → batch PATCH `Product.order`
- Poblar order en staging para QA

**AC:** DnD persiste · label configurable en selector · precio/nombre/stock OK · usable en móvil

---

### SC-06 — Banner destacados Modo A (por Tag)
**P1** · Backend + Frontend · Deps: SC-04, SC-01

Carrusel MVP sin tabla nueva.

- Config enabled + mode tag + featuredTagId
- GET `/featured` · carrusel cssVars · vacío/off = no render

**AC:** enable/disable · productos del tag automáticos · contraste · cero UI residual

---

### SC-07 — Banner destacados Modo B (manual)
**P2** · Backend + Frontend · Deps: SC-05, SC-06

Lista curada + migración.

- `CatalogFeaturedProduct` · DnD reutilizado de SC-05 · staging antes de prod

**AC:** lista ordenable · independiente del tag · migración en staging · mismos criterios visuales que A

---

### SC-08 — Opcionales / polish
**P3** · Deps: SC-01, SC-03, SC-06

- [ ] Notificación admin stock = 1
- [ ] Toggle tema UI + persistencia
- [ ] Caché / include acotado en `/featured`
- [ ] OpenAPI de `sortBy`

---

## Fuera de alcance

- Tablas `ProductLabel` / `ProductLabelAssignment` en social-catalog
- Dos modos distintos “Carta física” vs “Manual” como `sortBy` separados
- Reimplementar `stockStatus` o sort desde cero (salvo umbral `=== 1` y unificación admin)
- Rediseño total de marca / app nativa

---

## Riesgos

- **`order` en cero:** sin datos el orden admin no se nota → cargar en staging.
- **Hex del config** no deben pisar el tema oscuro.
- **Ant Design dark** alineado a tokens.
- **FOUC** con `system`.
- **Migración Modo B** solo en staging primero.
- **Compat** `carta_fisica`/`manual` → alias a `admin` durante transición.
- **Contrato** `stockStatus` null vs available: unificar y documentar.

---

## Referencias

- `backend/prisma/schema.prisma` — Product, Tag, Ribbon
- `frontend/src/pages/social-catalog.tsx` · `admin/social-catalog.tsx`
- `backend/src/social-catalog/social-catalog.service.ts`
- `frontend/src/theme/tokens.ts`, `theme.ts`
- Producción: https://provecchio.com/ (audit API 2026-08-24)
- Screencast móvil 2026-08-24

---

## Changelog

| Ver | Cambio |
|-----|--------|
| v1 | Ordenamiento, labels propios, stock |
| v2 | Ribbon/Tag central; banner A/B |
| v3 | Ajuste a lo desplegado en prod |
| v4 | + tema/contraste + toolbar móvil |
| v5 | Unifica Carta física + Manual → `sortBy=admin` + `adminSortLabel`; documento único con tickets SC-01…SC-08 |
| v5.1 | **2026-08-24:** SC-01 (theme claro/oscuro + tokens), SC-02 (toolbar 2 filas móvil), SC-03 (stock badges ¡Última unidad!), SC-04 (ribbon/tags render), SC-05 (orden admin unificado + adminSortLabel) completados y desplegados. Bugfix visibilidad toggles `false` (throubleshooting #57). Versión producción v1.20.18.
