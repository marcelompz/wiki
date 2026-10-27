# Diseño: pedidos de compra (modelo de datos, estados y plan)

Borrador v1 · 26 de octubre de 2026 · Prisma + PostgreSQL

## Alcance y premisas

Este diseño cubre el ciclo completo de una compra: registro del pedido, aprobación, envío al proveedor, seguimiento, recepción y almacenamiento, más la sincronización con un ERP externo (Odoo hoy, Desbravador después).

**Limitación importante:** el README del pack dice que `schema.prisma` y `migrations/` están completos, pero no vienen en ninguno de los dos archivos subidos (`backend/` está vacío). Por eso los modelos nuevos referencian los existentes con ids escalares (`supplierId`, `warehouseId`, `productId`, etc.), marcados con comentarios. Al recibir tu schema se convierten en relaciones reales y se ajustan los nombres.

Premisas asumidas, a confirmar:

- PostgreSQL con Prisma, multi-tenant por `tenantId` (el header `X-OmniFlow-Tenant` lo sugiere) y stack NestJS + BullMQ.
- Ya existen producto, depósito, proveedor o tercero, usuario y algún registro de movimientos de stock.
- La migración debe ser solo aditiva: tablas nuevas, sin tocar las existentes salvo relaciones inversas.

Principios heredados del informe del conector Odoo: la clave externa vive separada de cualquier referencia de presentación, la idempotencia se resuelve a nivel de línea, y los estados solo cambian a través de una máquina de estados.

## Decisiones abiertas que condicionan el diseño

| # | Decisión | Opción recomendada |
| --- | --- | --- |
| D1 | Fuente de verdad entre OrderFlow y el ERP | OrderFlow manda en el ciclo operativo (hasta el envío y la recepción). El ERP manda en lo fiscal y contable. Las divergencias se marcan como `CONFLICT`, nunca se pisan solas. |
| D2 | Tolerancia de sobre-recepción | Porcentaje configurable por tenant (por ejemplo 5 %). Por encima, se bloquea la recepción. |
| D3 | Niveles de aprobación | Un umbral de monto por tenant: por debajo se auto-aprueba, por encima requiere un aprobador distinto del creador. |
| D4 | Lotes y vencimientos | Incluirlos desde el inicio (en gastronomía suelen ser necesarios). Son campos opcionales en la línea de recepción. |
| D5 | Conciliación con factura (three-way match) | Fuera de la primera versión. El diseño deja `CLOSED` como cierre administrativo para engancharla después. |

## Estados del pedido

| Estado | Significado |
| --- | --- |
| `DRAFT` | Borrador editable. |
| `PENDING_APPROVAL` | Enviado a aprobación. |
| `APPROVED` | Aprobado, aún no enviado al proveedor. |
| `SENT` | Enviado al proveedor (email, WhatsApp o ERP). |
| `CONFIRMED` | El proveedor confirmó y dio fecha. Es opcional: se puede pasar de `SENT` a recepción sin él. |
| `PARTIALLY_RECEIVED` | Hay recepciones confirmadas que no cubren todo lo pedido. |
| `RECEIVED` | Todo lo pedido está recibido y almacenado, dentro de tolerancia. |
| `CLOSED` | Cierre administrativo (terminal). Puede ser un cierre corto con faltantes. |
| `CANCELLED` | Cancelado (terminal). Solo si no hay recepciones confirmadas. |

### Transiciones permitidas

