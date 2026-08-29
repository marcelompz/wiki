# 🗺️ ROADMAP DE ORDERFLOW - v1.20.10 → v2.0.0
**Última Actualización:** 2026-08-29 (Release v1.20.71 — Unificación de Gestión de Categorías & Sentence Case Microcopy UI/UX)

**Versión Actual:** **`v1.20.71`** 🔄 **PRODUCTION READY** | Marca pública: OmniFlow. Capa técnica interna: OrderFlow.
**Próximo Release:** **v1.21.0 (En progreso — Marketplace de Plugins & Facturación Stripe/Mercado Pago)**
**Estado:** ✅ **STAGING & PRODUCTION OPERATIVE** | 🏆 **COMMERCIAL RELEASE v1.20.71 STABLE** | QA E2E Suite Integrada | 670+ tests unitarios pasados


**Visión Estratégica:** Plataforma SaaS omnicanal de alta velocidad con aislamiento multi-tier, marketplace de plugins de terceros, facturación automática Stripe/Mercado Pago y escalado horizontal a Kubernetes.

> 📦 **Estrategia de Microservicios Standalone:** Ver el roadmap dedicado de la suite de productos independientes en [docs/guides/ROADMAP_MICROSERVICES.md](docs/guides/ROADMAP_MICROSERVICES.md).

---

## 📊 ESTADO ACTUAL - MÓDULOS PRODUCTION READY

| Módulo | Estado | Producción | Staging | Notas |
|--------|--------|------------|---------|-------|
| **Multi-Tenant Core & Multi-Tier** | ✅ Completo | ✅ Sí | ✅ Sí | Auth JWT + API Key, DB dedicada por tenant enterprise, `@TenantPrisma()` |
| **Inventario Landed Costs (Paso 8)** | ✅ Completo | ✅ Sí | ✅ Sí | Prorrateo de costes de destino en OC con recálculo atómico PMP `costPricePmp` (v1.20.41) |
| **Wizard Onboarding Odoo 1-Click** | ✅ Completo | ✅ Sí | ✅ Sí | `<OdooOnboardingWizardModal>` en SuperAdmin Dashboard `/admin/deploy` (v1.20.41) |
| **Motor LLM Local (OmniAI)** | ✅ Completo | ✅ Sí | ✅ Sí | Inferencia IA local (Ollama / vLLM llama3) vía Traefik SSL `ai.provecchio.com` (FEAT-105) |
| **Zero-Touch Odoo Onboarding** | ✅ Completo | ✅ Sí | ✅ Sí | Onboarding en 1-Click mediante manifiesto JSON `tenant_manifest.json` (FEAT-106) |
| **OmniFlow DataView Suite** | ✅ Completo | ✅ Sí | ✅ Sí | DynamicQueryBuilder, selección global `mode: all`, presets `SavedViews` y UI DataView Kit (v1.20.39) |
| **Documents Workspace & Collabora** | ✅ Completo | ✅ Sí | ✅ Sí | Explorador multi-tenant, WOPI session, visor/editor interactivo Collabora y locking Redis (FEAT-083 & FEAT-082) |
| **Compras & Finanzas Multi-Moneda** | ✅ Completo | ✅ Sí | ✅ Sí | Órdenes de Compra (OC), impacto atómico Kardex, Facturas Proveedor (AP) y Flujo de Caja (FEAT-104) |
| **Dynamic Multi-Currency Engine** | ✅ Completo | ✅ Sí | ✅ Sí | Cotización bursátil en tiempo real (PYG, USD, BRL, ARS) BCP/Cambios Chaco/DolarApi y caché LRU (FEAT-103) |
| **OmniBI Analytics Standalone** | ✅ Completo | ✅ Sí | ✅ Sí | Ingesta histórica Odoo 14 XML-RPC, comparativo YoY y microservicio `:3027` (FEAT-100) |
| **Storefront Builder Standalone** | ✅ Completo | ✅ Sí | ✅ Sí | Diseñador visual Drag & Drop desacoplado `:3026` (FEAT-099) |
| **Fuerza de Ventas B2B** | ✅ Completo | ✅ Sí | ✅ Sí | Presupuestos B2B, listas de precios mayoristas Odoo y descuentos por volumen (FEAT-098) |
| **OmniPOS & KDS Multi-Estación** | ✅ Completo | ✅ Sí | ✅ Sí | Cobro rápido, semáforo SLA comanda y explosión atómica de recetas BoM (FEAT-097) |
| **OmniManufacturing MRP Engine** | ✅ Completo | ✅ Sí | ✅ Sí | Órdenes de Fabricación, insumos, mermas scrap y conversión UoM ($g \leftrightarrow kg$) (FEAT-096) |
| **WhatsApp Catalog & Standalone** | ✅ Completo | ✅ Sí | ✅ Sí | Catálogo, carrito, checkout y standalone microservice `:3021` |
| **Social Commerce Hub** | ✅ Completo | ✅ Sí | ✅ Sí | Soporta WhatsApp, Telegram, Instagram, Messenger y Custom Webhook |
| **Bio-Links & Standalone** | ✅ Completo | ✅ Sí | ✅ Sí | API + Redis + Admin Drag&Drop + Public SPA, standalone microservice `:3022` |
| **Super Admin** | ✅ Completo | ✅ Sí | ✅ Sí | Usuarios, tenants, roles, disable/enable/delete tenant, DB tier toggle |
| **Bookings (Spa) & Standalone** | ✅ Completo | ✅ Sí | ✅ Sí | Turnos, comisiones, atomicidad y standalone microservice `:3023` |
| **Quotations & Standalone** | ✅ Completo | ✅ Sí | ✅ Sí | Presupuestos, integración DNIT y standalone microservice `:3024` |
| **Loyalty & Standalone** | ✅ Completo | ✅ Sí | ✅ Sí | Tarjetas, reglas, redención, tiers BRONZE→PLATINUM y standalone microservice `:3025` |
| **Giveaway & Standalone** | ✅ Completo | ✅ Sí | ✅ Sí | Sorteos virales y standalone microservice `:3020` |
| **Cloudflare / DNS & Traefik** | ✅ Completo | ✅ Sí | ✅ Sí | Subdominios automáticos + Traefik v3.4 routing por microservicio |
| **Integrations (Odoo)** | ✅ Completo | ✅ Sí | ✅ Sí | OrderFlow ↔ Odoo: webhooks push + wizard pull + addons nativos Odoo 14, 18 y 19 CE |
| **Alta Disponibilidad / Réplica Standby** | 🔄 En progreso | 🔄 Parcial | 🔄 Parcial | Réplica read-only en Provecchio con failover documentado (FEAT-011) |
| **App Móvil Client-First & POS Native** | 🔄 En progreso | 🔄 Parcial | 🔄 Parcial | `@orderflow/mobile` Expo, catálogo, carrito, POS offline-first (FEAT-012) |


