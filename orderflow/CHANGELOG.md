# Changelog

Todos los cambios notables a este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
y este proyecto se adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.9.0] - 2026-08-03

### 🚀 Features
- **Billing:** Integración de Pagopar como pasarela de pagos local (Paraguay) con webhook, DTOs y módulo dedicado.
- **Bookings:** Notificaciones post-reserva por WhatsApp Business API y sincronización automática con Google Calendar.

### 🛠️ Refactor
- **Integrations:** Agregados `GOOGLE_CALENDAR` y `WHATSAPP` al enum `IntegrationType`.
- **Schema:** Campo `googleCalendarEventId` en `AppointmentAssignment` para tracking de eventos.

### 📚 Documentación
- Creada `docs/guides/PAGOPAR_INTEGRATION.md`.
- Creada `docs/STAFFING_ARCHITECTURE_ANALYSIS.md`.

## [1.8.1] - 2026-08-03

### ⚙️ Proceso y Documentación
- **Proceso de Despliegue:** Formalizada y documentada la Fase 5 del proceso de despliegue, que incluye la verificación y sincronización explícita con el repositorio de GitHub (tags, changelog, roadmap) como paso final obligatorio.
- **Documentación:** Creado el documento `docs/guides/DEPLOYMENT_PROCESS.md` que detalla el procedimiento de despliegue en producción de 5 fases.
- **Protocolo de Agente:** Actualizado `AGENTS.md` para incluir la creación de `git tags` como parte del rol del Revisor/Auditor.

### 🚀 Despliegue v1.8.1 a Producción
- **Deploy a Hetzner:** Despliegue exitoso de v1.8.1 a producción (`pesallaccia.com`) y staging (`staging.pesallaccia.com`) mediante `./scripts/deploy-production.sh`.
- **Traefik v3.4:** Toda la documentación de Traefik actualizada de v3.3 a v3.4 en todos los documentos del proyecto.
- **Versión sincronizada:** `VERSION`, `backend/package.json`, `frontend/package.json`, `featurelist.json`, `README.md` y `ROADMAP.md` actualizados a v1.8.1.
- **Validación:** `./scripts/init.sh` pasado (54 suites / 444 tests, build backend y frontend limpios).
- **Troubleshooting:** Creada entrada `#20` en `docs/troubleshooting/` para el error de build de `AdaptiveTable` resuelto durante el despliegue.

## [1.8.0] - 2026-08-03

### 🧪 **Deuda Técnica: Aumento de Cobertura de Pruebas (Backend)**
- **Planificación:** Creado el documento `docs/PLAN_TESTING_COVERAGE_V1_8_0.md` para guiar el aumento de cobertura de pruebas del backend del ~45% al 70%.
- **Testing (`orders.service.spec.ts`):** Ampliada la cobertura de `OrdersService`, cubriendo escenarios de error y el caso de éxito para la función `confirm()` (actualización de stock, transacciones e integraciones).
- **Testing (`billing.service.spec.ts`):** Implementados los tests para el `BillingService`, cubriendo la delegación de webhooks a los servicios de Stripe y Mercado Pago, y el manejo de gateways desconocidos.
- **Testing (`contacts.service.spec.ts`):** Completada la cobertura de `ContactsService`, incluyendo la creación, actualización y la lógica `findOrCreateFromSource` para manejar contactos existentes y nuevos.
- **Testing (`integrations.service.spec.ts`):** Ampliada la cobertura de `IntegrationsService`, cubriendo tanto el envío exitoso a Odoo como el caso en que la integración no está activa.
- **Testing (`currency.service.spec.ts`):** Creado el archivo de especificaciones para `CurrencyService` con la estructura inicial para probar la lógica de cotizaciones.

## [1.7.0] - 2026-08-03

### 💻 **Refinamiento UX/UI Escritorio (Desktop-First Admin)**
- **Planificación:** Se ha creado el documento `docs/PLAN_DESKTOP_UX_REFINEMENT.md` que guiará la optimización de la experiencia de usuario en el backoffice de escritorio.
- **Frontend:** Se ha creado la hoja de estilos inicial `frontend/src/styles/admin-desktop.css` con media queries y reglas base para pantallas `>1200px`.
- **Roadmap:** Se ha actualizado el `ROADMAP.md` para incluir el nuevo objetivo `v1.7.0 — Refinamiento UX/UI Escritorio`.
- **Frontend (Core):** Se ha importado la nueva hoja de estilos `admin-desktop.css` en el punto de entrada de la aplicación para su aplicación global.
- **Frontend (Componente Adaptativo):** Se ha creado el componente `AdaptiveTable.tsx`, que renderiza una tabla de Ant Design en escritorio y una lista de tarjetas en móvil, aplicando la Fase 2 del plan de refinamiento de UX.
- **Frontend (Refactorización):** Se ha refactorizado la página de administración de Productos (`products.tsx`) para utilizar el nuevo `AdaptiveTable`, mejorando la experiencia tanto en escritorio como en móvil.
- **Frontend (Refactorización):** Se ha refactorizado la página de administración de Contactos (`contacts.tsx`) para utilizar el `AdaptiveTable`, unificando la experiencia de usuario en las vistas de lista principales.
- **Frontend (Refactorización):** Se ha refactorizado el Dashboard principal (`dashboard.tsx`) para utilizar un layout de múltiples columnas en escritorio, mejorando la densidad de información con KPIs y gráficos.

## [1.6.0] - 2026-08-03

### 📱 **UX/UI Mobile-First & Ergonomía Intuitiva**
- **Frontend (Catálogo/Checkout):**
  - Implementada `Sticky Action Bar` y `Bottom Sheets` para mejorar la experiencia de usuario en dispositivos móviles en el catálogo y checkout.
  - Desarrollado `One-Page Checkout Express` con integración de geolocalización y autocompletado de direcciones para agilizar el proceso de compra.
- **Frontend (Backoffice):**
  - Implementada `Navegación Móvil Adaptativa` con una `Bottom Navigation Bar` para el backoffice, optimizando la usabilidad en pantallas pequeñas.
  - Completada la `Transformación Responsive de Tablas Admin a Tarjetas` para todas las tablas principales del panel de administración, mejorando la visualización en móvil.
  - Desarrollado `SuperAdmin Tenant Switcher Flotante Táctil` para una gestión de tenants más eficiente en dispositivos táctiles.
## [1.5.2] - 2026-08-03

### 📄 **Análisis y Documentación del Ecosistema**
- **Documentación:**
  - Creado `docs/RESUMEN_ECOSISTEMA_Y_PROYECTOS.md` con un resumen completo del estado del arte de OrderFlow, Traefik y la Wiki.
  - Creado `docs/ANALISIS_METODOLOGIA_HUMANO_IA.md` con el análisis del modelo de desarrollo "Cyborg Lead Developer".

## [1.5.1] - 2026-08-02

### 🎨 **Responsive UX/UI Backoffice + Traefik v3.4 (QA-001)**
- **Frontend (admin pages):**
  - `admin-mobile.css`: CSS global responsive para mobile (<768px): header stack, tablas con scroll horizontal, touch targets 44px, modales con width adaptativo.
  - 17 páginas admin adaptadas: `customers`, `products`, `users`, `contacts`, `bookings`, `dashboard`, `giveaways`, `integrations`, `loyalty`, `quotations`, `spa-dashboard`, `subscription`, `super-admin-dashboard`, `tenant-access`, `whatsapp-catalog`, `super-whatsapp-catalog`, `homepage-builder`, `pos`, `kds`, `modules`, `biolinks`.
  - Clases aplicadas: `admin-page`, `admin-page-header`, `admin-table-wrapper`, `admin-modal-form`, `scroll={{ x: 'max-content' }}`.
- **QA (`scripts/init.sh`):**
  - Agregada validación de Traefik en producción: estado del contenedor, puertos 80/443, detección de error de API Docker.
  - Agregado sync automático de `/opt/traefik-orderflow` a `/srv/traefik` en Hetzner después de cada build.
