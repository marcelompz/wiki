# Troubleshooting #208: POS de Mozo — "Enviar a cocina" sin efecto, `Cannot PATCH /api/v1/orders/items`, líneas que se pierden y catálogo con pocos productos

**Fecha:** 2026-10-27
**Versión reportada:** v1.43.5 (producción `provecchio.com`)
**Fix:** v1.43.6 (rama `fix/omnigastro-pos-envio-cocina-items`)
**Severidad:** 🔴 Alta — flujo QR → pedido → mozo → cocina → cobro roto en producción
**Origen:** pruebas de producción del 2026-10-27 (`docs/info/OmniGastro.md`) · Antecedentes: #177 (POS por mesa y `PATCH /orders/:id/items`) y refactor v1.42.1 (FEAT-204, POS agrupa pedidos por asiento)

---

## Síntoma (reporte del usuario, 2026-10-27)

1. El cliente escanea QR ([`?t=<token>`]), hace el pedido y llama al mozo → ✅.
2. El mozo atiende en `/admin/gastro`, abre `/admin/gastro/pos/:tableId` y presiona **"Enviar a cocina"** → **no sucede nada**.
3. Al no ir a cocina, el cobro no se habilita ("no se sirvió el plato").
4. Al **agregar más productos** el mozo recibe `Cannot PATCH /api/v1/orders/items`; los productos se ven en pantalla, pero al **reabrir el pedido desaparecen**.
5. La lista de productos del POS muestra **muy pocos productos** (reporte previo, sin entrada en troubleshooting).
6. UX: el enlace de texto `[+aquí]` para eligir el comensal del asiento es poco visible.

---

## Causa raíz (triple, localizada en código)

### A) `order.orderId` vs `order.id` tras el refactor v1.42.1 — `gastro-pos.tsx`

El refactor FEAT-204 (v1.42.1) guardó el pedido en estado con el objeto CRUD del
listado (`/api/v1/orders?tableId=...`), cuyo campo de identidad es **`id`**:

```ts
setOrder(activeOrder || null);            // activeOrder tiene `id`, NO `orderId`
```

Pero los manejadores del POS seguían leyendo el campo viejo:

```ts
const handleSendToKitchen = async () => {
  if (!order?.orderId) return;            // undefined → return SILENCIOSO
  ...
  await api.post(`/api/v1/orders/${order.orderId}/ready`);
```

`handleSendToKitchen`, `handleClose` y `handleSplitBySeat` quedaron inertes
exactly igual para los 3: el early-return no lanza ningún mensaje → el botón
parece "no hacer nada". Sin `ready`, `meta.readyAt` nunca se setea y el cobro
(el gating `isReady`) nunca se habilita — el síntoma 3 es consecuencia del 1.

### B) Líneas nuevas sin `orderId` — invocación PATCH vacía

`handleAddProduct` creaba la línea **sin `orderId`**:

```ts
[...prev, { id: `${product.id}-${selectedSeat}-${Date.now()}`, productId: ..., }]
```

y `saveLines` caía al fallback, que por (A) también era vacío:

```ts
const oid = l.orderId || (order?.orderId || '');   // '' → PATCH /api/v1/orders//items
```

Resultado: **`Cannot PATCH /api/v1/orders/items`** (404 de Express, ruta
`/orders/:id/items` sin id). El PATCH era fire-and-forget dentro del
`setState`: la línea quedaba **solo en estado local** y al recargar/reabrir el
pedido desaparecía (síntoma 4). Antecedente #177 ya había documentado la familia
`PATCH items` — este es el modo de falla nuevo que introdujo v1.42.1.

Agravante: los pedidos guest exigen reclamo previo (`guestUpdateItems`,
`orders.service.ts:1282`, *"El pedido aún no fue reclamado por el mozo"*). El
`claim` best-effort existía en `handleSendToKitchen` pero **no** en `saveLines`.

### C) Catálogo: `categoryId` prevalecía aunque no estuviera en el árbol — `catalog.service.ts`

