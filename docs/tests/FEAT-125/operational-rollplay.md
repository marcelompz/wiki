# FEAT-125 — Operational Rollplay & Flow Simulation

**Feature:** `FEAT-125` — OmniDineIn Gastro Flow  

---

## 🎭 Guion de Simulación Operativa (Rollplay)

### 👤 Actores
- **Cliente (Mesa 1):** Escanea QR, navega catálogo, realiza pedido y solicita atenciones.
- **Mozo (Carlos):** Gestiona la sala mediante tablet en `/admin/gastro`.
- **Cajero / Barman:** Atiende pedidos modalidad Barra / Cierre de caja final.

---

## 🎬 Escena 1: Flujo Estándar en Mesa (Table Flow)

1. **[Cliente]** Llega a la `MESA-01` y escanea el QR.
2. **[Cliente]** Navega el menú digital, selecciona *Milanesa con papas* y *Coca-Cola 500ml*.
3. **[Cliente]** Abre el carrito, hace click en **"Enviar al mozo"** y selecciona **"🪑 A mi mesa"**.
4. **[Sistema]** Genera la orden `GUEST_DRAFT` y emite evento WebSockets `order:new`.
5. **[Mozo]** Escucha la alerta en `/admin/gastro`, ve la card de la `MESA-01` y presiona **"Reclamar"**.
6. **[Cliente]** Observa en su pantalla de tracking que el pedido fue asignado a "Carlos Mozo".
7. **[Mozo]** Envía la comandera a cocina y marca como listo.
8. **[Mozo]** Lleva los platos a la mesa y selecciona **"Cerrar pedido ▾" -> "Cerrar sin cobrar"** (el cliente pagará al salir en caja).

---

## 🎬 Escena 2: Llamada al Mozo sin Pedido Digital

1. **[Cliente]** No desea usar el celular para armar carrito.
2. **[Cliente]** Presiona **"Llamar al mozo"** en el header y selecciona **"📝 Quiero pedir"**.
3. **[Mozo]** Ve la llamada roja `PENDING` en la columna derecha de su tablet.
4. **[Mozo]** Presiona **"Tomar pedido"**, lo que abre el modal de captura rápida de productos para la `MESA-01`.
5. **[Mozo]** Comanda los ítems directamente en su tablet.
