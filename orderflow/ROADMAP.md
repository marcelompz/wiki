# 🗺️ ROADMAP DE ORDERFLOW - v1.5.1 → v2.0.0

**Última Actualización:** 2026-08-04 ART (Post-Sprint v1.12.0 — UX/UI Mobile + Backoffice Desktop)
**Versión Actual:** **`v1.12.0`** ✅ **RELEASED (Stable)** | UX/UI Mobile + Backoffice Desktop + Testing
**Próximo Release:** **v1.13.0 (Testing & QA)**  
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

### � v2.0.0 — Kubernetes + Escala (Target: 2027+)

| Feature | Estado | Prioridad |
|---------|--------|----------|
| **Migración Docker Compose → Kubernetes** (Estructura de Helm charts en `k8s/` lista) | 🟡 Estructura Lista | 🟢 Baja |
| **Helm charts para OrderFlow core + microservicios** (`k8s/helm/`) | 🟡 Estructura Lista | 🟢 Baja |
| **Autoscaling por microservicio** | ⏳ Futuro | 🟢 Baja |
| **DB-per-tenant con PostgreSQL Operator** (CrunchyData/Zalando) | ⏳ Futuro | 🟢 Baja |
| **Redis Cluster / Sentinel** | ⏳ Futuro | 🟢 Baja |
| **Service Mesh (Istio / Linkerd)** para inter-service auth | ⏳ Futuro | 🟢 Baja |
| **Multi-región / multi-cloud** | ⏳ Futuro | 🟢 Baja |

> **Estrategia de escalado:** Docker Compose (actual, infra compartida en Hetzner VPS) es el runtime hasta v1.0. A partir de v2.0 se evalúa K8s según volumen de tenants y microservicios standalone desplegados. Traefik se mantiene como Ingress Controller nativo.

---

### ✅ Ya Completado (mantenidos por referencia)

| Feature | Estado | Versión |
|---------|--------|--------|
| Mobile Offline Mode | ✅ Completo | v0.2.0 |
| Push Notifications | ✅ Completo | v0.4.2 |
| Monitoring (Grafana/Prometheus) | ✅ Completo | v0.4.2 |
| Load Testing (k6) | ✅ Ejecutado | v0.5.1 |
| Extensibilidad Odoo | ✅ Diseño extensible | v0.4.0 |
| Tauri Desktop Wrapper | ✅ Completo | v0.4.2 |

---

## 📦 SPRINT ACTUAL (Sprint 5 — Agosto 2026: Calidad + Arquitectura Multi-Tier)

### Objetivos
1. 🚧 Elevar cobertura de testing a 80% (unitario + integración + E2E Playwright).
2. 🚧 Observabilidad avanzada: Grafana, Loki, Tempo, Alertmanager, dashboards por tenant.
3. 🚧 Seguridad: RBAC granular en todos los controllers, rate limit por tenant, auditoría completa.
4. 🚧 Multi-Tier Isolation: schema + `TenantConnectionManager` + `@TenantPrisma()` decorator.
5. 🚧 Microservicios standalone: `auth-shared` + primer standalone (Giveaways).
6. 🚧 Fix y consolidación del App Store (registry completo con todos los módulos).

