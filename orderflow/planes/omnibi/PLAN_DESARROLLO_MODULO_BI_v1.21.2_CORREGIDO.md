# OmniFlow BI — Plan de Implementación

**Documento Técnico Oficial – Blueprint de Inteligencia de Negocio**  
**Gobernanza:** FEAT-067 v1.21.0  
**Ecosistema:** OmniFlow SaaS (NestJS, Prisma, React/Refine, Redis, PostgreSQL)  
**Fecha:** Agosto 2026  
**Estado:** Aprobado para implementación (versión corregida y consolidada)

---

## 1. Visión y Objetivos Estratégicos

Establecer una infraestructura de Business Intelligence nativa para OmniFlow que transforme datos transaccionales en inteligencia accionable, permitiendo una visión de 360° del rendimiento comercial y operativo a través de múltiples canales y verticales de negocio.

### Objetivos principales
- Unificar información de todos los canales de venta bajo un modelo único.
- Detectar oportunidades comerciales automáticamente.
- Medir rendimiento operativo y de rentabilidad con precisión.
- Reducir decisiones basadas en intuición.
- Generar recomendaciones accionables (Decision Intelligence).
- Garantizar aislamiento multi-tenant y exactitud de datos del 100 %.

### Filosofía
> “Toda operación genera datos. Todo dato debe poder transformarse en una decisión.”

---

## 2. Principios de Diseño

- **Omnicanalidad Nativa:** Integración de datos provenientes de POS físico, E-commerce, WhatsApp, Marketplaces, App móvil y Call Center bajo una misma capa de análisis.
- **Modelo Único OmniFlow Sale:** Normalización de cada transacción en una estructura estándar de venta para comparativas uniformes entre canales.
- **KPI Primero (KPI-First):** El diseño del sistema se orienta a satisfacer la entrega de indicadores clave definidos antes que la visualización estética.
- **Multi-tenant inviolable:** Todo cálculo y consulta debe filtrar explícitamente por `tenantId`.
- **Contratos formales:** Definición estricta de datos vía `analytics.manifest.json`.
- **Soporte multi-tier:** Compatibilidad nativa con bases de datos compartidas (`shared`) y dedicadas (`dedicated`) por tenant.

---

## 3. Arquitectura del Motor Dual

La arquitectura se basa en dos motores complementarios que alimentan una capa unificada de KPIs, Insights y Decision Intelligence.

### 3.0 Diagrama de Arquitectura General

```text
                              ┌─────────────────────────────────────┐
                              │         OMNIFLOW BI LAYER           │
                              │   (KPIs · Insights · Decision AI)   │
                              └──────────────────┬──────────────────┘
                                                 │
                    ┌────────────────────────────┼────────────────────────────┐
                    │                            │                            │
                    ▼                            ▼                            ▼
         ┌──────────────────┐       ┌──────────────────────┐      ┌──────────────────┐
         │  Live Real-Time  │       │ Strategic & Comparative│      │  Data Quality &  │
         │  Stream Engine   │       │   Analytics Engine     │      │  Insights Engine │
         │                  │       │                        │      │                  │
         │ • OrdersGateway  │       │ • $queryRaw (Prisma)   │      │ • Anomaly Detect │
         │ • EventBus       │       │ • Matrices YoY / MoM   │      │ • Scoring        │
         │ • BullMQ         │       │ • P&L + Menu Engineer. │      │ • Recommendations│
         │ • Redis Rooms    │       │ • RFM / CLV / Inventory│      │                  │
         │ Latencia < 500ms │       │ Latencia reportes <200ms│     │                  │
         └────────┬─────────┘       └───────────┬────────────┘      └────────┬─────────┘
                  │                             │                            │
                  │                             │                            │
                  └──────────────┬──────────────┴────────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────────┐
                    │     OmniFlow Data Layer    │
                    │  (PostgreSQL + Redis Cache)│
                    └────────────┬───────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          │                      │                      │
          ▼                      ▼                      ▼
   ┌─────────────┐      ┌─────────────────┐    ┌─────────────────┐
   │   Shared    │      │    Dedicated    │    │  Redis (Cache + │
   │  PostgreSQL │      │   PostgreSQL    │    │   Rooms / Queues│
   │ (multi-tenant│     │ (1 DB por tenant│    │   por tenant)   │
   │  + tenantId)│      │   enterprise)   │    └─────────────────┘
   └──────┬──────┘      └────────┬────────┘
          │                      │
          └──────────┬───────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │   Fuentes de Datos         │
        │                            │
        │  POS · E-com · WhatsApp    │
        │  CRM · Inventario · Compras│
        │  Producción · ERP (Odoo /  │
        │  Tango / FacturaSend)      │
        └────────────────────────────┘
```

