flowchart TD
    %% Estilos por capa
    classDef client fill:#e1f5fe,stroke:#0288d1,stroke-width:2px;
    classDef staff fill:#fff3e0,stroke:#f57c00,stroke-width:2px;
    classDef core fill:#ede7f6,stroke:#512da8,stroke-width:2px;
    classDef queue fill:#e0f2f1,stroke:#00796b,stroke-width:2px;
    classDef odoo fill:#fbe9e7,stroke:#d84315,stroke-width:2px;

    %% Subgraph: Front-Office Salón
    subgraph Salón ["Front-Office Salón (OmniGastro)"]
        QR[Cliente escanea QR de Mesa]:::client --> Menu[Social Catalog / Menú Vivo]:::client
        Menu --> DraftOrder[Prepedido / Borrador]:::client
        DraftOrder --> ClaimWait[Notificación Pool de Mozos]:::staff
        
        FallbackMozo[Mozo abre mesa manual]:::staff --> WaiterApp[OmniGastro App / Handheld]:::staff
        ClaimWait --> WaiterApp
        WaiterApp --> ValidateOrder[Mozo valida y presiona 'Confirmar / Comandar']:::staff
    end

    %% Subgraph: Backend OmniFlow
    subgraph CoreBackend ["OmniFlow Backend (NestJS + Prisma)"]
        ValidateOrder --> OrdersService[OrdersService / KDS Gateway]:::core
        OrdersService --> KDS_Station[KDS Cocina & Barra]:::core
        
        %% Encolamiento asíncrono
        OrdersService --> BullMQ[BullMQ: Queue 'odoo-table-sync']:::queue
        BullMQ --> Worker[OdooTableSyncProcessor]:::queue
        Worker --> Adapter[OdooAdapterService: getActivePosSession]:::queue
    end

    %% Subgraph: Odoo Back-Office & Caja
    subgraph OdooPOS ["Odoo POS (pos_restaurant)"]
        Adapter -->|POST /api/omniflow/sync_table_order| OdooController[pos_omniflow_sync: Controller]:::odoo
        
        OdooController --> PosSessionCheck{¿Sesión activa?}:::odoo
        PosSessionCheck -->|Sí| CreateOrder[pos.order draft + líneas asociadas]:::odoo
        PosSessionCheck -->|No| SyncError[Error: Sesión no abierta]:::odoo
        
        CreateOrder --> BusBus[Notificación bus.bus: 'pos.order/sync']:::odoo
        BusBus --> OwlUI[Pantalla Cajero - OWL Framework: Mesa se ilumina]:::odoo
        
        OwlUI --> CashierAction[Cajero abre mesa, pre-imprime cuenta y cobra]:::odoo
        CashierAction --> ValidatePayment[Orden validada en Odoo: state = 'paid']:::odoo
        ValidatePayment --> FreeOdooTable[Mesa liberada en Odoo]:::odoo
    end

    %% Retorno y Cierre
    ValidatePayment -->|Webhook POST /api/v1/integrations/odoo/order-paid| WebhookOmni[OmniFlow: OdooWebhookController]:::core
    WebhookOmni --> TableReleased[Mesa liberada en Salón: Status FREE]:::staff