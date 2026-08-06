# Changelog

Todos los cambios notables en este proyecto se documentarán en este archivo.

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

## [1.2.0] - 2026-07-31

### 🔌 Integración Adaptador Multi-Tenant Tango ERP Gestión
- **Modelos de Datos Prisma**: Agregadas las tablas [`TangoTenantConfig`](file:///opt/orderflow/backend/prisma/schema.prisma) y [`TangoIdMap`](file:///opt/orderflow/backend/prisma/schema.prisma) con relación en cascada por `tenantId`.
- **Backend NestJS**: Implementado el módulo [`TangoModule`](file:///opt/orderflow/backend/src/integrations/tango/tango.module.ts) en [`backend/src/integrations/tango`](file:///opt/orderflow/backend/src/integrations/tango/):
  - Autenticación con cifrado AES-256 de credenciales y tokens JWT con cache por tenant (`tango.auth.service.ts`).
  - Cliente REST (`tango.client.ts`) para la API de Tango ERP.
  - Mapper bidireccional (`tango.mapper.ts`) para pedidos, clientes y stock.
  - Webhooks de sincronización de pedidos confirmados y sincronización masiva de stock por depósitos (`tango.service.ts`).
  - Endpoints protegidos por JWT / API Key (`tango.controller.ts`).
- **Control de Calidad**: Aprobación automatizada completa con `./scripts/init.sh`.

## [1.1.7] - 2026-07-30

### 🎭 QA E2E Rendering Suite & Solución de Subdominios Dinámicos
- **Suite QA E2E Playwright**: Creado el script [`scripts/qa_e2e_check.py`](file:///opt/orderflow/scripts/qa_e2e_check.py) para verificación E2E en navegador headless (cargado de DOM, eliminación de spinner `.ant-spin-spinning` y validación de categorías).
- **Integración al Pipeline Harness (`init.sh`)**: Incorporado el paso `[5/5]` en [`scripts/init.sh`](file:///opt/orderflow/scripts/init.sh) para ejecutar de forma obligatoria las pruebas E2E en el proceso de validación previa a cada deploy.
- **Resolución de Branding y Subdominios Dinámicos**:
  - Eliminado el fallback a Provecchio en [`frontend/src/components/tenant/BrandingProvider.tsx`](file:///opt/orderflow/frontend/src/components/tenant/BrandingProvider.tsx) cuando el subdominio es explícito.
  - Ajustado `objectFit: contain` y `padding: 8px` en el avatar del logo del catálogo ([`frontend/src/pages/whatsapp-catalog.tsx`](file:///opt/orderflow/frontend/src/pages/whatsapp-catalog.tsx)).
  - Homologado el subdominio `spa-wellness` en la base de datos de producción y actualizado el catálogo de Gaia Wellness a sus 3 categorías oficiales (`Aceites esenciales`, `Almohadillas terapéuticas`, `Difusores`).

## [1.1.5] - 2026-07-30

### 💬 WhatsApp Catalog UX & Guardias de Estabilidad en Frontend
- **Agrupación por Categorías en Tarjetas**: En [`frontend/src/pages/whatsapp-catalog.tsx`](file:///opt/orderflow/frontend/src/pages/whatsapp-catalog.tsx#L120-L360), se refactorizó la visualización de productos para agruparlos en tarjetas responsivas por categoría con imágenes de fondo personalizables.
- **Resolución de Banner y Logo de Tienda**: Vincularon la cascada de fallbacks desde la configuración del módulo (`whatsappConfig.bannerUrl`, `whatsappConfig.logoUrl`) hacia la marca general del tenant.
- **Guardias de Tipos en Panel Admin**: En [`frontend/src/AdminApp.tsx`](file:///opt/orderflow/frontend/src/AdminApp.tsx#L80-L95), se protegió la función `isModuleActive` contra valores no arreglos para prevenir excepciones de tipo `TypeError: l.some is not a function`.
- **Persistencia de Archivos Subidos**: En [`docker-compose.prod.yml`](file:///opt/orderflow/docker-compose.prod.yml#L60-L65), se declaró el volumen persistente `uploads_data:/app/uploads` y se configuró `helmet({ crossOriginResourcePolicy: false })` en NestJS para la entrega de assets de catálogo.
- **Resolución de Subdominios Multi-Tenant**: Sincronizado el subdominio `wellness` en base de datos e impulsada la resolución pública de `apiKeySecret` en `GET /api/v1/tenants/public/tenant-by-subdomain/:subdomain`.

### 🎁 Módulo Fidelización (Loyalty) & Corrección de Integración Frontend
- **Corrección de Endpoint de Clientes en Loyalty**: En [`frontend/src/pages/admin/loyalty.tsx`](file:///opt/orderflow/frontend/src/pages/admin/loyalty.tsx#L82-L90), se actualizó la solicitud de clientes desde `GET /api/v1/sync/customers` hacia el endpoint estándar `GET /api/v1/customers`.
- **Validación del Arnés de Calidad**: Aprobadas 50/50 test suites (389 tests pasados) y compilaciones limpias de NestJS y Vite TypeScript via `./scripts/init.sh`.

## [1.1.4] - 2026-07-29

### 🛡️ Diagnóstico, Homologación & Aislamiento de Infraestructura Provecchio
- **Homologación de Traefik en Provecchio**: Se renombró `/srv/traefik-orderflow` a `/srv/traefik` en `dimoraserverlocal` y se unificó en [`docs/00-contexto-agentes.md`](file:///opt/orderflow/docs/00-contexto-agentes.md).
- **Resolución de Error 502 API & Bucle 301**:
  - Conexión de `orderflow-backend-prod` a la red `traefik-public`.
  - Removida la redirección global rígida `:80 -> :443` en Traefik para prevenir bucles de redirección 301 (`NS_ERROR_REDIRECT_LOOP`) con Cloudflare Proxy.
  - Reparado el bucle de espera de base de datos en `entrypoint.sh` del contenedor backend.
- **Diagnóstico SSL, Redes & 502**: Creada y actualizada la guía técnica [`docs/troubleshooting/06-provecchio-traefik-ssl-and-502-diagnosis.md`](file:///opt/orderflow/docs/troubleshooting/06-provecchio-traefik-ssl-and-502-diagnosis.md).
- **Auditoría Integral del Sistema**: Generado el informe oficial de salud de pruebas (389 passing), builds y matriz de entornos en [`docs/AUDITORIA_COMPLETA_2026-07-29.md`](file:///opt/orderflow/docs/AUDITORIA_COMPLETA_2026-07-29.md).
- **Corrección de Dominios**: Actualización de [`docs/PUERTOS_ENTORNOS.md`](file:///opt/orderflow/docs/PUERTOS_ENTORNOS.md) alineando Hetzner (`pesallaccia.com`) y Provecchio In-House (`provecchio.com`).

## [0.4.0] - 2026-07-14

### 🏪 POS & KDS Integration (Real-Time WebSockets)

#### Backend
- **Prisma Schema Extended** - Añadidos los estados de preparación `PREPARING`, `READY` y `DELIVERED` al enum `OrderStatus`.
- **WebSocket Gateway (`OrdersGateway`)** - Implementado servidor de sockets en el namespace `/orders` con soporte para multi-tenancy. Agrupa a los clientes en salas independientes por ID de Tenant (`join:tenant`).
- **Real-Time Triggers** - `OrdersService` ahora inyecta el gateway y emite eventos en tiempo real:
  - `order:new` cuando un pedido es formalmente cobrado y cerrado.
  - `order:status_updated` cuando se actualiza el estado de preparación de un plato en cocina.
- **Nuevos Endpoints REST** - Añadida la ruta `PATCH /api/v1/orders/:id/status` para transicionar el estado de las comandas desde las pantallas del KDS.

#### Frontend
- **Punto de Venta Web (POS)** - Desarrollada la vista interactiva dual:
  * *Modo Mozo:* Carga de platos al carrito, buscador de catálogo, control de stock local y envío de comanda en estado `DRAFT` (pedido pendiente) asociada a una mesa.
  * *Modo Caja:* Grid interactivo de mesas ocupadas, visor del ticket detallado, aplicación de descuentos y cobro centralizado con selección de método de pago (Efectivo, Tarjeta, Transferencia).
- **Pantalla de Cocina (KDS)** - Desarrollada la interfaz táctil reactiva conectada al servidor por WebSockets:
  * Recibe comandas de mozos al instante.
  * Semáforo de criticidad por tiempo transcurrido (Verde <10m, Amarillo 10-20m, Rojo >20m).
  * Control de estados interactivo ("Empezar Cocción", "Marcar Listo", "Entregar a Mesa") para actualizar al mozo y liberar la comanda.
- **Indexación y Menú** - Integración en el panel administrativo de Refine en `/admin/pos` y `/admin/kds` e instalación del paquete `socket.io-client`.

#### DevOps
- Recompilación exitosa en Hetzner VPS de la imagen `orderflow-frontend-prod` y `orderflow-backend-prod` en Staging.

### 📅 Bookings & Quotations (Validation & Testing)

#### Backend
- **Bookings Unit Testing** - Implementados los tests unitarios en `bookings.service.spec.ts` cubriendo el 100% del servicio (sincronización de recursos, servicios, disponibilidad doble y creación de reservas atómicas).
- **Quotations Unit Testing** - Verificado y validado el paso de las pruebas unitarias de presupuestos (`quotations.service.spec.ts`) contra el motor de base de datos.

#### Frontend
- **Admin UI Activation** - Habilitadas y validadas las interfaces de usuario para la administración de Turnos/Profesionales (`/admin/bookings`) y Presupuestos (`/admin/quotations`).
- **SET/DNIT Integration** - Verificado el funcionamiento del autocompletado tributario en vivo con la DNIT de Paraguay desde el modal de creación de nuevos clientes.

## [0.2.0-beta.2] - 2026-07-05

### 🎨 Giveaway Registration Improvements
- **Video Background** - Contenido dentro del card (no pantalla completa)
  - Video movido 30% arriba para mostrar rostro
  - Overlay blanco 50% para mejor contraste de texto
  - Blur 6px + brightness 0.5

- **Text Contrast** - Todo el texto más oscuro
  - `textPrimary: #000000` (negro puro)
  - `textSecondary: #333333` (gris muy oscuro)
  - Bordes más oscuros: `rgba(0, 0, 0, 0.2)`

- **Date Picker** - Inicia 15 años atrás (sin límites)
  - `pickerValue` configurado a 15 años atrás
  - Sin `disabledDate` (permite cualquier fecha)
  - Formato DD/MM/YYYY automático

- **Google Sign-In** - Scopes adicionales
  - `user.birthday.read` → Fecha de nacimiento
  - `user.phonenumber.read` → Teléfono
  - `user.addresses.read` → Dirección completa
  - Autocompleta: nombre, email, teléfono, dirección, cumpleaños

### 🛍️ Store Configuration
- **Root Redirect** - `VITE_ROOT_REDIRECT` env variable
- **Multi-environment** - `.env.production` vs `.env.provecchio`
- **Ecommerce URL** - Guardada en localStorage desde BrandingProvider
- **Back to Store Button** - Usa ecommerceUrl del tenant

### 🚀 Deployment
- **Deploy Script** - Soporte para `--env production|provecchio`
- **Docker Compose** - Variable `VITE_ENV_FILE`
- **Traefik DNS Automation** - DNS-01 Challenge vía Cloudflare con certificados auto-renovables

### 🐛 Bug Fixes
- **Password Hash** - Node.js bcrypt en vez de Python (PostgreSQL compatibility)
- **Login 404** - API proxy configurado correctamente
- **Text Color** - `theme.textPrimary` en inputs

## [0.2.0-beta.1] - 2026-07-04

### 🎯 Giveaway Module - Multi-tenant Sorteos Completos

#### Backend
- **Auth Service** - JWT ahora incluye `tenantId` desde el login
  - `login()` genera token con contexto del primer tenant del usuario
  - Evita error `super-admin-global` en endpoints protegidos
  - Fix de foreign key constraints en tablas multi-tenant (`giveaways`, `module_installations`)

- **Auth Module** - Agregado PrismaService para obtener tenant info completa
  - Login retorna `tenants` array con `id`, `name`, `apiKey`
  - Frontend puede guardar tenant info en localStorage

- **Main.ts** - CORS configurado para múltiples puertos de desarrollo
  - `localhost:3011`, `localhost:3001`, `localhost:5173`
  - `credentials: true` para cookies/headers

- **Giveaways Service** - Logging para debug de tenantId + endpoint público
  - Verifica existencia de tenant antes de crear sorteo
  - Nuevo endpoint `GET /api/v1/giveaways/public/:id` para sorteo por ID
  - Mensajes de error claros si tenant no existe

- **Giveaways Service** - Integración con Odoo para sincronización de contactos
  - Sincronización automática después del registro en sorteo
  - Busca contacto existente por email/teléfono y actualiza
  - Crea nuevo contacto si no existe
  - Soporta documentos de identidad (CI/RUC) para facturación electrónica
  - Campos sincronizados: nombre, email, teléfono, dirección, fecha nacimiento, documento

#### Frontend
- **Login.tsx** - Guarda tenant info en localStorage
  - `tenantId`, `tenantName`, `apiKey` disponibles después del login
  - `useMultiTenant` hook carga desde localStorage inmediatamente

- **GiveawayRegister.tsx** - URL única por sorteo + Fix de URL duplicada
  - Ruta cambiada de `/sorteo/:tenantId` a `/sorteo/:giveawayId`
  - Normaliza `VITE_API_URL` para remover trailing `/api`
  - Cada sorteo tiene su propia URL pública única
  - Carga branding del tenant asociado al sorteo

- **GiveawayRegister.tsx** - Branding dinámico con nombre del tenant
  - Fix: `branding.name` ahora se incluye correctamente desde el endpoint
  - Isotipo dinámico: `/tenants/{tenant}/isotipo.svg`
  - Favicon dinámico con logo del tenant
  - Tema claro/oscuro basado en nombre del tenant o color primario

- **GiveawayRegister.tsx** - Tema Provecchio personalizado
  - Fondo blanco puro (#ffffff)
  - Colores de marca: #6F2729 (vino), #B99A9C (rosa viejo)
  - Texto oscuro para legibilidad sobre fondo claro
  - Botones sociales con texto oscuro

- **GiveawayRegister.tsx** - Campos para facturación electrónica
  - Tipo de documento: CI (Cédula) o RUC
  - Número de documento con validación de solo dígitos
  - Placeholders dinámicos según tipo de documento
  - Información de ayuda (6-8 dígitos CI, 6-12 dígitos RUC)

- **Admin Giveaways** - URL correcta en panel de administración
  - Muestra `window.location.origin/sorteo/{giveawayId}`
  - Permite compartir sorteos individuales

- **TenantStore.ts** - Fallback de tenantName a tenantId
  - Si no hay nombre en localStorage, usa el ID como fallback
  - Guarda nombre cuando se obtiene de la API

- **UseMultiTenant.ts** - Simplificado para cargar desde localStorage
  - Sin fetch innecesario a `/my-tenants` (requiere JWT)
  - Estado consistente después del login

### ✅ Completed
- **Multi-tenant Login Flow** - JWT con tenantId + localStorage completo
- **Giveaway Public Pages** - CORS fix + URL normalization + URL única por sorteo
- **Tenant Switcher** - Funciona con JWT actualizado
- **Database Constraints** - Fix de foreign keys con tenantId correcto
- **Multiple Giveaways** - Cada sorteo con URL única compartible
- **Provecchio Branding** - Tema blanco con isotipo SVG dinámico
- **Dynamic Favicon** - Logo del tenant en la pestaña del navegador
- **Odoo Integration** - Sincronización automática de contactos después del registro
- **Document Identity Fields** - Campos CI/RUC para facturación electrónica paraguaya

### 🐛 Bug Fixes
- **Foreign Key Violations** - `giveaways_tenantId_fkey`, `module_installations_tenantId_fkey`
- **CORS Errors** - Frontend localhost:3011 bloqueado por backend
- **Double /api** - URLs como `/api/api/v1/...` causaban 404
- **Tenant Name Null** - localStorage sin tenantName después del login
- **Same URL for All Giveaways** - Todos los sorteos mostraban misma URL (tenantId en vez de giveawayId)
- **Branding Name Missing** - `branding.name` no se guardaba correctamente
- **Social Buttons Invisible** - Texto blanco sobre fondo blanco en tema claro
- **Share Endpoint 404** - Endpoint `/share` no implementado, temporalmente deshabilitado
- **Facebook Login** - Temporalmente deshabilitado, solo Google habilitado

### 🔧 Technical
- **Video Background** - Soporte para video de fondo por tenant (opcional)
- **Image Optimization** - Preparado para conversión WebP (pendiente)
- **JWT Session Extension** - 30 días access token, 365 días refresh token
- **Google Sign-In** - Integrado para autocompletado de formulario
- **Tenant Asset Structure** - Convención: `/tenants/{tenant}/isotipo.svg`

---

## [0.1.0-alpha.6] - 2026-06-28

### ✅ Completed
- **Preparación y Maduración para Producción (DevOps):**
  - **Redes Docker Unificadas:** Configuración de la red bridge de Docker con nombre exacto `orderflow-network` en desarrollo y producción para evitar conflictos de comunicación interna.
  - **Healthchecks Estabilizados:** Configuración de healthchecks HTTP utilizando `127.0.0.1` en vez de `localhost` en todos los contenedores para evitar problemas de resolución IPv6.
  - **Orquestación de Odoo Adapter:** Inclusión del contenedor `odoo_adapter` en `docker-compose.prod.yml` y configuración dinámica de su endpoint de conexión en backend con `process.env.ODOO_ADAPTER_URL`.
  - **Enrutamiento Traefik v3.4:** Reemplazo de NGINX Proxy por Traefik v3.4 como proxy exclusivo, con DNS-01 Challenge vía Cloudflare para certificados SSL automáticos, y routing de Odoo Web en `odoo.provecchio.com`.
  - **Completitud de Templates .env:** Actualizadas las plantillas [.env.production](file:///opt/orderflow/.env.production) y [.env.staging](file:///opt/orderflow/.env.staging) con variables críticas (`POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `JWT_REFRESH_SECRET` y `ODOO_ADAPTER_URL`).
- **Correcciones y UX del Frontend:**
  - **Redirección en Render-Phase corregida:** Se envolvieron todas las navegaciones del checkout en hooks `useEffect` en `whatsapp-checkout.tsx` y `checkout.tsx` para evitar advertencias de React y permitir visualizar la pantalla de pedido exitoso.
  - **Dirección Dinámica en Catálogo de WhatsApp:** Reemplazo de la dirección física hardcodeada `Hohenau` en el selector de retiro por la variable dinâmica `address` configurada en los ajustes del catálogo.
  - **Fallback de API Key:** Inicialización automática del `localStorage` con la clave de prueba de Provecchio si no se encuentra configurada, asegurando la carga de catálogos y productos al primer acceso.
  - **Fix de compilación TS en main.tsx:** Remoción de flags de futuro desaprobados en `<BrowserRouter>` al estar ya implementados de forma nativa por React Router v7.
  - **Consumo Seguro de Contexto de Mensajería:** Integración del componente de envoltura `<App>` en [BrandingProvider.tsx](file:///opt/orderflow/frontend/src/components/tenant/BrandingProvider.tsx) y migración de alertas a `App.useApp()` en catálogo y checkout de WhatsApp para aplicar los colores del branding del tenant a las alertas y eliminar warnings.
  - **Limpieza de Advertencias en Componentes:** Corrección del uso del componente `<Spin>` en [whatsapp-checkout.tsx](file:///opt/orderflow/frontend/src/pages/whatsapp-checkout.tsx) para evitar la advertencia de uso independiente de `tip`.
  - **Actualización de FAQ:** Actualizado el correo electrónico de contacto en [FAQ.md](file:///opt/orderflow/FAQ.md) a `marcelo@pesallaccia.com`.

## [0.1.0-alpha.5] - 2026-06-28

### ✅ Completed
- **Módulo Catálogo de WhatsApp:**
  - **Mapeo y Registro en Backend:** Creación del módulo dinámico backend con manifiesto `whatsapp-catalog.manifest.json`, controladores públicos configurados y scripts SQL de instalación.
  - **Frontend Premium de Catálogo:** Creación de `whatsapp-catalog.tsx` con acordeones colapsables para categorías, listado por categorías con badges de conteo y chevrons.
  - **Banner de Portada por Industria:** Lógica para cargar banners por defecto de alta calidad basados en el rubro del tenant (ej. spa, retail) si no se ha configurado uno personalizado.
  - **Checkout de WhatsApp con Registro ERP:** Creación de `whatsapp-checkout.tsx` que registra el pedido en las bases de datos de OrderFlow y genera la redirección de chat pre-redactada a WhatsApp.
  - **Integración con Landing de Tienda:** Botón flotante para acceder al catálogo integrado en `TenantTemplate.tsx`.
  - **Estandarización de Cliente API:** Refactorización a Axios (`api`) para evitar el bug de doble ruta `/api/api` y soportar fallback de clave API.
- **Actualización de Enrutamiento (React Router v7):**
  - **Upgrade de Dependencias:** Actualización de `react-router-dom` y `react-router` a la versión `7.18.0`.
  - **Limpieza de Tipos:** Desinstalación del paquete obsoleto `@types/react-router-dom` (v5) para corregir y consolidar los tipos nativos en el build de TypeScript.
  - **Estandarización de BrowserRouter:** Remoción de las configuraciones y flags obsoletas de futuro (`future` prop) en `main.tsx` al estar implementadas de forma predeterminada en la v7.

---

## [0.1.0-alpha.4] - 2026-06-23

### ✅ Completed
- **App Store Enhancements:** Funcionalidad para actualizar módulos y previsualizar `README.md` directamente desde el panel de administración.
- **Frontend TS/Dependencies Fixes:** Resolución de múltiples errores de compilación (`noImplicitAny`, dependencias faltantes `@types`, dependencias de Expo/React Navigation).
- **Code Quality:** Limpieza de imports, variables y propiedades no utilizadas en múltiples componentes frontend.
- **CI/CD Pipeline Stabilization:** Corrección definitiva de pruebas fallidas y resolución total de advertencias estrictas de TypeScript y ESLint (exit code 0 en backend, frontend y mobile).
- **Merge & Deploy a Producción:** Despliegue exitoso automatizado a la rama `main` y ambiente productivo tras la validación en Staging.
- **Backend Test Fixes:** Resolución de fugas de estado entre pruebas (mock resets) en reservas para eliminar falsos `ConflictException`.
- **Mobile/Frontend Data Mapping:** Sincronización estricta de las interfaces `Product` y `CartItem`, asegurando solidez entre el front y mobile.

---

## [0.1.0-alpha.3] - 2026-06-22

### ✅ Completed
- **POS Multi-Sesión:** Tablet split-screen con carrito permanente (POSScreen.tsx)
- **Sync Offline:** Cola de sincronización con Zustand + AsyncStorage (syncStore.ts + useOfflineSync.ts)
- **Migraciones SQL:** Motor nativo con template {{TENANT_ID}} para multi-tenant
- **CI/CD:** Validación de 3 ecosistemas (backend + frontend + mobile)
- **App Store:** UI completa de gestión de módulos (modules.tsx)
- **Health Checks:** Endpoint `/api/v1/health` + UI Super Admin Dashboard
- **Backups SFTP:** Módulo nativo con configuración dinámica por tenant
- **Quotations Module:** Módulo de presupuestos con migraciones SQL
- **Tests Unitarios:** Primera batería (ModulesRegistry + SystemModulesService)
- **Traefik:** Reverse proxy v3.3 con SSL/TLS termination y DNS-01 Challenge
- **DNIT Integration:** Consulta de RUC a DNIT vía turuc.com.py con cache automático en GlobalDirectory
- **Dynamic Icons:** Iconos personalizados por módulo en App Store (13 módulos con iconos únicos)
- **Registry Optimization:** Singleton pattern + búsqueda dual (src/ + dist/)
- **Testing Utils:** Scripts para validar integridad de manifiestos
- **App Store Auto-Install:** Módulos core se auto-instalan para tenants nuevos
- **批量安装 Script:** auto-install-core.ts para instalar todos los módulos core
- **SQL Migrations:** Automáticas al instalar módulos con template {{TENANT_ID}}
- **Logger NestJS:** Reemplaza console.error en SystemModulesService
- **Singleton Registry:** Inyección explícita con useValue en module
- **Tests Unitarios:** 8 tests para SystemModulesService (60% coverage)

### 📊 Audit Score
- **Global:** 84/100 (+13 pts desde alpha.1)
- **Backend:** 90/100 (+12 pts)
- **Testing:** 15/100 (iniciado, 4 tests implementados)
- **DevOps:** 80/100 (+22 pts)

### 🧪 Tests Implementados
- `modules.registry.spec.ts` (2 tests)
- `system-modules.service.spec.ts` (2 tests)

### 🐛 Bug Fixes
- Deploy a producción (dependencia incorrecta de deploy-staging)
- Assets en build (manifest + SQL empaquetados en dist/)
- Fallback de clientes anónimos (RUC 000000 para facturación)

### 📦 Módulos Nuevos
- **Quotations:** Presupuestos con settings (validityDays, termsAndConditions)
- **Backups:** Copias SFTP automáticas con cron scheduling

### 📚 Documentación
- Wiki: https://wiki.marcelompz.github.io/orderflow/
- Arquitectura Modular: docs/arquitectura-modular.md
- Versionamiento: docs/versionamiento.md
- README Project: docs/README-PROJECT.md
- Validación DNIT: docs/VALIDACION_INTEGRACION_DNIT_V2.md

---

## [0.1.0-alpha.2] - 2026-06-22

### ✅ Completed
- **P3-1:** admin/customers.tsx CRUD funcional
- **P3-2:** admin/bookings.tsx + E2E test con Odoo 19
- **Integración:** Agenda + Facturación certificada al 100%
- **Infraestructura:** odoo-adapter dockerizado de forma nativa para soportar múltiples tenants.
- **Limpieza Frontend:** Eliminación de archivos obsoletos según auditoría, estandarizando sobre checkout-simple.tsx.

### 📊 Audit Score
- **Global:** 73.1/100 (+2 pts desde alpha.1)
- **Frontend:** 82/100 (+4 pts)
- **Horas ahorradas:** 32h (adelantados del cronograma)

### 🐛 Bug Fixes
- Corrección de fallback de clientes anónimos (RUC nulo para invitados)
- Resiliencia de webhooks con reintentos automáticos (cada 5 min)

### 🔧 Technical Debt
- Pendiente: 0% test coverage (Jest sin tests reales)
- Pendiente: Sin health check endpoint `/health`

---

## [0.1.0-alpha.1] - 2026-06-22

### 📋 Initial Audit
- **Score global:** 71.1/100
- **Roadmap:** 12 semanas, 434 horas, 37 tareas
- **Fases:** 0 (Críticos) → 1 (Testing) → 2 (Security) → 3 (Features) → 4 (Prod Ready)

### 📦 Módulos del Sistema
- Backend (NestJS + Prisma) - Puerto 3010
- Frontend (React + Vite) - Puerto 3011
- Mobile (React Native + Expo) - SDK 54.0.0
- Odoo Adapter (NestJS Microservice)

### 🎯 Component Scores
| Componente | Score | Estado |
|------------|-------|--------|
| Backend | 78/100 | ⚠️ Production-Ready con deuda técnica |
| Frontend | 78/100 | ⚠️ Production-Ready con deuda técnica |
| Mobile | 67.5/100 | ⚠️ MVP funcional, sin persistencia |
| DevOps | 56/100 | ❌ Crítico para producción |

---

## [0.0.1] - 2026-06-13

### 🚀 Initial Commit
- Arquitectura multi-tenant definida
- Schema Prisma con 15+ modelos
- Primer tenant: SPA Wellness
- Integración con Odoo 19 (webhook-based)

---

## [0.2.3] - 2026-07-04 - Tenant Switcher + Gestión de Sesiones (Estilo Odoo)

### 🎯 Added

#### Tenant Switcher (Selector de Tenants)
- **Componente `TenantSwitcher.tsx`** - Selector de tenants similar a Odoo
  - Muestra todos los tenants disponibles para el usuario
  - Cambio de tenant sin re-login (solo recarga de página)
  - Indicador visual del tenant activo con check verde
  - Dropdown con lista de tenants accesibles

#### Gestión de Sesiones Multi-Tenant
- **Lógica Single-Tenant** - Usuarios con 1 tenant ven automáticamente su tenant
  - Sin selector visible (auto-select al login)
  - Acceso directo a su administración
  - No puede acceder a otros tenants

- **Lógica Multi-Tenant** - Usuarios con N tenants ven selector
  - Selector visible en el header
  - Puede cambiar entre tenants fácilmente
  - Cada tenant mantiene su API key independiente

#### UI/UX Enhancements
- **Indicador de Tenant Activo** - Building icon + nombre del tenant
- **Menú de Usuario/Perfil** - Reemplaza botón "Cerrar sesión"
  - Gestión de sesión activa
  - Información del usuario
  - Cambio de tenant desde el mismo menú
  - Cerrar sesión como opción secundaria

### 🔧 Technical

#### Backend
- **Endpoint `/api/v1/tenants/my-tenants`** - Retorna lista de tenants del usuario
  - Filtra por `user_tenant_access`
  - Incluye `apiKey` para cada tenant
  - Usado por TenantSwitcher para populate

#### Frontend
- **Auth Service Actualizado** - Maneja cambio de tenant sin re-login
  - Guarda `tenantId` y `apiKey` en localStorage
  - Recarga página para aplicar nuevo contexto
  - Mantiene token JWT válido entre tenants

- **BrandingProvider** - Soporta cambio dinámico de tenant
  - Limpia cache al cambiar
  - Recarga configuración del nuevo tenant

### 📊 Database

#### User Roles por Tenant
```sql
-- Usuarios multi-tenant pueden tener roles diferentes por tenant
marcelo@pesallaccia.com → ADMIN en Provecchio
soporte@crossnexion.com → ADMIN en Provecchio
admin@spa-demo.com → ADMIN en SPA Wellness
```

#### Tenant Access Control
- Tabla `user_tenant_access` con:
  - `userId` - Usuario
  - `tenantId` - Tenant
  - `role` - Rol específico (ADMIN, MANAGER, VIEWER, SELLER)
  - `active` - Estado del acceso

### 🐛 Bug Fixes

#### Giveaways Module
- **Foreign Key Error** - Corregido `giveaways_tenantId_fkey`
  - Verifica tenant existe antes de crear sorteo
  - Mensaje de error claro si tenant inválido

#### JWT Authentication
- **JWT_SECRET Configuration** - Agregado al `.env` backend
  - Token se valida correctamente
  - Roles se incluyen en payload del JWT

#### Database Connection
- **Database Name** - Corregido de `orderflow_prod_db` a `orderflow_db`
  - Scripts SQL ahora usan la DB correcta

### 📝 Documentation

#### CHANGELOG
- Actualizado con todas las features de 0.2.2 y 0.2.3
- Sección de Deployment para servidor
- Lista de tenants demo con API keys

#### Environment Variables
- `.env.example` actualizado con JWT configuration
- `.env.prod` configurado para Provecchio

### 🚀 Deployment

#### Local Development
```bash
cd /opt/orderflow
docker compose up -d

# Login con usuario multi-tenant
marcelo@pesallaccia.com / <tu-password>

# Selector de tenants visible en header
```

#### Production Server (dimoraserverlocal)
```bash
ssh dimoraserverlocal
cd /srv/orderflow
git pull origin staging
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d

# Acceso
http://dimora.provecchio.com:8083
```

#### Tenants Configurados
| Tenant | API Key | Estado |
|--------|---------|--------|
| Provecchio Di Mora | `0bb60656b9fbfcc27e38ae444e9e376f` | ✅ Activo |
| SPA Wellness | `067059e2d6ae48d8a5f7c81b85fbf522` | ✅ Activo |
| Auto Repuestos | `d077a104c7924eec846588af8b0138cc` | ✅ Activo |

### 🔐 Security

#### JWT Configuration
```env
JWT_SECRET=orderflow-secret-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=<secure-random>
```

#### Tenant Isolation
- Cada tenant tiene su propia API key
- Usuarios solo ven sus tenants asignados
- Roles validados por tenant en cada request

---

## [0.2.2] - 2026-07-03 - Single-Tenant + Super Admin

### Added
- **Single-Tenant Mode** - Variables `DEFAULT_TENANT_ID` y `DEFAULT_API_KEY`
  - Permite desplegar OrderFlow para un tenant específico
  - Los usuarios ven directamente SU tienda/administración
  - Sin pasar por selección de tenant
  - Ideal para despliegues dedicados (ej: Provecchio)

- **Super Admin Role** - Campo `isSuperAdmin` en User
  - Owner de OrderFlow tiene acceso total a TODOS los tenants
  - Puede administrar configuración global
  - Tenant Admins solo ven SU empresa

- **Multi-Tenant Access** - Tabla `user_tenant_access`
  - Usuarios pueden estar en múltiples tenants
  - Roles por tenant (ADMIN, USER, VIEWER)
  - Un usuario, múltiples empresas

### Changed
- **Backend .env.example** - Documentación completa de variables
- **Server .env.prod** - Configurado para Provecchio Di Mora
- **Tenants Demo** - 3 tenants precargados:
  - SPA Wellness (Spa) - `067059e2d6ae48d8a5f7c81b85fbf522`
  - Auto Repuestos (Automotriz) - `d077a104c7924eec846588af8b0138cc`
  - Provecchio Di Mora (Restaurant) - `0bb60656b9fbfcc27e38ae444e9e376f`

### Security
- **SingleTenantMiddleware** - Inyecta tenant automáticamente si está configurado
- **ApiKeyGuard** - Valida API key por tenant
- **JWT Guards** - Protección de endpoints con roles

### Deployment
- **Server**: dimoraserverlocal:/srv/orderflow/
- **Git**: GitHub staging branch
- **SSL**: Cloudflare (provecchio.com, dimora.provecchio.com)
- **Puertos**: 8080 (HTTP), 443 (HTTPS via Cloudflare)

---