### Tareas Completadas
- [x] Librería compartida `packages/auth-shared` para la validación unificada de JWT/API Key en microservicios
- [x] Estructura del primer microservicio standalone: `services/giveaways-standalone/`
- [x] Docker Compose standalone para despliegue independiente (`services/giveaways-standalone/docker-compose.yml`)
- [x] Schema Prisma & ApiKeyGuard inyección `tenantPrisma` por tier (`shared`/`dedicated`)
- [x] `TenantConnectionManager` resolución dinámica de pools de conexión dedicada
- [x] Script de aprovisionamiento de DB dedicada: `scripts/provision-dedicated-db.sh`
- [x] Endpoint `PATCH /api/v1/tenants/:id/isolation-tier` en `TenantsController`
- [x] Tag visual `DB Tier` (`💎 Dedicated` vs `👥 Shared`) en el Super Admin Dashboard
- [x] Giveaway admin improvements
- [x] Super Admin tenant management (toggle disable/enable, delete hard cascade, rol ADMIN gestor)
- [x] Unit tests para servicios core (389 tests passing, 50 suites)
- [x] Playwright E2E suite para flujos críticos (login, checkout, bio-link, POS, KDS, storefront - 14 tests passing)
- [x] Servidor Redis 7 integrado en `docker-compose.yml` para rate-limiting y WebSockets
- [x] Índices de alto rendimiento en Prisma (`orders`, `products`, `appointment_assignments`)
- [x] Code Splitting con `React.lazy` + `<Suspense>` en `AdminApp.tsx` (14 chunks independientes)
- [x] Secretos gestionados en `.gitignore` (`client_secret*.json`, `*.pem`, `*.key`)
- [x] RBAC granular aplicado a `QuotationsController` (`quotations:create`, `quotations:read`)
- [x] Swagger/OpenAPI docs & README.md actualizado
- [x] Especificación estratégica y plan de Bio-Links en `docs/BioLinks.md`
- [x] POS Web offline-first (Dexie.js + Zustand sync queue)
- [x] KDS WebSockets (`OrdersGateway`, rooms por tenant, semáforo tiempo real)
- [x] Loyalty backend + admin UI (tiers, reglas, redención, integración POS)
- [x] Tauri Desktop Wrapper (impresión ESC/POS, shortcuts Rust)
- [x] Observabilidad base (Sentry backend+frontend, Prometheus `/metrics`, Winston)
- [x] Subdominios automáticos por tenant (Cloudflare DNS + Traefik wildcard)
- [x] Dominio configurable backend/frontend (`ROOT_DOMAIN`, `VITE_ROOT_DOMAIN`)
- [x] Addon Odoo 19 CE (`orderflow_connector`): webhooks push + wizard pull
- [x] Bio-Links completo: API + Redis + Admin Drag&Drop + SPA Pública + Fast Checkout
- [x] Fix App Store: manifiestos faltantes (giveaways, notifications, analytics) + registry actualizado + iconos frontend
- [x] App Store seguridad: RBAC granular (`modules:read`, `modules:install`, `modules:uninstall`, `modules:configure`), DTOs, auditoría
- [x] App Store frontend: loading states, remover master key hardcodeada, mejora UX
- [x] RBAC granular aplicado a controllers secundarios (`ContactsController`, `LoyaltyController`, `IntegrationsController`, `BioLinksController`)
- [x] Catálogo WhatsApp público (`whatsapp-catalog.tsx`, `whatsapp-checkout.tsx`) con checkout express, modificadores, GPS y zonas de entrega
- [x] Plan de maduración UX/UI mobile-first del catálogo WhatsApp (`docs/PLAN_WHATSAPP_CATALOG_UX_UI.md`)
- [x] Plan de customización admin/superadmin del catálogo WhatsApp (`docs/PLAN_WHATSAPP_CATALOG_ADMIN.md`)
- [x] Endpoint público unificado `/api/v1/public/catalog/products` y `/config` para todos los canales (storefront, WhatsApp, etc.)

### Tareas Completadas
- [x] Segundo microservicio standalone: `services/whatsapp-catalog-standalone/` (`docker-compose.yml` en puerto `3021`)
- [x] Integration de k6 load testing continuo en GitHub Actions pipeline (`.github/workflows/ci-cd.yml`)
- [x] Rotación automática programada de API Keys
- [x] Schema Prisma: `isolationTier`, `dedicatedDatabaseUrl` en Tenant
- [x] `TenantConnectionManager` + `@TenantPrisma()` decorator
- [x] `packages/auth-shared` — librería JWT/API Key compartida
- [x] `services/giveaways-standalone/` — primer microservicio standalone
- [x] `services/whatsapp-catalog-standalone/` — segundo microservicio standalone

---

| **Provecchio Backup & Restore (new DDL)** | ⚠️ En progreso | 🔴 Alta | Sprint 5 | Scripts creados: restore-provecchio.sh, update-provecchio-version.sh, migration 20260729170000 |

