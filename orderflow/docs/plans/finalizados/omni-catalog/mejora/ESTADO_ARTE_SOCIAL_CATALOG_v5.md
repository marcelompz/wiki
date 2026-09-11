# Estado del Arte: Social Catalog UX/UI Mejoras v5

**Fecha:** 2026-08-24 19:23  
**Versión del producto:** v1.20.18 (production)  
**Entorno:** https://provecchio.com/social-catalog  

---

## 1. Estado Actual de Implementaciones (SC-01 → SC-08)

| Ticket | Descripción | Estado | Detalles | Deploy |
|--------|-------------|--------|----------|--------|
| **SC-01** | Sistema tema claro/oscuro y tokens | ✅ **Completado** | Tokens `tokens.ts` ajustados (texto prim/sec/muted +contraste). Footer del catálogo usa `cssVars.bgElevated` instead of `#1e293b`. | ✅ v1.20.18 |
| **SC-02** | Toolbar móvil responsive (2 filas) | ✅ **Completado** | `isMobile` state + resize listener. Mobile: Row 1 buscador full-width, Row 2: Categorías/Filtros/Orden/ViewMode. Desktop: layout actual. | ✅ Hoy (2026-08-24) |
| **SC-03** | Inventario: last_unit badge | ⏳ **Pendiente** | Backend ya expone `stockStatus`. Frontend no distingue `=== 1` → "¡Última unidad!". Necesita helper `getStockStatus()`. | ❌ |
| **SC-04** | Ribbon/Tags render público | ✅ **Completado** | Ribbons y tags ya se renderizan en card y list mode (líneas 594-606, 615-636). Datos de prueba pendientes en prod. | ✅ v1.20.18 |
| **SC-05** | Orden admin unificado + adminSortLabel | ⚠️ **Parcial** | `sortBy="admin"` funciona (línea 1251). Falta: (a) `adminSortLabel` configurable en admin, (b) drag&drop, (c) alias para `carta_fisica`/`manual` → `admin`. | ✅ Parcial |
| **SC-06** | Banner Modo A (Tag) | ❌ **Pendiente** | Endpoint `/featured` retorna 404. No implementado. | ❌ |
| **SC-07** | Banner Modo B (manual) | ❌ **Pendiente** | Tabla `CatalogFeaturedProduct` no existe. | ❌ |
| **SC-08** | Opcionales: toggle tema UI, notif stock | ⚠️ **Parcial** | Toggle tema funciona (sol/luna) pero no persiste el override del visitante. Notif stock=1 no implementada. | ✅ Parcial |

---

## 2. Estado de los Datos en Producción

### Backend (social-catalog.service.ts)

| Feature | Estado | Observación |
|---------|--------|-------------|
| `Product.order` | ✅ Expuesto | En Di Mora todos productos en `0` |
| `categoryOrder` | ✅ Expuesto | Config admin (no admin panel) |
| `stockStatus` | ✅ Generado | AGOTADO (≤0) + Pocas unidades (1-5). **Sin last_unit** para ===1 |
| `ribbon` | ✅ Expuesto | Sin datos en Di Mora |
| `tags` | ✅ Expuesto | Sin datos en Di Mora |
| `adminSortLabel` | ❌ No existe | Selector usa "Carta física" hardcodeado |
| `featuredTagId` / `featuredBannerEnabled` | ❌ No existen | Config banner ausente |
| `/api/v1/public/social-catalog/featured` | ❌ 404 | Endpoint no implementado |

### Frontend (social-catalog.tsx)

| Feature | Estado |
|---------|--------|
| View mode toggle (cliente) | ✅ Implementado (lista/tarjeta con localStorage) |
| showProductImages toggle | ✅ Implementado (admin + respetado en todas vistas) |
| isMobile responsive toolbar | ✅ Implementado (SC-02) |
| Dark theme contrast | ✅ Mejorado (SC-01) |
| Product cover variable | ✅ Extraído (evita JSX ternary parsing) |
| Stock badges | ⚠️ 2 estados (AGOTADO, Pocas). Falta last_unit |

---

## 3. Análisis de Gap vs Plan v5

### ✅ Implementado y Desplegado
1. **Tema + contraste** (SC-01)
2. **Toolbar móvil responsive** (SC-02) 
3. **Toggle cliente vista lista/tarjeta** (parte SC-02)
4. **Ribbon/Tags en UI pública** (SC-04)
5. **showProductImages admin** (existente, parte SC-04)

### ⚠️ Parcialmente Implementado
1. **OrderBy admin** - Funciona pero no hay adminSortLabel configurable ni DnD
2. **Toggle tema visitor** - Funciona pero no persiste override (solo system pref)

### ❌ No Implementado
1. **SC-03**: last_unit badge (stock === 1)
2. **SC-05**: adminSortLabel configurable, drag&drop ordenamiento
3. **SC-06**: Endpoint `/featured`, banner por tag
4. **SC-07**: Tabla `CatalogFeaturedProduct`, banner manual
5. **SC-08**: Notificación admin cuando stock = 1 unidad

---

## 4. Próximos Sprints Recomendados

### Sprint 3 (Alto Prioridad)
| Ticket | Descripción | Esfuerzo |
|--------|-------------|----------|
| **SC-03** | `getStockStatus()` helper + badge "¡Última unidad!" | Bajo |
| **SC-05 (adminSortLabel)** | Input texto en admin config + usarlo en frontend Select | Bajo |

### Sprint 4 (Media Prioridad)
| Ticket | Descripción | Esfuerzo |
|--------|-------------|----------|
| **SC-05 (DnD)** | Drag&drop productos en admin → PATCH batch `order` | Medio |
| **SC-08 (notif stock)** | Job scheduler para notificar admin cuando stock = 1 | Medio |

### Sprint 5 (Baja Prioridad / Backlog)
| Ticket | Descripción | Esfuerzo |
|--------|-------------|----------|
| **SC-06** | Banner por tag + endpoint `/featured` | Alto |
| **SC-07** | Tabla `CatalogFeaturedProduct` + DnD + migración | Alto |
| **SC-08 (toggle persistencia)** | Persistir `visitorOverride` en localStorage con clave por catalog | Bajo |

---

## 5. Validación E2E (último deploy 2026-08-24 19:23)

```
✅ Catálogo público: 3 imágenes verificadas (HTTP 200, naturalWidth válido)
✅ Dominio provecchio.com: 0 errores JS en consola
✅ Auth + DB: sin HTTP 500
✅ Admin routes: todos los módulos HTTP 200
```

Build: ✅ Vite 3842 modules transformed, 44.05 kB gzip (social-catalog chunk)
