# Informe de Análisis Estructural — OmniFlow Schema vs OmniGastro Flow

**Fecha:** 2026-09-29  
**Versión:** 1.37.0  
**Entorno:** Provecchio (dimoraserver1)  
**Propósito:** Cruzar el schema Prisma con el flujo mermaid de OmniGastro para validar la estructura de datos y diagnosticar el fallback 404 en `POST /api/v1/guest/orders`.

---

## 1. Modelos Prisma — Campos Críticos

| Modelo | Campos Críticos | Relaciones |
|--------|----------------|------------|
| **`RestaurantTable`** | `id`, `tableNumber` (ej: "Mesa 1"), `token` (único, para QR), `tenantId`, `active`, `isDeleted`, `status` | `→ Tenant` (1:N), `→ Order[]`, `→ TableGuest[]`, `→ WaiterCall[]` |
| **`Order`** | `id`, `status` (`DRAFT` → `CONFIRMED` → `PREPARING`/`SERVED`/`CLOSED`), `totalAmount`, `currency` (`PYG`), `exchangeRate`, `tableId` → `RestaurantTable`, `orderLines`, `metadata` (guestDraft con `qrToken`, `serviceMode`, `t0_order_created`, etc.), `tenantId` | `→ RestaurantTable` (N:1 vía `tableId`), `→ OrderLine[]`, `→ TableGuest[]`, `→ WaiterCall[]` |
| **`OrderLine`** | `id`, `productId`, `quantity`, `priceAtSale`, `subtotal`, `metadata.snapshotName`, `costPrice`, `profitMargin` | `→ Product` (N:1 vía `productId`), `→ Order` (N:1) |
| **`Product`** | `id`, `name`, `price` (en PYG), `tenantId`, `isPosBomProduct`, `showInKDS`, `kdsVisibilityMode` | `→ OrderLine[]`, `→ ProductVariant[]`, `→ ModifierGroup[]` |
| **`Tenant`** | `id`, `isolationTier` (`shared`/`dedicated`), `dedicatedDatabaseUrl`, `isSuperAdmin` | `→ RestaurantTable[]` (1:N), `→ users` (N:N vía `UserTenantAccess`) |
| **`User`** | `id`, `email`, `pinCode`, `isSuperAdmin`, `isActive` | `→ UserTenantAccess`, `→ Order[]` (vendedor), `→ TableGuest[]` |

---

## 2. Flujo Mermaid vs Estructura de Datos

```mermaid
flowchart TD
    %% Cliente
    CLIENT_QR([Cliente QR]) -->|POST /api/v1/guest/orders| ORDERS_CREATE([Controller: GuestOrdersController.createDraft])
    
    ORDERS_CREATE -->|1️⃣ prisma.restaurantTable.findFirst({ where: { token: qrToken, tenantId } })| TABLE_CHECK([¿Tabla QR existe en BD?])
    TABLE_CHECK -- NO -->|404 "Mesa no encontrada o QR inválido"| END_FAIL
    TABLE_CHECK -- SÍ -->|Obtiene `table.id` y `table.tableNumber`| ORDER_CREATE([Crear ORDER en DB])
    
    ORDER_CREATE -->|order.status = 'DRAFT'| ORDER_DRAFT((ORDER DRAFT en BD))
    ORDER_CREATE -->|order.tableId = <RestaurantTable.id>| FK_MESA
    ORDER_CREATE -->|totalAmount = suma(price×qty)| TOTAL_PYG
    ORDER_CREATE -->|currency = 'PYG', exchangeRate = 1| CURRENCY_CFG
    ORDER_CREATE -->|metadata.guestDraft = {qrToken, tableId, tableName, serviceMode, t0_order_created}| META_GUEST
    ORDER_CREATE -->|orderLines = create: [{productId, qty, priceAtSale, ...}]| LINEAS_PEDIDO
    
    LINEAS_PEDIDO -->|productId debe existir en Product (validado por tenantId)| VALIDAR_PRODUCTOS
    
    %% Caja
    CAJA_CONFIRM([Caja]) -->|PATCH /api/v1/orders/:id/confirm| ORDERS_CONFIRM([Controller: OrdersController/confirm])
    ORDERS_CONFIRM -->|order.status = 'CONFIRMED'| STATUS_CONFIRMED
    ORDERS_CONFIRM -->|Descuento atómico stock: products.stockAvailable -= qty| DECREMENT_STOCK
    ORDERS_CONFIRM -->|WebSocket kds:ticket_new (si toggle KDS)| WS_KDS
    
    %% Mozo
    MOZO_KDS([Mozo]) -->|POST /api/v1/orders/:id/send-to-kitchen| ORDERS_KDS([Controller: OrdersController/send-to-kitchen])
    ORDERS_KDS -->|order.status = 'PREPARING'| STATUS_PREPARING
    ORDERS_KDS -->|Crear KitchenTicket en kitchen_tickets| CREATE_TICKET
    ORDERS_KDS -->|WebSocket kds:ticket_new a tenant:{tenantId}| WS_EMIT_KDS
    WS_EMIT_KDS -->|Payload: {reference, station, items, timestamps}| KDS_PANTALLA
    
    %% KDS
    KDS_CONSULTA([KDS]) -->|GET /api/v1/orders/kds/tickets| CONSULTAR_KDS
    CONSULTAR_KDS -->|Tickets status PREPARING, SLA GREEN/AMBER/RED| KDS_LISTA
    
    %% Caja close
    CAJA_CLOSE([Caja]) -->|POST /api/v1/pos/sessions/close| POS_CLOSE([Controller: PosSessionsController/close])
    POS_CLOSE -->|session.status = 'CLOSED'| STATUS_CLOSED
    POS_CLOSE -->|Arqueo Z: cashRealBalance, varianza, cash_movements| ARQUEO_Z
    POS_CLOSE -->|Evento pos.session_closed para Odoo sync| SYNC_ODOO
```

