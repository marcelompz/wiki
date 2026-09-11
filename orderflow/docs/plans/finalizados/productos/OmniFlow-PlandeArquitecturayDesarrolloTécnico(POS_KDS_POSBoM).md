# **OmniFlow — Plan Maestro de Arquitectura y Desarrollo Técnico: POS, KDS y POS BoM**

**Documento Técnico Oficial**  
**Ecosistema:** OmniFlow SaaS (NestJS, Prisma, PostgreSQL, Redis/BullMQ, React/Refine, WebSockets, Dexie.js)  
**Fecha:** Agosto 2026

# **1\. Visión General y Principios de Diseño**

El objetivo principal de esta iniciativa es dotar a OmniFlow de una suite operativa de alta velocidad compuesta por tres subsistemas estrechamente integrados:

* **POS (Punto de Venta / Terminal de Caja y Mozos):** Terminal ultra-reactivo con soporte Offline-First nativo, control estricto de turnos/arqueos de caja estilo Odoo (`pos.session`), soporte para salón/mesas y split bill.  
* **KDS (Kitchen Display System / Sistema de Pantallas de Cocina y Barra):** Sistema de despacho visual en tiempo real basado en WebSockets y Redis Pub/Sub, con enrutamiento inteligente por estaciones de trabajo (`PreparationStation`), control de SLA por semáforo y memoria de recall.  
* **POS BoM (Motor de Escandallos y Fichas Técnicas en Tiempo Real):** Algoritmo de explosión recursiva de recetas con descuento atómico de materias primas e insumos en el Kardex al momento de la venta, con capacidad de modificar dinámicamente el consumo según los modificadores/extras de cada comanda.

# **2\. Modelo de Datos Integral en Prisma**

## **Entidades Core de POS, Sesiones, KDS, BoM y Stock**

// \==========================================

// 1\. CONFIGURACIÓN Y SESIONES POS (Patrón Odoo)

// \==========================================

enum PosSessionStatus {

  OPENING\_CONTROL

  OPEN

  CLOSING\_CONTROL

  CLOSED

}

enum OrderStatus {

  DRAFT

  SENT\_TO\_KITCHEN

  PAID

  CANCELLED

}

model PosConfig {

  id               String       @id @default(cuid())

  tenantId         String

  name             String       // Ej: "Caja Principal", "Barra Terraza"

  stockLocationId  String       // Ubicación de stock por defecto

  allowPriceEdit   Boolean      @default(false)

  allowDiscount    Boolean      @default(true)

  sessions         PosSession\[\]

  stations         PreparationStation\[\]

  createdAt        DateTime     @default(now())

  updatedAt        DateTime     @updatedAt

  @@index(\[tenantId\])

}

model PosSession {

  id               String           @id @default(cuid())

  tenantId         String

  configId         String

  config           PosConfig        @relation(fields: \[configId\], references: \[id\])

  userId           String           // Operador / Cajero

  status           PosSessionStatus @default(OPEN)

  openedAt         DateTime         @default(now())

  closedAt         DateTime?

  startCash        Decimal          @db.Decimal(12, 2\)

  expectedCash     Decimal?         @db.Decimal(12, 2\)

  actualCash       Decimal?         @db.Decimal(12, 2\)

  cashDifference   Decimal?         @db.Decimal(12, 2\)

  orders           PosOrder\[\]

  createdAt        DateTime         @default(now())

  updatedAt        DateTime         @updatedAt

  @@index(\[tenantId, status\])

}

// \==========================================

// 2\. PEDIDOS Y COMANDAS

// \==========================================

model PosOrder {

  id               String          @id @default(cuid())

  tenantId         String

  sessionId        String

  session          PosSession      @relation(fields: \[sessionId\], references: \[id\])

  orderNumber      String          // Ej: "POS-20260819-0042"

  tableNumber      String?         // Mesa / Salón

  dinersCount      Int             @default(1)

  status           OrderStatus     @default(DRAFT)

  subtotal         Decimal         @db.Decimal(12, 2\)

  discountTotal    Decimal         @db.Decimal(12, 2\) @default(0)

  total            Decimal         @db.Decimal(12, 2\)

  totalCostAtSale  Decimal         @db.Decimal(12, 2\) @default(0)

  lines            PosOrderLine\[\]

  kitchenTickets   KitchenTicket\[\]

  payments         PosPayment\[\]

  createdAt        DateTime        @default(now())

  updatedAt        DateTime        @updatedAt

  @@index(\[tenantId, sessionId, status\])

}

