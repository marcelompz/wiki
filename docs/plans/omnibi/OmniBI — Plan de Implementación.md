# OmniFlow BI — Plan de Implementación

> **Versión:** 1.0 (Blueprint)
>
> **Estado:** Diseño
>
> **Objetivo:** Convertir OmniFlow en una plataforma de Business Intelligence y Decision Intelligence mediante la captura estandarizada de datos operativos y la generación de KPI, insights y recomendaciones accionables.

---

# Índice

1. Visión
2. Principios de diseño
3. Arquitectura general
4. Modelo de datos analítico
5. Fuentes de datos
6. Contrato de datos por módulo
7. KPI Dictionary
8. Roadmap de implementación
9. Dashboards
10. Insights y recomendaciones
11. Calidad de datos
12. Escalabilidad
13. Criterios de éxito

---

# 1. Visión

OmniFlow BI no será un módulo aislado.

Será una **capa transversal de inteligencia empresarial** que transformará los datos generados por toda la plataforma en información útil para la toma de decisiones.

## Objetivos

- Unificar información de todos los canales de venta.
- Detectar oportunidades comerciales automáticamente.
- Medir rendimiento operativo.
- Reducir decisiones basadas en intuición.
- Generar recomendaciones accionables.

## Filosofía

> "Toda operación genera datos. Todo dato debe poder transformarse en una decisión."

---

# 2. Principios de Diseño

## Omnicanal

Toda venta debe analizarse independientemente de su origen.

Canales soportados:

- POS
- E-commerce
- WhatsApp
- App móvil
- Marketplace
- Call Center
- Venta manual

## Modelo único de venta

Conceptualmente, todas las ventas pertenecen a una única entidad:

```text
OmniFlow Sale
```

Los canales solamente agregan contexto.

## KPI primero

Los datos se capturan porque alimentan indicadores.

No se generan indicadores con datos incompletos.

---

# 3. Arquitectura General

```text
                                  OMNIFLOW BI

                                       │

           ┌───────────────────────────┼───────────────────────────┐

           ▼                           ▼                           ▼

        Ventas                    Clientes                    Operación

           │                           │                           │

      ┌────┼────┐                      CRM                    Inventario

      │    │    │                                             Compras

     POS Ecommerce WhatsApp                                  Producción

           │
           │ (EventBus / BullMQ)
           ├─────────────────────────────────────────┐
           ▼                                         ▼
   OmniFlow Data Layer                       WebSockets Event Engine
 (PostgreSQL / OLAP Aggregations)            (OrdersGateway / Redis Rooms)
           │                                         │
           ▼                                         ▼
   Historical & YoY Analytics                 Live Real-Time Stream
           │                                         │
           └────────────────────┬────────────────────┘
                                ▼
                           KPI Engine
                                ▼
                      Analytics + Insights
                                ▼
                      Decision Intelligence
```

## 3.1 Motor Híbrido de Visualización (Dual Engine)

OmniFlow BI implementa un motor dual para cubrir tanto el monitoreo operativo instantáneo como la toma de decisiones estratégicas:

### 1. Engine A: Live Real-Time Stream Engine (Tiempo Real)
- **Mecanismo:** Suscripción por canal de tenant (`tenant:<tenantId>`) utilizando el Gateway de WebSockets (`OrdersGateway`) y el bus de eventos interno (`EventBus` + `BullMQ`).
- **Comportamiento:** Cuando ocurre una transacción en POS, e-commerce o WhatsApp (`order:created`, `order:paid`, `order:status_changed`), la interfaz de administración actualiza dinámicamente:
  - Ventas netas acumuladas del día.
  - Ticket promedio en vivo del turno activo.
  - Contador de pedidos en preparación / entrega.
  - Gráfico de ventas por hora del día actual.
- **Ventaja:** Cero necesidad de *polling* o recargas manuales; latencia de actualización inferior a **500 ms**.

