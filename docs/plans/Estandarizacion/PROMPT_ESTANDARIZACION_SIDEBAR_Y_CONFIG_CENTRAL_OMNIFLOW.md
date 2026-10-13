# **PROMPT MAESTRO DE INGENIERÍA: ESTANDARIZACIÓN DEL SIDEBAR MODULAR, INVENTARIO AVANZADO Y PANEL CENTRALIZADO DE CONFIGURACIÓN EN OMNIFLOW**

Código: PROMPT-CORE-SIDEBAR-CONFIG-02  
Módulos Objetivo: Layout / Navigation (Sidebar), Settings (Panel Centralizado), Operaciones, Inventario (OmniStock), OmniCapitalHumano, OmniCRM, OmniBI, OmniGastro  
Ecosistema: React 18, Refine.dev, Ant Design 5, Tailwind CSS, TypeScript, NestJS, Prisma ORM, PostgreSQL, Redis  
Propósito: Refactorizar la arquitectura de navegación lateral (Sidebar) integrando INVENTARIO como categoría superior inspirada en Odoo Stock (depósitos, estantes, ubicaciones jerárquicas y kardex), desacoplar el core agnóstico de las extensiones verticales, y extender el motor de configuración centralizado multi-tenant (res.config.settings).

---

| Atributo | Detalle |
| :---- | :---- |
| **Rol de Ejecución** | Principal Full-Stack Architect & Core Engine Lead |
| **Versión Base** | OmniFlow v1.29.0 Monorepo |
| **Enfoque Arquitectónico** | Desacoplamiento Agnóstico, Modularidad Plug & Play, Multi-Tenancy Estricto con @TenantPrisma(), Modelo WMS/Inventario Odoo |
| **Entregables Clave** | Nueva definición de menú en Refine, modelo Prisma para WMS/Inventario y Settings, endpoints REST con validación Zod, motor declarativo ConfigRegistry |

---

## **1\. CONTEXTO Y DIAGNÓSTICO DEL SISTEMA (v1.29.0)**

Durante la auditoría visual y funcional del panel operativo de OmniFlow v1.29.0 se evidenciaron las siguientes discrepancias y oportunidades estratégicas:

### ***1.1. Inconsistencias Críticas en el Sidebar***

1. **Contaminación de Operaciones:** En el menú `OPERACIONES` coexisten elementos de restauración (duplicación de `Cocina (KDS)` y un `OmniPOS` con lógica de restaurante). Operaciones debe ser universal, comercialmente agnóstico y enfocado en el flujo de caja/mostrador diario.  
2. **Omisiones en OmniGastro:** El menú `OMNIGASTRO` únicamente muestra `Cocina & Bar (KDS)`, omitiendo `POS Cajero` (caja, salón, arqueos X/Z, facturación) y `POS Meseros` (comandero táctil móvil para mesas).  
3. **Necesidad de INVENTARIO como Categoría Superior (Modelo Odoo):** Actualmente el stock se gestiona de forma plana a nivel de producto final. Siguiendo el estándar de Odoo Stock, la gestión de inventario requiere su propio pilar de primer nivel para administrar:  
   - Depósitos / Almacenes (`stock.warehouse`).  
   - Ubicaciones jerárquicas: pasillos, estantes, racks y bins (`stock.location`).  
   - Movimientos de stock en tiempo real (Kardex, recepciones de compras, entregas y transferencias internas).  
   - Ajustes de inventario, mermas/desechos (scrap) y trazabilidad por lotes/series.  
4. **Subvaloración de Omni Capital Humano:** Requiere posicionarse como pilar estratégico que abarque Administración de Personal, Desarrollo & Talento, y Gestión del Conocimiento (MOF, MFP, matriz RACI, organigrama interactivo).  
5. **Dispersión Comercial:** `OmniCRM` asume el rol de padre de los catálogos comerciales (precios, variantes, atributos de venta) y gobierna el marketing omnicanal (WhatsApp, e-commerce, Bio-Links) y de fidelización.  
6. **Aislamiento de OmniBI:** Se consolida como torre de control analítica transversal integrada con Inventario, CRM, Operaciones y Capital Humano.

### ***1.2. Panel Centralizado de Configuración (Inspirado en Odoo res.config.settings)***

Consola unificada en `/admin/settings` donde cada módulo instalado inyecta dinámicamente sus tarjetas de ajustes, interruptores booleanos (toggles), parámetros numéricos y accesos directos a catálogos maestros, gobernado por el Administrador del Tenant.

---

## **2\. REORGANIZACIÓN Y ESPECIFICACIÓN DEL SIDEBAR**

