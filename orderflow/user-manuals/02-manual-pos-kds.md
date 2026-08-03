# 🏪 Manual de Usuario: Punto de Venta (POS) & Pantalla de Cocina (KDS)

> **Módulos:** Punto de Venta (`/admin/pos`) y Pantalla de Cocina (`/admin/kds`)  
> **Destinado a:** Cajeros, Mozos / Meseros y Personal de Cocina  

---

## 1. Introducción
OrderFlow incluye un sistema **POS (Punto de Venta)** que opera con soporte offline-first y comunicación en tiempo real mediante WebSockets hacia la pantalla **KDS (Kitchen Display System / Pantalla de Cocina)**.

---

## 2. Operación del POS (Punto de Venta)

### 2.1 Apertura y Creación de Comandas (Modo Mozo / Mesero)
1. Ingresa a `/admin/pos`.
2. Selecciona los productos o platillos del menú haciendo clic en las tarjetas de la pantalla.
3. Ajusta las cantidades de cada producto con los botones `+` y `-`.
4. Ingresa el número de mesa o referencia del cliente.
5. Haz clic en **Enviar Comanda a Cocina**. La orden llegará instantáneamente a la pantalla de cocina sin necesidad de imprimir papel.

### 2.2 Cobro y Cierre de Pedidos (Modo Caja)
1. En la pestaña **Pedidos Pendientes / Caja**, selecciona la orden a cobrar.
2. Selecciona el método de pago: **Efectivo**, **Tarjeta de Débito/Crédito**, **Transferencia / QR** o **Puntos de Fidelidad**.
3. Haz clic en **Completar Cobro**. La comanda se marcará como pagada y emitida.

---

## 3. Operación de la Pantalla de Cocina (KDS)

### 3.1 Recepción de Comandas en Tiempo Real
1. Abre `/admin/kds` en la tablet o monitor de la cocina.
2. Cada comanda ingresada aparecerá automáticamente con un código de colores por criticidad:
   - 🟢 **Verde (Normal):** Menos de 10 minutos en espera.
   - 🟡 **Amarillo (Atención):** Entre 10 y 20 minutos.
   - 🔴 **Rojo (Urgente):** Más de 20 minutos en preparación.

### 3.2 Cambio de Estado de Preparación
- Al comenzar a cocinar: Pulsa en **En Preparación**.
- Al finalizar el plato: Pulsa en **Listo para Servir**. El cajero o mozo recibirá la notificación en su pantalla al instante.
