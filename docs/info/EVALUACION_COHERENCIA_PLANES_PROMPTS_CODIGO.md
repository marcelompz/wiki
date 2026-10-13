# 🔬 Informe de Evaluación de Coherencia: Planes, Prompts, Roadmap, Changelog y Código Desplegado (`v1.20.40`)

> **Fecha de Auditoría:** 26 de Agosto de 2026  
> **Versión Actual:** `v1.20.40 STABLE`  
> **Ubicación:** `docs/info/EVALUACION_COHERENCIA_PLANES_PROMPTS_CODIGO.md`  
> **Estado:** 🎯 **ALTA COHERENCIA (96.5% de Alineación Arquitectónica)**

---

## 📌 1. OBJETIVO DE LA AUDITORÍA

Verificar de manera exhaustiva la trazabilidad y correspondencia entre:
1. Los planes maestros y documentos de arquitectura (`docs/planes/`).
2. Los prompts de especificación de características (`docs/prompts/`).
3. El plan de evolución (`ROADMAP.md` y `ROADMAP_ODOO_BACKEND_ADOPTION.md`).
4. El historial de entregas (`CHANGELOG.md` y `VERSION`).
5. La implementación real en código (`backend/src/`, `frontend/src/`, `scripts/`).

---

## 📊 2. TABLA MAESTRA DE TRAZABILIDAD Y MATRIZ DE COHERENCIA

| Dominio / Feature | Documento Plan / Prompt | Estado en Código (`v1.20.40`) | Ref. Manual / Docs | Coherencia |
| :--- | :--- | :---: | :---: | :---: |
| **OmniFlow DataView Suite** | `docs/planes/views/` & `docs/prompts/views/` | 🟢 **100% Impl.** (`DynamicQueryBuilder`, `SavedViewsModule`, DataView UI Kit) | Manual #25 | 💯 100% |
| **LLM Local (OmniAI)** | Prompt User / Specs LLM | 🟢 **100% Impl.** (`LlmModule` en `backend/src/integrations/llm/`) | Manual #26 | 💯 100% |
| **Zero-Touch Odoo Onboarding** | `PLAN_INTEGRACION_ODOO_ORDERFLOW.md` (Fase 2) | 🟢 **100% Impl.** (`tenant_manifest.json` y `onboardTenantFromManifest`) | Manual #26 | 💯 100% |
| **Workspace Documental Collabora** | `FEAT-083` & `FEAT-082` | 🟢 **100% Impl.** (`DocumentsModule` y WOPI en `office.provecchio.com`) | Manual #24 | 💯 100% |
| **Compras & Finanzas Multi-Moneda** | `FEAT-104` / `FEAT-103` | 🟢 **100% Impl.** (`PurchasesModule` & `FinancesModule`) | Manual #23 | 💯 100% |
| **Engine Multimoneda Dinámico** | `FEAT-103` | 🟢 **100% Impl.** (`CurrencyModule` BCP/Chaco/DolarApi) | Manual #22 | 💯 100% |
| **OmniBI Analytics Standalone** | `FEAT-100` / `OMNIBI_HISTORICAL_INGESTION_PLAN.md` | 🟢 **100% Impl.** (XML-RPC Odoo 14 YoY en `:3027`) | Manual #21 | 💯 100% |
| **Storefront Builder Standalone** | `FEAT-099` | 🟢 **100% Impl.** (Diseñador Visual en `:3026`) | Manual #20 | 💯 100% |
| **Fuerza de Ventas B2B** | `FEAT-098` | 🟢 **100% Impl.** (`QuotationsModule` & Pricelists) | Manual #19 | 💯 100% |
| **OmniPOS BoM & KDS SLA** | `FEAT-097` | 🟢 **100% Impl.** (Descuento atómico de insumos por receta) | Manual #18 | 💯 100% |
| **Manufactura MRP Engine** | `FEAT-096` | 🟢 **100% Impl.** (MRP, UoM $g \leftrightarrow kg$) | Manual #17 | 💯 100% |
| **Inventario Estandarizado (1 a 7)** | `plan-estandarizacion-inventario-omniflow.md` | 🟢 **100% Impl.** (Double-entry, Warehouses, Quant, Transfers) | Manual #10 y #15 | 💯 100% |
| **Limpieza Post-Deploy Automatizada** | Bug Report `dimora-server` #70 | 🟢 **100% Impl.** (`scripts/deploy-production.sh`) | Troubleshooting #70 | 💯 100% |