| Desde | Hacia | Evento | Quién | Condición |
| --- | --- | --- | --- | --- |
| `DRAFT` | `PENDING_APPROVAL` | `submit` | Creador | Proveedor y depósito definidos, al menos una línea, total mayor que 0 |
| `DRAFT` | `APPROVED` | `submit` | Sistema | Total menor o igual al umbral de auto-aprobación |
| `PENDING_APPROVAL` | `APPROVED` | `approve` | Aprobador | Distinto del creador (configurable) |
| `PENDING_APPROVAL` | `DRAFT` | `reject` | Aprobador | Motivo obligatorio |
| `APPROVED` | `SENT` | `send` | Compras | Canal de envío elegido |
| `SENT` | `CONFIRMED` | `confirm` | Compras o integración | Fecha prometida opcional |
| `APPROVED`, `SENT`, `CONFIRMED` | `PARTIALLY_RECEIVED` | recepción confirmada | Almacén | Recibido menor que lo pedido en alguna línea |
| `APPROVED`, `SENT`, `CONFIRMED`, `PARTIALLY_RECEIVED` | `RECEIVED` | recepción confirmada | Almacén | Todas las líneas cubiertas dentro de tolerancia |
| `RECEIVED` | `CLOSED` | `close` | Compras o sistema | Manual en v1; automático al conciliar factura más adelante |
| `PARTIALLY_RECEIVED` | `CLOSED` | `close_short` | Compras | Motivo obligatorio. `closedShort = true`; las líneas pendientes pasan a `CLOSED` |
| `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `SENT`, `CONFIRMED` | `CANCELLED` | `cancel` | Compras | Motivo obligatorio; sin recepciones confirmadas |

Reglas adicionales:

- **Edición posterior a la aprobación:** editar en `APPROVED`, `SENT` o `CONFIRMED` incrementa `revision` y devuelve el pedido a `PENDING_APPROVAL`. Si ya se había enviado, hay que reenviar.
- **Anulación de una recepción:** una recepción confirmada por error se anula generando un movimiento de stock inverso, y el estado del pedido puede retroceder (`RECEIVED` a `PARTIALLY_RECEIVED`). No es posible si el pedido ya está en `CLOSED`.
- **Terminales:** `CLOSED` y `CANCELLED` no admiten ninguna transición.
- **Estados derivados:** `PARTIALLY_RECEIVED` y `RECEIVED` nunca se setean a mano. Los calcula el servicio de recepción al confirmar o anular una recepción.

## Modelo de datos

Entidades nuevas: `PurchaseOrder`, `PurchaseOrderLine`, `PurchaseReceipt`, `PurchaseReceiptLine`, `PurchaseOrderEvent` (historial), `ErpLink` (vínculo con el ERP), `OutboxEvent` (cola transaccional) y `DocumentSequence` (numeración).

### Enums

```prisma
enum PurchaseOrderStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  SENT
  CONFIRMED
  PARTIALLY_RECEIVED
  RECEIVED
  CLOSED
  CANCELLED
}

enum PurchaseLineStatus {
  OPEN
  CLOSED
  CANCELLED
}

enum PurchaseReceiptStatus {
  DRAFT
  CONFIRMED
  CANCELLED
}

enum ChangeSource {
  USER
  API
  ERP_SYNC
  SYSTEM
  WHATSAPP
}

enum ErpConnector {
  ODOO
  DESBRAVADOR
}

enum ErpEntityType {
  PURCHASE_ORDER
  PURCHASE_RECEIPT
  SUPPLIER
  PRODUCT
}

enum SyncStatus {
  PENDING
  SYNCED
  FAILED
  CONFLICT
}

enum OutboxStatus {
  PENDING
  PROCESSING
  DONE
  FAILED
}
```

### Pedido y líneas

```prisma
model PurchaseOrder {
  id            String              @id @default(cuid())
  tenantId      String
  number        String              // ej. PO-2026-000123, único por tenant
  supplierId    String              // EXISTENTE: proveedor o tercero (ajustar a relación)
  warehouseId   String              // EXISTENTE: depósito destino (ajustar a relación)
  status        PurchaseOrderStatus @default(DRAFT)
  revision      Int                 @default(1)
  version       Int                 @default(0) // bloqueo optimista
  currency      String              @db.Char(3)
  subtotal      Decimal             @default(0) @db.Decimal(18, 4)
  discountTotal Decimal             @default(0) @db.Decimal(18, 4)
  taxTotal      Decimal             @default(0) @db.Decimal(18, 4)
  total         Decimal             @default(0) @db.Decimal(18, 4)
  expectedDate  DateTime?
  supplierRef   String?             // referencia que el proveedor asigna
  notes         String?
  submittedAt   DateTime?
  approvedAt    DateTime?
  approvedById  String?             // EXISTENTE: usuario
  sentAt        DateTime?
  confirmedAt   DateTime?
  closedAt      DateTime?
  closedShort   Boolean             @default(false)
  cancelledAt   DateTime?
  cancelReason  String?
  createdById   String              // EXISTENTE: usuario
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt

  lines    PurchaseOrderLine[]
  receipts PurchaseReceipt[]
  events   PurchaseOrderEvent[]

  @@unique([tenantId, number])
  @@index([tenantId, status, expectedDate])
  @@index([tenantId, supplierId, createdAt])
}

