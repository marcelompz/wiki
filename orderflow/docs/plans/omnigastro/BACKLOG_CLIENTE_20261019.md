# Backlog OmniGastro — Reporte del cliente en provecchio.com (2026-10-19)

> **Origen:** reporte del cliente sobre `https://provecchio.com` recibido el 2026-10-19, con los
> bugs de la versión v1.39.9 en producción. Recuperado del checkout de trabajo
> `/opt/orderflow-branch-schema-prisma` (`docs/info/OmniGastro.md`, cambio sin commitear) para que
> no se pierda al descartar esa rama.
>
> **Estado del release:** v1.39.9 ya está desplegado en `provecchio.com` (v1.39.10 en producción
> desde el 2026-10-19). Los dos bugs de la sección v1.39.8 están **corregidos** (FEAT-174). Los
> **9 puntos de la sección v1.39.9 siguen abiertos**.

---

## Resumen

| # | Reporte del cliente (texto original) | Estado | Riesgo |
|---|---|---|---|
| 1 | La alerta suena en el móvil del **cliente** en vez de en la tablet del **mozo** | ✅ **resuelto v1.39.16** | Alto |
| 2a | Al pedir desde la mesa por QR, la opción **"takeaway" debe omitirse** (por defecto "dine-in") | ✅ **resuelto v1.39.16** | Medio |
| 2b | Al confirmar el pedido debe llegar **notificación al mozo**, igual que con "llamar al mozo" | ✅ **resuelto v1.39.16** | Alto |
| 3 | Al llamar al mozo se muestra el **ID de mesa** en vez del **nombre** de la mesa | ✅ **resuelto v1.39.16** | Bajo |
| 4 | "Volver al menú" **borra el resumen del pedido** y el carrito aparece vacío | ✅ **resuelto v1.39.16** | Alto |
| 5 | El pedido enviado a cocina **no aparece en el KDS** hasta pulsar "Sincronizar todo" | ✅ **resuelto v1.39.15** | **Crítico** |
| 6 | En el KDS, al confirmar, el pedido **desaparece** en vez de quedar en el historial (Pendiente/Cocinando/Listo) | ✅ **resuelto v1.39.16** | Alto |
| 7 | El cierre de cuenta del mozo **no carga en el POS de Odoo 14**; el pago del mozo debería ser opcional/configurable | ✅ **resuelto v1.39.12** | Alto |
| 8a | En `/admin/gastro/tables` solo funciona el **"C"** del CRUD (no se actualiza ni borra) | ✅ **resuelto v1.39.11** | Medio |
| 8b | El cobro de la mesa G5 pide **PIN** y devuelve **HTTP 400** en `POST /api/v1/public/hr/kiosk/pin/verify` | ✅ **resuelto v1.39.13** | **Crítico** |
| 9 | Tras enviar a cocina desde el POS, el pedido **desaparece** y el mozo no puede reabrirlo para modificarlo | ✅ **resuelto v1.39.16** | Alto |

> **8b y 5 son los dos bloqueantes de operación**: sin cobro (8b) y sin entrada automática en el KDS
> (5) el flujo de sala no cierra en provecchio.com.

---

## Detalle y puntos de entrada

### 1. La alerta suena en el móvil del cliente, no en la tablet del mozo

- Origen: `https://provecchio.com/?t=199a24db-62f2-4838-aea9-78a3c90ad839`
- Destino esperado del aviso: `https://provecchio.com/admin/gastro/mozos`
- El aviso debe llegar al **mozo** (sonido + pop-up), no al dispositivo del comensal.
- Direcciones: el evento de "llamar al mozo" se emite por WebSocket al room del mozo; el cliente
  final suscripto al mismo room (o con sonido global en la vista pública) lo reproduce.

### 2. Pedido desde la mesa por QR

- Origen: `https://provecchio.com/?t=e0a34545-c05f-4a4f-a2a6-fc5570800b88&track=d10f78ed-bab3-4c0e-b8e3-977fe6abd376`
- 2a: la opción "takeaway" debe **omitirse** y el pedido debe quedar por defecto como **"consumir en mesa"**.
- 2b: al **confirmar** el pedido debe enviarse la notificación al mozo, igual que el botón "llamar al mozo".

### 3. Identificación de mesa en la pantalla del mozo

- Pantalla: `https://provecchio.com/admin/gastro/mozos`
- Texto actual: `New guest order for table G5: 9fb72cde-3325-421b-b5ae-cb376a0b5d42 x1`
- Debe mostrar el **nombre** de la mesa (G5) y no el UUID como identidad principal.

### 4. "Volver al menú" vacía el carrito

- Pantalla: la misma URL de pedido con `&track=...`
- Al volver al menú se pierde el **resumen del pedido** del pie y el carrito abre vacío.
- Impacto: el cliente no puede confirmar sin rehacer el pedido.

### 5. El pedido no llega solo al KDS