**Leyenda de flujo:**
- Las transacciones (POS, E-com, WhatsApp…) generan eventos → EventBus / BullMQ.
- El **Live Engine** consume eventos en tiempo real y empuja actualizaciones vía WebSocket al dashboard operativo.
- El **Strategic Engine** consulta el Data Layer (con filtro `tenantId` o conexión dedicada) para matrices históricas, YoY, P&L y Menu Engineering.
- Ambos motores alimentan la capa superior de KPIs, Insights y Decision Intelligence.
- Redis actúa como caché de reportes + rooms de WebSocket + colas, siempre namespaced por `tenantId`.

### 3.1 Live Real-Time Stream Engine
- **Mecanismo:** WebSockets (`OrdersGateway`) + EventBus + BullMQ + Redis Rooms.
- **Suscripción:** Canal por tenant (`tenant:<tenantId>`).
- **Eventos:** `order:created`, `order:paid`, `order:status_changed`.
- **Comportamiento:** Actualización en vivo de ventas netas del día, ticket promedio del turno, contador de pedidos en preparación y gráfico de ventas por hora.
- **Latencia objetivo:** < 500 ms.

### 3.2 Strategic & Comparative Analytics Engine
- **Mecanismo:** Consultas de agregación en PostgreSQL (`$queryRaw`) con soporte multi-tier (`@TenantPrisma()`).
- **Comportamiento:** Matrices multidimensionales (YoY, Mes a Mes), segmentación RFM, rotación de inventarios, P&L dinámico y Menu Engineering.
- **Ventaja:** Alta eficiencia computacional sin sobrecargar la memoria de la aplicación.

---

## 3.3 Arquitectura Multi-Tenant y Tiers de Base de Datos

OmniFlow opera bajo un modelo **multi-tenant estricto** con soporte de **múltiples tiers de aislamiento de datos**. Esta arquitectura es un requisito inviolable de toda la capa de BI.

### 3.3.1 Principios de aislamiento

1. **Filtro obligatorio por `tenantId`**  
   Toda consulta SQL (incluyendo `$queryRaw`) debe incluir:
   ```sql
   WHERE o."tenantId" = ${tenantId}::uuid
   ```
   Nunca se permiten consultas cross-tenant, ni siquiera para agregaciones globales de plataforma.

2. **Inyección dinámica del cliente Prisma (`@TenantPrisma`)**  
   Los servicios de BI aceptan un cliente Prisma inyectado de forma dinámica:
   ```typescript
   const prisma = dbClient || this.prisma;
   ```
   Esto permite que el mismo código funcione tanto en tenants de base compartida como en tenants de base dedicada.

3. **Redis y WebSockets por tenant**  
   - Claves de caché: `tenant:{tenantId}:year:{year}:...`
   - Rooms de WebSocket: `tenant:{tenantId}`
   - Colas BullMQ segmentadas por tenant cuando sea necesario.

### 3.3.2 Tiers de base de datos

| Tier          | Descripción                                                                 | Aislamiento                          | Casos de uso típicos                          | Implicaciones para BI                          |
|---------------|-----------------------------------------------------------------------------|--------------------------------------|-----------------------------------------------|------------------------------------------------|
| **Shared**    | Múltiples tenants comparten la misma instancia PostgreSQL (schemas o row-level isolation vía `tenantId`) | Lógico (filtro `tenantId`)          | Tenants pequeños y medianos, planes estándar  | Consultas siempre filtradas. Índices compuestos `(tenantId, createdAt, ...)` obligatorios. |
| **Dedicated** | Cada tenant tiene su propia instancia PostgreSQL (o base de datos independiente) | Físico (base de datos separada)     | Tenants enterprise, alto volumen, requisitos de compliance | El cliente Prisma apunta a la conexión específica del tenant. No se requiere filtro `tenantId` en algunos contextos internos, pero se mantiene por consistencia y seguridad. |