model PosOrderLine {

  id               String               @id @default(cuid())

  tenantId         String

  orderId          String

  order            PosOrder             @relation(fields: \[orderId\], references: \[id\], onDelete: Cascade)

  variantId        String               // Referencia estricta a ProductVariant

  quantity         Decimal              @db.Decimal(10, 3\)

  unitPrice        Decimal              @db.Decimal(12, 2\)

  costAtSale       Decimal              @db.Decimal(12, 2\) // Costo BoM unitario snapshot

  discountPercent  Decimal              @db.Decimal(5, 2\)  @default(0)

  subtotal         Decimal              @db.Decimal(12, 2\)

  note             String?              // Nota cocina Ej: "Sin sal"

  modifiers        PosLineModifier\[\]

  stockMoves       StockMove\[\]

  kitchenLines     KitchenTicketLine\[\]

  createdAt        DateTime             @default(now())

  @@index(\[tenantId, orderId\])

}

model PosLineModifier {

  id                  String       @id @default(cuid())

  orderLineId         String

  orderLine           PosOrderLine @relation(fields: \[orderLineId\], references: \[id\], onDelete: Cascade)

  ingredientVariantId String?      // Insumo a añadir/restar

  replacesVariantId   String?      // Insumo a anular de la BoM

  name                String       // Ej: "Leche de Almendras", "Sin Tomate"

  priceDelta          Decimal      @db.Decimal(12, 2\) @default(0)

  qtyDelta            Decimal      @db.Decimal(10, 3\) @default(0) // Ej: \+150ml

}

model PosPayment {

  id               String       @id @default(cuid())

  tenantId         String

  orderId          String

  order            PosOrder     @relation(fields: \[orderId\], references: \[id\], onDelete: Cascade)

  paymentMethodId  String

  amount           Decimal      @db.Decimal(12, 2\)

  tendered         Decimal?     @db.Decimal(12, 2\)

  change           Decimal?     @db.Decimal(12, 2\)

  createdAt        DateTime     @default(now())

}

// \==========================================

// 3\. FICHAS TÉCNICAS Y ESCANDALLOS (POS BoM)

// \==========================================

enum BomType {

  KIT\_PHANTOM    // Consumo inmediato en POS

  MANUFACTURE    // Producción tradicional por lote

}

enum UomCategory {

  UNIT

  WEIGHT

  VOLUME

}

model UnitOfMeasure {

  id               String       @id @default(cuid())

  tenantId         String

  name             String       // "Gramo", "Mililitro", "Unidad"

  symbol           String       // "g", "ml", "u"

  category         UomCategory

  ratioToBase      Decimal      @db.Decimal(12, 6\)

  isBase           Boolean      @default(false)

  bomLines         BomLine\[\]

}

model ProductBom {

  id               String       @id @default(cuid())

  tenantId         String

  productId        String?      // Template

  variantId        String?      // Variante específica

  name             String       // "Ficha Técnica Cappuccino"

  type             BomType      @default(KIT\_PHANTOM)

  yieldQuantity    Decimal      @db.Decimal(10, 3\) @default(1)

  isActive         Boolean      @default(true)

  lines            BomLine\[\]

  createdAt        DateTime     @default(now())

  updatedAt        DateTime     @updatedAt

  @@index(\[tenantId, variantId, productId\])

}

model BomLine {

  id                 String         @id @default(cuid())

  bomId              String

  bom                ProductBom     @relation(fields: \[bomId\], references: \[id\], onDelete: Cascade)

  componentVariantId String         // Materia prima / Insumo

  subBomId           String?        // Para semi-elaborados

  quantity           Decimal        @db.Decimal(12, 4\)

  uomId              String

  uom                UnitOfMeasure  @relation(fields: \[uomId\], references: \[id\])

  wastePercentage    Decimal        @db.Decimal(5, 2\)  @default(0) // % Merma

  stockLocationId    String?

  createdAt          DateTime       @default(now())

}

// \==========================================

// 4\. KITCHEN DISPLAY SYSTEM (KDS)

// \==========================================

enum KitchenTicketStatus {

  QUEUED

  IN\_PROGRESS

  READY

  SERVED

  CANCELLED

}

enum PriorityLevel {

  LOW

  NORMAL

  HIGH

