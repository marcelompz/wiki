# AGENTS.md — OrderFlow (contexto para agentes)

> Guía de contexto técnico vivo del proyecto **OrderFlow** (plataforma SaaS multi-tenant de ventas de alta velocidad). Lee esto antes de modificar código para entender la arquitectura, las convenciones y el estado actual.

---

## 1. Qué es OrderFlow

Plataforma SaaS omnicanal, agnóstica al ERP, multi-rubro (spa, retail, automotriz, farmacia…). Permite catálogo + carrito + checkout, turnos/bookings, presupuestos, sorteos e integración con ERPs externos (Odoo, MIDA, SAP) vía webhooks.

OrderFlow opera en **dos modos** controlados por la variable `ORDERFLOW_MODE`:
- **`community`** (por defecto): Multi-tenant con aislamiento lógico. Un backend NestJS sirve a N tenants aislados por `tenantId`. Soporta tenants `shared` (DB compartida) y `dedicated` (DB propia enterprise) simultáneamente.
- **`enterprise`**: Single-tenant. Instancia dedicada para un cliente grande sin lógica multi-tenant. Mismo codebase, mismo schema, pero con un `tenantId` fijo inyectado desde config.

Ambos modos comparten el mismo schema Prisma y el mismo código de services. La diferencia es la capa de auth/guard y la resolución de la conexión a la DB.

- Repo Core: `https://github.com/marcelompz/orderflow`
- Repo Traefik Gateway Subsystem: `https://github.com/marcelompz/traefik-orderflow.git` (servidor: `/srv/traefik`, local: `/opt/traefik-orderflow/`)
- Servidor Hetzner VPS (Producción): `hetzner-orderflow:/srv/orderflow` (alias SSH configurado)
  - Versión actual: **v1.8.1** (staging + production operativos).
- Lenguaje: TypeScript en todo el stack.

---

## 2. Stack tecnológico

| Capa | Tecnologías |
|------|-------------|
| **Backend** | NestJS 10, Prisma (PostgreSQL 15), JWT + API Keys |
| **Frontend web** | React 18, Vite, Refine.dev, Ant Design 5, **Axios** (Cliente HTTP oficial) |
| **Mobile** | React Native + Expo, Zustand, **Axios** (Cliente HTTP oficial) |
| **DevOps** | Docker Compose, Traefik v3.4 (reverse proxy exclusivo & SSL), GitHub Actions, SSH deploy scripts |
| **Observabilidad** | Winston (logs), Sentry (frontend), health checks |

---

## 3. Estructura del repositorio (monorepo)

```
orderflow/
├── backend/          # API NestJS (src/, prisma/, test/)
├── frontend/         # React + Refine admin + catálogos públicos (src/)
├── mobile/           # React Native + Expo (app/, src/)
├── desktop/          # Tauri Desktop Wrapper (POS nativo)
├── odoo-adapter/     # Microservicio de integración con Odoo
├── packages/         # [FUTURO] Paquetes npm internos compartidos
│   └── auth-shared/  # Validación JWT/API Key para microservicios standalone
├── services/         # [FUTURO] Microservicios standalone extraídos
│   ├── giveaways-standalone/
│   └── whatsapp-catalog-standalone/
├── scripts/          # Deploy, backups, seeds, tests E2E, k6 load tests
├── docs/             # ~75 documentos de arquitectura, auditorías y guías
├── docker-compose*.yml  # dev / prod / observability
├── .env.*            # Variables por entorno (development/staging/production)
├── ROADMAP.md, CHANGELOG.md, README.md, VERSION
```

> **Convención de documentación:** `docs/` está organizado por número (`01-quickstart.md`, `02-architecture.md`, `11-axios-vs-fetch.md`…) y por tema (`AUTH_FLOW.md`, `ARQUITECTURA_MODULAR.md`, `GUIA_DESPLIEGUE_Y_TENANTS.md`, etc.). Antes de grandes cambios, revisá los `.md` relevantes. Nota: En OrderFlow **Axios** es el estándar de cliente HTTP obligado frente a Fetch (ver `11-axios-vs-fetch.md`).

---

## 4. Backend (NestJS)