| Métrica | Actual | Target v1.2.0 | Target v2.0 |
|---------|--------|---------------|-------------|
| **Cobertura de Tests** | 498 passing / 58 suites (~45% real) | 70% | 80% (unitario + integración + E2E) |
| **Endpoints Documentados** | 100% | 100% | 100% |
| **Deploy Time** | 2-3 min | <2 min | <1 min |
| **Build Time** | 8-30s | <10s | <5s |
| **Uptime** | 95% | 99% | 99.9% |
| **Response Time (p95)** | 200ms | <150ms | <100ms |
| **Load Testing (k6)** | P95 294-460ms | P95 < 300ms | P95 < 200ms |
| **Módulos Production Ready** | 16+ módulos core | 18+ módulos | 20+ módulos |
| **Microservicios Standalone** | 6 | 6+ | 8+ |
| **Tenants Enterprise (DB dedicada)** | Soporte implementado | N tenants | N tenants |

---

## 🔧 INFRAESTRUCTURA ACTUAL

### Ambientes
- ✅ **Localhost:** Desarrollo (`http://localhost:3011`)
- ✅ **Staging:** Hetzner VPS (`http://staging.provecchio.com`) - DNS Cloudflare operativo
- ✅ **Production:** Hetzner VPS (`https://provecchio.com`)

### Servidores
| Servidor | IP | Hostname | Propósito |
|----------|-----|----------|-----------|
| **Hetzner VPS** | `178.105.226.175` | `dimoraserver1` | Staging + Production |
| **Provecchio (Réplica/Backup)** | *(misma red Hetzner)* | `provecchio` | Réplica read-only + backup en caliente; se detiene cuando no se necesita para ahorrar CPU/RAM |
| **Local Server** | `38.52.135.227` | `dimoraserverlocal` | Development |

### Proxy Perimetral (Traefik v3.3 Exclusivo)
- ✅ **Traefik v3.3:** Reverse proxy exclusivo (Nginx eliminado, no reactivar bajo ninguna circunstancia)
- ✅ **Repositorio:** `traefik-orderflow` (`/srv/traefik/` en servidor, `/opt/traefik-orderflow/` local)
- ✅ **Config estática:** `traefik.yml` (entrypoints web/websecure, ACME DNS-01 Cloudflare)
- ✅ **Config dinámica:** `services.yml` (routers por host: OrderFlow, Axon, Aieer) + `headers.yml`
- ✅ **SSL:** Let's Encrypt wildcard `*.pesallaccia.com` + redirección HTTP→HTTPS permanente
- ✅ **Recarga dinámica:** `docker exec traefik kill -HUP 1`

### Estrategia de Réplica y Backup
- 🚧 **Provecchio como servidor de réplica read-only:** se utiliza como secondary/replica en caliente; cuando se detiene el contenedor, no consume CPU/RAM significativa.
- 🚧 **Objetivo:** alta disponibilidad sin costo permanente de infraestructura.
- 🚧 **Futuro próximo:** agregar un segundo servidor en la misma red para backup en caliente permanente.

### CI/CD
- ✅ **GitHub Actions:** Build + Deploy automático
- ✅ **Branches:** staging → main
- ✅ **Deploy Script:** `./scripts/deploy-production.sh`
- ✅ **Docker Build:** Inside containers (no host npm)

### Docker
- ✅ **Containers:** 6 activos (frontend, backend, db, redis, odoo_adapter, edge-proxy/traefik)
- ✅ **Healthchecks:** Todos configurados
- ✅ **Redes:** orderflow-network (bridge) + traefik-public
- ✅ **Volúmenes:** postgres_data, redis_data (persistencia)

### Backups
- ✅ **Scripts:** backup.sh, restore.sh
- ✅ **Frecuencia:** Diaria (cron)
- ✅ **Retention:** 7 días

---

## ⚠️ DEUDAS TÉCNICAS

