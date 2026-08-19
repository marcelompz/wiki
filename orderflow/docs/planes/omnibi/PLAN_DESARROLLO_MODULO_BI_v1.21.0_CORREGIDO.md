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

---

## 3. Arquitectura del Motor Dual

La arquitectura se basa en dos motores complementarios:

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

---

## 5. Modelo de Rentabilidad Integral y Costeo de Producción

Extensión del modelo para cubrir la cadena de valor completa: Compras, Fabricación/Producción (Fichas Técnicas / BOM / Escandallos), Control de Mermas, Descartables/Packaging, Talento Humano (MOD + cargas sociales) y Prorrateo de Costos Fijos.

### Fórmula Maestra de Rentabilidad Neta de Producción
```
Rentabilidad Neta = Ventas 
                  − (Costo Materia Prima Consumida + Mano de Obra Directa + Mermas/Desperdicio) 
                  − Descartables/Packaging 
                  − Costos Fijos y Gastos Prorrateados
```

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

## 7. KPI Dictionary Exhaustivo

### Ventas & Restaurante
| KPI                  | Fórmula / Descripción                          |
|----------------------|------------------------------------------------|
| Ventas Netas         | Total ventas (excl. DRAFT/CANCELLED)           |
| Ticket Promedio      | Ventas / Órdenes                               |
| Spend per Diner      | Ventas / Comensales                            |
| RevPASH              | Ingresos por asiento-hora disponible           |
| Rotación de Mesas    | Mesas atendidas / Mesas disponibles            |
| Ventas por Canal     | Agrupado por canal                             |

### E-commerce & Clientes
| KPI                  | Fórmula / Descripción                          |
|----------------------|------------------------------------------------|
| Tasa de Conversión   | Compras / Visitas                              |
| LTV (Lifetime Value)| Valor de vida del cliente                      |
| CAC                  | Costo de adquisición de cliente                |
| Carrito Abandonado   | Carritos sin compra                            |
| RFM / CLV            | Recency, Frequency, Monetary + Lifetime Value  |

### Operaciones & Inventario
| KPI                  | Fórmula / Descripción                          |
|----------------------|------------------------------------------------|
| Rotación de Stock    | Costo de ventas / Stock promedio               |
| Cobertura            | Días de stock disponible                       |
| Stock Crítico        | Productos bajo punto de reorden                |
| Ratio de Compras     | Compras / Ventas                               |
| Producción vs Demanda| Consumo real vs teórico                        |

### Producción & Costeo Industrial
| KPI                        | Fórmula / Descripción                                      |
|----------------------------|------------------------------------------------------------|
| Variación de Receta        | Consumo Real − Consumo Teórico (BOM)                       |
| Índice de Mermas           | (Costo Mermas + Scrap) / Costo Total Producción            |
| Costo de Descartables      | Insumos de packaging / Unidades u Órdenes                  |
| Costo Fijo Prorrateado     | Overhead Mensual / (Unidades o Horas de fabricación)       |
| COGS Real (Industrial)     | Materia Prima + MOD + Fabricación + Descartables + Mermas  |
| Margen Bruto Industrial    | Ventas Netas − Costo Industrial Directo                    |
| Rentabilidad Neta          | Según fórmula maestra                                      |
| Break-Even por Unidad      | Costos Fijos / Margen de Contribución unitario             |

---

## 8. Roadmap de Implementación (9 Fases)

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

El score se calcula y reporta por módulo (POS, Inventario, Clientes, etc.) y se expone en el dashboard de administración.

---

## 12. Estrategia de Escalabilidad

### Corto plazo
- Índices concurrentes en PostgreSQL para grandes volúmenes.
- TTL dinámico en Redis según cierre de períodos históricos.
- Invalidación de caché event-driven (BullMQ).

### Medio/Largo plazo
- Vistas materializadas.
- Posible extracción hacia Data Warehouse sin modificar los módulos operativos.
- Particionado de tablas de hechos por tiempo/tenant.

---

## 13. Criterios de Éxito

1. **Aislamiento y Confidencialidad:** Garantía de privacidad multi-tenant en toda la capa de BI (filtro explícito por `tenantId` en todas las consultas).
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
FEAT-067 v1.21.0 – Versión corregida y consolidada – Agosto 2026
