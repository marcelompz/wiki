# Ficha 360° del Mozo — OmniGastro

**Objetivo:** Documentar el flujo completo del mozo (waiter) en OmniGastro: desde la recepción de comandas (QR o llamada) hasta el cierre de cuenta, incluyendo endpoints, modelos de datos, flujos de trabajo y eventos WebSocket.

**Versión:** 1.0.0 (2026-09-11)
**Estado:** Operativo (FEAT-125)

---

## 1. Visión General

El mozo es el actor principal del flujo de restaurante. Su trabajo incluye:

1. **Recibir comandas** — desde QR de mesa o llamadas de invitados
2. **Tomar pedidos** — capturar líneas de productos
3. **Enviar a cocina** — KDS ticket routing
4. **Marcar listo** — cuando la cocina prepara el plato
5. **Cerrar cuenta** — 3 modos de pago
6. **Gestionar llamadas** — acknowledge / take-order / resolve

```
[Guest QR/Call] → [Draft Order] → [Mozo reclama] → [Envia a cocina] → [Listo] → [Cerrar] → [Pagado]
```

---

## 2. Modelos de Datos

### 2.1 WaiterCall (Llamada de Mozo)

```prisma
model WaiterCall {
  id            String @id @default(uuid())
  tenantId      String
  tableId       String
  orderId       String?      // null si aún no hay pedido
  optionId      String?      // opción seleccionada (Order, Check, etc.)
  status        String @default("NEW") // NEW | ACKNOWLEDGED | TAKEN_ORDER | RESOLVED
  optionLabel   String?
  freeText      String?      // texto libre si la opción lo requiere
  createdAt     DateTime @default(now())
}
```

**Estados del flujo:**

```
NEW → ACKNOWLEDGED → TAKEN_ORDER → RESOLVED
         ↓
    (opcional: tomar pedido → crear Order DRAFT)
```

### 2.2 WaiterCallOption (Opciones de Llamada)

```prisma
model WaiterCallOption {
  id           String @id @default(uuid())
  tenantId     String
  posConfigId  String?    // configuración por caja
  label        String     // "Tomar Orden", "Cuenta", etc.
  icon         String?    // emoji/icono para UI
  requiresText Boolean @default(false)  // ¿requiere texto libre?
  sortOrder    Int @default(0)
  isActive     Boolean @default(true)
}
```

Configurado en `tenant.config.gastro.waiterOptions`.

### 2.3 TableGuest (Invitados en Mesa)

```prisma
model TableGuest {
  id          String @id @default(uuid())
  tenantId    String
  tableId     String
  seatNumber  Int
  label       String?
  status      String @default("SEATED") // SEATED | MOVED | CHECKED_OUT
}
```

### 2.4 Order Metadata (guestDraft)

Cada order con canal `pos` o `guest` tiene metadata:

```typescript
interface GuestDraftMeta {
  qrToken?: string;
  tableId: string;
  tableName: string;
  serviceMode: 'TABLE' | 'BAR';  // mesa o barra
  claimedBy?: string;            // nombre del mozo
  claimedAt?: string;
  sentToKitchenAt?: string;
  readyAt?: string;
  closedAt?: string;
  closedWithoutPayment: boolean;
  paidByWaiter: boolean;         // modo WAITER_CUSTODY
  paidViaGateway: boolean;       // modo GATEWAY
  notes?: string;
  source: 'SOCIAL_CATALOG_GUEST';
}
```

---

## 3. API Endpoints del Mozo

### 3.1 Llamadas de Mozo (Waiter Calls)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/v1/waiter/calls` | Listar llamadas activas del mozo | ApiKeyGuard |
| `PATCH` | `/api/v1/waiter/calls/:id/acknowledge` | Aceptar llamada (marcar como leída) | ApiKeyGuard |
| `PATCH` | `/api/v1/waiter/calls/:id/take-order` | Aceptar tomar el pedido (devuelve qrToken + tableId para capturar líneas) | ApiKeyGuard |
| `PATCH` | `/api/v1/waiter/calls/:id/resolve` | Resolver llamada (cerrar sin pedido) | ApiKeyGuard |

