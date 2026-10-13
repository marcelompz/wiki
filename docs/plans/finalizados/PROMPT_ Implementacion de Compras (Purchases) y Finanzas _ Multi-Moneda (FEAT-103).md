# **Prompt Maestro de Ingeniería de Software: Módulos de Compras (Purchases) y Finanzas / Tesorería (FEAT-103)**

Especificación Técnica de Arquitectura, Modelado de Datos y Lógica de Negocio  Ecosistema: OrderFlow SaaS (NestJS \+ Prisma ORM \+ PostgreSQL \+ Redis / BullMQ \+ React 18 / Refine.dev / Ant Design \+ Traefik v3.4)  Características: 

- Gestión de Compras e Insumos (Proveedores, Órdenes de Compra, Recepción, UoM & Kardex)

- FEAT-103: Finanzas & Tesorería Operativa (Cuentas por Pagar AP, Egresos/Ingresos POS Cash-Out, Flujo de Caja y Consolidación Multi-Moneda vía CurrencyService)  Fecha: Agosto 2026  Estado: Aprobado para Desarrollo

---

## **🎯 1\. Rol y Contexto del Sistema**

Actúas como Lead Full-Stack & System Architect de OrderFlow. Tu objetivo es implementar de manera modular y desacoplada el ciclo completo de aprovisionamiento y finanzas operativas en el monorepo oficial (backend/ y frontend/).

Integración Multi-Moneda Existente: El sistema YA cuenta con un motor centralizado de divisas (CurrencyService en backend/src/common/services/currency.service.ts / CurrencyModule) con soporte para caché en memoria, cotizaciones en tiempo real y moneda base por tenant (tenant.currency, por defecto PYG, o ARS/USD/BRL/EUR). Los nuevos módulos de Compras y Finanzas deben consumir e inyectar directamente CurrencyService, evitando duplicación de tablas de cotizaciones.

---

## **🛡️ 2\. Reglas Inviolables de Arquitectura**

1. Multi-Tenant Estricto: Toda tabla, entidad, consulta, mutación y evento DEBE incluir y filtrar explícitamente por tenantId (compatible con @TenantPrisma() y el aislamiento multi-tier).

2. Integridad de Inventario (Doble Entrada): La recepción de mercaderías NUNCA incrementa contadores planos; debe invocar InventoryService.executeStockMove() transfiriendo stock desde la ubicación virtual de origen (SUPPLIER / Virtual/Vendors) hacia la bodega física (INTERNAL / Warehouse/Stock), recalculando el costo promedio ponderado (unitCost).

3. Consumo de CurrencyService (Multi-Moneda FEAT-103):

   1. En compras y gastos en moneda extranjera, obtener la tasa con CurrencyService.getExchangeRate(tenantId, from, to) y congelar exchangeRate en la transacción.

   2. Calcular y persistir el equivalente en moneda base (baseAmount / baseTotalAmount) usando CurrencyService.convertAmount().

   3. Precisión numérica: Decimal(14, 2\) para montos/costos, Decimal(12, 6\) para UoM y Decimal(14, 6\) para tasas de cambio.

4. Desacoplamiento de Eventos: Las recepciones de compra y pagos emiten eventos de dominio en el EventBus (PurchaseOrderReceivedEvent, SupplierBillPaidEvent, CashMovementCreatedEvent).

5. Prohibido new PrismaClient(): Inyectar PrismaService mediante DI.

---

## **📐 3\. Esquema de Base de Datos (backend/prisma/schema.prisma)**

