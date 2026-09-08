# FEAT-125 — Matriz Detallada de Casos de Uso y Casos de Prueba E2E

**Feature ID:** `FEAT-125` — OmniDineIn Guest Menu + Claim + Waiter Call  
**Versión de Evaluación:** `v1.25.0-alpha-omnigastro`  
**Referencia del Plan:** [FEAT-125_gastro.md](FEAT-125_gastro.md)

---

## 🎯 Escenarios de Uso y Casos de Prueba

---

### Escenario A: Cliente realiza pedido desde la mesa (Table Flow)
**Objetivo:** Verificar la captura del token QR, selección de productos, envío como `GUEST_DRAFT`, reclamo por mozo, envío a cocina y cierre de mesa.

| ID Caso de Prueba | Caso de Uso | Pasos de Ejecución | Datos de Entrada / Contexto | Resultado Esperado / Criterio de Éxito |
|---|---|---|---|---|
| **TC-125-A01** | Resolución de QR de Mesa | 1. Cliente escanea QR.<br>2. Sistema invoca `GET /api/v1/guest/tables/by-token/:qrToken`. | `qrToken = qr_demo_mesa_01...` | Retorna `found=true`, `tableId=MESA-01` y 4 `waiterOptions`. |
| **TC-125-A02** | Activación Modo Restaurante | 1. Navegar en el catálogo tras escanear QR. | Menú digital cargado. | Visualización de badge `🍽️ MODO RESTAURANTE` y botón flotante "Llamar al mozo". |
| **TC-125-A03** | Armado de Carrito | 1. Seleccionar productos (Milanesa, Coca-Cola).<br>2. Abrir drawer de carrito. | Ítems seleccionados. | Drawer muestra "Enviar al mozo" en botón principal (no "Confirmar"). |
| **TC-125-A04** | Selección Modalidad "A mi mesa" | 1. Presionar "Enviar al mozo".<br>2. Seleccionar card "🪑 A mi mesa". | `serviceMode = TABLE` | Se emite `POST /api/v1/guest/orders` con `serviceMode=TABLE`. |
| **TC-125-A05** | Emisión de GUEST_DRAFT | 1. Backend procesa creación de pedido. | Pedido guest. | `status=DRAFT`, metadata `guestDraft` completa. **El stock NO se descuenta**. |
| **TC-125-A06** | Tracking de Cliente en Tiempo Real | 1. Redirección a pantalla de tracking. | Polling 3s a `GET /api/v1/guest/orders/:id`. | Timeline muestra paso 1 "Pedido enviado" y paso 2 "Esperando mozo". |
| **TC-125-A07** | Reclamo de Pedido por Mozo | 1. Mozo ve card en `/admin/gastro`.<br>2. Presiona "Reclamar". | Token mozo + `POST /api/v1/orders/:id/claim`. | `claimedBy=mozo`. Tracking del cliente cambia a "Tomado por {mozo}". |
| **TC-125-A08** | Envió a Cocina y Estado Listo | 1. Mozo revisa líneas.<br>2. Presiona "Enviar a cocina y marcar listo". | `POST /api/v1/orders/:id/ready`. | `status=READY`. Tracking del cliente muestra paso 4 "¡Listo!". |
| **TC-125-A09** | Cierre "Cerrar sin cobrar" | 1. Mozo presiona "Cerrar pedido ▾".<br>2. Selecciona "Cerrar sin cobrar". | `POST /api/v1/orders/:id/close` con `mode=WITHOUT_PAYMENT`. | `status=DELIVERED`, `closedWithoutPayment=true`, `paidAt=null`. Cliente ve "Cerrado: paga en caja". |

---

### Escenario B: Cliente llama al mozo para pedir (sin pedido previo)
**Objetivo:** Permitir que el cliente que prefiere atención presencial solicite al mozo que tome el pedido en su tablet.

| ID Caso de Prueba | Caso de Uso | Pasos de Ejecución | Datos de Entrada / Contexto | Resultado Esperado / Criterio de Éxito |
|---|---|---|---|---|
| **TC-125-B01** | Solicitud "Quiero pedir" | 1. Cliente presiona "Llamar al mozo".<br>2. Selecciona "📝 Quiero pedir". | `POST /api/v1/guest/tables/MESA-01/call-waiter` | Crea `WaiterCall` con `optionId=waiter-take-order` y guarda `qrToken`. |
| **TC-125-B02** | Alerta en Panel Mozo | 1. Mozo observa panel `/admin/gastro`. | Llamada PENDING. | Card con borde rojo, llamada destacada y botón "Tomar pedido" visible. |
| **TC-125-B03** | Aceptación de Tomar Pedido | 1. Mozo presiona "Tomar pedido". | `PATCH /api/v1/waiter/calls/:id/take-order`. | Status cambia a `TAKEN_ORDER`. Backend devuelve `{tableId, qrToken}` y abre modal de captura a mano. |
| **TC-125-B04** | Captura Manual y Ruteo | 1. Mozo agrega productos desde el modal en tablet.<br>2. Confirma envío. | Pedido comanded por mozo. | Se genera pedido `DRAFT` con `source=WAITER_TAKEN`, `claimedBy=mozo` directamente asignado. |

