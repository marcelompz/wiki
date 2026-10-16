# Roadmap Ejecutivo OmniGastro / OmniDineIn

> **Proyecto:** OrderFlow / OmniFlow → OmniGastro
> **Módulo comercial:** OmniDineIn (add-on instalable vía `ModuleInstallation`)
> **Fecha:** 2026-10-16
> **Fuente de verdad:** `PLAN_MAESTRO.md` + `AUDITORIA_OMNIGASTRO_2026-09-18.md` + `DISENO_KDS_CONFIGURABLE_IMPRESION.md` + `CHANGELOG.md` (v1.38.20 → v1.39.1) + `field-fixes-v1.39.0.md`

---

## 1. Estado Actual (2026-10-16)

| FEAT | Título | Estado | Bloqueantes |
|------|--------|--------|-------------|
| **FEAT-112** | Safeguards (Soft-delete + Restrict + Linter) | ✅ **COMPLETADO** (3/3 en código) | — |
| **FEAT-113** | PosSession real + WAITER + permisos | ✅ **COMPLETADO** | FEAT-112, FEAT-093, FEAT-097 |
| **FEAT-114** | Mesas, Zonas, Mapa de Piso, Ownership Mozo | ✅ **COMPLETADO** | — |
| **FEAT-115** | Asientos/Comensales + Traspaso | ✅ **COMPLETADO** | — |
| **FEAT-116** | Split Billing + Waiter Custody | ✅ **COMPLETADO** | — |
| **FEAT-117** | KDS Coursing + Atribución Mozo + Bump Bars | ✅ **COMPLETADO** | — |
| **FEAT-118** | Live Escandallo Engine (BoM + Redis) | ✅ **COMPLETADO** | — |
| **FEAT-119** | Seat-level Ordering + Cross-Table Gifting | ✅ **COMPLETADO** | — |
| **FEAT-120** | Hardware Bridge Tauri/Rust | `planned` | FEAT-113 |
| **FEAT-121** | Pagos Offline Store-and-Forward | `planned` | FEAT-120 |
| **FEAT-122** | Delivery Connectors (Rappi/PedidosYa/Uber) | `planned` | FEAT-117 |
| **FEAT-123** | Sindicación Menús Multi-Sucursal | `planned` | FEAT-114 |
| **FEAT-124** | Menu Engineering + Auditoría Mermas | `planned` | FEAT-118 |
| **FEAT-125** | Guest Digital Menu + Table Claim + Waiter Call | ✅ **COMPLETADO** | FEAT-113, FEAT-114 |
| **FEAT-147** | KDS Dynamic Routing por PreparationStation | ✅ **COMPLETADO** | FEAT-121, FEAT-130 |
| **FEAT-148** | Product.showInKDS — Visibilidad por producto en KDS | ✅ **COMPLETADO** | FEAT-147 |
| **FEAT-151** | KDS Configurable Multi-Estación + Impresión Selectiva | ✅ **COMPLETADO** (v1.38.20) | FEAT-147, FEAT-148 |
| **FEAT-152** | KDS Product-Station Links (N:N) + Routing Multi-Destino | ✅ **COMPLETADO** (v1.38.20) | FEAT-151 |
| **RBAC Empleados** | Hardening permisos POS/Mesas/Waiter + StepUp PIN | ✅ **COMPLETADO** (v1.38.20) | — |
| **FEAT-161** | PIN Verification Estricta + Auto-asignación Mozo | ✅ **COMPLETADO** (v1.38.16) | — |
| **FEAT-163** | Fix HTTP 500 en GET /api/v1/orders (status enum) | ✅ **COMPLETADO** (v1.38.20) | — |
| **FEAT-164** | Fix Modal Gestión Mesas QR + Odoo POS TypeError | ✅ **COMPLETADO** (v1.38.21) | — |
| **FEAT-165** | Fix 403 Forbidden en auth endpoints del panel mozo | ✅ **COMPLETADO** (v1.38.22) | — |
| **FEAT-166** | Sprint Fixes Provecchio: POS Grid, KDS Categories, KDS Pre-selection | ✅ **COMPLETADO** (v1.39.1) | — |

---

## 2. Cadena de Dependencias

```
FEAT-112 (gaps) ──► FEAT-113 ──► FEAT-114 ──► FEAT-115 ──► FEAT-116
                         │               │               │
                         ├─► FEAT-118*   ├─► FEAT-119    └─► FEAT-118* ──► FEAT-124
                         │               │
                         │               └─► FEAT-125 (demo ✅)
                         │
                         └─► FEAT-120 ──► FEAT-121 ──► FEAT-122

FEAT-147 (routing por categoría) ──► FEAT-148 (showInKDS) ──► FEAT-151 (KDS configurable multi-estación + impresión) ──► FEAT-152 (N:N Product-Station)
```

---

## 3. Fases y Timeline Estimado

