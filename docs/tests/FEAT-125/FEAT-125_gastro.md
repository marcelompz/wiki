# FEAT-125 demo alfa — Guest Digital Menu + Table Claim + Waiter Call

**Generado:** 2026-09-04
**Versión:** v1.25.0-alpha-omnigastro (demo alfa)
**Entorno demo:** `https://demo-omnigastro.pesallaccia.com` (subdominio Provecchio del tenant `demo-omnigastro-001`)
**QR de mesa:** `qr_demo_mesa_01_2026_09_04_abcdef0123` (MESA-01)
**Usuarios demo:** `admin@demo.omnigastro`, `mozo@demo.omnigastro`, `cocina@demo.omnigastro` (pass: `demo12345`)

> Manual del flujo end-to-end de la demo alfa del módulo OmniDineIn (FEAT-125).
> Los screenshots se regeneran con Playwright: `python3 scripts/generate_user_manual.py --flow feat125_gastro --base-url https://demo-omnigastro.pesallaccia.com --markdown --html`

---

## Visión del flujo (alineada al spec del producto)

**El cliente en el restaurante** escanea un QR estático en la mesa (o toca un NFC físico) → se abre el Social Catalog ya existente con el menú de ese tenant → arma su pedido → presiona **"Enviar pedido al mozo"** → el pedido queda como **GUEST_DRAFT** en la tablet del mozo (no descuenta stock todavía) → el mozo lo **reclama**, edita si hace falta, envía a cocina y **cierra** (con o sin cobro, según el caso). Adicionalmente, en la misma pantalla el cliente puede tocar **"Llamar al Mozo"** y elegir entre opciones configurables (pedir la cuenta, pedir más pan, etc.) o texto libre.

**Reglas de negocio validadas en esta demo alfa:**
- El cliente **siempre** puede llamar al mozo, **con o sin pedido previo**. Si no hay pedido, el mozo **toma el pedido manualmente** en su tablet.
- El **cobro NO es obligatorio** al cierre. El mozo cierra el pedido cuando se consumió en mesa; el cliente paga después en caja (cashier handover).
- El cliente elige **dónde consumir** antes de enviar: 🪑 **A mi mesa** (lo atiende un mozo) o 🍺 **Para llevar / Tomar en barra** (retira en barra, paga al recibir).
- En modo barra, el pedido **no se asigna a un mozo** — entra a la cola de la barra, cualquier cajero/mozo lo toma.
- **El stock NO se descuenta** al crear el GUEST_DRAFT (eso pasa al claim + send-to-kitchen, post-FEAT-113 con Live Escandallo).

---

## Índice de pasos

**Bloque A — Flujo desde la app del cliente**
1. Cliente escanea QR de la mesa
2. Modo restaurante se activa (header naranja + mesa)
3. Cliente agrega productos al carrito
4. Cliente abre el carrito
5. Cliente elige modalidad: A mi mesa o Para llevar / Barra
6. Cliente envía el pedido (queda como GUEST_DRAFT)
7. Vista de tracking del cliente
8. Mozo hace login en el panel admin
9. Panel del mozo en `/admin/gastro`
10. Mozo reclama el pedido
11. Cliente ve "Tomado por {mozo}"
12. Mozo envía a cocina y marca listo
13. Mozo cierra el pedido (3 opciones de cierre)
14. Cliente ve el cierre en tracking

**Bloque B — Flujo cuando el cliente solo llama al mozo (sin pedido previo)**
15. Cliente llama al mozo con opción "Quiero pedir"
16. Mozo ve la llamada y presiona "Tomar pedido"
17. Mozo captura las líneas a mano en su tablet

**Bloque C — Botón "Llamar al Mozo" con pedido activo**
18. Cliente llama al mozo con "Pedir la cuenta"
19. Mozo atiende y elige acción (cerrar sin cobrar / cobrar / resolver)

---

## Bloque A — Flujo desde la app del cliente