| Deuda | Impacto | Prioridad | Target | Estado |
|-------|---------|-----------|--------|--------|
| **Testing <80%** | Alto | 🔴 Alta | v2.0.0 | ⚠️ En progreso (389 tests / 50 suites, ~45% real) |
| **E2E + Playwright** | Alto | 🔴 Alta | v0.6.0 | ✅ Hecho (14 tests) |
| **Carga continua (k6)** | Medio | 🔴 Alta | v0.6.0 | ✅ Integrado en CI/CD |
| **Seguridad enterprise** | Alto | 🔴 Alta | v0.6.0 | ✅ RBAC granular en 21/33 controllers |
| **Observabilidad avanzada** | Alto | 🔴 Alta | v0.6.0 | ✅ Grafana + Loki + Tempo + Alertmanager |
| **Multi-Tier Isolation (DB-per-tenant)** | Alto | 🔴 Alta | v0.7.0 | ✅ Completado (TenantConnectionManager + @TenantPrisma) |
| **Microservicios standalone** | Alto | 🔴 Alta | v0.7.0 | ✅ 6 microservicios production-ready |
| **Billing SaaS** | Alto | 🔴 Alta | v1.0.0 | ✅ Completado (Stripe + MercadoPago + MRR/ARR) |
| **Marketplace / Plugin SDK** | Medio | 🔴 Alta | v1.0.0 | ✅ Completado (MarketplaceModule) |
| **Kubernetes / Autoscaling** | Medio | 🟡 Media | v2.0.0 | ⏳ Estructura Helm lista |
| **Sin docs API** | Alto | 🔴 Alta | v0.3.0 | ✅ Resuelto v0.3.0 |
| **README desactualizado** | Medio | 🔴 Alta | v0.3.0 | ✅ Resuelto v0.3.0 |
| **Mobile offline** | Medio | 🟡 Media | v0.2.0 | ✅ Completo |
| **Sin monitoring** | Alto | 🟡 Media | v0.4.2 | ✅ Completo |
| **Load testing (k6)** | Medio | 🟡 Media | v0.5.1 | ✅ Ejecutado + integrado en CI |
| **App Store / Marketplace vacío** | Medio | 🔴 Alta | v0.5.1 | ✅ Resuelto (manifiestos + registry + iconos) |
| **Google OAuth verification** | Medio | 🟡 Media | v0.6.0 | ⏳ En proceso (video) |
| **White-label completo** | Medio | 🟢 Baja | v1.0.0 | ✅ Completado (dominio custom, favicon, título, branding removal) |
| **Analytics avanzado** | Medio | 🟢 Baja | v1.0.0 | ✅ Completado (AnalyticsModule) |
| **MIDA / SAP** | Medio | 🟡 Media | v1.0.0 | ✅ Completado (conectores en IntegrationsService) |
| **Addon Odoo: variantes/inventario/facturación** | Medio | 🟡 Media | v0.7.0 | ⚠️ Variantes e inventario completados; facturación pendiente |
| **i18n (multi-language)** | Bajo | 🟢 Baja | v1.0.0 | ✅ Completado (ES/EN/PT) |
| **Mobile: publicación App Store/Play** | Bajo | 🟢 Baja | v1.0.0 | ❌ Pendiente |

---

## 📚 DOCUMENTACIÓN

