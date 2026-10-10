# Plan de Actualización 1.38.14 — OmniGastro: Vista POS Completa + Catálogo por Categorías + Mapa de Mesas

> **Versión:** 1.38.14 (minor)  
> **Fecha:** 2026-10-08  
> **Branch:** `feat/omnigastro-pos-fullscreen-1.38.14`  
> **Integración:** `product/omnigastro` → `main`

---

## Contexto

La versión 1.38.11–1.38.13 implementó **Modal POS/Comandera con Split-by-seat** en `gastro.tsx`.  
El modal cumple con CRUD de líneas, selector de asiento por línea, panel resumen por asiento y botón "Dividir por asiento" (`POST /api/v1/bill-splits` method `BY_SEAT`).

**Limitación actual:** El modal no escala para operación continua en tablet (pantalla completa, catálogo navegable, mapa visual de mesas, gestión de comensales).

**Objetivo 1.38.14:** Evolucionar a **Vista POS dedicada full-screen** (`/admin/gastro/pos/:tableId`) con:
1. Catálogo navegable por categorías (reutilizar `CategoryAccordion` de `omni-catalog.tsx`).
2. Mapa visual de mesas con ocupación por asiento (tiempo real).
3. CRUD de comensales (`table_guests`) integrado.
4. Flujo unificado QR → Mesa → POS → KDS → Split-by-seat → Cobro.

---

## Cambios Requeridos

### 1. Nueva Página POS Full-Screen: `gastro-pos.tsx`

**Archivo:** `frontend/src/pages/admin/gastro-pos.tsx` (nuevo)

**Estructura:**
```
┌─────────────────────────────────────────────────────────────┐
│ Header: Mesa N° | Mozo | Estado | Total | [Cerrar] [Split] │
├──────────────┬────────────────────────────────┬─────────────┤
│              │                                │             │
│  Categorías  │  Líneas del Pedido (ordenadas  │  Resumen    │
│  (Sidebar)   │  por asiento)                  │  por Asiento│
│              │                                │             │
│  🍕 Pizzas   │  🪑 Asiento 1                  │  🪑 1: $45  │
│  🍔 Burgers  │    • Margherita x2  $28        │  🪑 2: $32  │
│  🥗 Ensaladas│    • Coca-Cola x1  $4          │  🪑 3: $0   │
│  🍰 Postres  │  🪑 Asiento 2                  │  Total: $77 │
│              │    • Burger x1  $18            │             │
│              │    • Papas x1  $14             │  [Dividir   │
│              │  🪑 Asiento 3 (vacío)          │   por asiento]│
│              │                                │             │
│  [Buscador]  │  [+ Agregar línea]             │             │
└──────────────┴────────────────────────────────┴─────────────┘
```

**Componentes reutilizables:**
- `CategoryAccordion` (de `omni-catalog.tsx`) → Sidebar izquierdo.
- `SeatSelector` (dropdown por línea, ya en `gastro.tsx`).
- `SeatSummaryPanel` (ya en `gastro.tsx`).
- `ProductSearchModal` (selector producto con buscador, ya en `gastro.tsx`).

**Acciones en líneas:**
- Click línea → editar quantity / eliminar (PATCH `/api/v1/orders/:id/items`).
- Drag-drop entre asientos (opcional v2) → actualiza `seatNumber`.
- Botón "+ Agregar línea" → abre `ProductSearchModal` → PATCH items con `seatNumber = selectedSeat`.

**Botones footer:**
- **Enviar a cocina** → `POST /api/v1/orders/:id/send-to-kitchen`
- **Marcar listo** → `POST /api/v1/orders/:id/ready`
- **Cerrar** → dropdown 3 modos (Efectivo, Tarjeta, Mixto) → `POST /api/v1/orders/:id/close`
- **Dividir por asiento** → `POST /api/v1/bill-splits` (method `BY_SEAT`, `guestAssignments`)

---

### 2. Routing y Navegación