### 01_cliente_qr_scan

**Descripción:** Cliente en la mesa escanea el QR pegado a la mesa. El omni-catalog detecta `?t=`, resuelve la mesa vía `GET /api/v1/guest/tables/by-token/:qrToken` y activa el modo restaurante.

**URL:** `https://demo-omnigastro.pesallaccia.com/social-catalog/menudigital?t=qr_demo_mesa_01_2026_09_04_abcdef0123`

**Backend:** `GET /api/v1/guest/tables/by-token/qr_demo_mesa_01_2026_09_04_abcdef0123`

```bash
curl -H "x-api-key: demo-omnigastro-apikey-2026-09-04" \
  https://demo-omnigastro.pesallaccia.com/api/v1/guest/tables/by-token/qr_demo_mesa_01_2026_09_04_abcdef0123
```

```json
{
  "found": true,
  "tableId": "MESA-01",
  "tableName": "MESA-01",
  "tenantId": "demo-omnigastro-001",
  "tenantName": "Demo OmniGastro",
  "waiterOptions": [
    { "id": "waiter-take-order", "label": "Quiero pedir", "icon": "📝", "requiresText": false },
    { "id": "waiter-bill", "label": "Pedir la cuenta", "icon": "🧾", "requiresText": false },
    { "id": "waiter-more-bread", "label": "Más pan", "icon": "🍞", "requiresText": false },
    { "id": "waiter-help", "label": "Ayuda", "icon": "❓", "requiresText": true }
  ]
}
```

**Criterio de éxito:** El frontend recibe `found=true` con `tableId` y 4 `waiterOptions` (incluida la nueva "Quiero pedir" para que el cliente pueda pedir sin armar carrito).

![01_cliente_qr_scan](screenshots/feat125_gastro/01_cliente_qr_scan.png)

---

### 02_modo_restaurante_header

**Descripción:** Aparece el header naranja con badge "🍽️ MODO RESTAURANTE", identificador de mesa (MESA-01) y botón flotante "Llamar al mozo". El catálogo público sigue debajo, sin cambios respecto a la versión sin modo restaurante.

**Criterio de éxito:** El header es visible, el badge "🍽️ MODO RESTAURANTE" se muestra con fondo blanco, y el botón "Llamar al mozo" abre el modal `callWaiterOpen`.

![02_modo_restaurante_header](screenshots/feat125_gastro/02_modo_restaurante_header.png)

---

### 03_agregar_productos_carrito

**Descripción:** Cliente agrega productos al carrito desde la grilla del catálogo. El badge del carrito (esquina superior) se actualiza con el contador.

**Productos disponibles en el seed:**

| ID | Nombre | Precio | Stock |
|---|---|---|---|
| `demo-prod-milanesa` | Milanesa con papas | 35.000 Gs | 50 |
| `demo-prod-ensalada` | Ensalada Caesar | 22.000 Gs | 50 |
| `demo-prod-bebida` | Coca-Cola 500ml | 8.000 Gs | 100 |
| `demo-prod-postre` | Flan casero | 14.000 Gs | 30 |
| `demo-prod-cafe` | Café espresso | 6.000 Gs | 100 |

![03_agregar_productos_carrito](screenshots/feat125_gastro/03_agregar_productos_carrito.png)

---

### 04_abrir_carrito_modo_restaurante

**Descripción:** Cliente abre el carrito haciendo click en el FAB con badge. En modo restaurante, el botón principal del drawer dice "Enviar al mozo" (no "Confirmar Pedido"). Las líneas muestran cantidad, precio unitario y subtotal.

**Criterio de éxito:** El drawer se abre con header "🛒 Tu Pedido", líneas con cantidad, total, y botón "Enviar al mozo" en naranja.

![04_abrir_carrito_modo_restaurante](screenshots/feat125_gastro/04_abrir_carrito_modo_restaurante.png)

---

### 05_elegir_modalidad_mesa_o_barra