---

### Escenario C: Cliente solicita asistencia en mesa
**Objetivo:** Validar solicitudes operativas intermedias durante la estadía del cliente.

| ID Caso de Prueba | Caso de Uso | Pasos de Ejecución | Datos de Entrada / Contexto | Resultado Esperado / Criterio de Éxito |
|---|---|---|---|---|
| **TC-125-C01** | Solicitud "Más pan" / "Ayuda" | 1. Cliente en tracking presiona "Llamar al mozo".<br>2. Elije "🍞 Más pan" o texto libre. | Option ID `waiter-more-bread` o `waiter-help`. | Se registra `WaiterCall` vinculado a la `MESA-01`. |
| **TC-125-C02** | Atender y Resolver Llamada | 1. Mozo presiona "Ya voy".<br>2. Mozo asiste a mesa y presiona "Resolver". | `PATCH /api/v1/waiter/calls/:id/acknowledge` y `/resolve`. | La llamada cambia de `PENDING` ➔ `ACKNOWLEDGED` ➔ Desaparece de la lista. |

---

### Escenario D: Cliente solicita la cuenta
**Objetivo:** Gestionar la finalización de mesa y modalidades de cobro/cierre.

| ID Caso de Prueba | Caso de Uso | Pasos de Ejecución | Datos de Entrada / Contexto | Resultado Esperado / Criterio de Éxito |
|---|---|---|---|---|
| **TC-125-D01** | Solicitud "Pedir la cuenta" | 1. Cliente presiona "Llamar al mozo" -> "🧾 Pedir la cuenta". | Option ID `waiter-bill`. | Mozo recibe alerta prioritaria de solicitud de cuenta para `MESA-01`. |
| **TC-125-D02** | Cobro en Mesa (Waiter Custody) | 1. Mozo cobra en efectivo/POS móvil en mesa.<br>2. Cierra pedido en modo "Cobrar en mesa". | `POST /api/v1/orders/:id/close` con `mode=WAITER_CUSTODY`. | `paidByWaiter=true`, `paidAt` registrado. Tracking cliente: "Cobrado en mesa". |
| **TC-125-D03** | Cierre Pago Digital | 1. Cliente paga con pasarela online.<br>2. Mozo confirma modo "Pago digital". | `mode=GATEWAY`. | `paidViaGateway=true`. Registra fecha de pago digital. |

---

### Escenario E: Pedido para llevar / tomar en barra (Bar Flow)
**Objetivo:** Canalizar pedidos que no requieren mozo asignado ni mesa específica.

| ID Caso de Prueba | Caso de Uso | Pasos de Ejecución | Datos de Entrada / Contexto | Resultado Esperado / Criterio de Éxito |
|---|---|---|---|---|
| **TC-125-E01** | Checkout Modalidad Barra | 1. Cliente envía pedido y selecciona "🍺 Para llevar / Barra". | `serviceMode = BAR` | Pedido creado con `serviceMode=BAR`. No requiere `tableId` ni mozo asignado. |
| **TC-125-E02** | Cola de Atención de Barra | 1. Barman/Cajero revisa `/admin/gastro`. | Cola de pedidos Barra. | Pedido visible para cualquier cajero/barman sin bloqueo de reclamo por mozo. |

---

## ⚠️ Pruebas de Situaciones Excepcionales (Edge Cases)

| ID | Situación Excepcional | Condición de Prueba | Comportamiento Esperado |
|---|---|---|---|
| **TC-125-EX01** | Reclamo Concurrente de Mozo | Dos mozos presionan "Reclamar" al mismo tiempo en el mismo pedido. | El primer request asigna el pedido (HTTP 200). El segundo recibe `HTTP 400 Bad Request: Pedido ya reclamado por X`. |
| **TC-125-EX02** | Llamada Duplicada de Cliente | Cliente presiona "Llamar al mozo" múltiples veces seguidas. | El backend evita duplicación spam o agrupa llamadas activas `PENDING` para la misma mesa. |
| **TC-125-EX03** | Cierre sin Reclamo | Intentar cerrar un pedido en estado `DRAFT` sin haber sido reclamado previa o simultáneamente. | El sistema requiere confirmación o asignación de mozo antes del cierre. |