```
// ==========================================
// ENUMS
// ==========================================
  
enum PurchaseOrderStatus {
  DRAFT
  SENT
  RECEIVED_PARTIAL
  RECEIVED
  CANCELLED
}
  
enum BillPaymentStatus {
  PENDING
  PARTIAL
  PAID
  CANCELLED
}
  
enum CashMovementType {
  INFLOW
  OUTFLOW
}
  
enum CashCategory {
  PURCHASE_SUPPLIER
  OPERATIONAL_EXPENSE
  POS_CASH_OUT
  POS_CASH_IN
  SERVICE_PAYMENT
  OTHER
}
  
// ==========================================
// 1. PROVEEDORES Y COMPRAS
// ==========================================
  
model Supplier {
  id              String          @id @default(uuid()) @db.Uuid
  tenantId        String          @map("tenant_id") @db.Uuid
  name            String          @db.VarChar(255)
  taxId           String?         @map("tax_id") @db.VarChar(50) // RUC / DNI / CIF
  email           String?         @db.VarChar(255)
  phone           String?         @db.VarChar(50)
  address         String?         @db.Text
  paymentTerms    Int             @default(0) @map("payment_terms") // Días de crédito
  defaultCurrency String          @default("PYG") @map("default_currency") @db.VarChar(3)
  isActive        Boolean         @default(true) @map("is_active")
  createdAt       DateTime        @default(now()) @map("created_at")
  updatedAt       DateTime        @updatedAt @map("updated_at")
  
  purchaseOrders  PurchaseOrder[]
  bills           SupplierBill[]
  tenant          Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@index([tenantId])
  @@index([tenantId, taxId])
  @@map("suppliers")
}
  
model PurchaseOrder {
  id                    String              @id @default(uuid()) @db.Uuid
  tenantId              String              @map("tenant_id") @db.Uuid
  orderNumber           String              @map("order_number") @db.VarChar(50) // ej: OC-2026-0001
  supplierId            String              @map("supplier_id") @db.Uuid
  status                PurchaseOrderStatus @default(DRAFT)
  issueDate             DateTime            @default(now()) @map("issue_date")
  expectedDate          DateTime?           @map("expected_date")
  currency              String              @default("PYG") @db.VarChar(3)
  exchangeRate          Decimal             @default(1.000000) @map("exchange_rate") @db.Decimal(14, 6)
  
  subtotal              Decimal             @db.Decimal(14, 2)
  taxAmount             Decimal             @default(0.00) @map("tax_amount") @db.Decimal(14, 2)
  totalAmount           Decimal             @map("total_amount") @db.Decimal(14, 2)
  baseTotalAmount       Decimal             @map("base_total_amount") @db.Decimal(14, 2) // Equivalente en moneda base
  
  destinationLocationId String?             @map("destination_location_id") @db.Uuid
  notes                 String?             @db.Text
  receivedAt            DateTime?           @map("received_at")
  createdAt             DateTime            @default(now()) @map("created_at")
  updatedAt             DateTime            @updatedAt @map("updated_at")
  
  supplier              Supplier            @relation(fields: [supplierId], references: [id])
  items                 PurchaseOrderItem[]
  bills                 SupplierBill[]
  tenant                Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@unique([tenantId, orderNumber])
  @@index([tenantId, supplierId])
  @@index([tenantId, status])
  @@map("purchase_orders")
}
  
model PurchaseOrderItem {
  id                String        @id @default(uuid()) @db.Uuid
  tenantId          String        @map("tenant_id") @db.Uuid
  purchaseOrderId   String        @map("purchase_order_id") @db.Uuid
  productId         String        @map("product_id") @db.Uuid
  uomId             String?       @map("uom_id") @db.Uuid // Unidad de compra (ej: Saco 50kg)
  uomFactor         Decimal       @default(1.000000) @map("uom_factor") @db.Decimal(12, 6) // Ratio a unidad base de stock
  
  quantityOrdered   Decimal       @map("quantity_ordered") @db.Decimal(12, 6)
  quantityReceived  Decimal       @default(0.000000) @map("quantity_received") @db.Decimal(12, 6)
  unitCost          Decimal       @map("unit_cost") @db.Decimal(14, 2)
  totalCost         Decimal       @map("total_cost") @db.Decimal(14, 2)
  
  purchaseOrder     PurchaseOrder @relation(fields: [purchaseOrderId], references: [id], onDelete: Cascade)
  product           Product       @relation(fields: [productId], references: [id])
  tenant            Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@index([tenantId, purchaseOrderId])
  @@map("purchase_order_items")
}
  
// ==========================================
// 2. FINANZAS Y TESORERÍA OPERATIVA (FEAT-103)
// ==========================================
  
model SupplierBill {
  id              String            @id @default(uuid()) @db.Uuid
  tenantId        String            @map("tenant_id") @db.Uuid
  supplierId      String            @map("supplier_id") @db.Uuid
  purchaseOrderId String?           @map("purchase_order_id") @db.Uuid
  billNumber      String            @map("bill_number") @db.VarChar(100) // Factura legal proveedor
  
  currency        String            @default("PYG") @db.VarChar(3)
  exchangeRate    Decimal           @default(1.000000) @map("exchange_rate") @db.Decimal(14, 6)
  amount          Decimal           @db.Decimal(14, 2)
  baseAmount      Decimal           @map("base_amount") @db.Decimal(14, 2)
  amountPaid      Decimal           @default(0.00) @map("amount_paid") @db.Decimal(14, 2)
  
  issueDate       DateTime          @default(now()) @map("issue_date")
  dueDate         DateTime          @map("due_date")
  status          BillPaymentStatus @default(PENDING)
  notes           String?           @db.Text
  createdAt       DateTime          @default(now()) @map("created_at")
  updatedAt       DateTime          @updatedAt @map("updated_at")
  
  supplier        Supplier          @relation(fields: [supplierId], references: [id])
  purchaseOrder   PurchaseOrder?    @relation(fields: [purchaseOrderId], references: [id], onDelete: SetNull)
  payments        CashMovement[]
  tenant          Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@index([tenantId, supplierId])
  @@index([tenantId, dueDate])
  @@index([tenantId, status])
  @@map("supplier_bills")
}
  
model CashMovement {
  id              String            @id @default(uuid()) @db.Uuid
  tenantId        String            @map("tenant_id") @db.Uuid
  type            CashMovementType
  category        CashCategory      @default(OPERATIONAL_EXPENSE)
  
  currency        String            @default("PYG") @db.VarChar(3)
  exchangeRate    Decimal           @default(1.000000) @map("exchange_rate") @db.Decimal(14, 6)
  amount          Decimal           @db.Decimal(14, 2)
  baseAmount      Decimal           @map("base_amount") @db.Decimal(14, 2)
  
  paymentMethod   String            @map("payment_method") @db.VarChar(50) // CASH, TRANSFER, CARD, CHEQUE
  supplierBillId  String?           @map("supplier_bill_id") @db.Uuid
  posSessionId    String?           @map("pos_session_id") @db.Uuid // Vinculado al arqueo de caja POS
  notes           String?           @db.Text
  registeredBy    String?           @map("registered_by") @db.VarChar(255)
  createdAt       DateTime          @default(now()) @map("created_at")
  
  supplierBill    SupplierBill?     @relation(fields: [supplierBillId], references: [id], onDelete: SetNull)
  tenant          Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@index([tenantId, type])
  @@index([tenantId, category])
  @@index([tenantId, createdAt])
  @@map("cash_movements")
}
```

