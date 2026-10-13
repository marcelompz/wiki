# Guía: Flujo de Información POS Mozo → Odoo POS

## Resumen Ejecutivo

Cuando un mozo envía un pedido a cocina desde el POS de OrderFlow, la información viaja a través de un pipeline asíncrono hasta llegar al PDV de Odoo (módulo `pos_omniflow_sync`). Este documento describe el flujo completo paso a paso.

---

## Arquitectura General

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Frontend   │     │  Backend    │     │   Queue     │     │  Odoo Adapter    │     │   Odoo 14   │
│  (Mozo POS) │────▶│  (NestJS)   │────▶│  (BullMQ)   │────▶│  (FastAPI)       │────▶│  (pos_omniflow│
└─────────────┘     └─────────────┘     └─────────────┘     └──────────────────┘     │    _sync)     │
                                                                                     └─────────────┘
```

---

## Paso 1: Frontend - Acción del Mozo

**Archivo**: `frontend/src/pages/admin/gastro-tables.tsx:351`

```typescript
// El mozo pulsa "Enviar a cocina" → valida PIN → llama al endpoint
await api.post(`/api/v1/orders/${pinAction.orderId}/send-to-kitchen`);
```

**Endpoint llamado**: `POST /api/v1/orders/:orderId/send-to-kitchen`

---

## Paso 2: Backend - orders.service.ts `sendToKitchen()`

**Archivo**: `backend/src/orders/orders.service.ts:832-968`

### Lo que hace este método:

1. **Busca el pedido** con sus líneas y productos (incluye `odooProductId` si existe)
2. **Filtra líneas visibles en KDS** (`showInKDS !== false`, `kdsVisibilityMode !== 'NONE'`)
3. **Rutea por estación** según categoría del producto (`preparationStation`)
4. **Explosión BoM** (opcional): descuenta ingredientes del Kardex si `isPosBomProduct=true`
5. **Escándallo Live**: snapshot de costos y materiales
6. **Actualiza estado a `PREPARING`** y registra hitos de telemetría:
   - `t2_order_confirmed`
   - `t3_sent_to_kds`
   - `t4_prep_started`
   - `inPreparationAt`
7. **Emite evento `odoo.table_order_sync`** (línea 963-968):

```typescript
this.eventEmitter.emit('odoo.table_order_sync', {
  tenantId,
  orderUuid: order.id,
  odooTableId: dto?.tableNumber,  // ⚠️ Aquí está el tableNumber, no el odooTableId real
  items: order.orderLines
});
```

> **Nota importante**: El `odooTableId` que se envía es el `tableNumber` (string) de OrderFlow. El listener intentará convertirlo a número, pero **requiere mapeo Mesa OrderFlow ↔ Odoo** configurado en variables de entorno.

---

## Paso 3: Listener - odoo-table-sync.listener.ts

**Archivo**: `backend/src/orders/odoo-table-sync.listener.ts:11-52`

```typescript
@OnEvent('odoo.table_order_sync')
async handleTableOrderSync(payload: {
  tenantId: string;
  orderUuid: string;
  odooTableId?: number;
  items?: any[];
  tableNumber?: string;
}) {
  // 1. Configuración Odoo desde env vars
  const odooConfigId = Number(process.env.ODOO_POS_CONFIG_ID || '1');
  const odooTableId = payload.odooTableId || Number(process.env.ODOO_TABLE_ID || '0');
  
  // 2. Validación: se requiere odooTableId real
  if (!odooTableId && payload.tableNumber) {
    this.logger.warn(`Falta odooTableId para tableNumber=${payload.tableNumber}; se requiere mapeo`);
    return;
  }

  // 3. Transforma items al formato Odoo
  const items = (payload.items || []).map((line) => ({
    odooProductId: line.product?.odooProductId || line.productId,
    quantity: Number(line.quantity || 1),
    unitPrice: Number(line.unitPrice || line.product?.price || 0),
    kitchenNotes: line.kitchenNotes || line.notes || '',
  }));

  // 4. Encola job en BullMQ
  await this.odooTableSyncProducer.enqueueTableSync({
    tenantId: payload.tenantId,
    orderUuid: payload.orderUuid,
    odooConfigId,
    odooTableId,
    items,
  });
}
```

**Variables de entorno requeridas**:
- `ODOO_POS_CONFIG_ID` (default: `1`) - ID de la configuración POS en Odoo
- `ODOO_TABLE_ID` (default: `0`) - Fallback si no viene en el payload

---

## Paso 4: Producer - odoo-table-sync.producer.ts

**Archivo**: `backend/src/queues/odoo-table-sync.producer.ts:12-33`

Encola el job en la cola `odoo-table-sync` con:
- Reintentos: 3 intentos con backoff exponencial (2s, 4s, 8s)
- Limpieza: mantiene 1000 completados, 5000 fallidos

---

## Paso 5: Processor - odoo-table-sync.processor.ts

**Archivo**: `backend/src/queues/odoo-table-sync.processor.ts:10-37`

```typescript
const payload = {
  tenant_id: data.tenantId,
  order_uuid: data.orderUuid,
  odoo_config_id: data.odooConfigId,
  odoo_table_id: data.odooTableId,
  items: data.items,
};