### 🏭 Estandarización de Inventario (v1.20.38)

| Paso | Objetivo | Estado |
|------|----------|--------|
| **Paso 1** | Auditoría de lectores/escritores de `stockAvailable` | ✅ Completado |
| **Paso 2** | Extender `executeStockMove()` para mantener cache `Product.stockAvailable` | ✅ Completado |
| **Paso 3** | Migrar `orders.service.ts` a motor de doble entrada | ✅ Completado (detrás de Feature Flag `USE_DOUBLE_ENTRY_STOCK`) |
| **Paso 4** | Migrar escritores restantes (products, sync, variants, batch import, admin) | ✅ Completado |
| **Paso 5** | Limpiar lecturas y documentar `stockAvailable` como cache | ✅ Completado |
| **Paso 6** | Reservas de stock (`stockReserved`) | ✅ Completado (`reserveStock` / `releaseStockReservation`) |
| **Paso 8** | Landed cost + impuestos (PurchaseReceipt, CostAdjustment, unitCost en StockQuant) | ⏳ Pendiente |

> 📄 Plan detallado: `docs/planes/inventario/plan-estandarizacion-inventario-omniflow.md`

#### ⚠️ Estrategia Segura — Paso 3 (Migración de `orders.service.ts`)

**NO se implementará en el mismo release que Pasos 1-2.**

Motivo: `orders.service.ts` es el flujo de ventas productivo. Cualquier cambio aquí debe:
1. Desarrollarse en una rama feature separada.
2. Testearse exhaustivamente en staging con datos reales.
3. Implementarse detrás de un feature flag (`USE_DOUBLE_ENTRY_STOCK`) para permitir rollback instantáneo.
4. Solo entonces mergearse a `main` y etiquetarse como release `v1.21.0`.

Mientras tanto, `Product.stockAvailable` se mantiene sincronizado como cache por `executeStockMove()` (Paso 2).


---

### 🚀 Release v1.20.9 - Mobile Alignment & OmniFlow Rebranding (FEAT-012)

| Feature | Estado |
|---------|--------|
| **Mobile Branding:** `app.json` y `package.json` alineados a **OmniFlow**, versión `1.20.9`. | ✅ Completo |
| **API Base Path:** cliente móvil centralizado bajo `/api/v1` en `src/services/api.ts`. | ✅ Completo |
| **POS Offline-First:** `POSScreen` mantiene modo offline, cola de pedidos y multi-sesión. | ✅ Completo |

---

### 🚀 Release v1.20.8 - Schema Decoupling Completado + Rebranding OmniFlow (FEAT-065 + FEAT-066)

| Feature | Estado |
|---------|--------|
| **Schema Decoupling (Fase 3 - Bio-Links):** Schema standalone propio en `services/biolinks-standalone/prisma/schema.prisma` (`BioLink`, `BioLinkClick`). Cliente Prisma aislado generado. Refactor a `PrismaService` + `CoreHttpService` propio. | ✅ Completo |
| **Rebranding OmniFlow (FEAT-066):** Estandarización de nombres comerciales: OmniBio (`biolinks-standalone`), OmniCatalog (`social-catalog-standalone`), OmniBookings (`bookings-standalone`). Retrocompatibilidad total en rutas legacy. | ✅ Completo |
| **Validación:** `init.sh` OK | 74 suites / 580 tests passed | Backend + Frontend builds limpios | E2E QA: 0 JS errors, 0 HTTP 502/404 |

---

### 🚀 Próximo Release: v1.20.10 (Planning) — Deploy Manager Odoo

| Feature | Estado |
|---------|--------|
| **Deploy Manager Odoo:** despliegue y ciclo de vida multi-sistema desde Super Admin (FEAT-060/actualización). | 🔄 En progreso |