**Archivo:** `frontend/src/App.tsx`
- Nueva route: `/admin/gastro/pos/:tableId` → `GastroPosPage` (lazy load).

**Archivo:** `frontend/src/pages/admin/gastro.tsx`
- Click en card de orden → `navigate('/admin/gastro/pos/' + tableId)` (reemplaza modal).
- Mantener modal solo para vista rápida desde dashboard si se desea (opcional).

**Archivo:** `frontend/src/components/Sidebar.tsx`
- Verificar que `/admin/gastro` y `/admin/gastro/mozos` sigan funcionando.

---

### 3. Mapa Visual de Mesas (Opcional en esta versión, preparar datos)

**Endpoint backend:** `GET /api/v1/guest/tables/:id/guests` → ya existe, retorna `table_guests` con `seatNumber`.

**Frontend:** Componente `TableMap` en `gastro-pos.tsx` header o vista separada `/admin/gastro/tables-map`:
- Grid de mesas (desde `restaurant_tables`).
- Badge por asiento: ocupado/libre, nombre comensal.
- Click mesa → navega a `/admin/gastro/pos/:tableId`.

**Nota:** Implementación visual completa puede ser 1.38.15; 1.38.14 prepara datos y navegación.

---

### 4. CRUD Comensales (`table_guests`)

**Backend:** `backend/src/guest/guest-tables.controller.ts` + service
- `POST /api/v1/guest/tables/:tableId/guests` — crear comensal (name, seatNumber)
- `PATCH /api/v1/guest/tables/:tableId/guests/:guestId` — actualizar nombre/asiento
- `DELETE /api/v1/guest/tables/:tableId/guests/:guestId` — eliminar comensal
- Validación: `seatNumber` único por mesa, rango 1–`maxSeats` (de `restaurant_tables.max_seats`).

**Frontend:** En `gastro-pos.tsx`, botón "Gestionar comensales" → modal con lista + formulario inline.

**Dato crítico:** Producción actual tiene **0 `table_guests`**. Este CRUD permite poblarlos para test real de split-by-seat.

---

### 5. Catálogo por Categorías (Reutilizar `CategoryAccordion`)

**Archivo origen:** `frontend/src/pages/omni-catalog.tsx` → componente `CategoryAccordion`.

**Adaptación para POS:**
- Props: `onProductSelect: (product) => void` (en lugar de navegar a detalle).
- Filtro: solo productos `isActive=true` y `availableInPos=true` (nuevo campo en `Product` o usar `category.posVisible`).
- Buscador global arriba del acordeón.
- Touch-friendly: items grandes, imágenes thumb.

---

### 6. WebSocket / Tiempo Real (Preparar)

- `gastro-pos.tsx` suscribirse a `order:{id}:items` y `table:{id}:guests` para reflejar cambios de otros mozos/cocina sin refresh.
- Usar `useOrderItems` hook existente + nuevo `useTableGuests`.

---

## Testing E2E (Obligatorio)

**Archivo:** `frontend/e2e/omnigastro.spec.ts` — agregar tests:

1. **Login mozo PIN** → `/admin/gastro/mozos`
2. **Click orden** → navega a `/admin/gastro/pos/:tableId`
3. **Catálogo visible** → categorías expansibles, buscador filtra
4. **Agregar línea** → seleccionar producto → asignar asiento 1 → línea aparece en panel asiento 1
5. **Editar quantity** → PATCH items → total actualiza
6. **Mover línea entre asientos** → cambiar dropdown seat → PATCH items con nuevo `seatNumber`
7. **Crear comensal** → modal "Gestionar comensales" → POST guests → asiento aparece en selector
8. **Enviar a cocina** → POST send-to-kitchen → estado ORDER_SENT
9. **Marcar listo** → POST ready → estado READY
10. **Split-by-seat** → click "Dividir por asiento" → POST bill-splits BY_SEAT → verificar respuesta
11. **Cerrar con pago mixto** → POST close → estado CLOSED
12. **Validar import provecchio** → `GET /api/v1/product-imports/suppliers` y `jobs` (ya en suite)

