# **Plan Maestro de Transición: OmniFlow a OmniGastro (Toast POS Standard)**

**Fecha de elaboración:** 2 de septiembre de 2026  
**Autor:** Arquitectura de Soluciones Cloud & Consultoría de Producto  
**Proyecto Base:** OmniFlow / OrderFlow Monorepo (v1.20.24)  
**Objetivo:** Crear la rama y suite gastronómica especializada `OmniGastro`, alcanzando convergencia funcional y técnica con el estándar de mercado fijado por Toast POS, blindando de manera transversal la base de datos contra borrados y pérdidas accidentales de datos.

---

## **0\. Eje Transversal: Blindaje contra Pérdida y Corrupción de Datos (Gap Crítico)**

Basado en la auditoría técnica de vulnerabilidades de backend, este eje actúa como requisito previo y transversal no negociable para toda la rama `OmniGastro`. Ningún módulo de restauración entrará a producción sin cumplir estas tres salvaguardas:

### ***0.1. Eliminación Definitiva de `db push --accept-data-loss`***

* **Vulnerabilidad Actual:** El script de arranque en Docker ejecuta `prisma db push --accept-data-loss`, lo que ante cambios de esquema en despliegues destruye tablas o columnas en producción sin control de versiones.  
* **Directiva de Mitigación:**  
  1. Modificar el `entrypoint.sh` de producción para prohibir `db push`. Sustituirlo obligatoriamente por:  
     npx prisma migrate deploy

  2. Implementar un step obligatorio en GitHub Actions que valide que todo PR hacia `product/omnigastro` incluya su archivo de migración SQL bajo `prisma/migrations/YYYYMMDDHHMMSS_*.sql`.  
  3. En entornos de staging/local se utilizará `npx prisma migrate dev`, garantizando migraciones incrementales, trazables y reproducibles.

### ***0.2. Lógica de Soft-Delete Universal y Eliminación de `onDelete: Cascade`***

* **Vulnerabilidad Actual:** Las relaciones entre `Tenant` y entidades hijas en Prisma definen `onDelete: Cascade`. Un hard-delete accidental desde el panel administrativo elimina irreversiblemente todas las comandas, cartas, transacciones y configuraciones del restaurante.  
* **Directiva de Mitigación:**  
  1. Reemplazar `onDelete: Cascade` en entidades raíz por `onDelete: Restrict`.  
  2. Normalizar campos de ciclo de vida en todos los modelos:  
     isActive   Boolean   @default(true)

     isDeleted  Boolean   @default(false)

     deletedAt  DateTime?

  3. Implementar una extensión de Prisma Client (`$extends`) en `@omnigastro/database`:  
     - Intercepta consultas de lectura (`findMany`, `findFirst`, `count`) inyectando `where: { isDeleted: false }`.  
     - Transforma las mutaciones `delete` y `deleteMany` en un `update` que asigna `isDeleted: true` y `deletedAt: new Date()`.  
  4. Política de Retención: Establecer un periodo de cuarentena de 30 días para tenants dados de baja, permitiendo la restauración inmediata ante error operativo humano.

### ***0.3. Aislamiento Multi-Tier Estricto con `@TenantPrisma()`***

* **Vulnerabilidad Actual:** Varios servicios del backend aún inyectan el singleton `this.prisma` (apuntando a la base compartida). Si un restaurante Enterprise es migrado a una base de datos dedicada (*Dedicated DB*), sus operaciones se continúan registrando en la base compartida, produciendo fugas de datos y pérdidas de stock.  
* **Directiva de Mitigación:**  
  1. Prohibir el uso del singleton global `PrismaService` en los controladores y servicios de `OmniGastro`.  
  2. Todos los repositorios y servicios deben recibir el cliente de base de datos resuelto dinámicamente mediante `TenantConnectionManager` a través del decorador `@TenantPrisma()`.  
  3. Regla de linter interna (ESLint) que bloquea el merge de cualquier servicio gastronómico que inyecte `PrismaService` directamente en su constructor.

---

## **1\. Estrategia de Branching y Arquitectura en el Monorepo**

### ***1.1. Flujo de Ramas en Git***