### 4.1 Módulos
Cada módulo sigue la convención NestJS (`controller`, `service`, `module`, `dto/`, `entities/`) y muchos llevan un `*.manifest.json` (estilo Odoo `__manifest__.py`) usado por el **App Store** de módulos.

Módulos core: `auth`, `tenants`, `products`, `orders`, `customers`, `bookings`, `contacts`, `users`, `integrations`, `health`, `loyalty`, `webhooks`. Módulos infra: `backups`, `system-modules` (App Store). Opcionales/nuevos: `quotations`, `whatsapp-catalog`, `biolinks`. Ambos módulos (`bookings` y `quotations`) se encuentran completamente testeados con cobertura unitaria del 100% de sus lógicas críticas (sincronizaciones, disponibilidad doble transaccional, vigencias DNIT/SET) y con sus paneles de administración habilitados en el frontend.

**Versionamiento de módulos (Opción C - Híbrida):**
- **Archivo de versión del Core:** `/opt/orderflow/VERSION`.
- **Módulos core:** deben tener la **misma versión** que el Core en su `*.manifest.json`.
- **Módulos nuevos/experimentales:** versión semántica independiente (ej: `biolinks 0.1.0-alpha.1`).
- **Módulos opcionales:** versión semántica propia (ej: `quotations 0.1.0`).
- **Campo obligatorio en manifiestos:** `coreCompatibility` (ej: `"0.5.x"`), para documentar compatibilidad con el Core.
- **Regla:** después de hacer bump de versión del Core, sincronizar los manifiestos de módulos core y actualizar `backend/package.json`, `frontend/package.json` y el archivo `VERSION`.

En la versión **v0.4.0**, el módulo `orders` se extendió para dar soporte al POS y KDS en tiempo real mediante **WebSockets** (`OrdersGateway` en el namespace `/orders` con aislamiento de salas por tenant `tenant:<tenantId>`). Además se añadió un endpoint de transición de estado `PATCH /api/v1/orders/:id/status` para el control de cocina.

- Registro central: `backend/src/app.module.ts`.
- Registry de módulos instalados: `backend/src/system-modules/` (tabla `ModuleInstallation` por tenant).

### 4.2 Multi-tenant y modos de operación (IMPORTANTE)

OrderFlow usa un **mismo schema Prisma** para ambos modos. La variable `ORDERFLOW_MODE` controla el comportamiento:

#### Modo `community` (por defecto)
- Todas las tablas de negocio tienen `tenantId` (FK → `Tenant.id`) con `onDelete: Cascade`.
- El tenant se resuelve en `ApiKeyGuard` (`backend/src/common/api-key.guard.ts`) desde:
  1. JWT (`decoded.tenantId`) o `isSuperAdmin`, o
  2. Header `x-api-key` (configurable con `API_KEY_HEADER`). La **master key** (`MASTER_API_KEY`) otorga contexto de SuperAdmin.
- El guard inyecta en `req`: `tenant`, `user`, `isSuperAdmin`, `tenantPrisma`.
- **Multi-tier isolation:** cada tenant tiene un campo `isolationTier` (`"shared"` o `"dedicated"`).
  - `shared`: usa la DB compartida (PrismaService singleton). Es el default.
  - `dedicated`: usa una DB propia (connection string en `Tenant.dedicatedDatabaseUrl`). El `TenantConnectionManager` (`backend/src/common/tenant-connection.manager.ts`) cachea un `PrismaClient` por tenant enterprise.
- El `ApiKeyGuard` inyecta `req.tenantPrisma` con el PrismaClient correcto según el tier del tenant.
- El decorador `@TenantPrisma()` (`backend/src/common/tenant-prisma.decorator.ts`) permite extraer el PrismaClient en controllers.
- **Migración gradual:** los services existentes usan `this.prisma` (singleton). Se pueden migrar progresivamente a `@TenantPrisma()` controller por controller.

#### Modo `enterprise` (futuro)
- Single-tenant: instancia dedicada para un cliente grande.
- Un `tenantId` fijo se inyecta desde la variable `ENTERPRISE_TENANT_ID` en `.env`.
- Auth simplificada: solo JWT, sin `x-api-key`, sin tenant switcher.
- Las queries `where: { tenantId }` siguen funcionando porque el `tenantId` fijo se inyecta automáticamente. No se modifica ningún service.
- Sin `SuperAdmin`, sin `UserTenantAccess` multi-tenant.

