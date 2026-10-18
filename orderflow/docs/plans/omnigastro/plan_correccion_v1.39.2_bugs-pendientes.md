# Plan de Corrección — OmniGastro v1.39.2 (Bugs Pendientes)

**Fecha:** 2026-10-16  
**Versión objetivo:** 1.39.2  
**Estado:** Plan — pendiente de aprobación del usuario  
**Protocolo:** AGENTS.md §15 (Plan de Acción Previa) y §16 (Plan de Actualización)

## 1. Análisis del problema (docs/info/OmniGastro.md — "Bugs que permanecen")

| # | Síntoma reportado | Estado actual en código | Hallazgo |
|---|-------------------|------------------------|----------|
| 1 | KDS Stations (`/admin/gastro/kds-stations`): categorías/subcategorías apiladas, ocupan toda la pantalla; se pide selección independiente (padres → hojas) + excluir subcategorías (ej. "cake") | `frontend/src/pages/admin/gastro-kds-stations.tsx` YA implementa dos `Select` independientes (padres, hojas, excluir), acción "Seleccionar todas las hojas de padres", `computeCombinedCategories()` y retrocompatibilidad con estaciones existentes. | Fix aplicado, no verificado con E2E ni deploy. |
| 2 | `/admin/gastro/tables` no lista las mesas del modal "Gestión de Mesas y Códigos QR"; no permite editar; el modal ya no muestra mesas | `frontend/src/pages/admin/gastro.tsx` `loadTables()` YA usa `GET /api/v1/tables/floor-map` y aplanan `floors` + `unassignedTables`; modal con `width` responsivo, `bodyStyle` overflowY, `ellipsis` en columnas, `scroll={{ x: true }}`. | Fix aplicado, no verificado con E2E ni deploy. |
| 3 | `https://provecchio.com/social-catalog/menudigital`: no se ven imágenes del logo ni de categorías; `wget` a las URLs directas devuelve HTTP 200 (archivos existen) | No investigado aún. Sospecha frontend: `getImageUrl` (`frontend/src/utils/catalog-utils.ts:7`), `LazyImage` con `IntersectionObserver` (`omni-catalog.tsx:90`) que puede no disparar en headless, o CSP de Traefik bloqueando imágenes. | **Pendiente de investigación.** |
| 4 | Modal "Cargar Pedido": falta cargar pedidos por mesa sin QR / sin mesa (takeout) | `gastro.tsx` modal "Cargar Pedido" YA tiene Select de mesas + "Sin mesa (takeout)", `GET /api/v1/orders?tableId=…&status=…`; backend `orders.service.ts:512` `findAll` soporta `tableId=null` y `orderType=TAKEOUT`. | Fix aplicado, no verificado con E2E ni deploy. |
| 5 | Modal de mesas en `/admin/gastro/mozos` demasiado pequeño, texto desborda | `gastro.tsx` modal YA usa `width={{ xs: '95vw', sm: '90vw', md: '800px', lg: '900px', xl: '1000px' }}` y `bodyStyle={{ maxHeight: 'calc(90dvh - 120px)', overflowY: 'auto' }}`. | Fix aplicado, no verificado con E2E ni deploy. |

Bug 3 (POS empty grid) ya resuelto en v1.39.1.

## 2. Alcance y archivos a modificar

### Sin cambios de código previstos (fixes ya aplicados, solo verificación)
- `frontend/src/pages/admin/gastro-kds-stations.tsx` — Bug 1 (ya aplicado).
- `frontend/src/pages/admin/gastro.tsx` — Bugs 2, 4, 5 (ya aplicados).
- `backend/src/orders/orders.service.ts` — `findAll` con `tableId=null`/`TAKEOUT` (ya aplicado, línea 524).

### Modificaciones pendientes
1. **`featurelist.json`**: root `version` `1.39.1` → `1.39.2`; revisar/eliminar la clave `"version": "1.39.2"` sobrante dentro del objeto FEAT-166 (línea 12).
2. **Investigación Bug 3** (imágenes menudigital): inspeccionar `getImageUrl` en `frontend/src/utils/catalog-utils.ts`, comportamiento de `LazyImage`/`IntersectionObserver` en `omni-catalog.tsx`, URLs almacenadas en `socialConfig` vs las validadas con `wget`, y cabeceras CSP de Traefik (`/opt/traefik-orderflow/dynamic/headers.yml` si existe). Si se confirma causa frontend, aplicar corrección mínima sin colores hardcodeados (usar `theme.useToken()` / variables CSS).
3. **Documentación:**
   - `docs/info/OmniGastro.md`: entrada `2026-10-16 — v1.39.2 DEPLOYED ✅` tras verificación.
   - `docs/plans/omnigastro/auditoria-v1.39.2-bugs-omnigastro.md`: marcar resultados E2E por bug.
   - `CHANGELOG.md`, `ROADMAP.md`, `docs/timeline.md`: entrada v1.39.2.
   - Sincronizar con Wiki `/opt/wiki/orderflow/`.

## 3. Dependencias y efectos secundarios

- `tenantId` sagrado: no se toca ninguna query; sin nuevas migraciones Prisma (plan_actualizacion_1.39.2.md Fase 2/Backend confirma "No se requieren nuevas migraciones").
- Cero colores hardcodeados: modales ya usan `theme.useToken()` y `token.color*`.
- Cero lógica condicionada por `ORDERFLOW_MODE` en services.
- Prohibido `new PrismaClient()`; se usa `this.prisma` / `@TenantPrisma()`.
- E2E requiere datos reales: deploy-to-local-first (backup de `provecchio.com` → restore en `provecchio.local`) antes de ejecutar Playwright contra localhost.
- El despliegue a producción (provecchio.com) requiere autorización explícita del usuario (AGENTS.md Regla 9) y `./scripts/pre-deploy-diagnostic.sh provecchio` previo.

