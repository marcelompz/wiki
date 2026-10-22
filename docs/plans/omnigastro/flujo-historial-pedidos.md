# Flujo · Historial y seguimiento de pedidos (cliente + panel de mozos)

> **Vertical:** OmniGastro · **Features:** FEAT-197 (Capa 1 → Capa 3) · **Versión objetivo:** v1.39.25 → v1.39.28
> **Plan maestro:** [`plan-actualizacion-v1.39.25-historial-pedidos-bandera-mozo.md`](./plan-actualizacion-v1.39.25-historial-pedidos-bandera-mozo.md)
> **Contrato REST declarado abajo es vinculante**: los nombres de los hitos de telemetría deben
> coincidir exactamente con los que se escriben en `Order.metadata.guestDraft`.

---

## 1. Actores y sistemas

| Actor | Descripción |
|---|---|
| **Comensal** | Cliente que pide desde la mesa con el QR (`?t=<qrToken>`) o desde un Bio-Link |
| **Mozo** | Empleado con la bandera `canUseMozoPos` (FEAT-194) que atiende la mesa en la tablet |
| **KDS** | Pantalla de cocina (`/admin/kds`), consume tickets |
| **Cajero** | Cobra la cuenta (`/admin/gastro/cashier`) |
| **Core OrderFlow** | Backend NestJS + Prisma/PostgreSQL + WebSocket (namespace `orders`) |
| **Navegador** | `localStorage` como caché local del historial del comensal |

---

## 2. Diagrama de secuencia — Capa 1: el comensal recupera su pedido

```mermaid
sequenceDiagram
    autonumber
    actor C as Comensal
    participant UI as omni-catalog.tsx<br/>(cliente)
    participant ST as public-orders-store<br/>(localStorage)
    participant API as GuestOrdersController<br/>/api/v1/guest/orders
    participant DB as PostgreSQL (Order)
    participant WS as orders.gateway<br/>(WebSocket)

    C->>UI: "Confirmar pedido"
    UI->>API: POST /api/v1/guest/orders<br/>{qrToken, lines, serviceMode}
    API->>DB: create Order (status=DRAFT)<br/>metadata.guestDraft.t0_order_created
    API-->>UI: {orderId, status, totalAmount, tableName, meta}
    Note over UI,ST: t3_order_confirmed<br/>(nuevo, Capa 2)
    UI->>ST: persist {orderId, publicCode, tableName, createdAt, total}
    UI->>ST: clearCart()  (el carrito se vacía, el historial NO)
    UI-->>C: Pantalla de tracking (pasos t0→t5)

    loop cada 3 s (o evento WS en iteración 2)
        UI->>API: GET /api/v1/guest/orders/:id
        API->>DB: read Order + metadata.guestDraft
        API-->>UI: {status, totalAmount, lines[], meta}
        UI-->>C: Actualiza estado ("En cocina", "¡Listo!")
    end

    C->>UI: "Volver al menú"
    Note over UI: solo se borra ?track= de la URL<br/>el store conserva el pedido

    C->>UI: "Mis pedidos (1)"
    UI->>ST: read
    ST-->>UI: [ {orderId, publicCode, ...} ]
    UI-->>C: Lista con estado en vivo
```

---

## 3. Diagrama de secuencia — Capa 2: recuperación desde otro dispositivo

```mermaid
sequenceDiagram
    autonumber
    actor C as Comensal<br/>(dispositivo nuevo)
    participant UI as omni-catalog.tsx
    participant API as GuestOrdersController<br/>/api/v1/guest/orders
    participant DB as PostgreSQL (Order)

    C->>UI: "Tengo un código de pedido"
    UI->>UI: validar formato /^[A-Z0-9]{6}$/
    UI->>API: GET /api/v1/guest/orders/by-code/:code
    Note over API: Endpoint PÚBLICO<br/>sin ApiKeyGuard y sin @TenantPrisma()<br/>(AGENTS.md Regla #4)
    API->>DB: findUnique { public_code }<br/>(this.prisma, sin filtro de tenant)
    alt no existe
        DB-->>API: null
        API-->>UI: 404 { message: "Código de pedido no encontrado" }
    else existe
        DB-->>API: Order (tenantId, status, metadata)
        API->>API: verificar order.tenantId == tenant del contexto
        API-->>UI: {orderId, status, totalAmount, tableName, lines[], meta}
        UI->>ST: persist
        UI-->>C: Pantalla de tracking
    end
```