### 3.3.3 Flujo de resolución de conexión (multi-tier)

```text
┌──────────────┐
│   Request    │
│ (API / WS)   │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│   AuthGuard      │  ← extrae tenantId del JWT / contexto
└──────┬───────────┘
       │
       ▼
┌──────────────────────────┐
│ TenantContext / Resolver │  ← determina tier (Shared | Dedicated)
└──────┬───────────────────┘
       │
       ├──────────────────────────────┐
       │                              │
       ▼                              ▼
┌─────────────────┐        ┌──────────────────────┐
│  Tier: Shared   │        │  Tier: Dedicated     │
│                 │        │                      │
│ Prisma global   │        │ Prisma client propio │
│ + filtro        │        │ (connection string   │
│   tenantId      │        │  del tenant)         │
└────────┬────────┘        └──────────┬───────────┘
         │                            │
         └────────────┬───────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │  Servicio de BI        │
         │  (@TenantPrisma)       │
         │  const prisma =        │
         │    dbClient || this.prisma
         └────────────┬───────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │  $queryRaw / agregaciones│
         │  / findMany / etc.       │
         └────────────────────────┘
```

### 3.3.4 Implicaciones técnicas para el módulo BI

- **Servicios de agregación** deben ser *tier-agnostic*: el mismo código SQL funciona en ambos tiers gracias a la inyección de `dbClient`.
- **Índices**: En tier Shared se recomiendan índices compuestos que empiecen por `tenantId`. En Dedicated los índices pueden omitir `tenantId` si se desea, pero se mantiene por uniformidad.
- **Caché Redis**: Siempre namespaced por `tenantId`, independientemente del tier.
- **Materialized Views / Particionado futuro**: En Dedicated se pueden crear por tenant; en Shared se particiona por `tenantId` + tiempo.
- **Migraciones Prisma**: Se ejecutan de forma controlada según el tier (shared schema vs. dedicated schema).
- **Data Quality Score y reportes**: Siempre calculados dentro del scope del tenant actual.

### 3.3.5 Seguridad y compliance

- Ningún endpoint de BI puede devolver datos de otro tenant, incluso por error de programación.
- Auditoría de consultas: se recomienda logging del `tenantId` utilizado en cada agregación pesada.
- En tenants Dedicated se puede habilitar cifrado en reposo y backups independientes.

---

## 4. Modelo de Datos Dimensional y Tablas de Hechos

Implementación de un **esquema de estrella** centrado en la tabla de hechos de líneas de venta normalizadas.

### Dimensiones principales
| Dimensión     | Descripción                                      |
|---------------|--------------------------------------------------|
| Tiempo        | Día, semana, mes, año, hora, franja horaria      |
| Canal         | POS, E-commerce, WhatsApp, Marketplace, etc.     |
| Producto      | Producto individual + categoría                  |
| Tenant        | Aislamiento multi-tenant                         |
| Ubicación     | Local / Sucursal                                 |
| Cliente       | Segmento, comportamiento, RFM                    |
| Empleado      | Vendedor / camarero                              |
| Método de pago| Efectivo, tarjeta, transferencia, etc.           |

### Tablas de hechos
- `fact_order_lines` (núcleo – líneas de venta normalizadas)
- `fact_orders` (cabecera)
- `fact_inventory_movements`
- `fact_purchases`
- `fact_production` (consumo teórico vs real, mermas)
- `fact_customer_activity`
- `fact_payments`