#### Regla para developers
- **NO eliminar `tenantId`** de ninguna query ni tabla. Ambos modos dependen de él.
- **NO condicionar lógica de negocio** con `if (mode === 'enterprise')`. La diferencia está solo en la capa de auth/guard.
- Al crear un nuevo service, siempre filtrar por `tenantId`. Funciona en ambos modos.

### 4.3 Autenticación y roles
- **Dos factores de auth:** JWT (usuario/sesión) + API Key (tenant). Muchos endpoints exigen ambos.
- Flujo: `POST /api/v1/auth/login` → `POST /api/v1/auth/select-tenant` (JWT con `tenantId`+`role`) → usar API con `Authorization: Bearer` + `x-api-key`.
- `User` es **global** (email único). El acceso por tenant está en la tabla intermedia `UserTenantAccess` (roles por tenant + `contactId`).
- **Enum `UserRole` (authoritativo, `prisma/schema.prisma`):** `ADMIN`, `MANAGER`, `SELLER`, `VIEWER`.
  > Nota: README/ROADMAP mencionan `OWNER`, pero el schema real NO lo tiene. Usá `ADMIN`/`MANAGER`/`SELLER`/`VIEWER`.
- **SuperAdmin:** flag `User.isSuperAdmin`. Accede a todos los tenants aunque no esté en `UserTenantAccess`; en JWT/guard se marca `isSuperAdmin=true`. La master API key también lo otorga.

### 4.4 Gestión de Tenants (estado actual — IMPORTANTE)
Controller: `backend/src/tenants/tenants.controller.ts`.

| Endpoint | Auth | Comportamiento |
|----------|------|----------------|
| `POST /api/v1/tenants` | público | Crea tenant + genera `apiKeySecret` (`sk_…`) |
| `GET /api/v1/tenants` | SuperAdmin | Lista todos los tenants |
| `GET /api/v1/tenants/my-tenants` | ApiKeyGuard | Tenants del usuario (o todos si SuperAdmin) |
| `GET /api/v1/tenants/:id` | ApiKeyGuard | Detalle |
| `GET /api/v1/tenants/config` | ApiKeyGuard | Config del tenant del request |
| `GET /api/v1/tenants/config/:apiKey` | público | Config por API key (branding) |
| `GET /api/v1/tenants/public/:id/branding` | público | Branding por ID (sin exponer API key) |
| `PATCH /api/v1/tenants/config` | ApiKeyGuard | Actualiza branding/ecommerce/bookings/config |
| `PATCH /api/v1/tenants/:id` | ApiKeyGuard + ADMIN/SuperAdmin | Update genérico |
| `PATCH /api/v1/tenants/:id/disable` | ApiKeyGuard + ADMIN/SuperAdmin | **Deshabilitar** (`active=false`, reversible) |
| `PATCH /api/v1/tenants/:id/enable` | ApiKeyGuard + ADMIN/SuperAdmin | **Habilitar** (`active=true`) |
| `DELETE /api/v1/tenants/:id` | ApiKeyGuard + ADMIN/SuperAdmin | **Soft-delete** (`softDeleted=true`, `active=false`, retención 30 días) |
| `POST /api/v1/tenants/:id/restore` | ApiKeyGuard + ADMIN/SuperAdmin | **Restaurar** tenant soft-deletado (`softDeleted=false`, `active=true`) |
| `DELETE /api/v1/tenants/:id/hard-delete` | SuperAdmin | **Eliminar físico** (irreversible, cascade, limpieza de DNS Cloudflare) |

**Autorización de gestión (`assertCanManageTenant`):**
- **SuperAdmin** (`isSuperAdmin` por JWT o master API key): gestiona cualquier tenant.
- **ADMIN** (`UserTenantAccess` con `role='ADMIN'`, `active=true` para ese tenant): gestiona solo los tenants a los que tiene acceso.
- Cualquier otro rol/usuario sin acceso → `403 Forbidden`.
- `findAll` devuelve **todos** los tenants al SuperAdmin, o los tenants where el usuario es `ADMIN` (incluye inactivos, para poder rehabilitar).
- La creación de tenant (`POST`) sigue siendo **pública** por diseño (ver `GUIA_DESPLIEGUE_Y_TENANTS.md`).