- **Infraestructura (Traefik):**
  - Actualizado Traefik de v3.3 a v3.4 en Hetzner.
  - Configuración centralizada en `/opt/traefik-orderflow` y sincronizada a `/srv/traefik` en producción.
  - Resuelto error de API Docker (`client version 1.24 is too old`) configurando `DOCKER_API_VERSION=1.55` y endpoint TCP.
- **Documentación (`AGENTS.md`):**
  - Actualizada regla de infraestructura: Traefik v3.4 exclusivo, configuración desde `/opt/traefik-orderflow` con sync a `/srv/traefik`.

## [1.5.0] - 2026-08-01

### 🏢 **OrderFlow como Tenant Enterprise + Fixes Frontend/Routing (FEAT-024)**
- **Frontend (`Dockerfile.prod`, `docker-compose.prod.yml`):**
  - Agregados `ARG` faltantes para `VITE_ROOT_DOMAIN` y `VITE_SYSTEM_SUBDOMAINS` en build de producción.
  - Agregados build args correspondientes en `docker-compose.prod.yml` con defaults por entorno.
- **Frontend (`App.tsx`):**
  - `ROOT_DOMAIN` ahora fallback a `window.location.hostname` cuando `VITE_ROOT_DOMAIN` no está definido, evitando break de `provecchio.com`.
- **Frontend (admin pages):**
  - Corregidos todos los calls a `/api/v1/sync/customers` (404) redirigiéndolos a `/api/v1/customers` y `/api/v1/customers/sync`.
  - Archivos: `customers.tsx`, `dashboard.tsx`, `spa-dashboard.tsx`, `quotations.tsx`, `checkout.tsx`, `checkout-simple.tsx`.
- **Infraestructura (`docker-compose.prod.yml`):**
  - Confirmado que `pesallaccia.com` se despliega en servidor Hetzner separado; regla Traefik de provecchio mantenida sin rutas cruzadas.
- **Configuración (`.env.prod`, `.env.production`):**
  - Agregada variable `ORDERFLOW_COMPANY_DB_URL` para provisioning de DB dedicada del tenant enterprise.
- **QA & Despliegue:** `./scripts/init.sh` pasado (58 suites / 498 tests, build backend y frontend limpios, E2E Playwright sin errores).

## [1.4.0] - 2026-08-01

### 🇵🇾 **Facturación Electrónica Paraguaya con FacturaSend (SIFEN)**
- **Prisma Schema (`schema.prisma`):**
  - Nuevo modelo `FacturasendTenantConfig` para almacenar la configuración de FacturaSend por tenant.
  - Nuevo modelo `ElectronicDocument` para registrar los documentos electrónicos emitidos.
- **Servicios:**
  - `FacturasendAuthService`: Gestión de configuración y cifrado AES-256 de API keys.
  - `FacturasendClient`: Cliente HTTP con reintentos y timeout para la API de FacturaSend.
  - `FacturasendMapper`: Mapeo de datos de OrderFlow a JSON de FacturaSend (multi-moneda, IVA 5/10%, B2B/B2C).
  - `FacturasendService`: Lógica de emisión, consulta de estado, pruebas de conexión y emisión desde payloads de Odoo.
  - `FacturasendLocationService`: Caché de ubicaciones SIFEN (departamentos/ciudades).
- **Controller:**
  - `FacturasendController`: REST API para configuración, pruebas, emisión, listado de documentos y recepción de webhooks.
- **Integración:**
  - Hook en `orders.service.confirm()` para emisión directa si el tenant tiene configuración de FacturaSend.
- **QA & Despliegue:** `./scripts/init.sh` pasado (72 tests específicos de FacturaSend, 58 suites / 498 tests totales).

## [1.3.0] - 2026-08-01

### 💱 **Automatización de Cotizaciones desde Fuentes Locales de PY (FEAT-022)**
- **Prisma Schema (`schema.prisma`):**
  - Nuevo modelo `ExchangeRate` con `tenantId`, `fromCurrency`, `toCurrency`, `rate`, `provider`, `isFallback`, `createdAt`/`updatedAt`. Índice `@@unique([tenantId, fromCurrency, toCurrency])`.
  - Relación `exchangeRates ExchangeRate[]` agregada al modelo `Tenant`.
- **Currency Providers (`backend/src/currency/providers/`):**
  - Extraído `dolarapi.com` del código inline del `CurrencyService` → `DolarApiProvider` (USD→ARS, USD→EUR).
  - Nuevo `BcpProvider` (Banco Central del Paraguay — API pública + parsing HTML).
  - Nuevo `CambiosChacoProvider` (API/scraper Cambios Chaco).
  - Nuevo `BonanzaProvider` (API/scraper Bonanza Cambios).
  - Nuevo `ManualProvider` (fallback configurable desde `Tenant.config.currencyFallbackRate`).
  - Todos los providers implementan timeout 5s, retry 1x y `withRetry` utility.
- **CurrencyService (`currency.service.ts`):**
  - Registrado en `CurrencyModule` (dejaba de ser un servicio huérfano `@Injectable()`).
  - Chain de providers en orden de prioridad desde `Tenant.config.currencyProviders`.
  - Persistencia de rates en DB vía `upsertExchangeRate` (findFirst + create/update) con deduplicación por cambio.
  - Cache: in-memory LRU (max 100 entries, TTL 5 min) + lectura desde `ExchangeRate` DB si está fresca.
  - Fallback a última rate de DB cuando todos los providers fallan.
  - Soporte para `currencyRateOverride` (tasa manual de emergencia).
- **Cron (`CurrencyRateCronService`):**
  - `@Cron('0 */15 * * * *')` — refresco cada 15 min, solo horario comercial PY (07:00–18:00, timezone `America/Asuncion`).
  - Itera todos los tenants activos y omite tenants con `currencyRateOverride: true`.
- **API Admin (`CurrencyController`):**
  - `GET /api/v1/currency/rates/:from/:to` — rate actual + provider + timestamp (público, tenant por host).
  - `GET /api/v1/currency/providers/:tenantId` — providers configurados.
  - `PATCH /api/v1/currency/settings` — actualiza `Tenant.config` (providers, fallback, override).
  - `POST /api/v1/currency/refresh/:tenantId` — trigger manual de refresh.
- **QA & Despliegue:** `./scripts/init.sh` pasado (54 suites / 426 tests, build backend y frontend limpios).

## [1.1.9] - 2026-07-31

### 🚀 **Unificación de Navegación & QA E2E Integral**
- **Backend (`customers.controller.ts`):**
  - Corregida la ruta base `@Controller('api/v1/customers')` permitiendo la consulta limpia de clientes `/api/v1/customers`.
- **Frontend (`AdminApp.tsx`, `bookings.tsx`, `homepage-builder.tsx`):**
  - Unificado el menú de administración removiendo duplicidades e integrando la agenda de Spa en **Turnos & Agendas Spa**.
  - Destacado el módulo **🎨 Diseñador Web & Portada** con accesos directos de previsualización.
  - Agregada guardia de arbolado defensivo `Array.isArray()` en `BookingsPage`.
- **QA & Testing (`scripts/qa_e2e_check.py`):**
  - Ampliada la suite E2E de Playwright en Python para verificar la navegación de todas las subrutas administrativas (`/admin/products`, `/admin/customers`, `/admin/bookings`, `/admin/loyalty`, `/admin/homepage-builder`, `/admin/whatsapp-catalog`) y descartar errores JS y HTTP 502/404.

## [1.1.8] - 2026-07-31

### 🎨 **Gestor Visual de Portada & Enrutamiento Separado (Landing vs. Tienda)**
- **Frontend (`TenantHomepage.tsx`, `App.tsx`, `PublicStorefrontPage.tsx`):**
  - Implementada portada institucional dinámica (`TenantHomepage.tsx`) con bloques modulares (Hero, Productos Destacados, Beneficios, Testimonios, Contacto & Redes).
  - Separación de rutas: la raíz (`/`) carga la Portada Institucional del Tenant, mientras que `/tienda` alberga la Tienda/Catálogo interactivo con carrito.
  - Incorporado botón de **Acceso Administración (`🔐`)** en el encabezado de las portadas públicas.
