# Roadmap Ejecutivo OmniGastro / OmniDineIn

> **Proyecto:** OrderFlow / OmniFlow → OmniGastro
> **Módulo comercial:** OmniDineIn (add-on instalable vía `ModuleInstallation`)
> **Fecha:** 2026-10-20
> **Fuente de verdad:** `PLAN_MAESTRO.md` + `AUDITORIA_OMNIGASTRO_2026-09-18.md` + `DISENO_KDS_CONFIGURABLE_IMPRESION.md` + `CHANGELOG.md` (v1.38.20 → v1.39.16) + `field-fixes-v1.39.0.md` + `DIAGNOSTICO_BUGS_RESTANTES_2026-10-20.md`

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
| **FEAT-167** | Fix 401 en endpoints públicos QR / Bio-Link — eliminación de `@UseGuards` y `@TenantPrisma()` | ✅ **COMPLETADO** (v1.39.6) | — |
| **FEAT-173** | OmniGastro Payment Routing Configuration (módulo standalone tenant-aware) | ✅ **COMPLETADO** (v1.39.7) | FEAT-167 |
| **FEAT-174** | POS mozo responsivo en tablet + QR de mesa → menú digital (no bio-links) | ✅ **COMPLETADO** (v1.39.9) | FEAT-166 |
| **FEAT-184** | Mapeo de mesas OrderFlow ↔ Odoo POS (`restaurant_tables.odoo_table_id`) | ✅ **COMPLETADO** (v1.39.11) | FEAT-185 |
| **FEAT-185** | Parche del addon Odoo 14 `pos_omniflow_sync`: `pos.order` creable por RPC | ✅ **COMPLETADO** (v1.39.11) | — |
| **FEAT-186** | Disparo del sync a Odoo en el cierre de mesa y cobro en mesa configurables | ✅ **COMPLETADO** (v1.39.11) | FEAT-184, FEAT-185 |
| **FEAT-187** | Unificación de la configuración del odoo-adapter, de la cola BullMQ y del listener | ✅ **COMPLETADO** (v1.39.11) | FEAT-186 |
| **FEAT-188** | Telemetría t0…t5, métricas Prometheus y E2E del sync a Odoo POS | ✅ **COMPLETADO** (v1.39.11) | FEAT-187 |
| **FEAT-189** | Cobro en `/admin/gastro/tables`: la verificación de PIN devolvía HTTP 400 | ✅ **COMPLETADO** (v1.39.13) | FEAT-167 |
| **FEAT-190** | Cuenta abierta: traspaso de la cuenta a una persona y liberación de la mesa | ✅ **COMPLETADO** (v1.39.14) | FEAT-115, FEAT-116 |
| **FEAT-191** | El KDS se actualiza solo cuando el mozo envía el pedido a cocina (bug #5) | ✅ **COMPLETADO** (v1.39.15) | FEAT-190 |
| **FEAT-192** | Lote 2 de bugs del cliente: alertas del mozo, KDS, POS y catálogo (#1, #2a, #2b, #3, #4, #6, #9) | ✅ **COMPLETADO** (v1.39.16) | FEAT-191 |
| **FEAT-193** | La sesión de caja se ancla a la caja física (el turno pertenece a la caja, no al usuario) | ✅ **COMPLETADO** (v1.39.19) | FEAT-192 |
| **FEAT-194** | Bandera de Mozo: solo los empleados con `Employee.canUseMozoPos` pueden tener sesión en el POS de mozo | 🟡 **PLANIFICADO** (F2, v1.39.26) — [plan maestro](plan-actualizacion-v1.39.25-historial-pedidos-bandera-mozo.md) | — |
| **FEAT-196** | Cierre de turno (Reporte Z) y relevo de cajero en el panel de Caja Gastro | ✅ **COMPLETADO** (v1.39.20) | FEAT-193 |
| **FEAT-197** | Historial y seguimiento de pedidos del comensal y del panel de mozos (3 capas + fix `paidAt`) | 🟡 **PLANIFICADO** (F1 v1.39.25 → F3 v1.39.27 → F4 v1.39.28) — [plan maestro](plan-actualizacion-v1.39.25-historial-pedidos-bandera-mozo.md) · [flujo](flujo-historial-pedidos.md) | FEAT-193, FEAT-196 |

> **Deploy acumulado en producción (2026-10-21 21:53):** v1.39.22 (3 rutas admin 404: `social-catalog`, `loyalty`, `gastro/kds-stations`) + v1.39.23 (reclamo previo del pedido en la vista POS por mesa) + v1.39.24 (botón ☰ del catálogo del POS del mozo) → `provecchio.com` (`192.168.69.240`), health `1.39.24 ok`, 5 contenedores healthy, QA post-deploy con las 8 rutas admin en verde. Rollback: `deploy-artifacts/rollback-provecchio-20261021_212239.env`.

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

## 5.1. Lote de fixes del cliente v1.39.9 (FEAT-183 → FEAT-192)

> **Estado:** 12 bugs del backlog del cliente reportados en `provecchio.com` v1.39.9.
> **Enlazados:** `docs/plans/omnigastro/DIAGNOSTICO_BUGS_RESTANTES_2026-10-20.md`,
> `docs/plans/omnigastro/auditoria-gastro-lote-2-bugs.md`,
> `docs/plans/omnigastro/BACKLOG_CLIENTE_20261019.md`.

| # | Síntoma | Causa raíz | Corrección | Estado |
|---|---|---|---|---|
| **1** | La alerta sonaba en el **móvil del cliente** y no en la tablet del mozo | La página pública reproducía `playNotificationSound('call')`; la tablet del mozo (`gastro-pos.tsx`, `gastro-mozos.tsx`) **no tenía WebSocket** | El cliente ya no suena; nuevo hook `useWaiterAlerts` (sonido + pop-up) en POS, mozos y panel | ✅ v1.39.16 |
| **2a** | Al pedir desde el QR de mesa se ofrecía **"Para llevar / Barra"** | El modal de `serviceMode` se abría siempre en el checkout | Con QR de mesa (`tableInfo.tableId`) se envía directo con `serviceMode: 'TABLE'`; el modal queda para QR sin mesa | ✅ v1.39.16 |
| **2b** | Al confirmar el pedido el mozo **no se enteraba** | Se creaba el `WaiterCall` en BD pero **no se emitía ningún evento** | `guest-orders.controller.ts` emite `waiterCallNew` a `tenant:{tenantId}` con la misma carga que "llamar al mozo" | ✅ v1.39.16 |
| **3** | El aviso al mozo mostraba el **UUID** del producto | El texto se componía con `${l.productId}` | Se usa `metadata.snapshotName` (o el nombre resuelto del producto); el aviso usa `call.tableNumber` (G5) en vez de `call.tableId` | ✅ v1.39.16 |
| **4** | Tras "Volver al menú" no se veía el resumen y el carrito parecía vacío | El carrito se vacía al confirmar (correcto) y la vista de seguimiento sustituye al catáculo sin señal | `omni-catalog.tsx`: al volver al menú se informa *"Tu pedido #xxxx sigue en curso. Te avisaremos cuando esté ready."* | ✅ v1.39.16 |
| **5** | El pedido enviado a cocina **no aparece en el KDS** hasta "Sincronizar todo" | El KDS solo recargaba al cambiar de estación | `kds.tsx`: se suscribe al evento `order:status_updated` y recarga la lista cuando un pedido de la estación actual cambia a `PREPARING` | ✅ v1.39.15 |
| **6** | Al confirmar en cocina la comanda **desaparecía** y se perdía el historial Pendiente/Cocinando/Listo | El handler `order:status_updated` **filtraba** la comanda de la lista al llegar a `DELIVERED` | Las comandas servidas pasan a una sección **"🗂️ Historial de la sesión"** (con su estado final) en lugar de desaparecer | ✅ v1.39.16 |
| **7** | El cierre de cuenta del mozo **no carga en el POS de Odoo 14** | Cadena completa rota: cierre de mesa → evento → listener → BullMQ → processor → odoo-adapter → Odoo 14 | 12 defectos reales (D1–D12) corregidos y verificados en ERP (`pos.order 31971`, `pos_reference "OmniFlow-<uuid>"`, mesa 77 G5, sessions 1594, `amount_total 36.000`, línea `[BEB004] Americano` ×2) | ✅ v1.39.12 |
| **8a** | En `/admin/gastro/tables` solo funciona el **"C"** del CRUD | Faltaban handlers de update/delete en el frontend | CRUD completo implementado | ✅ v1.39.10 |
| **8b** | El cobro de la mesa G5 pide **PIN** y devuelve **HTTP 400** en `POST /api/v1/public/hr/kiosk/pin/verify` | Cadena de resolución de `tenantId` rota; el frontend no enviaba `x-api-key` | `HrKioskPublicController.resolveTenantId()` con cadena `tenantId → tenant.id → user.tenantId`; frontend envía `x-api-key` en `/api/v1/public/hr/kiosk/**`; mensaje de asignación usa `firstName/lastName`; `guestPending` expone `paymentPreconfirmedAt`/`paymentPreconfirmData` | ✅ v1.39.13 |
| **9** | Tras enviar a cocina desde el POS, el pedido **desaparece** y el mozo no puede reabrirlo para modificarlo | El POS consultaba `status=DRAFT,CLAIMED,SENT_TO_KITCHEN,IN_PREPARATION,READY`: tres de esos estados **no existen** en el enum `OrderStatus` (`DRAFT, CONFIRMED, PREPARING, READY, DELIVERED, CANCELLED`). Al enviar a cocina el pedido pasa a `PREPARING`, no entraba en el filtro | `gastro-pos.tsx`: consulta `DRAFT,CONFIRMED,PREPARING,READY` | ✅ v1.39.16 |

**Notas de coherencia del lote:**
- El patrón `l.name || l productId` apareía en tres lugares (backend `guest-orders.controller.ts`, `orders.service.ts` y la vista de seguimiento del cliente): cuando falta el `snapshotName`, la UI cae al UUID. En este lote se corrigió el punto de origen (el texto del aviso) y el de la vista del cliente ya usa `metadata.snapshotName`; **pendiente** unificar el helper de "nombre de línea" en un único sitio.
- **Caja en producción:** las cajas (`cash_registers`) están vacías en `provecchio.com`, por lo que el mozo no puede imputar los cobros de la cuenta abierta. Queda como **bloqueador operativo** para el cierre de mesas con cuenta abierta (FEAT-190). Ver `docs/plans/omnigastro/BACKLOG_CLIENTE_20261019.md` §8.

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