### Campos críticos de captura (Data Foundation)
| Campo              | Obligatorio | Origen          | Uso principal                  |
|--------------------|-------------|-----------------|--------------------------------|
| `tenantId`         | Sí          | Todos           | Aislamiento                    |
| `createdAt` / timestamps unificados | Sí | Todos      | Dimensión tiempo               |
| `priceAtSale`      | Sí          | order_lines     | Facturación real               |
| `party_size` / `dinersCount` | Recomendado | POS Restaurante | Spend per Diner, RevPASH |
| `tableNumber`      | Recomendado | POS Restaurante | Rotación de mesas              |
| `channel`          | Sí          | Todos           | Análisis omnicanal             |
| `locationId`       | Sí          | Todos           | Análisis por sucursal          |
| `costAtSale` / costo | Sí        | Producto / ERP  | Márgenes reales                |
| `status` (enum)    | Sí          | Orders          | Exclusión de DRAFT / CANCELLED |

> **Nota de implementación:** En el esquema real de OrderFlow se utilizan nombres camelCase entre comillas dobles en SQL raw (`"tenantId"`, `"priceAtSale"`, `"orderId"`, etc.) y la tabla de detalle es `order_lines` (no `order_items`).

---

## 5. Modelo de Rentabilidad Integral y Costeo de Producción

Extensión del modelo para cubrir la cadena de valor completa: Compras, Fabricación/Producción (Fichas Técnicas / BOM / Escandallos), Control de Mermas, Descartables/Packaging, Talento Humano (MOD + cargas sociales) y Prorrateo de Costos Fijos.

### Fórmula Maestra de Rentabilidad Neta de Producción
\[
\text{Rentabilidad Neta} = \text{Ventas} - \bigl(\text{Costo Materia Prima Consumida} + \text{MOD} + \text{Mermas}\bigr) - \text{Descartables/Packaging} - \text{Costos Fijos Prorrateados}
\]

### Niveles de Margen
1. **Margen de Contribución 1 (Bruto):** Ventas − Materia Prima.
2. **Margen de Contribución 2 (Fabricación):** MC1 − (Mermas + Descartables + MOD).
3. **Margen Neto Operativo (EBITDA por Producto/Línea):** MC2 − Costos Fijos Prorrateados.

---

## 6. Fuentes de Datos y Contrato por Módulo

Integración modular mediante el **ERP Pre-processor** para normalizar fuentes externas.

### Conectores ERP soportados
- Odoo 18/19 CE
- Tango ERP
- FacturaSend / SIFEN (reconciliación fiscal)

### Contrato de Datos
Definición estricta vía **`analytics.manifest.json`**, incluyendo:
- Producción / Recetas / BOM
- Compras / PMP (Precio Medio Ponderado)
- Gastos Fijos
- Talento Humano / Nómina
- Campos obligatorios por módulo (POS, E-commerce, Inventario, etc.)

### Fuentes internas
- POS (timestamps, mesa, comensales, camarero, método de pago)
- E-commerce (funnel: visita → producto → carrito → checkout → compra, dispositivo, origen de tráfico)
- WhatsApp / CRM
- Inventario (movimientos, stock, rotación, cobertura)
- Compras (proveedor, lead time, costo)
- Producción (consumo teórico vs real, desperdicio)

---

## 7. KPI Dictionary Exhaustivo (Detalle de Métricas)

Todas las métricas se calculan **dentro del scope del tenant** y excluyen órdenes con status `DRAFT` o `CANCELLED`.

### 7.1 Ventas & Restaurante

| KPI                    | Fórmula / Cálculo                                                                 | Fuente principal                  | Notas de implementación |
|------------------------|-----------------------------------------------------------------------------------|-----------------------------------|-------------------------|
| **Ventas Netas**       | \(\sum (\text{quantity} \times \text{priceAtSale})\)                              | `order_lines` + `orders`          | Usar `"priceAtSale"`. Filtrar por rango de fechas y `tenantId`. |
| **Ticket Promedio**    | \(\frac{\text{Ventas Netas}}{\text{Nº Órdenes}}\)                                 | `orders`                          | Solo órdenes confirmadas/pagadas. |
| **Spend per Diner**    | \(\frac{\text{Ventas Netas}}{\sum \text{dinersCount}}\)                           | `orders` (campo `dinersCount` / `party_size`) | Requiere captura confiable de comensales. Si es null se excluye del promedio o se imputa. |
| **RevPASH**            | \(\frac{\text{Ventas Netas}}{\text{Asientos disponibles} \times \text{Horas abiertas}}\) | Configuración de local + ventas  | Requiere dato de capacidad de mesas/asientos por local. |
| **Rotación de Mesas**  | \(\frac{\text{Mesas atendidas (únicas)}}{\text{Mesas disponibles}}\)              | `orders.tableNumber` + config local | Contar `DISTINCT tableNumber` en el período. |
| **Ventas por Hora**    | Ventas agrupadas por `EXTRACT(HOUR FROM "createdAt")`                             | `orders` / `order_lines`          | Base del heatmap 7×24. |
| **Ventas por Canal**   | Agrupación por campo `channel`                                                    | `orders.channel`                  | POS, WEB, WHATSAPP, MARKETPLACE, etc. |