- **Admin App (`homepage-builder.tsx`, `AdminApp.tsx`):**
  - Creado diseñador visual de portada en `/admin/homepage-builder` con selector de plantillas por rubro (Retail, Gastronomía, Spa/Servicios, B2B), paleta de colores y fuentes de Google Fonts.
  - Vista previa en tiempo real Desktop y Mobile.
- **Protocolo & Documentación:**
  - Actualizados `featurelist.json` (FEAT-019), `docs/00-contexto-agentes.md` y guías de arquitectura.

## [1.1.3] - 2026-07-27

### 🛡️ **File Store Unificado por Tenant + Backups**
- **Backend (`main.ts`, `whatsapp-catalog-admin.controller.ts`):**
  - Uploads de imágenes del catálogo ahora se guardan en `uploads/whatsapp-catalog/{tenantId}/{filename}` (aislado por tenant).
  - Agregado endpoint `POST /api/v1/whatsapp-catalog/upload` para subir imágenes de banner/logo con validación de MIME y tamaño.
  - Servicio estático `/uploads` expuesto desde `process.cwd()/uploads` en `main.ts`.
- **Backend (`product-imports/scrapers/base-scraper.ts`):**
  - Unificada ruta de imágenes de proveedores a `uploads/suppliers/{tenantId}/{supplierSlug}/{filename}`.
  - URLs públicas ahora usan `/uploads/suppliers/...` en vez de `/static/uploads/suppliers/...`.
- **Backup (`scripts/backup-production.sh`):**
  - Ahora incluye backup comprimido del file store: `pre_deploy_{env}_{timestamp}_uploads.tar.gz`.
  - Incluye rollback env snapshot + verificación de tamaño para DB y archivos.
- **Verificación (`scripts/verify-backups.sh`):**
  - Ahora valida también backups `_uploads.tar.gz` (tamaño + integridad tar.gz).
- **Documentación:**
  - Creado `docs/BACKUP_RESTORE.md` con procedimientos de backup, restore y consideraciones multi-tier.
  - Actualizada regla de file store en `docs/00-contexto-agentes.md`: todos los archivos deben vivir bajo `uploads/{tenantId}/{module}/`.
  - Actualizado `.gitignore` para excluir `uploads/` del repositorio.

## [1.1.2] - 2026-07-27

### 🐛 **Fix: Envío de pedido por WhatsApp sin contenido**
- **Frontend (`whatsapp-checkout.tsx`):**
  - Corregido botón flotante mobile sticky que solo abría WhatsApp sin enviar el mensaje: ahora ejecuta `form.validateFields().then(handleConfirmOrder)` para generar el mensaje completo.
  - Agregado `name="deliveryAddress"` al `TextArea` de dirección para que `values.deliveryAddress` llegue al cuerpo del mensaje.
- **Backend (`public-orders.controller.ts`):**
  - Sigue usando los mismos endpoints, pero ahora el frontenv envía correctamente `subdomain` o `apiKey` resuelto, sin hardcodear claves.

### 🚀 **Admin: Administración del Catálogo WhatsApp**
- **Backend (`whatsapp-catalog.service.ts`, `whatsapp-catalog-admin.controller.ts`):**
  - Agregados endpoints de productos del catálogo: `GET/POST/PUT/DELETE /api/v1/whatsapp-catalog/products` y `GET/PUT /api/v1/whatsapp-catalog/page-config`.
  - CRUD de productos del catálogo con permisos `whatsapp-catalog:read` y `whatsapp-catalog:manage`.
  - Mapeo de `Decimal` a `number` para precios y campos extendidos de producto.
- **Backend (`schema.prisma`):**
  - Agregado campo `order Int` en modelo `Product` para ordenamiento personalizado.
- **Frontend (`admin/whatsapp-catalog.tsx`):**
  - Extendido panel de administración con pestaña **Productos** (tabla + crear/editar/eliminar).
  - Pestaña **Página y Configuración** mantiene toda la configuración de contacto, envíos, zonas, banner, logo y plantilla de mensaje.
  - El Tenant Admin ahora puede editar completamente la página pública y gestionar su inventario del catálogo sin salir del admin.

### 🔧 **Fix resolución de tenant en checkout**
- **Frontend (`whatsapp-checkout.tsx`):**
  - Eliminada API key hardcodeada del checkout.
  - Ahora resuelve tenant por `subdomain`, query param o `apiKey` tenant config, igual que el catálogo público.

## [1.1.1] - 2026-07-27

### 🐛 **Fix: Catálogo WhatsApp vacío para tenants resueltos por subdominio alias**
- **Frontend (`whatsapp-catalog.tsx`):**
  - Eliminada API key hardcodeada de Provecchio Di Mora como fallback.
  - Ahora prioriza `subdomain` cuando `tenantConfig` fue resuelto por subdominio Traefik.
  - Solo usa `apiKey` como fallback cuando no hay subdominio disponible.
- **Backend (`tenants.controller.ts`):**
  - Expones `subdomain` en la respuesta pública `GET /api/v1/tenants/public/tenant-by-subdomain/:subdomain`.
- **Troubleshooting:** Agregado incidente y resolución en `docs/troubleshooting/01-traefik-routing-and-spa-cache.md`.

---

## [1.1.0] - 2026-07-26

### 🚀 **Microservicios Standalone & Extracción de Arquitectura**
- **Microservicio `whatsapp-catalog-standalone`**:
  - Extraído el módulo de catálogo WhatsApp a `services/whatsapp-catalog-standalone` como servicio autónomo expuesto en puerto `3021`.
  - Integrado con la librería interna `@orderflow/auth-shared` para validación multi-tenant compartida de tokens JWT y API Keys.

### 🛡️ **Soft-Delete de Tenants & Retención de Datos**
- **Modelo de Retención de 30 Días**:
  - Agregados los campos `softDeleted` y `deletedAt` en el modelo `Tenant` de Prisma.
  - Endpoint `DELETE /api/v1/tenants/:id` actualizado a Soft-Delete (desactiva el tenant sin borrar datos físicamente).
  - Creado el endpoint `POST /api/v1/tenants/:id/restore` para restauración inmediata.
  - Creado el endpoint `DELETE /api/v1/tenants/:id/hard-delete` de eliminación física definitiva restringido exclusivamente al SuperAdmin.

### 📡 **Escalado Horizontal de WebSockets (Redis IoAdapter)**
- **`RedisIoAdapter` Socket.io**:
  - Integrado `@socket.io/redis-adapter` e `ioredis` en NestJS bootstrap (`main.ts`).
  - Sincronización en tiempo real Pub/Sub entre réplicas de KDS y POS con fallback automático a memoria.

### 🏬 **App Store Marketplace & Buscador en Tiempo Real**
- **Filtro en Tiempo Real**:
  - Incorporado buscador dinámico `Input.Search` en la App Store (`/admin/modules`).
  - Filtro por nombre, categoría y descripción en tiempo real.

---

## [1.0.0] - 2026-07-25

