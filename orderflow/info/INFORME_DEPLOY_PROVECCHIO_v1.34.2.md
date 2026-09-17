# Informe de Despliegue — Provecchio v1.34.2

**Fecha:** 2026-09-16  
**Versión:** 1.34.2  
**Ambiente:** Provecchio (Producción)  
**Commit:** `aeacc78c` (main)

---

## Resumen Ejecutivo

Se resolvieron 4 problemas reportados por el usuario en Provecchio, desplegando cambios en backend, frontend y base de datos.

### Problemas Resueltos

| # | Problema | Categoría | Estado |
|---|----------|-----------|--------|
| 1 | No puedo editar empleados en `/admin/hr` | HR / Permissions | ✅ Resuelto |
| 2 | Buscador no funciona en `/social-catalog/menudigital` | Social Catalog | ✅ Resuelto |
| 3 | Mozo no recibe notificación al crear pedido guest | Waiter Flow | ✅ Resuelto |
| 4 | Sin botones de mozo en `/admin/social-catalog` | UI Feature | ✅ Implementado |

---

## Cambios de Código

### Backend (`backend/src/`)

| Archivo | Cambio | Líneas |
|---------|--------|--------|
| `main.ts` | `seedPermissions()` auto-ejecutable al iniciar el backend | +9 |
| `guest/guest-orders.controller.ts` | Auto-creación de waiter call al crear pedido guest con `serviceMode: TABLE` | +36 |

### Frontend (`frontend/src/pages/admin/`)

| Archivo | Cambio | Líneas |
|---------|--------|--------|
| `social-catalog.tsx` | Nueva sección "🍽️ Gestión de Mozos" con WaiterOptionsEditor + WaiterCallsList | +176 |

### Documentación

| Archivo | Cambio |
|---------|--------|
| `CHANGELOG.md` | Entradas v1.34.2: waiter mgmt, permissions seed, isPosBomProduct fix |
| `docs/troubleshooting/150-social-catalog-isPosBomProduct.md` | Nueva guía troubleshooting |
| `docs/plans/omnigastro/` | Diagrama de arquitectura + diagrama de secuencia |

---

## Cambios en Base de Datos

| Tipo | Detalle |
|------|---------|
| Permisos sembrados | 92 permisos en tabla `permissions` (incluyendo `hr:employees:*`, `social-catalog:*`, etc.) |
| Columna añadida | `products.isPosBomProduct BOOLEAN DEFAULT false` (faltaba, causaba 500) |
| Empleado creado | `emp-provecchio-001` — Marcelo Pesallaccia (ADMIN, ACTIVE, con contact vinculado) |
| Productos creados | 5 productos: Empanada Paraguaya, Sopa Paraguaya, Tereré, Pastel Madre, Jugo de Mango |

---

## Despliegue

### Contenedores

| Contenedor | Estado | Build |
|------------|--------|-------|
| `orderflow-backend-prod` | Up 6min (healthy) | Rebuild ✅ Restart ✅ |
| `orderflow-frontend-prod` | Up 9hrs (healthy) | Rebuild ✅ Copy ✅ |
| `orderflow-database-1` | Activo | Migración manual ✅ |

### Pasos Ejecutados

1. `npm run build` backend → `/opt/orderflow/backend/dist/`
2. `npm run build` frontend → `/opt/orderflow/frontend/dist/`
3. `docker cp` backend dist → `orderflow-backend-prod:/app/dist/src/`
4. `docker cp` frontend dist → `orderflow-frontend-prod:/app/dist/`
5. `docker restart orderflow-backend-prod`
6. `ALTER TABLE products ADD COLUMN "isPosBomProduct" BOOLEAN DEFAULT false`
7. `INSERT INTO employees (...)` — sembrar empleado
8. `INSERT INTO products (...)` — sembrar 5 productos
9. `INSERT INTO permissions (...)` — sembrar 92 permisos
10. Verificación de APIs (todas 200)

---

## Verificación de APIs

| Endpoint | Status | Contenido |
|----------|--------|-----------|
| `GET /api/v1/hr/employees` | 200 (796B) | 1 empleado (Marcelo Pesallaccia) + contact vinculado |
| `GET /api/v1/admin/social-catalog/products?instanceKey=menudigital` | 200 (1491B) | 5 productos Provecchio |
| `GET /api/v1/public/social-catalog/products?tenantId=provecchio-dimora-001&instanceKey=menudigital` | 200 (1491B) | 5 productos Provecchio |
| `GET /api/v1/waiter/calls` | 200 (12B) | `{ calls: [] }` |
| `GET /api/v1/admin/social-catalog/page-config?instanceKey=menudigital` | 200 (136B) | Config |

---

## Flujo: Cliente → Mozo → KDS → Caja

