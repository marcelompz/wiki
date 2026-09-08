# **OmniFlow BI — Plan de Implementación**

Documento Técnico Oficial \- Blueprint de Inteligencia de Negocio  
Gobernanza: FEAT-067 v1.21.0  
Ecosistema: OmniFlow SaaS (NestJS, Prisma, React/Refine, Redis)  
Fecha: Agosto 2026

---

## **1\. Visión y Objetivos Estratégicos**

Establecer una infraestructura de Business Intelligence nativa para OmniFlow que transforme datos transaccionales en inteligencia accionable, permitiendo una visión de 360° del rendimiento comercial y operativo a través de múltiples canales y verticales de negocio.

## **2\. Principios de Diseño**

* Omnicanalidad Nativa: Integración de datos provenientes de POS físico, E-commerce y Marketplaces bajo una misma capa de análisis.

* Modelo Único OmniFlow Sale: Normalización de cada transacción en una estructura estándar de venta para comparativas uniformes.

* KPI Primero (KPI-First): El diseño del sistema se orienta a satisfacer la entrega de indicadores clave definidos antes que la visualización estética.

## **3\. Arquitectura del Motor Dual**

La arquitectura se basa en dos motores complementarios para satisfacer necesidades operativas y estratégicas:

* Live Real-Time Stream Engine: Basado en WebSockets/OrdersGateway para monitoreo en vivo de la operación actual.

* Strategic & Comparative Analytics Engine: Basado en PostgreSQL ($queryRaw) para análisis histórico, tendencias interanuales y matrices de rendimiento.

## **4\. Modelo de Datos Dimensional y Tablas de Hechos**

## **5\. Modelo de Rentabilidad Integral y Costeo de Producción**

Extensión del modelo para cubrir la cadena de valor completa, integrando Compras, Fabricación/Producción (Fichas Técnicas/Escandallos/BOM), Control de Mermas, Descartables/Packaging, Talento Humano (Salarios \+ Cargas Sociales/Beneficios) y Prorrateo de Costos Fijos/Gastos Generales.

**Fórmula Maestra de Rentabilidad Neta de Producción:**

Rentabilidad Neta \= Ventas \- \[Costo Materia Prima Consumida \+ Mano de Obra Directa (MOD) \+ Mermas/Desperdicio\] \- Descartables/Packaging \- Costos Fijos y Gastos Prorrateados.

**Niveles de Margen:**

* Margen de Contribución 1 (Bruto): Ventas \- Materia Prima.

* Margen de Contribución 2 (Fabricación): MC1 \- (Mermas \+ Descartables \+ MOD).

* Margen Neto Operativo (EBITDA por Producto/Línea): MC2 \- Costos Fijos Prorrateados.

Implementación de un esquema de estrella donde la tabla de hechos central captura las líneas de venta normalizadas (order\_lines), rodeada de dimensiones como Tiempo, Producto, Tenant, Canal y Ubicación.

## **5\. Fuentes de Datos y Contrato por Módulo**

Integración modular mediante el ERP Pre-processor para normalizar fuentes externas:

* Conectores ERP: Odoo 18/19 CE, Tango y FacturaSend para sincronización fiscal y contable.

* Contrato de Datos: Definición estricta vía analytics.manifest.json incluyendo nuevos módulos de Producción/Recetas, Compras/PMP, Gastos Fijos y Talento Humano/Nómina.

## **6\. KPI Dictionary Exhaustivo**

Catálogo de métricas estandarizadas por vertical:

* Ventas & Restaurante: RevPASH, Spend per Diner, Ticket Promedio, Rotación de Mesas.

* E-commerce & Clientes: Tasa de Conversión, LTV (Lifetime Value), CAC.

* Operaciones: Stock de Inventario, Merma, Producción vs Demanda, Ratio de Compras.

## **7\. Roadmap de Implementación (8 Fases)**

1. Fase 0: Data Foundation (Esquemas y Modelado).

2. Fase 1: Backend Core & Agregación SQL.

3. Fase 2: Optimización & Caché Redis.

4. Fase 3: Frontend Dashboard & UI Refine.

5. Fase 4: Exportación Corporativa XLSX.

6. Fase 5: Integración de Terceros (ERP/Fiscal).

7. Fase 6: Insights Automáticos & Data Quality Score.

8. Fase 7: Decision Intelligence (Sugerencias de IA).

## **8\. Dashboards Especializados**

Vistas diferenciadas por perfil de usuario: Dashboard de Dueño (KPIs macro), Dashboard Operativo (Live Stream), Dashboard Comercial (Matrices y Rankings), P\&L Dinámico y Menu Engineering (Matriz Margen Real vs Popularidad).

## **9\. Sistema de Insights Accionables**

Generación de notificaciones proactivas basadas en anomalías de datos (caídas de facturación) o sugerencias comerciales (Happy Hours automáticos basados en Heatmap 7x24).

## **10\. Data Quality Score**

Índice de confiabilidad de la información basado en la integridad de los campos obligatorios capturados en el POS (tableNumber, dinersCount, priceAtSale).

## **11\. Estrategia de Escalabilidad**

Uso de índices concurrentes en PostgreSQL para grandes volúmenes de datos y TTL dinámico en Redis según el cierre de períodos históricos.

## **12\. Criterios de Éxito**

## 

1. **Aislamiento y Confidencialidad: Garantía de privacidad multi-tenant en toda la capa de BI.**  
2. **Exactitud de Datos: Discrepancia del 0% entre el motor de BI y los registros transaccionales validados.**  
3. **Rendimiento Técnico: Tiempos de respuesta inferiores a 200ms para reportes complejos.**  
4. **Adopción del Dashboard: Generación exitosa de reportes XLSX alineados a la estructura corporativa oficial.**

