# OrderFlow v1.16.0 — Análisis de Desacoplamiento del Dominio de Pedidos

**Fecha:** 6 de agosto de 2026  
**Alcance:** Diagnóstico del acoplamiento actual de `Orders` y diseño de desacoplamiento pragmático (sin microservicios)

---

## 1. Estado actual: mapa de acoplamiento

### 1.1 Superficie pública (API)

El controller es limpio y estrecho:

| Método | Endpoint | Responsabilidad aparente |
|--------|----------|--------------------------|
| `POST /` | create | Crear pedido en DRAFT |
| `PATCH /:id/confirm` | confirm | Confirmar venta |
| `GET /` | findAll | Listar |
| `GET /:id` | findOne | Detalle |
| `PATCH /:id/cancel` | cancel | Cancelar |
| `PATCH /:id/status` | updateStatus | Cambiar estado (KDS) |

La API está bien delimitada. El problema no está en el borde HTTP, sino **dentro del servicio**.

### 1.2 Dependencias inyectadas en `OrdersService`

```ts
constructor(
  private prisma: PrismaService,           // acceso total al schema
  private httpService: HttpService,        // I/O HTTP externo
  private ordersGateway: OrdersGateway,    // WebSocket / KDS
  private loyaltyService: LoyaltyService,  // dominio Loyalty
  private facturasendService: FacturasendService, // dominio Fiscal
)
```

Además, el propio servicio lee y escribe tablas de otros dominios:

| Tabla / modelo tocado | Dominio real | Desde qué método |
|-----------------------|--------------|------------------|
| `Order`, `OrderLine` | Pedidos | todos |
| `Product.stockAvailable` | Inventario | `confirm` |
| `CashMovement` | Caja / POS | `confirm` |
| `Service`, `AppointmentAssignment` | Bookings | `create`, `sendWebhook` |
| `Integration` | Integraciones | `sendWebhook` |
| `WebhookLog` | Observabilidad / Integraciones | `sendWebhook` |
| `Loyalty*` (vía service) | Loyalty | `confirm` |
| `ElectronicDocument` (vía service) | Fiscal | `confirm` |

### 1.3 El flujo crítico: `confirm()`

```
confirm(orderId)
│
├── [TX] Validar tenant + estado DRAFT
├── [TX] Recalcular totales, impuestos, margen
├── [TX] Update OrderLine (cost, tax, profit)
├── [TX] Decrement Product.stockAvailable      ← Inventario (modelo viejo)
├── [TX] Create CashMovement                   ← Caja
│
├── [ASYNC] sendWebhook() → HTTP + WebhookLog  ← Integraciones
├── [ASYNC] ordersGateway.emitNewOrder()       ← KDS / Realtime
├── [ASYNC] loyaltyService.awardPoints()       ← Loyalty
└── [ASYNC] facturasendService.emitFromOrder() ← Fiscal SIFEN
```

**Observación clave:** la transacción Prisma solo protege Order + OrderLine + stock denormalizado + CashMovement. Todo lo demás es fire-and-forget con `try/catch` que solo loguea. No hay compensación, no hay cola durable, no hay garantía de entrega.

### 1.4 El flujo `create()` también acopla

Al crear un DRAFT, si la línea tiene `metadata.booking_details`, el servicio:

1. Busca el `Service` asociado al `Product`
2. Crea un `AppointmentAssignment`

Es decir: **crear un pedido puede crear una reserva**. El agregado de Pedidos conoce el agregado de Bookings.

### 1.5 `sendWebhook()` es otro god method

Además de POST HTTP:

- Lee `AppointmentAssignment` + `Resource` (Bookings)
- Lee `Integration` (tipo Odoo)
- Escribe `WebhookLog`
- Actualiza `Order.webhookSent`

El payload se arma con conocimiento profundo de bookings y de la forma en que Odoo espera los datos. La lógica de “cómo se ve un pedido para un ERP externo” vive dentro del dominio de pedidos.

---

## 2. Clasificación de responsabilidades

| Responsabilidad | ¿Pertenece a Pedidos? | Estado actual |
|-----------------|-----------------------|---------------|
| Ciclo de vida del Order (DRAFT → CONFIRMED → CANCELLED) | **Sí** | Correcto |
| Cálculo de totales / descuentos / impuestos de línea | **Sí** (o Pricing) | Correcto, pero mezclado |
| Persistencia de Order + OrderLine | **Sí** | Correcto |
| Mutación de stock | **No** → Inventario | Acoplado (y con modelo viejo) |
| Registro de movimiento de caja | **No** → Caja/POS | Acoplado |
| Emisión de puntos loyalty | **No** → Loyalty | Acoplado (inyección directa) |
| Emisión de documento electrónico | **No** → Fiscal | Acoplado (inyección directa) |
| Notificación KDS en tiempo real | **No** → Realtime / KDS | Acoplado |
| Entrega confiable a ERPs externos | **No** → Integraciones | Acoplado + lógica de payload |
| Creación de AppointmentAssignment | **No** → Bookings | Acoplado en `create` |

