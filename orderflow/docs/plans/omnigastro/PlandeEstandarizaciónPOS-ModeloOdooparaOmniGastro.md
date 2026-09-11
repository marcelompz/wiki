# **Plan de Estandarización y Desacoplamiento POS: Modelo Odoo para OmniGastro**

**Proyecto:** OmniFlow / OmniGastro Monorepo  
**Objetivo:** Estandarizar el Punto de Venta (POS) como un objeto base universal (Retail / Mostrador) y convertir las funciones de restaurante (mesas, mozos, comandas, salones, KDS) en un complemento extensible activado por configuración por caja/terminal, imitando la arquitectura de point\_of\_sale y pos\_restaurant de Odoo.

&nbsp;

**Referencias:**

&nbsp;

* [Plan Maestro de Transición OmniFlow a OmniGastro.md](https://docs.google.com/document/d/1lUXfZWAZX5evJ4iaLWCIqCJywCnTJoJ9RQi7OgueHHk/edit?usp=drivesdk&ouid=111141920251054124162)  
* [Documentación oficial de Odoo POS Restaurant](https://www.odoo.com/documentation/19.0/applications/sales/point_of_sale/restaurant.html)

# **1\. Diagnóstico y Paradigma de Diseño (El Modelo Odoo)**

En Odoo (v18 / v19), la separación entre punto de venta general y gastronómico se basa en los siguientes principios:

&nbsp;

1. **Núcleo Base (`point_of_sale`)**: Contiene el objeto de configuración de caja (`pos.config`), sesiones (`pos.session`), órdenes (`pos.order`) y líneas de venta (`pos.order.line`). El flujo es directo y rápido: Selección de productos \-\> Carrito / Numpad \-\> Cobro inmediato.  
2. **Módulo de Extensión (`pos_restaurant`)**: No reemplaza al POS ni crea una aplicación paralela. Hereda de `pos.config` agregando el flag `is_restaurant` (`module_pos_restaurant`) y la relación con salones (`floor_ids`).  
3. **Activación Dinámica por Caja**: La misma instalación permite tener cajas minoristas estándar (ej. mostrador de paso, tienda de regalos) y cajas gastronómicas (salón con mesas) según la configuración de cada terminal.

# **2\. Arquitectura de Datos y Backend (NestJS \+ Prisma)**

## **2.1 Modelo de Configuración de Terminales (`PosConfig`)**

Se normaliza el modelo de configuración de caja en Prisma para que el comportamiento gastronómico sea un atributo configurable:model PosConfig {

&nbsp;

  id                  String             @id @default(uuid())

&nbsp;

  tenantId            String

&nbsp;

  name                String

&nbsp;

  code                String

&nbsp;

  isActive            Boolean            @default(true)

&nbsp;

  isDeleted           Boolean            @default(false)

&nbsp;

  deletedAt           DateTime?

&nbsp;

  // Modo operativo (Inspirado en Odoo)

&nbsp;

  isRestaurant        Boolean            @default(false)

&nbsp;

  allowTableSelection Boolean            @default(false)

&nbsp;

  autoOpenTableScreen Boolean            @default(false)

&nbsp;

  // Configuraciones base

&nbsp;

  currencyId          String

&nbsp;

  receiptHeader       String?

&nbsp;

  receiptFooter       String?

&nbsp;

  allowDiscounts      Boolean            @default(true)

&nbsp;

  cashControl         Boolean            @default(true)

&nbsp;

  // Relaciones

&nbsp;

  sessions            PosSession\[\]

&nbsp;

  paymentMethodIds    String\[\]

&nbsp;

  floors              RestaurantFloor\[\]

&nbsp;

  kitchenPrinters     RestaurantPrinter\[\]

&nbsp;

  createdAt           DateTime           @default(now())

&nbsp;

  updatedAt           DateTime           @updatedAt

&nbsp;

  @@unique(\[tenantId, code\])

&nbsp;

  @@index(\[tenantId, isRestaurant\])

&nbsp;

}

## **2.2 Desacoplamiento de Órdenes (`PosOrder` y `PosOrderLine`)**

Los atributos gastronómicos pasan a ser opcionales (nullables), permitiendo ventas directas de mostrador sin requerir mesa ni mozo:model PosOrder {

&nbsp;

  id              String         @id @default(uuid())

&nbsp;

  tenantId        String

&nbsp;

  sessionId       String

&nbsp;

  session         PosSession     @relation(fields: \[sessionId\], references: \[id\], onDelete: Restrict)

&nbsp;

  orderNumber     String

&nbsp;

  status          PosOrderStatus @default(DRAFT)

&nbsp;

  customerId      String?

&nbsp;

  // Extensión gastronómica opcional

&nbsp;

  tableId         String?

&nbsp;

  table           RestaurantTable? @relation(fields: \[tableId\], references: \[id\], onDelete: SetNull)

&nbsp;

  waiterId        String?

&nbsp;

  guestCount      Int?           @default(1)

&nbsp;

  prepStatus      PrepStatus?

&nbsp;

  amountSubtotal  Decimal        @default(0.0)

&nbsp;

  amountTax       Decimal        @default(0.0)

&nbsp;

  amountDiscount  Decimal        @default(0.0)

&nbsp;

  amountTotal     Decimal        @default(0.0)

&nbsp;

  lines           PosOrderLine\[\]

&nbsp;

  payments        PosPayment\[\]

&nbsp;

  createdAt       DateTime       @default(now())

&nbsp;

  updatedAt       DateTime       @updatedAt

&nbsp;

  @@index(\[tenantId, sessionId, status\])

&nbsp;

  @@index(\[tenantId, tableId\])

&nbsp;

}

&nbsp;

model PosOrderLine {

&nbsp;

  id              String         @id @default(uuid())

&nbsp;

  tenantId        String

&nbsp;

  orderId         String

&nbsp;

  order           PosOrder       @relation(fields: \[orderId\], references: \[id\], onDelete: Restrict)

&nbsp;

  productId       String

&nbsp;

  quantity        Decimal

&nbsp;

  unitPrice       Decimal

&nbsp;

  discountPercent Decimal        @default(0.0)

&nbsp;

  priceSubtotal   Decimal

&nbsp;

  priceTotal      Decimal

&nbsp;

  // Atributos gastronómicos opcionales

&nbsp;

  note            String?

&nbsp;

  courseId        String?

&nbsp;

  isPrintedToKds  Boolean        @default(false)

&nbsp;

}

## **2.3 Servicios de Backend**

* **PosCoreService**: Lógica pura de facturación, cálculo de impuestos, descuentos, arqueos de apertura y cierre de caja (X/Z).  
* **GastroPosService**: Extensión que orquesta salones, mesas, división de cuentas (split bill), pre-cuenta y despacho de comandas.  
* **Aislamiento Multi-Tenant**: Inyección mediante `@TenantPrisma()` y soft-delete universal.

# **3\. Arquitectura Frontend (React \+ TypeScript \+ Tailwind)**

## **3.1 Distribución del Layout (Inspirado en Odoo POS)**

* **Barra Superior (Navbar)**: Identificación de caja, estado de conexión, cajero y, si está en modo gastronómico, acceso directo al plano de mesas y mesa activa.  
* **Panel Izquierdo (Ticket & Control)**:  
  * Listado de líneas del ticket con cantidades y totales.  
  * ActionPad con selección de cliente y botón de pago.  
  * NumPad táctil (cantidades, porcentajes de descuento, precio unitario, borrado).  
  * Bloque de botones gastronómicos condicionales (`Comanda`, `Dividir`, `Pre-cuenta`, `Transferir`).  
* **Panel Derecho (Catálogo)**: Barra de búsqueda reactiva, navegación por pestañas de categorías y cuadrícula de tarjetas de productos táctiles.

## **3.2 Separación de Estado (Stores de Zustand / Context)**

* **usePosStore**: Estado del carrito, sesión de caja, catálogo de productos y teclado numérico.  
* **useGastroStore**: Gestión reactiva de salones (`floors`), mesas (`tables`), comensales y estados de preparación.

# **4\. Activación por Configuración en Terminales**

1. **Panel Administrativo**: Cada terminal creada en el sistema tiene un switch booleano `isRestaurant`. Al activarse, se configuran los salones y periféricos asociados.  
2. **Inicialización de Frontend**: Al abrir la caja, el cliente evalúa `posConfig.isRestaurant`:  
   * Si es `false`, navega directo a la pantalla de venta minorista (`/pos/terminal`).  
   * Si es `true`, abre la vista de plano de mesas (`/pos/floors`) y activa los servicios de WebSocket para mesas y KDS.

# **5\. Plan de Ejecución en 5 Fases**

## **Fase 1: Esquema Prisma y Migración**

Implementar `PosConfig.isRestaurant` y convertir `tableId` y `waiterId` en opcionales dentro de `PosOrder`.

## **Fase 2: Servicios de Backend NestJS**

Desacoplar PosCoreService para ventas directas y crear GastroPosService para la gestión de salón.

## **Fase 3: Refactorización de Estado en Frontend**

Dividir el store global en usePosStore (core) y useGastroStore (extensión).

## **Fase 4: Layout y Teclado Táctil**

Estandarizar la interfaz según el patrón visual de Odoo (Ticket \+ Numpad a la izquierda, Catálogo a la derecha) con inyección condicional de acciones gastronómicas.

## **Fase 5: Validación y QA**

Pruebas de funcionamiento paralelo en un mismo tenant operando una caja retail y una caja gastronómica.

&nbsp;

---

&nbsp;

Aprobado por: Person  
Fecha de Revisión: Date