| Documento | Estado | Última Actualización | Notas |
|-----------|--------|---------------------|-------|
| **README.md** | ✅ Actualizado | 2026-07-31 | v1.1.9: badges sincronizados, 389 tests |
| **ROADMAP.md** | ✅ Actualizado | 2026-07-31 | Estado del arte v1.1.9 sincronizado |
| **CHANGELOG.md** | ✅ Actualizado | 2026-07-31 | v1.1.9: Unificación de navegación + QA E2E integral |
| **POS_KDS_ARCHITECTURE.md** | ✅ Nuevo | 2026-07-13 | Arquitectura y diseño POS / KDS |
| **AUDITORIA_COMPLETA.md** | ✅ Actualizado | 2026-07-31 | v1.1.9: Matriz de entornos y auditoría completa |
| **ESTADO_DEL_ARTE.md** | ✅ Actualizado | 2026-07-31 | Análisis de madureza v1.1.9 y gaps remanentes |
| **TRAEFIK_SERVER_SETUP.md** | ✅ Nuevo | 2026-07-18 | Guía de configuración Traefik v3.3 en `/srv/traefik/` |
| **PLAN_DE_MADURACION_PRODUCCION.md** | ✅ Completo | 2026-06-23 | Fases 1-5 completadas |
| **FAQ.md** | ⚠️ Parcial | 2026-07-04 | Pendiente Google OAuth |
| **IMPLEMENTACION_SORTEO.md** | ✅ Actualizado | 2026-07-04 | Completo |
| **COMPATIBILITY.md** | ⚠️ Parcial | 2026-06-22 | Pendiente |
| **STAGING_DEPLOYMENT_GUIDE.md** | ✅ Nuevo | 2026-07-05 | Guía completa Hetzner |
| **PRODUCCION_DEPLOY_COMPLETE.md** | ✅ Nuevo | 2026-07-05 | Deploy production |
| **GOOGLE_OAUTH_FIX_SUMMARY.md** | ✅ Nuevo | 2026-07-05 | OAuth fix docs |
| **GOOGLE_OAUTH_SETUP.md** | ✅ Nuevo | 2026-07-05 | OAuth config guide |
| **ODOO_INTEGRATION_GUIDE.md** | ✅ Actualizado | 2026-07-18 | Addon Odoo 19 CE `orderflow_connector` |

---

## 🎯 PRÓXIMOS HITOS

| Hito | Fecha Target | Estado | Notas |
|------|--------------|--------|-------|
| **v0.3.0-beta.0** | ✅ 2026-07-05 | ✅ **COMPLETADO** | Staging + Production operativos |
| **v0.3.0-rc.0** | ✅ 2026-07-15 | ✅ **COMPLETADO** | Google OAuth verification |
| **v0.4.0-beta.0** | ✅ 2026-07-14 | ✅ **COMPLETADO** | POS & KDS Integration (WebSockets + UI) |
| **v0.4.1** | ✅ 2026-07-15 | ✅ **COMPLETADO** | Fixes producción + dominio configurable |
| **v0.4.2** | ✅ 2026-07-15 | ✅ **COMPLETADO** | Tauri Desktop POS + Observabilidad (Sentry/Prometheus) |
| **v0.4.3** | ✅ 2026-07-16 | ✅ **COMPLETADO** | Testing expansion: 298 tests / 39 suites |
| **v0.5.0** | ✅ 2026-07-19 | ✅ **COMPLETADO** | Bio-Links + Traefik v3.3 + App Store fixes |
| **v0.5.1** | ✅ 2026-07-19 | ✅ **COMPLETADO** | Observabilidad avanzada + RBAC + E2E + Fix App Store registry |
| **v0.6.0** | 2026-09-15 | ⏳ Pendiente | Testing 80%, RBAC completo, Observabilidad operativa |
| **v0.7.0** | 2026-11-15 | ⏳ Pendiente | Multi-Tier Isolation + Microservicios Standalone (Giveaways + WA Catalog) |
| **v1.0.0 Stable** | ✅ 2026-07-26 | ✅ **COMPLETADO** | Release oficial comercial SaaS (Multi-Tier + Redis WebSockets + Billing UI) |
| **v1.1.3 Stable** | ✅ 2026-07-27 | ✅ **COMPLETADO** | File Store Unificado por Tenant + Backups + Admin WhatsApp Catalog + Troubleshooting Docs + Cleanup Legacy Config |
| **v1.1.7 Stable** | ✅ 2026-07-30 | ✅ **COMPLETADO** | QA E2E Playwright Suite, Subdomain Resolution Fixes, WhatsApp Catalog Admin Visual Customization Overhaul, Frontend Stability Guards |
| **v1.1.8 Stable** | ✅ 2026-07-31 | ✅ **COMPLETADO** | Homepage Visual Builder, Landing vs. Tienda routing separation, Google Fonts palette, live Desktop/Mobile preview |
| **v1.1.9 Stable** | ✅ 2026-07-31 | ✅ **COMPLETADO** | Navigation unification, Array.isArray defensive guards, E2E QA suite expanded to all admin subroutes, 389 tests |
| **v1.3.0 Stable** | ✅ 2026-08-01 | ✅ **COMPLETADO** | Automatización de Cotizaciones PY (FEAT-022): 5 providers (BCP, CambiosChaco, Bonanza, DólarApi, Manual), Cron 15min TZ Paraguay, LRU cache + DB persistence, 426 tests |
| **v1.4.0 Stable** | ✅ 2026-08-01 | ✅ **COMPLETADO** | Facturación Electrónica Paraguaya (FacturaSend/SIFEN). 72 tests. init.sh: 58 suites / 498 tests. |
| **v1.5.1 Stable** | ✅ 2026-08-02 | ✅ **COMPLETADO** | Responsive UX/UI Backoffice + Traefik v3.4 (QA-001) |
| **v1.7.0 Stable** | ✅ 2026-08-03 | ✅ **COMPLETADO** | UX/UI Mobile-First & Ergonomía Intuitiva + Refinamiento UX/UI Escritorio |
| **v1.8.0** | ✅ 2026-08-03 | ✅ **COMPLETADO** | Deuda Técnica: Aumento de Cobertura de Pruebas (Backend) |
| **v1.8.1** | ✅ 2026-08-03 | ✅ **COMPLETADO** | Proceso de Despliegue Formalizado y Documentado |
| **v1.9.0** | 2026-09-15 | ⏳ Pendiente | Calidad Frontend, Finalización Odoo y Evolución de Microservicios |
| **v2.0.0** | 2027+ | ⏳ Futuro | Kubernetes + autoscaling + multi-región |

