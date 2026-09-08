# FEAT-125 — Guest Digital Menu + Table Claim + Waiter Call  
# + Lógica de Claim + Pagos en Mesa

**Rama sugerida:** `feat/gastro-02-tables-split-guest` (junto con FEAT-114+)  
**Depende de:** FEAT-113, FEAT-114, Social Catalog, FEAT-097

---

## 1. Prompt de Implementación (FEAT-125)

```text
Rol: Implementador (seguir AGENTS.md).
Tarea: FEAT-125 — Guest Digital Menu + Table Claim + Waiter Call + Pagos en Mesa.

Contexto:
- Social Catalog ya existe y sirve el menú digital.
- RestaurantTable ya tiene qrToken (de la migración core).
- KDS / WebSocket + Redis Pub/Sub ya operativos.
- FEAT-113 (PosSession + cash:collect) ya completed.

Cambios requeridos:

1. schema.prisma
   - Asegurar campos en Order: source, guestSessionId, claimedAt, claimedById, tableId, sessionId.
   - Asegurar WaiterCallOption + WaiterCall.
   - Asegurar qrToken / rfidTag en RestaurantTable.

2. Endpoints Guest
   - GET  /api/v1/guest/tables/by-token/:qrToken
   - POST /api/v1/guest/orders                    → crea GUEST_DRAFT
   - GET  /api/v1/guest/orders/:id                → tracking
   - POST /api/v1/guest/tables/:tableId/call-waiter

3. Endpoints Mozo
   - POST /api/v1/orders/:id/claim
   - GET  /api/v1/waiter/calls
   - PATCH /api/v1/waiter/calls/:id/acknowledge
   - PATCH /api/v1/waiter/calls/:id/resolve

4. Admin
   - CRUD /api/v1/admin/waiter-call-options

5. WebSocket
   - Canal tenant:{tenantId}:waiter-alerts para WaiterCall
   - Canal por orderId / tableId para tracking del cliente

6. Social Catalog frontend
   - Botón "Enviar pedido" que llama a POST /guest/orders
   - Pantalla de tracking de estado
   - Botón "Llamar al Mozo" con opciones configurables + texto libre

Reglas AGENTS.md de siempre.
```

---

## 2. Lógica detallada de Claim

### Estados del pedido (vista cliente + mozo)

```
GUEST_DRAFT          Cliente envió desde el menú digital. sellerId = null.
       │
       ▼  (mozo hace claim)
CLAIMED              Mozo se asignó el pedido. claimedAt / claimedById rellenados.
       │
       ▼  (mozo edita si quiere y envía a cocina)
SENT_TO_KITCHEN      Live Escandallo + KitchenTickets creados.
       │
       ▼
IN_PREPARATION       Cocina marcó inicio (startedAt).
       │
       ▼
READY                Cocina marcó listo (readyAt). Alerta al mozo.
       │
       ▼
SERVED / PAID        Entregado y/o cobrado.
```

### Reglas de negocio del Claim

1. **Quién puede reclamar**
   - Usuario con permiso `tables:own` o superior.
   - Preferentemente el mozo dueño de la mesa (`RestaurantTable.ownerId`), pero cualquier mozo de la zona puede reclamar si la mesa no tiene dueño o está libre.

2. **Qué ocurre en el claim** (`POST /orders/:id/claim`)
   ```ts
   await prisma.$transaction(async (tx) => {
     const order = await tx.order.findFirst({
       where: { id: orderId, tenantId, status: 'GUEST_DRAFT', isDeleted: false }
     });
     if (!order) throw new NotFoundException();

     if (order.claimedById) {
       throw new ConflictException('Pedido ya reclamado por otro mozo');
     }

     await tx.order.update({
       where: { id: orderId },
       data: {
         status: 'CLAIMED',
         sellerId: currentUser.id,
         claimedById: currentUser.id,
         claimedAt: new Date(),
       }
     });

     // Si la mesa no tenía owner, asignarlo
     if (order.tableId) {
       await tx.restaurantTable.updateMany({
         where: { id: order.tableId, ownerId: null },
         data: { ownerId: currentUser.id, status: 'OCCUPIED' }
       });
     }

     // Audit
     await tx.posOrderAuditLog.create({
       data: {
         tenantId,
         orderId,
         userId: currentUser.id,
         action: 'CLAIM_ORDER',
         metadata: { previousStatus: 'GUEST_DRAFT' }
       }
     });
   });

   // WebSocket → cliente
   this.ordersGateway.emitToOrder(orderId, {
     type: 'ORDER_CLAIMED',
     claimedByName: currentUser.name,
     claimedAt: new Date()
   });
   ```

3. **Conflictos**
   - Si dos mozos intentan claim al mismo tiempo → el segundo recibe `409 Conflict`.
   - Un manager con `tables:reassign` puede forzar el cambio de dueño (queda en `TableTransferLog` + `PosOrderAuditLog`).

