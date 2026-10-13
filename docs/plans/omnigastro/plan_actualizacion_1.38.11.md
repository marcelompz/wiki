# Plan de Actualización 1.38.11 — OmniGastro (Mozo POS, Sidebar, Menú Digital)

**Alcance:** 3 cambios front-end + 1 fix de datos. Versión 1.38.10 → 1.38.11 (patch).

---

## Cambio 1: Sidebar — Mover `/admin/products` de OMNICRM a INVENTARIO

**Archivo:** `frontend/src/components/Sidebar.tsx`

**Acciones:**
1. Eliminar la línea `{ key: '/admin/products', label: 'Catálogo Maestro de Productos', icon: '📇', moduleId: 'products' },` del grupo `group-crm` (línea 60).
2. Agregarla al grupo `group-inventario` (después de la línea 43, antes del cierre del grupo):
   `{ key: '/admin/products', label: 'Catálogo Maestro de Productos', icon: '📇', moduleId: 'products' },`

**Verificación:** `products` ya está en `defaultCoreModules` (línea 148), así que la visibilidad no cambia. Solo el grupo visual.

---

## Cambio 2: Ruta `menudigital` con herencia de fondo de categoría

**Problema:** `gastro-tables.tsx:366` genera URLs del tipo `/social-catalog/menudigital?t=...`. El route `/?t=...` (standalone) sí hereda fondo de categoría, pero `menudigital` no.

**Archivos afectados:**
- `frontend/src/pages/omni-catalog.tsx` — SocialCatalogPage
- `frontend/src/App.tsx` — enrutamiento

**Acciones:**
1. Buscar en `App.tsx` las rutas de `social-catalog` y `/social-catalog/menudigital`.
2. Verificar cómo `omni-catalog.tsx` maneja el parámetro `t` (token) y el fondo de categoría.
3. Agregar route `/social-catalog/menudigital` que apunte al mismo componente `SocialCatalogPage` con la misma lógica de herencia de fondo de categoría que `/?t=...`.
4. Si `omni-catalog.tsx` ya maneja ambos paths internamente, solo falta asegurar que el route exista en `App.tsx`.

---

## Cambio 3: Omitir `waiterOptions` del response del QR

**Problema:** `guest-tables.controller.ts:19-68` retorna `waiterOptions` desde `tenant.config.gastro.waiterOptions`. Esto permite que el cliente elija entre opciones como "Tomar Orden", "Cuenta", etc. Los mozos toman el pedido directamente; el cliente no debe elegir.

**Acciones:**
1. En `guest-tables.controller.ts`, eliminar el campo `waiterOptions` del response (línea 53 y 68).
2. Verificar si el frontend (`omni-catalog.tsx`) consume `waiterOptions` y eliminar esa lógica si es innecesaria.

---

## Cambio 4: Mozo POS Modal con CRUD de líneas de pedido

**Problema:** `gastro-mozos.tsx` renderiza `<GastroPage />` tras login PIN, pero `gastro.tsx` (GastroPage) solo muestra órdenes en cards con botones Claim/Ready/Close. No hay un modal POS/comandera donde el mozo pueda agregar/editar/ eliminar líneas de un pedido de mesa.

**Ficha 360° Mozo (§3.2, §4.1):** El flujo espera que el mozo tome pedidos con CRUD de líneas usando `PATCH /api/v1/orders/:id/items`.

**Archivos afectados:**
- `frontend/src/pages/admin/gastro.tsx` — GastroPage, agregar modal POS
- `frontend/src/pages/admin/gastro-mozos.tsx` — posiblemente sin cambios (usa GastroPage)

**Acciones:**
1. En `gastro.tsx`, cuando el usuario hace clic en una orden (card actualmente abre "Ver y enviar a cocina"), en su lugar abrir un **Modal POS/Comandera** que muestre:
   - Header: mesa, mozo, estado, total
   - Lista de líneas con quantity, nombre, precio unitario, subtotal
   - Botón para agregar línea (selector de producto con buscador)
   - Botón para editar quantity o eliminar línea
   - Botón "Enviar a cocina" (llama `POST /api/v1/orders/:id/send-to-kitchen`)
   - Botón "Lista" (llama `POST /api/v1/orders/:id/ready`)
   - Botón "Cerrar" con dropdown de 3 modos de pago
2. Usar `PATCH /api/v1/orders/:id/items` para CRUD de líneas (agregar, actualizar quantity, eliminar).
3. El modal debe ser responsive y usable en tablet (tamaños grandes, botones grandes).

---

## Testing

- `Sidebar.tsx`: verificar que `/admin/products` aparece bajo "2. INVENTARIO" y no bajo "4. OMNICRM".
- `omni-catalog.tsx` / `App.tsx`: navegar a `/social-catalog/menudigital?t=<token>` y verificar que el fondo de categoría se hereda igual que `/?t=<token>`.
- `guest-tables.controller.ts`: verificar que `waiterOptions` nunca es `undefined` (al menos `[]`).
- `gastro.tsx`: flujos de mozo E2E:
  1. Login PIN mozo en `/admin/gastro/mozos`
  2. Hacer clic en una orden → abre modal POS
  3. Agregar línea de producto → PATCH items
  4. Editar quantity → PATCH items
  5. Eliminar línea → PATCH items
  6. Enviar a cocina → POST send-to-kitchen
  7. Marcar listo → POST ready
  8. Cerrar con cada modo de pago → POST close

---

## Deploy

1. Commit en branch `feat/omnigastro-mozo-pos-sidebar-1.38.11`
2. Push a `origin/main`
3. `./scripts/deploy-local.sh --skip-tests --skip-e2e` (validación local)
4. Verificar health endpoint y endpoints afectados
5. `./scripts/deploy-production.sh production` (con autorización del usuario)

---

## Archivos a modificar

|Archivo | Cambio |
|--------|--------|
| `frontend/src/components/Sidebar.tsx` | Mover `/admin/products` a grupo INVENTARIO |
| `frontend/src/App.tsx` | Asegurar route `/social-catalog/menudigital` |
| `frontend/src/pages/omni-catalog.tsx` | Herencia de fondo de categoría para `menudigital` |
| `backend/src/guest/guest-tables.controller.ts` | Fix `waiterOptions` undefined → `|| []` |
| `frontend/src/pages/admin/gastro.tsx` | Modal POS/Comandera con CRUD de líneas |

**Version bump:** 1.38.10 → 1.38.11 (patch) en `VERSION`, `backend/package.json`, `frontend/package.json`, `featurelist.json`.

¿Aprobado?