| Feature | Estado |
|---------|--------|
| Tema oscuro + toggle + persistencia | ✅ Completo |
| Sidebar agrupada por dominios | ✅ Completo |
| Topbar mejorada | ✅ Completo |
| Dashboard KPIs + sparklines + empty states | ✅ Completo |
| Catálogo Social: preview por canal | ✅ Completo |

---

### 🚀 Release v1.16.1 - Dark Mode Contrast Fix + Tenant Image Isolation + RLS Base + Provecchio Deploy Fix

| Feature | Estado |
|---------|--------|
| **Dark Mode Contrast Fix** — CSS variables tokens (`light/dark`) reemplazan fondos hardcodeados en panel admin (`admin-mobile.css`, `dashboard.tsx`, 12+ archivos) | ✅ Completo |
| **Tenant Image Isolation** — Eliminado `serve-static` global; nuevo `UploadsController` con endpoints por tenant (`/api/v1/uploads/{type}/{tenantId}/{filename}`, público y admin) | ✅ Completo |
| **RLS (Row Level Security) Base** — `tenant-rls.interceptor.ts` + SQL scripts (`backend/prisma/rls/*.sql`) listos para aplicar en DB | ✅ Completo |
| **Provecchio Deploy Fix** — Resuelto historial de migraciones inconsistente (baseline migration + limpieza duplicados + check preventivo en `deploy-production.sh`) | ✅ Completo |
| **Troubleshooting #30** — Documentado: "Provecchio Migration History Inconsistency" | ✅ Completo |
| **E2E QA** — Playwright validado en ambos entornos (pesallaccia.com + provecchio.com): 0 JS errors, 0 HTTP 502/404 | ✅ Completo |

---

### 🚀 Release v1.15.0 - Social Commerce Omnichannel Hub

| Feature | Estado |
|---------|--------|
| Refactorización WhatsApp Catalog → Social Catalog | ✅ Completo |
| Modelo Prisma `CatalogChannelConfig` + enum `MessagingChannel` | ✅ Completo |
| Strategy Pattern `IMessagingAdapter` (WhatsApp, Telegram, Instagram, Messenger, Custom Webhook) | ✅ Completo |
| Migración de datos `whatsappNumber` → `CatalogChannelConfig` | ✅ Completo |
| Frontend: `ChannelSelector`, `messaging-deep-links.ts` | ✅ Completo |
| Aliases de rutas legacy (`/whatsapp-catalog` → `/social-catalog`) | ✅ Completo |
| Webhooks Stripe/MercadoPago migrados a `/social-catalog` | ✅ Completo |

---

## 🎯 OBJETIVOS CUMPLIDOS (v0.3.0)

### ✅ Objetivo 1: Plataforma Multi-Tenant SaaS
- [x] Tenant isolation con API key + JWT
- [x] Branding personalizado por tenant
- [x] Multi-environment (staging/production)
- [x] Tenant Switcher UI
- [x] Roles y permisos (ADMIN, MANAGER, SELLER, VIEWER)

### ✅ Objetivo 2: Módulo de Sorteos
- [x] CRUD completo de sorteos
- [x] Registro de participantes
- [x] Sorteo aleatorio (tómbola)
- [x] Landing page personalizada
- [x] Background (video/foto/color)
- [x] UTM tracking
- [x] Integración Odoo
- [x] Editar sorteos activos
- [x] **Google OAuth** para autocompletado

### ✅ Objetivo 3: E-commerce WhatsApp
- [x] Catálogo de productos
- [x] Carrito de compras
- [x] Checkout simple
- [x] Integración Odoo
- [x] Modo **Free**: pre-venta manual por WhatsApp; el pedido queda como `DRAFT` y la atención la maneja un vendedor por el número configurado del tenant.
- [x] Modo **Premium**: OrderFlow ejecuta toda la gestión del pedido, incluyendo cobro con pasarela de pagos y transición automática hacia estados operativos.

### ✅ Objetivo 4: Super Admin Dashboard
- [x] Dashboard general
- [x] Gestión de usuarios
- [x] Gestión de tenants y roles
- [x] Health check de servicios

### ✅ Objetivo 5: Integración ERP base (Odoo)
- [x] OrderFlow → Odoo: webhook de pedido confirmado, contacto upsert, bookings y cancelaciones
- [x] Odoo → OrderFlow: addon nativo `odoo-addons/orderflow_integration` para sincronizar clientes, productos y ventas
- [x] Diseño extensible por eventos/plugins para sumar flujos sin hardcodear
- [x] Base para próximos integradores: MIDA / SAP

### ✅ Objetivo 6: Deploy & Infraestructura
- [x] **Staging environment** en Hetzner VPS
- [x] **Production environment** en Hetzner VPS
- [x] **Traefik v3.4 exclusivo** + Let's Encrypt wildcard + HTTPS redirect permanente
- [x] **Cloudflare DNS** automático por tenant (`CloudflareDnsService`) + dominio configurable (`ROOT_DOMAIN`)
- [x] **CI/CD** con GitHub Actions
- [x] **Docker** containers health-check
- [x] **Database migrations** con Prisma
- [x] **Google OAuth** configurado (scopes básicos)