- Origen: `https://provecchio.com/admin/gastro/pos/5e6f1b69-e2c0-4516-a14f-4ae1d7e493ec`
- Destino: `https://provecchio.com/admin/kds`
- Hoy exige pulsar **"Sincronizar todo"**. Debe ser **automático**: la cocina no tiene tiempo
  para interactuar con el KDS.

### 6. El KDS pierde el historial de estados

- Pantalla: `https://provecchio.com/admin/kds`
- Al confirmar en cocina, el pedido **desaparece** en vez de pasar a *Pendiente → Cocinando → Listo*.

### 7. El cierre de cuenta no llega al POS de Odoo 14

- Origen: `https://provecchio.com/admin/gastro/mozos`
- Destino: `http://192.168.69.246:8081/pos/ui?config_id=2#cids=1`
- El cobro desde el POS del mozo debería ser **opcional y configurable** en
  `https://provecchio.com/admin/settings`. En Provecchio, incluso si el mozo cobra, la
  gestión real es de la caja.

### 8. CRUD de mesas y error de PIN

- Pantalla: `https://provecchio.com/admin/gastro/tables`
- 8a: solo funciona el **crear**; **actualizar** y **borrar** están rotos.
- 8b: al cobrar la mesa **G5** (con pedido listo) se pide un PIN y la llamada
  `POST https://provecchio.com/api/v1/public/hr/kiosk/pin/verify` devuelve **HTTP 2 400**.

### 9. El pedido desaparece del POS al enviarlo a cocina

- Pantalla: `https://provecchio.com/admin/gastro`
- Tras enviar a cocina el pedido deja de estar en el POS: el mozo no puede reabrirlo para
  modificarlo (CRUD roto en la misma dirección).

---

## Bugs ya resueltos (v1.39.8 → v1.39.9)

| # | Bug | Fix | Evidencia |
|---|---|---|---|
| 1 | En el POS del mozo en tablet, el **total se solapaba** con la lista de productos | `admin-mobile.css` scopea `position: fixed` a `.ant-sider`; `gastro-pos.tsx` con `Grid.useBreakpoint()`; `AdminApp.tsx` renderiza la ruta POS a sangre | FEAT-174 · `docs/troubleshooting/181-pos-tablet-overlap-and-qr-biolinks.md` |
| 2 | El **QR de la mesa G10** abría bio-links en vez del menú digital | `public-storefront-page.tsx` y `App.tsx` priorizan el token `?t=` sobre `homepagePreset` | FEAT-174 · `docs/troubleshooting/181-pos-tablet-overlap-and-qr-biolinks.md` |

---

## Reglas para tomar cada punto

1. Un punto = una rama de feature (`feat/gastro-<tema>`) con su PR a `product/omnigastro` o `main`.
2. Cada corrección necesita **auditoría** en `docs/plans/omnigastro/auditoria-<tema>.md` y sus casos
   en `frontend/e2e/`.
3. Los puntos 5 y 8b (críticos) requieren **E2E en `provecchio.local` con datos reales** y
   autorización explícita para el deploy (AGENTS.md §9).
4. El punto 7 tiene componente de **integración con Odoo 14**: verificar contra
   `http://192.168.69.246:8081` antes de cerrar.
5. Ningún cambio puede tocar `tenantId` ni el aislamiento multi-tenant (AGENTS.md §2, regla 1).

## Validación en producción (v1.39.12) — punto 7

Cadena completa verificada con un pedido real en `provecchio.com` (mesa **G5**,
tenant `provecchio-dimora-001`):

```text
cierre de mesa (mozo) → evento → listener → BullMQ → processor → odoo-adapter → Odoo 14
t0_table_closed → t1_sync_enqueued → t2_job_started → t3_adapter_called
→ t4_odoo_order_created → t5_sync_completed
```

Resultado en el ERP (Odoo 14, `pos.config` 2 = Giardino, sesión 1594):

| Campo | Valor |
|---|---|
| `pos.order.id` | 31971 |
| `pos_reference` | `OmniFlow-<uuid del pedido de OrderFlow>` (trazabilidad) |
| `table_id` | 77 (`G5`) |
| `session_id` | 1594 (POS/01594) |
| `state` | `draft` (pedido de mesa abierto, listo para cobrar en el ERP) |
| `amount_total` | 36.000 (2 × 18.000) |
| `amount_tax` | 0 |
| línea | `product_id` 1626 `[BEB004] Americano`, `qty` 2, `price_unit` 18.000 |

**Mapeo de mesas aplicado en producción** (8 de 13, por nombre):
`G2→40, G3→75, G4→76, G5→77, G6→78, G7→79, G8→80, G9→81`.
Las 5 restantes (`G02`, `G10`, `Giardino`, `M01`, `T11`) **no tienen equivalente en
Odoo** y quedan sin mapear a propósito: su sync se omite y se contabiliza en
`odoo_sync_skipped_total{reason="missing_table_mapping"}`. Requieren una decisión
del cliente (crear la mesa en el ERP o renombrarla en OrderFlow).

> Los pedidos de prueba se eliminaron del ERP y se cancelaron en OrderFlow.
