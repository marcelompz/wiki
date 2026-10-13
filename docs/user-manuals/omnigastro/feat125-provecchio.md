# FEAT-125 — Menú Digital + Mesa + Mozo (Provecchio Di Mora)

**Generado:** 2026-09-04
**Versión:** v1.25.0-alpha-omnigastro
**Tenant:** `provecchio-dimora-001` (subdomain: `dimora`, dominio público: `https://provecchio.com`)
**API Key:** `provecchio-api-key-2026`

---

## Visión del flujo

**El cliente** escanea el QR de la mesa → se abre el menú digital del restaurante → arma su pedido → elige modo de servicio (mesa o barra) → envía al mozo. El pedido queda como **DRAFT** (no descuenta stock). El **mozo** lo reclama, edita si hace falta, envía a cocina, marca listo y **cierra** el pedido. Adicionalmente, el cliente puede **llamar al mozo** sin haber hecho un pedido previo; el mozo responde desde `/admin/gastro` y puede **tomar el pedido manualmente** en su tablet.

**Reglas de negocio:**
- El cliente **siempre** puede llamar al mozo, con o sin pedido previo.
- El **cobro NO es obligatorio** al cierre. El mozo cierra cuando se consumió en mesa; el cliente paga después en caja.
- El cliente elige **dónde consumir** antes de enviar: 🪑 **A mi mesa** (lo atiende un mozo) o 🍺 **Para llevar / Tomar en barra**.
- En modo barra, el pedido **no se asigna a un mozo** — entra a la cola de barra.
- **El stock NO se descuenta** al crear el pedido (DRAFT). El descuento ocurre al reclamar y enviar a cocina.

---

## Índice de pasos

**Bloque A — Flujo desde la app del cliente**
1. Cliente escanea QR de la mesa
2. Modo restaurante se activa (header naranja + mesa)
3. Cliente agrega productos al carrito
4. Cliente abre el carrito
5. Cliente elige modalidad: A mi mesa o Para llevar / Barra
6. Cliente envía el pedido (queda como DRAFT)
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

**Descripción:** Cliente en la mesa escanea el QR pegado a la mesa. El catálogo detecta `?t=`, resuelve la mesa vía `GET /api/v1/guest/tables/by-token/:qrToken` y activa el modo restaurante.

**URL Mesa 1:** `https://provecchio.com/social-catalog/menudigital?t=qr_dimora_mesa1_2026_09_04_a1b2c3d4`

**URL Mesa 2:** `https://provecchio.com/social-catalog/menudigital?t=qr_dimora_mesa2_2026_09_04_e5f6g7h8`

**Backend:** `GET /api/v1/guest/tables/by-token/<token>`

```bash
curl -H "x-api-key: provecchio-api-key-2026" \
  https://provecchio.com/api/v1/guest/tables/by-token/qr_dimora_mesa1_2026_09_04_a1b2c3d4
```

```json
{
  "found": true,
  "tableId": "Mesa 1",
  "tableName": "Mesa 1",
  "tenantId": "provecchio-dimora-001",
  "tenantName": "Provecchio Di Mora Updated",
  "waiterOptions": ["call_waiter", "request_bill", "waiter_take_order"]
}
```

**Qué ve el cliente:** Header naranja con nombre de la mesa + botón "Llamar al Mozo". El catálogo muestra los 203 productos cargados.

---

### 02_cliente_agrega_productos

**Descripción:** El cliente navega el menú y agrega productos al carrito. El carrito se guarda en `localStorage` del navegador.

**Acciones:**
- Toca un producto → se agrega al carrito
- Puede modificar cantidades
- El stock no se descuenta todavía (estado DRAFT)

---

### 03_cliente_elige_modalidad

**Descripción:** En el carrito, el cliente elige cómo consumir:
- 🪑 **A mi mesa** — el pedido se asigna a un mozo
- 🍺 **Para llevar / Tomar en barra** — entra a la cola de barra

---

### 04_cliente_envia_pedido

**Descripción:** El cliente presiona "Enviar pedido al mozo". El pedido se crea con `status: DRAFT` y `serviceMode: TABLE | BAR`.

**Backend:** `POST /api/v1/orders/guest/draft`

**Request:**
```json
{
  "tableId": "Mesa 1",
  "serviceMode": "TABLE",
  "items": [
    { "productId": "...", "quantity": 1 }
  ]
}
```

**Response:**
```json
{
  "orderId": "...",
  "status": "DRAFT",
  "serviceMode": "TABLE"
}
```

---

### 05_vista_tracking_cliente

**Descripción:** Después de enviar, el cliente ve el tracking inline con polling cada 3s:
- Estado: DRAFT → GUEST_CLAIMED → READY → CLOSED
- Cuando el mozo reclama: "Tomado por {mozo}"
- Cuando está listo: "Su pedido está listo"
- Cuando se cierra: "Pedido cerrado"

**Backend:** `GET /api/v1/orders/guest/pending/:tableId`

---

## Bloque B — Flujo mozo

### 06_mozo_login