`getCategoryTree(includeProducts=true)` mapeaba cada producto a **una sola**
categoría:

```ts
const catId = p.categoryId || p.posCategoryId;   // prioridad categoryId SIEMPRE
```

Si `categoryId` apunta a una categoría **fuera del árbol** (nivel > `maxLevel=2`
por defecto, o `active=false`) mientras `posCategoryId` —la categoría PDV que
alimenta el POS— sí está en el árbol, el producto se adjuntaba a una clave
inexistente en `categoryMap` y **ningún nodo lo recibía** → producto invisible
("muy pocos productos", síntoma 5). Con 226 productos activos el POS mostraba
solo los de categorías bien resueltas.

---

## Solución aplicada (v1.43.6)

| # | Archivo | Cambio |
|---|---|---|
| 1 | `frontend/src/pages/admin/gastro-pos.tsx` | Nuevo estado `orders` (todas las órdenes activas de la mesa, set en `loadAll`). `handleSendToKitchen` ya no lee `order.orderId`: itera `orders` activas y aplica `claim → ready` por cada una; error agregado (`N enviados, M fallaron`) |
| 2 | `gastro-pos.tsx` | `saveLines` devuelve `boolean`; ignora líneas sin orden destino, hace **claim best-effort** antes de cada `PATCH /orders/:id/items` y reporta el error por pedido (nada de líneas fantasma silenciosas) |
| 3 | `gastro-pos.tsx` | `handleAddProduct` asigna `orderId` a la línea nueva: la orden del asiento seleccionado, o `order.id` |
| 4 | `gastro-pos.tsx` | `handleSendToKitchen` **aborta** el envío si `saveLines` devolvió `false` (nunca manda a cocina sin los ítems que el mozo ve) |
| 5 | `gastro-pos.tsx` | `handleClose` / `handleSplitBySeat` usan `order.id`; el tag de la sesión resalta con `order.id` |
| 6 | `gastro-pos.tsx` | `isKitchenSent` / `isReady` se evalúan sobre el total de órdenes abiertas de la sesión (cobro cuando **todas** marcaron READY) |
| 7 | `gastro-pos.tsx` | UX: `[+aquí]` → botón verde **"Agregar aquí"** con `token.colorSuccess` (Regla #10, sin hex) |
| 8 | `backend/src/catalog/catalog.service.ts` | El producto se adjunta a la **primera categoría presente en el árbol** (`categoryId` tiene prioridad; `posCategoryId` como reemplazo válido). Sin duplicados por nodo ni cambio de `maxLevel` (no afecta a consumidores del tree) |

---

## Lecciones

1. **Refactor de forma de datos con tipos implícitos:** el cambio de FEAT-204
   (`setOrder(order-list-item)`) era estructuralmente silencioso —TypeScript no
   lo atrapa porque `order` es `any` y `order.orderId` es `undefined` legal.
   Al re-formar objetos de estado, auditar **todos** los accesos a los campos
   viejos (`grep -n "\.orderId" gastro-pos.tsx`).
2. **`setState` + fetch fire-and-forget:** una mutación de estado cuyo guardado
   falla en silencio produce datos que "existen" solo en pantalla. Todo guardado
   con efecto visual debe devolver éxito/fracaso y degradar la UI en consecuencia.
3. **Mapeo producto→categoría con dos fuentes de verdad** (`categoryId` /
   `posCategoryId`): la prioridad fija rompe la visibilidad cuando la prioridad
   no está instanciada en la estructura de destino; resolver **por pertenencia
   al árbol**, no por orden fijo de campos.

## Verificación

- `tsc --noEmit` limpio en `backend/` y `frontend/`.
- Pendiente (pre-deploy, protocolo §3.1.1): smoke en `provecchio.local` con backup restaurado, E2E Playwright del flujo QR → mozo → enviar a cocina → cobro, `./scripts/init.sh` como barrera.