  URGENT

}

model PreparationStation {

  id               String               @id @default(cuid())

  tenantId         String

  name             String               // "Cafetería", "Barra", "Cocina Fuegos"

  posConfigs       PosConfig\[\]

  categories       String\[\]             // Categorías asignadas

  tickets          KitchenTicket\[\]

  slaMinutes       Int                  @default(15)

  createdAt        DateTime             @default(now())

}

model KitchenTicket {

  id               String              @id @default(cuid())

  tenantId         String

  orderId          String

  order            PosOrder            @relation(fields: \[orderId\], references: \[id\], onDelete: Cascade)

  stationId        String

  station          PreparationStation  @relation(fields: \[stationId\], references: \[id\])

  ticketNumber     String              // "K-042"

  status           KitchenTicketStatus @default(QUEUED)

  priority         PriorityLevel       @default(NORMAL)

  startedAt        DateTime?

  readyAt          DateTime?

  servedAt         DateTime?

  lines            KitchenTicketLine\[\]

  createdAt        DateTime            @default(now())

  updatedAt        DateTime            @updatedAt

  @@index(\[tenantId, stationId, status\])

}

model KitchenTicketLine {

  id               String              @id @default(cuid())

  ticketId         String

  ticket           KitchenTicket       @relation(fields: \[ticketId\], references: \[id\], onDelete: Cascade)

  orderLineId      String

  orderLine        PosOrderLine        @relation(fields: \[orderLineId\], references: \[id\], onDelete: Cascade)

  productName      String

  variantName      String?

  quantity         Decimal             @db.Decimal(10, 3\)

  modifiersText    String?

  isCompleted      Boolean             @default(false)

}

// \==========================================

// 5\. MOVIMIENTOS DE STOCK (Kardex)

// \==========================================

model StockMove {

  id               String        @id @default(cuid())

  tenantId         String

  variantId        String

  orderLineId      String?

  orderLine        PosOrderLine? @relation(fields: \[orderLineId\], references: \[id\], onDelete: SetNull)

  locationSourceId String

  locationDestId   String

  quantity         Decimal       @db.Decimal(12, 4\)

  unitCost         Decimal       @db.Decimal(12, 2\)

  totalCost        Decimal       @db.Decimal(12, 2\)

  reason           String        // "POS\_BOM\_CONSUMPTION", "POS\_DIRECT\_SALE"

  createdAt        DateTime      @default(now())

  @@index(\[tenantId, variantId, createdAt\])

}

# **3\. Arquitectura del Motor POS BoM (Descuento de Stock en Caliente)**

## **Principio de Operación**

A diferencia de Odoo, que difiere la afectación de stock al cierre del día provocando "stock fantasma" durante el servicio, OmniFlow implementa el **Live Escandallo Engine**:

1. **Detección de BoM:** Al validar una comanda o cobrar, el sistema busca si la variante (o template) posee una `ProductBom` activa de tipo `KIT_PHANTOM`.  
2. **Explosión Recursiva:** Descompone sub-recetas (semi-elaborados) hasta llegar a materias primas elementales.  
3. **Ajuste por Modificadores:**  
   * Si una línea incluye un modificador con `replacesVariantId`, se anula el consumo de ese insumo base.  
   * Si incluye `ingredientVariantId` con `qtyDelta > 0`, se calcula el consumo adicional.  
4. **Factor de Merma y Conversión de UoM:** Cada ingrediente calcula su volumen real $\\text{Qty} \\times (1 \+ \\text{waste} / 100\) \\times \\text{ratioToBase}$.  
5. **Transaccionalidad Atómica:** Todo el descuento se procesa en una única transacción de base de datos (`prisma.$transaction`), registrando los asientos en `StockMove` y calculando el `costAtSale` exacto para alimentar el motor de Business Intelligence.

# **4\. Arquitectura del KDS (Kitchen Display System)**

## **Topología Event-Driven**

* **Protocolo:** WebSockets nativos a través de NestJS `OrdersGateway` con soporte para clustering horizontal vía Redis Pub/Sub.  
* **Salas / Canales:** Distribución por tenant y estación de trabajo (`tenant:{id}:station:{stationId}`).  
* **División Automática de Comandas (Split Routing):** Cada pedido se segmenta automáticamente en tickets de cocina independientes para cada estación de preparación.

## **Ciclo de Vida del Ticket**

