# Auditoría: Lote 2 de bugs del cliente (#1, #2a, #2b, #3, #4, #6, #9)

> **Rama:** `fix/gastro-lote-2-bugs-cliente` · **Versión:** v1.39.16 · **Feature:** FEAT-192
> **Alcance:** los 7 bugs restantes del reporte del cliente v1.39.9, agrupados en un
> único despliegue
> **Fecha:** 2026-10-20

---

## 1. Contexto

Con los bugs **#5, #7, #8a y #8b** ya resueltos y desplegados (v1.39.11 → v1.39.15),
quedaban **7 puntos** del backlog del cliente. Todos tenían el diagnóstico cerrado
(ver [`DIAGNOSTICO_BUGS_RESTANTES_2026-10-20.md`](./DIAGNOSTICO_BUGS_RESTANTES_2026-10-20.md))
y se resolvieron en **un solo lote y un solo despliegue**.

---

## 2. Correcciones

| # | Síntoma | Causa raíz | Corrección |
|---|---|---|---|
| **9** | Tras enviar a cocina, el pedido **desaparece del POS** y el mozo no puede reabrirlo | El POS consultaba `status=DRAFT,CLAIMED,SENT_TO_KITCHEN,IN_PREPARATION,READY`: tres de esos estados **no existen** en el enum `OrderStatus` (`DRAFT, CONFIRMED, PREPARING, READY, DELIVERED, CANCELLED`). Al enviar a cocina el pedido pasa a `PREPARING`, no entraba en el filtro | `gastro-pos.tsx`: consulta `DRAFT,CONFIRMED,PREPARING,READY` |
| **3** | El aviso al mozo mostraba el **UUID** del producto: *"Nuevo pedido guest de la mesa G5: 9fb72cde-… x1"* | El texto se componía con `${l.productId}` | Backend: se usa `metadata.snapshotName` (o el nombre resuelto del producto). Frontend: el aviso usa `call.tableNumber` (G5) en vez de `call.tableId` |
| **2b** | Al confirmar el pedido el mozo **no se enteraba** | Se creaba el `WaiterCall` en BD pero **no se emitía ningún evento** (solo en "llamar al mozo") | `guest-orders.controller.ts` emite `waiterCallNew` a `tenant:{tenantId}` con la misma carga que "llamar al mozo" |
| **2a** | Al pedir desde el QR de mesa se ofrecía **"Para llevar / Barra"** | El modal de `serviceMode` se abría siempre en el checkout | `omni-catalog.tsx`: si el QR es de mesa (`tableInfo.tableId`), se envía directo con `serviceMode: 'TABLE'`; el modal queda para los QR sin mesa |
| **1** | La alerta sonaba en el **móvil del cliente** y no en la tablet del mozo | (a) La página pública reproducía `playNotificationSound('call')` al llamar al mozo. (b) La tablet del mozo (`gastro-pos.tsx`, `gastro-mozos.tsx`) **no tenía WebSocket** | (a) El cliente ya no reproduce sonidos. (b) Nuevo hook `useWaiterAlerts` (sonido + pop-up) en las tres pantallas de mozo; el panel `gastro.tsx` añade el sonido que le faltaba |
| **6** | Al confirmar en cocina la comanda **desaparecía** y se perdía el historial Pendiente/Cocinando/Listo | El handler `order:status_updated` **filtraba** la comanda de la lista al llegar a `DELIVERED` | `kds.tsx`: las comandas servidas pasan a una sección **"🗂️ Historial de la sesión"** (con su estado final) en lugar de desaparecer |
| **4** | Tras "Volver al menú" no se veía el resumen y el carrito parecía vacío | El carrito se vacía al confirmar (correcto) y la vista de seguimiento sustituye al catálogo, sin ninguna señal de que el pedido seguía en curso | `omni-catalog.tsx`: al volver al menú se informa *"Tu pedido #xxxx sigue en curso. Te avisaremos cuando esté listo."* |

---

## 3. Validación

- **Unitarios**: 3 casos nuevos (`guest-orders.controller.spec.ts`) para #3 y #2b.
  Suite completa: **131 suites / 975 tests** en verde.
- **TypeScript**: backend y frontend sin errores; `vite build` + PWA correctos.
- **Pendiente de validación en producción**: los 7 behaviours se comprueban en el
  despliegue (comprobación manual en tablet, POS, KDS y catálogo).

---

## 4. Nota de coherencia

El patrón `l.name || l.productId` aparecía en tres sitios
(`guest-orders.controller.ts`, `orders.service.ts` y la vista de seguimiento del
cliente): cuando falta el `snapshotName`, la UI cae al UUID. En este lote se
corregió el punto de origen (el texto del aviso) y el de la vista del cliente ya
usa `metadata.snapshotName`; queda pendiente unificar el helper de "nombre de
línea" en un único sitio para que no vuelva a colarse.
