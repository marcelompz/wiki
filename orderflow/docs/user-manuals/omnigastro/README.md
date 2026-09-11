# 🍽️ Manual de Usuario — OmniGastro (`v1.29.0`)

> **Módulo de Gestión Gastronómica Omnicanal (Restaurantes, Cafés, Bares y Cadenas)**  
> **Versión:** 1.29.0  
> **Última Actualización:** 2026-09-09  

---

## 📌 Introducción

**OmniGastro** es la solución integral dentro del ecosistema OmniFlow diseñada para optimizar la velocidad operativa de restaurantes y bares mediante control de salón por mapa de mesas, comandas móviles desde el celular de los clientes (QR), panel de cocina (KDS), caja centralizada y autenticación táctil por PIN para mozos.

---

## 🪑 1. Control de Mesas & Salón (`/admin/gastro/tables`)

El mapa de salón permite gestionar la disponibilidad física del establecimiento en tiempo real.

- **Estados de Mesa:**
  - 🟢 **Libre:** Mesa disponible para nuevos comensales.
  - 🟦 **Ocupada:** Mesa con pedido activo o comensales asentados.
  - 🟧 **Pide Cuenta:** El cliente o el mozo solicitó el pre-cierre para pago.
- **Gestión de Códigos QR:**
  - Se genera un token único por mesa (`?t=TOKEN`).
  - Permite la comanda directa desde el navegador móvil del cliente sin necesidad de descargar aplicaciones.
  - Descarga en formato PNG de alta definición listo para imprimir y colocar en las mesas o barras.

---

## 👨‍🍳 2. Panel de Mozos con Autenticación por PIN (`/admin/gastro/mozos`)

Diseñado para uso en tablets o terminales táctiles compartidas en salón.

1. **Selección de Mozo:** Se despliega el personal registrado en el turno.
2. **Ingreso por PIN:** Cada mozo ingresa su código numérico exclusivo de 4 dígitos en el teclado en pantalla.
3. **Turno Activo:** Atribuye automáticamente los pedidos reclamados, las llamadas del cliente (`WaiterCall`), las propinas y las comisiones ganadas por promociones impulsadas.

---

## 💵 3. Caja Gastro & Cobros (`/admin/gastro/cashier`)

El rol de Cajero dispone de un centro de control unificado para el cobro y pre-cierre.

- **Propina Voluntaria:** Propuesta automática del 10% sugerido (customizable antes del cobro).
- **Métodos de Pago:** Efectivo (con cálculo de vuelto), Tarjeta de Débito/Crédito, QR (Bancard / PIX / Transferencia).
- **Atribución de Propina:** Asigna y registra la propina al mozo responsable del servicio.

---

## 🎁 4. Propinas e Incentivos por Promociones (`/admin/gastro/incentives`)

Permite incentivar las ventas de platos o bebidas específicas.

- **Tipos de Incentivo:**
  - **Monto Fijo:** Ejemplo: Gs. 10.000 por cada *Combo Parrilla* vendido.
  - **Porcentaje %:** Ejemplo: 5% sobre la venta de *Vinos Reserva*.
- **Liquidación por Mozo:** Muestra la suma total de propinas + comisiones por promociones ganadas en la jornada para liquidar al cierre del turno.

---

## 🖥️ 5. Punto de Venta Odoo Universal POS (`/admin/pos`)

Ver manual completo en [19-manual-pos-odoo-universal.md](19-manual-pos-odoo-universal.md).

- **Modo Dual:** Configuración por caja de retail/mostrador vs. restaurante (`isRestaurant: boolean`).
- **Teclado Táctil (NumPad):** Edición rápida de Cantidad, Descuento % y Precio unitario.
- **Arqueo y Cierre de Caja:** Manejo estricto de sesiones `PosSession` y reportes Z.