**Descripción:** Cliente presiona "Enviar al mozo" y se abre un **modal de selección de modalidad** con 2 opciones. Esto es crítico: el flujo difiere según dónde consuma el cliente.

- **🪑 A mi mesa** (`serviceMode: TABLE`): el pedido se asigna a un mozo, que lo atiende en la mesa. El cliente paga al final (en mesa o en caja).
- **🍺 Para llevar / Tomar en barra** (`serviceMode: BAR`): el pedido entra a la cola de la barra, sin mozo asignado. El cliente retira en barra y paga al recibir.

**Implementación:** Modal con 2 cards visuales; el cliente hace click y el frontend hace `POST /api/v1/guest/orders` con el `serviceMode` correspondiente.

**Criterio de éxito:** El modal se abre con 2 cards bien diferenciadas. El botón "A mi mesa" mantiene el flujo normal; "Para llevar" salta al paso 6b (cola de barra).

![05_elegir_modalidad_mesa_o_barra](screenshots/feat125_gastro/05_elegir_modalidad_mesa_o_barra.png)

---

### 06_cliente_envia_pedido_GUEST_DRAFT

**Descripción:** Cliente confirma la modalidad. El frontend hace `POST /api/v1/guest/orders` con `serviceMode`. El backend crea un `Order` con `status=DRAFT` (NO `CONFIRMED` — esto es la corrección clave: el pedido se considera un draft que el mozo debe validar) y `metadata.guestDraft` con todos los flags. **El stock NO se descuenta** (eso pasa al claim + send-to-kitchen, post-FEAT-113). Backend emite WebSocket `order:new` + `guestOrderUpdate`.

**Request (TABLE):**
```bash
curl -X POST https://demo-omnigastro.pesallaccia.com/api/v1/guest/orders \
  -H "Content-Type: application/json" \
  -H "x-api-key: demo-omnigastro-apikey-2026-09-04" \
  -d '{
    "qrToken": "qr_demo_mesa_01_2026_09_04_abcdef0123",
    "lines": [
      { "productId": "demo-prod-milanesa", "quantity": 2, "unitPrice": 35000, "name": "Milanesa con papas" },
      { "productId": "demo-prod-bebida", "quantity": 2, "unitPrice": 8000, "name": "Coca-Cola 500ml" }
    ],
    "serviceMode": "TABLE"
  }'
```

**Response:**
```json
{
  "orderId": "14195bd4-9fac-4f84-a489-3c5cc881f956",
  "status": "DRAFT",
  "totalAmount": "86000",
  "tableId": "MESA-01",
  "tableName": "MESA-01",
  "meta": {
    "guestDraft": {
      "qrToken": "...",
      "tableId": "MESA-01",
      "tableName": "MESA-01",
      "createdAt": "2026-09-04T03:25:28.061Z",
      "claimedBy": null,
      "claimedAt": null,
      "sentToKitchenAt": null,
      "readyAt": null,
      "closedAt": null,
      "closedWithoutPayment": false,
      "paidByWaiter": false,
      "paidViaGateway": false,
      "paidAt": null,
      "notes": null,
      "source": "SOCIAL_CATALOG_GUEST",
      "serviceMode": "TABLE"
    }
  }
}
```

**Criterio de éxito:** Response 201 con `orderId`, `status=DRAFT` (no CONFIRMED), `serviceMode=TABLE|BAR`. **El stock del producto no se decrementa**.

![06_cliente_envia_pedido_GUEST_DRAFT](screenshots/feat125_gastro/06_cliente_envia_pedido_GUEST_DRAFT.png)

---

### 07_vista_tracking_cliente

**Descripción:** Vista de tracking inline con timeline de 5 estados: Pedido enviado (done) → Esperando mozo / Tomado por {mozo} → En cocina → Listo → Cerrado (con o sin cobro). Polling cada 3s contra `GET /api/v1/guest/orders/:id`.

**Estados del timeline:**