---

## 🔌 ESTADO DEL ADDON ODOO (`orderflow_connector`)

| Aspecto | Estado | Notas |
|---------|--------|-------|
| **Push Odoo → OrderFlow** | ✅ Funcional | Webhooks asíncronos para partners, productos, sale orders |
| **Pull OrderFlow → Odoo** | ✅ Funcional | Wizard de importación interactivo con selección y estado |
| **Configuración UI** | ✅ Completo | Panel en Ajustes → Ventas → OrderFlow |
| **Granularidad de sync** | ✅ Completo | Toggles por entidad (partners, productos, pedidos, inventario) |
| **Variantes de producto** | ✅ Completo | Soporte para `product.product` por SKU interno y Barcode |
| **Sincronización de inventario** | ✅ Completo | Endpoint `/sync/products/stock` y consulta `qty_available` / `virtual_available` |
| **Facturación (account.move)** | ❌ No implementado | No hay sync de facturas hacia/desde OrderFlow |
| **Reintentos / cola durable** | ❌ No implementado | Threads daemon; si falla, el webhook se pierde |
| **Deduplicación** | ⚠️ Básica | Búsqueda simple por nombre/email/SKU/ref |
| **URL configurable** | ⚠️ Parcial | Hardcodeada `pesallaccia.com` como fallback |

**Recomendación:** El addon está en estado **usable para integración básica** (clientes, productos, pedidos). Para sincronización bidireccional completa se requiere: variantes, stock, facturación, cola durable y reintentos.

---

## 🌐 ESTADO DE TRAEFIK (Infraestructura Proxy)

| Aspecto | Estado | Notas |
|---------|--------|-------|
| **Versión** | v3.3 | Proxy exclusivo OrderFlow + Odoo 19 CE |
| **Nginx** | ❌ Eliminado | NO reactivar bajo ninguna circunstancia |
| **Repositorio** | `traefik-orderflow` | Código/config en `/srv/traefik/` (prod) y `/opt/traefik-orderflow/` (local) |
| **Routers** | ✅ Operativo | OrderFlow (prod+staging), Axon (prod+staging), Aieer (staging) |
| **SSL** | ✅ Let's Encrypt | Wildcard `*.pesallaccia.com` + DNS-01 Cloudflare |
| **HTTPS Redirect** | ✅ Permanente | HTTP 308 desde entrypoint `web` |
| **Actualización** | Procedimiento estándar | `docker compose up -d` en `/srv/traefik` + `kill -HUP 1` |

---

**Fin del ROADMAP**
