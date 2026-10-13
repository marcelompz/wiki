# **Plan de Sincronización: Pedidos del Mozo (OmniFlow) con Punto de Venta de Odoo (Cajero)**

**Proyecto:** OmniFlow / OmniGastro Monorepo  
**Subcomponentes:** `apps/omnigastro-pos`, `odoo-adapter`, Módulo puente Odoo POS  
**Objetivo:** Permitir que los mozos tomen comandas desde la aplicación móvil/tablet de OmniFlow y que los pedidos se sincronicen en tiempo real con la pantalla del Punto de Venta web de Odoo (pos\_restaurant) operado por el cajero, asegurando cobro, control de stock y facturación centralizada en Odoo.

---

## **1\. Arquitectura del Flujo y Topología Operativa**

El flujo operativo se divide en dos dominios:

1. **Front-Office Móvil (Salón):** El mozo utiliza OmniGastro para apertura de mesas, adición de platos, especificación de notas de cocina y envío de comandas.  
2. **Caja Central y Back-Office (Odoo):** El cajero opera la interfaz web de Odoo POS (`pos_restaurant`). Recibe la orden de la mesa en tiempo real en su pantalla táctil, emite la cuenta previa, gestiona el cobro y valida el ticket fiscal.

┌──────────────────────────┐         ┌──────────────────────────┐         ┌──────────────────────────┐

│ MOZO (Móvil / Tablet)    │         │ OMNIFLOW BACKEND         │         │ CAJERO (Odoo POS Web)    │

│ OmniGastro App           │         │ (odoo-adapter \+ BullMQ)  │         │ pos\_restaurant UI        │

└────────────┬─────────────┘         └────────────┬─────────────┘         └────────────┬─────────────┘

             │                                    │                                    │

             │ 1\. Abre mesa y carga ítems         │                                    │

             │ 2\. Presiona "Comandar / Enviar"    │                                    │

             ├───────────────────────────────────\>│                                    │

             │                                    │ 3\. Resuelve sesión activa Odoo     │

             │                                    │ 4\. Mapea mesa y productos          │

             │                                    │ 5\. Llama a endpoint de Odoo        │

             │                                    ├───────────────────────────────────\>│

             │                                    │                                    │ 6\. Se crea pos.order borrador

             │                                    │                                    │ 7\. Emite evento a bus.bus

             │                                    │                                    │ 8\. ¡Mesa se ilumina en verde\!

             │                                    │                                    │ 9\. Cajero abre mesa y ve ítems

             │                                    │                                    │ 10\. Cajero cobra y valida orden

             │                                    │ 11\. Webhook de orden cobrada       │

             │                                    │\<───────────────────────────────────┤

             │ 12\. Mesa liberada en salón         │                                    │

             │\<───────────────────────────────────┤                                    │

---

## **2\. Requisitos Previos y Mapeo de Entidades**

Para que Odoo procese la comanda sin errores de integridad relacional:

1. **Sesión Activa de Caja (`pos.session`):**  
   - En Odoo POS, ninguna orden puede existir fuera de una sesión abierta.  
   - El worker de `odoo-adapter` consulta la sesión en estado `opened` para la caja configurada (`pos.config`).  
2. **Mesas (`restaurant.table`):**  
   - En OmniFlow, la entidad `RestaurantTable` almacena el campo `odooTableId: Int` que referencia directamente el ID de la mesa en Odoo.  
3. **Catálogo de Productos (`product.product`):**  
   - Los productos de salón en OmniFlow mantienen la referencia `odooProductId: Int` o SKU coincidente con el registro de Odoo.  
4. **Camareros / Usuarios (`res.users` / `hr.employee`):**  
   - Mapeo opcional del mozo de OmniFlow al empleado de Odoo para trazabilidad y reporte de propinas.

---

## **3\. Módulo Puente en Odoo (`pos_omniflow_sync`)**

Dado que el POS de Odoo corre en el navegador (OWL framework) y mantiene el estado en memoria, insertar una orden en PostgreSQL no actualiza la pantalla del cajero automáticamente. Se requiere emitir un evento al sistema de notificaciones de Odoo (`bus.bus`).

### ***Controlador de Sincronización en Odoo (`controllers/main.py`):***

\# \-\*- coding: utf-8 \-\*-

from odoo import http

from odoo.http import request

import json

&nbsp;

class PosOmniFlowSyncController(http.Controller):