El layout de navegación de Refine en `frontend/src/config/navigation.config.ts` se estructura de forma jerárquica:

├── 1\. OPERACIONES \[Core Universal Agnóstico\]

│   ├── OmniPOS (Mostrador / Retail Base) ─────────── \[/admin/pos\]

│   ├── Pedidos & Despacho (Gestión Unificada) ────── \[/admin/orders\]

│   ├── OmniBookings (Citas & Turnos de Servicios) ── \[/admin/bookings\]

│   ├── Cotizaciones & Presupuestos ───────────────── \[/admin/quotes\]

│   └── Documentos & Workflows Operativos ─────────── \[/admin/documents\]

│

├── 2\. INVENTARIO \[Gestión de Stock & WMS \- Estándar Odoo\]

│   ├── Operaciones & Movimientos

│   │   ├── Transferencias Internas (Entre depósitos) \[/admin/inventory/transfers\]

│   │   ├── Recepciones de Mercadería (Entradas) ──── \[/admin/inventory/receipts\]

│   │   ├── Despachos & Entregas (Salidas) ────────── \[/admin/inventory/deliveries\]

│   │   ├── Ajustes de Inventario & Recuentos ─────── \[/admin/inventory/adjustments\]

│   │   ├── Desechos / Mermas (Scrap) ─────────────── \[/admin/inventory/scrap\]

│   │   └── Libro Kardex en Tiempo Real ───────────── \[/admin/inventory/kardex\]

│   ├── Productos & Existencias

│   │   ├── Stock Actual por Depósito / Ubicación ─── \[/admin/inventory/stock\]

│   │   ├── Números de Lote & Series (Trazabilidad) ─ \[/admin/inventory/lots\]

│   │   └── Alertas de Stock Mínimo & Reabastecimiento \[/admin/inventory/reordering\]

│   └── Estructura de Almacenamiento & Logística

│       ├── Depósitos / Almacenes (Warehouses) ────── \[/admin/inventory/warehouses\]

│       ├── Ubicaciones (Pasillos, Estantes, Racks) ─ \[/admin/inventory/locations\]

│       ├── Tipos de Operación (Reglas de Flujo) ──── \[/admin/inventory/operation-types\]

│       └── Unidades de Medida (UdM) & Conversiones ─ \[/admin/inventory/uom\]

│

├── 3\. OMNI CAPITAL HUMANO \[Pilar Estratégico Organizacional\]

│   ├── Administración de Personal

│   │   ├── Turnos & Horarios Laborales ───────────── \[/admin/hr/shifts\]

│   │   ├── Asistencia & Marcaciones Biométricas ──── \[/admin/hr/attendance\]

│   │   ├── Asignación de Puestos & Cargas Horarias ─ \[/admin/hr/assignments\]

│   │   ├── Nómina, Salarios & Comisiones ─────────── \[/admin/hr/payroll\]

│   │   └── Vacaciones, Licencias & Ausentismo ────── \[/admin/hr/leaves\]

│   ├── Desarrollo & Talento

│   │   ├── Legajo Digital Integral del Colaborador ─ \[/admin/hr/employees\]

│   │   ├── Planes de Carrera & Evaluaciones ──────── \[/admin/hr/evaluations\]

│   │   ├── Academia & Capacitaciones Continuas ───── \[/admin/hr/training\]

│   │   └── Certificaciones & Habilidades ─────────── \[/admin/hr/skills\]

│   └── Gestión del Conocimiento & Organización

│       ├── MOF (Manual de Organización y Funciones) ─ \[/admin/hr/mof\]

│       ├── MFP (Manual de Funciones y Procesos) ──── \[/admin/hr/mfp\]

│       ├── Matriz de Responsabilidades (RACI) ────── \[/admin/hr/raci\]

│       ├── Manuales de Procedimientos & Políticas ── \[/admin/hr/policies\]

│       └── Organigrama Dinámico Interactivo ──────── \[/admin/hr/org-chart\]

│

├── 4\. OMNICRM \[Pilar Comercial, Catálogos & Marketing 360°\]

│   ├── Gestión Comercial & Clientes

│   │   ├── Contactos, Clientes & Proveedores ─────── \[/admin/crm/contacts\]

│   │   ├── Pipeline de Ventas & Oportunidades ────── \[/admin/crm/pipeline\]

│   │   └── Historial de Interacciones & Seguimiento  \[/admin/crm/activities\]

│   ├── Catálogos Maestros (Padre de Catálogos)

│   │   ├── Catálogo Maestro de Productos & Servicios \[/admin/crm/catalog\]