**Resumen:** de las 10 responsabilidades que toca el servicio, solo 3 pertenecen de forma clara al dominio de Pedidos.

---

## 3. Objetivo de desacoplamiento

Convertir Pedidos en un **agregado cerrado** que:

1. Solo escribe sus propias tablas (`Order`, `OrderLine` y, como máximo, campos de estado derivados).
2. Publica **hechos de dominio** (eventos) cuando algo relevante ocurre.
3. No conoce Loyalty, FacturaSend, Odoo, stock ni caja.
4. Sigue siendo un módulo dentro del mismo monolito (sin microservicios).

Los demás dominios reaccionan a esos hechos.

---

## 4. Diseño propuesto

### 4.1 Eventos de dominio (contratos)

```ts
// orders/events/order.events.ts

export class OrderCreated {
  constructor(
    public readonly tenantId: string,
    public readonly orderId: string,
    public readonly lines: Array<{
      productId: string;
      quantity: number;
      priceAtSale: number;
      metadata?: Record<string, any>;
    }>,
    public readonly customerId?: string,
    public readonly metadata?: Record<string, any>,
  ) {}
}

export class OrderConfirmed {
  constructor(
    public readonly tenantId: string,
    public readonly orderId: string,
    public readonly totalAmount: number,
    public readonly currency: string,
    public readonly paymentType: string,
    public readonly lines: Array<{
      productId: string;
      quantity: number;
      priceAtSale: number;
      costPrice: number;
      taxAmount: number;
    }>,
    public readonly customerId?: string,
    public readonly discountAmount?: number,
  ) {}
}

export class OrderCancelled {
  constructor(
    public readonly tenantId: string,
    public readonly orderId: string,
    public readonly previousStatus: string,
  ) {}
}

export class OrderStatusChanged {
  constructor(
    public readonly tenantId: string,
    public readonly orderId: string,
    public readonly from: string,
    public readonly to: string,
  ) {}
}
```

Estos eventos son el **único contrato** que Pedidos expone hacia el resto del sistema.

### 4.2 `OrdersService` después del desacoplamiento

```ts
async confirm(tenantId: string, orderId: string, dto: ConfirmOrderDto, db?: PrismaClient) {
  const order = await this.orderRepository.confirmInTransaction(tenantId, orderId, dto);

  // Única responsabilidad post-persistencia:
  this.eventBus.publish(new OrderConfirmed(
    tenantId,
    order.id,
    Number(order.totalAmount),
    order.currency,
    dto.paymentType || 'cash',
    order.orderLines.map(...),
    order.customerId,
    dto.discountAmount,
  ));

  return order;
}
```

La transacción solo toca `Order` + `OrderLine`. Nada de stock, caja, loyalty ni fiscal.

### 4.3 Handlers por dominio (mismo proceso, módulos separados)

| Evento | Handler | Módulo | Acción |
|--------|---------|--------|--------|
| `OrderConfirmed` | `InventoryOnOrderConfirmedHandler` | inventory | Crear `StockMove` + actualizar `StockQuant` (y opcionalmente el caché `stockAvailable`) |
| `OrderConfirmed` | `CashOnOrderConfirmedHandler` | pos/cash | Crear `CashMovement` |
| `OrderConfirmed` | `LoyaltyOnOrderConfirmedHandler` | loyalty | `awardPointsForOrder` |
| `OrderConfirmed` | `FiscalOnOrderConfirmedHandler` | integrations/facturasend | `emitFromOrder` (vía cola) |
| `OrderConfirmed` | `WebhookOnOrderConfirmedHandler` | integrations | Encolar job BullMQ de entrega |
| `OrderConfirmed` | `KdsOnOrderConfirmedHandler` | realtime | `ordersGateway.emitNewOrder` |
| `OrderCreated` | `BookingOnOrderCreatedHandler` | bookings | Si hay `booking_details`, crear `AppointmentAssignment` |
| `OrderCancelled` | `InventoryOnOrderCancelledHandler` | inventory | Revertir `StockMove` / liberar reserva |
| `OrderStatusChanged` | `KdsOnStatusChangedHandler` | realtime | Emitir update al KDS |

### 4.4 Cola durable para todo I/O externo

```
OrderConfirmed
  └─ WebhookOnOrderConfirmedHandler
        └─ queue.add('deliver-webhook', { tenantId, orderId, url, payload })
              └─ Worker con retries + backoff + dead-letter
```

Lo mismo para FacturaSend y cualquier llamada a Odoo/Tango. El `retryPendingWebhooks()` actual (query global + console.log) desaparece.

### 4.5 Inventario: un solo camino

```
OrderConfirmed
  → InventoryHandler
      → StockMove (source: Stock location, dest: Customer location, state: DONE)
      → StockQuant.quantity -= n
      → (opcional) Product.stockAvailable = suma de quants  // caché, no fuente de verdad
```

