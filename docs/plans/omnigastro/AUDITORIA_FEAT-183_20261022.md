# Auditoría FEAT-183 — Backlog OmniGastro del cliente (9 bugs v1.39.9)

> **Fecha:** 2026-10-22
> **Entorno auditado:** `https://provecchio.com` — **v1.40.2** (deploy `e24102ff`, 2026-10-22 19:38 -03)
> **Origen:** [BACKLOG_CLIENTE_20261019.md](./BACKLOG_CLIENTE_20261019.md) · [DIAGNOSTICO_BUGS_RESTANTES_2026-10-20.md](./DIAGNOSTICO_BUGS_RESTANTES_2026-10-20.md)
> **Alcance:** verificación de implementación + verificación en producción (solo lectura, sin cambios de código)
> **Resultado:** **9/9 implementados y desplegados.** FEAT-183 figura como `planned` por deuda de tracking.

---

## 1. Correspondencia código local ↔ producción

El código desplegado coincide byte a byte con `main` (md5 idéntico archivo por archivo):

| Archivo | md5 local | md5 remoto |
|---|---|---|
| `frontend/src/pages/admin/gastro-tables.tsx` | `117f28d8…` | `117f28d8…` ✅ |
| `backend/src/tables/tables.service.ts` | `76533ed4…` | `76533ed4…` ✅ |
| `frontend/src/pages/admin/kds.tsx` | `93e7d3c8…` | `93e7d3c8…` ✅ |
| `frontend/src/hooks/useWaiterAlerts.ts` | `73bd68ed…` | `73bd68ed…` ✅ |

Contenedores en producción: `orderflow_backend`, `orderflow_frontend`, `orderflow_omnibi_standalone`,
`orderflow_sync_standalone`, `orderflow_odoo_adapter`, `orderflow_redis`, `orderflow_db` →
**todos `healthy`**. Migraciones: **0 pendientes** (39 aplicadas).

---

## 2. Estado por bug

| # | Bug reportado | Implementación | Prueba automatizada | Verificación en producción | Estado |
|---|---|---|---|---|---|
| **1** | La alerta de "llamar al mozo" suena en el móvil del cliente, no en la tablet del mozo | `hooks/useWaiterAlerts.ts` (Socket.IO + `playNotificationSound('call')`); consumido en `gastro-pos.tsx:101` y `gastro-mozos.tsx:39`. La página pública ya no reproduce el sonido | `omnigastro.spec.ts` (sección audio), `omnigastro-field-flow.spec.ts` | Bundle desplegado contiene el hook; panel admin sin errores JS (QA E2E) | ✅ |
| **2a** | Al pedir por QR de mesa se ofrece "Para llevar / Barra" | `omni-catalog.tsx:449` — el modal `serviceMode` se omite cuando hay mesa; `TABLE` por defecto | `omnigastro-field-flow.spec.ts` | Catálogo público `200`, 4 imágenes OK, sin errores JS | ✅ |
| **2b** | Al confirmar el pedido no llega aviso al mozo | `guest-orders.controller.ts:176` emite `waiterCallNew` al room del tenant | `guest-orders.controller.spec.ts` — *"#2b: al confirmar el pedido se emite waiterCallNew"* + caso negativo BAR | Flujo público de pedido operativo; evento verificado en unit test | ✅ |
| **3** | En la pantalla del mozo se muestra el UUID en vez del nombre | `guest-orders.controller.ts:90,136-151,236` usa `metadata.snapshotName` con fallback | `guest-orders.controller.spec.ts` — *"#3: el aviso debe mostrar el NOMBRE del producto"* | `POST /api/v1/guest/orders` responde (sin 500) | ✅ |
| **4** | Al volver al menú se pierde el resumen del pedido | `omni-catalog.tsx:955-972` — pedido en curso persistido + botón "Volver al menú" | `omnigastro-field-flow.spec.ts` | Catálogo público renderiza sin errores | ✅ |
| **5** | CRÍTICO: el pedido no aparece en KDS hasta "Sincronizar todo" | `kds.tsx:107-109` (refresh con debounce) + `socket.on('order:new')` `kds.tsx:169` + `setInterval` de respaldo | `kds-ticket-notification.cjs`, `kds-station-independent-categories.spec.ts` | `/admin/gastro/kds-stations` validado por QA E2E sin errores | ✅ |
| **6** | El pedido desaparece del KDS al confirmar en vez de quedar en historial | `kds.tsx:23` `servedOrders` + sección "Historial de la sesión" `kds.tsx:314-321` | `kds-ticket-notification.cjs` | Panel KDS sin errores JS ni 5xx | ✅ |
| **7** | Cierre de cuenta no carga en POS Odoo 14; pago del mozo debe ser opcional/configurable | `orders/order-close-mode.util.ts` (`closeMode`/`mode`/`method`, `paidByWaiter`); `orders.controller.ts:269-278`; config FEAT-186/187 | `order-close-mode.util.spec.ts` (5 casos), `odoo-pos-sync.spec.ts`, `order-tracking.spec.ts` (FEAT-197-d) | `POST /api/v1/orders/:id/close` existe y responde (400 de validación, no 404) | ✅ |
| **8a** | `/admin/gastro/tables` solo permitía crear | FEAT-200: handlers conectados a la UI + modal de edición; validación de `odooTableId` duplicado | `gastro-tables-crud.spec.ts`, `tables-modal-sync.spec.ts` | `PATCH` y `DELETE /api/v1/tables/:id` existen (400 de validación, no 404); `GET /api/v1/tables` devuelve mesas reales (G10…) | ✅ |
| **8b** | CRÍTICO: el cobro de mesa pide PIN y devuelve HTTP 400 (`x-tenant-id`) | `hr-kiosk-public.controller.ts:26-38` `resolveTenantId()` — tenant desde JWT/API key con `x-tenant-id` solo como override | `omnigastro.spec.ts:478-494` ("debe rechazar PIN incorrecto") | `POST /api/v1/public/hr/kiosk/pin/verify` → **404 "PIN incorrecto o inexistente"** (ya **no** 400 por header faltante) | ✅ |
| **9** | El POS no muestra pedidos en preparación | `gastro-pos.tsx:112-117` — filtro `DRAFT,CONFIRMED,PREPARING,READY` (antes omitía `PREPARING`) | `pos-tablet-responsive.spec.ts`, `omnigastro-field-flow.spec.ts` | POS admin sin errores JS (QA E2E), sin 5xx | ✅ |