│   │   ├── Variantes, Atributos & Modificadores Base \[/admin/crm/attributes\]

│   │   ├── Listas de Precios & Reglas de Tarifa ──── \[/admin/crm/pricelists\]

│   │   └── Categorías & Colecciones Comerciales ──── \[/admin/crm/categories\]

│   ├── Marketing Externo & Canales de Venta

│   │   ├── E-commerce Storefront & Canales Web ───── \[/admin/crm/ecommerce\]

│   │   ├── Social Commerce & Bio-Links (Tridente) ── \[/admin/crm/bio-links\]

│   │   ├── Integración Nativa WhatsApp Business ──── \[/admin/crm/whatsapp\]

│   │   └── Cuponeras, Descuentos & Promociones ───── \[/admin/crm/promotions\]

│   └── Marketing Interno & Fidelización

│       ├── Programa de Puntos & CashBack ─────────── \[/admin/crm/loyalty\]

│       ├── Rangos & Membresías (Bronze a Platinum) ─ \[/admin/crm/tiers\]

│       ├── Encuestas de Satisfacción & NPS ───────── \[/admin/crm/surveys\]

│       └── Segmentación Dinámica de Clientes ─────── \[/admin/crm/segments\]

│

├── 5\. OMNIBI \[Business Intelligence \- Torre de Control Analítica\]

│   ├── Dashboards Ejecutivos (Visión 360° en tiempo real) \[/admin/bi/dashboard\]

│   ├── Analítica de Inventario & Stock (Rotación, Quiebres, Kardex) \[/admin/bi/inventory\]

│   ├── Analítica de Clientes & CRM (LTV, CAC, Churn, Embudo) \[/admin/bi/crm\]

│   ├── Analítica Operativa & Ventas (Ticket promedio, horas pico) \[/admin/bi/operations\]

│   ├── Analítica de Capital Humano (Productividad, ausentismo) \[/admin/bi/hr\]

│   └── Reportes Avanzados & Exportación Masiva ───── \[/admin/bi/reports\]

│

├── 6\. OMNIGASTRO \[Suite Vertical Especializada \- Renderizado Condicional\]

│   │   \*Condición: tenant.hasModule('omnigastro') \=== true\*

│   ├── POS Cajero (Caja, Salón, Arqueos X/Z, Mesas) \[/admin/gastro/pos-cashier\]

│   ├── POS Meseros (Comandero Móvil para Mesas) ─── \[/admin/gastro/pos-waiter\]

│   ├── Cocina & Bar (KDS Táctil por Estaciones) ─── \[/admin/gastro/kds\]

│   └── Salones & Distribución de Mesas ───────────── \[/admin/gastro/floors\]

│

├── 7\. SISTEMA / AJUSTES \[Gobernanza del Tenant\]

│   ├── Panel de Configuración Centralizado ───────── \[/admin/settings\]

│   └── Usuarios, Roles & Permisos ───────────────── \[/admin/users\]

│

└── 8\. SUPER ADMIN \[Infraestructura Global de Plataforma\]

    │   \*Condición: user.role \=== 'SUPERADMIN'\*

    ├── Tenants Registrados & Tier de Base de Datos ─ \[/admin/super-admin/tenants\]

    ├── Integrador Odoo (Microservicio) & Health Check \[/admin/super-admin/integrations\]

    └── App Store Global & Gestión de Backups ─────── \[/admin/super-admin/backups\]

---

## **3\. ARQUITECTURA DE DATOS: MODELO DE INVENTARIO Y DEPÓSITOS (INSPIRADO EN ODOO)**

### ***3.1. Modelo Prisma para Depósitos, Ubicaciones y Movimientos (`backend/prisma/schema.prisma`)***

// 1\. Depósitos / Almacenes (Equivalente a stock.warehouse de Odoo)

model Warehouse {

  id          String    @id @default(uuid()) @db.Uuid

  tenantId    String    @map("tenant\_id") @db.Uuid

  code        String    @db.VarChar(10) // Ej: 'CENTRAL', 'SUC01'

  name        String    @db.VarChar(100)

  address     String?

  isActive    Boolean   @default(true) @map("is\_active")

  isDeleted   Boolean   @default(false) @map("is\_deleted")

  createdAt   DateTime  @default(now()) @map("created\_at")

  updatedAt   DateTime  @updatedAt @map("updated\_at")

&nbsp;

  locations   Location\[\]

  tenant      Tenant    @relation(fields: \[tenantId\], references: \[id\], onDelete: Restrict)

&nbsp;

  @@unique(\[tenantId, code\])

  @@index(\[tenantId\])

  @@map("warehouses")

}