### 2. Engine B: Strategic & Comparative Analytics Engine (Analítica Histórica)
- **Mecanismo:** Consultas de agregación en base de datos PostgreSQL (`$queryRaw`) con soporte multi-tier (`@TenantPrisma()`).
- **Comportamiento:** Procesa matrices multidimensionales (YoY, Mes a Mes, segmentación RFM, rotación de inventarios).
- **Ventaja:** Alta eficiencia computacional y capacidad de consulta profunda sin sobrecargar la memoria de la aplicación.

---

# 4. Modelo de Datos Analítico

## Dimensiones

| Dimensión | Descripción |
|-----------|-------------|
| Fecha | Día, semana, mes, año |
| Hora | Hora y franja horaria |
| Canal | POS, Web, WhatsApp |
| Cliente | Segmento y comportamiento |
| Producto | Producto individual |
| Categoría | Clasificación comercial |
| Local | Sucursal |
| Empleado | Vendedor o camarero |
| Método de pago | Efectivo, tarjeta, transferencia |

## Tablas de hechos

- Fact Sales
- Fact Sales Lines
- Fact Inventory
- Fact Purchases
- Fact Production
- Fact Customer Activity
- Fact Payments

---

# 5. Fuentes de Datos

## POS

Capturar:

- fecha
- hora
- mesa
- camarero
- comensales
- canal
- método de pago
- timestamps operativos

### Nuevos campos

| Campo | Obligatorio |
|---------|-------------|
| party_size | Opcional |
| order_created_at | Sí |
| order_served_at | Restaurante |
| order_paid_at | Sí |

---

## E-commerce

Capturar:

- visitas
- sesiones
- productos vistos
- carrito
- checkout
- pedido
- origen del tráfico

### Funnel

```text
Visita

↓

Producto

↓

Carrito

↓

Checkout

↓

Compra
```

---

## CRM

Capturar:

- campañas
- origen del lead
- canal de contacto
- conversión
- cliente recurrente

---

## WhatsApp

Registrar:

- conversación
- intención
- presupuesto
- venta
- tiempo de respuesta

---

## Inventario

Registrar:

- stock
- movimientos
- costo
- rotación
- cobertura

---

## Compras

Registrar:

- proveedor
- lead time
- costo
- cumplimiento

---

## Producción

Registrar:

- consumo teórico
- consumo real
- desperdicio
- rendimiento

---

## ERP Integrations Pre-processor (Odoo 18/19 CE, Tango ERP, FacturaSend)

Pre-procesar e ingestar información operativa y contable sincronizada desde ERPs:

- **Costos Reales y Valorización PMP:** Ingesta de `standard_price` y movimientos de stock (`stock.move`) de Odoo 18/19 para calcular la ganancia bruta real y el margen financiero neto.
- **Ventas B2B & Facturación Directa ERP:** Consolidar facturas contables (`account.move`) y ventas directas emitidas en Odoo o Tango ERP para una visión unificada de ventas B2B + minoristas.
- **Lead Time de Proveedores & Compras:** Registrar tiempos de reposición de proveedores (`purchase.order` / `stock.picking`) para alimentar alertas predictivas de quiebre de stock.
- **Reconciliación Operativa vs. Fiscal:** Comparativa de ventas en vivo en OrderFlow vs. documentos electrónicos autorizados (`FacturaSend` / `SIFEN`).

---

# 6. Contrato de Datos

Cada módulo deberá exponer datos mínimos obligatorios.

## ERP Integration Data Contract (Odoo 18/19 CE / Tango)

| Dato ERP | Requerido | Descripción / Mapeo |
|----------|-----------|--------------------|
| `cost_price_pmp` | Sí | Costo promedio ponderado real de Odoo 18/19 |
| `account_move_id` | Opcional | ID de factura emitida contablemente en Odoo / Tango |
| `b2b_sales_amount` | Opcional | Importe de ventas corporativas directas en ERP |
| `supplier_lead_time` | Opcional | Días promedio de entrega del proveedor |
| `sifen_fiscal_status` | Sí | Estado del Documento Electrónico (`APPROVED`, `PENDING`) |

## POS

