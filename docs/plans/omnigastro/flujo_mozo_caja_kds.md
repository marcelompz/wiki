Actúa como un arquitecto de software y desarrollador senior full-stack. Necesito adaptar el sistema actual de OmniFlow (Social Catalog + OmniGastro POS/KDS) para implementar un flujo operativo de salón híbrido con asignación dinámica de personal, pedidos colaborativos y soporte estricto para cobro presencial y fallback offline.

### Diagrama de Flujo del Sistema (Mermaid)

```mermaid
stateDiagram-v2
    [*] --> MesaDisponible: Mesa Libre con QR

    state "Sesión de Mesa Activa" as SesionMesa {
        MesaDisponible --> EleccionModalidad: Cliente escanea QR
        MesaDisponible --> MozoAbreMesa: Fallback (Mozo toma comanda directa)
        
        state EleccionModalidad {
            [*] --> CuentaUnificada
            [*] --> CuentaDividida: Comensales ingresan alias (A, B, C...)
        }

        CuentaUnificada --> PrepedidoGenerado: Carrito común
        CuentaDividida --> PrepedidoGenerado: Carritos individuales + Ítems compartidos
        
        PrepedidoGenerado --> NotificacionPoolMozos: Emisión 'draft_submitted' o 'call_waiter'
        
        state "Gestión y Asignación de Mozos" as GestionMozos {
            NotificacionPoolMozos --> MozoAsignado: Reclamo atómico (First-Come)
            MozoAsignado --> MozoReasignado: Traspaso de mesa (Cambio de turno/Balanceo)
            MozoReasignado --> MozoAsignado
        }

        MozoAsignado --> ValidacionPresencial: Mozo acude a mesa (Edita / Agrega verbalmente)
        ValidacionPresencial --> ComandaConfirmada: Mozo presiona "Confirmar"
    }

    state "Producción (KDS)" as KDS {
        ComandaConfirmada --> EnrutamientoKDS: Split por estación
        EnrutamientoKDS --> Cocina: Ítems Cocina (Tag Comensal)
        EnrutamientoKDS --> Barra: Ítems Barra (Tag Comensal)
        Cocina --> NotificarMozoListo: Marca "Listo"
        Barra --> NotificarMozoListo: Marca "Listo"
    }

    NotificarMozoListo --> EntregaMesa: Mozo asignado recibe push y sirve
    EntregaMesa --> SolicitudCierre: Cliente llama mozo / Pide cuenta

    state "Cierre y Facturación" as Checkout {
        SolicitudCierre --> Precuenta: Mozo emite precuenta (Global o Split por Comensal)
        Precuenta --> CobroPresencial: Pago en POS Handheld o Caja Central (NO pago online)
        CobroPresencial --> MesaCerrada: Facturación emitida y sesión liberada
    }

    MesaCerrada --> [*]