main (OmniFlow Core v1.20.24)

  └── develop

        └── product/omnigastro (Rama principal de la suite gastronómica)

              ├── feat/gastro-00-safeguards-and-softdelete

              ├── feat/gastro-01-core-tables-and-tabs

              ├── feat/gastro-02-modifiers-and-86ing

              ├── feat/gastro-03-cashier-sessions-xz

              ├── feat/gastro-04-kds-coursing

              └── feat/gastro-05-hardware-bridge-tauri

### ***1.2. Topología de Paquetes en el Monorepo***

* `apps/omnigastro-pos/`: Aplicación de Punto de Venta web y empaquetada en Tauri para salón.  
* `apps/omnigastro-kds/`: Interfaz táctil de cocina en tiempo real con Socket.io.  
* `packages/gastro-schema/`: Esquema de Prisma, extensiones de soft-delete y tipos generados.  
* `apps/api/src/modules/gastro/`:  
  * `dining-room/`: Salones, planos de mesas y comensales.  
  * `tabs/`: Cuentas activas, comandas y órdenes fraccionadas.  
  * `menu-engine/`: Modificadores, suplementos y control de agotados (*86ing*).  
  * `cashier/`: Arqueos de caja, reportes X y Z.  
  * `shifts/`: Control horario (*clock-in/out*) y propinas.

---

## **2\. Definición del Esquema Prisma Normalizado (`schema.prisma`)**

// Roles gastronómicos de salón y cocina

enum HospitalityRole {

  SUPERADMIN

  RESTAURANT\_MANAGER

  MAITRE\_D

  WAITER

  BARTENDER

  HEAD\_CHEF

  LINE\_COOK

  CASHIER

  HOST

}

// Estados del salón y mesas

enum TableStatus {

  AVAILABLE

  OCCUPIED

  RESERVED

  CLEANING

}

// Estados de la cuenta abierta

enum TabStatus {

  OPEN

  PRINTED\_PRE\_BILL

  SPLIT\_PENDING

  SETTLED

  VOIDED

}

// Tiempos de cocina (Coursing)

enum CourseStage {

  BEVERAGES

  APPETIZERS

  MAINS

  DESSERTS

}

// Estados de preparación en KDS

enum PrepStatus {

  HOLD

  FIRED

  IN\_PREPARATION

  READY

  SERVED

  VOIDED

}

model DiningArea {

  id          String            @id @default(uuid())

  tenantId    String

  name        String            // "Terraza", "Salón Principal", "VIP"

  tables      RestaurantTable\[\]

  isDeleted   Boolean           @default(false)

  deletedAt   DateTime?

  tenant      Tenant            @relation(fields: \[tenantId\], references: \[id\], onDelete: Restrict)

}

model RestaurantTable {

  id           String         @id @default(uuid())

  tenantId     String

  areaId       String

  number       Int

  capacity     Int            @default(4)

  status       TableStatus    @default(AVAILABLE)

  currentTabId String?        @unique

  isDeleted    Boolean        @default(false)

  deletedAt    DateTime?

  area         DiningArea     @relation(fields: \[areaId\], references: \[id\], onDelete: Restrict)

  currentTab   TableSession?  @relation("ActiveTableTab", fields: \[currentTabId\], references: \[id\])

}

model TableSession {

  id             String          @id @default(uuid())

  tenantId       String

  tableId        String

  openedByUserId String

  openedAt       DateTime        @default(now())

  closedAt       DateTime?

  status         TabStatus       @default(OPEN)

  coversCount    Int             @default(1)

  subtotal       Decimal         @default(0) @db.Decimal(12, 2\)

  discountTotal  Decimal         @default(0) @db.Decimal(12, 2\)

  tipAmount      Decimal         @default(0) @db.Decimal(12, 2\)

  total          Decimal         @default(0) @db.Decimal(12, 2\)

  isDeleted      Boolean         @default(false)

  deletedAt      DateTime?

  table          RestaurantTable? @relation("ActiveTableTab")

  rounds         OrderRound\[\]

  payments       TabPayment\[\]

}