### ✅ Objetivo 7: POS / KDS / Tauri (v0.4.0)
- [x] POS Web offline-first con Dexie.js (IndexedDB) + Zustand sync queue
- [x] KDS en tiempo real con WebSockets (`OrdersGateway`, rooms `tenant:<id>`)
- [x] Semáforo de criticidad por tiempo en KDS (🟩 0-10min / 🟨 10-20min / 🟥 20+min)
- [x] Endpoint `PATCH /api/v1/orders/:id/status` para control de cocina
- [x] Tauri Desktop Wrapper para POS nativo con impresión ESC/POS y shortcuts Rust

### ✅ Objetivo 8: Loyalty / Fidelización (v0.4.0)
- [x] Motor de puntos backend + auto-generación de tarjetas con código de barras
- [x] Sistema de tiers: BRONZE → SILVER (500pts) → GOLD (2000pts) → PLATINUM (5000pts)
- [x] Admin UI para reglas y canje de puntos
- [x] Integración asíncrona con checkout POS (no bloquea cierre de venta)

### ✅ Objetivo 9: Observabilidad & Subdominios (v0.4.2)
- [x] Sentry backend (filtro global 5xx, sanitización de API keys) + frontend
- [x] Prometheus `/metrics` endpoint con `prom-client`
- [x] Subdominios públicos por tenant (`<slug>.pesallaccia.com`) con DNS automático
- [x] White-label parcial en páginas públicas (removido branding OrderFlow)

### ✅ Objetivo 10: Testing & Producción (v0.4.3)
- [x] Expansión de cobertura: 298 tests passing, 39 test suites
- [x] Tests unitarios en controllers: orders, products, users, bookings, integrations, giveaways, contacts, loyalty, quotations, whatsapp-catalog, backups, health, metrics, public-products, public-storefront, sync-products, public-orders, notifications
- [x] Dominio configurable backend/frontend (`ROOT_DOMAIN`, `VITE_ROOT_DOMAIN`, `VITE_SYSTEM_SUBDOMAINS`)
- [x] Landing page generalizada sin referencias hardcodeadas

---

## 🚀 PRÓXIMOS OBJETIVOS (v0.6.0 - v2.0.0)

### 📐 Visión Arquitectónica

OrderFlow evoluciona en tres ejes estratégicos:

1. **Multi-Tier Tenant Isolation** — DB compartida (SMB) + DB dedicada (Enterprise) coexistiendo en el mismo backend.
2. **Módulos como Microservicios Standalone** — Vender Giveaways, WhatsApp Catalog, Bio-Links, etc. fuera del ecosistema OrderFlow.
3. **Escalado de Infraestructura** — Docker Compose (actual) → Kubernetes (postergado a v3.0.0).

```
┌─────────────────────────────────────────────────────────────────┐
│  v0.6.0          v0.7.0          v1.0.0         v3.0.0         │
│  ┌──────┐       ┌──────┐       ┌──────┐       ┌──────┐        │
│  │Test  │       │Multi │       │Billing│       │  K8s │        │
│  │80%   │──────▶│Tier  │──────▶│+ SaaS │──────▶│  +   │        │
│  │+RBAC │       │+Micro│       │Portal │       │Scale │        │
│  │+Obs  │       │srvcs │       │+Mktpl │       │      │        │
│  └──────┘       └──────┘       └──────┘       └──────┘        │
│  Sep 2026       Nov 2026       Ene 2027       2028+           │
└─────────────────────────────────────────────────────────────────┘
```

---

### 🔴 v0.6.0 — Calidad, Seguridad & Observabilidad (Target: Septiembre 2026)

| Feature | Estado | Prioridad | Sprint |
|---------|--------|-----------|--------|
| **Testing avanzado (80% cobertura)** | ⚠️ En progreso (389 tests) | 🔴 Alta | Sprint 5-6 |
| **Playwright E2E suite** | ✅ Hecho (14 tests) | 🔴 Alta | Sprint 5 |
| **k6 smoke / carga continua en CI** | ✅ Hecho | 🔴 Alta | Sprint 5-6 |
| **Code Splitting & Performance UX** | ✅ Hecho | 🔴 Alta | Sprint 5 |
| **Servidor Redis 7 (PubSub + Cache)**| ✅ Hecho | 🔴 Alta | Sprint 5 |
| **Índices DB de Alto Rendimiento** | ✅ Hecho | 🔴 Alta | Sprint 5 |
| **RBAC granular (controllers core)** | ✅ Completado | 🔴 Alta | Sprint 5 | Aplicado en 21/33 controllers (billing, biolinks, bookings, contacts, customers, giveaways, integrations, loyalty, marketplace, orders, product-imports, products, quotations, system-modules, users, notifications, backups, analytics, whatsapp-catalog-admin/superadmin) |
| **Rate limit por tenant** | ✅ Hecho | 🔴 Alta | Sprint 5 |
| **API Keys: rotación automática + auditoría** | ⚠️ En progreso | 🔴 Alta | Sprint 5 | Rotación/revocación manual + scheduler automático 90 días + sync Odoo |
| **Auditoría completa (AuditLog)** | ⚠️ En progreso | 🔴 Alta | Sprint 5 |
| **Secretos gestionados (.gitignore)** | ✅ Hecho | 🔴 Alta | Sprint 5 |
| **Alertmanager + dashboards por tenant** | ⏳ Pendiente | 🔴 Alta | Sprint 6 |
| **Backup verificado + DRP documentado** | ✅ Hecho | 🔴 Alta | Sprint 5 |
| **Grafana + Loki + Tempo** | ✅ Hecho | 🔴 Alta | Sprint 5 |
| **Fix App Store / Marketplace** | ✅ Hecho | 🔴 Alta | Sprint 5 | RBAC, DTOs, audit logging, auto-install de deps, frontend fixes |