## 4. Plan de acción por fases

### Fase 0 — Contexto (obligatorio, ya realizado)
- [x] Leer `docs/00-contexto-agentes.md`.
- [x] Leer `docs/troubleshooting/README.md` (índice consultado; no hay entrada previa para el Bug 3 de imágenes en menudigital → si se confirma causa raíz, documentar nueva entrada en `docs/troubleshooting/`).
- [x] Inspeccionar archivos sospechosos (`gastro-kds-stations.tsx`, `gastro.tsx`, `orders.controller.ts`, `orders.service.ts`, `catalog-utils.ts`, `omni-catalog.tsx`).

### Fase 1 — Investigación Bug 3 (imágenes menudigital)
- Verificar qué URLs de imagen devuelve el backend para el tenant `provecchio-dimora-001` (socialConfig `logoUrl`, `categoryBackgrounds`, `product.imagesUrls`) y comparar con las validadas por `wget`.
- Probar render de `LazyImage` sin `IntersectionObserver` (fallback `setInView(true)` cuando `IntersectionObserver` es undefined) y comportamiento `opacity` tras `onLoad`.
- Revisar CSP `img-src` en Traefik headers de provecchio.
- Si se confirma causa: corregir en `omni-catalog.tsx` / `catalog-utils.ts` y añadir entrada de troubleshooting.

### Fase 2 — Barrera de validación (requiere confirmación de usuario)
- Ejecutar `./scripts/init.sh` (valida Prisma generate, Jest 100%, build backend, build TypeScript/Vite frontend, auditoría E2E `qa_e2e_check.py`). **Este paso consume alta CPU/RAM; no se ejecuta sin autorización explícita.**

### Fase 3 — Pruebas E2E Playwright (OmniGastro)
- `kds-station-independent-categories.spec.ts`
- `tables-modal-sync.spec.ts`
- `order-modal-load-takeout.spec.ts`
- `modal-responsive.spec.ts` (viewport 1024x768)
- Verificar `/api/v1/health` → versión `1.39.2`, status `ok`.
- Documentar resultados en `auditoria-v1.39.2-bugs-omnigastro.md`.

### Fase 4 — Documentación y versión
- Bump `featurelist.json` root `version` a `1.39.2` (VERSION, backend/package.json, frontend/package.json ya en 1.39.2).
- Entrada en `CHANGELOG.md`, `ROADMAP.md`, `docs/timeline.md`.
- Actualizar `docs/info/OmniGastro.md` con `v1.39.2 DEPLOYED ✅`.
- Commit atómico: `chore(omnigastro): verify v1.39.2 fixes and close pending bugs 1,2,4,5`.
- Tag `v1.39.2` + push a `origin/main`.
- Sincronizar documentación con Wiki `/opt/wiki/orderflow/`.

### Fase 5 — Despliegue a producción (requiere autorización explícita del usuario)
- `./scripts/pre-deploy-diagnostic.sh provecchio` (si fallos críticos ❌, abortar).
- `./scripts/deploy-production.sh provecchio` (solo tras commit y push a `origin/main`).
- Health check: `https://provecchio.com/api/v1/health` → HTTP 200, versión `1.39.2`.
- Sincronizar Traefik `services.yml` si hubo cambios de ruteo y recargar con `docker kill -s HUP traefik`.

## 5. Criterios de aceptación

- [ ] Bug 1: formulario KDS permite seleccionar padres y hojas independientemente; acción "Seleccionar todas las hojas"; payload combinado enviado; estaciones existentes no rompen.
- [ ] Bug 2: `/admin/gastro/tables` y el modal muestran el mismo conjunto de mesas activas; edición en modal refleja en la página (refetch).
- [ ] Bug 3: logo e imágenes de categoría se renderizan en `social-catalog/menudigital` (causa identificada y corregida o confirmada como problema de datos/infraestructura).
- [ ] Bug 4: modal "Cargar Pedido" muestra Select de mesas + "Sin mesa (takeout)"; carga órdenes por `tableId` o `tableId=null`; "Gestionar Pedido" navega al POS.
- [ ] Bug 5: modal en mozos ancho responsivo ≤ viewport, sin overflow de texto, scroll interno, probado en tablet 1024x768.
- [ ] `./scripts/init.sh` pasa sin errores (con autorización de usuario).
- [ ] Todas las pruebas E2E OmniGastro pasan.
- [ ] `/api/v1/health` devuelve versión `1.39.2`.
- [ ] Sin warnings críticos TS/Jest.

## 6. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Bug 3 es de datos/CSP e no de código | Medio | Investigar antes de asumir corrección frontend; documentar en troubleshooting. |
| `init.sh` satura recursos del host | Alto | Ejecutar solo con confirmación explícita del usuario (AGENTS.md §3). |
| Despliegue sin commit/push pierde cambios | Alto | Commit y push a `origin/main` obligatorios antes de `deploy-production.sh`. |
| Romper estaciones KDS existentes | Medio | No hay cambios de schema; reutilizar `categories: string[]` existente. |

---

**Siguiente paso:** confirmación del usuario para proceder con la implementación (Fases 1-4; la Fase 5 de despliegue a producción requiere autorización separada y explícita).
