# Plan de Actualización v1.43.9 — Corrección de Bugs OmniGastro (prueba producción 2026-10-27)

**Fecha:** 2026-10-27
**Rama:** `fix/omnigastro-v1.43.9-bugs`
**Versión target:** 1.43.9 (patch)
**Origen:** `docs/info/OmniGastro.md` - prueba en producción v1.43.8

---

## 1. Análisis del Problema

Durante la prueba en producción v1.43.8 (desplegada en `provecchio.com`), se reportaron 6 nuevos problemas:

| # | Síntoma | Módulo | Severidad |
|---|---------|--------|-----------|
| 1 | El mozo no puede reabrir el POS de una mesa que ya tomó pedido | `gastro.tsx` | Alta |
| 2 | "La mesa ya fue reclamada por otro mozo" error al tomar pedido de otra mesa | `gastro.tsx` / `orders.service.ts` | Alta |
| 3 | KDS muestra todos los pedidos en todas las estaciones (no filtra por categoría de producto) | `kds.tsx` / `orders.service.ts` | Alta |
| 4 | Modal PIN error 'Usuario mozo no encontrado' en gestión de mesas | `gastro-tables.tsx` / `gastro.tsx` | Media |
| 5 (Mejora) | No se puede mover un pedido de un asiento a otro | `gastro-pos.tsx` | Media |
| 6 (Mejora) | Nuevo asiento debería iniciar en el primer número libre | `gastro-pos.tsx` | Baja |

---

## 2. Alcance de los Cambios

### 2.1 Bug #1 — El mozo no puede reabrir el POS de una mesa que ya tomó pedido

**Causa raíz:** En `gastro.tsx`, la función `openPosModal` navega a `/admin/gastro/pos/${tableId}` pero solo se llama desde los botones de pedido activo. No hay un botón para reabrir el POS desde la lista de mesas atendidas en la vista "Atendidos".

**Solución:**
- Agregar botón "Reabrir POS" en cada fila de la tabla de historial (vista "Atendidos")
- El botón navega a `/admin/gastro/pos/${tableId}` usando el `tableId` del pedido

**Archivos:**
- `frontend/src/pages/admin/gastro.tsx` — Agregar botón en columna de acciones de la tabla de historial

---

### 2.2 Bug #2 — "La mesa ya fue reclamada por otro mozo"

**Causa raíz:** En `gastro.tsx:handleClaim`, se llama `POST /api/v1/orders/:id/claim` con `claimedBy` y `claimedById`. Si la orden ya fue reclamada por otro mozo, el backend rechaza con "La mesa ya fue reclamada por otro mozo". El frontend no maneja este caso gracefully.

**Solución:**
- En `handleClaim`, detectar el error 409 (Conflict) y mostrar un mensaje informativo
- Permitir al mozo tomar el pedido si es el mismo mozo (re-claim idempotente)
- Si es otro mozo, mostrar "Ya reclamado por [nombre]" sin error

**Archivos:**
- `frontend/src/pages/admin/gastro.tsx` — Mejorar manejo de error en `handleClaim`
- `backend/src/orders/orders.service.ts` — Verificar lógica de claim (idempotente para mismo mozo)

---

### 2.3 Bug #3 — KDS no filtra correctamente por estación de trabajo

**Causa raíz:** El KDS carga órdenes con `stationId` pero el backend `findAll` en `orders.service.ts` filtra por `KdsStation` (tabla de estaciones KDS) y `ProductPreparationStation` (relación N:N producto-estación). El problema es que cuando un pedido tiene múltiples líneas de diferentes categorías, el filtro por estación no se aplica correctamente a nivel de `order_line` sino a nivel de `order` completo.

**Solución:**
- El backend debe filtrar las `orderLines` por estación, no toda la orden
- Si una orden tiene líneas de "Para comer" y "Para beber", la orden debe aparecer en ambas estaciones pero solo mostrar las líneas correspondientes
- Alternativamente, el frontend debe filtrar las líneas visibles por estación

**Archivos:**
- `backend/src/orders/orders.service.ts` — Mejorar filtro `findAll` para filtrar líneas por estación
- `frontend/src/pages/admin/kds.tsx` — Filtrar líneas visibles por estación seleccionada

---

### 2.4 Bug #4 — Modal PIN error en gestión de mesas

**Causa raíz:** En `gastro-tables.tsx`, el modal de gestión de mesas pide PIN del mozo aunque ya esté logueado. El endpoint `verify-pin` con `scope:'mozo'` falla porque el usuario mozo no se encuentra en el contexto del modal.

**Solución:**
- Si `activeWaiter` ya está logueado, no pedir PIN (usar la sesión existente)
- Si no hay mozo logueado, mostrar un modal similar al de `/admin/gastro/mozos` para seleccionar mozo + PIN
- Reutilizar el componente de login de mozo

**Archivos:**
- `frontend/src/pages/admin/gastro.tsx` — Modificar modal de gestión de mesas para usar sesión existente
- `frontend/src/pages/admin/gastro-mozos.tsx` — Extraer componente de login reutilizable

---

### 2.5 Mejora #5 — Mover pedido de un asiento a otro

**Causa raíz:** No existe funcionalidad para mover líneas entre asientos en el POS.

**Solución:**
- Agregar drag & drop o selector de asiento destino en cada línea
- Al mover, actualizar el `seatNumber` de la línea en el estado local
- Al guardar, enviar el `seatNumber` actualizado al backend

**Archivos:**
- `frontend/src/pages/admin/gastro-pos.tsx` — Agregar UI para mover líneas entre asientos

---

### 2.6 Mejora #6 — Nuevo asiento debería iniciar en el primer número libre

**Causa raíz:** Al agregar un nuevo asiento, el número se asigna como `max(seatNumbers) + 1` o simplemente `1` sin verificar disponibilidad.

**Solución:**
- Calcular el primer número libre: `min(n for n in range(1, max+2) if n not in usedSeats)`
- Si tengo asientos 1 y 2, el nuevo debería ser 3

**Archivos:**
- `frontend/src/pages/admin/gastro-pos.tsx` — Corregir lógica de asignación de nuevo asiento

---

## 3. Estrategia de Testing

- **Unitarios:** OrdersService - claim idempotente, findAll por estación
- **E2E:** Flujo de reabrir POS, mover asientos, KDS por estación
- **Smoke:** Health endpoint + endpoints críticos

---

## 4. Dependencias y Riesgos

- Sin dependencias externas nuevas
- Riesgo medio: cambios en filtrado de KDS pueden afectar rendimiento
- Sin migraciones de BD requeridas

---

## 5. Aprobación

**Estado:** ⏳ Pendiente de aprobación del usuario
**Implementador:** Kilo (IA)