---

### 🟠 v0.7.0 — Multi-Tier Isolation + Microservicios Standalone (Target: Noviembre 2026)

#### Multi-Tier Tenant Isolation

Permite que los tenants enterprise tengan su propia base de datos dedicada mientras los SMB comparten la DB principal.

| Feature | Estado | Prioridad |
|---------|--------|----------|
| **Schema: `isolationTier`, `dedicatedDatabaseUrl` en Tenant** | ✅ Hecho | 🔴 Alta |
| **`TenantConnectionManager`** — resuelve PrismaClient por tier | ✅ Hecho | 🔴 Alta |
| **`@TenantPrisma()` decorator** — inyección en controllers | ✅ Hecho | 🔴 Alta |
| **ApiKeyGuard + TenantByHostMiddleware** — inyectar `req.tenantPrisma` | ✅ Hecho | 🔴 Alta |
| **Script provisioning DB dedicada** (`scripts/provision-dedicated-db.sh`) | ✅ Hecho | 🟡 Media |
| **UI Admin: Tag & Endpoint para promover tenant a `dedicated`** | ✅ Hecho | 🟡 Media |
| **Migración gradual de services** (`this.prisma` → `req.tenantPrisma`) | ⚠️ En progreso | 🟡 Media |
| **Asignación de tier por SuperAdmin** (`PATCH /tenants/:id/isolation-tier`) | ✅ Hecho | 🔴 Alta |

> **Estrategia:** Fase 1 es zero breaking changes. Todos los tenants existentes quedan en `isolationTier: "shared"`. Solo los marcados como `"dedicated"` usan DB propia.

#### Microservicios Standalone

Permite vender módulos individuales (Giveaways, WhatsApp Catalog, Bio-Links, etc.) como productos independientes fuera del ecosistema OrderFlow.

| Feature | Estado | Prioridad |
|---------|--------|----------|
| **`packages/auth-shared`** — librería JWT/API Key compartida | ✅ Hecho | 🔴 Alta |
| **`services/giveaways-standalone/`** — primer microservicio | ✅ Hecho | 🔴 Alta |
| **`services/whatsapp-catalog-standalone/`** — segundo microservicio | ✅ Hecho | 🔴 Alta |
| **Router Traefik por microservicio** | ✅ Hecho | 🟡 Media |
| **Docker Compose standalone** (`services/giveaways-standalone`, `services/whatsapp-catalog-standalone`, etc.) | ✅ Hecho | 🟡 Media |
| **Bio-Links standalone** (`services/biolinks-standalone/`) | ✅ Hecho | 🟡 Media |

> **Acoplamiento verificado (Jul 2026):** Giveaways (0 deps cross-module ✅), WhatsApp Catalog (0 deps ✅), Bio-Links (depende de OrdersModule 🟡), Bookings (0 deps ✅), Quotations (0 deps ✅).

> **Modelo híbrido:** Dentro de OrderFlow los módulos se gestionan con feature flags (ModuleInstallation por tenant). Fuera de OrderFlow, cada microservicio standalone tiene su propio deploy, DB y auth compartida vía `auth-shared`.

---

### 🏆 v1.0.0 — Commercial Release: Billing SaaS + Marketplace (✅ RELEASED — 2026-07-25)

| Feature | Estado | Prioridad |
|---------|--------|----------|
| **Stripe / Mercado Pago Billing Engine** (`BillingModule` + webhooks) | ✅ Hecho | 🔴 Alta |
| **Facturación automática + suspensión** (`TenantThrottlerGuard`) | ✅ Hecho | 🔴 Alta |
| **Portal de cliente (upgrade/downgrade)** (`subscription.tsx`) | ✅ Hecho | 🔴 Alta |
| **Planes SaaS** (Free, Starter, Pro, Enterprise) | ✅ Hecho | 🔴 Alta |
| **Métricas MRR/ARR** (`GET /api/v1/billing/metrics/mrr`) | ✅ Hecho | 🔴 Alta |
| **Self-service: selección de tier `shared`/`dedicated`** (`subscription.tsx`) | ✅ Hecho | 🟡 Media |
| **Marketplace / Plugin SDK** (`MarketplaceModule` + SDK endpoints) | ✅ Hecho | 🟡 Media |
| **Plugin registry + instalación desde marketplace** (`GET/POST /api/v1/marketplace/*`) | ✅ Hecho | 🟡 Media |
| **White-label completo** (Dominio custom, favicon, `document.title`, `removeOrderflowBranding`) | ✅ Hecho | 🟡 Media |
| **Multi-language (i18n)** (`react-i18next` + ES / EN / PT) | ✅ Hecho | 🟡 Media |
| **MIDA / SAP integradores** (`IntegrationsService` MIDA/SAP connectors) | ✅ Hecho | 🟡 Media |
| **App Store / Google Play** publicación | ❌ Pendiente | 🟢 Baja |
| **Analytics Dashboard avanzado** (`AnalyticsModule` + visualizaciones) | ✅ Hecho | 🟢 Baja |

---

