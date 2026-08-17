# PROMPT_MAESTRO_DESARROLLO_BI-v2.md — OBSOLETO

**Estado:** Reemplazado. No usar para implementación.

Este documento quedó **reemplazado** por los prompts de fase individuales,
que son la fuente de verdad vigente para FEAT-067:

- `PROMPT_BI_FASE_0_DATA_FOUNDATION.md`
- `PROMPT_BI_FASE_1_BACKEND_CORE.md`
- `PROMPT_BI_FASE_1_5_LIVE_STREAM_ENGINE.md`
- `PROMPT_BI_FASE_2_OPTIMIZACION_CACHE.md`
- `PROMPT_BI_FASE_4_EXPORT_XLSX.md`
- `PROMPT_BI_FASE_5_ERP_INVENTORY.md`
- `PROMPT_BI_FASE_6_INSIGHTS_DATA_QUALITY.md`
- `PROMPT_BI_FASE_7_DECISION_INTELLIGENCE.md`

## Por qué se dio de baja

Este documento definía un schema y una API que **no coinciden** con los
prompts de fase vigentes:

- `dinersCount` obligatorio con default, en vez de opcional (Fase 0).
- Campos `openedAt`/`closedAt` en `Order` que no existen en ningún otro
  documento ni en `analytics.manifest.json`.
- Modelos completos (`Recipe`, `WasteRecord`, `PackagingCost`,
  `FixedCostAllocation`) implementados de entrada, cuando Fase 0 los define
  explícitamente como stubs para Fase 5+.
- P&L, Menu Engineering y Heatmap 7×24 implementados ya en la "Etapa 1.1",
  cuando los prompts de fase los dejan explícitamente fuera de alcance de
  Fase 1 y los reservan para las Fases 6 y 7.
- Prefijo de rutas `/v1/analytics/...` en lugar de `/analytics/...`.
- Esquema de claves de caché distinto al de Fase 2.
- Sin soporte `dbClient?: any` (rompería tenants Dedicated), sin DTOs
  validados, sin tests, sin `analytics.manifest.json`.

Se conserva únicamente como referencia histórica del diseño original que
dio origen al desglose en fases.