**UI (super-admin-dashboard.tsx):** columna "Acciones" con Deshabilitar/Habilitar (toggle), Eliminar (soft-delete), Restaurar (solo tenants soft-deletados) y Hard Delete (Popconfirm con advertencia irreversible, exclusivo SuperAdmin) y botón "Crear Nuevo Tenant" (modal que muestra la API Key generada). Tag visual `DB Tier` (`💎 Dedicated` vs `👥 Shared`) y retención de 30 días para tenants soft-deletados.

---

## 5. Frontend (React + Refine)

- `src/main.tsx`: rutas públicas (landing, `/login`, catálogos `/whatsapp-catalog`, `/tienda`, `/checkout`, `/sorteo/:id`, `/config`) y admin en `/admin/*`.
- `src/AdminApp.tsx`: layout Refine + Ant Design, menú lateral dinámico según módulos instalados (`GET /v1/modules/installed`) y `isSuperAdmin` (decodificado del JWT o master key).
- **Páginas admin** en `src/pages/admin/`:
  - `dashboard.tsx` (general), `super-admin-dashboard.tsx` (tenants + health check), `users.tsx`, `tenant-access.tsx` (asignar tenants/roles a usuarios), `customers.tsx`, `products.tsx`, `bookings.tsx`, `spa-dashboard.tsx`, `modules.tsx` (App Store), `quotations.tsx`, `integrations.tsx`, `giveaways.tsx`, `pos.tsx` (Punto de Venta con Modo Mozo y Modo Caja con cobro centralizado), `kds.tsx` (Pantalla de Cocina con conexión WebSockets en tiempo real y semáforo de criticidad por tiempo).
- **Servicios API** en `src/services/`: `api.ts` (axios con interceptor que inyecta `Authorization: Bearer` o `x-api-key` desde `localStorage`), `tenant.service.ts`.
- Branding por tenant: `src/components/tenant/BrandingProvider.tsx` + `UserProfileMenu`, hook `useMultiTenant`.
- **Super-admin dashboard** (`super-admin-dashboard.tsx`): lista tenants en tabla, stats y health check. Columna "Acciones" con Deshabilitar/Habilitar (toggle), Eliminar (soft-delete), Restaurar y Hard Delete (SuperAdmin), botón "Crear Nuevo Tenant" (modal con API Key generada) y tag visual de tier de BD (`💎 Dedicated` vs `👥 Shared`).

### Autenticación en frontend
- `localStorage`: `accessToken` (JWT), `apiKey`, `apiKey` usado para branding.
- `isSuperAdmin` se decodifica del JWT (`payload.isSuperAdmin`) o comparando apiKey con `VITE_MASTER_API_KEY`/`dev-master-key-change-in-prod`.
- `AdminApp` redirige a `/login` si no hay token ni master key.

---

## 6. DevOps / entornos

