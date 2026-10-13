# 🏪 Integración de POS y Cocina (KDS) en Tiempo Real

[🏠 Atrás (README)](../README.md) | [🚀 Inicio Rápido](01-quickstart.md) | [🏗️ Arquitectura](02-architecture.md) | [🏢 Multi-Tenant Demo](03-multi-tenant-demo.md) | [🔐 JWT Auth](04-jwt-auth.md) | [📊 Testing Report](05-testing-report.md) | [🏪 POS & KDS](06-pos-kds.md) | [📊 Diagramas UML](07-uml-diagrams.md) | [🎖️ Loyalty Module](08-loyalty.md)

---

Este documento detalla la arquitectura, el flujo de datos y la implementación del módulo de **Punto de Venta (POS)** y **Pantalla de Cocina (KDS)** integrados en tiempo real mediante WebSockets en la plataforma OrderFlow.

---

## 🏗️ Arquitectura de Comunicación

Para lograr una actualización instantánea en cocina sin necesidad de recargas manuales (polling), implementamos un canal de comunicación bidireccional usando **Socket.io** sobre NestJS en el backend y **socket.io-client** en el frontend.

```
  🤵 Mozo (POS)                 💻 Cajero (POS)               🍳 Cocina (KDS)
       │                             │                              │
       │  1. Enviar comanda          │                              │
       │  (POST /orders, DRAFT)      │                              │
       │ ──────────────────────────> │                              │
       │                             │  2. Procesa cobro            │
       │                             │  (PATCH /confirm)            │
       │                             │ ───────────────────────────> │
       │                             │                              │  3. Evento: order:new
       │                             │                              │  (WebSocket)
       │                             │                              │ <───────────────────────────
       │                             │                              │
       │                             │                              │  4. Cambiar estado
       │                             │                              │  (PATCH /status, PREPARING)
       │                             │                              │ ───────────────────────────>
       │                             │                              │
       │                             │                              │  5. Evento: order:status_updated
       │                             │                              │  (WebSocket)
       │                             │                              │ <───────────────────────────
```

---

## 🔌 Protocolo WebSocket y Eventos

El gateway de WebSockets está alojado en el namespace `/orders` del backend y maneja las siguientes acciones:

### 1. Aislamiento Multi-Tenant (Salas Virtuales)
Al conectarse, cada pantalla cliente (POS o KDS) se suscribe a una sala exclusiva de su organización (`tenantId`):
* **Evento Cliente:** `join:tenant`
* **Payload:** `{ tenantId: string }`
* **Comportamiento:** El backend agrega al cliente a la sala `tenant:<tenantId>`. Esto garantiza la privacidad absoluta de los datos entre diferentes comercios.

### 2. Transmisión de Comandas
Cuando el Cajero confirma y cobra un pedido:
* **Evento Servidor:** `order:new`
* **Payload:** Objeto `Order` completo (incluye ítems y detalles del cliente).

### 3. Notificación de Estados de Preparación
Cuando la cocina procesa una orden a través del KDS:
* **Evento Servidor:** `order:status_updated`
* **Payload:** `{ orderId: string, status: OrderStatus }`

---

## 🤵 Módulo Punto de Venta (POS)

La interfaz del POS en `frontend/src/pages/admin/pos.tsx` está diseñada para optimizar los dos roles principales en la sala de ventas:

### A. Modo Mozo (Tomar Pedidos)
1. **Selección de Mesa:** El mozo selecciona la mesa correspondiente (Mesa 1-6, Barra, etc.).
2. **Carga del Carrito:** Busca productos del catálogo y los añade rápidamente al carrito táctil.
3. **Envío:** Al dar clic a **"Enviar Comanda"**, el pedido ingresa como `DRAFT` (pendiente de pago), el carrito se vacía y el KDS recibe la orden en tiempo real para iniciar la cocción.

### B. Modo Cajero (Cobros Centralizados)
1. **Panel de Cuentas:** Muestra de forma unificada un grid con todas las mesas que tienen consumiciones pendientes (estado `DRAFT`).
2. **Carga y Modificación:** Al seleccionar una mesa, el cajero puede ver el ticket completo, agregar productos de último momento o aplicar un descuento ($).
3. **Cierre de Mesa:** Al dar clic en **"Registrar Pago"**, el cajero selecciona el método de pago utilizado (**Efectivo, Tarjeta o Transferencia**) y confirma. Esto cambia el estado del pedido a `CONFIRMED` (pagado), registra el flujo de caja en el integrador y libera la mesa para los siguientes clientes.

---

## 🍳 Módulo Pantalla de Cocina (KDS)

El KDS en `frontend/src/pages/admin/kds.tsx` es el panel interactivo de producción de alimentos y servicios:

### 🚦 Semáforo de Tiempos (Priorización)
Cada tarjeta de pedido calcula los minutos transcurridos desde que el mozo guardó la comanda:
* 🟩 **Verde (Normal):** Menos de 10 minutos.
* 🟨 **Amarillo (Alerta):** Entre 10 y 20 minutos.
* 🟥 **Rojo (Crítico/Atrasado):** Más de 20 minutos de espera.

### 🔄 Flujo de Estados de Cocina
El KDS permite a los operarios transicionar los pedidos usando botones táctiles grandes:
1. **Cola de Espera** (`CONFIRMED` / `DRAFT` recibida): Botón **"Empezar Cocción"** $\rightarrow$ Pasa a `PREPARING`.
2. **En Cocción** (`PREPARING`): Botón **"Marcar Listo"** $\rightarrow$ Pasa a `READY` (listo para retirar).
3. **Listo para Retirar** (`READY`): Botón **"Entregar a Mesa"** $\rightarrow$ Pasa a `DELIVERED` (se retira de la pantalla).

---

## 🛠️ Tecnologías y Dependencias
* **Backend:** `@nestjs/websockets` y `@nestjs/platform-socket.io` (v10.4.22)
* **Frontend:** `socket.io-client` (v4.8.3), React (v18), Ant Design (v5)
* **Base de Datos:** Nuevos valores agregados al Enum `OrderStatus` en el esquema de Prisma (`PREPARING`, `READY`, `DELIVERED`).