&nbsp;

// 2\. Ubicaciones Jerárquicas (Equivalente a stock.location de Odoo: pasillos, estantes, racks)

enum LocationType {

  VIEW           // Agrupador jerárquico

  INTERNAL       // Almacenamiento físico real (estantes, estanterías)

  CUSTOMER       // Ubicación virtual de clientes (salida de ventas)

  SUPPLIER       // Ubicación virtual de proveedores (entrada de compras)

  INVENTORY\_LOSS // Ajustes y mermas (scrap)

  TRANSIT        // Tránsito entre depósitos

}

&nbsp;

model Location {

  id          String        @id @default(uuid()) @db.Uuid

  tenantId    String        @map("tenant\_id") @db.Uuid

  warehouseId String?       @map("warehouse\_id") @db.Uuid

  parentId    String?       @map("parent\_id") @db.Uuid

  name        String        @db.VarChar(100) // Ej: "Pasillo A", "Estante 03", "Rack 2-B"

  completeName String       @map("complete\_name") @db.VarChar(255) // Ej: "CENTRAL/Pasillo A/Estante 03"

  type        LocationType  @default(INTERNAL)

  barcode     String?       @db.VarChar(50) // Código QR/Barras del estante

  isActive    Boolean       @default(true) @map("is\_active")

  isDeleted   Boolean       @default(false) @map("is\_deleted")

  createdAt   DateTime      @default(now()) @map("created\_at")

  updatedAt   DateTime      @updatedAt @map("updated\_at")

&nbsp;

  warehouse   Warehouse?    @relation(fields: \[warehouseId\], references: \[id\], onDelete: SetNull)

  parent      Location?     @relation("LocationHierarchy", fields: \[parentId\], references: \[id\], onDelete: Restrict)

  children    Location\[\]    @relation("LocationHierarchy")

  quantities  StockQuant\[\]

  movesSrc    StockMove\[\]   @relation("MoveSourceLocation")

  movesDest   StockMove\[\]   @relation("MoveDestLocation")

  tenant      Tenant        @relation(fields: \[tenantId\], references: \[id\], onDelete: Restrict)

&nbsp;

  @@unique(\[tenantId, completeName\])

  @@index(\[tenantId, warehouseId\])

  @@map("locations")

}

&nbsp;

// 3\. Stock Actual por Ubicación / Estante (Equivalente a stock.quant de Odoo)

model StockQuant {

  id          String    @id @default(uuid()) @db.Uuid

  tenantId    String    @map("tenant\_id") @db.Uuid

  productId   String    @map("product\_id") @db.Uuid

  locationId  String    @map("location\_id") @db.Uuid

  lotNumber   String?   @map("lot\_number") @db.VarChar(50)

  quantity    Decimal   @default(0.0) @db.Decimal(12, 4\)

  reservedQty Decimal   @default(0.0) @map("reserved\_qty") @db.Decimal(12, 4\)

  updatedAt   DateTime  @updatedAt @map("updated\_at")

&nbsp;

  location    Location  @relation(fields: \[locationId\], references: \[id\], onDelete: Restrict)

  tenant      Tenant    @relation(fields: \[tenantId\], references: \[id\], onDelete: Restrict)

&nbsp;

  @@unique(\[tenantId, productId, locationId, lotNumber\])

  @@index(\[tenantId, productId\])

  @@index(\[tenantId, locationId\])

  @@map("stock\_quants")

}

&nbsp;

// 4\. Movimientos y Libro Kardex (Equivalente a stock.move de Odoo)

enum StockMoveState {

  DRAFT

  WAITING

  CONFIRMED

  ASSIGNED

  DONE

  CANCELLED

}

&nbsp;

model StockMove {

  id              String         @id @default(uuid()) @db.Uuid

  tenantId        String         @map("tenant\_id") @db.Uuid

  reference       String         @db.VarChar(50) // Ej: "WH/IN/0001", "WH/INT/0042"

  productId       String         @map("product\_id") @db.Uuid

  locationSrcId   String         @map("location\_src\_id") @db.Uuid

  locationDestId  String         @map("location\_dest\_id") @db.Uuid

  quantity        Decimal        @db.Decimal(12, 4\)

  unitCost        Decimal?       @map("unit\_cost") @db.Decimal(12, 2\)

  state           StockMoveState @default(DRAFT)

  originDoc       String?        @map("origin\_doc") @db.VarChar(100) // Referencia a Pedido, Factura o POS Order

  lotNumber       String?        @map("lot\_number") @db.VarChar(50)

  createdAt       DateTime       @default(now()) @map("created\_at")

  executedAt      DateTime?      @map("executed\_at")

&nbsp;

  locationSrc     Location       @relation("MoveSourceLocation", fields: \[locationSrcId\], references: \[id\], onDelete: Restrict)

  locationDest    Location       @relation("MoveDestLocation", fields: \[locationDestId\], references: \[id\], onDelete: Restrict)

  tenant          Tenant         @relation(fields: \[tenantId\], references: \[id\], onDelete: Restrict)

&nbsp;

  @@index(\[tenantId, productId, executedAt\])

  @@index(\[tenantId, reference\])

  @@map("stock\_moves")

}