---

## 3. Cruce de Datos Crítico

| Paso Flujo | Dato en Schema | Origen / Validez |
|------------|----------------|------------------|
| **QR → Mesa** | `RestaurantTable.token` debe coincidir exacto con fila en BD | El QR `qr_dimora_mesa1_2026_09_04_a1b2c3d4` es **string**, pero el modelo tiene `@default(uuid())`. Si no hay fila → 404. |
| **Order → Mesa** | `Order.tableId` → `RestaurantTable.id` | Al crear, se asigna `tableId: table.id` desde el RestaurantTable encontrado. |
| **OrderLine → Product** | `OrderLine.productId` → `Product.id` (con `tenantId` filter) | Cada línea debe tener un `productId` que exista y pertenezca al mismo tenant. |
| **Stock decrement** | `products.stockAvailable` -= `OrderLine.quantity` | Ocurre en `PATCH /orders/:id/confirm` (confirmar pago). |
| **KDS Ticket** | `KitchenTicket` tiene `orderId`, `status`, `sla`, `courseHistory`, `preparationStation` | Se crea en `POST /orders/:id/send-to-kitchen`. |
| **PosSession** | `PosSession` tiene `cashOpeningBalance`, `cashRealBalance`, `variance` | Se crea/ckierra en `POST /pos/sessions/open` y `POST /pos/sessions/close`. |

---

## 4. Hallazgo: Por qué el QR falla 404 hoy

**Contexto:** En la prueba original (sep/2026), la fila `RestaurantTable` existía en BD con el token `qr_dimora_mesa1_2026_09_04_a1b2c3d4`.

**Problema actual (29/09 tras reiniciar stack):** Al ejecutar `docker compose up -d`, las tablas de datos temporales/seed se perdieron. El QR **sigue definido en** `tenant.config.gastro.qrTokens` (configuración JSON del tenant), pero **no hay fila correspondiente en `restaurant_table` de la BD**.

**Evidencia:**  
- `tenant.config.gastro.qrTokens` tiene: `[{ table: "Mesa 1", token: "qr_dimora_mesa1_2026_09_04_a1b2c3d4", active: true }, ...]`  
- `prisma.restaurantTable.findFirst({ where: { token: "qr_dimora_mesa1_2026_09_04_a1b2c3d4", tenantId: "provecchio-dimora-001" } })` → **no encuentra fila** → lanza `NotFoundException`.

**Solución:** Insertar la fila `RestaurantTable` en la BD con el token y tableNumber correspondientes.

---

## 5. Próximos Pasos para Validar Flujo OmniGastro

1. **Insertar `RestaurantTable`** en BD:  
   ```sql
   INSERT INTO restaurant_table (id, tenantId, tableNumber, token, active, isDeleted)
   VALUES ('<uuid>', 'provecchio-dimora-001', 'Mesa 1', 'qr_dimora_mesa1_2026_09_04_a1b2c3d4', true, false);
   ```
   *(O equivalent mediante `prisma restaurant-table create` desde el container).*

2. **Volver a intentar** `POST /api/v1/guest/orders` con el QR → debería retornar `201` con `orderId`, `status: DRAFT`, `totalAmount: 58000`, `tableName: Mesa 1`.

3. **Continuar el flujo:**  
   - `PATCH /api/v1/orders/:id/confirm` → `CONFIRMED` + descuento de stock.  
   - `POST /api/v1/orders/:id/send-to-kitchen` → `PREPARING` + WebSocket `kds:ticket_new`.  
   - `POST /api/v1/pos/sessions/close` → `CLOSED` +arqueo Z.

4. **Ejecutar `init.sh`** para validar suite completa (unit + E2E) y forzar rebuild de imágenes Docker.

---

## 6. Referencias

- `docs/00-contexto-agentes.md` — Contexto vivo del proyecto (regla `tenantId` sagrado).  
- `docs/tests/OMNIGASTRO_E2E_TEST.md` — Flujo E2E original y endpoints.  
- `docs/tests/OMNIGASTRO_E2E_RESULT.md` — Resultados de la prueba setiembre 2026.  
- `backend/prisma/schema.prisma` — Modelo `RestaurantTable` y `Order`.  
- `backend/src/guest/guest-orders.controller.ts` — Lógica `createDraft` y búsqueda por `token`.  
- `featurelist.json` — Versión `1.37.0`, última actualización `2026-09-28`.  

---
*Informe generado automáticamente por Kilo — análisis estructural cruzado schema Prisma ↔ flujo mermaid OmniGastro.*