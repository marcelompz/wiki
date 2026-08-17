# 📊 Documentación de Diagramas UML del Sistema

[🏠 Atrás (README)](../README.md) | [🚀 Inicio Rápido](01-quickstart.md) | [🏗️ Arquitectura](02-architecture.md) | [🏢 Multi-Tenant Demo](03-multi-tenant-demo.md) | [🔐 JWT Auth](04-jwt-auth.md) | [📊 Testing Report](05-testing-report.md) | [🏪 POS & KDS](06-pos-kds.md) | [📊 Diagramas UML](07-uml-diagrams.md) | [🎖️ Loyalty Module](08-loyalty.md)

---

Este documento recopila el diseño de arquitectura lógica y física de **OrderFlow**, modelado a través de diagramas nativos en **Mermaid.js**.

---

## 1. MER (Modelo Entidad Relación)
El siguiente diagrama describe el diseño de la base de datos relacional (PostgreSQL) gestionado mediante **Prisma**. El sistema utiliza un esquema de particionamiento lógico para garantizar el multi-tenancy.

```mermaid
erDiagram
  Tenant ||--o{ UserTenantAccess : "tiene reglas de acceso"
  User ||--o{ UserTenantAccess : "asociado a"
  Tenant ||--o{ Product : "posee"
  Tenant ||--o{ Customer : "administra"
  Tenant ||--o{ Order : "procesa"
  Tenant ||--o{ Integration : "configura"
  Tenant ||--o{ Professional : "emplea"
  Tenant ||--o{ PhysicalResource : "asigna"
  Tenant ||--o{ WebhookLog : "registra logs de"
  Tenant ||--o| BioLink : "configura biografía"
  
  Customer ||--o{ Order : "realiza"
  Order ||--|{ OrderLine : "contiene"
  Product ||--o{ OrderLine : "se vende en"
  Product ||--o| Service : "se ofrece como"
  
  OrderLine ||--o| AppointmentAssignment : "agenda turno"
  Service ||--o{ AppointmentAssignment : "define duración de"
  Professional ||--o{ AppointmentAssignment : "atiende"
  PhysicalResource ||--o{ AppointmentAssignment : "reserva"

  Tenant {
    string id PK
    string name
    string logoUrl
    string primaryColor
    string secondaryColor
    boolean active
    string webhookOrderConfirmedUrl
    datetime createdAt
    datetime updatedAt
  }

  User {
    string id PK
    string email
    string password
    string name
    string role
    boolean active
    datetime createdAt
    datetime updatedAt
  }

  UserTenantAccess {
    string id PK
    string userId FK
    string tenantId FK
    string role
    boolean active
  }

  Customer {
    string id PK
    string tenantId FK
    string name
    string email
    string phone
    string taxId
    json metadata
  }

  Product {
    string id PK
    string tenantId FK
    string name
    string skuInterno
    decimal costPrice
    decimal price
    int stockAvailable
    decimal taxRateSale
    boolean active
    string category
  }

  Service {
    string id PK
    string productId FK
    int durationMinutes
    int bufferAfterMinutes
    boolean active
  }

  Order {
    string id PK
    string tenantId FK
    string customerId FK
    string status
    decimal totalAmount
    string currency
    json metadata
    boolean webhookSent
    datetime webhookSentAt
  }

  OrderLine {
    string id PK
    string orderId FK
    string productId FK
    int quantity
    decimal priceAtSale
    decimal costPrice
    decimal taxAmount
    decimal grossProfit
    decimal profitMargin
    decimal subtotal
  }

  AppointmentAssignment {
    string id PK
    string orderLineId FK
    string serviceId FK
    string professionalId FK
    string physicalResourceId FK
    datetime scheduledStart
    datetime scheduledEnd
    string status
  }

  Professional {
    string id PK
    string tenantId FK
    string name
    string type
    boolean active
  }

  PhysicalResource {
    string id PK
    string tenantId FK
    string name
    string type
    boolean active
  }

  Integration {
    string id PK
    string tenantId FK
    string name
    string type
    boolean active
    json config
    string webhookUrl
  }

  WebhookLog {
    string id PK
    string tenantId FK
    string orderId FK
    string url
    json payload
    int status
    string response
    boolean success
  }
```