**Descripción:** El mozo accede al panel admin desde su navegador.

**URL:** `https://provecchio.com/admin/gastro`

**Usuarios del tenant:**
| Email | Rol | Acceso |
|-------|-----|--------|
| `marcelo@pesallaccia.com` | ADMIN | Panel completo |
| `ninfa@provecchio.com` | VIEWER | Solo lectura |
| `pos1@provecchio.com.py` | SELLER | Cajero/mozo |

**Credenciales:** Usar el password configurado en la DB (contactar al admin si se necesita reset).

---

### 07_panel_gastro

**Descripción:** El panel `/admin/gastro` muestra dos secciones:
1. **Pedidos en vivo** — lista de pedidos por mesa/estado con polling 3s
2. **Llamadas del cliente** — lista de WaiterCalls (Llamar al Mozo)

**Acciones disponibles por pedido:**
- 🔍 **Reclamar** — el mozo se asigna al pedido
- ✅ **Marcar listo** — pedido listo para entregar
- 🔒 **Cerrar pedido** — 3 opciones:
  - `WITHOUT_PAYMENT` — cerrar sin cobrar (paga después en caja)
  - `WAITER_CUSTODY` — cerrar, mozo retiene el pago
  - `GATEWAY` — cerrar y redirigir a pasarela de pago

**Acciones disponibles por llamada:**
- 📋 **Tomar pedido** — el mozo crea un pedido manual para esa mesa
- ✔️ **Resolver** — marcar la llamada como atendida

---

### 08_mozo_toma_pedido_manual

**Descripción:** Cuando el cliente llama sin pedido previo ("Quiero pedir"), el mozo presiona **"Tomar pedido"** en la llamada. Se abre un formulario para capturar:
- Productos y cantidades a mano
- Observaciones

El pedido se crea como DRAFT y el mozo lo gestiona normalmente.

**Backend:** `PATCH /api/v1/waiter/calls/:id/take-order`

**Request:**
```json
{
  "items": [
    { "productId": "...", "quantity": 1 }
  ]
}
```

---

## Bloque C — Llamar al Mozo con pedido activo

### 09_cliente_llama_sin_pedido

**Descripción:** El cliente toca "Llamar al Mozo" sin haber agregado productos.

**Opciones configurables** (definidas en `config.gastro.waiterOptions`):
- `call_waiter` — "Llamar al mozo" (texto libre)
- `request_bill` — "Pedir la cuenta"
- `waiter_take_order` — "Quiero pedir" (sin pedido previo)

---

### 10_cliente_llama_con_pedido

**Descripción:** El cliente ya tiene un pedido activo y presiona "Llamar al Mozo" → "Pedir la cuenta".

El mozo ve la llamada en `/admin/gastro` y puede:
- Cerrar el pedido sin cobro (pase por caja)
- Cerrar y cobrar en mesa
- Resolver sin cerrar (otra acción)

---

## QR tokens configurados

| Token | Mesa | URL |
|-------|------|-----|
| `qr_dimora_mesa1_2026_09_04_a1b2c3d4` | Mesa 1 | `https://provecchio.com/social-catalog/menudigital?t=qr_dimora_mesa1_2026_09_04_a1b2c3d4` |
| `qr_dimora_mesa2_2026_09_04_e5f6g7h8` | Mesa 2 | `https://provecchio.com/social-catalog/menudigital?t=qr_dimora_mesa2_2026_09_04_e5f6g7h8` |

Para agregar más mesas, actualizar `config.gastro.qrTokens` en el tenant `provecchio-dimora-001`.

---

## Troubleshooting

### QR no resuelve (404)
- Verificar que el token exista en `config.gastro.qrTokens` del tenant
- Verificar que `config.gastro.enabled = true`
- Verificar que la API key sea `provecchio-api-key-2026`

### Menudigital carga sin modo restaurante
- Verificar que la URL tenga `?t=<token>`
- Verificar que el backend esté healthy (`docker compose -f docker-compose.prod.yml ps backend`)

### Panel `/admin/gastro` no carga
- Verificar que el usuario tenga rol adecuado en `user_tenant_access`
- Verificar que el frontend esté healthy (`docker compose -f docker-compose.prod.yml ps frontend`)

### Pedido no aparece en el panel
- Verificar que el pedido tenga `status: DRAFT` o `GUEST_CLAIMED`
- El polling del panel es cada 3s; esperar o recargar la página

---

## Despliegue

- **Backend:** `orderflow-backend:latest` (build `bca79f6589f1`)
- **Frontend:** `orderflow-frontend:latest` (build `e24931645bf7`)
- **Fecha deploy:** 2026-09-04
- **Comandos deploy:**
  ```bash
  cd /srv/orderflow
  git pull origin main
  cd backend && docker build -f Dockerfile.prod -t orderflow-backend:latest .
  cd ../frontend && docker build -f Dockerfile.prod -t orderflow-frontend:latest .
  cd .. && docker compose -f docker-compose.prod.yml up -d --no-deps backend frontend
  ```