| # | Estado | Condición | Label en UI |
|---|--------|-----------|-------------|
| 1 | Pedido enviado | siempre true al entrar | "Pedido enviado" |
| 2 | Esperando mozo | `!meta.claimedBy` | "Esperando mozo" / "Tomado por {nombre}" |
| 3 | En cocina | `meta.sentToKitchenAt` | "En cocina" |
| 4 | Listo | `meta.readyAt` | "¡Listo!" |
| 5 | Cerrado | `meta.closedAt` | "Cerrado: sin cobrar" / "Cobrado en mesa" / "Pago digital" |

**Botones:** Llamar al mozo (rojo), Volver al menú.

![07_vista_tracking_cliente](screenshots/feat125_gastro/07_vista_tracking_cliente.png)

---

### 08_mozo_login_admin

**Descripción:** En paralelo, el mozo abre el panel de admin en su tablet. Login con `mozo@demo.omnigastro` / `demo12345`.

![08_mozo_login_admin](screenshots/feat125_gastro/08_mozo_login_admin.png)

---

### 09_panel_mozo_gastro

**Descripción:** Panel del mozo (`/admin/gastro`): 2 columnas. Izquierda: pedidos en curso con cards por mesa + badge de modalidad (🪑/🍺). Derecha: llamadas al mozo con 4 acciones posibles (Ya voy, Tomar pedido, Resolver). WebSocket subscription al canal `tenant:{tenantId}`.

![09_panel_mozo_gastro](screenshots/feat125_gastro/09_panel_mozo_gastro.png)

---

### 10_mozo_reclama_pedido

**Descripción:** El mozo presiona "Reclamar". Backend hace `POST /api/v1/orders/:id/claim`, escribe `metadata.guestDraft.claimedBy` + `claimedAt`, emite WebSocket `guestOrderUpdate`. La card del pedido cambia a "Reclamado por Carlos Mozo".

**Request:**
```bash
curl -X POST https://demo-omnigastro.pesallaccia.com/api/v1/orders/{orderId}/claim \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-api-key: demo-omnigastro-apikey-2026-09-04"
```

**Criterio de éxito:** Si otro mozo intenta reclamar el mismo pedido, recibe `400 Bad Request` con mensaje "Pedido ya reclamado por X".

![10_mozo_reclama_pedido](screenshots/feat125_gastro/10_mozo_reclama_pedido.png)

---

### 11_cliente_ve_reclamado

**Descripción:** El cliente ve en su celular el paso 2 del timeline: "Tomado por Carlos Mozo". El polling a 3s detecta el cambio automáticamente.

![11_cliente_ve_reclamado](screenshots/feat125_gastro/11_cliente_ve_reclamado.png)

---

### 12_mozo_envia_a_cocina

**Descripción:** El mozo revisa las líneas en el modal y presiona "Enviar a cocina y marcar listo". Backend hace `POST /api/v1/orders/:id/ready`, escribe `sentToKitchenAt` + `readyAt`, `status=READY`. Cliente ve el paso 4 "¡Listo!".

**Diferencia con la versión completa (FEAT-125 alcance total):** En esta demo alfa, "enviar a cocina" y "marcar listo" son la misma acción (no hay KDS físico separado). En la versión completa, el paso intermedio sería `status=PREPARING` con un KDS físico que cambia a `READY`.

![12_mozo_envia_a_cocina](screenshots/feat125_gastro/12_mozo_envia_a_cocina.png)

---

### 13_mozo_cierra_pedido_3_opciones

**Descripción:** El mozo presiona "Cerrar pedido" (botón verde). Aparece un Dropdown con **3 opciones** (esta es la corrección clave del spec):

