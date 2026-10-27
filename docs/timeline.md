# Línea de Tiempo y Evolución de OmniFlow

**Última actualización:** 2026-10-24  
**Versión actual:** `v1.42.1`  
**Próximo hito:** `v1.43.0` — cierre de FEAT-203/204/205 (TableSessions, Bill merge/unmerge, sync_bill a Odoo)  
**Documento fuente:** `CHANGELOG.md`, `ROADMAP.md`, `featurelist.json`

---

### 2026-10-24 : v1.42.1 — Pedidos agrupados por asiento en POS + flag TableSessions
- POS del mozo agrupa los pedidos de una misma mesa por número de asiento (`seatNumber`), de modo que varios comensales que escanean el mismo QR se visualicen como líneas diferenciadas dentro de una sola sesión de mesa.
- Nuevo feature flag `gastro.tableSessions` en `/admin/settings → OmniGastro` para habilitar sesiones de mesa (TableSession), `guestKey` por dispositivo e idempotencia en la alta de pedidos por QR (FEAT-203, FEAT-204, FEAT-205 en desarrollo).
- Mock de `BillsService` en tests de `pos-sessions` para aislar caja de la capa de cuentas (FEAT-204).
- SuperAdmin vía `MASTER_API_KEY` establece `request.user` sintético para operaciones cruzadas de tenants.
- Versión sincronizada a `1.42.1` en `VERSION`, `package.json`, `featurelist.json`, `CHANGELOG.md` y este documento.

### 2026-10-23 : v1.42.0 — FEAT-203/204/205 en desarrollo (sesiones de mesa, cuentas y sync_bill)
- FEAT-203: TableSession (una sesión OPEN por mesa), `guestKey` por dispositivo, `idempotencyKey` por tenant, append de líneas al pedido activo del mismo comensal, lock `SELECT … FOR UPDATE`, claim a nivel mesa y endpoints `GET /tables/:id/session` + `POST /table-sessions/:id/close`. Feature flag `gastro.tableSessions`.
- FEAT-204: capa de cuenta (Bill) como unidad de cobro fiscal (`PER_ORDER` / `MERGED`), endpoints `POST /bills`, `/bills/:id/orders`, `/bills/:id/unmerge`, `/bills/:id/pay`, `Bill.lockedAt` para impedir doble cobro, y tarjeta por sesión/mesa en caja.
- FEAT-205: `sync_bill` idempotente — una `pos.order` por cuenta en Odoo (upsert por `omniflow_bill_ref`), addon `pos_omniflow_sync` v14.0.1.4.0, telemetría `t0…t12` y colección Newman del contrato.

### 2026-10-23 : v1.41.5 — Modal «Llamar al mozo» sin select vacío en el QR de mesa
- Se eliminó el `<Select>` con opciones «undefined» de los dos modales de llamada al mozo (`omni-catalog.tsx`); queda solo el campo de mensaje libre. Se retiró `selectedWaiterOption` y el envío de `optionId`.
- Doc: `docs/troubleshooting/199-select-vacio-llamar-mozo-qr.md`.

### 2026-10-23 : v1.41.4 — Ítems que desaparecían del POS de Odoo + historial del pedido en Mozo POS
- Backfill en Odoo: 123 productos habilitados para POS y asignados a `pos_categ_id` 16/17; addon `pos_omniflow_sync` v14.0.1.3.0 habilita automáticamente productos no POS al sincronizar.
- Mozo POS (`/admin/gastro/pos`) carga el último pedido de la mesa en modo lectura con etiqueta «Cerrado» cuando la mesa está libre y no hay pedido activo.
- Doc: `docs/troubleshooting/198-pos-odoo-items-faltantes-e-historial-mozo.md`.

### 2026-10-23 : v1.41.3 — Fix crítico: la caja del POS de Odoo no abría
- `pos_omniflow_sync` generaba `pos_reference` no parseable por Odoo 14 (`AttributeError` en `get_table_draft_orders`). Hotfix de pedido 32061 y addon v14.0.1.2.0 con `pos_reference` formato `Order %05d-%03d-%04d`, campo `omniflow_order_ref` y normalización de referencias heredadas.
- Desplegado en Odoo de producción (`192.168.69.246`, contenedor `odoo_web_8081`).
- Doc: `docs/troubleshooting/197-odoo-pos-reference-incompatible-caja.md`.

### 2026-10-23 : v1.41.2 — Visibilidad y seguridad de la integración Odoo (FEAT-201) + hardening del deploy
- `odoo_host` visible en `/api/omniflow/odoo_floors`, snapshot `odooHost` y modal `GastroOdooSyncModal` lo muestra en el pie (`Odoo: <host>`).
- Interlock de escritura en E2E: pruebas de provisión exigen `E2E_ODOO_HOST_ACK` con el host exacto; si no coincide, la suite se omite.
- `scripts/deploy-production.sh`: build antes de eliminar contenedores, limpieza de contenedores huérfanos con prefijo hash, trap `EXIT` para recuperación automática, y `orderflow_sync_standalone` con overlay `docker-compose.provecchio.yml`.
- Operaciones: limpieza de pisos/mesas de prueba en Odoo y mapeo local Terraza→1, Giardino→5.