| Fase | FEATs | Duración est. | Estado |
|------|-------|---------------|--------|
| **0 – Safeguards** | FEAT-112 | 1 semana | ✅ **COMPLETED** |
| **1 – Cimientos + Caja** | FEAT-113 | 3-4 semanas | ✅ **COMPLETED** |
| **2 – Salón + Guest Experience** | FEAT-114, 115, 116, 119, 125 | 8-10 semanas | ✅ **COMPLETED** |
| **3 – Cocina + Costos** | FEAT-117, 118 | 5-7 semanas | ✅ **COMPLETED** |
| **3.1 – KDS Configurable + Impresión** | FEAT-147, 148, 151, 152 | 3-4 semanas | ✅ **COMPLETED** (v1.38.20) |
| **3.2 – Hardening RBAC Empleados** | — | 1-2 semanas | ✅ **COMPLETED** (v1.38.20) |
| **3.3 – Fixes de Campo Provecchio** | FEAT-161, 163, 164, 165 | 2-3 semanas | ✅ **COMPLETED** (v1.38.16–1.38.22) |
| **4 – Hardware + Escala** | FEAT-120 → 124 | 10-14 semanas | ⏳ Pendiente |

---

## 4. Bloqueadores Restantes

1. ~~**FEAT-125 demo**: Persistencia temporal en `Tenant.config` (JSON)~~ → **RESUELTO 2026-09-18**: migración completada a tablas DB (`RestaurantTable.token`, `WaiterCall`, `WaiterCallOption`).
2. ~~**Lógica de negocio**: FEAT-114/115/116/117/118/119 requieren servicios y controladores sobre modelos ya deployados.~~ → **RESUELTO 2026-09-24**: todos los servicios y controladores implementados.
3. ~~**KDS routing base**: FEAT-147/148 completaron routing por categoría y visibilidad `showInKDS`.~~ → **RESUELTO**.
4. ~~**FEAT-151/152**: migración Prisma + servicio de impresión ESC/POS + UI admin.~~ → **RESUELTO 2026-09-28**: `20260927193000_kds_multi_station_printing` aplicada, `ProductPreparationStation` + `KitchenPrintService` + UI `/admin/kds/stations`.
5. **Pendiente**: Fase 4 (FEAT-120 → 124) — Hardware Bridge, Offline Store-and-Forward, Delivery Connectors, Sindicación Menús, Menu Engineering.

---

## 5. Próximos Pasos Inmediatos

1. ✅ Migrar FEAT-125 a tablas DB (completado 2026-09-18): `GuestTablesController`, `GuestOrdersController`, `GuestCallWaiterController`, `WaiterCallsController`, `AdminWaiterCallOptionsController`.
2. ✅ Implementar servicios FEAT-114 (TablesService, FloorService, WaiterOwnershipService) — completado 2026-09-24.
3. ✅ Implementar servicios FEAT-115 (TableGuestService, TransferService) — completado 2026-09-24.
4. ✅ Implementar servicios FEAT-116 (BillSplitService, SplitPaymentService) — completado 2026-09-24.
5. ✅ Implementar servicios FEAT-117 (KitchenTicketService, BumpBarService, Coursíng KDS) — completado 2026-09-24.
6. ✅ Implementar servicios FEAT-118 (BomEngine, BomController, integración en OrdersService) — completado 2026-09-24.
7. ✅ Implementar servicios FEAT-119 (Seat-level Ordering + Cross-Table Gifting) — completado 2026-09-24.
8. ✅ FEAT-151/152 — KDS Configurable Multi-Estación + Impresión Selectiva: migración `20260927193000_kds_multi_station_printing`, `ProductPreparationStation`, `KitchenPrintService`, routing multi-destino, UI admin estaciones/productos. Ver `DISENO_KDS_CONFIGURABLE_IMPRESION.md` — completado 2026-09-28.
9. ✅ Hardening RBAC empleados — `PermissionsGuard`, `StepUpGuard`, nuevos permisos `tables:status`, `tables:guests`, `tables:gift`, `pos:config` — completado 2026-09-21 (v1.38.20).
10. ✅ Fixes de campo Provecchio (FEAT-161/163/164/165) — 403 verify-pin, 500 orders enum, Modal QR vacío, Odoo POS TypeError — completados v1.38.16–1.38.22.
11. 🟡 **Fase 4 (FEAT-120 → 124)** — Hardware Bridge Tauri/Rust, Pagos Offline Store-and-Forward, Delivery Connectors, Sindicación Menús Multi-Sucursal, Menu Engineering + Auditoría Mermas. Ver `PLAN_MAESTRO.md` §5.

---

## 6. Métricas de Éxito

| Métrica | Objetivo |
|---------|----------|
| Apertura de POS / mesa | < 1,5 s |
| Latencia KDS / Waiter Call | < 50 ms |
| Procesamiento Live Escandallo | < 100 ms |
| Propagación 86ing | < 500 ms |
| Tasa de sincronización offline | > 99,9 % |
| Error en descuento de stock | < 0,1 % |
| Paridad funcional Toast | ≥ 90-95 % |
| Data-loss incidents post-Fase 0 | 0 |
| Tiempo desde "Enviar pedido" hasta alerta en tablet del mozo | < 1 s |

---

*Actualizado el 2026-10-16. Fuente: `PLAN_MAESTRO.md` + `AUDITORIA_OMNIGASTRO_2026-09-18.md` + `DISENO_KDS_CONFIGURABLE_IMPRESION.md` + `CHANGELOG.md` (v1.38.20 → v1.38.22).*