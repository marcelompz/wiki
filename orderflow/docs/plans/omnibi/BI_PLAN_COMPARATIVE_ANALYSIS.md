# Análisis Comparativo: Planes de Implementación BI

**Fecha:** 2026-08-17  
**Documentos comparados:**
- `docs/planes/OmniBI — Plan de Implementación.md` (original, 690 líneas, v1.0 Blueprint)
- `docs/planes/PLAN_DESARROLLO_MODULO_BI.md` (nuevo, 110 líneas, FEAT-067 v1.21.0)
- `docs/prompts/orderflow-bi-analytics-module/PROMPT_MAESTRO_DESARROLLO_BI-v2.md` (prompt técnico, 141 líneas)

---

## Resumen Ejecutivo

El **plan nuevo (`PLAN_DESARROLLO_MODULO_BI.md`)** es una versión **evolucionada pero más ligera** del original. Gana en **gobernanza, ejecutabilidad técnica y alineación con el stack actual** (NestJS, Prisma, Redis, multi-tenant), pero pierde **riqueza descriptiva y profundidad operativa** que sirven como blueprint para stakeholders no técnicos.

El **Prompt v2** cubre excelentemente las Fases 1-4 del plan nuevo (backend core, cache, frontend, exportación), pero **no cubre el alcance completo** de FEAT-067 v1.21.0 (faltan Fases 0, 5, 6, 7, 8).

---

## Tabla de Mejoras (Plan Nuevo vs Original)

| Tema | Original (690 lín.) | Nuevo (110 lín.) | Mejora |
|------|---------------------|------------------|--------|
| **Gobernanza** | Versión 1.0 (Blueprint), estado "Diseño" | `FEAT-067 v1.21.0`, ecosistema explicitado | Trazabilidad y alineación con arquitectura real |
| **Modelo de datos** | Lista de dimensiones + 7 tablas de hechos genéricas | Esquema de estrella explícito centrado en `order_lines` | Más ejecutable para backend |
| **Contrato de datos** | Tablas Markdown por módulo | `analytics.manifest.json` + conectores ERP (Odoo 18/19, Tango, FacturaSend) | Rigurosidad técnica |
| **Roadmap** | 7 fases descriptivas | 8 fases técnicas: agrega Optimización/Caché, Exportación XLSX, Integración Terceros, Insights, Decision Intelligence | Secuencia más realista |
| **KPIs** | Lista genérica por vertical | Métricas industriales (RevPASH, Spend per Diner, CAC, LTV, Ratio Compras) | Lenguaje de negocio consistente |
| **Dashboards** | Lista plana | Perfiles: Dueño, Operativo (Live), Comercial, P&L Dinámico, Menu Engineering | Enfoque en adopción |
| **Insights** | Ejemplo cualitativo | Ejemplos accionables (Happy Hours por Heatmap, caídas facturación, impacto margen) | Cierre ciclo analítico |
| **Data Quality** | Barra ASCII 89% | Índice ligado a campos POS (`tableNumber`, `dinersCount`, `priceAtSale`) | Medible y auditable |
| **Escalabilidad** | Preparar DW / Materialized Views | Índices concurrentes PostgreSQL + TTL dinámico Redis | Optimizaciones accionables |
| **Criterios de éxito** | Cualitativos + latencia <500ms | 0% discrepancia, <200ms reportes, XLSX alineados | Objetivos exigentes y medibles |

---

## Pérdidas / Simplificaciones respecto al Original

| Elemento | Estado en Plan Nuevo | Impacto |
|----------|---------------------|---------|
| Filosofía y narrativa | ❌ Eliminada | Menos evangelización interna |
| Diagrama ASCII arquitectura | ❌ Eliminado | Menos visión sistémica |
| Detalle fuentes por canal (POS/E-com/WhatsApp/CRM/Inv/Compras/Prod) | ⚠️ Comprimido fuertemente | Pérdida de profundidad operativa |
| KPIs producción industrial (MOD, mermas, prorrateo, break-even) | ⚠️ Solo mención genérica | Menos detalle para manufacturing |
| Heatmap visual y Data Quality visual | ❌ Eliminados | Menos validación temprana con stakeholders |
| Outcomes específicos por fase de roadmap | ⚠️ Más abstracto | Requiere desglose adicional |

---

## Alineación Prompt v2 vs Plan Nuevo