### 🚀 v0.8.0 — Marketplace SDK, White-Label & Billing SaaS (✅ RELEASED — 2026-07-25)

| Feature | Estado | Prioridad |
|---------|--------|----------|
| **Stripe / Mercado Pago Billing Engine** (`BillingModule` + webhooks) | ✅ Hecho | 🔴 Alta |
| **Facturación automática + suspensión** (`TenantThrottlerGuard`) | ✅ Hecho | 🔴 Alta |
| **Portal de cliente (upgrade/downgrade)** (`subscription.tsx`) | ✅ Hecho | 🔴 Alta |
| **Planes SaaS** (Free, Starter, Pro, Enterprise) | ✅ Hecho | 🔴 Alta |
| **Métricas MRR/ARR** (`GET /api/v1/billing/metrics/mrr`) | ✅ Hecho | 🔴 Alta |
| **Self-service: selección de tier `shared`/`dedicated`** (`subscription.tsx`) | ✅ Hecho | 🟡 Media |
| **Marketplace / Plugin SDK** (`MarketplaceModule` + SDK endpoints) | ✅ Hecho | 🟡 Media |
| **Plugin registry + instalación desde marketplace** (`GET/POST /api/v1/marketplace/*`) | ✅ Hecho | 🟡 Media |
| **White-label completo** (Dominio custom, favicon, `document.title`, `removeOrderflowBranding`) | ✅ Hecho | 🟡 Media |

---

### 🟢 v1.5.0 — OrderFlow Enterprise Tenant + Frontend/Routing Fixes (COMPLETADO)

| Feature | Estado | Prioridad | Sprint |
|---------|--------|-----------|--------|
| **Fix Dockerfile.prod ARGs** (`VITE_ROOT_DOMAIN`, `VITE_SYSTEM_SUBDOMAINS`) | ✅ Hecho | 🔴 Alta | Sprint 1 |
| **Fix docker-compose.prod.yml build args** | ✅ Hecho | 🔴 Alta | Sprint 1 |
| **Fix App.tsx ROOT_DOMAIN fallback** (multi-domain support) | ✅ Hecho | 🔴 Alta | Sprint 1 |
| **Fix `/api/v1/sync/customers` 404** (frontend calls updated) | ✅ Hecho | 🔴 Alta | Sprint 1 |
| **Fix Traefik routing** (pesallaccia.com stays on Hetzner, not provecchio) | ✅ Hecho | 🔴 Alta | Sprint 1 |
| **Dedicated DB provisioning script/plan** for OrderFlow company tenant | ✅ Hecho | 🔴 Alta | Sprint 1 |
| **`ORDERFLOW_COMPANY_DB_URL` env var** added to `.env.prod` and `.env.production` | ✅ Hecho | 🔴 Alta | Sprint 1 |
| **Multi-tier isolation validation** via `./scripts/init.sh` | ✅ Hecho | 🔴 Alta | Final |
| **E2E QA** (Playwright: zero JS errors, zero HTTP 502/404) | ✅ Hecho | 🔴 Alta | Final |

### 🎨 v1.6.0 — UX/UI Mobile-First & Ergonomía Intuitiva (EN PROCESO)

| Feature | Estado | Prioridad | Sprint |
|---------|--------|-----------|--------|
| **Plan de Arquitectura UX/UI Mobile-First** (`docs/PLAN_UX_UI_MOBILE_FIRST.md`) | ✅ Hecho | 🔴 Alta | Sprint 1 |
| **Sticky Action Bar & Bottom Sheets en Catálogo/Checkout** | 🚧 En proceso | 🔴 Alta | Sprint 1 |
| **One-Page Checkout Express (Geolocalización + Autocompletado)** | ⏳ Pendiente | 🔴 Alta | Sprint 1 |
| **Navegación Móvil Adaptativa Backoffice (`Bottom Navigation Bar`)** | ⏳ Pendiente | 🔴 Alta | Sprint 2 |
| **Transformación Responsive de Tablas Admin a Tarjetas (`Responsive Cards`)** | ⏳ Pendiente | 🔴 Alta | Sprint 2 |
| **SuperAdmin Tenant Switcher Flotante Táctil** | ⏳ Pendiente | 🟡 Media | Sprint 2 |


### 💻 v1.7.0 — Refinamiento UX/UI Escritorio (Desktop-First Admin) (PLANIFICADO)

| Feature | Estado | Prioridad | Sprint |
|---------|--------|-----------|--------|
| **Plan de Refinamiento UX/UI Escritorio** (`docs/PLAN_DESKTOP_UX_REFINEMENT.md`) | ✅ Hecho | 🔴 Alta | Sprint 3 |
| **Crear `admin-desktop.css` para Media Queries >1200px** | ✅ Hecho | 🔴 Alta | Sprint 3 |
| **Componentes Adaptativos (Tabla vs. Tarjetas)** | ✅ Hecho | 🔴 Alta | Sprint 3 |
| **Refactorización de Dashboard a Multi-Columna** | 🚧 En proceso | 🟡 Media | Sprint 4 |
| **Refactorización de Tablas (Productos, Clientes)** | ✅ Hecho | 🟡 Media | Sprint 4 |

---

### 🧪 v1.8.0 — Deuda Técnica: Aumento de Cobertura de Pruebas (COMPLETADO)

