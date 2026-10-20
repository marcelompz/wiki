# Plan: "Cuenta abierta" — liberar la mesa manteniendo la cuenta cobrable

> **Vertical:** OmniGastro · **Propuesta de:** cliente (2026-10-20) · **Estado:** ✅ Aprobado e implementado (v1.39.14)
> **Diagrama del flujo:** [`flujo_cuenta-abierta.md`](./flujo_cuenta-abierta.md) · **Auditoría:** [`auditoria-cuenta-abierta-2026-10-20.md`](./auditoria-cuenta-abierta-2026-10-20.md)
> **Relacionado con:** bug #8b (cobro con PIN) y punto 7 (sync a Odoo)
> **Auditoría prevista:** `auditoria-cuenta-abierta-2026-10-20.md`

---

## 1. La propuesta

> "Pasar la cuenta a 'una persona' para que la cuenta a cobrar quede abierta. Esa
> transacción tiene un ID. Aun si la mesa se liberó para que se asigne a otros
> clientes, esa transacción puede quedar asignada a un cliente, un mozo y un cajero
> que haya tenido la sesión de caja abierta. Así es como podemos liberar la mesa
> pero mantener la cuenta abierta para el cobro."

Es el patrón de **cuenta abierta / tab** (en el POS de Odoo 14 se llama
*Transferencia a cliente*): la mesa se libera para el siguiente comensal y la
factura sobrevive con su propio ciclo de vida, imputada a una persona y a una
sesión de caja.

---

## 2. Mapeo al modelo existente (sin tablas nuevas)

| Concepto | Campo / modelo | Estado |
|---|---|---|
| La transacción con ID | `Order.id` | ✅ ya existe |
| La persona | `Order.customerId` → `Customer` | ⚠️ falta crear/reutilizar el registro |
| El mozo | `Order.waiterId` · `metadata.guestDraft.claimedBy` | ✅ ya existe |
| El cajero con la sesión abierta | `Order.posSessionId` → `PosSession` (`state=OPENED`, `userId`=cajero, `cashRegisterId`) | ✅ ya existe |
| Liberar la mesa | `Order.tableId = null` (ya nullable) + `RestaurantTable.status = FREE` + comensales `CHECKED_OUT` | ⚠️ falta la lógica |
| La cuenta abierta | `metadata.guestDraft.openAccount = {…}` | ⚠️ falta el estado |
| La caja | `PosSession` + `CashMovement` (imputación del cobro) | ⚠️ el cobro actual **no persiste nada** |

**No hace falta ninguna tabla nueva**: es un flujo (endpoint + estado + UI) sobre
el modelo actual.

---

## 3. Flujo propuesto

```mermaid
sequenceDiagram
    autonumber
    actor Mozo as Mozo
    participant OF as OrderFlow Core
    participant DB as BD
    actor Caja as Cajero

    Mozo->>OF: POST /api/v1/orders/:id/transfer-to-person {persona, sesion?}
    OF->>DB: reutiliza o crea el Customer (persona)
    OF->>DB: order.customerId / waiterId / posSessionId
    OF->>DB: order.tableId = null ; guestDraft.tableId = null
    OF->>DB: TableGuest -> CHECKED_OUT
    OF->>DB: RestaurantTable -> FREE, ownerId = null
    OF->>DB: guestDraft.openAccount = {openedAt, personId, personName, waiterName, cashSessionId, cashRegisterName, originalTable}
    OF-->>Mozo: cuenta abierta, mesa liberada

    Note over DB: la mesa queda libre para el siguiente comensal

    Caja->>OF: GET /api/v1/orders/guest/pending
    OF-->>Caja: cuentas abiertas (persona + mozo + sesion) y cuentas de mesa
    Caja->>OF: POST /api/v1/pos/sessions/:id/collect {orderId, metodo, propina}
    OF->>DB: order -> pagado ; CashMovement en la PosSession
```

---

## 4. Hallazgo adicional (bloqueante para esta feature)

