# 💵 Manual Operativo para Cajeros — OmniGastro (`v1.29.0`)

> **Guía de Cierre de Cuentas, Cobranzas y Arqueo de Salón**  
> **Rol:** Cajero / Administrador de Caja / Encargado de Salón  
> **Versión:** 1.29.0  

---

## 📋 1. Acceso a Caja Gastro & Cobros

1. Ingresá al menú **OmniGastro 🍽️ → Caja Gastro & Cobros** (`/admin/gastro/cashier`).
2. Visualizarás la lista de cuentas enviadas por los mozos en estado 🟧 **Por Cobrar**.

---

## 💳 2. Procesamiento de Pagos & Propina

1. Hacé clic en **Procesar Cobro** en la tarjeta de la mesa correspondiente.
2. **Propina Voluntaria:** El sistema calcula automáticamente la propina del **10% sugerido**. Si el cliente desea modificarla o no dejar propina, ajustá el valor en el campo *Propina voluntaria*.
3. **Selección de Método de Pago:**
   - 💵 **Efectivo:** Ingresá el monto recibido del cliente; el sistema calculará automáticamente el **vuelto exacto**.
   - 💳 **Tarjeta Débito / Crédito:** Procesá la transacción en el POS físico e ingresá la confirmación.
   - 📱 **Pago QR / Transferencia:** Verificá la recepción del pago vía QR dinámico o transferencia bancaria.
4. Presioná **Confirmar Cobro e Imprimir Ticket** para cerrar la mesa e imprimir el comprobante de venta.

---

## 📊 3. Liquidación de Mozos & Cierre de Turno

1. Dirígete a **OmniGastro 🍽️ → Propinas e Incentivos** (`/admin/gastro/incentives`).
2. En la pestaña **Liquidación de Mozos**, revisá el desglose por empleado:
   - Total de propinas cobradas en sus mesas.
   - Total de incentivos ganados por venta de promociones.
3. Presioná **Liquidar Turno** al finalizar la jornada para efectuar la entrega física del dinero de propinas/comisiones al mozo.
