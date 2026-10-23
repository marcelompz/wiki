# Troubleshooting: POS No Abre al Seleccionar Mesa — "Cargar Pedido" No Crea Nuevo Pedido

**Fecha:** 2026-10-18  
**Entorno:** Local (provecchio.local) / v1.39.7  
**Severidad:** Alta — Flujo OmniGastro roto

---

## Síntoma

En `/admin/gastro`:
1. Mozo selecciona mesa G7
2. Clic en botón "Cargar Pedido" → modal se abre
3. Selecciona mesa G7 en dropdown
4. Clic en "Cargar Pedidos" → lista vacía (no hay pedidos existentes)
5. **No hay botón para crear nuevo pedido** — usuario queda atascado
6. Al navegar manualmente a `/admin/gastro/pos/{tableId}` → error 404 en `/api/v1/guest/orders/:id`

---

## Causa Raíz (Múltiple)

### 1. Frontend: Falta opción "Crear nuevo pedido" en modal
Archivo: `/opt/orderflow/frontend/src/pages/admin/gastro.tsx`  
El modal "Cargar Pedido" solo mostraba pedidos existentes (`orderList.length > 0`). Si no había pedidos, no mostraba nada.

### 2. Backend: `tableId` no se guardaba al crear orden POS
Archivo: `/opt/orderflow/backend/src/orders/orders.service.ts` línea ~140  
El método `create()` no incluía `tableId` en `tx.order.create()`.

### 3. Backend: Endpoint `PATCH /api/v1/orders/:id/items` solo para guest orders
Archivo: `/opt/orderflow/backend/src/orders/orders.controller.ts` línea 194  
Usaba `guestUpdateItems()` que falla para órdenes regulares (requiere `metadata.guestDraft`).

### 4. Frontend: POS page solo usaba endpoint guest orders
Archivo: `/opt/orderflow/frontend/src/pages/admin/gastro-pos.tsx` línea 126  
Hardcodeado a `/api/v1/guest/orders/:id` — falla para órdenes POS regulares.

---

## Solución

### Fix 1: Frontend — Agregar botón "Crear Nuevo Pedido" en modal (`gastro.tsx`)

```tsx
{orderList.length > 0 ? (
  // ... lista de pedidos existentes con botón "Gestionar Pedido"
) : selectedTableForOrder ? (
  <div style={{ marginTop: 16, textAlign: 'center', padding: '24px', background: token.colorFillAlter, borderRadius: 12, border: `1px dashed ${token.colorBorder}` }}>
    <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>No hay pedidos activos para 🪑 <strong>{selectedTableForOrder.tableNumber || selectedTableForOrder.name}</strong></Text>
    <Button
      type="primary"
      size="large"
      block
      icon={<PlusOutlined />}
      onClick={async () => {
        try {
          setLoadingOrders(true);
          const res = await api.post('/api/v1/orders', {
            tableId: selectedTableForOrder.id,
            channel: 'pos',
            lines: [],
            metadata: { source: 'gastro-pos-created' }
          });
          navigate(`/admin/gastro/pos/${selectedTableForOrder.id}`);
        } catch (e: any) {
          message.error(e?.response?.data?.message || 'Error al crear pedido');
        } finally {
          setLoadingOrders(false);
        }
      }}
    >
      Crear Nuevo Pedido para esta Mesa
    </Button>
  </div>
) : (
  <Text type="secondary" style={{ textAlign: 'center', display: 'block', marginTop: 16 }}>Seleccioná una mesa para ver/crear pedidos</Text>
)}
```

### Fix 2: Backend — Guardar `tableId` al crear orden (`orders.service.ts`)

```typescript
// En tx.order.create() data:
tableId: createOrderDto.tableId,
```

### Fix 3: Backend — Nuevo método `updateItems()` para órdenes regulares (`orders.service.ts`)