### 7.2 E-commerce & Clientes

| KPI                    | Fórmula / Cálculo                                                                 | Fuente principal                  | Notas de implementación |
|------------------------|-----------------------------------------------------------------------------------|-----------------------------------|-------------------------|
| **Tasa de Conversión** | \(\frac{\text{Órdenes completadas}}{\text{Sesiones o Visitas}}\)                  | Eventos web + `orders`            | Requiere tracking de funnel (visita → producto → carrito → checkout → compra). |
| **Carrito Abandonado** | \(\frac{\text{Carritos iniciados sin compra}}{\text{Carritos iniciados}}\)        | Eventos de carrito                | Porcentaje o valor monetario abandonado. |
| **LTV (Lifetime Value)** | \(\sum \text{Margen de un cliente a lo largo de su vida}\) o predicción           | Historial de `orders` por cliente | Se puede calcular histórico o predictivo (modelo simple o ML). |
| **CAC**                | \(\frac{\text{Gasto en marketing / adquisición}}{\text{Nuevos clientes}}\)        | Módulo marketing + clientes nuevos| Requiere atribución de origen. |
| **RFM Score**          | Recency + Frequency + Monetary (normalizado 1-5)                                  | Historial de compras por cliente  | Segmentación clásica. |
| **Churn Rate**         | \(\frac{\text{Clientes inactivos en período}}{\text{Clientes activos inicio período}}\) | Historial de compras           | Definir ventana de inactividad (ej. 90 días). |

### 7.3 Operaciones & Inventario

| KPI                    | Fórmula / Cálculo                                                                 | Fuente principal                  | Notas de implementación |
|------------------------|-----------------------------------------------------------------------------------|-----------------------------------|-------------------------|
| **Rotación de Stock**  | \(\frac{\text{Costo de Ventas (COGS)}}{\text{Stock promedio}}\)                   | Movimientos de inventario + ventas| Stock promedio = (Stock inicial + Stock final) / 2. |
| **Cobertura (días)**   | \(\frac{\text{Stock actual}}{\text{Consumo promedio diario}}\)                    | Stock + historial de consumo      | Alerta cuando cobertura < lead time del proveedor. |
| **Stock Crítico**      | Productos donde `stock_actual ≤ punto_de_reorden`                                 | Inventario                        | Lista priorizada. |
| **Slow Moving / Overstock** | Productos con rotación muy baja o cobertura excesiva                           | Inventario + ventas               | Umbrales configurables por categoría. |
| **Ratio de Compras**   | \(\frac{\text{Valor de compras}}{\text{Ventas Netas}}\)                           | `fact_purchases` + ventas         | Indicador de presión de compras. |

### 7.4 Producción & Costeo Industrial