const response = await fetch(`${odooAdapterUrl}/api/omniflow/sync_table_order`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
```

**URL del adapter**: `process.env.ODOO_ADAPTER_URL || 'http://odoo_adapter:3005'`

---

## Paso 6: Odoo Adapter (FastAPI) - Endpoint `/api/omniflow/sync_table_order`

El adapter recibe el payload y llama al controlador Odoo vía XML-RPC.

### Payload que recibe:
```json
{
  "tenant_id": "tenant-uuid",
  "order_uuid": "order-uuid",
  "odoo_config_id": 1,
  "odoo_table_id": 5,
  "items": [
    {
      "odooProductId": 42,
      "quantity": 2,
      "unitPrice": 15.50,
      "kitchenNotes": "Sin cebolla"
    }
  ]
}
```

---

## Paso 7: Odoo Addon `pos_omniflow_sync` - Controlador

**Ubicación**: `/opt/odoo-addons/14.0/pos_omniflow_sync/controllers/main.py` (y 18.0 equivalente)

### Endpoint expuesto en Odoo:
```
POST /api/omniflow/sync_table_order
```

### Lógica del controlador (resumida):
1. Valida `odoo_config_id` existe y está activo (`pos.config`)
2. Busca/crea la sesión POS abierta para ese config
3. Busca la mesa por `odoo_table_id` en `restaurant.table`
4. Crea/actualiza `pos.order` con:
   - `table_id`: mesa encontrada
   - `config_id`: config POS
   - `session_id`: sesión activa
   - `lines`: líneas de pedido transformadas a formato Odoo
   - `partner_id`: opcional (cliente)
5. Retorna `{ "success": true, "pos_order_id": X, "pos_order_uid": "..." }`

---

## Mapeo Crítico: Mesa OrderFlow ↔ Odoo

### Problema identificado en el listener (línea 23-25):
```typescript
if (!odooTableId && tableNumber) {
  this.logger.warn(`Falta odooTableId para tableNumber=${tableNumber}; se requiere mapeo Mesa OrderFlow ↔ Odoo`);
  return;
}
```

### Soluciones:

| Enfoque | Descripción |
|---------|-------------|
| **Variable de entorno** | `ODOO_TABLE_ID` como fallback global (solo 1 mesa) |
| **Mapeo en BD** | Tabla `table_mappings` con `tenantId`, `orderflow_table_id`, `odoo_table_id` |
| **Campo en Mesa** | Agregar `odooTableId` al modelo `Table` de Prisma |

> **Recomendación**: Implementar campo `odooTableId` en modelo `Table` + migración + UI en admin para mapear mesas.

---

## Variables de Entorno Necesarias

### Backend (`.env.prod` / `.env.provecchio`):
```bash
# Odoo Adapter
ODOO_ADAPTER_URL=http://odoo_adapter:3005

# Odoo POS Config
ODOO_POS_CONFIG_ID=1

# Fallback mesa (solo si no hay mapeo por mesa)
ODOO_TABLE_ID=0
```

### Odoo Adapter (docker-compose):
```yaml
environment:
  - ODOO_URL=http://odoo:8069
  - ODOO_DB=provecchio
  - ODOO_USER=admin
  - ODOO_PASSWORD=*****
```

---

## Flujo de Datos Completo (Ejemplo)

### 1. Mozo crea pedido en mesa "5" (OrderFlow tableNumber="5")
```json
// Order creado en OrderFlow
{
  "id": "order-uuid-123",
  "tableNumber": "5",
  "orderLines": [
    { "productId": "prod-1", "quantity": 2, "unitPrice": 12.00, "product": { "odooProductId": 101 } },
    { "productId": "prod-2", "quantity": 1, "unitPrice": 8.50, "product": { "odooProductId": 102 } }
  ]
}
```

### 2. Mozo pulsa "Enviar a cocina" → `POST /orders/order-uuid-123/send-to-kitchen`

### 3. Backend emite evento:
```json
{
  "tenantId": "tenant-abc",
  "orderUuid": "order-uuid-123",
  "odooTableId": "5",  // string → se convierte a number
  "items": [...]
}
```

### 4. Listener transforma y encola:
```json
{
  "tenantId": "tenant-abc",
  "orderUuid": "order-uuid-123",
  "odooConfigId": 1,
  "odooTableId": 5,
  "items": [
    { "odooProductId": 101, "quantity": 2, "unitPrice": 12.00, "kitchenNotes": "" },
    { "odooProductId": 102, "quantity": 1, "unitPrice": 8.50, "kitchenNotes": "" }
  ]
}
```

### 5. Processor llama a Odoo Adapter:
```
POST http://odoo_adapter:3005/api/omniflow/sync_table_order
```

### 6. Odoo Adapter → Odoo (XML-RPC):
```python
# Crea pos.order en Odoo
pos_order = request.env['pos.order'].sudo().create({
    'table_id': 5,
    'config_id': 1,
    'session_id': active_session.id,
    'lines': [(0, 0, {
        'product_id': 101,
        'qty': 2,
        'price_unit': 12.00,
    }), (0, 0, {
        'product_id': 102,
        'qty': 1,
        'price_unit': 8.50,
    })],
})
```

### 7. Resultado en Odoo:
- Pedido visible en PDV (interfaz POS)
- Mesa "5" marcada como ocupada
- Líneas listas para cobro/impresión

---

## Troubleshooting Común

| Síntoma | Causa | Solución |
|---------|-------|----------|
| `Falta odooTableId` en logs | No hay mapeo mesa | Configurar `odooTableId` en mesa o `ODOO_TABLE_ID` |
| 500 en `/odoo/users/compare` | Credenciales Odoo inválidas | Actualizar password en `/admin/integrations` |
| Pedido no aparece en Odoo POS | Sin sesión POS abierta | Abrir sesión en Odoo POS (`pos.config`) |
| `odooProductId` null | Producto no sincronizado | Sincronizar catálogo (producto → Odoo) |
| Timeout en adapter | Odoo caído / red | Verificar `odoo_adapter` health + conectividad |

---

## Verificación End-to-End

### 1. Verificar cola BullMQ:
```bash
# En backend container
npx bullmq-cli odoo-table-sync:counts
```

### 2. Ver logs del processor:
```bash
docker logs orderflow-backend-prod | grep "OdooTableSyncProcessor"
```

### 3. Verificar en Odoo:
- Ir a **Punto de Venta → Pedidos** → buscar por `order_uuid` (campo personalizado) o mesa
- Verificar que `pos.order` tenga líneas correctas

### 4. Test manual vía API:
```bash
curl -X POST http://localhost:3010/api/v1/orders/ORDER_UUID/send-to-kitchen \
  -H "Authorization: Bearer JWT_TOKEN"
```

---

## Referencias de Código

| Componente | Archivo | Línea clave |
|------------|---------|-------------|
| Frontend trigger | `frontend/src/pages/admin/gastro-tables.tsx` | 351 |
| Backend sendToKitchen | `backend/src/orders/orders.service.ts` | 832, 963 |
| Event listener | `backend/src/orders/odoo-table-sync.listener.ts` | 11 |
| Queue producer | `backend/src/queues/odoo-table-sync.producer.ts` | 12 |
| Queue processor | `backend/src/queues/odoo-table-sync.processor.ts` | 23 |
| Odoo Adapter endpoint | `odoo-adapter/main.py` | `/api/omniflow/sync_table_order` |
| Odoo 14 addon | `odoo-addons/14.0/pos_omniflow_sync/controllers/main.py` | `sync_table_order` |
| Odoo 18 addon | `odoo-addons/18.0/pos_omniflow_sync/controllers/main.py` | `sync_table_order` |

---

## Checklist de Configuración para Provecchio

- [ ] Mesa en OrderFlow tiene `odooTableId` configurado (o migración + campo en modelo)
- [ ] `ODOO_POS_CONFIG_ID` coincide con `pos.config` activo en Odoo 14
- [ ] Sesión POS abierta en Odoo antes de enviar pedidos
- [ ] Productos tienen `odooProductId` sincronizado
- [ ] Credenciales Odoo válidas en integración `/admin/integrations`
- [ ] `odoo_adapter` container healthy y accesible desde backend
- [ ] Addon `pos_omniflow_sync` instalado en Odoo 14 (Apps → Actualizar lista → Instalar)

---

*Generado automáticamente — v1.38.16 — OmniGastro*