model OrderRound {

  id             String         @id @default(uuid())

  sessionId      String

  roundNumber    Int            @default(1)

  firedAt        DateTime       @default(now())

  isDeleted      Boolean        @default(false)

  deletedAt      DateTime?

  session        TableSession   @relation(fields: \[sessionId\], references: \[id\], onDelete: Restrict)

  items          GastroItem\[\]

}

model GastroItem {

  id             String             @id @default(uuid())

  roundId        String

  productId      String

  course         CourseStage        @default(MAINS)

  status         PrepStatus         @default(FIRED)

  quantity       Int                @default(1)

  unitPrice      Decimal            @db.Decimal(12, 2\)

  notes          String?

  isDeleted      Boolean            @default(false)

  deletedAt      DateTime?

  round          OrderRound         @relation(fields: \[roundId\], references: \[id\], onDelete: Restrict)

  modifiers      SelectedModifier\[\]

}

model ModifierGroup {

  id           String             @id @default(uuid())

  tenantId     String

  name         String             // "Punto de Cocción", "Guarnición", "Extras"

  minSelect    Int                @default(0)

  maxSelect    Int                @default(1)

  isRequired   Boolean            @default(false)

  isDeleted    Boolean            @default(false)

  deletedAt    DateTime?

  options      ModifierOption\[\]

  products     ProductModifier\[\]

}

model ModifierOption {

  id           String             @id @default(uuid())

  groupId      String

  name         String             // "A punto", "Papas rústicas", "Extra queso"

  priceExtra   Decimal            @default(0) @db.Decimal(12, 2\)

  is86ed       Boolean            @default(false)

  isDeleted    Boolean            @default(false)

  deletedAt    DateTime?

  group        ModifierGroup      @relation(fields: \[groupId\], references: \[id\], onDelete: Restrict)

  selections   SelectedModifier\[\]

}

model ProductModifier {

  productId       String

  modifierGroupId String

  group           ModifierGroup   @relation(fields: \[modifierGroupId\], references: \[id\], onDelete: Restrict)

  @@id(\[productId, modifierGroupId\])

}

model SelectedModifier {

  id           String             @id @default(uuid())

  itemId       String

  optionId     String

  priceCharged Decimal            @db.Decimal(12, 2\)

  item         GastroItem         @relation(fields: \[itemId\], references: \[id\], onDelete: Restrict)

  option       ModifierOption     @relation(fields: \[optionId\], references: \[id\], onDelete: Restrict)

}

model CashDrawerSession {

  id             String         @id @default(uuid())

  tenantId       String

  cashierUserId  String

  openedAt       DateTime       @default(now())

  closedAt       DateTime?

  openingBalance Decimal        @db.Decimal(12, 2\)

  expectedCash   Decimal?       @db.Decimal(12, 2\)

  actualCash     Decimal?       @db.Decimal(12, 2\)

  cashVariance   Decimal?       @db.Decimal(12, 2\)

  reportXData    Json?

  reportZData    Json?

  isClosed       Boolean        @default(false)

  isDeleted      Boolean        @default(false)

  deletedAt      DateTime?

}

model TabPayment {

  id             String         @id @default(uuid())

  sessionId      String

  amount         Decimal        @db.Decimal(12, 2\)

  tipPortion     Decimal        @default(0) @db.Decimal(12, 2\)

  paymentMethod  String         // CASH, CARD, QR, TRANSFER

  authCode       String?

  paidAt         DateTime       @default(now())

  isDeleted      Boolean        @default(false)

  deletedAt      DateTime?

  session        TableSession   @relation(fields: \[sessionId\], references: \[id\], onDelete: Restrict)

}

---

## **3\. Hoja de Ruta de Implementación (4 Fases de Convergencia)**

### ***Fase 1: El Núcleo Gastronómico y Resiliencia FOH (Q1)***

* **Objetivo:** Convertir el POS actual en un sistema operativo de salón y cocina resiliente.  
* **Hitos:**  
  1. Despliegue de candados de base de datos (CI/CD sin `--accept-data-loss` y extensión Soft-Delete).  
  2. Implementación de Salones (`DiningArea`) y Mesas (`RestaurantTable`) con mapa visual de salón.  
  3. Motor de Cuentas Abiertas (`TableSession`) con envío de comandas fraccionadas a cocina.  
  4. Desacoplamiento del KDS para soportar `CourseStage` (tiempos de servicio: Bebidas, Entradas, Fuertes, Postres).  
  5. Migración de modificadores desde JSONB a tablas relacionales normalizadas con propagación de estado 86 (agotados) en Redis.  
  6. Adaptación de roles RBAC para camareros, cocineros y jefes de sala.