| Dato | Requerido |
|------|-----------|
| Timestamp | Sí |
| Canal | Sí |
| Local | Sí |
| Producto | Sí |
| Precio | Sí |
| Costo | Sí |
| Empleado | Sí |

## Restaurante

Campos adicionales:

- mesa
- comensales
- tiempo cocina
- tiempo servicio

## E-commerce

| Dato | Requerido |
|------|-----------|
| Fuente tráfico | Sí |
| Dispositivo | Sí |
| Conversión | Sí |

---

# 7. KPI Dictionary

## Ventas

| KPI | Fórmula |
|------|---------|
| Ventas Netas | Total ventas |
| Ticket Promedio | Ventas / Órdenes |
| Ventas por Hora | Ventas / Hora |
| Ventas por Canal | Agrupado |

## Restaurante

| KPI | Fórmula |
|------|---------|
| Gasto por Comensal | Ventas / Comensales |
| Ocupación | Comensales / Capacidad |
| Rotación de Mesas | Mesas atendidas / Mesas |

## E-commerce

| KPI | Fórmula |
|------|---------|
| Conversión | Compras / Visitas |
| Carrito abandonado | Carritos sin compra |

## Clientes

- Clientes nuevos
- Recurrentes
- Frecuencia
- CLV
- Churn

## Inventario

- Rotación
- Cobertura
- Stock crítico
- Slow Moving
- Overstock

## Compras

- Lead Time
- Variación de costo
- Cumplimiento

## Producción, Fabricación & Costeo Industrial

| KPI | Fórmula / Cálculo |
|------|-------------------|
| **Variación de Receta** | Consumo Real Mat. Prima - Consumo Teórico (BOM) |
| **Índice de Mermas / Desperdicio** | (Costo Mermas + Scrap) / Costo Total Producción |
| **Costo de Descartables & Packaging** | Insumos de despacho / Unidades Producidas u Órdenes |
| **Costo Fijo Prorrateado** | Overhead Mensual / (Unidades Producidas u Horas Lote) |
| **Costo Industrial Total (COGS Real)** | Compras Insumos + Mano de Obra Directa + Fabricación + Descartables + Mermas |
| **Margen Bruto Industrial** | Ventas Netas - Costo Industrial Directo |
| **Rentabilidad Neta de Producción** | Ventas Netas - (Compras + Fabricación + Descartables + Mermas) - Costos Fijos Prorrateados |

### Fórmula Maestra de Rentabilidad Neta Industrial:

$$\text{Rentabilidad Neta} = \text{Ventas} - \Big( \text{Costos Compras} + \text{Costo Fabricación} + \text{Descartables} + \text{Mermas} \Big) - \text{Costos Fijos Prorrateados}$$

---

# 8. Roadmap de Implementación

## Fase 0 — Data Foundation

**Objetivo:** Preparar toda la plataforma.

### Cambios

- [ ] timestamps unificados
- [ ] party_size
- [ ] canal obligatorio
- [ ] local obligatorio
- [ ] costo obligatorio
- [ ] estados normalizados
- [ ] dimensiones analíticas

**Resultado**

Todos los módulos producen datos compatibles.

---

## Fase 1 — Sales BI

### Dashboard Ejecutivo
- Ventas
- Ticket promedio
- Órdenes
- Margen
- Comparativo temporal

### Visualizaciones & Real-Time Stream
- **Live Operational Stream:** Monitoreo en vivo del turno activo mediante suscripción WebSocket (`OrdersGateway`).
- Ventas por día
- Ventas por hora (actualización instantánea)
- Ventas por canal
- Top productos

---

## Fase 2 — Restaurant BI

Agregar:

- ocupación
- comensales
- rotación
- tiempos cocina
- tiempos servicio

### Heatmap

```text
      Hora

Lun ░░███

Mar ░░███

Mié ░████

Jue █████

Vie █████
```

---

## Fase 3 — E-commerce Intelligence

Dashboards:

- Funnel
- Conversión
- Abandono
- Ventas por origen
- Dispositivo

---

## Fase 4 — Product Intelligence

Matriz comercial