---

## **🏗️ 4\. Estructura Modular del Backend**

```
backend/src/
├── common/services/
│   └── currency.service.ts              # Servicio multimoneda existente (reutilizado)
│
├── purchases/
│   ├── purchases.manifest.json          # Manifiesto slug: "omni-purchases"
│   ├── purchases.module.ts              # Importa CurrencyModule e InventoryModule
│   ├── controllers/
│   │   ├── suppliers.controller.ts      # CRUD de Proveedores
│   │   └── purchases.controller.ts      # POs y Recepción
│   ├── services/
│   │   ├── suppliers.service.ts
│   │   └── purchases.service.ts         # Recepción, UoM e InventoryService.executeStockMove()
│   └── dto/
│       ├── create-supplier.dto.ts
│       ├── create-purchase-order.dto.ts
│       └── receive-purchase-order.dto.ts
│
└── finance/                             # Módulo FEAT-103
    ├── finance.manifest.json            # Manifiesto slug: "omni-finance"
    ├── finance.module.ts                # Importa CurrencyModule
    ├── controllers/
    │   ├── bills.controller.ts          # Cuentas por Pagar (AP)
    │   └── cash-flow.controller.ts      # Flujo de Caja y Egresos POS
    ├── services/
    │   ├── bills.service.ts             # Control de saldos y vencimientos
    │   └── cash-flow.service.ts         # Asientos de caja, egresos POS y dashboard
    └── dto/
        ├── create-bill.dto.ts
        ├── pay-bill.dto.ts
        └── create-cash-movement.dto.ts
```

---

## **⚡ 5\. Lógica Crítica de Negocio**

### ***A. Recepción de Compras & Costeo Ponderado (PurchasesService.receiveOrder)***

1. Validar que la orden esté en estado DRAFT, SENT o RECEIVED\_PARTIAL.