### ***Fase 2: Control de Turnos, Propinas y Arqueos Fiscales (Q2)***

* **Objetivo:** Blindar la integridad financiera de caja y mano de obra diaria.  
* **Hitos:**  
  1. Ciclo de vida de Caja: Apertura con fondo inicial, registro de cobros parciales/totales y arqueo ciego.  
  2. Emisión de Reporte X (corte informativo durante el turno sin bloqueo) y Reporte Z (cierre formal e irreversible de jornada).  
  3. División de Cuentas (*Split-Bill*): pago equitativo, por producto específico o por asiento.  
  4. Motor de Propinas (*Tip Pool*): retención, asignación directa al camarero o distribución equitativa de propinas.  
  5. Registro de entrada y salida de personal (*Clock-in / Clock-out*) desde terminales táctiles para cálculo del ratio costo laboral/ventas.

### ***Fase 3: Ecosistema Periférico, Bridge Nativo y Pagos (Q3)***

* **Objetivo:** Lograr paridad con el hardware integrado y procesamiento ininterrumpido de Toast.  
* **Hitos:**  
  1. Optimización del bridge **Tauri \+ Rust** para periféricos industriales: control de apertura de cajón de dinero (RJ12), balanzas de peso por RS232 y visores de cliente.  
  2. Impresión multi-estación inteligente: ruteo automático de comandas de bebidas a barra y platos a cocina vía comandos ESC/POS.  
  3. Integración de datáfonos/POS inalámbricos mediante SDK para evitar doble digitación del importe.  
  4. Modo Offline de Pagos (Store & Forward): encriptación asimétrica local de cobros ante caídas de internet y sincronización transaccional al restaurar la conectividad.  
  5. Conector de plataformas de Delivery: inyección directa de órdenes desde agregadores al KDS centralizado.

### ***Fase 4: Inteligencia de Menú, Sindicación de Franquicias y ERP (Q4)***

* **Objetivo:** Escalar la solución hacia cadenas de restaurantes y optimización de márgenes.  
* **Hitos:**  
  1. Desglose de Recetas e Insumos (*Recipe Costing*): descarga automática de inventario a nivel de gramaje/ingrediente por cada plato vendido mediante integración con Odoo 19 CE.  
  2. Ingeniería de Menú (*Menu Engineering*): matriz automática de rentabilidad vs popularidad de platos (Estrella, Caballo de batalla, Rompecabezas, Perro).  
  3. Auditoría de mermas y desperdicios en cocina en tiempo real.  
  4. Sindicación jerárquica de cartas para franquicias: catálogo centralizado con sobreescritura de precios e inventario por sucursal.  
  5. Transición del orquestador multi-tenant a Kubernetes para soportar alta concurrencia de pedidos en horas pico.

---

## **4\. Backlog de Tareas Iniciales (Sprint 1\)**

2. **\[SEC-001\]** Refactorizar Dockerfile y `entrypoint.sh` para reemplazar `prisma db push` por `prisma migrate deploy`.  
3. **\[SEC-002\]** Escribir la extensión de Prisma Client para interceptar `delete` y forzar `isDeleted: true` con filtrado automático en consultas.  
4. **\[SEC-003\]** Auditar y migrar los servicios base a `@TenantPrisma()`, eliminando las referencias directas al singleton `this.prisma`.  
5. **\[GASTRO-001\]** Generar y aplicar la primera migración de esquema en `product/omnigastro` con las entidades de Salón, Mesas, Cuentas Abiertas y Modificadores.  
6. **\[GASTRO-002\]** Crear endpoints de apertura de mesa y envío de rondas al KDS con payload tipado en NestJS.  
7. **\[GASTRO-003\]** Implementar el canal de Redis Pub/Sub para propagar el evento `ITEM_86ED` hacia el frontend del POS en \< 500 ms.