Se elimina el `product.update({ stockAvailable: { decrement } })` del flujo de pedidos.

---

## 5. Plan de migración incremental (sin big-bang)

### Fase 0 — Preparación (1–2 días)
- Introducir `EventBus` (NestJS `EventEmitter2` o el bus propio del ROADMAP).
- Definir los 4 eventos de pedidos y publicarlos **además** de la lógica actual (dual-write de eventos).
- No cambiar comportamiento todavía.

### Fase 1 — Side-effects post-transacción (3–5 días)
Mover fuera de `confirm()`, en este orden:

1. `ordersGateway.emitNewOrder` → handler KDS
2. `loyaltyService.awardPoints` → handler Loyalty
3. `facturasendService.emitFromOrder` → handler Fiscal (ya con cola)
4. `sendWebhook` → handler + BullMQ

Después de cada movimiento, el método `confirm()` se reduce. Tests de regresión en cada paso.

### Fase 2 — Caja e inventario (5–8 días)
1. Extraer creación de `CashMovement` a handler.
2. Sustituir el decremento de `Product.stockAvailable` por creación de `StockMove` + update de `StockQuant`.
3. Dejar `stockAvailable` como proyección/caché actualizada por el handler de inventario (o eliminarlo en una fase posterior).

### Fase 3 — Create + Bookings (2–3 días)
- Quitar la creación de `AppointmentAssignment` de `OrdersService.create`.
- Publicar `OrderCreated`.
- Handler de Bookings reacciona si hay `booking_details` en las líneas.

### Fase 4 — Limpieza y enforcement (2–3 días)
- Eliminar imports de `LoyaltyService` y `FacturasendService` desde `orders/`.
- Eliminar `HttpService` del servicio de pedidos.
- Regla de lint / dependency-cruiser: `orders/**` no puede importar `loyalty/**`, `integrations/**`, `inventory/**`.
- Documentar el contrato de eventos como API interna estable.

**Esfuerzo total estimado:** 2–3 sprints de un desarrollador senior que conoce el código.

---

## 6. Qué gana el sistema

| Antes | Después |
|-------|---------|
| `confirm()` conoce 5 dominios | `confirm()` solo conoce Order + OrderLine |
| Fallo de FacturaSend o Loyalty se traga con log | Cada handler tiene su política de retry/compensación |
| Stock denormalizado en el camino crítico | Un solo modelo de inventario (StockMove) |
| Payload de webhook armado dentro de Orders | Mapper de integraciones vive en el módulo de integraciones |
| Tests de `confirm()` requieren 5 mocks | Tests unitarios del agregado son triviales |
| Nuevo side-effect = tocar OrdersService | Nuevo side-effect = nuevo handler (Open/Closed) |

---

## 7. Qué no hacer

1. **No extraer un microservicio de Orders ahora.** El costo de red, sagas distribuidas y operación supera el beneficio mientras el volumen de tenants no lo exija.
2. **No usar la base de datos como bus de eventos** (polling de tablas de outbox sin infraestructura). Si se usa outbox, que sea con un worker dedicado y claro.
3. **No publicar eventos genéricos tipo `EntityChanged`.** Eventos de dominio con nombre y payload explícitos.
4. **No dejar el dual-write de eventos para siempre.** La Fase 0 es temporal; el objetivo es que el evento sea la única vía.

---

## 8. Criterio de éxito

El desacoplamiento se considera logrado cuando:

1. `OrdersService` no importa nada de `loyalty/`, `integrations/`, `inventory/` ni `bookings/`.
2. `confirm()` cabe en < 40 líneas y solo hace persistencia + `eventBus.publish`.
3. Todo I/O externo (HTTP a ERPs, SIFEN) pasa por BullMQ.
4. Toda mutación de stock pasa por `StockMove`.
5. Se puede agregar un nuevo reaction (ej. “enviar email de confirmación”) sin tocar el módulo de pedidos.

---

## 9. Conclusión

El dominio de Pedidos hoy es el **centro de gravedad del acoplamiento** del monolito. No porque esté mal modelado el Order en sí, sino porque se convirtió en el lugar donde se orquesta la venta completa.

El desacoplamiento no requiere reescritura ni microservicios. Requiere:

1. Definir hechos de dominio claros (`OrderCreated`, `OrderConfirmed`, …).
2. Mover cada side-effect a un handler de su propio módulo.
3. Hacer del EventBus + BullMQ el mecanismo de extensión.
4. Unificar inventario bajo un solo modelo.

Hecho de forma incremental (Fases 0–4), el riesgo es bajo y el retorno es inmediato: el método más crítico del sistema deja de ser un god method y el monolito se acerca a ser realmente modular.

---

*Basado en el análisis de `orders.controller.ts`, `orders.service.ts` (440 líneas), flujo `confirm`/`create`/`sendWebhook` y relaciones del schema Prisma de OrderFlow 1.16.0.*
