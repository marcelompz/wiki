# Diagnóstico de los bugs restantes del reporte del cliente

> **Origen:** [backlog del cliente](./BACKLOG_CLIENTE_20261019.md) (v1.39.9)
> **Fecha:** 2026-10-20 · **Alcance:** solo lectura (sin código ni versiones)
> **Estado:** diagnóstico cerrado para #1, #2a, #2b, #3, #4, #6 y #9

Los puntos **#5** (KDS en tiempo real), **#7** (sync Odoo), **#8a** (CRUD de mesas) y
**#8b** (PIN) ya están resueltos y desplegados (v1.39.11 → v1.39.15).

---

## Resumen

| # | Síntoma | Causa raíz | Dónde |
|---|---|---|---|
| **1** | La alerta suena en el **móvil del cliente** en vez de en la tablet del mozo | El propio cliente dispara `playNotificationSound('call')` tras llamar al mozo; y la tablet del mozo (`/admin/gastro/pos/:id` y `/admin/gastro/mozos`) **no tiene WebSocket** | `frontend/src/pages/omni-catalog.tsx:397` · `gastro-pos.tsx` · `gastro-mozos.tsx` |
| **2a** | Al pedir desde el QR de mesa se ofrece "Para llevar / Barra" | El modal de `serviceMode` se abre **siempre** en el checkout, aunque el QR sea de mesa (el backend ya por defecto `TABLE`) | `frontend/src/pages/omni-catalog.tsx:380, 2194` |
| **2b** | Al confirmar el pedido no se notifica al mozo como sí ocurre con "llamar al mozo" | Se crea un `WaiterCall` en BD pero **no se emite ningún evento** `waiterCallNew` en ese camino (solo en `call-waiter`) | `backend/src/guest/guest-orders.controller.ts:135-144` |
| **3** | En la pantalla del mozo: "Nuevo pedido guest de la mesa **G5**: 9fb72cde-… x1" | El texto se compone con `${l.productId}` (UUID) en vez del **nombre** del producto | `backend/src/guest/guest-orders.controller.ts:141` |
| **4** | Tras confirmar y pulsar "Volver al menú" no se ve el resumen del pedido y el carrito aparece vacío | El carrito se vacía al confirmar (correcto) y la vista de seguimiento **sustituye** el catálogo, por lo que la barra inferior no se renderiza; no hay ningún aviso de "tu pedido está en curso" | `frontend/src/pages/omni-catalog.tsx:358, 715` |
| **6** | Al confirmar en cocina, la comanda **desaparece** del KDS y se pierde el historial Pendiente/Cocinando/Listo | Al pasar a `DELIVERED` el handler `order:status_updated` **filtra** la comanda de la lista | `frontend/src/pages/admin/kds.tsx:177-179` |
| **9** | Tras enviar a cocina, el pedido **desaparece del POS** y el mozo no puede reabrirlo | El POS consulta estados **inexistentes**: `DRAFT,CLAIMED,SENT_TO_KITCHEN,IN_PREPARATION,READY`; el enum real es `DRAFT,CONFIRMED,PREPARING,READY,DELIVERED,CANCELLED` → el `PREPARING` no entra en el filtro | `frontend/src/pages/admin/gastro-pos.tsx:109` |

---

## Detalle y propuesta de arreglo

### #1 — La alerta debe sonar en la tablet del mozo

**Hoy:**
1. El cliente pulsa "Llamar al mozo" → `omni-catalog.tsx:397` hace
   `playNotificationSound('call')` **en su propio dispositivo**.
2. El evento `waiterCallNew` se emite a `tenant:{tenantId}` (backend correcto).
3. Solo lo escuchan `gastro.tsx` (panel) y `kds.tsx`. **La tablet del mozo
   (`gastro-pos.tsx`) y `/admin/gastro/mozos` no tienen WebSocket**, así que allí
   no suena nada.

**Propuesta:**
- Quitar el sonido de la página del cliente (que no debe ser notificado de su
  propia llamada).
- Añadir el socket a `gastro-pos.tsx` (la tablet real del mozo) y a
  `gastro-mozos.tsx`: al recibir `waiterCallNew` → **pop-up + sonido**.
- En `gastro.tsx` añadir también el sonido (hoy solo muestra el `message.warning`).

### #2a — Sin "Para llevar" en el QR de mesa

En el checkout, si el QR corresponde a una mesa (`tableInfo.tableId`), enviar
directamente con `serviceMode: 'TABLE'` y **no abrir el modal**. El modal
"Para llevar / Barra" queda solo para los QR de barra/producto (sin mesa).

### #2b — Notificar al mozo al confirmar el pedido

Al crear el pedido (servicio distinto de 'BAR'), emitir `waiterCallNew` a
`tenant:{tenantId}` con la misma carga que usa `call-waiter` (id, tableId,
**tableNumber**, optionLabel, freeText, status). Así el mozo recibe el aviso igual
que cuando el cliente pulsa "llamar al mozo" (y con el fix de #3, con el nombre
del producto en vez del UUID).

### #3 — El aviso debe mostrar el nombre del producto

`freeText: 'Nuevo pedido guest de la mesa G5: 9fb72cde-… x1'` → debe ser
`'Nuevo pedido guest de la mesa G5: Americano x1'`. El nombre ya está disponible:
las líneas guardan `metadata.snapshotName` (`guest-orders.controller.ts:90`).
En el frontend, el aviso de `gastro.tsx:164` usa `call.tableId` (UUID) →
usar `call.tableNumber` (ya viene en el payload).

### #4 — "Volver al menú" no debe parecer que el pedido se perdió

El comportamiento actual es correcto (el carrito se vacía al confirmar), pero la
experiencia confunde: al volver al menú no queda ninguna señal de que el pedido
está en curso. Propuesta: al volver al menú tras un pedido confirmado, mostrar un
aviso con el número de pedido y un enlace para volver al seguimiento, y/o mantener
la barra inferior con el estado del último pedido.

### #6 — El KDS no debe perder el historial

Hoy `order:status_updated` con `DELIVERED` **elimina** la comanda de la lista.
Propuesta: mantener las comandas servidas en una sección "Historial" (o una
pestaña) con su estado final, en lugar de hacerlas desaparecer.

### #9 — El POS debe poder reabrir el pedido enviado a cocina

Corregir el filtro de estados del POS a los del enum real:
`DRAFT,CONFIRMED,PREPARING,READY`. Con esto, tras "enviar a cocina"
(`PREPARING`) el pedido sigue visible y editable en el POS.

---

## Nota de trazabilidad

`backend/src/guest/guest-orders.controller.ts:141` compone el texto con
`l.productId`; ese mismo patrón aparece en
`backend/src/orders/orders.service.ts:1673` y en la vista de seguimiento del
cliente (`omni-catalog.tsx:760`, `l.name || l.productId`): cuando falta el
`snapshotName`, la UI cae al UUID. Conviene unificar el helper de "nombre de
línea" en un único sitio para que no vuelva a colarse.