* **QUEUED (Gris/Azul):** Ticket recibido en cola. Comienza el cronómetro de SLA.  
* **IN\_PROGRESS (Amarillo):** El preparador indica inicio de cocción/preparación.  
* **READY (Verde con alerta acústica):** Preparación finalizada. Dispara alerta inmediata a la terminal de mozos/mostrador.  
* **SERVED (Despachado):** Pasa a la memoria de Recall para auditoría o reclamos.

# **5\. Arquitectura del Terminal POS y Resiliencia Offline**

## **Control de Sesiones (`PosSession`)**

1. **Apertura de Caja:** Fondo fijo inicial obligatorio (`startCash`).  
2. **Registro de Movimientos Menores:** Ingresos y egresos de caja durante el turno (*Cash In / Cash Out*).  
3. **Cierre Ciego (*Blind Closing*):** El cajero cuenta el dinero físico sin conocer el total calculado por el sistema, garantizando auditoría objetiva.  
4. **Emisión de Reporte Z:** Detección automática de faltantes o sobrantes (`cashDifference`) y consolidación contable.

## **Capa Offline-First (Dexie.js / IndexedDB)**

* El catálogo de productos y recetas se almacena localmente en IndexedDB.  
* Cada orden generada sin conexión se guarda en una tabla `ordersQueue` con UUID cliente (`clientTempId`).  
* Un Worker de sincronización en background despacha las órdenes acumuladas en lotes con semántica idempotente al restablecerse la conectividad.

# **6\. Roadmap de Desarrollo Técnico**

| Fase | Sprint | Entregables Principales | Stack / Componentes |
| :---- | :---- | :---- | :---- |
| **Fase 1** | Sprint 1 (Sem 1-2) | Migraciones Prisma, CRUD de Sesiones POS, Modelo de Órdenes y Líneas | NestJS, Prisma, PostgreSQL |
| **Fase 2** | Sprint 2 (Sem 3-4) | Motor BoM, Conversor de UoM, Explosión Recursiva y Registro de StockMove | Prisma Transactions, Stock Service |
| **Fase 3** | Sprint 3 (Sem 5-6) | OrdersGateway WebSockets, Redis Pub/Sub y Pantallas KDS táctiles | NestJS WS, Redis, React/Refine |
| **Fase 4** | Sprint 4 (Sem 7-8) | Terminal POS Offline-First (Dexie.js), Gestión de Mesas y Split Bill | React, Dexie.js, BullMQ Sync |
| **Fase 5** | Sprint 5 (Sem 9\) | Validación y pruebas de campo en entorno real (Cafetería) | Telemetría Axon, Stress Testing |

# **7\. División de Cuentas (Split Bill) y Protocolo de Rendición de Cobros en Mesa**

## **7.1. Modalidades de División de Cuentas en la Comandera Móvil**

El mozo puede ejecutar la división de la comanda directamente al pie de la mesa bajo tres modalidades:

1. **División Equitativa (Por Comensales):** Cálculo automático dividiendo el total neto entre *N* personas (*Total / N*), generando sub-tickets independientes para cobro rápido.  
2. **División por Ítems Consumidos (Consumo Individual):** El mozo asigna visualmente qué líneas de comanda corresponden a cada pagador (ej. Comensal 1 paga el bife y la copa de vino; Comensal 2 paga la ensalada y el agua).  
3. **División por Montos Libres / Pagos Mixtos:** Permite registrar cobros parciales con distintos medios de pago hasta saldar el balance total de la comanda (ej. ₲ 100.000 en Efectivo \+ ₲ 150.000 con Tarjeta).

## **7.2. Protocolo de Custodia Temporal y Rendición a Caja (*Waiter Custody & Cashier Handover*)**

Para resolver el problema del cobro en mesa sin desfasar el arqueo de la caja física central:

```
[Mozo cobra en Mesa]
  ├── Registra pago en móvil (Efectivo / Voucher POS portátil)
  ├── Mesa pasa a estado: SETTLED_BY_WAITER (Saldo $0, dinero en custodia del mozo)
  └── Emite 'WaiterHandoverTicket' con código de rendición
                 │
                 ▼
[Mozo entrega dinero y comprobantes en Caja]
  ├── Cajero abre panel: "Cobros Pendientes de Rendición por Mozo"
  ├── Visualiza desglose: Mozo Juan -> ₲ 200.000 Efectivo + ₲ 100.000 Tarjeta
  └── Cajero pulsa [Confirmar Recepción e Ingresar a Caja]
                 │
                 ▼
[Impacto Atómico en PosSession]
  ├── El dinero ingresa formalmente a la sesión de caja del cajero
  ├── Se emite la factura legal electrónica definitiva (FacturaSend / SIFEN)
  └── Orden pasa a estado: FULLY_CLOSED
```