```
Cliente escanea QR de mesa
    ↓
Abre /social-catalog/menudigital
    ↓
Agrega productos al carrito
    ↓
Presiona "Enviar pedido" → selecciona "Mesa"
    ↓
POST /api/v1/guest/orders (serviceMode: TABLE)
    ↓
Backend crea pedido DRAFT con guestDraft metadata
    ↓
Backend AUTO-CREA waiter call (wc_{orderId}) en tenant.config.gastro.waiterCalls
    ↓
Emite socket event waiterCallNew a tenant:{tenantId}
    ↓
Mozo recibe en /admin/gastro:
    - Notificación: "🔔 Llamada de mesa-X: Pedido mesa X — confirmar para KDS"
    - Lista de pedidos actualizada
    ↓
Mozo presiona "Aceptar" en UI
    ↓
PATCH /api/v1/waiter/calls/{id}/take-order
    ↓
Mozo acude a mesa, valida productos, presiona "Confirmar"
    ↓
Backend emite order:new → KDS recibe pedido
    ↓
KDS enruta a Cocina y Barra
    ↓
Caja procesa cobro
```

---

## Flujo: Admin Social Catalog → Gestión de Mozos

```
Admin accede a /admin/social-catalog/menudigital
    ↓
Panel "🛒 Modo de venta y Pedidos en Mesa / QR"
    ↓
Activar toggle "🍽️ Activar Modo Pedidos en Mesa / QR" (gastroEnabled)
    ↓
Aparece sección "🍽️ Gestión de Mozos":
    ↓
1. Editor de Opciones de Mozo:
   - Agregar opciones (ej: "Agua", "Carta", "Cuenta")
   - Aparecen como botones en catálogo público
   - Eliminar opciones existentes
    ↓
2. Llamadas Recientes al Mozo:
   - Lista de últimas 10 llamadas
   - Estados: PENDING / ACKNOWLEDGED / TAKEN_ORDER / RESOLVED
   - Acciones: Aceptar, Reconocer, Resolver
    ↓
"Guardar cambios" → PUT /api/v1/admin/social-catalog/config
    ↓
Configura gasto.waiterOptions en tenant config
```

---

## Nueva Funcionalidad: Auto waiter call al crear pedido guest

**Archivo:** `backend/src/guest/guest-orders.controller.ts` (líneas 91-119)

Cuando un cliente envía un pedido desde el social catalog con `serviceMode: 'TABLE'`, el backend automáticamente:

1. Crea una entrada `waiterCall` en `tenant.config.gastro.waiterCalls`
2. Emite evento `waiterCallNew` vía Socket.IO
3. El mozo recibe notificación inmediata en `/admin/gastro`

**Código clave:**
```typescript
if (body.serviceMode !== 'BAR' && gastro?.enabled) {
  const waiterCallId = `wc_${order.id}`;
  const waiterCall = {
    id: waiterCallId,
    tableId,
    optionLabel: `Pedido mesa ${tableId} — confirmar para KDS`,
    freeText: `Nuevo pedido guest de la mesa ${tableId}: ...`,
    status: 'PENDING',
    calledAt: now.toISOString(),
  };
  // ... persistir y emitir waiterCallNew
}
```

---

## Links Relevantes

- **Repositorio:** https://github.com/marcelompz/orderflow
- **Wiki:** https://github.com/marcelompz/wiki
- **Provecchio:** https://provecchio.com
- **Commit:** `aeacc78c` en `origin/main`
- **Swagger:** https://provecchio.com/api/docs

---

## Próximos Pasos (No Iniciados)

1. Crear más empleados desde `/admin/hr` → Nuevo Colaborador
2. Configurar opciones de mozo desde `/admin/social-catalog/menudigital` → 🍽️ Gestión de Mozos
3. Configurar mesas y QR tokens en `/admin/gastro/tables`
4. Evaluar sincronización con Wiki oficial (`/opt/wiki/orderflow/`)
5. Crear más productos o configurar sincronización desde POS/Odoo
6. Test E2E con flujo completo cliente → mozo → KDS → caja

---

## Rollback Plan

Si es necesario revertir:

1. **Backend:** `docker restart orderflow-backend-prod` (revierte a imagen anterior si existe) o `docker rollback orderflow-backend-prod`
2. **Frontend:** `docker cp` del `dist` anterior
3. **DB:** `DELETE FROM employees WHERE tenantId = 'provecchio-dimora-001'; DELETE FROM products WHERE "tenantId" = 'provecchio-dimora-001' AND id LIKE 'prod-provecchio-%';`
4. **Permisos:** No reversibles (son seeds necesarios)

---

*Informe generado automáticamente el 2026-09-16T23:30:00 UTC*