&nbsp;

    @http.route('/api/omniflow/sync\_table\_order', type='json', auth='user', methods=\['POST'\])

    def sync\_table\_order(self, \*\*payload):

        session\_id \= payload.get('session\_id')

        table\_id \= payload.get('table\_id')

        lines \= payload.get('lines', \[\])

        external\_order\_ref \= payload.get('order\_uuid')

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;

        PosOrder \= request.env\['pos.order'\].sudo()

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;

        \# 1\. Buscar o crear orden borrador para la mesa en la sesión activa

        order \= PosOrder.search(\[

            ('session\_id', '=', session\_id),

            ('table\_id', '=', table\_id),

            ('state', '=', 'draft')

        \], limit=1)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;

        if not order:

            order \= PosOrder.create({

                'session\_id': session\_id,

                'table\_id': table\_id,

                'state': 'draft',

                'lines': \[\],

                'pos\_reference': f"OmniFlow-{external\_order\_ref\[-6:\]}" if external\_order\_ref else False

            })

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;

        \# 2\. Agregar líneas enviadas por el mozo

        for line in lines:

            order.write({

                'lines': \[(0, 0, {

                    'product\_id': line\['product\_id'\],

                    'qty': line\['qty'\],

                    'price\_unit': line\['price\_unit'\],

                    'notice': line.get('notes', ''), \# Nota de cocina

                })\]

            })

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;

        \# 3\. Notificar en tiempo real al WebSocket / Longpolling bus de Odoo POS

        pos\_config \= order.session\_id.config\_id

        notification\_payload \= {

            'type': 'ORDER\_SYNC',

            'table\_id': table\_id,

            'order\_id': order.id,

            'lines\_count': len(order.lines)

        }

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;

        request.env\['bus.bus'\].\_sendone(

            pos\_config.\_get\_bus\_channel\_name(),

            'pos.order/sync',

            notification\_payload

        )

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;

        return {

            'status': 'success',

            'odoo\_order\_id': order.id,

            'table\_id': table\_id,

            'total\_lines': len(order.lines)

        }

---

## **4\. Adaptador y Encolamiento en OmniFlow (`odoo-adapter`)**

En `backend/src/integrations/odoo/` se utiliza BullMQ para garantizar resiliencia ante microcortes de red local:

// odoo-table-sync.processor.ts

import { Processor, WorkerHost } from '@nestjs/bullmq';

import { Job } from 'bullmq';

import { OdooAdapterService } from './odoo-adapter.service';

&nbsp;

interface TableOrderSyncJob {

  tenantId: string;

  orderUuid: string;

  odooTableId: number;

  odooConfigId: number;

  items: Array\<{

    odooProductId: number;

    quantity: number;

    unitPrice: number;

    kitchenNotes?: string;

  }\>;

}

&nbsp;

@Processor('odoo-table-sync')

export class OdooTableSyncProcessor extends WorkerHost {

  constructor(private readonly odooService: OdooAdapterService) {

    super();

  }

&nbsp;

  async process(job: Job\<TableOrderSyncJob\>): Promise\<any\> {

    const data \= job.data;

&nbsp;&nbsp;&nbsp;&nbsp;

    // 1\. Obtener la sesión abierta del POS en Odoo

    const activeSessionId \= await this.odooService.getActivePosSession(data.odooConfigId);

    if (\!activeSessionId) {

      throw new Error(\`No hay sesión activa en Odoo POS para la caja configId=${data.odooConfigId}\`);

    }

&nbsp;

    // 2\. Enviar la comanda al endpoint puente

    const result \= await this.odooService.callCustomRoute('/api/omniflow/sync\_table\_order', {

      session\_id: activeSessionId,

      table\_id: data.odooTableId,

      order\_uuid: data.orderUuid,

      lines: data.items.map(item \=\> ({

        product\_id: item.odooProductId,

        qty: item.quantity,

        price\_unit: item.unitPrice,

        notes: item.kitchenNotes,

      })),

    });

&nbsp;

    return result;

  }

}

---

## **5\. Ciclo de Cierre y Liberación de Mesa**

1. **Atención en Caja (Odoo):** El cajero pulsa sobre la mesa activa, visualiza todos los productos ingresados por el mozo, imprime ticket pre-cuenta y procesa el cobro (Efectivo / Tarjeta / QR).  
2. **Validación:** El cajero valida el pago en Odoo, pasando la orden a estado `paid` y liberando la mesa en Odoo.  
3. **Webhook a OmniFlow:** Odoo emite un webhook `POST /api/v1/integrations/odoo/order-paid` con `table_id` y `order_uuid`. OmniFlow actualiza la mesa a estado `AVAILABLE`, cerrando el ciclo operativo del salón sin discrepancias.

&nbsp;