| Etapa Prompt v2 | Fase Plan Nuevo | Cobertura |
|-----------------|-----------------|-----------|
| Etapa 0: Prisma Schema (Order, Recipe, Waste, Packaging, FixedCost) | Fase 0 Data Foundation + Fase 5B Industrial | **Parcial** (falta Data Foundation completa + ERP contracts) |
| Etapa 1: Backend Core + SQL raw | Fase 1 Backend Core & Agregación SQL | **Total** |
| Etapa 1.1: Heatmap 7x24 + Promotion Opportunities | Fase 2 Restaurant BI + Fase 7 Decision Intelligence | **Total** |
| Etapa 1.1: Profitability Matrix + P&L | Dashboard P&L Dinámico + Menu Engineering | **Total** |
| Etapa 2: Redis Cache YoY | Fase 2 Optimización & Caché Redis | **Total** |
| Etapa 3: Frontend 3 tabs | Fase 3 Frontend Dashboard & UI Refine | **Total** |
| Etapa 4: Exportación Excel (exceljs) | Fase 4 Exportación Corporativa XLSX | **Total** |

---

## Gaps Críticos del Prompt v2 vs Alcance Completo FEAT-067

| Área | Plan Nuevo (Fase) | En Prompt v2 | Acción Requerida |
|------|-------------------|--------------|------------------|
| **Data Foundation completa** | Fase 0 | Solo 4 campos en Order | Prompt dedicado: timestamps, party_size, canal/local/costo obligatorios, estados normalizados |
| **ERP Pre-processor** (Odoo/Tango/FacturaSend, PMP, SIFEN) | Fase 5 | ❌ Ausente | Prompt dedicado: conectores, `analytics.manifest.json`, sincronización fiscal |
| **E-commerce Intelligence** (Funnel, conversión, dispositivo) | Fase 3 | ❌ Ausente | Prompt dedicado: eventos web, atribución, funnel |
| **Customer Intelligence** (RFM, CLV, segmentación) | Fase 6 | ❌ Ausente | Prompt dedicado: modelos cliente, scoring |
| **Inventory Intelligence** (rotación, cobertura, stock crítico) | Fase 5 | ❌ Ausente | Prompt dedicado: modelos inventario, valorización |
| **Data Quality Score** | Fase 6 | ❌ Ausente | Prompt dedicado: validadores, scoring automático, reporte por módulo |
| **Escalabilidad** (Materialized Views, DW) | Fase 8/12 | ❌ Ausente | Prompt dedicado: vistas materializadas, particionado, archival |
| **Live Real-Time Stream Engine** (WebSocket, OrdersGateway, BullMQ, <500ms) | Arquitectura Dual / Fase 1 | ❌ Ausente | Prompt dedicado: EventBus, Redis Rooms, suscripción `tenant:<tenantId>` |
| **Contratos formales** (`analytics.manifest.json`) | Transversal | ❌ No referenciado | Agregar a todos los prompts |

---

## Riesgos Técnicos Identificados en Prompt v2

1. **Scope creep silencioso**: Implementa solo vertical restaurante + rentabilidad industrial; plan nuevo promete 8 fases omnicanal
2. **Modelo de datos incompleto**: Falta `OrderLine.priceAtSale` (usado en SQL), `Product.category`, `Order.status` enum
3. **Invalidación de cache naïve**: Key `tenantId:year` no invalida al crear/modificar órdenes; requiere event-driven (BullMQ) o TTL corto
4. **Sin Live Engine**: Plan exige WebSocket <500ms; prompt solo consultas SQL bajo demanda

---

## Recomendación

**Conservar ambos planes:**
- `PLAN_DESARROLLO_MODULO_BI.md` → **Documento oficial de implementación** (FEAT-067 v1.21.0)
- `OmniBI — Plan de Implementación.md` → **Anexo de diseño detallado** para stakeholders y onboarding

**Extender el Prompt v2 en una serie de 9 prompts por fase** alineados al roadmap del plan nuevo:

| Prompt | Fase | Estado |
|--------|------|--------|
| `PROMPT_BI_FASE_0_DATA_FOUNDATION.md` | 0 | **Crear** |
| `PROMPT_BI_FASE_1_BACKEND_CORE.md` | 1 | **Extender v2** |
| `PROMPT_BI_FASE_2_OPTIMIZACION_CACHE.md` | 2 | **Extender v2** |
| `PROMPT_BI_FASE_3_FRONTEND_DASHBOARD.md` | 3 | **Extender v2** |
| `PROMPT_BI_FASE_4_EXPORT_XLSX.md` | 4 | **Extender v2** |
| `PROMPT_BI_FASE_5_ERP_INTEGRATION.md` | 5 | **Crear (NEW)** |
| `PROMPT_BI_FASE_6_INSIGHTS_DATA_QUALITY.md` | 6 | **Crear (NEW)** |
| `PROMPT_BI_FASE_7_DECISION_INTELLIGENCE.md` | 7 | **Crear (NEW)** |
| `PROMPT_BI_FASE_8_LIVE_STREAM_ENGINE.md` | 8 | **Crear (NEW)** |

Cada prompt debe incluir: esquema Prisma incremental, contratos `analytics.manifest.json`, SQL raw tipado, DTOs, tests de integración, y criterios de aceptación medibles.