# **8\. Transferencia de Mesas, Fusión y Matriz de Permisos Granulares (RBAC)**

## **8.1. Operaciones de Salón**

* **Transferencia Total de Mesa:** Mueve la comanda completa de una mesa a otra libre (ej. Mesa 4 a Mesa 12).  
* **Transferencia Parcial de Ítems:** Mueve únicamente ciertos productos de una comanda a otra mesa existente.  
* **Fusión de Mesas (*Merge Tables*):** Unifica dos mesas ocupadas en una sola cuenta consolidada.  
* **Actualización en KDS:** Al transferir o fusionar mesas, el backend emite un evento WebSocket inmediato a las pantallas de cocina para actualizar el número de mesa en todos los tickets en preparación.

## **8.2. Matriz de Permisos de Seguridad para Personal de Salón**

| Clave de Permiso | Descripción | Comportamiento si está Deshabilitado |
| :---- | :---- | :---- |
| `POS_TRANSFER_TABLE` | Permite cambiar una orden de mesa | Requiere ingreso de PIN de Administrador/Supervisor en la app móvil. |
| `POS_TRANSFER_ITEMS` | Permite transferir platos específicos entre mesas | Requiere PIN de Supervisor. |
| `POS_MERGE_TABLES` | Permite fusionar dos mesas ocupadas | Requiere PIN de Supervisor. |
| `POS_SPLIT_BILL` | Permite dividir cuentas en mesa | Bloqueado para el mozo; debe solicitarse en caja. |
| `POS_APPLY_DISCOUNT` | Permite aplicar descuentos manuales o cortesías | Requiere PIN de Supervisor con registro del motivo. |
| `POS_VOID_LINE` | Permite anular un plato ya enviado a cocina | Requiere PIN de Supervisor y genera notificación de merma/alerta en KDS. |

## **8.3. Auditoría de Sobreescritura por PIN (*Supervisor Override*)**

Cuando un mozo sin permisos requiere realizar una acción restringida, el sistema despliega un modal de autenticación rápida por PIN de 4 dígitos. Al validarse, la transacción guarda en `PosOrderAuditLog` el `userId` del mozo solicitante, el `supervisorId` que autorizó y el motivo de la operación.

# **9\. Sistema de Comensales por Silla y Punto Pivote (Seat-Level Ordering & Pivot Points)**

## **9.1. Principio Operativo del Punto Pivote**

En la gastronomía de alto estándar, el personal no debe "subastar la comida" al llegar a la mesa (*"¿Quién pidió el bife?", "¿De quién es el cappuccino descafeinado?"*). OmniFlow estandariza el sistema de **Punto Pivote (Pivot Point)**:

* **Silla 1 (Punto Pivote):** Siempre es la silla orientada hacia la entrada principal o punto de referencia del salón.  
* **Secuencia Horaria:** Las demás sillas se numeran correlativamente (1, 2, 3, ..., *$N$*) en el sentido de las agujas del reloj.  
* **Ítems Compartidos (**`seatNumber: 0` / `isShared: true`): Platos al centro de la mesa (ej. tabla de quesos, botella de vino) que pertenecen a la mesa en su conjunto.

## **9.2. División de Cuentas Instantánea y Reasignación Dinámica**

* **Pre-agrupación Nativa:** Al solicitar la cuenta, el sistema ya tiene calculados los subtotales individuales por silla sin que el mozo tenga que hacer memoria.  
* **Prorrateo de Ítems Compartidos:** Los ítems de mesa (`seatNumber: 0`) pueden prorratearse equitativamente entre los *$N$* comensales o asignarse a una silla específica con un solo toque.  
* **Reasignación Visual (*Drag & Drop*):** Si el Comensal 1 decide invitar el postre del Comensal 3, el mozo simplemente arrastra el ítem de la Silla 3 a la Silla 1 en la pantalla antes de liquidar el cobro.

# **10\. Arquitectura de Invitaciones Cruzadas entre Mesas (Cross-Table Gifting Engine)**