---

## 4. Diagrama de secuencia — Capa 3: el mozo no pierde pedidos al cambiar de dispositivo

```mermaid
sequenceDiagram
    autonumber
    actor W as Mozo
    participant P as gastro.tsx<br/>(panel de mozos)
    participant API as OrdersController<br/>/api/v1/orders
    participant SVC as orders.service.ts
    participant DB as PostgreSQL
    participant WS as orders.gateway

    W->>P: login por PIN (verify-pin, scope=mozo)
    P->>API: POST /api/v1/auth/verify-pin {pinCode, scope:"mozo"}
    API->>DB: empleado ACTIVE + canUseMozoPos = true
    API-->>P: {accessToken, user{id, name, role}}

    P->>API: GET /api/v1/orders/guest/pending
    API->>SVC: findAll(status=DRAFT,CONFIRMED,PREPARING,READY)
    SVC->>DB: read
    SVC-->>P: pedidos en curso
    P->>WS: join:tenant → sala tenant:{tenantId}
    WS-->>P: order:new / guestOrderUpdate / order:status_updated

    W->>P: "Marcar listo"
    P->>API: POST /api/v1/orders/:id/claim
    SVC->>DB: metadata.guestDraft.claimedBy + claimedById 🆕<br/>Order.waiterId 🆕
    P->>API: POST /api/v1/orders/:id/ready
    SVC->>DB: status=READY, t5_order_ready

    W->>P: "Cerrar cuenta"
    P->>API: POST /api/v1/orders/:id/close {mode|closeMode|method} 🆕 normalizado
    SVC->>DB: status=DELIVERED, t7_paid (si mode=PAYMENT) 🆕<br/>t11_table_closed

    Note over P: El pedido cerrado desaparece de "En curso"<br/>(guest/pending solo trae activos)

    W->>P: Pestaña "Atendidos" 🆕
    P->>API: GET /api/v1/orders/guest/history?status=DELIVERED,CANCELLED&waiterId=
    API->>SVC: findAll + filtro metadata.guestDraft
    SVC->>DB: read
    SVC-->>P: histórico del servidor (no memoria del dispositivo)
    P-->>W: pedidos atendidos, incluso en otro dispositivo
```

---

## 5. Contratos REST

| Método | Ruta | Guard | Descripción | Estado |
|---|---|---|---|---|
| `GET` | `/api/v1/guest/orders/:id` | público | Estado puntual de un pedido | ✅ existe |
| `GET` | `/api/v1/guest/orders/by-code/:code` | público | Pedido por código corto de 6 caracteres | 🆕 F3 |
| `GET` | `/api/v1/guest/orders/by-table/:tableId` | público | Pedidos **abiertos** de la mesa (opcional, iteración 2) | 🆕 F5 |
| `GET` | `/api/v1/orders/guest/pending` | `JwtAuthGuard` | Pedidos activos (en curso) | ✅ existe |
| `GET` | `/api/v1/orders/guest/history` | `JwtAuthGuard` | Histórico por mesa y/o mozo | 🆕 F4 |
| `GET` | `/api/v1/orders/kds/tickets` | `JwtAuthGuard` | Tickets del KDS (historial en servidor) | ✅ existe |
| `GET` | `/api/v1/users/mozo-staff` | `ApiKeyGuard` + `PermissionsGuard` | Empleados con `canUseMozoPos` | 🆕 F2 (FEAT-194) |
| `POST` | `/api/v1/auth/verify-pin` | `ApiKeyGuard` | PIN de mozo con `scope: "mozo"` | 🆕 F2 (FEAT-194) |

