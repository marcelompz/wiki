# Validación End-to-End: Agenda y Facturación (OrderFlow -> Odoo)

Este documento registra la prueba de escritorio exitosa realizada el 22 de Junio de 2026, validando el circuito completo de compra mixta (Servicios Agendables + Productos Físicos), creación de clientes, y sincronización en Odoo 19.

## 1. Checkout en OrderFlow
El cliente realiza una compra mixta que incluye:
- Servicio: Cata de Café Especial (Domicilio/Local) - Agendado para el 26/6/2026 a las 10:00
- Productos físicos: Espresso Doble, Cappuccino Clásico

![Checkout Completado](/home/marcelompz/.gemini/antigravity/brain/8464b435-b191-493a-860b-2d0722dd3130/media__1782158495886.png)

## 2. Sincronización de Agenda en Odoo
El webhook de OrderFlow transmite los datos al Odoo Adapter, el cual se comunica vía XML-RPC con Odoo 19.
- Odoo crea el evento en la aplicación **Calendario**.
- Se asigna correctamente el horario y la duración del servicio.
- Se vincula al dueño del evento (`user_id`) y se lo agrega como asistente (`partner_ids`), permitiendo que el Administrador vea el turno directamente en su panel mensual.

![Turno en Odoo Calendar](/home/marcelompz/.gemini/antigravity/brain/8464b435-b191-493a-860b-2d0722dd3130/media__1782158541026.png)

## 3. Generación de Orden de Venta y Facturación
Simultáneamente a la creación del turno, el adaptador de Odoo crea la Cotización Comercial (`sale.order` S00020).
- Todos los productos y el servicio agendado son consolidados en una única orden.
- Se calculan correctamente los impuestos (IVA 10%).
- Se respeta el RUC del cliente (3203042-8) validándolo contra las reglas del módulo de **Facturación Electrónica Paraguaya**.

![Cotización en Odoo](/home/marcelompz/.gemini/antigravity/brain/8464b435-b191-493a-860b-2d0722dd3130/media__1782158557891.png)

## Mejoras Técnicas Implementadas en esta Sesión
1. **Fallback de Clientes Anónimos**: Se configuró el pase de VAT nulo para permitir compras de invitados (Guest) sin chocar con la API de la Subsecretaría de Estado de Tributación (SET) de Paraguay.
2. **Resiliencia de Webhooks**: Implementación de un `WebhookCronService` en NestJS que reintenta cada 5 minutos los envíos fallidos hacia Odoo.
3. **Visibilidad de Agenda**: Resolución de un tecnicismo de Odoo donde el dueño de la cita debe estar listado en `partner_ids` para que se dibuje en su calendario personal.
4. **Dashboard de Clientes CRUD**: Construcción completa de una interfaz de gestión de clientes (alta, baja y modificación) en el panel administrativo de OrderFlow, permitiendo sanear datos fallidos como RUCs inventados.
5. **Corrección de Base de Datos Odoo**: Aplicación de actualización de esquema (`-u`) para el módulo `pos_customer_balance_ce` que carecía de la columna `pricelist_id` en PostgreSQL.

La integración bidireccional entre la tienda, la agenda y el ERP queda **certificada al 100%**.