---

## Archivos a Modificar / Crear

| Archivo | Tipo | Cambio |
|---------|------|--------|
| `frontend/src/pages/admin/gastro-pos.tsx` | **NUEVO** | Vista POS full-screen |
| `frontend/src/App.tsx` | Modificar | Route `/admin/gastro/pos/:tableId` |
| `frontend/src/pages/admin/gastro.tsx` | Modificar | Click orden → navigate a POS view |
| `frontend/src/pages/omni-catalog.tsx` | Refactor | Extraer `CategoryAccordion` a componente compartido |
| `frontend/src/components/admin/CategoryAccordion.tsx` | **NUEVO** | Componente reutilizable (extraído) |
| `backend/src/guest/guest-tables.controller.ts` | Modificar | CRUD `table_guests` endpoints |
| `backend/src/guest/guest-tables.service.ts` | Modificar | Lógica CRUD guests |
| `backend/prisma/schema.prisma` | Verificar | `TableGuest` model tiene `seatNumber @unique @@unique([tableId, seatNumber])` |
| `frontend/e2e/omnigastro.spec.ts` | Modificar | Tests E2E nuevos (12 casos) |
| `docs/plans/omnigastro/featurelist.json` | Actualizar | Nueva feature `POS_FULLSCREEN` |
| `VERSION`, `backend/package.json`, `frontend/package.json`, `mobile/package.json`, `featurelist.json` | Bump | **1.38.13 → 1.38.14 (minor)** |
| `CHANGELOG.md` | Actualizar | Entrada 1.38.14 |
| `ROADMAP.md` | Actualizar | Marcar 1.38.14 completado |

---

## Version Bump

**Tipo:** `minor` (nueva superficie de API: CRUD guests, nueva vista POS, routing nuevo).

| Archivo | Versión Actual | Nueva Versión |
|---------|----------------|---------------|
| `VERSION` | 1.38.13 | 1.38.14 |
| `backend/package.json` | 1.38.13 | 1.38.14 |
| `frontend/package.json` | 1.38.13 | 1.38.14 |
| `mobile/package.json` | 1.38.13 | 1.38.14 |
| `featurelist.json` | 1.38.13 | 1.38.14 |

---

## Deploy Checklist

1. **Commit** en branch `feat/omnigastro-pos-fullscreen-1.38.14`
2. **Push** a `origin/main`
3. **Validación local:** `./scripts/deploy-local.sh --skip-tests --skip-e2e` (build + health)
4. **E2E completo:** `npx playwright test frontend/e2e/omnigastro.spec.ts` (12 tests pass)
5. **Backup prod:** `./scripts/backup-production.sh provecchio`
6. **Restore local:** Importar backup a `provecchio.local`
7. **Verificar datos:** `table_guests` creados via API → test split-by-seat real
8. **Deploy producción:** `./scripts/deploy-production.sh provecchio` **(requiere autorización explícita)**
9. **Post-deploy:** Health check, smoke tests, verificar versión 1.38.14 en Swagger `/api/docs`

---

## Dependencias y Riesgos

| Riesgo | Mitigación |
|--------|------------|
| `CategoryAccordion` acoplado a `omni-catalog.tsx` | Extraer a componente standalone sin dependencias de página |
| `table_guests` vacío en prod | CRUD guests en 1.38.14 permite poblar antes de test split |
| WebSocket tiempo real | Preparar hooks; implementación completa en 1.38.15 |
| Mapa visual mesas | Solo preparar navegación y datos; UI completa en 1.38.15 |
| Conflicto rutas `/admin/gastro` vs `/admin/gastro/mozos` | Verificar `App.tsx` orden de routes (más específico primero) |

---

## Aprobación

¿Aprobado para iniciar implementación en branch `feat/omnigastro-pos-fullscreen-1.38.14`?