---

## 6. Hitos de telemetría (nomenclatura vinculante)

Se almacenan en `Order.metadata.guestDraft` (JSON). Los nombres **deben** coincidir con esta tabla.

| Hito | Momento | Campo actual | Estado |
|---|---|---|---|
| `t0_order_created` | El comensal confirma el pedido | `createdAt` | ✅ |
| `t1_table_claimed` | El mozo reclama el pedido | `claimedAt` | ✅ |
| `t2_cart_saved` | El comensal guarda el carrito | `cartSavedAt` | 🆕 F1 |
| `t3_order_confirmed` | El comensal confirma el pedido | `confirmedAt` | 🆕 F3 |
| `t4_sent_to_kitchen` | El pedido entra a cocina | `sentToKitchenAt` | ✅ |
| `t5_order_ready` | El pedido está listo | `readyAt` | ✅ |
| `t6_waiter_viewed_history` | El mozo abre el historial | evento `waiter_history_viewed` | 🆕 F4 |
| `t7_paid` | El pedido se cobra | `paidAt` | 🆕 F1 (FEAT-197-d) |
| `t11_table_closed` | La mesa se cierra | `closedAt` | ✅ |

### KPIs derivados

| KPI | Fórmula | Para qué sirve |
|---|---|---|
| Atención al pedido | `t4 − t0` | SLA de entrada a cocina |
| Preparación | `t5 − t4` | SLA de cocina |
| Ciclo completo | `t11 − t4` | SLA de mesa (cocina → cobro) |
| Abandono de carrito | pedidos con `t2` y sin `t3` | fricción del cliente |
| Uso del seguimiento | consultas a `by-code` + trackings polleados | adopción de la mejora |
| Continuidad del mozo | pedidos recuperados con `waiterId` en otro dispositivo | valor de la Capa 3 |

---

## 7. Eventos WebSocket潜移默izados

| Evento | Emisor | Campos | Consumidor previsto |
|---|---|---|---|
| `order:new` | `orders.gateway:66` | pedido completo | panel de mozos (`gastro.tsx:152`) |
| `guestOrderUpdate` | `orders.gateway:94` / `service` | `{orderId, meta}` (incluye `guestDraft` completo) | tracking del cliente (Capa 2, sustituye el polling) |
| `order:status_updated` | `orders.gateway:94` | `{orderId, status}` | KDS (`kds.tsx:182-206`) |
| `kds:ticket_new` | `orders.gateway:81` | ticket de cocina | KDS |
| `waiterCallNew` / `waiterCallUpdate` | `guest-call-waiter.controller.ts:74` / `waiter-calls.controller.ts:83` | llamada | panel de mozos, alertas del móvil |
| 🆕 `order:closed` | `orders.gateway` (a crear en F4) | `{orderId, tableId, waiterId}` | mover el pedido cerrado de "En curso" a "Atendidos" sin recargar |

---

## 8. Seguridad

| Regla | Aplicación |
|---|---|
| AGENTS.md §4 (endpoints públicos) | `by-code` **no** lleva `@TenantPrisma()` ni `ApiKeyGuard`; resuelve el tenant desde `Order.tenantId` con `this.prisma` |
| AGENTS.md §1 (tenantId sagrado) | Todo filtro de histórico incluye `tenantId` |
| Privacidad | El código corto se genera con `crypto.randomBytes` (no `Math.random`) y el listado por mesa (iteración 2) queda **desactivado** por defecto |
| Rate limiting | `by-code` con límite por IP (ventana de 5 min) para frenar fuerza bruta del código de 6 caracteres |
| Auditoría | `verify-pin` con `scope:"mozo"` registra en log el intento fallido por falta de bandera |
