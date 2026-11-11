# Auditoría — FEAT-197 F1 · "Mis pedidos" del comensal y fix del `paidAt`

> **Vertical:** OmniGastro · **Fecha:** 2026-10-22 · **Versión:** v1.39.25
> **Rama:** `feat/gastro-historial-pedidos-f1` (desde `main` @ `78b6d85f`)
> **Plan maestro:** [`plan-actualizacion-v1.39.25-historial-pedidos-bandera-mozo.md`](./plan-actualizacion-v1.39.25-historial-pedidos-bandera-mozo.md)
> **Flujo:** [`flujo-historial-pedidos.md`](./flujo-historial-pedidos.md)

---

## 1. Alcance ejecutado

| Tarea | Estado |
|---|---|
| **1.1** Store `public-orders-store.ts` (Zustand + `persist`, `gaia-spa-orders`, máx. 20) | ✅ |
| **1.2** Recordar el pedido **antes** del `clearCart()` | ✅ |
| **1.3** "Volver al menú" conserva el historial (el `?track=` se borra de la URL, el pedido no del store) | ✅ |
| **1.4** UI "Mis pedidos": drawer con mesa, estado, total y código corto del pedido | ✅ |
| **1.5** Estados reutilizados (`Enviado al mozo`, `En cocina`, `¡Listo!`, `Entregado`, `Cancelado`) | ✅ |
| **1.6** Botón 🕘 en el header con contador (`aria-label="Ver mis pedidos"`) + acceso desde la pantalla de tracking | ✅ |
| **1.7** Refresco del historial cada 10 s contra `GET /api/v1/guest/orders/:id` | ✅ |
| **FEAT-197-d** `normalizeOrderCloseMode` + uso en `orders.controller.ts:close` | ✅ |
| Privacidad: **sin** endpoint público que liste pedidos por mesa (D3) | ✅ |
| Sin migración de base de datos (F1 no toca el schema) | ✅ |

---

## 2. Archivos modificados

| Archivo | Cambio |
|---|---|
| `frontend/src/store/public-orders-store.ts` | **nuevo** — store del historial local del comensal |
| `frontend/src/store/public-orders-store.test.ts` | **nuevo** — 6 unitarios (vitest) |
| `frontend/src/pages/omni-catalog.tsx` | persistencia al confirmar, botón 🕘, drawer, refresco, mensaje de "Volver al menú" |
| `frontend/e2e/order-tracking.spec.ts` | **nuevo** — 3 casos E2E |
| `backend/src/orders/order-close-mode.util.ts` | **nuevo** — normalización del modo de cierre |
| `backend/src/orders/order-close-mode.util.spec.ts` | **nuevo** — 7 unitarios (jest) |
| `backend/src/orders/orders.controller.ts` | usa el normalizador en `POST /api/v1/orders/:id/close` |
| `backend/src/main.ts`, `VERSION`, `package.json` (×3), 55 manifiestos, `README.md` | bump a **1.39.25** |

---

## 3. Validación ejecutada (localhost, `https://provecchio.local`)

| Tipo | Comando | Resultado |
|---|---|---|
| E2E nuevo | `npx playwright test e2e/order-tracking.spec.ts` | ✅ **3 passed** |
| E2E suite completa | `npx playwright test` | ✅ **79 passed / 5 skipped / 0 failed** (antes 76/5/0) |
| Unitarios backend | `npx jest src/orders` | ✅ **81 passed** (9 suites) |
| Unitarios frontend | `npx vitest run` | ✅ **26 passed** (9 files) |
| Typecheck | `tsc --noEmit` (backend + frontend) | ✅ 0 errores |
| Lint | `eslint` sobre los archivos tocados | ✅ 0 errores (22 warnings preexistentes en `omni-catalog.tsx`) |
| Health local | `GET /api/v1/health` | ✅ `1.39.25 ok` |
| Build | `npm run build` (backend y frontend) | ✅ sin errores |