| Venta | Margen |
|--------|---------|
| Alta | Estrella |
| Baja | Oportunidad |

---

## Fase 5 — Inventory Intelligence

Dashboards:

- Cobertura
- Stock crítico
- Rotación
- Valorización

---

## Fase 5B — Industrial & Manufacturing Intelligence (Costeo y Rentabilidad Neta)

Implementar motor analítico de costeo industrial:

- **BOM & Recetas:** Consumo teórico vs. consumo real de insumos por lote/producto.
- **Auditoría de Mermas & Scrap:** Registro y costo de desperdicios en producción.
- **Costeo de Descartables:** Insumos de despacho y packaging asignados por orden.
- **Prorrateo de Costos Fijos:** Ingesta de gastos fijos mensuales (alquiler, salarios estructurados, servicios) y regla de prorrateo por unidad u hora de fabricación.
- **Análisis de Rentabilidad Neta:** Cálculo de rentabilidad neta real por producto, receta y canal.

---

## Fase 6 — Customer Intelligence

Implementar:

- RFM
- CLV
- Segmentación
- Fidelización

---

## Fase 7 — Decision Intelligence

El sistema comenzará a generar recomendaciones automáticamente.

Ejemplos:

> "Los martes entre 15 y 18 horas tienen baja demanda."

> "Existe stock suficiente para promover Cheesecake."

> "WhatsApp convirtió mejor que Instagram esta semana."

> "El costo de descartables en el canal Delivery redujo el margen neto de la hamburguesa Doble en 14%."

---

# 9. Dashboards

## Dashboard Ejecutivo

KPIs:

- Ventas
- Margen Bruto
- Margen Neto Industrial
- Ticket
- Clientes
- Crecimiento

## Dashboard Comercial

- Ventas por canal
- Productos
- Categorías
- Promociones

## Dashboard de Rentabilidad Industrial & Costos

- Rentabilidad Neta de Producción por Producto/Categoría
- Desglose de COGS (Compras Insumos + Fabricación + Descartables + Mermas)
- Impacto de Mermas y Scrap en Margen
- Absorción de Costos Fijos Prorrateados
- Análisis de Punto de Equilibrio (Break-Even) por Unidad

## Dashboard Operativo

- Tiempos
- Productividad
- Capacidad

## Dashboard Inventario

- Rotación
- Cobertura
- Stock crítico

## Dashboard Marketing

- Campañas
- Conversión
- ROI

---

# 10. Insights

OmniFlow deberá transformar métricas en lenguaje de negocio.

Ejemplo

```text
Insight detectado

Miércoles

15:00–18:00

Ventas 28% debajo del promedio.

Capacidad disponible.

Margen promedio alto.

Recomendación:

Crear promoción Happy Hour.
```

---

# 11. Calidad de Datos

El BI medirá la confiabilidad de la información.

## Data Quality Score

```text
██████████████████░░

89%
```

Ejemplo

| Área | Estado |
|-------|--------|
| POS | Excelente |
| Inventario | Bueno |
| Clientes | Mejorable |

---

# 12. Escalabilidad

## Primera etapa

Todo funcionará sobre PostgreSQL.

## Segunda etapa

Preparar extracción hacia:

- Data Warehouse
- Materialized Views
- Agregaciones

Sin modificar los módulos operativos.

---

# 13. Criterios de Éxito

## Técnicos

- Todos los módulos exponen datos normalizados.
- KPIs consistentes.
- Dashboards rápidos con actualización en tiempo real mediante WebSockets (latencia < 500 ms en eventos de venta/pago).
- Consultas escalables.

## Funcionales

El usuario puede responder:

- ¿Qué está pasando?
- ¿Por qué está pasando?
- ¿Qué oportunidad existe?
- ¿Qué acción conviene tomar?

## Comerciales

OmniFlow BI deberá convertirse en un diferenciador competitivo de la plataforma.

El éxito del módulo no se medirá por la cantidad de gráficos disponibles, sino por la cantidad de decisiones de negocio que ayude a tomar con información confiable y oportuna.