| Modo | Cuándo usarlo | Efecto |
|---|---|---|
| 🍽️ **Cerrar sin cobrar** (default) | El cliente se levantó de la mesa, paga en caja después | `status=DELIVERED`, `closedAt` set, `closedWithoutPayment=true`, `paidAt=null` |
| 💵 **Cobrar en mesa** (waiter custody) | El mozo cobró efectivo o con datáfono móvil en la mesa | `status=DELIVERED`, `closedAt` set, `paidByWaiter=true`, `paidAt` set |
| 💳 **Pago digital** (pay-link) | El cliente pagó desde su menú con Stripe/MP/Pagopar (FEAT-116) | `status=DELIVERED`, `closedAt` set, `paidViaGateway=true`, `paidAt` set |

**Request (sin cobrar):**
```bash
curl -X POST https://demo-omnigastro.pesallaccia.com/api/v1/orders/{orderId}/close \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-api-key: demo-omnigastro-apikey-2026-09-04" \
  -d '{"mode": "WITHOUT_PAYMENT"}'
```

**Response:**
```json
{
  "ok": true,
  "orderId": "14195bd4-...",
  "status": "DELIVERED",
  "closeMode": "WITHOUT_PAYMENT",
  "meta": {
    "closedAt": "2026-09-04T03:25:29.163Z",
    "closedWithoutPayment": true,
    "paidByWaiter": false,
    "paidViaGateway": false,
    "paidAt": null,
    ...
  }
}
```

**Limitación de la demo alfa:** El cobro NO crea `CashMovement` ni factura electrónica (eso es FEAT-113 + FEAT-116). En producción, los modos `WAITER_CUSTODY` y `GATEWAY` crearían `CashMovement` en la `PosSession` correspondiente.

![13_mozo_cierra_pedido_3_opciones](screenshots/feat125_gastro/13_mozo_cierra_pedido_3_opciones.png)

---

### 14_cliente_ve_cierre

**Descripción:** El cliente ve en su celular el paso 5 del timeline: "Cerrado: paga en caja" / "Cobrado en mesa" / "Pago digital". Polling actualiza automáticamente.

![14_cliente_ve_cierre](screenshots/feat125_gastro/14_cliente_ve_cierre.png)

---

## Bloque B — Flujo cuando el cliente solo llama al mozo (sin pedido previo)

### 15_cliente_llama_quiero_pedir

**Descripción:** Cliente en la mesa, **sin armar carrito** (no usó la app para pedir). Toca "Llamar al mozo" y elige la opción "📝 Quiero pedir" (configurada en `Tenant.config.gastro.waiterOptions`). El backend crea un `WaiterCall` con `optionId=waiter-take-order` y `qrToken=...`.

**Request:**
```bash
curl -X POST https://demo-omnigastro.pesallaccia.com/api/v1/guest/tables/MESA-01/call-waiter \
  -H "Content-Type: application/json" \
  -H "x-api-key: demo-omnigastro-apikey-2026-09-04" \
  -d '{"optionId":"waiter-take-order","qrToken":"qr_demo_mesa_01_2026_09_04_abcdef0123"}'
```

**Response:**
```json
{
  "ok": true,
  "call": {
    "id": "wc_1788492364488_fpb7eq",
    "tableId": "MESA-01",
    "qrToken": "qr_demo_mesa_01_2026_09_04_abcdef0123",
    "optionId": "waiter-take-order",
    "optionLabel": "Quiero pedir",
    "status": "PENDING"
  }
}
```

**Criterio de éxito:** Backend guarda el `qrToken` en el `call` (necesario para que el mozo pueda abrir el modal de captura con la mesa pre-cargada).

![15_cliente_llama_quiero_pedir](screenshots/feat125_gastro/15_cliente_llama_quiero_pedir.png)

---

### 16_mozo_ve_llamada_toma_pedido

**Descripción:** El mozo ve la llamada en la columna derecha de `/admin/gastro` con borde rojo y badge "PENDING". Aparece el botón "Tomar pedido" (visible porque `optionId === "waiter-take-order"` o el status es `ACKNOWLEDGED`). El mozo presiona "Tomar pedido" → `PATCH /api/v1/waiter/calls/:id/take-order` → el call pasa a `TAKEN_ORDER` y el backend devuelve `{tableId, qrToken}` para que el mozo abra el modal de captura de pedido a mano.