---

## **4\. INTEGRACIÓN CON EL PANEL CENTRALIZADO DE CONFIGURACIÓN**

En `/admin/settings`, el módulo de **Inventario** inyecta dinámicamente las siguientes configuraciones de negocio al Administrador del Tenant:

1. **Estructura de Almacenamiento:**  
   - Switch: `Habilitar Ubicaciones & Estantes Multi-Nivel` (Permite estructurar pasillos, estantes y códigos de barras por ubicación).  
   - Switch: `Habilitar Multi-Depósito` (Habilita la gestión de más de un depósito físico y transferencias internas).  
2. **Trazabilidad & Operaciones:**  
   - Switch: `Gestión por Números de Lote y Vencimiento` (Obligatorio para alimentos, bebidas y farmacia).  
   - Switch: `Rutas Automáticas de Reabastecimiento (Dropshipping / MTO)`  
   - Selector: `Método de Valoración de Inventario` (FIFO, Costo Promedio Ponderado PPP, Estándar).  
3. **Control y Alertas:**  
   - Toggle: `Permitir Stock Negativo en POS` (Por defecto false).  
   - Enlace directo a: `Configurar Depósitos`, `Editar Plano de Ubicaciones`, `Definir Reglas de Stock Mínimo`.

---

## **5\. INSTRUCCIONES ESPECÍFICAS DE IMPLEMENTACIÓN**

### ***Tarea 1: Migración Prisma y Repositorios WMS***

- Aplicar la migración SQL `prisma/migrations/YYYYMMDD_add_wms_stock_models/migration.sql`.  
- Implementar `WarehouseService`, `LocationService` y `StockMoveService` en `backend/src/modules/inventory/`.  
- Asegurar que todas las mutaciones sobre `StockQuant` se ejecuten dentro de una transacción Prisma (`$transaction`) con `@TenantPrisma()`.

### ***Tarea 2: Desacoplamiento de Catálogo vs. Stock Físico***

- **OmniCRM (`/admin/crm/catalog`):** Define el producto comercial, descripción, fotos, variantes, precios de venta e impuestos.  
- **Inventario (`/admin/inventory/stock`):** Gobierna las existencias físicas en tiempo real, costes unitarios, stock reservado, pasillos y estantes asignados.  
- **POS / Operaciones:** Al realizar una venta en mostrador o restaurante, se descuenta de la ubicación interna por defecto del depósito asignado a la terminal (`PosConfig.stockLocationId`).

### ***Tarea 3: Vistas Declarativas en Refine***

- `frontend/src/pages/inventory/warehouses/`: Gestión CRUD de depósitos.  
- `frontend/src/pages/inventory/locations/`: Árbol jerárquico visual de pasillos, estantes y códigos QR de ubicación.  
- `frontend/src/pages/inventory/kardex/`: Tabla de movimientos con filtros por fecha, depósito, lote y producto.

---

## **6\. CRITERIOS DE ACEPTACIÓN Y VERIFICACIÓN (QA)**

1. **Sidebar Estructurado en 8 Niveles Claros:** Operaciones, Inventario, Capital Humano, OmniCRM, OmniBI, OmniGastro, Sistema/Ajustes y SuperAdmin.  
2. **Gestión WMS de Estantes y Depósitos:** Capacidad de crear depósitos jerárquicos (ej: `Depósito Central -> Pasillo 1 -> Estante B`) y asignar productos con stock diferenciado por ubicación.  
3. **Kardex Transaccional Inalterable:** Toda entrada por recepción de compra o salida por venta en OmniPOS genera automáticamente un registro en `stock_moves` y actualiza el saldo en `stock_quants`.  
4. **Desacoplamiento Operativo:** Operaciones sigue siendo 100% agnóstico de restaurante; OmniGastro se visualiza solo si el módulo está instalado; Inventario opera de forma transversal para retail o gastronomía.

&nbsp;