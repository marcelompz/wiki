# OmniGastro — Suite Gastronómica para OmniFlow

> **Estado:** Fase 0–3.3 completada · Hardening RBAC empleados **completado** (v1.38.20) · Sprint Fixes Campo Provecchio **completado** (v1.39.1, 2026-10-16).
> **Versión base:** OmniFlow / OrderFlow v1.39.1
> **Última actualización:** 2026-10-16

OmniGastro convierte OmniFlow en el **Sistema Operativo Restaurantero** completo, alcanzando paridad operativa con Toast POS y superándola en offline-first nativo, soberanía multi-tier, Live Escandallo atómico y Seat-level ordering.

---

## 📂 Estructura del directorio

| Carpeta / archivo | Contenido |
|---|---|
| [`README.md`](./README.md) | Este índice |
| [`PLAN_MAESTRO.md`](./PLAN_MAESTRO.md) | **Fuente de verdad**: plan consolidado, fases, modelo de datos, branching, métricas |
| [`PLAN_OPERATIVO_Y_PROMPTS.md`](./PLAN_OPERATIVO_Y_PROMPTS.md) | **Roadmap priorizado por sprints (P0/P1/P2) + prompts individuales por FEAT** listos para delegar a un agente Implementador |
| [`AUDITORIA_Y_SOCIAL_CATALOG_COMO_MENU.md`](./AUDITORIA_Y_SOCIAL_CATALOG_COMO_MENU.md) | Auditoría de coherencia OmniFlow → OmniGastro + Social Catalog como menú digital del restaurante (FEAT-125 detallado) |
| [`PLAN_ODOO_POS_SYNC_2026-10-19.md`](./PLAN_ODOO_POS_SYNC_2026-10-19.md) | **Plan maestro de la sincronización OrderFlow → Odoo 14 POS** (bug #7 del reporte del cliente, FEAT-184…188, v1.39.11) |
| [`flujo_odoo-pos-sync.md`](./flujo_odoo-pos-sync.md) | Diagrama de secuencia Mermaid, contratos REST y hitos de telemetría `t0…t5` del sync a Odoo |
| [`BACKLOG_CLIENTE_20261019.md`](./BACKLOG_CLIENTE_20261019.md) | Reporte de los 9 bugs del cliente en la v1.39.9 (origen de FEAT-184…188) |
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
| **3.2 — Hardening RBAC Empleados** | — | ✅ **completed** (v1.38.20) | [`diseno-rbac-empleados.md`](./diseno-rbac-empleados.md) |
| **3.3 — Fixes de Campo Provecchio** | FEAT-161, 163, 164, 165, **FEAT-166** | ✅ **completed** (v1.39.1) | [`field-fixes-v1.39.0.md`](./field-fixes-v1.39.0.md) |
| **3.4 — Sincronización con Odoo 14 POS** | FEAT-184, 185, 186, 187, **188** | 🟡 **en curso** (v1.39.11) | [`PLAN_ODOO_POS_SYNC_2026-10-19.md`](./PLAN_ODOO_POS_SYNC_2026-10-19.md), [`flujo_odoo-pos-sync.md`](./flujo_odoo-pos-sync.md) |
| **4 — Hardware + Escala** | FEAT-120 → 124 | ⚪ planned | [`PLAN_MAESTRO.md`](./PLAN_MAESTRO.md) §5 |

---

## 📋 Próximos pasos inmediatos

1. 🟢 **Hardening RBAC empleados** — Completado en v1.38.20 (2026-09-21).
   - Permisos nuevos: `tables:status`, `tables:guests`, `tables:gift`, `pos:config`
   - Cierre de bypass por API key en `PermissionsGuard`
   - Step-up PIN para acciones críticas (gift, cierre Z, anulación)
   - Documentación: [`diseno-rbac-empleados.md`](./diseno-rbac-empleados.md)
   - Rama: `feat/gastro-rbac-empleados`
2. 🟢 **Sprint Fixes Campo Provecchio (FEAT-166)** — Completado en v1.39.1 (2026-10-16).
   - POS Mozo: lista compacta en vez de grid vacío (`CategoryAccordion.isListView`)
   - KDS Stations: selector categorías normalizado (`res.data?.data || res.data`)
   - KDS Dashboard: pre-selección estación trabajo al cargar (reordenar useEffects)
   - Documentación: [`field-fixes-v1.39.0.md`](./field-fixes-v1.39.0.md)
   - Rama: `fix/gastro-pos-list-kds-stations`
3. 🟡 **FEAT-160 — OmniMobile Monorepo** (`in_progress`): Estructura + app-waiter v1.0.
4. 🟡 **FEAT-105 — OmniLedger Standalone** (`in_progress`): Contabilidad partida doble, FastAPI + PostgreSQL RLS.
5. 🟡 **FEAT-107 — OmniCapitalHumano** (`in_progress`): RRHH core (Employee, legajo digital, contratos).
6. 🟡 **FEAT-108 — OmniAsistencia** (`in_progress`): Marcación multi-método (NFC, QR, PIN kiosk, mobile + biometría).
7. ⚪ **Fase 4 — Hardware + Escala** (FEAT-120 → 124): planned.

---

## 🔗 Documentos vinculados

- [Plan Comercial SaaS](../comercial/OmniFlow_Plan_Comercial_v1.md) — visión de monetización
- [Plan de Blindaje OrderFlow](../PLAN_BLINDAJE_ORDERFLOW.md) — Fases 1-6 cerradas (FEAT-1xx anteriores)
- [Estado del Arte v1.24.04](../../info/OrderFlow_v1.24.04_Estado_del_Arte.md) — release actual
- [ROADMAP](../../../ROADMAP.md) — roadmap vivo

---

## 🗃️ Histórico (no usar como referencia)

Toda versión previa y análisis estratégico/competitivo está en [`historial/`](./historial/). Ver [`historial/README.md`](./historial/README.md) para el detalle y motivo de archivo de cada documento.
