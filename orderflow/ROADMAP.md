# 🗺️ ROADMAP DE ORDERFLOW - v1.5.1 → v2.0.0

**Última Actualización:** 2026-08-06 ART (Release v1.16.0 — Admin UI/UX Overhaul + Tema oscuro)
**Versión Actual:** **`v1.16.0`** ✅ **RELEASED (Stable)** | Admin UI/UX: Dark mode, grouped sidebar, dashboard KPIs with sparklines, social catalog channel preview.
**Próximo Release:** **v1.17.0 (Planning)**
**Estado:** ✅ **STAGING & PRODUCTION OPERATIVE** | 🏆 **COMMERCIAL RELEASE v1.5.1 STABLE** | QA E2E Suite Integrada | 498 tests unitarios pasados  
**Visión Estratégica:** Plataforma SaaS omnicanal de alta velocidad con aislamiento multi-tier, marketplace de plugins de terceros, facturación automática Stripe/Mercado Pago y escalado horizontal a Kubernetes.

> 📦 **Estrategia de Microservicios Standalone:** Ver el roadmap dedicado de la suite de productos independientes en [docs/ROADMAP_MICROSERVICES.md](docs/ROADMAP_MICROSERVICES.md).

---

## 📊 ESTADO ACTUAL - MÓDULOS PRODUCTION READY

| Módulo | Estado | Producción | Staging | Notas |
|--------|--------|------------|---------|-------|
| **Multi-Tenant Core & Multi-Tier** | ✅ Completo | ✅ Sí | ✅ Sí | Auth JWT + API Key, DB dedicada por tenant enterprise, `@TenantPrisma()` |
| **Giveaway Module & Standalone** | ✅ Completo | ✅ Sí | ✅ Sí | CRUD, landing, sorteos, Google OAuth, standalone microservice |
| **WhatsApp Catalog & Standalone** | ✅ Completo | ✅ Sí | ✅ Sí | Catálogo, carrito, checkout y standalone microservice. Modo Free: pre-venta manual por WhatsApp. Modo Premium: gestión completa con pasarela de pagos. |
| **Social Commerce Hub (Catálogo Omnicanal)** | ✅ Completo | ✅ Sí | ✅ Sí | Evolución de WhatsApp Catalog a catálogo omnicanal. Soporta WhatsApp, Telegram, Instagram, Messenger y Custom Webhook. Pattern Strategy con IMessagingAdapter. Modelo CatalogChannelConfig para gestión de canales. |
| **Admin UI/UX Overhaul** | ✅ Completo | ✅ Sí | ✅ Sí | Tema oscuro con toggle y persistencia, sidebar agrupada por dominios, topbar mejorada, dashboard KPIs con sparklines, preview por canal en Catálogo Social admin. |
| **Bio-Links & Standalone** | ✅ Completo | ✅ Sí | ✅ Sí | API + Redis + Admin Drag&Drop + Public SPA + Fast Checkout, standalone microservice |
| **Super Admin** | ✅ Completo | ✅ Sí | ✅ Sí | Usuarios, tenants, roles, disable/enable/delete tenant, DB tier toggle |
| **Bookings (Spa)** | ✅ Completo | ✅ Sí | ✅ Sí | Turnos, comisiones, atomicidad y tests unitarios 100% |
| **Quotations** | ✅ Completo | ✅ Sí | ✅ Sí | Presupuestos, integración DNIT y tests unitarios 100% |
| **POS Web** | ✅ Completo | ✅ Sí | ✅ Sí | Offline-first (Dexie.js + Zustand), Modo Mozo + Cajero, WebSockets |
| **KDS (Cocina)** | ✅ Completo | ✅ Sí | ✅ Sí | Pantalla tiempo real, semáforo por tiempos, WebSocket rooms por tenant |
| **Loyalty / Fidelización** | ✅ Completo | ✅ Sí | ✅ Sí | Tarjetas, reglas, redención, tiers BRONZE→PLATINUM, integración POS |
| **Tauri Desktop Wrapper** | ✅ Completo | ✅ Sí | ✅ Sí | POS nativo + impresión ESC/POS + shortcuts Rust |
| **Observabilidad & CI/CD Load** | ✅ Completo | ✅ Sí | ✅ Sí | Sentry + Prometheus + k6 load tests continuos en GitHub Actions |
| **Cloudflare / DNS & Traefik** | ✅ Completo | ✅ Sí | ✅ Sí | Subdominios automáticos + Traefik v3.4 routing por microservicio |
| **Integrations (Odoo)** | ✅ Completo | ✅ Sí | ✅ Sí | OrderFlow ↔ Odoo: webhooks push + wizard pull + addon nativo Odoo 19 CE |