---

## 2. Diagrama de Casos de Uso
Este diagrama representa las interacciones de los distintos actores del sistema (**Super Admin**, **Administrador / Cajero**, **Mozo / Profesional** y **Cliente final**) con los módulos del SaaS.

```mermaid
graph TD
  subgraph Actores
    SA[Super Administrador]
    AD[Administrador / Cajero]
    MZ[Mozo / Profesional]
    CO[Cocinero / Personal de Cocina]
    CL[Cliente Final]
  end

  subgraph Casos de Uso - Plataforma
    UC1(Gestionar Tenants y API Keys)
    UC2(Monitorear Health Checks)
    UC3(Instalar Módulos en App Store)
    UC4(Gestionar Catálogo de Productos)
    UC5(Administrar Usuarios y Roles)
  end

  subgraph Casos de Uso - Operativos
    UC6(Crear Comanda de Mesa)
    UC7(Visualizar Comandas Pendientes en KDS)
    UC8(Iniciar Preparación de Platos)
    UC9(Finalizar Preparación / Marcar Listo)
    UC10(Recibir Notificación de Plato Listo)
    UC11(Entregar Pedido a Mesa)
    UC12(Cobrar Mesa y Registrar Pago)
    UC13(Reservar Turnos)
    UC14(Realizar Pedido E-commerce)
  end

  %% Relaciones Super Admin
  SA --> UC1
  SA --> UC2

  %% Relaciones Admin / Cajero
  AD --> UC3
  AD --> UC4
  AD --> UC5
  AD --> UC12

  %% Relaciones Mozo
  MZ --> UC6
  MZ --> UC10
  MZ --> UC11

  %% Relaciones Cocinero
  CO --> UC7
  CO --> UC8
  CO --> UC9

  %% Relaciones Cliente
  CL --> UC13
  CL --> UC14
```

---

## 3. Flujograma: Ciclo de Vida del Pedido (POS + KDS + ERP)
El siguiente diagrama detalla la lógica secuencial y el flujo de datos desde la toma del pedido hasta la facturación y sincronización final con Odoo.

```mermaid
flowchart TD
  Start([Inicio del Pedido]) --> OpenCart[Mozo selecciona Mesa y carga ítems]
  OpenCart --> SendOrder[Guardar Comanda en POS]
  
  SendOrder --> CreateDraft[Backend crea orden en estado DRAFT]
  CreateDraft --> EmitWS1[Emitir evento WebSocket 'order:new' al KDS]
  
  subgraph Preparacion en Cocina - KDS
    EmitWS1 --> DisplayKDS[Comanda aparece en pantalla KDS en VERDE]
    DisplayKDS --> WaitPrep{¿Comenzar cocción?}
    
    WaitPrep -- Sí --> StatusPrep[PATCH /orders/:id/status -> PREPARING]
    StatusPrep --> WS2[Emitir WebSocket 'order:status_updated']
    WS2 --> AlertColor[KDS cambia color a NARANJA / Temporizador activo]
    
    AlertColor --> FinishPrep[PATCH /orders/:id/status -> READY]
    FinishPrep --> WS3[Emitir WebSocket 'order:status_updated']
    WS3 --> ReadyColor[KDS cambia a VERDE listo para retirar]
  end

  ReadyColor --> Deliver[Mozo entrega la comida a la mesa]
  Deliver --> RequestBill[Mesa solicita la cuenta]
  
  subgraph Facturacion y Cobro - Caja
    RequestBill --> OpenCashier[Cajero abre mesa activa en POS]
    OpenCashier --> AdjustItems[Aplica descuentos o añade ítems extras]
    AdjustItems --> SelectPayment[Registra método de pago: Cash, Card, Transfer]
    SelectPayment --> ConfirmPayment[PATCH /orders/:id/confirm]
  end

  ConfirmPayment --> WriteDB[Backend actualiza a CONFIRMED y descuenta stock]
  WriteDB --> RegisterEntry[Registra entrada en el módulo de integración Caja]
  
  subgraph Sincronizacion ERP
    RegisterEntry --> CheckWebhook{¿Tiene Webhook configurado?}
    CheckWebhook -- Sí --> SendWebhook[POST webhookOrderConfirmedUrl]
    SendWebhook --> LogLog[Registrar log en WebhookLog]
  end

  CheckWebhook -- No --> End([Pedido Completado y Mesa Liberada])
  LogLog --> End
```

