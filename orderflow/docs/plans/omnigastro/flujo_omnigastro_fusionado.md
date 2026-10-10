```mermaid
sequenceDiagram
    autonumber
    actor C as Cliente (PWA)
    actor M as Mozo (Handheld)
    participant Core as OmniFlow Backend
    participant KDS as KDS (Cocina/Barra)
    actor Cocinero as Cocinero
    participant Q as BullMQ (odoo-table-sync)
    participant OdooAPI as Odoo (pos_omniflow_sync)
    participant Bus as Odoo bus.bus
    actor Cajero as Cajero (Odoo POS UI)

    %% ========== 1. TOMA Y VALIDACIÓN EN SALÓN ==========
    rect rgb(235, 245, 255)
    Note over C: 🆕 Paso agregado: escaneo de QR
    C->>C: Escanea QR de la mesa
    C->>Core: POST /guest/orders (Prepedido borrador)
    Core-->>M: WS: Notificación al pool de mozos
    M->>Core: POST /orders/:id/claim (Reclamo de mesa)
    Note over M,C: Mozo acude a la mesa y valida verbalmente

    alt 🆕 Mozo ajusta el pedido (CRUD opcional según asesoramiento)
        M->>Core: PATCH /orders/:id/items (add/edit/remove)
        Core-->>M: Pedido actualizado
    end

    M->>Core: POST /orders/:id/send-to-kitchen (Confirmación final)

    opt 🆕 Cliente solicita factura
        M->>Core: PATCH /orders/:id/billing-info (datos fiscales)
    end
    end

    %% ========== 2. ENRUTAMIENTO KDS Y ENCOLAMIENTO A ODOO ==========
    par Despacho KDS
        Core-->>KDS: Enruta comanda a Cocina y Barra (items + mesa)
    and Sincronización Odoo
        Core->>Q: Encola TableOrderSyncJob (orderUuid, odooTableId, items)
    end

    %% ========== 3. 🆕 CICLO DE PREPARACIÓN EN COCINA ==========
    rect rgb(255, 245, 230)
    Note over KDS,Cocinero: 🆕 Estados de preparación (faltaban en el original)
    Cocinero->>KDS: Confirma inicio de preparación
    KDS-->>Core: PATCH /orders/:id/status = 'in_progress'
    Core-->>M: WS: Pedido en preparación (opcional, informativo)

    Cocinero->>KDS: Marca plato como finalizado / listo para servir
    KDS-->>Core: PATCH /orders/:id/status = 'ready'
    Core-->>M: WS: 🆕 Notificación "plato listo para retirar"
    end

    %% ========== 4. 🆕 RETIRO Y ENTREGA EN MESA ==========
    rect rgb(255, 245, 230)
    M->>KDS: Retira el plato
    M->>C: Sirve el plato en la mesa
    M->>Core: PATCH /orders/:id/status = 'delivered'
    Core-->>Core: table_session.status = 'SERVED'
    end

    %% ========== 5. INGESTA EN ODOO POS ==========
    Q->>OdooAPI: GET pos.session abierta (pos.config)
    OdooAPI-->>Q: session_id activa
    Q->>OdooAPI: POST /api/omniflow/sync_table_order
    OdooAPI->>OdooAPI: pos.order.create(draft) o write(lines)
    OdooAPI->>Bus: bus.bus._sendone('pos.order/sync')
    Bus-->>Cajero: WebSocket/Longpolling: Mesa se actualiza en UI (OWL)

    %% ========== 6. 🆕 SOLICITUD DE CUENTA Y BIFURCACIÓN DE COBRO ==========
    rect rgb(230, 255, 235)
    Note over C,M: 🆕 Cliente consume y pide la cuenta
    C->>M: Solicita la cuenta
    M->>C: Ofrece opciones: cobrar en mesa o pasar a caja

    alt 🆕 Opción A: Cobro en mesa (faltaba por completo)
        C->>M: Entrega dinero / tarjeta
        M->>M: Procesa el cobro físicamente (POS handheld / posnet)
        M->>Core: POST /orders/:id/payment-preconfirm (mozo)
        Core->>OdooAPI: POST /api/omniflow/preconfirm_payment (state: 'pending_verification')
        OdooAPI->>Bus: bus.bus._sendone('pos.order/pending_verification')
        Bus-->>Cajero: Notificación: pago preconfirmado por mozo, pendiente de verificar
        Cajero->>OdooAPI: Verifica y confirma pago (state: 'paid')
    else Opción B: Cliente pasa a pagar en caja (flujo original)
        Note over Cajero: Cajero visualiza productos, emite cuenta y procesa cobro
        Cajero->>OdooAPI: Valida pago (state: 'paid')
    end
    end

    %% ========== 7. CIERRE DE MESA ==========
    OdooAPI->>Core: Webhook POST /api/v1/integrations/odoo/order-paid
    Core-->>M: WS: Mesa liberada y comanda cerrada
    Core->>Core: table_session.status = 'FREE'
```
