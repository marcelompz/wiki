# Plan de Actualización v1.43.6 — Fix POS de Mozo (envío a cocina / persistencia de líneas / catálogo)

> **Fecha:** 2026-10-27 · **Rama:** `fix/omnigastro-pos-envio-cocina-items` · **Tipo:** fix (patch) · **Origen:** pruebas de producción v1.43.5 en `provecchio.com` (`docs/info/OmniGastro.md`, 2026-10-27)
> **Aprobación del usuario:** ✅ 2026-10-27 (aprobado, 4 ítems completos)

---

## 1. Alcance

| Síntoma reportado | Causa raíz | Archivo |
|---|---|---|
| "Enviar a cocina" no hace nada; cobro no se habilita | `handleSendToKitchen`/`handleClose`/`handleSplitBySeat` leen `order.orderId` (inexistente tras v1.42.1; el CRUD trae `id`) → return silencioso | `frontend/src/pages/admin/gastro-pos.tsx` |
| `Cannot PATCH /api/v1/orders/items` + líneas que desaparecen al reabrir | Líneas nuevas sin `orderId` + fallback con id vacío en `saveLines` → PATCH 404; línea solo en estado local; además `guestUpdateItems` exige reclamo | `gastro-pos.tsx` + `backend/src/orders/orders.service.ts` (guard ya existente, no se modifica) |
| Catálogo del POS muestra muy pocos productos | `getCategoryTree` adjunta el producto solo a `categoryId`; si esa categoría está fuera del árbol el producto queda huérfano | `backend/src/catalog/catalog.service.ts` |
| UX `[+aquí]` poco visible | Enlace de texto plano | `gastro-pos.tsx` |

Impacto transversal: **ningún endpoint nuevo, ninguna migración** → bump `patch 1.43.5 → 1.43.6` (Regla #11).

## 2. Cambios aplicados

1. **`gastro-pos.tsx`**
   - Estado `orders` con todas las órdenes activas de la mesa (set en `loadAll`).
   - `handleSendToKitchen`: itera órdenes activas, `claim` best-effort + `ready` por cada una; reporta éxito parcial/total; aborta si `saveLines` falló (nunca cocina sin los ítems visibles).
   - `saveLines`: devuelve `boolean`; descarta líneas sin orden destino; claim best-effort antes de cada `PATCH /orders/:id/items`; error por pedido.
   - `handleAddProduct`: asigna `orderId` de la orden del asiento seleccionado (o `order.id`).
   - `handleClose` / `handleSplitBySeat`: `order.id`; tag de sesión con `order.id`.
   - `isKitchenSent` / `isReady`: evaluados sobre el total de órdenes abiertas de la sesión.
   - Botón verde **"Agregar aquí"** (`token.colorSuccess`) reemplaza `[+aquí]` (Regla #10).
2. **`catalog.service.ts`**
   - Producto adjunto a la primera categoría **presente en el árbol** (`categoryId` primero, `posCategoryId` como reemplazo); sin duplicados ni cambio de `maxLevel`.

## 3. Efectos secundarios y verificación de dependencias

| Punto de acoplamiento | Evaluación |
|---|---|
| Otros consumidores de `/categories/tree` (admin, OmniCatalog) | El adjunto por pertenencia al árbol no agrega productos duplicados: se mantiene **una** categoría de destino por producto |
| Panel de mozos (`gastro.tsx`) y gestion de mesas (`gastro-tables.tsx`) | No se modifican; ya hacían claim→ready correctamente |
| Caja (`gastro-cashier.tsx`) / `Bill` (FEAT-203) | Sin cambios; el cobro vía sesión sigue dependiendo de órdenes `READY` |
| `featurelist.json` / VERSION / CHANGELOG / ROADMAP | Bump 1.43.6 + entradas de documentación |

## 4. Estrategia de testing

- ✅ `tsc --noEmit` backend y frontend (0 errores) — verificado en rama.
- ⏳ Smoke en `provecchio.local` (backup restaurado, protocolo §3.1.1): flujo QR → pedido → atender → POS agregar ítems → **Enviar a cocina** → verificación `meta.readyAt` en las N órdenes → cobro habilitado.
- ⏳ E2E Playwright del flujo (spec nueva `frontend/e2e/`) documentada en `auditoria` antes del deploy.
- ⏳ Barrera `./scripts/init.sh` (requiere autorización explícita del usuario por consumo de recursos).
- ⏳ Deploy a producción: protocolo completo (backup → restore local → deploy local → pre-deploy diagnostic → `deploy-production.sh provecchio`), con autorización previa del usuario.

## 5. Documentación

- [troubleshooting #208](../../troubleshooting/208-gastro-pos-order-id-lines-catalogo.md) (síntoma, causas y solución) + índice.
- `CHANGELOG.md` entrada 1.43.6 · `ROADMAP.md` versión actual · `VERSION`, `backend/package.json`, `frontend/package.json`, `featurelist.json` a 1.43.6 · `docs/info/OmniGastro.md` con el estado de los ítems del reporte.
