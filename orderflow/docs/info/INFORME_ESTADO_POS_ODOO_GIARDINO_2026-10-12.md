# Informe de Estado: Integración POS Odoo 14 (Giardino) & OrderFlow OmniGastro

**Fecha:** 12 de Octubre de 2026  
**Entorno:** Provecchio (Producción / Local)  
**Servidor Odoo:** `192.168.69.246` (Docker `odoo:14.0`, DB: `prod`)  
**Servicio Adapter:** `odoo-adapter` / `backend` OrderFlow  
**Objetivo:** Habilitación y sincronización de comandas de mozos (OrderFlow) hacia el Punto de Venta activo de Odoo.

---

## 1. Resumen Ejecutivo

Se completó con éxito el destrabe operativo del Punto de Venta **Giardino** (Config ID: `2`) en Odoo 14 y la parametrización de OrderFlow para dirigir las comandas a este TPV. Se cerró una sesión obsoleta e inconsistente que impedía operar el módulo y se validó la apertura de una nueva sesión (`POS/01579`), dejando la pasarela lista para la sincronización de mesas y pedidos.

---

## 2. Diagnóstico y Corrección de Sesión POS Bloqueada

### Incidencia
La sesión `POS/00827` (configurada en el TPV Giardino) impedía su uso normal:
* La interfaz web ofrecía "Continuar venta" pero no permitía aperturar ni cerrar caja con conteo de dinero, retornando en bucle al mismo punto.
* **Causa técnica identificada:** La sesión se encontraba en estado `opening_control` desde el 17-11-2025 con un registro de caja (`account_bank_statement`) en estado `open` y saldo $0, pero sin haber completado la transición a `opened`. Al no tener pedidos asociados (`0` registros en `pos_order`), Odoo no podía ejecutar el cierre contable habitual vía interfaz web.

### Resolución Aplicada
Se ejecutó una regularización directa y limpia en base de datos:
1. Confirmación de caja asociada con balance cuadrado en `$0.00`:
   ```sql
   UPDATE account_bank_statement 
   SET state = 'confirm', balance_end = 0.0, balance_end_real = 0.0 
   WHERE id = 827;
   ```
2. Cierre de sesión formal:
   ```sql
   UPDATE pos_session 
   SET state = 'closed', stop_at = NOW() 
   WHERE id = 827;
   ```
* **Resultado:** TPV Giardino liberado inmediatamente.

---

## 3. Parametrización del PDV Giardino en OrderFlow

### Configuración de Punto de Venta
Se actualizó el parámetro `ODOO_POS_CONFIG_ID` a `2` (Giardino) en todos los archivos de entorno relevantes:
* `/opt/orderflow/.env`
* `/opt/orderflow/.env.provecchio`
* `/opt/orderflow/.env.local`

### Nueva Sesión Activa Verificada
Se comprobó la apertura correcta de la sesión de trabajo desde la interfaz de usuario:
* **Sesión ID:** `1579` (`POS/01579`)
* **Config ID:** `2` (`Giardino`)
* **Usuario:** ID `10`
* **Estado:** **`opened`** (Abierta y lista para recibir transacciones)

---

## 4. Arquitectura del Flujo de Sincronización

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ Mozo (Frontend) │ ────▶ │ Backend OrderFlow│ ────▶ │  Odoo Adapter   │ ────▶ │     Odoo 14     │
│ "Enviar Cocina" │       │ (BullMQ Queue)  │       │ (Port 3005)     │       │ (Giardino ID 2) │
└─────────────────┘       └─────────────────┘       └─────────────────┘       └─────────────────┘
                                                             │                         │
                                                             └─────── JSON-RPC ────────┘
                                                                /api/omniflow/sync_table_order
```

### Componentes Involucrados:
1. **Frontend / Mozo:** Invoca `POST /api/v1/orders/:id/send-to-kitchen`.
2. **Backend Listener:** `odoo-table-sync.listener.ts` captura el evento, toma `ODOO_POS_CONFIG_ID=2` y encola en BullMQ (`odoo-table-sync`).
3. **Adapter (`odoo-adapter`):** Consulta la sesión activa vía `getActivePosSession(2)` (detectando la sesión `1579`) y transmite la orden a Odoo mediante el endpoint `/api/omniflow/sync_table_order`.
4. **Módulo Odoo (`pos_omniflow_sync`):** Crea/actualiza `pos.order` en estado `draft` asignándolo a la mesa y sesión activa, notificando en tiempo real al frontend del TPV mediante `bus.bus`.

---

## 5. Mapeo de Mesas: OrderFlow ↔ Odoo (Giardino)

| Mesa OrderFlow (`tableNumber`) | Mesa Odoo (`restaurant.table`) | Odoo Table ID | Piso Odoo |
| :---: | :---: | :---: | :---: |
| G1 / - | G1 | 25 | Giardino |
| **G2** | **G2** | **40** | Giardino |
| **G3** | **G3** | **75** | Giardino |
| **G4** | **G4** | **76** | Giardino |
| **G5** | **G5** | **77** | Giardino |
| **G6** | **G6** | **78** | Giardino |
| **G7** | **G7** | **79** | Giardino |
| **G8** | **G8** | **80** | Giardino |
| **G9** | **G9** | **81** | Giardino |
| - | T1 | 83 | Giardino |
| - | T2 | 84 | Giardino |

---

## 6. Próximos Pasos Recomendados

1. **Prueba de Comanda End-to-End:** Enviar un pedido de prueba desde el POS de mozo asignado a una mesa de Giardino (ej. `G2`) y validar que aparezca reflejada en tiempo real en la pantalla del TPV Odoo (`http://192.168.69.246:8081/pos/ui?config_id=2#cids=1`).
2. **Validación de Artículos:** Asegurarse de que los productos solicitados cuenten con su `odooProductId` mapeado para que la orden se genere sin discrepancias de precios ni códigos.
3. **Monitoreo de Logs:** En caso de discrepancia durante la prueba, auditar:
   * Worker BullMQ: `docker logs orderflow-backend-prod | grep "OdooTableSyncProcessor"`
   * Adapter: `docker logs orderflow_adapter`