---

### 🚀 Release v1.16.0 - Admin UI/UX Overhaul

| Feature | Estado |
|---------|--------|
| Tema oscuro + toggle + persistencia | ✅ Completo |
| Sidebar agrupada por dominios | ✅ Completo |
| Topbar mejorada | ✅ Completo |
| Dashboard KPIs + sparklines + empty states | ✅ Completo |
| Catálogo Social: preview por canal | ✅ Completo |

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
3. **Escalado de Infraestructura** — Docker Compose (actual) → Kubernetes (futuro).

```
┌─────────────────────────────────────────────────────────────────┐
│  v0.6.0          v0.7.0          v1.0.0         v2.0.0         │
│  ┌──────┐       ┌──────┐       ┌──────┐       ┌──────┐        │
│  │Test  │       │Multi │       │Billing│       │  K8s │        │
│  │80%   │──────▶│Tier  │──────▶│+ SaaS │──────▶│  +   │        │
│  │+RBAC │       │+Micro│       │Portal │       │Scale │        │
│  │+Obs  │       │srvcs │       │+Mktpl │       │      │        │
│  └──────┘       └──────┘       └──────┘       └──────┘        │
│  Sep 2026       Nov 2026       Ene 2027       2027+           │
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

### v2.0.0 — Kubernetes + Escala + Arquitectura Avanzada (Target: 2027+)

| Feature | Estado | Prioridad |
|---------|--------|-----------|
| **Migración Docker Compose → Kubernetes** (Estructura de Helm charts en `k8s/` lista) | 🟡 Estructura Lista | 🟢 Baja |
| **Helm charts para OrderFlow core + microservicios** (`k8s/helm/`) | 🟡 Estructura Lista | 🟢 Baja |
| **Autoscaling por microservicio** | ⏳ Futuro | 🟢 Baja |
| **DB-per-tenant con PostgreSQL Operator** (CrunchyData/Zalando) | ⏳ Futuro | 🟢 Baja |
| **Redis Cluster / Sentinel** | ⏳ Futuro | 🟢 Baja |
| **Service Mesh (Istio / Linkerd)** para inter-service auth | ⏳ Futuro | 🟢 Baja |
| **Multi-región / multi-cloud** | ⏳ Futuro | 🟢 Baja |

#### Lecciones de Odoo → Hoja de Ruta (Beta → v2.0)

Estos 5 patrones estratégicos se incorporan del análisis comparativo `docs/Informe_Comparativo_Odoo_vs_OrderFlow.md`. **Todos son hitos previos a la migración a Kubernetes (v1.14.0):** establecen la base arquitectónica (eventos, auditoría, integraciones robustas, inventario avanzado) que debe existir antes de escalar a orquestación de contenedores.

| # | Patrón | Descripción | Sprint Target |
|---|--------|-------------|---------------|
| 1 | **Cola de Tareas Robustas (Durable Event Queue)** | Implementar BullMQ/Redis para reintentos y colas duraderas. Asegurar que ningún webhook hacia FacturaSend, pasarelas de pago o integraciones ERP se pierda ante fallas de red. | v1.14.0 |
| 2 | **Arquitectura de Eventos Extensible** | Consolidar un sistema de eventos internos (`EventBus`) que permita habilitar o extender funcionalidades por tenant sin modificar el código fuente central. | v1.14.0 |
| 3 | **Control de Inventario Multidepósito** | Evolucionar el manejo de stock hacia un modelo de doble entrada con transferencias internas, ubicaciones múltiples y reservas temporales para pedidos. | v1.14.0 |
| 4 | **Mapeador de Integraciones Configurable** | Ampliar el conector `orderflow_connector` para permitir mapeo de campos dinámico y resolución visual de conflictos de sincronización. | v1.14.0 |
| 5 | **Auditoría Transaccional Ampliada** | Expandir la tabla `AuditLog` para rastrear cambios sensibles en configuraciones de negocio, permisos y aperturas/cierres de caja. | v1.14.0 |

> **Estrategia de escalado:** Docker Compose (actual, infra compartida en Hetzner VPS) es el runtime hasta v1.0. A partir de v2.0 se evalúa K8s según volumen de tenants y microservicios standalone desplegados. Traefik se mantiene como Ingress Controller nativo.