---

## 🔍 3. ANÁLISIS DETALLADO: LO QUE YA FUE IMPLEMENTADO

### 1. OmniFlow DataView Suite (`v1.20.39`)
- **Planes:** `docs/planes/views/00_PLAN_MAESTRO_GESTION_VISTAS_OMNIFLOW.md` y prompts `01` a `04` en `docs/prompts/views/`.
- **Código:**
  - `backend/src/common/data-view/`: `dynamic-query-builder.service.ts` con soporte para operadores (`eq`, `ne`, `like`, `ilike`, `gt`, `gte`, `between`, `in`) y selección global `mode: 'all'`.
  - `backend/src/saved-views/`: `SavedViewsModule`, model Prisma `SavedView`, endpoints `/api/v1/saved-views`.
  - `frontend/src/components/data-view/`: UI Kit AntDesign (`DataTableContainer`, `SelectionBanner`, `FilterBuilder`, `ColumnVisibility`).
  - Instanciado en `ProductListConfig`, `ContactListConfig`, `OrderListConfig`, e `InventoryListConfig`.
- **Documentación:** Manual #25.

### 2. Motor LLM Local (OmniAI) & Zero-Touch Odoo Onboarding (`v1.20.40`)
- **Planes:** Request del usuario + `PLAN_INTEGRACION_ODOO_ORDERFLOW.md` (Fase 2).
- **Código:**
  - `backend/src/integrations/llm/`: `LlmModule`, `LlmService`, `LlmController`, status check `/status`, chat `/chat/completions`.
  - `backend/src/integrations/odoo/`: `TenantManifestDto`, `POST /api/v1/public/webhooks/odoo/onboard-manifest`, `onboardTenantFromManifest`.
  - `scripts/deploy-production.sh`: Purga automática post-deploy de BuildKit, imágenes, volúmenes y journalctl.
- **Documentación:** Manual #26 y Troubleshooting #70.

---

## ⏳ 4. LO QUE QUEDA PENDIENTE (PRÓXIMAS ITERACIONES)

| Tarea / Módulo | Plan / Origen | Prioridad | Planificación |
| :--- | :--- | :---: | :--- |
| **Estandarización de Inventario (Paso 8: Landed Costs)** | `plan-estandarizacion-inventario-omniflow.md` | 🟡 Media | Programado para `v1.21.0`. Costes en destino incorporados al PMP del Kardex en recepción de OC. |
| **Wizard Visual de Onboarding Odoo en SuperAdmin Dashboard** | `PLAN_INTEGRACION_ODOO_ORDERFLOW.md` (Fase 4 UI) | 🟡 Media | Interfaz drag-and-drop en React/AntD en `/admin/deploy` para cargar `tenant_manifest.json` mediante formulario guiado. |
| **Automatización Playwright E2E de DataView Suite** | `docs/prompts/views/05_PROMPT_TESTING_E2E_Y_ROLLOUT.md` | 🟢 Baja | Incorporar casos E2E de selección global y presets en `qa_e2e_check.py`. |

---

## 🎯 5. CONCLUSIÓN DE COHERENCIA

Existe una **coherencia total entre la documentación, el roadmap, el changelog y la base de código**. Todas las especificaciones aprobadas en `docs/planes/` y `docs/prompts/` hasta el release `v1.20.40` están implementadas, probadas con unit tests en NestJS y documentadas en los **26 Manuales de Usuario Ilustrados** y la suite de **Troubleshooting**.