**Request:**
```bash
curl -X PATCH https://demo-omnigastro.pesallaccia.com/api/v1/waiter/calls/wc_xxx/take-order \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-api-key: demo-omnigastro-apikey-2026-09-04"
```

**Response:**
```json
{
  "ok": true,
  "tableId": "MESA-01",
  "qrToken": "qr_demo_mesa_01_2026_09_04_abcdef0123",
  "optionLabel": "Quiero pedir",
  "freeText": null
}
```

**Criterio de éxito:** El call desaparece de la columna de pendientes (status=TAKEN_ORDER) y se abre el modal "Capturar pedido" con mesa MESA-01 y qrToken pre-cargados. El mozo selecciona productos del catálogo y crea un `Order` con `status=DRAFT, source=WAITER_TAKEN, claimedBy=mozo actual` (sin pasar por la app del cliente).

![16_mozo_ve_llamada_toma_pedido](screenshots/feat125_gastro/16_mozo_ve_llamada_toma_pedido.png)

---

### 17_mozo_captura_pedido_a_mano

**Descripción:** El mozo selecciona productos del catálogo (búsqueda + cantidad) y presiona "Enviar a cocina". El modal llama a `POST /api/v1/orders/:id/ready` después de crear el order. El stock se descuenta (post-FEAT-113).

**Criterio de éxito:** El pedido creado en `serviceMode=TABLE` (porque el mozo está en la mesa) aparece en la columna izquierda con `claimedBy=mozo actual`, el mozo puede continuar el flujo normal (mark ready → close).

![17_mozo_captura_pedido_a_mano](screenshots/feat125_gastro/17_mozo_captura_pedido_a_mano.png)

---

## Bloque C — Botón "Llamar al Mozo" con pedido activo

### 18_cliente_llama_pedir_cuenta

**Descripción:** Cliente ya tiene un pedido activo, terminó de comer. Toca "Llamar al mozo" y elige "🧾 Pedir la cuenta". El backend crea un `WaiterCall` con `optionId=waiter-bill`.

**Request:**
```bash
curl -X POST https://demo-omnigastro.pesallaccia.com/api/v1/guest/tables/MESA-01/call-waiter \
  -H "Content-Type: application/json" \
  -H "x-api-key: demo-omnigastro-apikey-2026-09-04" \
  -d '{"optionId":"waiter-bill","qrToken":"qr_demo_mesa_01_2026_09_04_abcdef0123"}'
```

![18_cliente_llama_pedir_cuenta](screenshots/feat125_gastro/18_cliente_llama_pedir_cuenta.png)

---

### 19_mozo_atiende_pedir_cuenta

**Descripción:** El mozo ve la llamada con label "🧾 Pedir la cuenta" y opciones:
- **Ya voy** (status → ACKNOWLEDGED): confirma que va a la mesa.
- **Cerrar pedido ▾** (botón verde en la card del pedido asociado): abre el Dropdown con las 3 opciones de cierre (sin cobrar / cobrar en mesa / pay-link).
- **Resolver** (cierra la llamada sin acción): la quita de la lista.

**Criterio de éxito:** El mozo elige "Cobrar en mesa" (waiter custody) → `closedAt` y `paidByWaiter=true`. El cliente ve "Cerrado: cobrado en mesa" en su tracking.

![19_mozo_atiende_pedir_cuenta](screenshots/feat125_gastro/19_mozo_atiende_pedir_cuenta.png)

---