**`takeOrder` response:**
```json
{
  "ok": true,
  "tableId": "table-uuid",
  "qrToken": "token-de-mesa",
  "optionLabel": "Tomar Orden",
  "freeText": null
}
```
El mozo usa `qrToken` + `tableId` para crear un draft de pedido en la tablet.

### 3.2 Órdenes Guest (Comandas de Mesa)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/v1/orders/guest/pending` | Listar órdenes guest pendientes (mini-KDS del mozo) | ApiKeyGuard |
| `POST` | `/api/v1/orders/:id/claim` | Mozo reclama la orden (la toma) | ApiKeyGuard + PermissionsGuard |
| `POST` | `/api/v1/orders/:id/ready` | Marcar lista (cocina preparó) | ApiKeyGuard + PermissionsGuard |
| `POST` | `/api/v1/orders/:id/close` | Cerrar cuenta (3 modos) | ApiKeyGuard + PermissionsGuard |
| `GET` | `/api/v1/guest/orders/:orderId` | Trackear estado del pedido | ApiKeyGuard |
| `POST` | `/api/v1/guest/orders` | Crear draft desde QR | ApiKeyGuard (público) |
| `GET` | `/api/v1/guest/tables/by-token/:qrToken` | Buscar mesa por QR | ApiKeyGuard (público) |

**`close` modes:**

| Modo | Descripción | `paidByWaiter` | `paidViaGateway` |
|------|-------------|----------------|------------------|
| `WITHOUT_PAYMENT` | Cerrar sin cobrar (error, mesa libre) | false | false |
| `WAITER_CUSTODY` | Mozo cobró en efectivo | true | false |
| `GATEWAY` | Pago por pasarela (tarjeta/QR) | false | true |

### 3.3 Órdenes KDS (Cocina)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/v1/orders/:id/send-to-kitchen` | Enviar a cocina + BOM explosion + emit KDS ticket |
| `GET` | `/api/v1/orders/kds/tickets?station=KITCHEN` | Listar tickets activos por estación |
| `POST` | `/api/v1/orders/:id/claim` | Cocina reclama ticket |
| `POST` | `/api/v1/orders/:id/ready` | Marcar plato listo |
| `POST` | `/api/v1/orders/:id/close` | Cerrar ticket |

### 3.4 Config POS

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/v1/pos/configs` | Crear configuración de terminal |
| `GET` | `/api/v1/pos/configs` | Listar terminales |
| `POST` | `/api/v1/pos/sessions/open` | Abrir caja |
| `POST` | `/api/v1/pos/sessions/close` | Cerrar caja (arqueo) |
| `POST` | `/api/v1/pos/floors` | Crear salón |
| `GET` | `/api/v1/pos/floors?configId=xxx` | Listar salones |
| `POST` | `/api/v1/pos/tables` | Crear mesa |
| `POST` | `/api/v1/orders/:orderId/assign-table` | Asignar mesa a orden |

---

## 4. Flujo Completo del Mozo

### 4.1 Escenario: Comanda por QR de Mesa

```
1. Cliente escanea QR en mesa
   → GET /api/v1/guest/tables/by-token/:qrToken
   → Retorna: { tableId, tableName, waiterOptions }

2. Cliente hace pedido en su celular
   → POST /api/v1/guest/orders { qrToken, lines, serviceMode }
   → Crea Order con status DRAFT + guestDraft metadata
   → Emite evento WebSocket 'guestOrderNew'

3. Mozo recibe notificación en su app (gastro.tsx)
   → Socket: guestOrderNew
   → Orden aparece en mini-KDS (GET /api/v1/orders/guest/pending)