## **10.1. Desacoplamiento de Facturación y Entrega**

Este caso de uso resuelve el escenario donde un cliente de la **Mesa A** (ej. Mesa 4, Silla 2\) decide invitar un trago o plato a un cliente de la **Mesa B** (ej. Mesa 9, Silla 1).

```
                      [MESA 4 (Silla 2) PIDE GIN TONIC PARA MESA 9]
                                            │
                                            ▼
                    ┌───────────────────────────────────────────────┐
                    │               PosOrderLine                    │
                    │ - orderId: Mesa 4 (Mesa Pagadora / Origen)    │
                    │ - isGift: true                                │
                    │ - targetTableNumber: "Mesa 9"                 │
                    │ - targetSeatNumber: 1                         │
                    │ - giftMessage: "De parte de Juan (Mesa 4)"    │
                    └───────────────────────┬───────────────────────┘
                                            │
                    ┌───────────────────────┴───────────────────────┐
                    │                                               │
                    ▼                                               ▼
     [KDS / TICKET DE BARRA & RUNNER]                  [ESTADO EN PRE-CUENTAS]
  - Destino Físico: MESA 9 (Silla 1)            - Mesa 4: Se cobra el Gin Tonic (100%).
  - Producto: 1x Gin Tonic Especial             - Mesa 9: Aparece como línea informativa
  - Nota en KDS: * INVITACIÓN DE MESA 4 *                 con saldo ₲ 0 (Cortesía Mesa 4).
```

## **10.2. Reglas Contables y de Inventario en Invitaciones Cruzadas**

1. **Cobro y Facturación:** El importe y los impuestos del ítem se consolidan exclusivamente en la comanda de la **Mesa 4**.  
2. **Kardex / BoM:** La materia prima (Gin, Tónica, Botánicos) se descuenta de forma atómica en el momento de la confirmación/despacho, independientemente de la mesa de destino.  
3. **Visibilidad en Mesa Receptora:** En la pre-cuenta o pantalla de la Mesa 9 se imprime/muestra el ítem con precio ₲ 0 y la leyenda: *"1x Gin Tonic Especial (Invitación / Cortesía de Mesa 4)"*, evitando cobros duplicados y dando claridad al comensal homenajeado.

# **11\. Extensión del Modelo de Datos Prisma (Sillas e Invitaciones)**

```
model PosOrderLine {
  id                  String               @id @default(cuid())
  tenantId            String
  orderId             String
  order               PosOrder             @relation(fields: [orderId], references: [id], onDelete: Cascade)
  variantId           String
  quantity            Decimal              @db.Decimal(10, 3)
  unitPrice           Decimal              @db.Decimal(12, 2)
  costAtSale          Decimal              @db.Decimal(12, 2)
  discountPercent     Decimal              @db.Decimal(5, 2)  @default(0)
  subtotal            Decimal              @db.Decimal(12, 2)

  // 1. Asignación por Comensal / Silla
  seatNumber          Int                  @default(1) // 1..N (0 = Compartido / Mesa)
  isShared            Boolean              @default(false)

  // 2. Invitaciones Cruzadas entre Mesas
  isGift              Boolean              @default(false)
  targetTableNumber   String?              // Mesa de entrega física
  targetSeatNumber    Int?                 // Silla de entrega física
  giftMessage         String?              // Mensaje de dedicatoria / origen

  note                String?
  modifiers           PosLineModifier[]
  stockMoves          StockMove[]
  kitchenLines        KitchenTicketLine[]
  createdAt           DateTime             @default(now())

  @@index([tenantId, orderId, seatNumber])
  @@index([tenantId, targetTableNumber])
}

model KitchenTicketLine {
  id                  String               @id @default(cuid())
  ticketId            String
  ticket              KitchenTicket        @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  orderLineId         String
  orderLine           PosOrderLine         @relation(fields: [orderLineId], references: [id], onDelete: Cascade)
  productName         String
  variantName         String?
  quantity            Decimal              @db.Decimal(10, 3)
  modifiersText       String?

  // Datos para el Despachador / Runner
  seatNumber          Int                  @default(1)
  deliveryTableNumber String?              // Si es invitación, indica la mesa real de entrega
  deliverySeatNumber  Int?
  giftBannerText      String?              // Ej: "★ INVITACIÓN DE MESA 4 ★"
  isCompleted         Boolean              @default(false)
}
```