**Hoy el "cobrar" en la caja no persiste nada.** En
`frontend/src/pages/admin/gastro-cashier.tsx`, `handleConfirmPayment` solo
actualiza el estado local de la lista y guarda las propinas en `localStorage`:

```ts
message.success(`Mesa ${selectedBill.tableName} cobrada exitosamente...`);
setBills((prev) => prev.filter((b) => b.tableId !== selectedBill.tableId));
```

No hay endpoint que marque el pedido como pagado ni que registre el movimiento de
efectivo en la `PosSession`. Sin cerrar ese hueco, una "cuenta abierta" no se
cierra nunca de verdad y el reporte de caja no cuadra.

**Alcance:** la feature de la cuenta abierta **incluye** el cobro real en la caja
(marcar pagado + `CashMovement` en la sesión).

---

## 5. Piezas a implementar

### Backend
| # | Pieza | Detalle |
|---|---|---|
| 1 | `POST /api/v1/orders/:id/transfer-to-person` | Crea/reutiliza el `Customer`; asigna `customerId`, `waiterId`, `posSessionId`; desasocia la mesa; marca comensales `CHECKED_OUT`; libera la mesa; escribe `guestDraft.openAccount`; **idempotente** (no se puede traspasar dos veces) |
| 2 | `POST /api/v1/pos/sessions/:id/collect` | Cobra una cuenta (de mesa o abierta): pedido → pagado, `CashMovement` en la sesión, propina opcional, comprobante |
| 3 | `GET /api/v1/orders/guest/pending` | Enriquecido: distinguir **cuentas de mesa** y **cuentas abiertas** (persona, mozo, sesión, mesa original) |
| 4 | Endpoint de diagnóstico | Cuentas abiertas huérfanas (sin sesión de caja asignada) |

### Frontend
| # | Pieza | Detalle |
|---|---|---|
| 5 | Panel del mozo / mesas | Acción "Cerrar cuenta y liberar mesa": pide la persona a la que se traspasa y confirma la liberación |
| 6 | Panel de caja | Sección "Cuentas abiertas" con persona, mozo y sesión; el cobro llama al endpoint real (hoy es simulación) |
| 7 | Reporte de caja | Las cuentas cobradas se imputan a la sesión (cierre de caja) |

### Documentación
- `flujo_cuenta-abierta.md` (diagrama Mermaid + contratos + hitos de telemetría, AGENTS §13)
- `auditoria-cuenta-abierta-2026-10-20.md`

---

## 6. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| El pedido queda sin mesa → la caja no sabe qué hacer con él | Campo `openAccount` explícito + secciones separadas en la cola |
| La mesa se libera pero en Odoo el `pos.order` sigue en la mesa del ERP | **Decisión pendiente (D3)**: traspasar también en el ERP o dejar el `pos.order` en su mesa hasta el cobro |
| Cuentas abiertas huérfanas si el cajero cierra la sesión sin cobrarlas | Listado de huérfanas + traspaso automático a la siguiente sesión abierta |
| Doble traspaso de la misma cuenta | Idempotencia en el endpoint (estado `openAccount` + validación) |
| El `pos_reference` de Odoo identifica el pedido: si la mesa cambia, la clave sigue siendo el UUID | Se mantiene `OmniFlow-<uuid>`: la trazabilidad no depende de la mesa |

---

## 7. Decisiones pendientes de aprobación

| # | Decisión | **Aprobado** |
|---|---|---|
| D1 | ¿La "persona" es un comensal concreto (`TableGuest`) o un cliente (`Customer`)? | **Cliente** (`Customer`): se crea o reutiliza; si se elige un comensal concreto, se enlaza su `tableGuestId` en el `openAccount` |
| D2 | ¿A qué sesión de caja se imputa? | **La que se indique; si no, la `OPENED` más reciente** del tenant. Sin ninguna, la cuenta queda huérfana y visible |
| D3 | ¿Se traspasa también el `pos.order` en el ERP? | **Sí**: transferencia a cliente en Odoo (`partner_id` + `table_id = False`) |
| D4 | ¿Se aplica al "cerrar sin cobrar" y al "cobro preconfirmado"? | **Ambos** |