4. Mozo reclama la orden
   → POST /api/v1/orders/:id/claim { claimedBy }
   → guestDraft.claimedBy + claimedAt se actualizan

5. Mozo envía a cocina
   → POST /api/v1/orders/:id/send-to-kitchen { itemsWithBom }
   → BOM explosion atómica (ingredientes consumidos)
   → Emite 'kds:ticket_new' a cocina
   → Order status → PREPARING

6. Cocina prepara, marca listo
   → POST /api/v1/orders/:id/ready
   → Order status → READY

7. Mozo cierra cuenta
   → POST /api/v1/orders/:id/close { closeMode }
   → Order status → DELIVERED
   → guestDraft.closedAt + pagos registrados
```

### 4.2 Escenario: Llamada de Mesa (Waiter Call)

```
1. Cliente presiona botón en tableta de mesa
   → Crea WaiterCall (status NEW)
   → Emite evento WebSocket 'waiterCallNew'

2. Mozo ve la llamada en su app
   → GET /api/v1/waiter/calls → lista de llamadas activas
   → Socket: waiterCallNew

3. Mozo acepta la llamada
   → PATCH /api/v1/waiter/calls/:id/acknowledge
   → status → ACKNOWLEDGED

4. Mozo toma el pedido
   → PATCH /api/v1/waiter/calls/:id/take-order
   → status → TAKEN_ORDER
   → Retorna { qrToken, tableId } para crear draft

5. Mozo crea orden draft en su tablet
   → POST /api/v1/guest/orders { qrToken, lines }
   → Vuelve al flujo normal (paso 2+)

6. Resolver sin pedido (cliente cambió de opinión)
   → PATCH /api/v1/waiter/calls/:id/resolve
   → status → RESOLVED
```

---

## 5. Eventos WebSocket

| Evento | Emisor | Descripción |
|--------|--------|-------------|
| `guestOrderNew` | OrdersGateway | Nueva orden guest creada |
| `guestOrderUpdate` | OrdersGateway | Estado de orden guest cambió |
| `waiterCallNew` | WaiterCallsController | Nueva llamada de mozo |
| `waiterCallUpdate` | WaiterCallsController | Estado de llamada cambió |
| `order:new` | OrdersGateway | Nueva orden (KDS) |
| `order:status_updated` | OrdersGateway | Estado de orden cambió (KDS) |
| `kds:ticket_new` | OrdersService (sendToKitchen) | Ticket KDS creado |

Los eventos se enrutan por rooms: `tenant:{tenantId}`.

---

## 6. Roles y Permisos

| Permiso | Mozo | Cocina | Admin |
|---------|------|--------|-------|
| Ver órdenes guest pending | ✅ | ✅ | ✅ |
| Claim order (reclamar) | ✅ | ✅ | ✅ |
| Mark ready (marcar listo) | ✅ (propio) | ✅ (cualquiera) | ✅ |
| Close order (cerrar) | ✅ (propio) | ❌ | ✅ |
| Send to kitchen | ✅ | ❌ | ✅ |
| View waiter calls | ✅ | ❌ | ✅ |
| Acknowledge/resolve calls | ✅ | ❌ | ✅ |
| Take order (tomar pedido) | ✅ | ❌ | ✅ |

---

## 7. Página del Mozo (Frontend)

| Ruta | Página | Función Principal |
|------|--------|-------------------|
| `/admin/gastro` | Panel Gastro Dashboard | Mesa, comandas, estado general |
| `/admin/gastro/mozos` | Comandero Móvil | App del mozo (claims, ready, close) |
| `/admin/gastro/cashier` | POS Cajero | Config POS, apertura/cierre de caja |
| `/admin/gastro/tables` | Salones & Mesas | Pisos, mesas, mapa, propietarios |
| `/admin/kds` | Cocina & Bar | Tickets KDS, semáforo SLA |
| `/admin/gastro/incentives` | Propinas e Incentivos | Comisiones por mozo |

### 7.1 flujo en gastro.tsx (Dashboard)

```
1. Conecta WebSocket (ordersGateway)
2. Escucha: guestOrderNew, guestOrderUpdate, waiterCallNew, waiterCallUpdate
3. Carga inicial: Promise.all([GET guest/pending, GET waiter/calls])
4. Para cada orden guest pending:
   → Verificar si es del mozo (claimedBy === currentUser)
   → Mostrar botón Claim / Ready / Close