| KPI                          | Fórmula / Cálculo                                                                 | Fuente principal                  | Notas de implementación |
|------------------------------|-----------------------------------------------------------------------------------|-----------------------------------|-------------------------|
| **Variación de Receta**      | Consumo Real de Materia Prima − Consumo Teórico (BOM)                             | `fact_production` + recetas       | Por lote o por producto. |
| **Índice de Mermas**         | \(\frac{\text{Costo Mermas + Scrap}}{\text{Costo Total de Producción}}\)          | Registro de desperdicios          | Expresado en %. |
| **Costo de Descartables**    | \(\frac{\text{Insumos de packaging}}{\text{Unidades producidas u órdenes}}\)      | Consumo de packaging              | Asignable por canal (ej. Delivery vs Salón). |
| **Costo Fijo Prorrateado**   | \(\frac{\text{Overhead mensual}}{\text{Unidades o Horas de fabricación}}\)        | Gastos fijos + producción         | Regla de prorrateo configurable. |
| **COGS Real (Industrial)**   | Materia Prima + MOD + Fabricación + Descartables + Mermas                         | Múltiples fuentes                 | Base para margen real. |
| **Margen Bruto Industrial**  | Ventas Netas − Costo Industrial Directo                                           | Ventas + COGS                     | Por producto, categoría o canal. |
| **Rentabilidad Neta**        | Según fórmula maestra de la sección 5                                             | Todos los componentes de costo    | Nivel más completo de rentabilidad. |
| **Break-Even por Unidad**    | \(\frac{\text{Costos Fijos}}{\text{Margen de Contribución unitario}}\)            | Costos fijos + MC unitario        | Unidades necesarias para cubrir fijos. |

### 7.5 KPIs de Rendimiento del propio módulo BI

| KPI                        | Objetivo                          | Medición                                      |
|----------------------------|-----------------------------------|-----------------------------------------------|
| Latencia reportes complejos| < 200 ms                          | Tiempo de respuesta del Strategic Engine      |
| Latencia Live Stream       | < 500 ms                          | Tiempo desde evento hasta actualización UI    |
| Discrepancia de datos      | 0 %                               | Comparación BI vs registros transaccionales   |
| Data Quality Score         | ≥ 90 % (objetivo)                 | % de campos obligatorios capturados correctamente |
| Cobertura de contratos     | 100 % de módulos en manifest      | Validación de `analytics.manifest.json`       |

---

## 8. Roadmap de Implementación (11 Fases)

| Fase | Nombre                                      | Objetivo principal                                                                 | Dependencias          |
|------|---------------------------------------------|------------------------------------------------------------------------------------|-----------------------|
| 0    | Data Foundation                             | Esquemas, campos obligatorios, timestamps unificados, estados normalizados, dimensiones | —                     |
| 1    | Backend Core & Agregación SQL               | Servicios de agregación, `$queryRaw` tipado, multi-tenant, matrices YoY            | Fase 0                |
| 1.5  | Live Real-Time Stream Engine                | OrdersGateway, EventBus, BullMQ, Redis Rooms, latencia < 500 ms                    | Fase 0 + 1            |
| 2    | Optimización & Caché Redis                  | TTL dinámico, invalidación event-driven, claves por tenant/año/período             | Fase 1                |
| 3    | Frontend Dashboard & UI Refine              | Vistas por perfil, filtros, tablas matriciales, tarjetas KPI                       | Fase 1 + 2            |
| 4    | Exportación Corporativa XLSX                | Generación de reportes Excel alineados a estructura oficial (exceljs)              | Fase 1 + 3            |
| 5    | Integración de Terceros (ERP/Fiscal) + Inventory | Conectores Odoo/Tango/FacturaSend, PMP, SIFEN, rotación, cobertura, stock crítico | Fase 0 + 1            |
| 6    | Insights Automáticos & Data Quality Score   | Detección de anomalías, scoring de integridad de campos POS, reportes por módulo   | Fase 1 + 3            |
| 7    | Decision Intelligence                       | Sugerencias de IA / reglas (Happy Hours, promociones, alertas de margen)           | Fase 6                |
| 8    | Customer Intelligence & E-commerce          | Funnel digital, retención, CAC, carritos abandonados, RFM score                    | Fase 1 + 3            |
| 9    | Advanced Costing & P&L                      | Menu Engineering, P&L dinámico, costos industriales, rentabilidad por SKU          | Fase 5                |

> **Nota:** La Fase 1.5 (Live Engine) se ejecuta en paralelo o inmediatamente después de la Fase 1, ya que forma parte de la arquitectura dual declarada.

---

## 9. Dashboards Especializados

Vistas diferenciadas por perfil de usuario:

| Perfil              | Contenido principal                                                                 |
|---------------------|-------------------------------------------------------------------------------------|
| Dueño / Ejecutivo   | KPIs macro, crecimiento YoY, margen neto, visión 360°                               |
| Operativo (Live)    | Stream en tiempo real del turno activo, ventas por hora, pedidos en preparación     |
| Comercial           | Matrices de productos, rankings, promociones, análisis por canal                    |
| P&L Dinámico        | Estado de resultados por período, categoría y producto                              |
| Menu Engineering    | Matriz Margen Real vs Popularidad (Estrellas, Oportunidades, etc.)                  |
| Inventario          | Rotación, cobertura, stock crítico, valorización                                    |
| Rentabilidad Industrial | Desglose COGS, impacto de mermas, absorción de costos fijos, break-even         |

---

## 10. Sistema de Insights Accionables

Generación de notificaciones proactivas basadas en:

- Anomalías de datos (caídas de facturación significativas).
- Oportunidades comerciales (Happy Hours automáticos basados en Heatmap 7×24).
- Impacto de costos (ejemplo: “El costo de descartables en Delivery redujo el margen neto de X en 14 %”).
- Alertas de stock y lead time de proveedores.

Ejemplo de insight:
```
Insight detectado
Miércoles 15:00–18:00
Ventas 28 % debajo del promedio.
Capacidad disponible.
Margen promedio alto.
Recomendación: Crear promoción Happy Hour.
```

---

## 11. Data Quality Score

Índice de confiabilidad de la información basado en la integridad de los campos obligatorios capturados en el POS y demás módulos:

- `tableNumber`
- `dinersCount` / `party_size`
- `priceAtSale`
- `channel`
- `locationId`
- timestamps unificados
- costo

El score se calcula y reporta por módulo (POS, Inventario, Clientes, etc.) y se expone en el dashboard de administración. Objetivo mínimo recomendado: **≥ 90 %**.

---

## 12. Estrategia de Escalabilidad

### Corto plazo
- Índices concurrentes en PostgreSQL para grandes volúmenes (compuestos por `tenantId` + tiempo en tier Shared).
- TTL dinámico en Redis según cierre de períodos históricos.
- Invalidación de caché event-driven (BullMQ).

### Medio/Largo plazo
- Vistas materializadas (por tenant o globales según tier).
- Posible extracción hacia Data Warehouse sin modificar los módulos operativos.
- Particionado de tablas de hechos por tiempo + `tenantId` (Shared) o solo por tiempo (Dedicated).

---

## 13. Criterios de Éxito

1. **Aislamiento y Confidencialidad:** Garantía de privacidad multi-tenant en toda la capa de BI (filtro explícito por `tenantId` en todas las consultas, funcionamiento correcto en ambos tiers).
2. **Exactitud de Datos:** Discrepancia del 0 % entre el motor de BI y los registros transaccionales validados.
3. **Rendimiento Técnico:**
   - Reportes complejos < 200 ms (Strategic Engine).
   - Actualizaciones Live < 500 ms (Stream Engine).
4. **Adopción del Dashboard:** Generación exitosa de reportes XLSX alineados a la estructura corporativa oficial.
5. **Cobertura funcional:** Todos los módulos definidos en `analytics.manifest.json` exponen datos normalizados.
6. **Decisión accionable:** El usuario puede responder consistentemente:
   - ¿Qué está pasando?
   - ¿Por qué está pasando?
   - ¿Qué oportunidad existe?
   - ¿Qué acción conviene tomar?

---

## Anexos y Referencias

- Documento de diseño detallado original: `OmniBI — Plan de Implementación.md` (v1.0 Blueprint) — se conserva como anexo de profundidad operativa y onboarding.
- Informe técnico de compatibilidad de schema: `analisis_modulo_bi_analytics.md`.
- Contrato de datos: `analytics.manifest.json`.
- Versionado: Incrementar a v1.21.0 en `VERSION`, `featurelist.json`, `backend/package.json`, `frontend/package.json` y `analytics.manifest.json`.

---

**Fin del documento**  
FEAT-067 v1.21.0 – Versión corregida y consolidada (con KPIs detallados + Arquitectura Multi-Tenant/Tiers) – Agosto 2026
