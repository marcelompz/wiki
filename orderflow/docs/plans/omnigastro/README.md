# OmniGastro — Suite Gastronómica para OmniFlow

> **Estado:** Fase 0–3.1 completada · Hardening RBAC empleados **pendiente implementación** (ver `diseno-rbac-empleados.md`).
> **Versión base:** OmniFlow / OrderFlow v1.24.04
> **Última actualización:** 2026-09-27

OmniGastro convierte OmniFlow en el **Sistema Operativo Restaurantero** completo, alcanzando paridad operativa con Toast POS y superándola en offline-first nativo, soberanía multi-tier, Live Escandallo atómico y Seat-level ordering.

---

## 📂 Estructura del directorio

| Carpeta / archivo | Contenido |
|---|---|
| [`README.md`](./README.md) | Este índice |
| [`PLAN_MAESTRO.md`](./PLAN_MAESTRO.md) | **Fuente de verdad**: plan consolidado, fases, modelo de datos, branching, métricas |
| [`PLAN_OPERATIVO_Y_PROMPTS.md`](./PLAN_OPERATIVO_Y_PROMPTS.md) | **Roadmap priorizado por sprints (P0/P1/P2) + prompts individuales por FEAT** listos para delegar a un agente Implementador |
| [`AUDITORIA_Y_SOCIAL_CATALOG_COMO_MENU.md`](./AUDITORIA_Y_SOCIAL_CATALOG_COMO_MENU.md) | Auditoría de coherencia OmniFlow → OmniGastro + Social Catalog como menú digital del restaurante (FEAT-125 detallado) |
| [`featurelist.json`](./featurelist.json) | FEAT-001 a FEAT-00124+ con estado y módulo |
| `schema/` | Fragmentos de Prisma para las migraciones de cada fase |
| `features/` | Prompts de implementación por feature y flujos detallados |
| `historial/` | Versiones previas, análisis estratégicos y comparativas (no son fuente de verdad) |

---

## 🚀 Estado actual por fase

| Fase | FEATs | Estado | Doc |
|---|---|---|---|
| **0 — Safeguards** | FEAT-112 | ✅ **completed** | [`PLAN_MAESTRO.md`](./PLAN_MAESTRO.md) §2 |
| **1 — Cimientos + Caja** | FEAT-113 | ✅ **completed** | [`features/FEAT-113-omnidinein-cimientos.md`](./features/FEAT-113-omnidinein-cimientos.md) |
| **2 — Salón + Guest Experience** | FEAT-114, 115, 116, 119, 125 | ✅ **completed** | [`features/FEAT-125-guest-menu-claim-waiter.md`](./features/FEAT-125-guest-menu-claim-waiter.md), [`features/FEAT-116-split-payments.md`](./features/FEAT-116-split-payments.md) |
| **3 — Cocina + Costos** | FEAT-117, 118 | ✅ **completed** | [`PLAN_MAESTRO.md`](./PLAN_MAESTRO.md) §3 + §4 |
| **3.1 — KDS Configurable + Impresión** | FEAT-147, 148, 151, 152 | ✅ **completed** | [`DISENO_KDS_CONFIGURABLE_IMPRESION.md`](./DISENO_KDS_CONFIGURABLE_IMPRESION.md) |
| **4 — Hardware + Escala** | FEAT-120 → 124 | ⚪ planned | [`PLAN_MAESTRO.md`](./PLAN_MAESTRO.md) §5 |

---

## 📋 Próximos pasos inmediatos

1. 🟡 **Hardening RBAC empleados** — Cerrar brechas de permisos en POS, mesas y waiter calls.
   - Diseño: [`diseno-rbac-empleados.md`](./diseno-rbac-empleados.md)
   - Permisos nuevos: `tables:status`, `tables:guests`, `tables:gift`, `pos:config`
   - Cierre de bypass por API key en `PermissionsGuard`
   - Step-up PIN para acciones críticas (gift, cierre Z, anulación)
   - Rama sugerida: `feat/gastro-rbac-empleados`
2. **Post-implementación**: tag `v1.27.0-omnigastro-rbac` + merge a `develop`

---

## 🔗 Documentos vinculados

- [Plan Comercial SaaS](../comercial/OmniFlow_Plan_Comercial_v1.md) — visión de monetización
- [Plan de Blindaje OrderFlow](../PLAN_BLINDAJE_ORDERFLOW.md) — Fases 1-6 cerradas (FEAT-1xx anteriores)
- [Estado del Arte v1.24.04](../../info/OrderFlow_v1.24.04_Estado_del_Arte.md) — release actual
- [ROADMAP](../../../ROADMAP.md) — roadmap vivo

---

## 🗃️ Histórico (no usar como referencia)

Toda versión previa y análisis estratégico/competitivo está en [`historial/`](./historial/). Ver [`historial/README.md`](./historial/README.md) para el detalle y motivo de archivo de cada documento.