model PurchaseOrderLine {
  id              String             @id @default(cuid())
  purchaseOrderId String
  lineNo          Int
  clientLineRef   String             // clave de idempotencia por línea
  productId       String             // EXISTENTE: producto (ajustar a relación)
  description     String?
  uom             String
  qtyOrdered      Decimal            @db.Decimal(18, 4)
  qtyReceived     Decimal            @default(0) @db.Decimal(18, 4)
  qtyRejected     Decimal            @default(0) @db.Decimal(18, 4)
  unitPrice       Decimal            @db.Decimal(18, 4)
  discountPct     Decimal            @default(0) @db.Decimal(7, 4)
  taxRate         Decimal            @default(0) @db.Decimal(7, 4)
  lineTotal       Decimal            @db.Decimal(18, 4)
  expectedDate    DateTime?
  status          PurchaseLineStatus @default(OPEN)

  purchaseOrder PurchaseOrder         @relation(fields: [purchaseOrderId], references: [id])
  receiptLines  PurchaseReceiptLine[]

  @@unique([purchaseOrderId, lineNo])
  @@unique([purchaseOrderId, clientLineRef])
  @@index([productId])
}
```

`clientLineRef` es la lección directa del informe del conector Odoo: si el emisor reintenta, la línea se identifica por su referencia estable y no se duplica.

### Recepción y almacenamiento

```prisma
model PurchaseReceipt {
  id                String                @id @default(cuid())
  tenantId          String
  purchaseOrderId   String
  number            String
  status            PurchaseReceiptStatus @default(DRAFT)
  idempotencyKey    String
  warehouseId       String                // EXISTENTE: depósito donde se recibe
  receivedAt        DateTime?
  receivedById      String?               // EXISTENTE: usuario
  supplierDocType   String?               // REMITO, FACTURA, NF_E...
  supplierDocNumber String?
  supplierDocKey    String?               // ej. clave de acceso NF-e (44 dígitos)
  notes             String?
  createdAt         DateTime              @default(now())
  confirmedAt       DateTime?
  cancelledAt       DateTime?

  purchaseOrder PurchaseOrder         @relation(fields: [purchaseOrderId], references: [id])
  lines         PurchaseReceiptLine[]

  @@unique([tenantId, number])
  @@unique([tenantId, idempotencyKey])
  @@index([purchaseOrderId, status])
}

model PurchaseReceiptLine {
  id                  String    @id @default(cuid())
  receiptId           String
  purchaseOrderLineId String
  qtyReceived         Decimal   @db.Decimal(18, 4)
  qtyRejected         Decimal   @default(0) @db.Decimal(18, 4)
  rejectReason        String?
  lotCode             String?
  expiryDate          DateTime?
  locationId          String?   // EXISTENTE: ubicación o bin de almacenamiento
  storedAt            DateTime? // cuándo quedó almacenado
  stockMovementId     String?   @unique // EXISTENTE: movimiento de stock generado

  receipt           PurchaseReceipt   @relation(fields: [receiptId], references: [id])
  purchaseOrderLine PurchaseOrderLine @relation(fields: [purchaseOrderLineId], references: [id])

  @@index([purchaseOrderLineId])
}
```

Si ya tenés un libro de movimientos de stock, `stockMovementId` se enlaza a él. Si no existe, hace falta un modelo mínimo (producto, depósito, ubicación, cantidad con signo, lote, origen y fecha). Confirmar una recepción debe crear ese movimiento en la misma transacción.

### Seguimiento e integración

```prisma
model PurchaseOrderEvent {
  id              String               @id @default(cuid())
  tenantId        String
  purchaseOrderId String
  fromStatus      PurchaseOrderStatus?
  toStatus        PurchaseOrderStatus
  action          String
  actorId         String?
  source          ChangeSource         @default(USER)
  reason          String?
  metadata        Json?
  createdAt       DateTime             @default(now())

  purchaseOrder PurchaseOrder @relation(fields: [purchaseOrderId], references: [id])

  @@index([purchaseOrderId, createdAt])
}

