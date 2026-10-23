# Flujo: Cuenta abierta — liberar la mesa manteniendo la cuenta cobrable

> **Vertical:** OmniGastro · **Feature:** FEAT-190 · **Versión:** `1.39.14`
> **Origen:** propuesta del cliente (2026-10-20) tras el fix del bug #8b
> **Plan maestro:** [`PLAN_CUENTA_ABIERTA_2026-10-20.md`](./PLAN_CUENTA_ABIERTA_2026-10-20.md)

---

## 1. Actores

| Actor | Rol |
|---|---|
| **Cliente (QR)** | Genera el pedido en la mesa |
| **Mozo** | Reclama, sirve y **cierra la cuenta**: traspasa la cuenta a una persona y libera la mesa |
| **Cajero** | Cobra la cuenta abierta en su sesión de caja (imputación del efectivo) |
| **OrderFlow Core** | Transacción, estado de la cuenta abierta y telemetría |
| **odoo-adapter** | Resuelve la persona y llama al addon |
| **Odoo 14 POS** | `pos.order` a nombre del cliente (`res.partner`) y **mesa libre** (`table_id = False`) |

---

## 2. Secuencia

```mermaid
sequenceDiagram
    autonumber
    actor Mozo as Mozo
    participant OF as OrderFlow Core
    participant DB as BD
    participant BMQ as BullMQ
    participant ADP as odoo-adapter
    actor Caja as Cajero

    Mozo->>OF: POST /api/v1/orders/:id/transfer-to-person {persona, sesión?}
    OF->>DB: reutiliza o crea el Customer (persona)
    OF->>DB: resuelve la sesión de caja OPENED
    OF->>DB: TableGuest → CHECKED_OUT ; RestaurantTable → FREE, ownerId = null
    OF->>DB: order.tableId = null ; order.customerId/waiterId/posSessionId
    OF->>DB: guestDraft.openAccount = {OPEN, person, mozo, sesión, mesa original}
    OF-->>Mozo: mesa liberada, cuenta abierta
    OF->>BMQ: evento odoo.transfer_table_order
    BMQ->>ADP: POST /api/omniflow/transfer_table_order
    ADP->>ODOO: JSON-RPC transfer_table_order
    ODOO->>ODOO: partner_id = cliente ; table_id = False
    ODOO-->>ADP: {odoo_order_id, partner_id}

    Note over DB: la mesa queda libre para el siguiente comensal

    Caja->>OF: GET /api/v1/orders/guest/pending
    OF-->>Caja: cuentas de mesa + cuentas abiertas (persona, mozo, sesión)
    Caja->>OF: POST /api/v1/pos/sessions/:id/collect {orderId, importe, propina}
    OF->>DB: pedido → pagado ; CashMovement (venta + propina) en la sesión
    OF->>DB: openAccount.status = COLLECTED
```

---

## 3. Contratos REST

### 3.1 Traspaso de la cuenta a una persona

`POST /api/v1/orders/:id/transfer-to-person` · permiso `orders:update`

```jsonc
{
  "personName": "Juan Perez",   // o customerId de un cliente existente
  "taxId": "12345678",          // RUC / cédula (clave de identidad fiable)
  "phone": "0981 123456",
  "tableGuestId": "uuid",       // comensal concreto de la mesa (opcional)
  "cashSessionId": "uuid",      // sesión de caja (opcional: si no, la OPENED más reciente)
  "syncToOdoo": true            // traspasar también el pos.order en el ERP
}
```

Respuesta:

```jsonc
{
  "ok": true,
  "orderId": "uuid",
  "tableReleased": true,
  "customer": { "id": "uuid", "name": "Juan Perez", "taxId": "12345678" },
  "cashSession": { "id": "uuid", "name": "POS/2026/0001", "cashRegisterId": "uuid" },
  "meta": { "guestDraft": { "tableId": null, "openAccount": { "status": "OPEN", "...": "..." } } }
}
```

**Errores:** `400` si el pedido no está reclamado, si la cuenta ya fue traspasada
(idempotencia), si no hay mesa, o si no se indica a quién traspasar ·
`404` si el cliente o la sesión no existen.

### 3.2 Cobro en la caja

`POST /api/v1/pos/sessions/:id/collect` · permiso `cash:collect`

```jsonc
{ "orderId": "uuid", "amount": 18000, "tip": 2000, "paymentType": "cash" }
```

Marca el pedido como pagado (`status=DELIVERED`, `paymentStatus=paid`), registra el
`CashMovement` de venta (y otro de propina) en la sesión de caja, cierra la cuenta
abierta (`openAccount.status = COLLECTED`) y libera la mesa si la tenía.

### 3.3 Cola de la caja

`GET /api/v1/orders/guest/pending` · permiso `orders:read`

Añade a cada cuenta: `isOpenAccount`, `openAccount` (persona, mozo, sesión, mesa
original), `customerId`, `waiterId`, `posSessionId`, `paymentPreconfirmedAt`.

### 3.4 Traspaso en el ERP

`POST {ODOO_ADAPTER_URL}/api/omniflow/transfer_table_order` → JSON-RPC
`/api/omniflow/transfer_table_order` (addon `pos_omniflow_sync`).

---

## 4. Hitos de telemetría

Se registran en `order.metadata.odooSync.milestones` con la nomenclatura de
`ODOO_SYNC_MILESTONES` (AGENTS §13).

| Hito | Momento |
|---|---|
| `t0_table_closed` | El mozo cierra la cuenta (o la traspasa) |
| `t1_sync_enqueued` | El listener encoló el traspaso al ERP |
| `t2_job_started` | El processor tomó el job |
| `t3_adapter_called` | Se invocó al adapter |
| `t4_odoo_order_created` | Odoo devolvió el `pos.order` con `partner_id` y la mesa liberada |
| `t5_sync_completed` | Traspaso finalizado (éxito o error) |

**Métricas:** `odoo_sync_enqueued_total`, `odoo_sync_success_total`,
`odoo_sync_failed_total`, `odoo_sync_skipped_total`, `odoo_sync_duration_seconds`.

---

## 5. Reglas de dominio

1. **La mesa se libera, la cuenta no.** La transacción conserva su ID, su persona,
   su mozo y su sesión de caja; solo pierde la mesa.
2. **Idempotencia:** una cuenta no se puede traspasar dos veces
   (`guestDraft.openAccount.openedAt`).
3. **Una persona = un `Customer`** (reutilizado por documento fiscal o por nombre).
4. **La sesión de caja** es la indicada; si no, la `OPENED` más reciente del tenant.
   Sin sesión abierta, la cuenta queda **huérfana** y visible para cualquier cajero.
5. **El cobro en la caja persiste:** pedido pagado + `CashMovement` en la sesión.
6. **En Odoo 14 CE no existe la "transferencia a cliente" del POS Enterprise**: el
   addon replica el efecto (`partner_id` + `table_id = False`), de modo que la mesa
   queda libre en el ERP y la cuenta sigue abierta a nombre del cliente.
7. `tenantId` es sagrado: todo el flujo va por tenant (AGENTS §2, regla 1).

---

## 6. Operación

```bash
# Desplegar el addon (backup + reinicio). Requiere autorización.
./scripts/deploy-odoo-addon.sh --apply

# Prueba de contrato del addon contra el ERP
cd odoo-adapter && node test-pos-order-contract.js
```