```typescript
async updateItems(tenantId: string, orderId: string, lines: any[], dbClient?: any) {
  const prisma = dbClient || this.prisma;
  const order = await this.findOne(tenantId, orderId, prisma);

  if (order.metadata && (order.metadata as any).guestDraft) {
    return this.guestUpdateItems(tenantId, orderId, lines, prisma);
  }
  // ... lógica para órdenes regulares (POS)
}
```

### Fix 4: Backend — Controller usa nuevo método (`orders.controller.ts`)

```typescript
@Patch(':id/items')
async updateItems(...) {
  return this.ordersService.updateItems(tenant.id, id, body.lines, db);
}
```

### Fix 5: Frontend — POS page fallback a endpoint regular (`gastro-pos.tsx`)

```typescript
if (activeOrder) {
  let detailRes;
  try {
    detailRes = await api.get(`/api/v1/guest/orders/${activeOrder.id}`);
  } catch {
    detailRes = await api.get(`/api/v1/orders/${activeOrder.id}`);
  }
  const det = detailRes.data;
  const linesData = det.lines || det.orderLines || [];
  setLines(linesData.map(...));
}
```

---

## Verificación

```bash
# 1. Crear orden para mesa G7
curl -X POST https://provecchio.local/api/v1/orders \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"tableId":"ef9156dd-d0b0-4a6d-92f2-5d45c977e439","channel":"pos","lines":[],"metadata":{"source":"gastro-pos-created"}}'
# → {"id":"...","tableId":"ef9156dd-d0b0-4a6d-92f2-5d45c977e439",...}

# 2. Listar órdenes de la mesa
curl "https://provecchio.local/api/v1/orders?tableId=ef9156dd-d0b0-4a6d-92f2-5d45c977e439&status=DRAFT,CONFIRMED,PREPARING,READY"
# → [orden con tableId correcto]

# 3. Detalle de orden (endpoint regular)
curl "https://provecchio.local/api/v1/orders/8c579663-86c3-44d9-9c07-6d1ba2c76a14"
# → {orderLines: [...], tableId: "..."}

# 4. Actualizar líneas (endpoint unificado)
curl -X PATCH "https://provecchio.local/api/v1/orders/8c579663-86c3-44d9-9c07-6d1ba2c76a14/items" \
  -d '{"lines":[{"productId":"636fb021-a8a5-4e6e-a976-51356216f6ac","quantity":2,"unitPrice":12000,"seatNumber":1}]}'
# → {ok: true, lines: [...], totalAmount: 24000}
```

---

## Flujo Completo Funcional

1. **Gastro page** → Clic "Cargar Pedido" → Selecciona mesa G7 → Clic "Cargar Pedidos"
2. **Modal** → Muestra "Crear Nuevo Pedido para esta Mesa" → Clic
3. **Backend** → POST `/api/v1/orders` con `tableId` → Orden DRAFT creada
4. **Frontend** → `navigate('/admin/gastro/pos/{tableId}')`
5. **POS page** → Carga mesa, busca orden activa, obtiene detalle (fallback a `/api/v1/orders/:id`)
6. **POS page** → Muestra líneas, permite agregar productos (PATCH `/api/v1/orders/:id/items`)
7. **Mozo** → Agrega productos → Envía a cocina → Cierra cuenta

---

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `frontend/src/pages/admin/gastro.tsx` | Botón "Crear Nuevo Pedido" en modal |
| `backend/src/orders/orders.service.ts` | `tableId` en create + nuevo `updateItems()` |
| `backend/src/orders/orders.controller.ts` | `updateItems` usa servicio unificado |
| `frontend/src/pages/admin/gastro-pos.tsx` | Fallback a `/api/v1/orders/:id` |

---

## Próximos Pasos

- Aplicar en producción (v1.39.8)
- Verificar que `/opt/traefik-orderflow/dynamic/services.yml` tiene rutas WebSocket para provecchio (ya verificado — #176)
- Ejecutar `./scripts/init.sh` antes de deploy