- **Puertos:** backend `3010`, frontend dev `3011`, postgres `5433→5432`, odoo_adapter `3005`.
- **Compose:** `docker-compose.yml` (dev), `docker-compose.prod.yml` (prod).
- **Configuración obsoleta:** El directorio `old/` contiene configuraciones legacy de NGINX/edge-proxy que fueron reemplazadas por Traefik v3.4. **No usar ni referenciar** archivos dentro de `old/` para configuraciones activas.
- **Variables de entorno:** `.env` (prod), `.env.staging`, `.env.production`, `.env.prod`. Claves críticas: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `MASTER_API_KEY`, `API_KEY_HEADER`, `CLOUDFLARE_API_TOKEN`, `SENTRY_DSN`, `VITE_SENTRY_DSN`, `GRAFANA_ADMIN_PASSWORD`, `ORDERFLOW_MODE` (`community` | `enterprise`), `ENTERPRISE_TENANT_ID` (solo en modo enterprise).
- **Integración de Cloudflare / DNS Dinámica:** El token de la API de Cloudflare se configura en la variable `CLOUDFLARE_API_TOKEN` en `.env.staging` (para staging) y `.env` (para producción). El backend (`cloudflare-dns.service.ts`) utiliza este token al crear un Tenant para registrar automáticamente su subdominio como CNAME con la opción `proxied: false` (DNS Only / nube gris). Esto redirige el tráfico al host para que Traefik gestione el certificado SSL de producción de Let's Encrypt (evitando la limitación de handshake SSL de Cloudflare en subdominios de 4to nivel).
- **Prisma:** `prisma/schema.prisma` es la fuente de verdad. Migraciones en `.gitignore`; en prod se usa `prisma db push`. Siempre regenerá el cliente tras cambiar el schema.
- **CI/CD:** GitHub Actions (build + test + deploy a Hetzner VPS staging/production). Scripts en `scripts/` (`deploy-production.sh`, etc.).
- **Backups:** `backups/` + scripts SFTP; retención 7 días.
- **File Store por Tenant (OBLIGATORIO):** Todos los archivos generados o subidos por tenant deben almacenarse bajo `uploads/{tenantId}/{module}/...` dentro del working directory del backend. Esto garantiza aislamiento total entre tenants, coherencia con backups/restores y compatibilidad con `shared` y `dedicated`. Queda prohibido almacenar archivos de negocio en carpetas globales sin partición por `tenantId`.
- **Observabilidad:** Prometheus endpoint `/metrics`, Winston logs JSON, Sentry (`instrument.ts`), health checks. Stack avanzado documentado en `docs/observability/` (Loki, Tempo, Grafana, Alertmanager).

### 6.1 Entornos diferenciados

OrderFlow tiene **tres entornos** diferenciados y **no son equivalentes**:

| Entorno | Tipo | Estado | Notas |
|---------|------|--------|-------|
| **staging** | VPS Hetzner | Actualizable | Refleja `main`; se usa para validación pre-producción (`staging.pesallaccia.com`). |
| **production** | VPS Hetzner | Actualizable | Entorno productivo principal (`pesallaccia.com`). Deploy con `docker-compose.prod.yml`. |
| **provecchio** | Servidor físico | **Actualizable** | Versión in-house en producción (`provecchio.com`). Recibe deploys selectivos con validación previa. |

**Regla operativa & Aislamiento de Traefik en Provecchio:**
- `staging`, `production` y `provecchio` reciben deploy desde CI/CD o manual.
- `provecchio` posee su propia instancia de Traefik en `/srv/traefik/` que habita de forma **100% aislada** de `/srv/orderflow/`. Tiene su propio `docker-compose.yml`, `.env`, `traefik.yml` y certificados `acme.json`.
- Los cambios en este repositorio (`/opt/orderflow/`) se aplican a `provecchio` mediante `scripts/update-provecchio-version.sh` (hotfix quirúrgico) o deploy manual. Provecchio utiliza su propio `.env.prod` local (donde se encuentra `CF_DNS_API_TOKEN`).
- **Diagnóstico 502 Bad Gateway:** Si `provecchio.com` arroja HTTP 502 o falla en la emisión de certificados SSL, consultar la guía de diagnóstico en [docs/troubleshooting/06-provecchio-traefik-ssl-and-502-diagnosis.md](troubleshooting/06-provecchio-traefik-ssl-and-502-diagnosis.md).

### 6.2 Limpieza de configuración obsoleta (`old/`)

Las configuraciones legacy de NGINX/edge-proxy fueron movidas a `old/` para preservarlas como referencia hasta la próxima fase de madurez.

**Política de retención:**
- `old/` está ignorado en `.gitignore` por defecto.
- Los archivos dentro de `old/` son **solo referencia histórica**.
- **Eliminación total:** cuando se cumpla **uno** de estos hitos:
  1. Deploy de **v1.2.0** en producción con todos los módulos estables.
  2. Próxima auditoría de producción programada (**2026-09-22**).
  3. Finalización de la **Fase 1 del plan de maduración** (80% cobertura de tests).
- Criterio de desbloqueo: cualquier hito alcanzado habilita la eliminación permanente de `old/` del repositorio.

---

## 7. Comandos comunes