5. Para cada waiter call:
   → Filtrar RESOLVED
   → Mostrar botón Acknowledge / Take Order / Resolve
```

---

## 8. Configuración por Tenant

En `tenant.config.gastro`:

```json
{
  "enabled": true,
  "qrTokens": { "table-uuid-1": "token-abc", "table-uuid-2": "token-def" },
  "waiterOptions": [
    { "id": "opt-1", "label": "Tomar Orden", "icon": "🍽️", "requiresText": false },
    { "id": "opt-2", "label": "Cuenta", "icon": "🧾", "requiresText": false },
    { "id": "opt-3", "label": "Reclamo", "icon": "⚠️", "requiresText": true }
  ],
  "waiterCalls": []
}
```

---

## 9. Errores Comunes y Soluciones

| Error | Causa | Solución |
|-------|-------|----------|
| `Pedido ya reclamado por X` | Otro mozo ya reclamó | Verificar claimedBy en mini-KDS |
| `El pedido aún no fue reclamado` | Intentar ready/close sin claim | Mozo debe claim primero |
| `Mesa no encontrada o QR inválido` | QR no asociado a mesa | Verificar config.gastro.qrTokens |
| `Módulo restaurante no activo` | gastro.enabled = false | Admin activar módulo gastro |
| `Llamada no encontrada` | Call ya fue resuelta | Filtrar RESOLVED en UI |
| `Ninguna línea válida` | Producto no existe | Verificar catálogo de productos |

---

## 10. Métricas del Mozo (Ficha 360°)

La ficha 360° del mozo incluye estos datos por mozo:

- **Pedidos atendidos** — count de órdenes donde `claimedBy = mozo`
- **Tiempo promedio** — desde `claimedAt` hasta `readyAt`
- **Propinas** — desde `/admin/gastro/incentives`
- **Mesas asignadas** — desde `orderLines → TableGuest`
- **Tasa de cierre** — pedidos closed / pedidos claimed

---

## 11. Preguntas Frecuentes

**¿Puede un mozo reclamar una orden de otro mozo?**
Sí, si tiene el permiso. La UI muestra un selector de mozo al hacer claim.

**¿Qué pasa si el mozo cierra sin cobrar?**
`closeMode = WITHOUT_PAYMENT`. El pedido queda DELIVERED sin pago. Para reapertura, reabrir como nueva orden.

**¿Cómo se separa el flujo POS retail vs RESTAURANT?**
`PosConfig.isRestaurant` flag. Cuando es `true`, el POS incluye mesa, mozo y restaurante features.

**¿Puede un cliente cancelar su pedido antes de que el mozo lo reclame?**
Sí, el estado DRAFT permite cancelación hasta que el mozo hace claim.

**¿Cómo funciona el modo BAR?**
`serviceMode: 'BAR'` en el metadata. El mozo toma pedido en barra sin mesa asignada.

---

## 12. Vistas y Páginas Relacionadas

| Doc | Ubicación | Contenido |
|-----|-----------|-----------|
| Plan OmniGastro | `docs/plans/OmniGastro/` | Plan completo del módulo |
| KDS Táctil | `docs/plans/pos-kds/` | KDS, BoM, Motor de cocina |
| POS Retail | `docs/plans/pos/` | POS base, cash control |
| Sidebar Org | `docs/plans/sidebar-org.md` | Organización del menú |