| Feature | Estado | Prioridad | Sprint |
|---------|--------|-----------|--------|
| **Plan de Aumento de Cobertura de Pruebas** (`docs/PLAN_TESTING_COVERAGE_V1_8_0.md`) | ✅ Hecho |  Alta | Sprint 1 |
| **Añadir Specs para `orders.service.ts`** (Casos de borde, errores) | ✅ Hecho | 🔴 Alta | Sprint 1 |
| **Añadir Specs para `billing.service.ts`** (Webhooks, cambios de plan) | ✅ Hecho | 🔴 Alta | Sprint 1 |
| **Añadir Specs para `contacts.service.ts`** (Tipos, jerarquía) | ✅ Hecho | 🟡 Media | Sprint 2 |
| **Añadir Specs para `integrations.service.ts`** (Resiliencia, errores) | ✅ Hecho | 🟡 Media | Sprint 2 |
| **Añadir Specs para `currency.service.ts`** (Cache, fallbacks) | ✅ Hecho | 🟡 Media | Sprint 2 |
| **Configurar reporte de cobertura** (`jest --coverage`) | ✅ Hecho | 🟢 Baja | Sprint 2 |

---

### 🟢 v1.4.0 — Facturación Electrónica Paraguaya con FacturaSend (COMPLETADO)

| Feature | Estado | Prioridad | Sprint |
|---------|--------|-----------|--------|
| **FacturasendTenantConfig model** (schema.prisma) | ✅ Hecho | 🔴 Alta | Sprint 1 |
| **ElectronicDocument model** (schema.prisma) | ✅ Hecho | 🔴 Alta | Sprint 1 |
| **FacturasendAuthService** (config CRUD + AES-256 encryption) | ✅ Hecho | 🔴 Alta | Sprint 2 |
| **FacturasendClient** (HTTP client con retry + timeout) | ✅ Hecho | 🔴 Alta | Sprint 2 |
| **FacturasendMapper** (OrderFlow → Facturasend JSON: multi-currency, IVA 5/10%, B2B/B2C) | ✅ Hecho | 🔴 Alta | Sprint 2 |
| **FacturasendService** (emit, status, test, emitFromOdooPayload) | ✅ Hecho | 🔴 Alta | Sprint 2 |
| **FacturasendController** (REST API: config, test, emit, documents, webhook) | ✅ Hecho | 🔴 Alta | Sprint 2 |
| **Hook en orders.service.confirm()** (emit directo si tenant config) | ✅ Hecho | 🔴 Alta | Sprint 2 |
| **FacturasendLocationService** (cache de deptos/ciudades SIFEN) | ✅ Hecho | 🔴 Alta | Sprint 2 |
| **Unit tests** (mapper, service, client, controller specs) | ✅ Hecho | 🔴 Alta | Sprint 2 |
| **Odoo addon** → webhook `sale-order-confirmed` con tax breakdown | ⏳ Pendiente | 🔴 Alta | Sprint 3 |
| **odoo-adapter plugin** `facturasend-invoice` | ⏳ Pendiente | 🔴 Alta | Sprint 3 |
| **Webhook receiver** (FacturaSend → OrderFlow estado DE) | ⏳ Pendiente | 🟡 Media | Sprint 4 |
| **Frontend admin** (config, lista DEs, detalle XML/KuDE/PDF) | ⏳ Pendiente | 🟡 Media | Sprint 4 |
| **WebSocket notifications** (estado DE en tiempo real) | ⏳ Pendiente | 🟡 Media | Sprint 4 |
| **Cron retry + SIFEN polling** | ⏳ Pendiente | 🔴 Alta | Sprint 5 |
| **E2E Playwright** (admin routes `/admin/facturasend/*`) | ⏳ Pendiente | 🟡 Media | Sprint 5 |
| **init.sh validation** | ✅ Completado | 🔴 Alta | Final |

> **Arquitectura:** Dos vías de emisión. (1) **Directa:** OrderFlow backend llama Facturasend API desde `orders.service.confirm()`. (2) **Odoo-mediated:** Odoo addon emite webhook `sale-order-confirmed` → odoo-adapter → OrderFlow → Facturasend. El API key de Facturasend se almacena en OrderFlow backend. Multi-currency reutiliza `ExchangeRate` service (FEAT-022). Cache global de ubicaciones SIFEN. Plan completo: `docs/PLAN_FACTURASEND_INTEGRATION.md`.

---

### 💠 v1.9.0 — Calidad, Integración y Evolución (PLANIFICADO)

| Feature | Estado | Prioridad | Sprint |
|---------|--------|-----------|--------|
| **Base de Pruebas Unitarias Frontend** (`Vitest` + `React Testing Library`) | ⏳ Pendiente | 🔴 Alta | Sprint 1 |
| **Completar Integración Odoo** (Facturación `account.move` + Cola Durable) | ⏳ Pendiente | 🔴 Alta | Sprint 1-2 |
| **Profundizar Funcionalidad de Microservicios** (Pasarelas de pago autónomas) | ⏳ Pendiente | 🟡 Media | Sprint 2 |
---


---


### 🚀 v1.10.0 — Infrastructure Deploy Manager (OmniFlow como Plataforma de Infraestructura)

OmniFlow se convierte en la plataforma central desde la cual se despliega y gestiona el ciclo de vida de toda la infraestructura de servicios, no solo OrderFlow.