```bash
# Backend
cd backend
npm run start:dev        # dev con watch
npm run build            # nest build
npm run test             # jest (unit)
npm run test:e2e         # jest e2e
npx prisma generate      # regenerar cliente
npx prisma db push       # sincronizar schema a DB (prod)

# Frontend
cd frontend
npm run dev              # vite dev server
npm run build            # tsc + vite build
npm run build:staging    # build modo staging
npm run build:production # build modo production
npm run test             # jest
# NOTA: "lint" está deshabilitado a propósito (echo). No agregar lint obligatorio sin coordinar.

# Infra
docker compose up -d     # levantar stack dev
```

---

## 8. Trabajo en curso / pendientes relevantes

### 8.1 Gestión de Tenants — **Implementado**
1. **Deshabilitar / habilitar / eliminar tenants desde el dashboard** (frontend `super-admin-dashboard.tsx` + backend `tenants.controller.ts`). Se agregaron `PATCH /:id/disable`, `PATCH /:id/enable` y `DELETE /:id`.
2. **Rol `ADMIN` puede gestionar tenants** además del SuperAdmin.

### 8.2 Multi-Tier Isolation — **Completado (v0.7.0 / v1.0.0)**
1. **Schema Prisma actualizado:** campos `isolationTier`, `dedicatedDatabaseUrl`, `dedicatedSchemaVersion`, `softDeleted`, `deletedAt` en modelo `Tenant`.
2. **`TenantConnectionManager`** (`backend/src/common/tenant-connection.manager.ts`): resuelve PrismaClient por tier (shared → singleton, dedicated → pool cacheado).
3. **`@TenantPrisma()` decorator** (`backend/src/common/tenant-prisma.decorator.ts`): extrae PrismaClient del request.
4. **`ApiKeyGuard` actualizado:** inyecta `req.tenantPrisma` después de resolver el tenant.
5. **Script de provisioning** (`scripts/provision-dedicated-db.sh`): creación automatizada de DB dedicada + `prisma db push`.
6. **UI Admin:** endpoint `PATCH /api/v1/tenants/:id/isolation-tier` y tag visual `DB Tier` en Super Admin Dashboard.

### 8.3 ORDERFLOW_MODE (Feature Flag) — **Diseñado, pendiente implementación**
- Variable `ORDERFLOW_MODE` (`community` | `enterprise`) para seleccionar entre multi-tenant y single-tenant.
- En modo `enterprise`: `SingleTenantGuard` reemplaza a `ApiKeyGuard`, `tenantId` fijo desde `ENTERPRISE_TENANT_ID`.
- Mismo codebase, mismo schema, sin bifurcación de código.

### 8.4 Microservicios Standalone — **Completado (v1.1.3 / v1.1.9)**
- Módulos con bajo acoplamiento se extraen como microservicios vendibles de forma independiente.
- **Roadmap Dedicado Vivo:** [docs/ROADMAP_MICROSERVICES.md](docs/ROADMAP_MICROSERVICES.md) (y sincronizado en la Wiki en `/opt/wiki/orderflow/docs/ROADMAP_MICROSERVICES.md`).
- **Estado Actual:**
  - ✅ **6 Microservicios Standalone production-ready** (orquestados en `docker-compose.standalone.yml`):
    - `giveaways-standalone` (`:3020`, `sorteos.*`) — Sorteos, Google OAuth.
    - `whatsapp-catalog-standalone` (`:3021`, `catalogo.*`) — Catálogo, modificadores, GPS, zonas, plantillas.
    - `biolinks-standalone` (`:3022`, `bio.*`) — Bio-Links 0% comisión, In-Bio Fast Checkout.
    - `bookings-standalone` (`:3023`, `turnos.*`) — Agendamiento, comisiones, Google Calendar (pendiente).
    - `quotations-standalone` (`:3024`, `presupuestos.*`) — Presupuestos DNIT/SET.
    - `loyalty-standalone` (`:3025`, `fidelizacion.*`) — Tarjetas, tiers BRONZE→PLATINUM.
  - 🚧 **Storefront Builder** (`storefront-builder-standalone`, `:3026`) — en planning.
- Auth compartida vía `packages/auth-shared` (JWT/API Key validation sin acoplamiento a DB monolítica).
- Routing vía Traefik v3.4: cada standalone tiene su propio subdominio (`sorteos.*`, `catalogo.*`, `bio.*`, `turnos.*`).

