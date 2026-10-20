# Auditoría: Cuenta abierta — liberación de mesa con la cuenta cobrable

> **Feature:** FEAT-190 · **Versión:** v1.39.14 · **Rama:** `feat/gastro-cuenta-abierta-transfer-persona`
> **Origen:** propuesta del cliente (2026-10-20) tras el fix del bug #8b
> **Plan:** [`PLAN_CUENTA_ABIERTA_2026-10-20.md`](./PLAN_CUENTA_ABIERTA_2026-10-20.md)

---

## 1. Necesidad

El bug #8b dejó al descubierto un hueco de negocio: el frontend promete
*"Cobro preconfirmado. **Mesa libre en breve.**"*, pero el backend no libera la
mesa en ese momento, y el cobro en la caja **no persistía nada** (solo actualizaba
la lista en memoria y guardaba las propinas en el `localStorage`).

Propuesta del cliente:

> "Pasar la cuenta a 'una persona' para que la cuenta a cobrar quede abierta. Esa
> transacción tiene un ID. Aun si la mesa se liberó para que se asigne a otros
> clientes, esa transacción puede quedar asignada a un cliente, un mozo y un cajero
> que haya tenido la sesión de caja abierta. Así es como podemos liberar la mesa
> pero mantener la cuenta abierta para el cobro."

Es el patrón de **cuenta abierta** (tab). En el POS de Odoo 14 se corresponde con
la *transferencia a cliente*.

## 2. Decisiones tomadas (aprobadas)

| # | Decisión | Valor |
|---|---|---|
| D1 | Identidad de la "persona" | `Customer` (se crea o reutiliza), enlazando el comensal (`TableGuest`) si se elige |
| D2 | Sesión de caja | La que se indique; si no, la `OPENED` más reciente del tenant; si no hay, la cuenta queda huérfana |
| D3 | ERP | **También** se traspasa el `pos.order` (transferencia a cliente en Odoo) |
| D4 | Alcance | Flujos de "cerrar sin cobrar" y "cobro preconfirmado" |

## 3. Implementación

### 3.1 Backend

| Pieza | Detalle |
|---|---|
| `POST /api/v1/orders/:id/transfer-to-person` | Resuelve/crea el `Customer`, resuelve la sesión de caja, libera la mesa (comensales `CHECKED_OUT`, mesa `FREE` y sin dueño), desasocia la mesa del pedido y escribe `guestDraft.openAccount` |
| `POST /api/v1/pos/sessions/:id/collect` | Cobro real: pedido pagado, `CashMovement` de venta y de propina en la sesión, `openAccount.status = COLLECTED`, mesa liberada |
| `GET /api/v1/orders/guest/pending` | Enriquecido con `isOpenAccount`, `openAccount`, `customerId`, `waiterId`, `posSessionId` |
| `OdooTableSyncListener` | Nuevo handler `odoo.transfer_table_order` → encola el traspaso en el ERP |
| `OdooTableSyncProcessor` | Nueva acción `TRANSFER_TO_PERSON` → llama al adapter y registra telemetría |

**No se ha creado ninguna tabla nueva**: todo se apoya en `Order.customerId`,
`Order.posSessionId`, `Order.waiterId`, `Order.tableId` (nullable) y
`metadata.guestDraft.openAccount`.

### 3.2 Adapter y addon de Odoo

| Pieza | Detalle |
|---|---|
| `POST /api/omniflow/transfer_table_order` (adapter) | Valida los ids, resuelve la integración del tenant y reenvía al addon |
| `/api/omniflow/transfer_table_order` (addon) | Busca o crea el `res.partner` y hace el traspaso: `partner_id` = cliente y `table_id = False` |

**Odoo 14 CE no tiene la "transferencia a cliente" del POS Enterprise** (se
verificó en el core: no hay `transfer` en `point_of_sale/models/pos_order.py` ni
en los controladores). El addon replica el efecto sobre el modelo, que sí lo
permite: el `pos.order` conserva sus líneas, se le asigna el `res.partner` y la
mesa queda libre (`table_id = False`).

### 3.3 Frontend

| Pieza | Detalle |
|---|---|
| `/admin/gastro/tables` | Botón "4. Cerrar cuenta y liberar mesa (cuenta abierta)" + modal con la persona (nombre, RUC, teléfono) y el conmutador de traspaso al ERP |
| `/admin/gastro/cashier` | Sección de cuentas abiertas (persona, mesa de origen, sesión de caja) y **cobro real** contra `POST /pos/sessions/:id/collect` (con estado de carga y sesión obligatoria) |

## 4. Validación

- **Unitarios (Jest):** 5 casos del cobro en caja (`pos-sessions.collect.spec.ts`) y
  5 del traspaso a persona (`orders.service.spec.ts`), más la suite completa:
  **130 suites / 970 tests** en verde.
- **TypeScript:** backend y frontend sin errores; `vite build` + PWA correctos.
- **Pendiente de validación en producción:** el flujo completo con un pedido real
  (traspaso → mesa libre → cuenta en la cola de la caja → cobro) y el traspaso en
  el ERP (addon desplegado con `scripts/deploy-odoo-addon.sh --apply`).

## 5. Riesgos

| Riesgo | Estado |
|---|---|
| La cuenta abierta queda huérfana si el cajero cierra la sesión sin cobrarla | Visible en la cola de la caja con la etiqueta "sin imputar"; pendiente una vista de huérfanas |
| El traspaso en el ERP crea/actualiza un `res.partner` con el nombre de la persona | Es el comportamiento de la transferencia a cliente de Odoo; el `vat` se usa como clave de identidad |
| La mesa se libera antes de que el ERP aplique el traspaso | La liberación en OrderFlow es inmediata; la del ERP encola y reintenta (BullMQ). Si el ERP falla, la cuenta sigue abierta y el pedido queda trazabilidad completa |
| Dos mesas de OrderFlow apuntan a la misma mesa del ERP (G02 y G2 → 40) | Decisión del cliente; el ERP reutiliza el mismo `pos.order` por `pos_reference` |
