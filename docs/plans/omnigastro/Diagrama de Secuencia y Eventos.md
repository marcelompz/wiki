sequenceDiagram
    autonumber
    actor C as Cliente (PWA)
    actor M as Mozo (Handheld)
    participant Core as OmniFlow Backend
    participant Q as BullMQ (odoo-table-sync)
    participant OdooAPI as Odoo (pos_omniflow_sync)
    participant Bus as Odoo bus.bus
    actor Cajero as Cajero (Odoo POS UI)

    %% 1. Toma y validación en salón
    C->>Core: POST /guest/orders (Prepedido borrador)
    Core-->>M: WS: Notificación al pool de mozos
    M->>Core: POST /orders/:id/claim (Reclamo de mesa)
    Note over M,C: Mozo acude a la mesa y valida verbalmente
    M->>Core: POST /orders/:id/send-to-kitchen (Confirmación final)

    %% 2. Enrutamiento KDS y Encolamiento a Odoo
    par Despacho KDS
        Core-->>Core: Enruta a Cocina y Barra (KDS)
    and Sincronización Odoo
        Core->>Q: Encola TableOrderSyncJob (orderUuid, odooTableId, items)
    end

    %% 3. Ingesta en Odoo POS
    Q->>OdooAPI: GET pos.session abierta (pos.config)
    OdooAPI-->>Q: session_id activa
    Q->>OdooAPI: POST /api/omniflow/sync_table_order
    OdooAPI->>OdooAPI: pos.order.create(draft) o write(lines)
    OdooAPI->>Bus: bus.bus._sendone('pos.order/sync')
    Bus-->>Cajero: WebSocket/Longpolling: Mesa se actualiza en UI (OWL)

    %% 4. Cobro y Cierre de Mesa
    Note over Cajero: Cajero visualiza productos, emite cuenta y procesa cobro
    Cajero->>OdooAPI: Valida pago (state: 'paid')
    OdooAPI->>Core: Webhook POST /api/v1/integrations/odoo/order-paid
    Core-->>M: WS: Mesa liberada y comanda cerrada
    Core->>Core: table_session.status = 'FREE'