### 2026-10-22 : v1.41.1 — OmniGastro: pisos provisionados asociados a un POS de Odoo
- `provision_floor` infiere el POS más usado entre los pisos activos de Odoo (`pickDefaultPosConfigId`) y repara pisos huérfanos (`repaired: true`).
- Backend `ProvisionFloorResult` expone `posConfigId` y `repaired`; frontend agrega selector «POS destino» en el modal de sincronización.
- 13 casos backend + 5 del adapter. Incidente: corrida E2E escribió en Odoo de producción (pisos/mesas de prueba eliminados y documentados en troubleshooting #195).

### 2026-10-22 : v1.41.0 — OmniGastro — Provisioning de pisos y mesas hacia Odoo 14 (FEAT-201)
- OmniGastro pasa a ser fuente de verdad con provisioning idempotente desde `/admin/gastro/tables` → «Sincronizar con Odoo»: `GET /api/v1/tables/odoo-floors`, `POST /odoo-provision/floor`, `POST /odoo-provision/tables`.
- `RestaurantFloor.odooFloorId` + índice único `(tenantId, odoo_floor_id)`; Odoo 14 asocia piso al POS con `pos_config_id`.
- Adapter `odoo_floors` / `provision_floor` / `provision_tables`; frontend `GastroOdooSyncModal`; migración `20261022190000_restaurant_floors_odoo_floor_id`.

### 2026-10-22 : v1.40.2 — Editar y eliminar mesas en `/admin/gastro/tables` (FEAT-200) + operación de datos + fix 502 Hetzner
- Nuevo `GastroTableEditModal` + botones Editar/Eliminar en grilla y drawer; `deleteTable` rechaza si hay pedidos activos; `PATCH /tables/:id` valida mapeo duplicado a Odoo y pasa a permiso `tables:manage`.
- Operación de producción: limpieza de pruebas en OmniGastro, saneamiento de plano de Odoo (4 pisos + 21 mesas duplicadas archivadas), mapeo corregido de mesas y apertura de sesión POS atascada.
- Fix 502 persistente en `pesallaccia.com` por nombres de contenedor en Traefik (`orderflow_backend`/`orderflow_frontend` vs `orderflow-backend-prod`/…).
- Doc: `docs/plans/omnigastro/plan-actualizacion-v1.40.2-tables-crud.md`, `docs/troubleshooting/190-gastro-tables-handlers-huerfanos.md`, `docs/troubleshooting/191-hetzner-traefik-container-name-mismatch-502.md`.

### 2026-10-22 : v1.40.1 — Marca blanca: `PATCH /api/v1/tenants/:id` corregido (500 y riesgo de borrar config)
- `customDomainVerified` → `domainVerified`; descarte de objeto `whiteLabel` anidado; merge de `config` con el existente en vez de reemplazarlo (evita borrar `homepageBlocks`, `subscription`, `gastro`, `qrTokens`…).
- 6 unitarios nuevos + E2E `white-label-modal.spec.ts`. Desplegado en `provecchio.com` con protocolo completo (backup → restore → validación → deploy).

### 2026-10-22 : v1.40.0 — Marca blanca: endpoint de configuración por tenant + sanitización de `customDomain`
- Nuevo endpoint `GET /api/v1/tenants/:id/config` (guard `ApiKeyGuard` + `assertCanManageTenant`) que devuelve la configuración de marca blanca del tenant.
- `customDomain` se sanitiza (minúsculas, sin esquema, sin path/query) y se marca `customDomainVerified = true`; se añade `id: true` al select de Prisma (fix de build TS2339).
- Fix de protocolo de deploy local: `deploy-local.sh` reconstruye siempre con `up --build -d`.
- Desplegado en `provecchio.com`; health público reporta `1.40.0`.

### 2026-10-21 : v1.39.19 — Cierre de turno con arqueo y relevo de cajero en Caja Gastro
- Reporte del cliente durante la prueba de FEAT-193: tras abrir el turno con el PIN de Natalia Bogado
  **no había forma de cerrar la sesión ni de cambiar de cajero**
- **Cierre de turno**: nuevo botón con modal de arqueo (apertura, ingresos, egresos, efectivo
  esperado), campo de efectivo contado, badge de **faltante/sobrante** y Reporte Z persistido
- **Relevo de cajero**: nuevo endpoint `POST /api/v1/pos-sessions/:id/switch-cashier`
  (`CashManagementService.switchCashierByPin`) — valida el PIN, exige permiso `can_open` sobre la caja,
  rechaza duplicidad y **conserva** la misma sesión (caja, fondo y movimientos)
- **Fix de detección de sesión**: `activeSession` se deriva con `useMemo` (antes usaba un `setState`
  con closure obsoleta y no detectaba el turno al recargar); auto-selección de caja y bloqueo de
  apertura duplicada
- Validación: 7 unitarios nuevos (20 en total) + 2 E2E nuevos (5 en total, en modo serial)

### 2026-10-20 : v1.39.11 — Sincronización OrderFlow → Odoo 14 POS (bug #7 del cliente)
- Diagnóstico end-to-end de la cadena OrderFlow → BullMQ → odoo-adapter → Odoo 14: **la cadena nunca había funcionado** (0 `pos.order` `OmniFlow%` en la DB del ERP)
- **D1**: se enviaba el número de mesa legible (`"G5"`) como id de Odoo → `int("G5")` → HTTP 500
- **D2**: no existía correspondencia mesa ↔ mesa Odoo → nueva columna `restaurant_tables.odoo_table_id` (snake_case) + UI de mapeo
- **D3**: `pos.order.amount_tax` y `pos.order.line.price_subtotal` son `required=True` **sin `compute`** en el core de Odoo 14 → ninguna creación por RPC era posible (addon `pos_omniflow_sync` parcheado, **sin tocar el core**)
- **D4**: el cierre de mesa no disparaba el sync (solo "enviar a cocina") → `guestClose` emite con `trigger=TABLE_CLOSED`
- **D5/D6/D7**: `ODOO_DB=prod` parametrizado, worker legacy del adapter eliminado, telemetría `t0…t5` + 5 métricas Prometheus
- Cobro en mesa configurable por tenant (`waiterCanCollectPayment`); modal de **editar mesa** restaurado (bug #8a)
- Addon Odoo y script de despliegue versionados en el repo (`odoo-adapter/odoo-addons/pos_omniflow_sync/`, `scripts/deploy-odoo-addon.sh` con backup y rollback)
- Documentación: `docs/plans/omnigastro/PLAN_ODOO_POS_SYNC_2026-10-19.md` y `flujo_odoo-pos-sync.md` (diagrama Mermaid + hitos de telemetría)

---

### 2026-10-19 : v1.39.10 — Vertical OpenCore: análisis del schema Prisma (documentación)
- Se abre `docs/plans/opencore/` con el análisis verificado del schema core (161 modelos, 56 enums, 4.471 líneas, 38 carpetas de migración) y los 11 schemas standalone
- Documentos: `Plan_analisis_schema_prisma_v4.md`, `PLAN_2_SCHEMA_SPLITTING_SUMMARY.md`, `PROJECT_STATUS_REPORT.md`, `DEPLOYMENT_PLAN.md`, `README.md`, `ROADMAP_OPENCORE.md`, `PLAN_MAESTRO.md`, `AUDITORIA_OPENCORE_20261019.md`, `featurelist.json`
- FEAT-177 a FEAT-182 registradas en estado `planned` (Fase 0 baseline, Plan 1 revisión, Plan 3 diagrama, Plan 2 división, standalone/RLS, gates de salida)
- Fuente de verdad operativa: `provecchio.local`; nada se ejecuta contra `provecchio.com` sin autorización explícita
- **Sin cambios de código ni de versión** (se mantiene 1.39.10; el 1.40.0 queda reservado para Tauri Desktop & OmnIoT Edge)
- Auditoría de ramas: `staging` (30 commits, v0.5.0) **no es fusionable** (borraría 132.556 líneas de `main`); la parte de código de `feat/schema-prisma-analysis-v3` tampoco (revierte fixes de deploy)

---

### 2026-10-16 : v1.39.2 — OmniGastro Bug Fixes Post-v1.39.1 (Provecchio)
- Bug 1: KDS Stations categorías padre/hoja independientes + excluir subcategorías (`gastro-kds-stations.tsx`)
- Bug 2: Unificar fuente de mesas a `/api/v1/tables/floor-map` (modal y listado sincronizados) (`gastro.tsx`)
- Bug 4: Modal "Cargar Pedido" por mesa / sin mesa (takeout) + backend `tableId=null` y `orderType=TAKEOUT` (`orders.controller.ts`, `orders.service.ts`)
- Bug 5: Modal responsivo en panel de mozos, sin overflow de texto (width breakpoints, bodyStyle, ellipsis, scroll x) (`gastro.tsx`)
- Bump versión a 1.39.2 en VERSION, package.json, featurelist.json
- E2E Playwright: 4 nuevas specs en `frontend/e2e/`
- `./scripts/init.sh` pasa; `/api/v1/health` → v1.39.2

---

### 2026-10-19 : v1.39.10 — Deploy a producción (provecchio.com)
- Deploy de v1.39.10 a provecchio con `./scripts/deploy-production.sh provecchio` (autorizado por el usuario)
- Correcciones de infraestructura detectadas en el deploy (ver `docs/troubleshooting/183-*.md`):
  - SSH del script de deploy sin `root@` → `permission denied` sobre `.env.provecchio` (600) y `.git/objects`
  - El frontend servía `./frontend/dist` sin reconstruir (rsync excluye `**/dist`) → producción seguía en el bundle v1.39.8
  - `scripts/replica-entrypoint.sh` en modo 644 → réplica de PostgreSQL no arrancaba
  - `sync_standalone` / `omnibi_standalone` en crash-loop (mapping `@orderflow/auth-shared` a `.d.ts`, `main: dist/index.js` sin subcarpeta, bind mount de desarrollo sobre `/app`, Redis sin password, healthcheck con `wget` inexistente)
  - Base `orderflow_bi` creada y migración de OmniBI aplicada en producción
- Estado final: 9/9 contenedores `healthy`, `/api/v1/health` → `200 v1.39.10`, bundle frontend `1.39.10`, `✅ Socket.io Redis Adapter initialized successfully`
- E2E Playwright contra provecchio.com: **64/64 OK**; `qa_e2e_check.py`: sin errores JS ni 5xx

---

### 2026-10-19 : v1.39.10 — Backend: crash-loop por adapter de Socket.IO + Redis (`unhandledRejection`)
- `backend/src/common/redis-io.adapter.ts`: el cliente `sub` creado con `duplicate()` (hereda `lazyConnect`/`enableOfflineQueue:false`) nunca se conectaba; `@socket.io/redis-adapter` dispara `psubscribe`/`subscribe` sin `await` → rechazo sin manejar → Node 22 terminaba el proceso
  - Fix: `await subClient.connect()` antes de `createAdapter`, password enmascarada en logs, `safeQuit()` en el fallback
- `backend/src/main.ts`: guard acotado de `unhandledRejection` (solo rechazos de Redis; el resto mantiene `process.exit(1)`)
- `docker-compose.yml`: `env_file: .env` (fix `Configuration key "JWT_SECRET" does not exist`) + `REDIS_URL`/`REDIS_PASSWORD`/`ENABLE_REDIS_WS` en el servicio `backend`
- Documentado en `docs/troubleshooting/182-socketio-redis-adapter-unhandled-rejection-crash.md` + índice
- Validación: backend `healthy` (`RestartCount=0`), `/api/v1/health` → 200 v1.39.10, unit tests 940/940, E2E Playwright 64/64 vs `provecchio.local`
- Bump de versión a 1.39.10 (VERSION, package.json, main.ts Swagger, README/ROADMAP/timeline, featurelist.json, 37 manifiestos)

---

### 2026-10-19 : v1.39.9 — OmniGastro: POS mozo responsivo en tablet + QR de mesa con menú digital
- Bug 1: POS del mozo en tablet — el TOTAL se solapaba con la lista de productos (`gastro-pos.tsx` + `admin-mobile.css`)
  - `admin-mobile.css`: regla global `.ant-layout-sider{position:fixed!important}` scopeada a `.admin-sider`
  - `gastro-pos.tsx`: layout responsivo con `Grid.useBreakpoint()` (3/2/1 columnas + Drawer), header wrap-safe, `minWidth:0`
  - `AdminApp.tsx`: ruta `/admin/gastro/pos/*` a sangre (viewport completo)
- Bug 2: QR de mesa G10 (`/?t=<token>`) abría BioLinks en vez del menú digital (`public-storefront-page.tsx` + `App.tsx`)
  - `?t=` fuerza `SocialCatalogPage` (modo restaurante + "Llamar al mozo") con independencia de `homepagePreset`
- `featurelist.json` reparado (JSON inválido) + FEAT-174 registrada; 37 manifiestos re-sincronizados a 1.39.9
- E2E Playwright: `frontend/e2e/pos-tablet-responsive.spec.ts` 5/5 OK contra provecchio.local
- Bump de versión a 1.39.9 (VERSION, package.json, main.ts Swagger, README/ROADMAP/timeline, featurelist.json)

---

## 📜 Línea de Tiempo

```mermaid
timeline
    title Evolución de OmniFlow / OrderFlow (v0.1.0 → v1.25.0-alpha-omnigastro)
    2026-06-15 : v0.1.0 MVP inicial
                  : Multi-tenant API key, Giveaways, WhatsApp catalog
                  : NestJS + Prisma + React + Docker
    2026-06-22 : v0.2.0 Mobile + CI/CD
                  : React Native offline, SQL migrations, GitHub Actions
    2026-07-06 : v0.3.0 Swagger 100% + Staging
                  : 65 endpoints documentados, staging Hetzner operativo
    2026-07-12 : v0.3.1 Gestión Tenants
                  : disable/enable/delete, rol ADMIN
    2026-07-14 : v0.4.0 POS + KDS + Loyalty
                  : POS WebSocket, KDS tiempo real, Loyalty tiers
    2026-07-15 : v0.4.1 Fixes producción + Dominio configurable
    2026-07-15 : v0.4.2 Tauri Desktop POS + Observabilidad
                  : Sentry, Prometheus, dominio configurable
    2026-07-16 : v0.4.3 Testing Expansion (298 tests / 39 suites)
    2026-07-18 : v0.5.0 Traefik v3.3 + App Store
                  : HTTPS automático, Cloudflare DNS, manifiestos Docker
    2026-07-19 : v0.5.1 Observabilidad + RBAC + E2E
                  : API Key rotation, 14 tests Playwright
    2026-07-25 : v0.6.0-v0.7.0 Multi-Tier + Billing + Marketplace
                  : DB dedicada por tenant, 3 microservicios standalone
                  : Stripe/Mercado Pago, TenantThrottlerGuard, k6 CI
    2026-07-25 : v0.8.0 Marketplace SDK + White-Label + Billing
                  : MIDA/SAP, i18n ES/EN/PT, portal suscripciones
    2026-07-25 : v1.0.0 🏆 Commercial Release
                  : Billing SaaS completo, Marketplace, White-label
                  : RBAC 21/33 controllers, 349 tests, Helm charts K8s
    2026-07-26 : v1.1.0 Standalone Suite + Soft-Delete + Redis WS
                  : Redis IoAdapter, soft-delete tenants, App Store search
    2026-07-27 : v1.1.1-v1.1.3 WhatsApp Catalog + File Store
                  : Uploads por tenant, backups comprimidos
    2026-07-30 : v1.1.7 QA E2E Playwright Suite + Subdomain Fixes
    2026-07-31 : v1.1.8-v1.1.9 Homepage Builder + Navegación unificada
    2026-08-01 : v1.3.0-v1.5.0 Cotizaciones + FacturaSend + Enterprise Tenant
                  : ExchangeRate providers (BCP, Chaco, Bonanza)
                  : FacturaSend (SIFEN), fixes producción Traefik
    2026-08-02 : v1.5.1 Responsive Backoffice + Traefik v3.4
    2026-08-03 : v1.5.2-v1.9.0 UX/UI Mobile + Desktop + Testing + Pagopar
                  : Sticky Action Bar, Bottom Sheets, AdaptiveTable
                  : Cobertura tests backend, Pagopar Paraguay
    2026-08-06 : v1.12.0-v1.16.3 Facturación Odoo + Design Tokens
                  : FacturaSend completo, Odoo 19 CE adapter
                  : Design tokens CSS, dark mode contrast fix
    2026-08-09 : v1.17.0-v1.18.0 Follow-Up + Seller Attribution
                  : Cola BullMQ follow-up, sellerId/trafficSource
                  : 523/523 tests, E2E QA ampliada
    2026-08-10 : v1.19.0 ♻️ Rebranding Parcial OmniFlow
                  : Marca pública OmniFlow, capa técnica OrderFlow
                  : Hito histórico de identidad corporativa
    2026-08-15 : v1.20.0
                  : Infrastructure Deploy Manager
    2026-08-12 : v1.20.1
                  : Deploy-manager multi-sistema + Manuales Playwright
                  : Separación deploy OrderFlow vs Odoo desde /admin/deploy
    2026-08-13 : v1.20.2
                  : Mobile admin drawer navigation + Topbar compacto
    2026-08-13 : v1.20.3
                  : Orders debug: state machine, cancel reversals, confirm idempotent
                  : 578 tests, E2E QA clean
    2026-08-13 : v1.20.4
                  : Schema decoupling: Giveaways standalone + Social Catalog/Bio-Links
    2026-08-13 : v1.20.5
                  : Social Catalog Standalone Extraction
                  : MessagingChannel + CatalogChannelConfig extraídos a standalone
                  : Adapters desacoplados, proxy HTTP en core, 580 tests OK
    2026-08-28 : v1.20.6-v1.20.99
                  : Sprint Fixes Producción Provecchio: QR, Social-Catalog, CSP, Deploy 502
                  : Mejoras Social-Catalog: stockStatus, tags editables, ordenamiento
                  : OmniCatalog Jerárquico (FEAT-077) + Importación Masiva (FEAT-074)
                  : QR Generator Multi-Propósito (FEAT-075) + 580+ tests
    2026-08-30 : v1.20.6-v1.21.02
                  : Sincronización Odoo en tiempo real (FEAT-090/091/092)
                  : Cartera Clientes + Cuentas por Cobrar + Límite de Crédito (FEAT-091)
                  : Sincronización Asíncrona account.move (FEAT-092)
                  : Gestión Subdominios para SuperAdmin (v1.21.02)
                  : Paginación masiva 300+ productos (v1.21.01)
    2026-09-01 : v1.22.00
                  : OmniVector + OmniSites Standalone (FEAT-066)
                  : Manifiestos App Store, Traefik routes por tenant subdomain
    2026-09-02 : v1.24.02
                  : Redirección automática por subdominio post-login
                  : Miniaturas WebP en subdirectorio /thumbs/ + filtrado galería
                  : Tolerancia Sharp libvips failOn:none + escritura atómica
                  : OmniSites PRO feature gate + SSL Wildcard sites.pesallaccia.com
    2026-09-03 : v1.24.04
                  : FEAT-112 OmniGastro Safeguards (ProvisioningJob + TenantCreationGuard)
                  : FEAT-113 Sprint 1 — Commercial Public Wizard + EarlyAccessCode
                  : 52/52 unit tests nuevos (24 FEAT-112 + 28 FEAT-113)
                  : 3 planes comerciales (Starter $39, Pro $179, Ent $549) + EARLY30
                  : docs/planes/omnigastro/PLAN_OPERATIVO_Y_PROMPTS.md
    2026-09-04 : v1.25.0-alpha-omnigastro 📍 ROLLPLAY DEMO
                   : FEAT-125 demo alfa en Provecchio (orderflow.provecchio.com)
                   : Social Catalog como menú digital del restaurante
                   : Llamar al Mozo + Enviar pedido al mozo desde QR
                   : Mini-KDS simulado en /admin/kds (sin KDS físico)
                   : Gate omni-catalog.tsx por flag Tenant.config.gastro.enabled
                   : Seed demo-omnigastro (mesa MESA-01, 5 productos, mozo+cocinero)
    2026-09-07 : v1.27.00
                   : OmniMessaging Hub Web Extension (Manifest V3 zip bundles)
                   : Frontend & Backend version sync v1.27.00
                   : App Store integration para extension
    2026-09-07 : v1.27.09-v1.27.10
                   : FEAT-072 OmniMessaging Web Extension v2.5.0
                   : Aislamiento Shadow DOM Dual-Hos (topbar 48px + sidebar 380px)
                   : Extracción dinámica E.164 activo via MutationObserver
                   : CustomEvent inter-context bridge para ConfigModal
                   : Estado no-autenticado inicial (sin tenant hardcodeado)
                   : Chrome & Firefox bundles en frontend/public/downloads/
     2026-09-08 : v1.27.10
                   : Admin Token Management (/admin/tokens)
                   : API Key endpoints para admin token generation
                   : JWT display + session config duration
                   : Web Extension bundles (Chrome v2.5.0 + Firefox latest) deployed to Provecchio & Production
                   : Swagger version v1.27.10, ROADMAP + timeline actualizados
     2026-09-28 : v1.37.0
                   : Provecchio Failover Activo — Réplica PostgreSQL sincronizada
                   : Protocolo pre-deploy diagnóstico (`scripts/pre-deploy-diagnostic.sh`)
                   : Troubleshooting #163 — Fix integral replica (pg_hba, password, permissions, entrypoint)
                   : Plan Tailscale/NetBird para cerrar puerto 5432 públicamente

---

## 📊 Matriz de Avance por Componente

### Core & Multi-Tenant Engine

| Componente | Estado | Versión | Notas |
|------------|--------|---------|-------|
| Multi-tenant API Key + JWT Auth | ✅ Completo | v0.1.0 | Aislamiento por `tenantId` |
| Subdominios dinámicos Traefik/Cloudflare | ✅ Completo | v0.5.0 | DNS automático por tenant |
| Multi-Tier Isolation (Shared/Dedicated DB) | ✅ Completo | v0.7.0 | `@TenantPrisma()` + provisioning script |
| Row Level Security (RLS) Base | ✅ Completo | v1.16.1 | Scripts SQL listos para aplicar |
| Tenant Image Isolation | ✅ Completo | v1.16.1 | UploadsController por tenant |
| Soft-Delete Tenants | ✅ Completo | v1.1.0 | Retención 30 días + restore |

### Módulos de Negocio

| Componente | Estado | Versión | Notas |
|------------|--------|---------|-------|
| Catálogo WhatsApp / Social Catalog | ✅ Completo | v1.15.0 | Strategy Pattern multicanal |
| POS Web Offline-First | ✅ Completo | v0.4.0 | Dexie.js + Zustand sync queue |
| KDS (Cocina) en tiempo real | ✅ Completo | v0.4.0 | WebSocket rooms por tenant |
| Loyalty / Fidelización | ✅ Completo | v0.4.0 | Tiers BRONZE→PLATINUM |
| Tauri Desktop Wrapper | ✅ Completo | v0.4.2 | POS nativo + ESC/POS |
| Bio-Links | ✅ Completo | v0.5.0-alpha | Drag & Drop, Fast Checkout |
| Giveaways / Sorteos | ✅ Completo | v0.1.0 | Landing page, Google OAuth |
| Bookings & Agendas | ✅ Completo | v1.9.0 | WhatsApp + Google Calendar sync |
| Follow-Up Omnicanal | ✅ Completo | v1.18.0 | Cola BullMQ, cooldown, adapters |
| Seller Attribution Engine | ✅ Completo | v1.18.0 | sellerId, trafficSource |
| Facturación Electrónica (FacturaSend) | ✅ Completo | v1.4.0 | SIFEN, multi-moneda, IVA 5/10% |
| Cotizaciones Automáticas (PY) | ✅ Completo | v1.3.0 | BCP, Chaco, Bonanza, DólarApi |
| Pagopar (Pasarela PY) | ✅ Completo | v1.9.0 | Webhook, DTOs, módulo dedicado |
| Homepage Builder | ✅ Completo | v1.1.8 | Templates por rubro, bloques dinámicos |
| Mobile App Expo | 🔄 En progreso | v1.12.0 | Client-First + Terminal POS |
| Infrastructure Deploy Manager | 📋 Planificado | v1.10.0 | Multi-sistema desde Super Admin |

### Integraciones & DevOps

| Componente | Estado | Versión | Notas |
|------------|--------|---------|-------|
| Odoo Integration (webhooks + addon) | ✅ Completo | v0.8.0 | Push + pull, addon nativo Odoo 19 CE |
| Odoo 19 CE Adapter | ✅ Completo | v1.17.0 | JSON-RPC + XML-RPC, invoice sync |
| Tango ERP Integration | ✅ Completo | v0.8.0 | Sincronización bidireccional |
| MIDA / SAP Connectors | ✅ Completo | v0.8.0 | Pruebas de conectividad + webhooks |
| Stripe / Mercado Pago Billing | ✅ Completo | v0.8.0 | Webhooks, MRR/ARR, suspensión |
| Traefik v3.4 | ✅ Completo | v1.5.1 | SSL automático, DNS-01 Cloudflare |
| CI/CD GitHub Actions | ✅ Completo | v0.2.0 | Tests, build, deploy automático |
| k6 Load Tests en CI | ✅ Completo | v0.7.0 | Smoke tests continuos |
| Sentry + Prometheus + Grafana | ✅ Completo | v0.4.2 | Observabilidad completa |
| Backup Automatizado | ✅ Completo | v1.1.3 | DB + uploads, verificación integridad |
| Kubernetes Helm Charts | 📋 Estructura Lista | v1.0.0 | `k8s/helm/` preparado para v3.0.0 |

---

## 🛠️ Troubleshooting Histórico

### Despliegue & Infraestructura

| # | Síntoma | Causa raíz | Solución aplicada |
|---|---------|------------|-------------------|
| 1 | Traefik 502 en producción | Servicio no registrado / misma red Docker | Verificar registro en Traefik y conectividad de red |
| 2 | Migraciones inconsistentes en Producción | Baseline migration + duplicados en historial | Baseline migration + limpieza + check preventivo en deploy |
| 3 | DOCKER_API_VERSION too old | Cliente Docker desactualizado en CI/CD | Configurar `DOCKER_API_VERSION=1.55` y endpoint TCP |
| 4 | Login loop por Prisma P1000 | `POSTGRES_PASSWORD` con placeholder | Sincronizar `.env.prod` con credenciales reales |
| 5 | Frontend login no redirigía | Backend en restart loop | Fix de DB password + verificación health check |
| 6 | Nginx no proxyeaba `/api/*` | Configuración Nginx incompleta | Migración completa a Traefik v3.3/v3.4 |
| 7 | Manifiestos módulos no encontrados | `/app/src` ausente en Alpine multi-stage | Algoritmo candidate paths en `ModulesRegistry` |
| 8 | SSL no renovaba | Cloudflare API token sin permisos DNS | Token con permiso `Zone:Read` + `DNS:Edit` |
| 9 | Backup corrupto | Falta de verificación de integridad | Script `verify-backups.sh` + tamaño mínimo |
| 10 | Uploads rotos por tenant | Rutas hardcodeadas sin `tenantId` | UploadsController + paths `/uploads/{tenantId}/{module}/` |

### Multi-Tenant & DNS

| # | Síntoma | Causa raíz | Solución aplicada |
|---|---------|------------|-------------------|
| 11 | Subdominio no resuelve | DNS Cloudflare no propagado | Verificar registro CNAME + TTL |
| 12 | Tenant duplicado en DB | `tenantId` no unique constraint | Agregar índice unique + validación backend |
| 13 | API Key expirada sin aviso | Sin scheduler de rotación | Rotación automática 90 días + auditoría |
| 14 | Sesiones compartidas entre tenants | Redis sin namespace por tenant | Prefijo `sessions:{tenantId}:` en Redis |

### Testing & QA

| # | Síntoma | Causa raíz | Solución aplicada |
|---|---------|------------|-------------------|
| 15 | Tests fallan en CI pero pasan local | Diferente versión Node/OS | Matrix CI con Node 20/22 + Ubuntu |
| 16 | E2E flaky tests | Timing issues en WebSockets | WaitForState + timeouts configurables |
| 17 | Build frontend con chunks corruptos | Cache Vite stale | `vite build --force` + limpia cache |
| 18 | 404 en `/admin/orders` | Routing desactualizado post-refactor | Actualizar `AdminApp.tsx` rutas |

---

## 📈 Métricas de Evolución

| Período | Versiones | Tests | Módulos | Infra |
|---------|-----------|-------|---------|-------|
| Jun 2026 | v0.1.0 → v0.2.0 | 4 → 7 | 3 → 5 | Docker básico |
| Jul 2026 (inicio) | v0.3.0 → v0.5.0 | 7 → 298 | 5 → 12 | Nginx → Traefik v3.3 |
| Jul 2026 (mitad) | v0.5.1 → v1.1.0 | 298 → 349 | 12 → 18 | Traefik v3.3, Cloudflare DNS |
| Jul-Ago 2026 | v1.1.1 → v1.5.2 | 349 → 498 | 18 → 22 | Traefik v3.4, backups |
| Ago 2026 | v1.6.0 → v1.20.18 | 498 → 523+ | 22 → 28 | Deploy Manager, Social Catalog v5 UX |
| Ago 2026 | v1.20.19 → v1.20.24 | 523+ → 597+ | 28 → 28 | Inventory Standardization, Variants, Batch Import, Sync ERP |

---

## 🎯 Hitos Clave

| Hito | Fecha | Versión | Impacto |
|------|-------|---------|---------|
| MVP funcional | 2026-06-15 | v0.1.0 | Base técnica NestJS + Prisma |
| Staging productivo | 2026-07-06 | v0.3.0 | Primer deploy real Hetzner |
| POS + KDS + Loyalty | 2026-07-14 | v0.4.0 | Módulos core operativos |
| Traefik v3.3 + DNS automático | 2026-07-18 | v0.5.0 | Infraestructura moderna |
| **Commercial Release** | **2026-07-25** | **v1.0.0** | 🏆 Plataforma SaaS lista para clientes |
| Multi-Tier + Standalone | 2026-07-25 | v0.7.0 | Aislamiento enterprise + microservicios |
| FacturaSend (SIFEN) | 2026-08-01 | v1.4.0 | Facturación electrónica PY |
| **Rebranding OmniFlow** | **2026-08-10** | **v1.19.0** | ♻️ Hito histórico de identidad corporativa |
| **Deploy Manager** | 2026-08-15 | v1.20.0 | OmniFlow como plataforma de infraestructura |
| **Social Catalog v5 UX/UI** | 2026-08-24 | v1.20.18 | 📱 SC-01..SC-05: theme dark, toolbar móvil 2 filas, stock badges "¡Última unidad!", ribbon/tags, orden admin unificado |
| **Product Variants + Batch Import** | 2026-08-25 | v1.20.22 | 🚀 Variantes Odoo-style, importación masiva Excel, kebab-case refactor |
| **Inventory Standardization + Sync ERP** | 2026-08-25 | v1.20.24 | 🏭 Reservas de stock en OrdersService, sync-products migrado a InventoryService |
| **OmniCatalog Jerárquico (FEAT-077)** | 2026-08-26 | v1.20.27 | 🌳 Acordeón 3 niveles + sync Odoo pos.category + product.category |
| **QR Generator Multi-Propósito (FEAT-075)** | 2026-08-26 | v1.20.30 | Servicio standalone REST + componente embeddable |
| **Sincronización Odoo en tiempo real (FEAT-090/091/092)** | 2026-08-30 | v1.21.00 | Webhooks product.template/category/res.partner, credit status, account.move |
| **Gestión Subdominios SuperAdmin (v1.21.02)** | 2026-09-01 | v1.21.02 | UI grilla + Cloudflare DNS auto en alta |
| **OmniVector + OmniSites Standalone (v1.22.00)** | 2026-09-01 | v1.22.00 | 🎨 Editores gráficos vectorial + web drag-and-drop con IA Gemini |
| **FEAT-112 OmniGastro Safeguards + FEAT-113 Commercial Wizard (v1.24.04)** | **2026-09-03** | **v1.24.04** | 🛡️ ProvisioningJob + TenantCreationGuard + 3 planes comerciales + EARLY30 |
| **FEAT-125 demo alfa OmniGastro (rollplay Provecchio)** | **2026-09-04** 📍 | **v1.25.0-alpha-omnigastro** | 🍽️ Social Catalog como menú del restaurante, Llamar al Mozo, Enviar pedido, mini-KDS simulado |
| **Landed Costs Dashboard** | 2026-09-13 | **v1.34.0** | 💰 Dashboard completo + backend API + despliegue a producción y Provecchio |
| **Gastro/KDS UX Improvements** | 2026-09-14 | **v1.34.0** | 🍽️ Filtros KDS, búsqueda, tokens de tema en Gastro (regla 9) |

---

## 📚 Documentos Relacionados

- [CHANGELOG.md](../CHANGELOG.md)
- [ROADMAP.md](../ROADMAP.md)
- [ROADMAP_MICROSERVICES.md](./ROADMAP_MICROSERVICES.md)
- [featurelist.json](../featurelist.json)
- [Análisis Estado del Arte](./estado_del_arte_analisis.md)
- [Wiki Oficial](https://wiki.marcelompz.github.io/orderflow/)
