# OmniPulse — Proyecto completo (Field Intel & Strategic Ops)

Módulo completo para `backend/src/modules/omnipulse/` y
`frontend/src/pages/admin/omnipulse/`, listo para integrar a OmniFlow
(NestJS + Prisma + Refine.dev).

## Estructura de archivos

```
backend/
  schema.prisma                    → agregar a prisma/schema.prisma
  dto/omnipulse.dto.ts             → DTOs Pilar 1 y 2 (fuentes, insights)
  dto/omnipulse-pilar3.dto.ts      → DTOs Pilar 3 ajustado
  omnipulse.service.ts             → Pilar 1 y 2 (scoring, correlación con ventas)
  omnipulse-pilar3.service.ts      → Pilar 3 ajustado (aprobación, auditoría)
  omnipulse.controller.ts          → endpoints de fuentes/insights/radar
  omnipulse-pilar3.controller.ts   → endpoints de eventos reales/sondas/scoring
  omnipulse.module.ts              → módulo NestJS que une todo

frontend/
  RadarView.tsx                    → dashboard ejecutivo
  SourcesList.tsx                  → directorio de fuentes con semáforo
  StrategicProbes.tsx              → panel de sondas con flujo de aprobación
```

## Pilares

**Pilar 1 — Source Reliability Engine**
Cada informante es un `IntelSource` con `reliabilityScore` (0-100). El score
solo cambia a través de `adjustReliabilityScore` (Pilar 3), así todo ajuste
—automático o manual— queda en `ScoreAdjustmentLog`.

**Pilar 2 — Corroboration Engine**
`recordInsight` registra el reporte de campo. `verifyInsight` corrobora o
desmiente el hecho y recalcula el score de la fuente. `correlateWithSales`
cruza el insight contra `OrderLine`/`SaleOrder` reales de los últimos 30 días
(ajustar nombres de modelo al ERP real).

**Pilar 3 — Strategic Ops (ajustado, sin siembra de rumores falsos)**
Reemplaza el diseño original de `disseminatedFact` (texto libre, podía ser
falso) por `RealEvent` obligatorio: una sonda solo puede referenciar un hecho
de negocio que **ya existe** en el sistema. Cada sonda nace en estado
`PENDING` y requiere aprobación de `ADMIN`/`LEGAL_REVIEWER` con justificación
obligatoria antes de activarse. `communicationTiming` permite variar cuándo
se comunica el hecho a cada fuente, nunca qué se comunica.

## Endpoints (`/api/v1/pulse/`)

| Método | Ruta | Pilar |
|---|---|---|
| POST | `/sources` | 1 |
| GET | `/sources` | 1 |
| POST | `/insights` | 2 |
| GET | `/insights` | 2 |
| PATCH | `/insights/:id/verify` | 1+2 |
| POST | `/insights/:id/correlate` | 2 |
| GET | `/radar` | 1+2 |
| POST | `/events` | 3 |
| POST | `/probes` | 3 |
| PATCH | `/probes/:id/review` | 3 |
| PATCH | `/probes/:id/reaction` | 3 |
| PATCH | `/sources/:id/score-adjustment` | 1+3 |
| PATCH | `/sources/:id/toxic-flag` | 1+3 |
| GET | `/sources/:id/score-history` | 3 |

## Pendiente antes de producción

1. **Migración de Prisma**: `npx prisma migrate dev --name add_omnipulse_module`
2. **Nombres de modelo del ERP**: `correlateWithSales` asume modelos
   `OrderLine`/`order.createdAt` — ajustar a los nombres reales de OmniFlow/Odoo.
3. **Guards de rol**: `RolesGuard` debe restringir el módulo a `ADMIN` o
   `INTEL_OPERATOR` (Pilar 1/2) y a `ADMIN`/`LEGAL_REVIEWER` para aprobar
   sondas (Pilar 3) — implementación real del guard queda pendiente según
   el sistema de auth de OmniFlow.
4. **Definir `LEGAL_REVIEWER`** como rol en tu organización (puede ser el
   mismo `ADMIN` al inicio).
5. **Revisión legal puntual** para sondas sobre `RealEvent` tipo
   `PRICE_CHANGE`: aunque el hecho es real, compartir un precio no público
   con terceros específicos para testear filtraciones puede tener
   implicancias según tu jurisdicción — por eso el flujo de aprobación
   existe, para que ese análisis se haga caso por caso.
6. **Gráfico de Matriz de Veracidad** en `RadarView.tsx` (marcado como TODO):
   cruzar `salesImpactCorrel` por categoría contra el volumen real de ventas.
7. **Worker LLM de extracción** (audio/texto → `CreateMarketInsightDto`) no
   está incluido acá — es un servicio aparte que consume WhatsApp/BullMQ y
   llama a `recordInsight`; conviene prototiparlo con datos reales antes de
   confiar en la clasificación automática.