2. Para cada ítem recibido:

   - Convertir cantidad a unidad base: qtyBase \= qtyReceived \* uomFactor.

   - Ejecutar InventoryService.executeStockMove():

     * sourceLocationId: Ubicación virtual SUPPLIER (o Virtual/Vendors).

     * destLocationId: Bodega física (INTERNAL / Warehouse/Stock).

     * quantity: qtyBase.

     * reference: Orden de Compra \#${orderNumber}.

   - Convertir costo unitario a moneda base del tenant mediante CurrencyService.convertAmount().

   - Recalcular el costo unitario promedio ponderado del producto en base de datos:

   - $$\\text{Nuevo Costo Base} \= \\frac{(\\text{Stock Actual} \\times \\text{Costo Actual}) \+ (\\text{Cantidad Base} \\times \\text{Costo Compra Base})}{\\text{Stock Actual} \+ \\text{Cantidad Base}}$$

3. Actualizar estado de la orden a RECEIVED (o RECEIVED\_PARTIAL).

4. Si aplica, instanciar automáticamente SupplierBill en estado PENDING.

### ***B. Gestión de Finanzas y Pagos (FEAT-103)***

1. Pago de Factura (BillsService.payBill):

   - Valida que montoPago \<= saldoPendiente.

   - Si la moneda del pago difiere de la factura o de la moneda base, calcula el tipo de cambio vía CurrencyService.getExchangeRate().

   - Crea el registro en CashMovement (type: OUTFLOW, category: PURCHASE\_SUPPLIER).

   - Actualiza amountPaid y el estado a PARTIAL o PAID.

2. Egresos directos desde POS (Cash Out):

   - POST /api/v1/finance/cash-movements recibe posSessionId para registrar salidas de caja menor, afectando el arqueo de cierre diario del POS.

3. Flujo de Caja Consolidado (CashFlowService.getCashFlowSummary):

   - Agrega todos los ingresos y egresos en moneda base del tenant (baseAmount), categorizando compras, gastos operativos y ventas POS.

---

## **🌐 6\. Endpoints de la API REST**

### ***Módulo de Compras***

* GET /api/v1/purchases/suppliers — Listar proveedores.

* POST /api/v1/purchases/suppliers — Crear proveedor.

* GET /api/v1/purchases/orders — Listar órdenes de compra.

* POST /api/v1/purchases/orders — Crear orden de compra en estado DRAFT.

* POST /api/v1/purchases/orders/:id/receive — Recepcionar mercadería (Kardex, UoM y recálculo de costo).

### ***Módulo de Finanzas & Tesorería (FEAT-103)***

* GET /api/v1/finance/bills — Listar cuentas por pagar (semáforo de vencimientos: al día, por vencer, vencidas).

* POST /api/v1/finance/bills — Registrar factura de proveedor manual o asociada a OC.

* POST /api/v1/finance/bills/:id/pay — Registrar pago a factura (asiento en CashMovement).

* POST /api/v1/finance/cash-movements — Registrar egreso/ingreso operativo (incluye Cash Out de POS).

* GET /api/v1/finance/cash-flow/summary — Resumen de flujo de caja consolidado en moneda base.

---

## **🖥️ 7\. Frontend Backoffice (React / Refine.dev)**

1. Vistas de Compras (frontend/src/pages/admin/purchases/):

   - Listado de Órdenes con tags de estado y botón de recepción rápida.

   - Formulario de creación con selector de UoM y cálculo automático en divisa de compra y moneda base.

   - Modal de Recepción de Mercaderías con selección de bodega destino.

2. Vistas de Finanzas (frontend/src/pages/admin/finance/):

   - Tablero de Cuentas por Pagar con semáforo visual de vencimientos.

   - Dashboard de Flujo de Caja y Tesorería consolidado en la moneda principal del tenant.

3. Integración POS (frontend/src/pages/admin/pos.tsx):

   - Modal de "Egreso de Caja (Cash Out)" para compras menores de insumos desde caja registradora.

---

## **✅ 8\. Criterios de Aceptación (DoD)**

1. Migración Limpia: npx prisma migrate dev crea tablas e índices sin errores.

2. Kardex y Costo Exactos: Recepcionar insumos en divisa extranjera con UoM mayorista impacta correctamente StockQuant en la unidad base y recalcula el unitCost en la moneda base del tenant.

3. Arqueo POS Cuadrado: Los egresos de caja menor registrados en el POS descuentan el efectivo disponible del arqueo diario y se reflejan en Tesorería.

4. Reutilización de CurrencyService: Ningún endpoint o servicio duplica lógica de cotizaciones; todas las conversiones utilizan el CurrencyService existente.

5. Cobertura de Pruebas: Tests unitarios para purchases.service.spec.ts, bills.service.spec.ts y cash-flow.service.spec.ts con 100% de aserciones aprobadas.