4. **Después del claim**
   - El mozo puede:
     - Agregar / quitar / modificar líneas y modificadores.
     - Cambiar `seatNumber` / asignar a `TableGuest`.
     - Enviar a cocina (dispara Live Escandallo).
     - Cobrar (parcial o total) — ver sección 3.

5. **Cancelación de claim**
   - Solo el propio mozo o un superior puede “liberar” el pedido (vuelve a `GUEST_DRAFT` o se asigna a otro).
   - Queda registro en audit log.

---

## 3. Pagos en Mesa (Table-side Payments)

### 3.1 Escenarios soportados

| Escenario | Quién cobra | Cómo impacta la caja |
|-----------|-------------|----------------------|
| **A. Mozo cobra en mesa (efectivo / datáfono móvil)** | Mozo con `cash:collect` | Waiter Custody → después rinde a la caja central |
| **B. Cliente paga desde el menú digital (QR / link)** | Pasarela (Stripe / Mercado Pago / Pagopar) | El pago queda asociado a la Order; al confirmarse se registra CashMovement en la sesión del cajero o del mozo según configuración |
| **C. Cajero cobra en caja fija** | Cajero con sesión abierta | CashMovement directo en su PosSession |
| **D. Split + pagos mixtos** | Combinación de A/B/C | Cada SplitPayment genera su propio movimiento |

### 3.2 Flujo A — Waiter Custody & Cashier Handover (cobro en mesa)

```
1. Mozo registra el pago en su tablet:
   POST /api/v1/orders/:id/payments
   {
     amount, paymentMethodId, tipPortion?,
     custody: true          // indica que el dinero queda en custodia del mozo
   }

2. Order pasa a estado SETTLED_BY_WAITER (saldo 0, dinero aún no en caja).

3. Se genera WaiterHandoverTicket (código de rendición).

4. Mozo entrega efectivo + vouchers en caja:
   POST /api/v1/pos-sessions/handover
   {
     waiterId, orderIds[], cashAmount, cardAmount, handoverCode
   }

5. Cajero confirma recepción → los montos entran en su PosSession (expectedCash).
   Order pasa a FULLY_CLOSED.
   Se emite factura electrónica si corresponde.
```

### 3.3 Flujo B — Pago digital desde el menú del cliente

```
1. Cliente en la SPA elige “Pagar ahora”.
2. Backend crea PaymentIntent / Preference (Stripe / MP / Pagopar) ligado a la Order.
3. Cliente paga.
4. Webhook de la pasarela → marca Order como paid + crea CashMovement.
5. Si la Order estaba en GUEST_DRAFT, se auto-reclama por un “sistema” o queda pendiente de claim solo para cocina.
6. El mozo recibe notificación “Pedido pagado – listo para enviar a cocina”.
```

### 3.4 Reglas de integridad

- No se puede cerrar una `PosSession` si existen pagos en custodia (`SETTLED_BY_WAITER`) sin rendir.
- Todo pago (incluso en mesa) debe quedar vinculado a un `PosSession` (del mozo o del cajero) o a un movimiento de pasarela auditable.
- Tips se registran en `tipPortion` y pueden alimentar un tip-pool posterior (Fase 2/3).
- Voids / descuentos post-pago requieren PIN de supervisor + `PosOrderAuditLog`.

### 3.5 Endpoints de pago en mesa

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/v1/orders/:id/payments` | Registrar pago (mozo o cajero) |
| POST | `/api/v1/orders/:id/pay-link` | Generar link / QR de pago para el cliente |
| POST | `/api/v1/pos-sessions/handover` | Rendición de custodia del mozo a caja |
| GET  | `/api/v1/pos-sessions/:id/pending-handovers` | Lista de rendiciones pendientes |

---

## 4. Criterios de aceptación FEAT-125 + Claim + Pagos

- [ ] Cliente escanea QR de mesa y ve el menú asociado.
- [ ] Cliente envía pedido → aparece como GUEST_DRAFT en la tablet del mozo.
- [ ] Mozo reclama → cliente recibe “Tu pedido fue tomado por {nombre}”.
- [ ] Mozo edita y envía a cocina → Live Escandallo + KDS + tracking visible.
- [ ] Cliente ve estados en tiempo real (incluyendo startedAt / readyAt).
- [ ] Botón “Llamar al Mozo” con opciones configurables + texto libre funciona y llega a la tablet.
- [ ] Mozo puede cobrar en mesa (custodia) y rendir a caja.
- [ ] Cliente puede pagar desde el menú digital (pasarela).
- [ ] Split payments y pagos mixtos se registran correctamente.
- [ ] Todo queda auditado en PosOrderAuditLog.

---

## 5. Orden de implementación recomendado

1. FEAT-113 (caja + roles) — ya en curso.
2. Migración Prisma core (incluye tablas de FEAT-125).
3. FEAT-114 (mesas + qrToken).
4. FEAT-125 (guest orders + claim + waiter call).
5. Pagos en mesa (custodia + pay-link) como extensión de FEAT-125 / FEAT-116.