### Qué valida cada caso E2E

1. **`el comensal confirma un pedido y el pedido queda en "Mis pedidos" tras recargar`**
   abre el catálogo con el QR real de una mesa (G10), entra en una categoría, agrega un producto,
   confirma el pedido y comprueba que `localStorage['gaia-spa-orders']` contiene el pedido, que
   sobrevive a la recarga, que el drawer lo lista y que al tocarlo se abre la pantalla de seguimiento
   con `?track=<orderId>`.
2. **`el historial del comensal es local: otra sesión sin el pedido no lo ve`**
   una sesión nueva de navegador no tiene historial → confirma la privacidad de D3.
3. **`el modo enviado con "method"/"closeMode" se aplica y escribe "paidAt"`**
   crea un pedido guest real, lo reclama, lo marca listo y lo cierra con `{ method: 'GATEWAY' }`
   → `meta.paidAt` presente, `meta.paidViaGateway === true`, `meta.closedWithoutPayment === false`.
   **Antes del fix** ese payload caía en `WITHOUT_PAYMENT` y `paidAt` quedaba en `null`.

---

## 4. Causa raíz del `paidAt` nunca escrito

```
frontend/src/pages/admin/gastro.tsx:242      →  { closeMode, paidByWaiter }   ← clave que el controller NO leía
frontend/src/pages/admin/gastro-pos.tsx:280  →  { method }                   ← clave que el controller NO leía
backend/src/orders/orders.controller.ts:271  →  body?.mode || 'WITHOUT_PAYMENT'
```

El `mode` nunca llegaba al service → `guestClose` recibía siempre `WITHOUT_PAYMENT` → en
`orders.service.ts` (`guestClose`) el campo se calculaba como
`paidAt: closeMode === 'WITHOUT_PAYMENT' ? null : now`, es decir **siempre `null`**.

Consecuencia de negocio: el paso "Entregado y pagado" del tracking del comensal nunca se completaba
y el cobro en mesa o el pago digital no quedaban registrados en el pedido.

> Nota de negocio: cuando el modo normalizado es `WAITER_CUSTODY` y el tenant **no** tiene habilitado
> el cobro en mesa (caso de Provecchio, que cobra siempre en caja), `guestClose` responde `400` con el
> mensaje *"El cobro en mesa está deshabilitado para este tenant: el cobro se realiza en la caja."*
> — comportamiento correcto y ya previsto por FEAT-186. La UI del POS (`gastro-pos.tsx`) solo ofrece
> esa opción cuando `waiterCanCollectPayment` es `true`.

---

## 5. Archivos que NO se tocaron (fuera de alcance de la F1)

- **FEAT-194** (bandera de Mozo): sigue `planned` → F2 (v1.39.26).
- **F4** (histórico del mozo en servidor): `GET /api/v1/orders/guest/history`, `Order.waiterId`,
  `claimedById`, pestaña "Atendidos".
- **F4b** (histórico de turnos del cajero): `GET /api/v1/pos-sessions`, pestaña "Historial de turnos".
- **F3** (código corto `publicCode`): opcional (D2'), sin migración en esta fase.
- Sin migración Prisma en esta fase → el deploy no requiere `prisma migrate deploy` nuevo.

---

## 6. Pendiente para el release

- [ ] Desplegar en producción (`./scripts/deploy-production.sh provecchio`) con autorización explícita.
- [ ] Actualizar `featurelist.json` → FEAT-197 `completed` (hecho en esta entrega).
- [ ] Tag `v1.39.25` + push de tags.
- [ ] Sincronizar la Wiki oficial (`/opt/wiki/orderflow/`).
- [ ] Decisiones pendientes del usuario: **D1** (backfill de la bandera de Mozo), **D5** (¿implementar la
      Capa 2?), **D6** (¿Capa 3b en fase propia o integrada en la F4?).