---

## 3. Evidencia de producción (2026-10-22 22:40 UTC)

```
GET  https://provecchio.com/api/v1/health   → 200 {"version":"1.40.2", database:ok, odoo_adapter:ok}
GET  https://provecchio.com/                → 200
GET  https://provecchio.com/admin           → 200
GET  /api/v1/tables                         → 200 (mesas reales del tenant)
PATCH/DELETE /api/v1/tables/:id             → 400 (ruta existe, valida payload)
POST /api/v1/orders/:id/close               → 400 (ruta existe, valida payload)
POST /api/v1/public/hr/kiosk/pin/verify     → 404 "PIN incorrecto o inexistente" (comportamiento correcto)
QA E2E (qa_e2e_check.py, post-deploy):
  · /social-catalog: 4 imágenes, 0 rotas
  · /: 0 errores JS en consola
  · /admin: auth + DB sin 500; 8 rutas admin OK (products, customers, bookings,
    loyalty, homepage-builder, social-catalog, gastro/kds-stations, follow-up-rules)
```

---

## 4. Riesgos residuales

1. **#1 y #2b (avisos en tiempo real)**: verificados por unit test + código desplegado, pero **no reproducidos manualmente con dos dispositivos** en esta auditoría (requiere tablet de mozo + móvil de comensal simultáneos).
2. **#5/#6 (KDS en vivo)**: cubiertos por E2E y por la QA post-deploy; la verificación "pedido nuevo aparece sin pulsar Sincronizar" en un KDS abierto en paralelo no se ejecutó manualmente.
3. `POST /api/v1/public/hr/kiosk/pin/verify` devuelve **404** para PIN inválido (semántica discutible, pero es la esperada por el E2E y ya no es el 400 del bug).

---

## 5. Conclusión

Los 9 puntos del reporte del cliente están implementados, desplegados y verificados en `provecchio.com`
v1.40.2. La feature **FEAT-183** es un paraguas de tracking: su implementación se repartió en
**FEAT-192** (lote 1: #1, #2a, #2b, #3, #4, #9), **FEAT-197** (#6 historial y modos de cierre),
**FEAT-186/187** (#7) y **FEAT-200** (#8a). Procede marcarla como **`completed`**.