model ErpLink {
  id             String        @id @default(cuid())
  tenantId       String
  connector      ErpConnector
  entityType     ErpEntityType
  entityId       String        // id interno de OrderFlow
  externalId     String?       // id en el ERP
  externalNumber String?       // número legible en el ERP
  syncStatus     SyncStatus    @default(PENDING)
  payloadHash    String?
  attempts       Int           @default(0)
  lastError      String?
  lastSyncedAt   DateTime?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  @@unique([tenantId, connector, entityType, entityId])
  @@unique([tenantId, connector, entityType, externalId])
  @@index([tenantId, syncStatus])
}

model OutboxEvent {
  id             String       @id @default(cuid())
  tenantId       String
  aggregateType  String
  aggregateId    String
  type           String
  payload        Json
  idempotencyKey String
  status         OutboxStatus @default(PENDING)
  attempts       Int          @default(0)
  nextAttemptAt  DateTime     @default(now())
  processedAt    DateTime?
  createdAt      DateTime     @default(now())

  @@unique([tenantId, idempotencyKey])
  @@index([status, nextAttemptAt])
}

model DocumentSequence {
  tenantId  String
  docType   String
  year      Int
  nextValue Int    @default(1)

  @@id([tenantId, docType, year])
}
```

`ErpLink` guarda el id externo en una tabla propia, no dentro de ninguna referencia de presentación. Es la corrección de fondo al problema del conector Odoo. El `OutboxEvent` garantiza que el evento de sincronización se guarda en la misma transacción que el cambio de estado, y BullMQ lo procesa después.

## Reglas de integridad y concurrencia

1. **Un único punto de cambio de estado.** Un servicio `PurchaseOrderStateMachine` con un mapa de transiciones permitidas. Ningún otro código escribe `status`.
2. **Bloqueo optimista.** Cada transición hace `updateMany` con `where: { id, version }` e incrementa `version`. Si afecta cero filas, hubo concurrencia y se reintenta o se informa.
3. **Transacción única al confirmar una recepción.** Bloquear la fila del pedido (`SELECT ... FOR UPDATE`), validar cantidades contra lo pedido y la tolerancia, crear los movimientos de stock, actualizar `qtyReceived` por línea, derivar el nuevo estado, escribir el evento de historial y escribir el `OutboxEvent`.
4. **Idempotencia en las tres capas.** `Idempotency-Key` en la creación de recepciones, `clientLineRef` por línea y `idempotencyKey` en el outbox. Reenviar el mismo pedido o recepción debe dar el mismo resultado sin duplicar.
5. **Dinero.** Siempre `Decimal`, nunca `Float`, con moneda por pedido. Los redondeos se definen una vez en el cálculo de totales.
6. **Aislamiento por tenant.** Todo `where` incluye `tenantId`. Evaluar Row Level Security en PostgreSQL como segunda barrera.
7. **Sin borrado físico.** Los pedidos se cancelan, no se eliminan. El historial es solo de inserción.
8. **Numeración.** `DocumentSequence` se incrementa con una sentencia atómica (`UPDATE ... RETURNING`) dentro de la misma transacción de creación.

## Mapeo con el ERP

| OrderFlow | Odoo `purchase.order` | Desbravador |
| --- | --- | --- |
| `DRAFT` | `draft` | Por definir tras el spike |
| `PENDING_APPROVAL` | `to approve` | Por definir |
| `APPROVED`, `SENT`, `CONFIRMED` | `purchase` (Odoo no distingue estos tres) | Por definir |
| `PARTIALLY_RECEIVED`, `RECEIVED` | `purchase`, con el albarán de entrada (`stock.picking`) parcial o hecho | Por definir |
| `CLOSED` | `done` | Por definir |
| `CANCELLED` | `cancel` | Por definir |

Validar los estados de Odoo contra las versiones 14, 18 y 19 antes de implementar. El conector se define como una interfaz `ErpConnector` con una implementación por ERP, que lee del outbox y escribe el resultado en `ErpLink`. Cuando el ERP informa un estado distinto del esperado, el vínculo pasa a `CONFLICT` y se muestra a un humano.

## API propuesta

- `POST /purchase-orders` y `PATCH /purchase-orders/:id` (solo en `DRAFT`, o con revisión)
- `POST /purchase-orders/:id/submit`, `/approve`, `/reject`, `/send`, `/confirm`, `/cancel`, `/close`, `/close-short`
- `POST /purchase-orders/:id/receipts` (exige `Idempotency-Key`)
- `POST /purchase-receipts/:id/confirm` y `/cancel`
- `GET /purchase-orders/:id/timeline` (historial de eventos)
- `GET /purchase-orders?status=&supplierId=&overdue=true` (listado con filtros)

## Plan por fases

Las duraciones son estimaciones gruesas para una sola persona y dependen de lo que ya exista en el esquema.

| Fase | Contenido | Estimación |
| --- | --- | --- |
| 0 | Recibir `schema.prisma`, confirmar reutilización de proveedor, depósito, producto y stock, y cerrar D1 a D5 | 0,5 a 1 día |
| 1 | Modelos, migración aditiva, máquina de estados, historial y numeración, con pruebas unitarias | 3 a 4 días |
| 2 | Recepción: `Idempotency-Key`, tolerancia, lotes y vencimientos, movimiento de stock, anulación | 3 a 4 días |
| 3 | API REST, permisos por rol y filtros, más notificaciones básicas | 3 a 5 días |
| 4 | Outbox, `ErpLink` y conector Odoo, reutilizando las correcciones del informe | 5 a 8 días |
| 5 | Spike y adaptador de Desbravador | Depende del canal disponible |
| 6 | Pantalla de seguimiento (línea de tiempo), reportes de atrasos y cumplimiento del proveedor | 3 a 5 días |

## Pruebas mínimas

- Matriz completa de transiciones: cada par válido pasa y cada par inválido es rechazado.
- Dos recepciones simultáneas sobre el mismo pedido: no hay sobre-recepción ni estado inconsistente.
- Reenvío de la misma recepción con la misma `Idempotency-Key`: una sola recepción, un solo movimiento de stock.
- Reenvío del mismo pedido con las mismas `clientLineRef`: sin líneas duplicadas.
- Sobre-recepción dentro y fuera de tolerancia.
- Cancelación bloqueada después de una recepción confirmada.
- Anulación de una recepción: stock revertido y estado recalculado.
- Fallo del ERP: el pedido no cambia de estado y el vínculo queda en `FAILED` con reintento.

## Riesgos

- **Esquema no visto:** nombres y relaciones pueden cambiar. Es el motivo de la fase 0.
- **Doble asiento de stock** si la recepción y un proceso externo (por ejemplo el ERP) mueven el mismo inventario. D1 debe definir quién mueve el stock.
- **Divergencia con el ERP** si se permiten ediciones en ambos lados sin reglas.
- **Lotes y vencimientos** son difíciles de agregar después si no se modelan desde el principio.
- **Multi-moneda:** si hay compras en varias monedas, falta definir el tipo de cambio y dónde se fija.

## Próximo paso

Pasame el `schema.prisma` actual (y, si existe, el modelo de movimientos de stock) para convertir las referencias marcadas como EXISTENTE en relaciones reales, ajustar nombres y generar la migración de la fase 1.