### ☸️ **Estructura Kubernetes & Helm (v2.0.0 Ready)**
- **Arquitectura de Helm Charts Preparada (`k8s/`)**:
  - Creado el directorio `k8s/` con la estructura completa de Helm Charts en `k8s/helm/orderflow-core` y `k8s/helm/microservices`.
  - Archivos `Chart.yaml`, `values.yaml` y la guía operativa [k8s/README.md](file:///opt/orderflow/k8s/README.md) listos para desplegar en clusters Kubernetes cuando el servidor requiera autoscaling horizontal masivo.

### 🏆 **RELEASE COMERCIAL HISTÓRICO v1.0.0 — OrderFlow SaaS Platform**
- **Plataforma Omnicanal Multi-Tenant & Multi-Tier**:
  - Infraestructura completa con aislamiento de datos `Shared` y `Dedicated PostgreSQL` por tenant Enterprise.
- **Billing SaaS & Facturación Automática**:
  - Motor de suscripciones recurrentes integrado con `Stripe` y `Mercado Pago`, cálculo global de MRR/ARR y suspensión automática por impago en `TenantThrottlerGuard`.
- **Portal de Suscripción Self-Service del Cliente**:
  - Panel interactivo en `/admin/subscription` para cambiar de plan y elegir preferencia de base de datos dedicada.
- **Marketplace & Plugin SDK para Terceros**:
  - Registro de extensiones certificadas de desarrollo independiente (`MarketplaceModule`).
- **White-Label & Multi-Language (i18n)**:
  - Personalización total de marcas, dominios custom, favicons, títulos y soporte multi-idioma (Español 🇪🇸, Inglés 🇺🇸, Portugués 🇧🇷).
- **Conectores ERP Enterprise & Microservicios Standalone**:
  - Integración nativa con Odoo 19 CE, MIDA y SAP ERP, junto a 3 microservicios desacoplados (`giveaways`, `whatsapp-catalog`, `biolinks`).

### 🔒 **RBAC Granular Ampliado (Seguridad)**
- **Nuevos Guardias y Permisos**:
  - `ContactsController`: endpoints de contactos protegidos con `contacts:read`, `contacts:create`, `contacts:update`, `contacts:delete`.
  - `LoyaltyController`: tarjetas y reglas protegidas con `loyalty:read` y `loyalty:manage`.
  - `IntegrationsController`: integraciones y sincronización Odoo protegidas con `integrations:read` e `integrations:manage`.
  - Mocks de `PermissionsGuard` y `RbacService` incorporados a todas las suites unitarias para mantener el 100% de tests verdes (340 tests).

## [0.8.0] - 2026-07-25

### 🔌 **Integraciones ERP Enterprise (MIDA / SAP)**
- **Conectores ERP MIDA & SAP Enterprise**:
  - Extendido `IntegrationsService` para dar soporte nativo a pruebas de conectividad y sincronización de eventos webhooks con sistemas ERP MIDA y SAP.

### 🌍 **Internacionalización & Multi-Idioma (v1.0.0 Target)**
- **Infraestructura Multi-Language i18n**:
  - Configurado `i18n.ts` con diccionario de traducción completo para Español 🇪🇸, Inglés 🇺🇸 y Portugués 🇧🇷.
  - Componente global `LanguageSelector.tsx` integrado en la barra de navegación del Admin Dashboard permitiendo alternar idioma en tiempo real con persistencia en `localStorage`.

### 🚀 **RELEASE OFICIAL v0.8.0 — Marketplace SDK, White-Label & Billing SaaS**
- **Suscripciones & Billing SaaS Engine (`BillingModule`)**:
  - Gestión de los 4 planes SaaS (`FREE`, `STARTER`, `PRO`, `ENTERPRISE`) y procesamiento de webhooks para pasarelas de pago (`Stripe` y `Mercado Pago`).
  - Endpoint de consulta de suscripción `GET /api/v1/billing/subscription` y cambio de plan `POST /api/v1/billing/subscribe`.
  - Endpoint global de métricas MRR/ARR `GET /api/v1/billing/metrics/mrr` para SuperAdmin.
- **Mecanismo de Suspensión Automática por Impago**:
  - `TenantThrottlerGuard` bloquea automáticamente con `403 Forbidden` a cuentas en estado `SUSPENDED` por impago.
- **Portal de Suscripción del Cliente (Frontend)**:
  - Creada la página `subscription.tsx` en `/admin/subscription` con tarjetas comparativas y modal interactivo de upgrade/downgrade.
  - Selección self-service entre Base de Datos Compartida (`Shared`) y Dedicada (`Dedicated PostgreSQL`).
- **Marketplace & Plugin SDK para Desarrolladores (`MarketplaceModule`)**:
  - Registro dinámico de plugins de terceros con endpoints `GET /api/v1/marketplace/plugins`, `POST /api/v1/marketplace/install` y `POST /api/v1/marketplace/register`.
- **White-Label Completo**:
  - Extendido `BrandingProvider.tsx` para inyectar dinámicamente el `document.title` y el `favicon` personalizado del tenant, eliminando marcas de OrderFlow al activar `removeOrderflowBranding`.
- **Cobertura de Pruebas**:
  - Suite de backend ampliada a **349 tests unitarios aprobados en 45 test suites (100% éxito)** y **14 tests E2E de Playwright**.

## [0.7.0] - 2026-07-25

### 💳 **Billing SaaS & Métricas Financieras (v1.0.0 Target)**
- **Self-Service Multi-Tier Database Selection**:
  - Habilitada la selección interactiva entre Base de Datos Compartida (`Shared`) y Dedicada (`Dedicated PostgreSQL`) en el modal de suscripción del Portal de Cliente.
- **White-Label Completo (Frontend & Branding)**:
  - Extendido `BrandingProvider.tsx` para inyectar dinámicamente el `document.title` y el `favicon` personalizado del tenant.
  - Soporte para la bandera `removeOrderflowBranding` ocultando menciones de marca de OrderFlow en la vista del cliente.
- **Marketplace & Plugin SDK para Desarrolladores (v0.8.0-dev)**:
  - Creado `MarketplaceModule` (`MarketplaceController` y `MarketplaceService`) para ofrecer un Registro de Plugins de terceros.
  - Endpoints `GET /api/v1/marketplace/plugins` (catálogo disponible), `POST /api/v1/marketplace/install` (instalación por tenant) y `POST /api/v1/marketplace/register` (SDK para desarrolladores terceros).
  - Cobertura de 4 tests unitarios adicionales en `marketplace.controller.spec.ts` elevando la suite a **349 tests unitarios aprobados (100%)**.
- **Mecanismo de Suspensión por Impago**:
  - `TenantThrottlerGuard` verifica el estado de la suscripción del tenant en cada petición backend y bloquea con `403 Forbidden` a cuentas en estado `SUSPENDED`.
- **Portal de Suscripción del Cliente (Frontend)**:
  - Creada la página `subscription.tsx` con carga diferida (`React.lazy`) en `/admin/subscription`.
  - Tarjetas comparativas de precios, límites y características por plan (`FREE`, `STARTER`, `PRO`, `ENTERPRISE`).
  - Modal interactivo de upgrade/downgrade con selección de pasarela preferida (Stripe / Mercado Pago) e indicador de aislamiento de base de datos (`shared` vs `dedicated`).
- **Nuevo Módulo `BillingModule`**:
  - `BillingController` y `BillingService` integrados al backend para gestionar planes SaaS (`FREE`, `STARTER`, `PRO`, `ENTERPRISE`) y procesar eventos webhooks de pasarelas de pago (`Stripe`, `Mercado Pago`).
  - Endpoint de consulta de suscripción `GET /api/v1/billing/subscription` y cambio de plan `POST /api/v1/billing/subscribe`.
  - Endpoint global de métricas MRR (Monthly Recurrent Revenue) y ARR (Annual Recurrent Revenue) `GET /api/v1/billing/metrics/mrr` para el SuperAdmin.
  - Cobertura de 5 tests unitarios aprobados en `billing.controller.spec.ts` elevando la suite a **345 tests pasar exitosamente**.

### 🚀 **RELEASE OFICIAL v0.7.0 — Multi-Tier Isolation & Microservicios Standalone**
- **Multi-Tier Isolation (Bases de Datos Dedicadas por Tenant Enterprise)**:
  - Soporte completo para tenants `shared` (DB principal) y `dedicated` (PostgreSQL aislada).
  - Inyección dinámica `@TenantPrisma()` mediante `TenantConnectionManager`.
  - Script de aprovisionamiento automatizado `scripts/provision-dedicated-db.sh`.
  - Super Admin Dashboard habilitado con control visual y endpoint `PATCH /tenants/:id/isolation-tier`.
- **Microservicios Standalone Desacoplados**:
  - Librería compartida `@orderflow/auth-shared` compilada en TypeScript.
  - Microservicio standalone `giveaways-standalone` (`:3020`).
  - Microservicio standalone `whatsapp-catalog-standalone` (`:3021`).
  - Microservicio standalone `biolinks-standalone` (`:3022`).
  - Routers dinámicos integrados en **Traefik v3.3**.
- **Calidad & Integración Continua**:
  - Pruebas de carga con k6 integradas automáticamente en GitHub Actions CI/CD (`.github/workflows/ci-cd.yml`).
  - Cobertura total de 340 tests unitarios y 14 tests E2E con Playwright.
- **Librería Compartida `@orderflow/auth-shared`**:
  - Creado paquete npm interno `packages/auth-shared/` con utilidades compiladas de validación unificada de JWT (`verifyJwtToken`) y API Keys (`validateApiKeyHeader`).
- **Microservicio Standalone `giveaways-standalone`**:
  - Creada estructura base `services/giveaways-standalone/` para empaquetar y comercializar el módulo de Sorteos de forma independiente del monolito.
  - Incluye `docker-compose.yml` dedicado para ejecución standalone en puerto `3020`.
- **Segundo Microservicio Standalone `whatsapp-catalog-standalone`**:
  - Creada la estructura base `services/whatsapp-catalog-standalone/` para comercializar el catálogo interactivo de WhatsApp de forma autónoma.
  - Incluye su `docker-compose.yml` desacoplado expuesto en el puerto `3021`.
- **Integración Continua & Pruebas de Carga (k6 en CI/CD)**:
  - Añadido el job `test-k6-load` a la pipeline de GitHub Actions (`.github/workflows/ci-cd.yml`) ejecutando automáticamente smoke tests de rendimiento de latencia con `grafana/k6-action`.

### ⚡ **Multi-Tier Tenant Isolation (DB Dedicada por Tenant Enterprise)**
- **Aislamiento Multi-Tier Backend**:
  - `ApiKeyGuard` inyecta automáticamente `req.tenantPrisma` resolviendo entre DB compartida (`shared`) y DBs dedicadas enterprise (`dedicated`) vía `TenantConnectionManager`.
  - Inyector `@TenantPrisma()` preparado para controladores del sistema.
- **Endpoint de Asignación de Tier**:
  - `PATCH /api/v1/tenants/:id/isolation-tier` para promover o revertir el tier de un tenant (`shared` / `dedicated`) especificando la conexión `dedicatedDatabaseUrl`.
- **Script de Aprovisionamiento**:
  - Creado `scripts/provision-dedicated-db.sh` para la creación automatizada de bases de datos PostgreSQL independientes y aplicación del schema Prisma (`prisma db push`).
- **Super Admin Dashboard (Frontend)**:
  - Nueva columna y etiqueta visual `DB Tier` (`💎 Dedicated` vs `👥 Shared`) en la tabla de gestión de tenants (`super-admin-dashboard.tsx`).

### ⚡ **Escalabilidad, Performance UX & Cobertura E2E**

#### 🎉 Features & Performance
- **Integración de Redis 7 en Infraestructura**:
  - Incorporación de Redis 7 (`redis:7-alpine`) en `docker-compose.yml` con volumen persistente (`redis_data`) y healthchecks.
  - Habilitado para rate-limiting distribuido y adaptación horizontal de WebSockets KDS/POS.
- **Índices de Base de Datos de Alto Rendimiento**:
  - Índices compuestos agregados en Prisma schema: `orders` (`tenantId, createdAt, status` y `tenantId, customerId`) y `products` (`tenantId, active`).
  - Optimización de latencia en consultas del KDS, POS e historial de clientes.
- **Optimización UX & Frontend Bundling**:
  - Implementado *Code Splitting* mediante `React.lazy` y `<Suspense>` en `AdminApp.tsx`.
  - Carga bajo demanda de módulos de administración (POS, KDS, Sorteos, Bio-Links, Presupuestos), reduciendo la huella del bundle inicial.

#### 🧪 Testing & Calidad
- **Expansión E2E con Playwright**:
  - `frontend/e2e/app.spec.ts` ampliado a **14 tests E2E pasando (100% de éxito)**.
  - Cobertura de rutas públicas, auth guards y navegación de POS, KDS y Bio-Links.
- **Seguridad & Gestión de Secretos**:
  - Exclusión estricta de archivos de credenciales (`client_secret*.json`, `*.pem`, `*.key`) en `.gitignore`.

---

## [0.5.1] - 2026-07-19

### ✅ **Observabilidad avanzada & E2E**

#### 🎉 Features Agregadas
- **Métricas avanzadas en `MetricsModule`:**
  - HTTP request total, duration y errores con `tenant_id`.
  - Contadores de negocio: orders, bookings, Bio-Link clicks, webhooks activos, colas.
  - Endpoint `/metrics` mantenido y documentado.

- **Logs estructurados para Loki:**
  - Winston JSON con `tenantId`, `requestId`, `traceId`, `context`, `timestamp`.
  - Transporte diario rotado (`logs/orderflow-*.log`) y consola para desarrollo.

- **Stack avanzado documentado:**
  - `docs/observability/README.md`
  - `docs/observability/loki-config.md`
  - `docs/observability/grafana-dashboards.md`
  - `docker-compose.observability.yml` (Loki, Tempo, Grafana, Promtail, Alertmanager)
  - Dashboard JSON inicial: `docs/observability/dashboards/tenant-overview.json`

- **Backend E2E seed:**
  - Datos mínicos en `backend/test/e2e/seed.ts` para pruebas reproducibles.

- **API Keys - Seguridad inicial:**
  - Endpoints `POST /api/v1/tenants/:id/api-key/rotate` y `/revoke`.
  - Auditoría en `ApiKeyRotation` y `ApiKeyAuditLog`.
  - Rate limit por tenant con `TenantThrottlerGuard`.

- **API Keys - Rotación automática programada:**
  - `ApiKeyRotationSchedulerService` rota API keys cada 90 días vía `@Cron`.
  - Sincroniza nuevas claves con integraciones Odoo activas.
  - Registra rotaciones en `ApiKeyRotation` y `ApiKeyAuditLog`.

- **API Keys - Sincronización automática con Odoo:**
  - `IntegrationsService.syncApiKeyToOdooIntegrations` actualiza `orderflow_connector.api_key` en Odoo.
  - Nuevo endpoint en `odoo-adapter`: `POST /odoo/update-connector-api-key`.
  - Documentado flujo post-rotación en `docs/ODOO_INTEGRATION_GUIDE.md`.

- **k6 smoke / carga continua:**
  - Ampliación de `scripts/k6-load-test.js` con escenarios de login, health, products, customers, orders y order-create.
  - Ampliación de `scripts/k6-biolinks-smoke.js` con health, bio 404 y productos públicos.

- **Grafana + Loki + Tempo:**
  - Stack completo integrado en `docker-compose.prod.yml`.
  - Servicios: loki, tempo, grafana, promtail, alertmanager.
  - Dashboards provisionados en `docs/observability/dashboards/`.

- **RBAC granular:**
  - `RbacService` con catálogo de permisos y seed inicial.
  - `PermissionsGuard` + decorador `@RequirePermissions()`.
  - Modelos Prisma: `Permission`, `RolePermission`, `UserTenantPermission`.
  - Integración en `AppModule` y endpoints protegidos en `ProductsController`.

- **Auditoría completa:**
  - Modelo Prisma `AuditLog` para eventos genéricos de auditoría.
  - `AuditService` con scope request para registrar acciones, recursos y cambios.

- **RBAC granular:**
  - `RbacService` con catálogo de permisos y seed inicial.
  - `PermissionsGuard` + decorador `@RequirePermissions()`.
  - Modelos Prisma: `Permission`, `RolePermission`, `UserTenantPermission`.

- **Playwright E2E suite:**
  - Expansión de `frontend/e2e/app.spec.ts` con rutas públicas y admin.
  - Cobertura inicial de landing, login, storefront, WhatsApp catalog, Bio-Links, checkout y redirecciones de admin.

- **Backup verificado + DRP documentado:**
  - `scripts/verify-backups.sh` valida integridad de backups SQL.
  - Documento `docs/DRP.md` con procedimientos de recuperación por entorno.

- **Secretos gestionados:**
  - `SecretsValidationService` valida secrets críticos al iniciar la app.
  - Detección de secrets débiles o faltantes en `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `MASTER_API_KEY`.

- **RBAC granular propagada a controllers críticos:**
  - `OrdersController`: `orders:create`, `orders:read`, `orders:update`, `orders:delete`.
  - `CustomersController`: `customers:create`, `customers:read`, `customers:update`, `customers:delete`.
  - `BookingsController`: `bookings:create`, `bookings:read`, `bookings:update`, `bookings:delete`, `bookings:manage`.
  - `GiveawaysController`: endpoints públicos preservados; admin endpoints protegidos con `giveaways:read/create/update/delete/manage`.
  - `UsersController`: `users:read`, `users:invite`, `users:manage`.
  - Tests actualizados con mocks de `PermissionsGuard` y `RbacService`.

- **Provecchio Backup & Restore:**
  - Created `scripts/restore-provecchio.sh`: parses NDJSON backup, transforms data for new multi-tenancy DDL, generates restore SQL with `isolationTier='shared'`.
  - Created `scripts/update-provecchio-version.sh`: updates Provecchio tenant to stable OrderFlow version (runs migrations, updates VERSION file, refreshes schema version in DB, clears caches).
  - New migration `20260729170000_add_tenant_multitier_isolation`: adds `isolationTier`, `dedicatedDatabaseUrl`, `dedicatedSchemaVersion` columns to `tenants` table.
  - Backup files at `/home/marcelompz/backups_sorteo/`: `giveaway_full_data.json` (NDJSON with registrations, winners, giveaway data) and `giveaway_backup_20260729_154949.sql` (DDL schema).

- **App Store / Marketplace (Super Admin Panel):**
  - RBAC granular en `SystemModulesController`: permisos `modules:read`, `modules:install`, `modules:uninstall`, `modules:configure`.
  - DTOs con `class-validator` para todos los endpoints de módulos.
  - Auditoría de acciones de módulos via `AuditService` (install, uninstall, toggle, config, update, readme).
  - Auto-instalación de dependencias faltantes usando `ModulesRegistry.getInstallOrder()`.
  - Frontend `modules.tsx`: loading states por acción, remoción de master key hardcodeada.

#### 📚 Documentación
- `AGENTS.md`: actualizada sección de DevOps con observabilidad avanzada.
- `ROADMAP.md`: observabilidad marcada como inicial.

---

## [0.5.0] - 2026-07-18

### ✅ **Traefik v3.3 Exclusivo, Redirecciones HTTPS & App Store Fixes**

#### 🔧 Infraestructura & Traefik v3.3
- **Redirección Global HTTP ➔ HTTPS (Puerto 80)**: Configurado `http.redirections` permanente (HTTP 308) en el entryPoint `web` de Traefik v3.3.
- **Sintaxis de Dominios Traefik v3**: Corregida sintaxis de exclusión en reglas `!Host(...)` para routers de tenants en `services.yml`.
- **Integración con Cloudflare Universal SSL**: Configuración validada en modo `Full (Strict)` con `Always Use HTTPS: ON` y renovación automática de certificados Let's Encrypt mediante el desafío `DNS-01` con `CLOUDFLARE_API_TOKEN`.

#### 🐛 Bug Fixes
- **App Store / Manifiestos de Módulos en Docker (`/admin/modules`)**:
  - `ModulesRegistry.loadAll()` mejorado con un algoritmo de evaluación de candidate paths (`src/`, `dist/`, `__dirname`, `__dirname/src/`).
  - Solucionado el problema donde los manifiestos JSON no se encontraban en imágenes Docker de producción (`node:22-alpine` multi-stage build sin `/app/src`).
- **Navegación y Redirección en `/config`**:
  - `ApiKeyConfig.tsx`: Se reemplazaron rutas obsoletas (`/spa`, `/retail`) por redirecciones hacia el Panel Admin (`/admin`) o la Tienda (`/tienda`).
- **Acceso SuperAdmin al Menú de Integraciones**:
  - `AdminApp.tsx`: Garantizada la visibilidad constante de **Integraciones (`/admin/integrations`)** y herramientas clave para el rol SuperAdmin en la barra lateral.

#### 📚 Documentación
- `docs/troubleshooting/02-production-docker-manifests-and-ssl-redirects.md` — Guía de troubleshooting para Docker producción, SSL y menú SuperAdmin.
- `AGENTS.md` — Actualizadas las normas de arquitectura exclusiva de Traefik v3.3 y la preservación de datos en migraciones de Odoo 19 CE.

---

## [0.5.0-alpha.2] - 2026-07-19

### ✅ Bio-Links Ajuste a Especificación (sugerencias_bio-links.md)

#### 🎉 Features Agregadas
- **Backend alineado a especificación:**
  - Ruta pública corregida: `GET /api/v1/bio/:slug` (sin `/public` intermedio).
  - CRUD admin por ID: `GET /:id/detail`, `PATCH /:id`, `DELETE /:id`.
  - Cache Redis con prefijo `cache:biolink:<slug>` y TTL 3600s.
  - Invalidación de cache en mutaciones (`upsert`, `update`, `delete`).
  - `BioLinkClick` para analytics de clics.

- **Frontend Admin:**
  - Drag & Drop nativo en lista de bloques (eventos HTML5) con reordenamiento y persistencia de `order`.
  - Bloque BOOKING agregado al wizard con selector de servicios (`/v1/bookings/services`).
  - Preview smartphone reactiva manteniendo tema, avatar y bloques.

- **Frontend Público:**
  - Ruta pública consumiendo `/v1/bio/:slug`.
  - Soporte de bloque BOOKING en Fast Checkout Drawer (campo de fecha/hora).
  - Tracking de clics a `/v1/bio/:slug/click`.

- **Testing:**
  - 23 unit tests pasando en `biolinks.service.spec.ts` y `biolinks.controller.spec.ts`.
  - Cobertura de cache, CRUD por ID, clicks, orden desde Bio-Link.

#### 🔧 Refactor
- `CreateBioLinkDto` ahora es completamente opcional para updates parciales.
- Se agregó método `getById` y `updateBioLink`/`deleteBioLink` en servicio.
- Controller admin renombrado de `getConfig/updateConfig` a `getById/updateById` manteniendo `/config` como alias legacy.

---

## [0.4.3] - 2026-07-16

### ✅ Testing Expansion

#### 🎉 Testing Unitario
- **Expansión de cobertura de controllers**
  - `orders.controller.spec.ts`: 8 tests
  - `products.controller.spec.ts`: 7 tests
  - `users.controller.spec.ts`: 8 tests
  - `bookings.controller.spec.ts`: 17 tests
  - `integrations.controller.spec.ts`: 7 tests
  - `giveaways.controller.spec.ts`: 12 tests
  - `contacts.controller.spec.ts`: 9 tests
  - `loyalty.controller.spec.ts`: 6 tests
  - `quotations.controller.spec.ts`: 3 tests
  - `whatsapp-catalog.controller.spec.ts`: 2 tests
  - `backups.controller.spec.ts`: 4 tests
  - `health.controller.spec.ts`: 2 tests
  - `root-health.controller.spec.ts`: 1 test
  - `metrics.controller.spec.ts`: 1 test
  - `public-products.controller.spec.ts`: 2 tests
  - `public-storefront.controller.spec.ts`: 5 tests
  - `sync-products.controller.spec.ts`: 6 tests
  - `public-orders.controller.spec.ts`: 1 test
  - `notifications.controller.spec.ts`: 2 tests
- **Total:** 298 tests passing, 39 test suites
- **Fix pre-existentes:**
  - `customers.controller.spec.ts`: corregidos argumentos invertidos en `syncCustomers`
  - `notifications.controller.ts`: tipado de `@Request()` arreglado, tests agregados
  - Regeneración de Prisma Client para resolver `pushToken`

#### 🔧 Refactor
- Prisma Client regenerado para alinear tipos con `schema.prisma`

---

## [0.4.2] - 2026-07-15

### ✅ Tauri Desktop Wrapper + Observabilidad

#### 🎉 Features Agregadas
- **Tauri Desktop Wrapper para POS**
  - Estructura inicial en `desktop/` con Vite + React.
  - Comandos nativos Rust: impresión ESC/POS (`/dev/usb/lp*`), `toggle_fullscreen`, `set_always_on_top`.
  - Shortcuts globales registrados desde Rust y consumidos desde el frontend.
  - Iframe embebido apuntando a `https://pesallaccia.com/admin/pos` con toolbar nativa.

- **Observabilidad**
  - Backend Sentry: traces/replays configurados en `instrument.ts` con DSN por env.
  - Frontend Sentry: integrado via `SentryModule` + `SentryExceptionFilter`.
  - Prometheus `/metrics` endpoint con `prom-client` (histogramas de HTTP, contadores de órdenes y bookings).

#### 🔧 Refactor
- Dominio configurable backend/frontend (`ROOT_DOMAIN`, `VITE_ROOT_DOMAIN`, `VITE_SYSTEM_SUBDOMAINS`).
- White-label en páginas públicas: removido branding OrderFlow de footers.

---

## [0.4.1] - 2026-07-15

### ✅ Fixes Producción + Dominio Configurable

#### 🐛 Bug Fixes
- **Traefik producción** - Corregidos nombres de servicios en `/srv/traefik/dynamic/services.yml`
  - `orderflow-prod-frontend` → `http://orderflow-frontend-1:80`
  - `orderflow-prod-backend` → `http://orderflow-backend-1:3010`
  - `orderflow-staging-frontend` → `http://orderflow-staging-frontend-1:80`
  - `orderflow-staging-backend` → `http://orderflow-staging-backend-1:3010`
- **Backend crash loop** - Corregido `POSTGRES_PASSWORD` en `.env` que tenía placeholder en vez de la credencial real de producción.
- **Frontend login no redirigía** - El backend estaba en restart loop por Prisma `P1000`; una vez fijada la DB, el login funciona correctamente.

#### 🔧 Refactor
- **Dominio configurable en backend** (`CloudflareDnsService`, `TenantsController`, `main.ts`)
  - Nuevas variables: `ROOT_DOMAIN` (fallback `DOMAIN_NAME`, fallback `pesallaccia.com`).
  - CORS dinámico según `ROOT_DOMAIN`.
- **Dominio configurable en frontend**
  - Nuevas variables: `VITE_ROOT_DOMAIN`, `VITE_SYSTEM_SUBDOMAINS`.
  - `App.tsx`: detecta subdominios de tenant usando `VITE_ROOT_DOMAIN` y excluye subdominios de sistema (`orderflow`, `www`, `staging`).
  - `PublicStorefrontPage.tsx`: usa `VITE_ROOT_DOMAIN` para construir el hostname del tenant.
  - Sin autenticación: muestra `OrderFlowLandingPage` en vez del warning anterior.
- **Landing page generalizada**
  - Eliminadas referencias hardcodeadas a empresas reales (Gaia Spa, Repuestos Enciso).
  - Links actualizados a rutas genéricas (`/tienda`, `/landing`).

#### 📚 Documentación
- `docs/guides/GUIA_DESPLIEGUE_Y_TENANTS.md` - Actualizada para reflejar que `/srv/traefik/` ya existe y contiene configuración multi-tenant; eliminado paso de crear desde cero.
- `docs/guides/GUIA_DESPLIEGUE_SERVIDORES.md` - Aclarado que el backend se accede por path `/api` sobre el dominio principal (no por `api.pesallaccia.com`); eliminadas referencias hardcodeadas a Nginx.
- `docs/info/verificacion-produccion.md` - Nuevo archivo con verificación de producción.

#### 🔒 Seguridad
- Credenciales de producción centralizadas en `.env.prod`; `.env` sincronizado con valores reales.
- Eliminada exposure de nombres de empresas reales en docs de demo y credenciales.

---

## [0.4.0] - 2026-07-14

### ✅ **POS / KDS / Loyalty / Subdominios — Sprint 3**

#### 🎉 Features Agregadas
- **Punto de Venta (POS) Web**
  - Modo Mozo (agregar ítems a mesas activas) y Modo Caja (cobro centralizado).
  - Diseño offline-first con Dexie.js (IndexedDB) y Zustand sync queue.
  - Búsqueda rápida de productos, categorías y modificadores contextuales.

- **Pantalla de Cocina (KDS) en Tiempo Real**
  - WebSocket Gateway (`OrdersGateway`) en namespace `/orders` con aislamiento por sala `tenant:<tenantId>`.
  - Eventos `order:new` y `order:status_updated` para transmisión instantánea de comandas.
  - Semáforo de criticidad por tiempo: 🟩 Normal (0-10 min), 🟨 Alerta (10-20 min), 🟥 Crítico (20+ min con parpadeo).

- **Transición de Estado de Órdenes**
  - Nuevo endpoint `PATCH /api/v1/orders/:id/status` para control de cocina.
  - `OrderStatus` enum ampliado: `DRAFT`, `CONFIRMED`, `PREPARING`, `READY`, `DELIVERED`, `CANCELLED`.

- **Módulo de Fidelización (Loyalty) — Backend**
  - Controller con 5 endpoints: `GET /card/:customerId`, `GET /rules`, `POST /rules`, `PATCH /rules/:id`, `POST /redeem`.
  - Motor de acumulación automática de puntos en checkout (`awardPointsForOrder`).
  - Sistema de tiers: BRONZE → SILVER (500pts) → GOLD (2000pts) → PLATINUM (5000pts).
  - Auto-generación de tarjetas con código de barras único (`LC-[PREFIX]-[HASH]`).
  - Schema Prisma: `LoyaltyCard`, `LoyaltyTransaction`, `LoyaltyRule`.

- **Módulo de Fidelización (Loyalty) — Admin UI**
  - Panel de administración (`/admin/loyalty`) con KPIs, gestión de reglas (crear/activar/desactivar).
  - Consulta de tarjeta de fidelidad por cliente con historial de transacciones.
  - Canje de puntos desde el panel admin con validación de saldo.
  - Registrado en el menú lateral de AdminApp (condicional al módulo `loyalty`).

- **Subdominios Públicos por Tenant**
  - `PublicStorefrontPage`: storefront público que resuelve tenant por subdominio.
  - Cloudflare DNS automático al crear tenant (`cloudflare-dns.service.ts`).
  - Soporte para `https://<tenant>.pesallaccia.com` con DNS Only (Traefik SSL).

#### 🔧 Infraestructura
- Sentry frontend integrado (`SentryModule.forRoot()` en AppModule).
- ThrottlerModule: rate limiting global (100 req/min).
- ScheduleModule para cron jobs (@nestjs/schedule).

#### 📚 Documentación
- `docs/POS_KDS_ARCHITECTURE.md` — Arquitectura completa POS/KDS.
- `docs/06-pos-kds.md` — Guía de integración POS/KDS.
- `docs/07-uml-diagrams.md` — Diagramas UML del sistema.
- `docs/08-loyalty.md` — Documentación del módulo Loyalty.

---

## [0.3.1] - 2026-07-12

### ✅ Mejoras de Gestión de Tenants (Super Admin)

#### 🎉 Features Agregadas
- **Gestión de Tenants desde el dashboard Super Admin**
  - Botón **Deshabilitar / Habilitar** por tenant (`active` reversible) en la tabla de tenants.
  - Acción **Eliminar** tenant con confirmación de eliminación irreversible.
  - Botón **Crear Nuevo Tenant** funcional (modal) que muestra la API Key generada.
- **Autorización por rol `ADMIN`**
  - Un usuario con rol `ADMIN` (vía `UserTenantAccess`) puede gestionar los tenants a los que tiene acceso, sin requerir al Super Admin.
  - El Super Admin (`isSuperAdmin` por JWT o master API key) sigue gestionando cualquier tenant.
- **Nuevos endpoints de Tenants** (`backend/src/tenants/tenants.controller.ts`)
  - `PATCH /api/v1/tenants/:id/disable` → deshabilita (`active=false`).
  - `PATCH /api/v1/tenants/:id/enable` → rehabilita (`active=true`).
  - `DELETE /api/v1/tenants/:id` → eliminación definitiva (hard delete, con cascade).
  - `GET /api/v1/tenants` ahora devuelve también `businessName`, `industry`, `ecommerceEnabled` y `bookingsEnabled`.

#### 🔒 Seguridad
- `findAll`, `update`, `disable`, `enable` y `delete` de tenants validan `assertCanManageTenant`:
  Super Admin o `ADMIN` del tenant; cualquier otro rol recibe `403 Forbidden`.
- La creación de tenants (`POST`) se mantiene **pública** por diseño.

---

## [0.3.0] - 2026-07-06

### ✅ **COMPLETADO - Sprint 1**

#### 🎉 Features Agregadas
- **Swagger API Documentation 100%** - 65/65 endpoints documentados
  - Auth, Tenants, Users, Products, Orders, Giveaways, Contacts, Categories, Bookings, Quotations
  - Bearer JWT + API Key authentication configurada
  - Disponible en `http://localhost:3010/api/docs`

- **Staging Environment 100% Operativo**
  - Deploy en Hetzner VPS (`staging.provecchio.com`)
  - Nginx API proxy configurado
  - Database migrations graceful handling
  - Test user creado (`test@staging.com`)

- **Test Utilities**
  - `backend/test/utils/mocks.ts` con mocks reutilizables
  - `createPrismaMock()`, `createJwtMock()`, `createConfigMock()`
  - 7 tests unitarios pasando (35% coverage baseline)

#### 🐛 Bug Fixes
- **DB Migration Error** - Fix para `P3005 - schema is not empty` en staging
  - Creado `backend/entrypoint.sh` para migraciones graceful
  - Health check de database con netcat

- **Frontend API 404** - Nginx no proxyeaba `/api/*` al backend
  - Creado `frontend/frontend.conf` con API proxy config
  - Fix: `/api/*` → `http://orderflow-backend-prod:3010`

- **Build Docker con Tests** - Tests fallaban en production build
  - Creado `backend/tsconfig.build.json` excluyendo tests
  - Updated `Dockerfile.prod` para usar tsconfig.build

#### 📚 Documentación
- `docs/GOOGLE_OAUTH_FIX_SUMMARY.md` - OAuth fix summary
- `docs/GOOGLE_OAUTH_SETUP.md` - OAuth configuration guide
- `docs/PRODUCCION_DEPLOY_COMPLETE.md` - Production deployment guide
- `docs/STAGING_DEPLOYMENT_GUIDE.md` - Staging deployment step-by-step
- `docs/DAY_SUMMARY_2026-07-06.md` - Daily work summary

#### 🔧 Technical Debt
- **35% Test Coverage** - Baseline establecido
  - 7 tests passing en staging
  - Test utilities creadas para futuro crecimiento a 50%+

---

## [0.2.0] - 2026-06-22

### ✅ FASE 3 COMPLETADA

#### Features
- **Mobile Offline Mode** - React Native + Zustand persist
- **SQL Migration Engine** - Native SQL migrations con `{{TENANT_ID}}`
- **CI/CD Pipeline** - GitHub Actions con 3-ecosystem validation
- **Unit Tests Init** - 4 tests iniciales (ModulesRegistry, SystemModules)

#### Technical
- Modular architecture Odoo-style
- App Store UI para module management
- Dynamic module icons
- Git Flow versioning (MAJOR.MINOR.PATCH-PRERELEASE)

---

## [0.1.0] - 2026-06-15

### ✅ MVP INICIAL

#### Features
- Multi-tenant core con API key isolation
- Giveaway module con landing page
- WhatsApp catalog integration
- Basic authentication (API key only)

#### Technical
- NestJS + Prisma backend
- React + Refine.dev frontend
- PostgreSQL database
- Docker containers

---

## Versiones

| Versión | Fecha | Estado | Notas |
|---------|-------|--------|-------|
| **1.1.9** | 2026-07-31 | ✅ Released | Unificación de navegación & QA E2E integral |
| **1.7.0** | 2026-08-03 | ✅ Released | UX/UI Mobile-First & Ergonomía Intuitiva (Continuación) |
| **1.6.0** | 2026-08-03 | ✅ Released | Inicio del Plan de Refinamiento UX/UI para Escritorio |
| **1.5.2** | 2026-08-03 | ✅ Released | Análisis y Documentación del Ecosistema |
| **1.5.1** | 2026-08-02 | ✅ Released | Responsive UX/UI Backoffice + Traefik v3.4 (QA-001) |
| **1.1.8** | 2026-07-31 | ✅ Released | Homepage Visual Builder, Landing vs. Tienda routing |
| **1.1.7** | 2026-07-30 | ✅ Released | QA E2E Playwright Suite, Subdomain Resolution Fixes |
| **1.1.3** | 2026-07-27 | ✅ Released | File Store Unificado por Tenant + Backups + WhatsApp Catalog Admin |
| **1.1.2** | 2026-07-27 | ✅ Released | WhatsApp Catalog Admin, Checkout tenant resolution |
| **1.1.1** | 2026-07-27 | ✅ Released | WhatsApp Catalog subdomain resolution fix |
| **1.1.0** | 2026-07-26 | ✅ Released | Standalone Suite, Soft-Delete Tenants, Redis WebSockets |
| **1.0.0** | 2026-07-25 | ✅ Released | Commercial SaaS Release: Billing, Marketplace, White-label, i18n |
| **0.8.0** | 2026-07-25 | ✅ Released | ERP Integrations (MIDA/SAP), Multi-language i18n |
| **0.7.0** | 2026-07-25 | ✅ Released | Multi-Tier Isolation, 6 Microservicios Standalone, RBAC, k6 CI |
| **0.5.1** | 2026-07-19 | ✅ Released | Observabilidad avanzada, RBAC, E2E, API Key rotation |
| **0.5.0-alpha.2** | 2026-07-19 | 🚧 Alpha | Bio-Links ajuste a especificación |
| **0.5.0-alpha.1** | 2026-07-18 | 🚧 Alpha | Bio-Links backend + admin UI + public SPA + Fast Checkout |
| **0.5.0** | 2026-07-18 | ✅ Released | Traefik v3.3 + App Store fixes |
| **0.4.3** | 2026-07-16 | ✅ Released | Testing expansion: 298 tests / 39 suites |
| **0.4.2** | 2026-07-15 | ✅ Released | Tauri Desktop POS + Observabilidad (Sentry/Prometheus) |
| **0.4.1** | 2026-07-15 | ✅ Released | Fixes producción: Traefik, DB password, dominio configurable |
| **0.4.0** | 2026-07-14 | ✅ Released | POS/KDS WebSockets + Loyalty backend+UI + Subdominios |
| **0.3.1** | 2026-07-12 | ✅ Released | Gestión de tenants (disable/enable/delete) + rol ADMIN |
| **0.3.0** | 2026-07-06 | ✅ Released | Swagger 100% + Staging 100% + Tests 35% |
| **0.2.0** | 2026-06-22 | ✅ Released | Mobile offline + SQL migrations + CI/CD |
| **0.1.0** | 2026-06-15 | ✅ Released | MVP inicial |

---