## Resumen de endpoints (versión demo alfa)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/v1/guest/tables/by-token/:qrToken` | API key | Resuelve mesa por QR (lee `Tenant.config.gastro.qrTokens`) |
| POST | `/api/v1/guest/orders` | API key | Crea `Order` con `status=DRAFT` y `metadata.guestDraft{serviceMode, qrToken, tableId, ...}` |
| GET | `/api/v1/guest/orders/:id` | API key | Tracking de pedido |
| POST | `/api/v1/guest/tables/:tableId/call-waiter` | API key | Crea `WaiterCall` en `Tenant.config.gastro.waiterCalls` (con `qrToken`) |
| GET | `/api/v1/waiter/calls` | API key + JWT | Lista llamadas pendientes |
| PATCH | `/api/v1/waiter/calls/:id/acknowledge` | API key + JWT | Marca "Ya voy" (status=ACKNOWLEDGED) |
| **PATCH** | **`/api/v1/waiter/calls/:id/take-order`** | **API key + JWT** | **Mozo acepta tomar pedido desde la llamada (devuelve qrToken+tableId para abrir modal de captura)** |
| PATCH | `/api/v1/waiter/calls/:id/resolve` | API key + JWT | Marca resuelta |
| POST | `/api/v1/orders/:id/claim` | API key + JWT | Reclamar pedido guest |
| POST | `/api/v1/orders/:id/ready` | API key + JWT | Marcar listo (en demo: combina send-to-kitchen + ready) |
| **POST** | **`/api/v1/orders/:id/close`** | **API key + JWT** | **Cerrar pedido con `body.mode`: `WITHOUT_PAYMENT` (default) / `WAITER_CUSTODY` / `GATEWAY`** |
| GET | `/api/v1/orders/guest/pending` | API key + JWT | Lista pedidos guest activos (para `/admin/gastro`) |

---

## Diferencias con la versión completa (post-demo)

Esta demo alfa **no incluye**:
- Migración Prisma con `WaiterCall`, `WaiterCallOption`, `RestaurantTable.qrToken`, `Order.source`, `Order.claimedBy`, `Order.tableId`, `Order.sessionId`, `enum OrderSource`.
- `PosSession` real (FEAT-113) — el cobro en `WAITER_CUSTODY` y `GATEWAY` no crea `CashMovement` todavía.
- `RestaurantTable` real (FEAT-114) — la mesa es lógica (`tableId = MESA-01`), referenciada por el qrToken.
- Modal de captura de pedido a mano por el mozo (FEAT-114 + FEAT-117) — el endpoint `take-order` ya está, falta la UI completa.
- KDS físico (FEAT-117) — se simula con un solo botón en `/admin/gastro`.
- Live Escandallo atómico (FEAT-118) — el stock no se descuenta en `GUEST_DRAFT`, se hará al claim + send-to-kitchen en FEAT-113.
- Pay-link al cliente (FEAT-116) — el modo `GATEWAY` está implementado en el backend pero sin integración con Stripe/MP/Pagopar.
- Split payments, table-side custody con cashier handover, etc. (FEAT-116).

Cuando se ejecute la migración Prisma `*_omnigastro_core` (post-demo), los métodos `guestClaim/MarkReady/Close` deben reescribirse para escribir a `Order.source`, `Order.tableId`, `Order.claimedBy` directamente. `WaiterCallsController` debe migrar de `Tenant.config.gastro.waiterCalls` (JSON) a la tabla `WaiterCall`.

---

## Documentación vinculada

- `docs/planes/omnigastro/PLAN_OPERATIVO_Y_PROMPTS.md` §FEAT-125 (prompt completo)
- `docs/planes/omnigastro/AUDITORIA_Y_SOCIAL_CATALOG_COMO_MENU.md` §3 (flujos)
- `docs/planes/omnigastro/features/FEAT-125-guest-menu-claim-waiter.md` (versión completa con migración)
- `docs/planes/omnigastro/PLAN_MAESTRO.md` §6 (estado in_progress)
- `docs/troubleshooting/101-feat125-demo-alfa-provecchio.md` (deploy + smoke test)
- `docs/info/OrderFlow_v1.24.04_Estado_del_Arte.md`
- `docs/timeline.md` (v1.25.0-alpha-omnigastro hito)