---

## 10. Diagramas del Módulo OrderFlow Bio-Links (directorio transaccional)

### A. Diagrama de Clases UML del Módulo Bio-Links

```mermaid
classDiagram
    class BioLink {
        +String id
        +String tenantId
        +String slug
        +String title
        +String bio
        +String avatarUrl
        +String themeColor
        +String textColor
        +String buttonStyle
        +String metaPixelId
        +String gaMeasurementId
        +String tiktokPixelId
        +Json blocks
        +Boolean showBranding
        +Boolean isActive
        +DateTime createdAt
        +DateTime updatedAt
    }

    class BioLinksController {
        +getPublicBySlug(slug: String)
        +getConfig(req: Request)
        +updateConfig(dto: CreateBioLinkDto, req: Request)
    }

    class BioLinksService {
        +getByTenantId(tenantId: String)
        +upsertBioLink(tenantId: String, dto: CreateBioLinkDto)
        +getPublicBySlug(slug: String)
    }

    class PublicBioLinkPage {
        +slug: String
        +fetchPublicBio()
        +handleBlockClick(block)
        +handleFastCheckoutSubmit()
    }

    BioLinksController --> BioLinksService : inyecta
    BioLinksService --> BioLink : gestiona la entidad
    PublicBioLinkPage ..> BioLinksController : consume /api/v1/bio/public/:slug
```

### B. Diagrama de Secuencia UML: In-Bio Fast Checkout & Sincronización en Tiempo Real POS/KDS

```mermaid
sequenceDiagram
    autonumber
    actor Cliente as Cliente (Instagram/TikTok)
    participant BioSPA as PublicBioLinkPage (/bio/:slug)
    participant Drawer as In-Bio Fast Checkout Drawer
    participant NestAPI as Backend NestJS API
    participant DB as PostgreSQL / Redis Cache
    participant WS as WebSocket Gateway (/orders)
    participant POS as Punto de Venta (POS)
    participant KDS as Pantalla Cocina (KDS)

    Cliente->>BioSPA: Abre link de biografía (orderflow.app/bio/mi-negocio)
    BioSPA->>NestAPI: GET /api/v1/bio/public/mi-negocio
    NestAPI->>DB: Consulta Redis Cache (<10ms) / PostgreSQL
    DB-->>NestAPI: BioLink Data (Avatar, Tema, Bloques, Píxeles)
    NestAPI-->>BioSPA: Renderiza BioLink + Inyecta Píxeles (Meta & GA)
    
    Cliente->>BioSPA: Clic en producto o reserva destacada
    BioSPA->>Drawer: Despliega Fast Checkout Drawer flotante
    Cliente->>Drawer: Ingresa Nombre, Teléfono y Método de Pago
    Cliente->>Drawer: Clic en "Confirmar Pedido (0% Comisión)"
    
    Drawer->>NestAPI: POST /api/v1/orders (con x-api-key del tenant)
    NestAPI->>DB: Inserta Order y OrderLine en PostgreSQL
    NestAPI->>WS: Emite evento WebSocket 'order:new' (Room: tenant:<id>)
    
    par Notificación Instantánea a Operaciones
        WS-->>POS: Actualiza grilla de comandas activas
        WS-->>KDS: Muestra nuevo pedido en pantalla de cocina (Color VERDE)
    end
    
    NestAPI-->>Drawer: Retorna 201 Created (Order ID)
    Drawer-->>Cliente: Pantalla de Confirmación con éxito 🎉
```