**Visión:** Super Admin despliega desde `/admin/deploy` instancias de:
- Odoo (18/19/20+)
- OmniFlow/OrderFlow (multi-tenant)
- Axon Ecosystem
- AIEER
- VitaLog
- LeadQualifierCRM
- Otros sistemas gestionados

| Feature | Estado | Prioridad | Sprint |
|---------|--------|-----------|--------|
| **Backend `deploy-manager`** — CRUD servidores + instancias + lifecycle actions | 📋 Planificado | 🔴 Alta | Sprint 1 |
| **Modelo unificado `Server` + `DeployInstance`** con discriminador `system` | 📋 Planificado | 🔴 Alta | Sprint 1 |
| **UI Super Admin `/admin/deploy`** — dashboard + wizard + detalle | 📋 Planificado | 🔴 Alta | Sprint 1 |
| **Validaciones** — SSH, puerto libre, dominio no duplicado en Traefik, espacio en disco | 📋 Planificado | 🔴 Alta | Sprint 2 |
| **Handlers por sistema** — empezando por Odoo y OrderFlow (init/seed/health-check) | 📋 Planificado | 🔴 Alta | Sprint 2 |
| **Integración dinámica Traefik** — rutas automáticas por dominio público | 📋 Planificado | 🔴 Alta | Sprint 2 |
| **Backup/restore automatizado** por instancia | 📋 Planificado | 🟡 Media | Sprint 3 |
| **Métricas y alertas** por instancia | 📋 Planificado | 🟡 Media | Sprint 3 |

**Estructura de directorios:**
```
/srv/<sistema>-deploy/<version>/<instancia>/
├── docker-compose.yml
├── .env
├── web-data/
└── db-data/

/srv/<sistema>-addons/<version>/
```

**Repositorios involucrados:**
- `marcelompz/odoo-deploy` — templates Odoo
- `marcelompz/odoo-addons` — addons custom
- `marcelompz/odoo-l10n-py` — localizaciones PY
- `marcelompz/traefik-orderflow` — Traefik compartido
- `marcelompz/orderflow` — código fuente OmniFlow

> **Arquitectura:** Módulo genérico y extensible. `extraConfig` (JSON) almacena particularidades por sistema. Handlers pluggables por sistema para init, seed, health-check y backup. No condicionado exclusivamente a Odoo.

**Documentación:** `docs/guides/odoo-deploy-standardization.md` (extendido a multi-sistema).

---
### v3.0.0 — Kubernetes + Escala + Arquitectura Avanzada (Target: 2028+)

| Feature | Estado | Prioridad |
|---------|--------|-----------|
| **Migración Docker Compose → Kubernetes** (Estructura de Helm charts en `k8s/` lista) | 🟡 Estructura Lista | 🟢 Baja |
| **Helm charts para OrderFlow core + microservicios** (`k8s/helm/`) | 🟡 Estructura Lista | 🟢 Baja |
| **Autoscaling por microservicio** | ⏳ Futuro | 🟢 Baja |
| **DB-per-tenant con PostgreSQL Operator** (CrunchyData/Zalando) | ⏳ Futuro | 🟢 Baja |
| **Redis Cluster / Sentinel** | ⏳ Futuro | 🟢 Baja |
| **Service Mesh (Istio / Linkerd)** para inter-service auth | ⏳ Futuro | 🟢 Baja |
| **Multi-región / multi-cloud** | ⏳ Futuro | 🟢 Baja |

#### Lecciones de Odoo → Hoja de Ruta (Beta → v3.0)

Estos 5 patrones estratégicos se incorporan del análisis comparativo `docs/Informe_Comparativo_Odoo_vs_OrderFlow.md`. **Todos son hitos previos a la migración a Kubernetes (v1.16.0):** establecen la base arquitectónica (eventos, auditoría, integraciones robustas, inventario avanzado) que debe existir antes de escalar a orquestación de contenedores.

| # | Patrón | Descripción | Sprint Target |
||---|--------|-------------|---------------|
| 1 | **Cola de Tareas Robustas (Durable Event Queue)** | Implementar BullMQ/Redis para reintentos y colas duraderas. Asegurar que ningún webhook hacia FacturaSend, pasarelas de pago o integraciones ERP se pierda ante fallas de red. | v1.16.0 |
| 2 | **Arquitectura de Eventos Extensible** | Consolidar un sistema de eventos internos (`EventBus`) que permita habilitar o extender funcionalidades por tenant sin modificar el código fuente central. | v1.16.0 |
| 3 | **Control de Inventario Multidepósito** | Evolucionar el manejo de stock hacia un modelo de doble entrada con transferencias internas, ubicaciones múltiples y reservas temporales para pedidos. | v1.16.0 |
| 4 | **Mapeador de Integraciones Configurable** | Ampliar el conector `orderflow_connector` para permitir mapeo de campos dinámico y resolución visual de conflictos de sincronización. | v1.16.0 |
| 5 | **Auditoría Transaccional Ampliada** | Expandir la tabla `AuditLog` para rastrear cambios sensibles en configuraciones de negocio, permisos y aperturas/cierres de caja. | v1.16.0 |

> **Estrategia de escalado:** Docker Compose (actual, infra compartida en Hetzner VPS) es el runtime hasta v2.x. A partir de v3.0 se evalúa K8s según volumen de tenants y microservicios standalone desplegados. Traefik se mantiene como Ingress Controller nativo.