### 8.5 Visión a largo plazo — **v2.0.0+**
- Migración Docker Compose → Kubernetes.
- Helm charts para core + microservicios.
- Autoscaling por servicio.
- DB-per-tenant con PostgreSQL Operator.

---

## 9. Convenciones y "gotchas"

- **`ORDERFLOW_MODE`:** controla el modo de operación (`community` | `enterprise`). En `community` (default), multi-tenant con `ApiKeyGuard`. En `enterprise`, single-tenant con `tenantId` fijo. **No condicionar lógica de negocio en services con esta variable;** la diferencia es solo en la capa de guard/auth.
- **`tenantId` es sagrado:** NO eliminar `tenantId` de queries ni tablas. Funciona en ambos modos. En enterprise, siempre tiene el mismo valor; en community, aísla los datos entre tenants.
- **Multi-tier (`isolationTier`):** el `TenantConnectionManager` resuelve el PrismaClient. No instanciar `PrismaClient` manualmente en services; usar `this.prisma` (legacy) o `@TenantPrisma()` (nuevo).
- **Infraestructura Proxy (Traefik v3.4 Exclusivo):** Nginx fue eliminado y sustituido completamente por **Traefik v3.4** como subsistema nativo exclusivo de OrderFlow y Odoo 19 CE. NO volver a activar, sugerir ni configurar Nginx bajo ninguna circunstancia en ningún servidor. El código y configuración del subsistema perimetral se administra en el repositorio [traefik-orderflow](https://github.com/marcelompz/traefik-orderflow.git), ubicado localmente en `/opt/traefik-orderflow/` y en los servidores en `/srv/traefik/`.
- **Despliegue e Inicialización de Odoo 19 CE (`odoo19CE`):** En la infraestructura de Odoo 19 (`git@github.com:marcelompz/odoo19CE.git`, `/srv/odoo/odoo19CE`), el script `init_prod_db.sh` preserva la integridad de los datos existentes en la base de datos `prod`. Si la tabla `res_users` ya existe en PostgreSQL, los scripts de `migracion/` NO se vuelven a ejecutar. La importación de migración solo corre automáticamente en inicializaciones desde cero (`./deploy.sh --clean`) o si se pasa explícitamente `FORCE_MIGRATION=true`.
- **Microservicios standalone:** al extraer un módulo como standalone, mover el código a `services/<nombre>-standalone/`, crear su propio `schema.prisma` (solo los modelos necesarios), y usar `packages/auth-shared` para validación JWT. El módulo original sigue existiendo en el monolito para clientes que usan OrderFlow completo.
- **No comentar código** salvo que se pida explícitamente.
- El `lint` del frontend está bypassed a propósito; no romper ese comportamiento.
- `prisma/schema.prisma` usa `onDelete: Cascade` en las relaciones hijas de Tenant → borrar un tenant elimina sus datos. Considerá impacto antes de un hard-delete.
- Muchos endpoints combinan `x-api-key` + JWT; no quites uno sin verificar el guard.
- La creación de tenants es endpoint público por diseño.
- Documentación viva en `docs/` (más de 70 archivos); ante duda, consultalos antes de asumir.
- Commits siguen Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`…).
- **Regla de Sincronización de Documentación & Repositorio Wiki (OBLIGATORIO):** Al realizar cualquier cambio o avance significativo en el proyecto que impacte en la versión (`VERSION`), el `ROADMAP.md`, la arquitectura o la Wiki del proyecto (ubicada en `docs/`, el repositorio Wiki local en `/opt/wiki/orderflow/` y repositorios vinculados), es **estrictamente obligatorio** actualizar en el mismo paso toda la documentación vinculada. El número de versión debe actualizarse de forma sincrónica en **todos** los archivos clave: `VERSION`, `backend/package.json`, `frontend/package.json`, `README.md`, `ROADMAP.md`, `CHANGELOG.md`, `docs/02-architecture.md`, `INFORME_MADUREZ_ORDERFLOW.md` y los índices del repositorio Wiki en `/opt/wiki/orderflow/README.md` y `/opt/wiki/orderflow/README.en.md`, manteniendo las métricas de tests, versión y estado del arte 100% alineadas.
- No commitear secrets ni hacer commit/push/PR salvo que el usuario lo pida explícitamente.
