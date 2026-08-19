# 📡 Plan Maestro: Módulo OmniPulse (Field Intel, Scoring de Fuentes & Strategic Ops)

> **Módulo:** `OmniPulse` (`backend/src/modules/omnipulse` | `frontend/src/pages/admin/omnipulse`)  
> **Versión Objetivo:** v1.13.0  
> **Fecha de Creación:** 2026-08-18  
> **Estado:** Planificado  

---

## 🎯 1. Visión y Objetivos del Módulo

**OmniPulse** es el módulo de **Inteligencia de Campo (Field Intelligence), Evaluación de Reputación de Fuentes y Contrainteligencia Táctica** dentro del ecosistema OmniFlow.

Resuelve la falta de estructuración de los datos cualitativos e informales recibidos por la empresa (rumores de la competencia, avisos de clientes sobre precios, incrementos de proveedores, intenciones de compra) y los transforma en **datos estructurados, verificables y accionables**.

### Objetivos Clave:
1. **Captura Rápida de Insights de Campo:** Permitir el registro ágil de informaciones cualitativas desde WhatsApp, POS Drawer y el panel Admin.
2. **Motor de Confianza y Reputación de Fuentes (*Source Reliability Engine*):** Evaluar dinámicamente la fiabilidad de cada contacto/informante (0.0% a 100.0%) basándose en la verificación posterior de la información provista (Matriz de Admirantazgo).
3. **Corroboración con Datos Duros del ERP/POS:** Cruzar los rumores/insights con las métricas transaccionales reales del sistema (caídas de ventas, márgenes, volumen por producto o categoría).
4. **Operaciones Tácticas y Sondeos (*Canary Trapping & Counter-Intel*):** Sembrar información o sondas controladas en el mercado para evaluar reacciones de la competencia o detectar fugas de información interna.

---

## 🏗️ 2. Arquitectura de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                    OmniFlow Admin UI                        │
│     • Dashboard Radar  • Fuentes & Score  • Sondajes        │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST API / DTOs
┌──────────────────────────────▼──────────────────────────────┐
│                    OmniPulse NestJS Module                  │
│               (backend/src/modules/omnipulse)               │
│                                                             │
│  ├── omnipulse.controller.ts (REST Endpoints)               │
│  ├── omnipulse.service.ts    (Core Business Logic)          │
│  ├── reliability.service.ts  (Engine de Scoring de Fuentes) │
│  └── probe.service.ts        (Canary Traps & Counter-Intel) │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
 ┌────────────────────┐                ┌────────────────────┐
 │   PostgreSQL DB    │                │  Redis / BullMQ    │
 │ (Prisma ORM Layer) │                │ (Async Corroborator│
 │  * tenantId strictly│                │   Ventas/Impacto)  │
 └────────────────────┘                └────────────────────┘
```

---

## 📊 3. Pilares Funcionales

### Pilar 1: Registro de Insights y Scoring de Fuentes (*Source Reliability Engine*)
- **Entidades:** `IntelSource`, `MarketInsight`.
- **Funcionamiento:**
  - Toda fuente de información (`IntelSource`) arranca con un `reliabilityScore` base del 50.0%.
  - Al validar un insight (`CORROBORATED_TRUE`), la fuente gana puntos de fiabilidad y suma a `verifiedTrue`.
  - Al desmentir un insight (`CORROBORATED_FALSE` / `DEBUNKED`), la fuente pierde puntos de fiabilidad y suma a `verifiedFalse`.
  - Si el score cae por debajo del 30.0%, la fuente es marcada automáticamente como `isToxicChannel = true` (Canal Tóxico/Desinformador).

### Pilar 2: Cruce de Datos Duros y Correlación con el ERP (*Corroboration Engine*)
- **Funcionamiento:**
  - Al asociar un `productId` o `category` a un `MarketInsight`, el servicio consulta las líneas de órdenes (`SaleOrder` / `order_lines`) de los 30 días previos y posteriores.
  - Calcula el `salesImpactCorrel` (% de variación real en volumen y margen) para confirmar o descartar el impacto declarado en el rumor.

### Pilar 3: Operaciones Estratégicas y Sondeo (*Canary Probing & Counter-Info*)
- **Entidades:** `StrategicProbe`, `ProbeRecipient`.
- **Funcionamiento:**
  - Permite crear una sonda con una variante o rumor específico sembrado a informantes seleccionados.
  - Monitorea la reacción del mercado o la filtración de información para identificar la fuente de fugas internas (`detectedLeakSourceId`).

---

## 🚀 4. Fases de Implementación

| Fase | Hito | Entregables Principales |
| :--- | :--- | :--- |
| **Fase 1: Persistencia y Core API** | Esquema Prisma, Migraciones, CRUD de Fuentes e Insights | Modelos `IntelSource`, `MarketInsight`, `StrategicProbe`, `ProbeRecipient`. NestJS Module base. |
| **Fase 2: Motor de Scoring y Cruce** | Algoritmo de Reputación y Cruce con Ventas | `ReliabilityEngineService`, consultas analíticas cruzando `SaleOrder` / `Product`. |
| **Fase 3: Operaciones Estratégicas** | Canary Probing y Detección de Fugas | Servicio de sondas, auditoría de eco y marcado de fuentes filtradoras. |
| **Fase 4: UI Admin (Vite + Refine)** | Radar Dashboard y Vistas Operativas | Panel de Inteligencia (`RadarView`), tabla de fuentes con semáforos (`SourcesList`), panel de sondas tácticas (`StrategicProbes`). |

---

## 🛡️ 5. Reglas Inviolables y Barreras de Calidad (AGENTS.md)
1. **Multi-Tenancy Obligatorio (`tenantId`):** Todos los modelos y consultas Prisma deben incluir `tenantId`.
2. **Cero Lógica `ORDERFLOW_MODE` en Services:** Ningún servicio NestJS debe usar condicionales `if (mode === 'enterprise')`.
3. **Uso de Singleton/TenantPrisma:** Usar `this.prisma` o `@TenantPrisma()`. Prohibido instanciar `new PrismaClient()`.
4. **Precision Numérica:** Montos financieros en `Decimal` (`@db.Decimal(12, 2)`).
5. **Auditoría ./scripts/init.sh:** Toda la implementación debe validar con compilación limpia backend/frontend y suite de unit/E2E tests sin errores.
