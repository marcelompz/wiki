# Technical Guide for Developers & Agents

> **OBLIGATORIO LEER ANTES DE MODIFICAR CÓDIGO**
> 
> Este documento es un requisito previo para cualquier agente de IA o desarrollador que vaya a realizar cambios en el codebase de OrderFlow/OmniFlow. Siempre revisar este documento, `AGENTS.md`, `docs/00-contexto-agentes.md`, y el [índice de troubleshooting](docs/troubleshooting/README.md) antes de tocar cualquier archivo.

---

## 1. Filosofía del Repositorio

### 1.1 Marca vs Código
| Concepto | Nombre |
|----------|--------|
| **Marca pública** (marketing, docs, UI) | **OmniFlow** |
| **Nombre técnico** (código, APIs, tablas, infra, Traefik) | **OrderFlow** |

- El repositorio técnico es `orderflow` (paths, variables, colas, imágenes Docker).
- **OmniFlow** aparece solo en: frontend (títulos/docs públicas), marketing, manuales de usuario, wiki externa.
- **Prohibido mezclar ambas marcas en la misma superficie.**

### 1.2 Modos de Operación (`ORDERFLOW_MODE`)
| Modo | Descripción |
|------|-------------|
| **`community`** (default) | Multi-tenant con aislamiento lógico por `tenantId`. Backend NestJS sirve N tenants. |
| **`enterprise`** | Single-tenant. Instancia dedicada con `tenantId` fijo desde `ENTERPRISE_TENANT_ID`. |

**Regla inviolable:** No condicionar lógica de negocio en services con `if (mode === 'enterprise')`. La diferencia entre modos es exclusividad de **guards y middleware**.

---

## 2. Stack Tecnológico

| Capa | Tecnologías |
|------|-------------|
| **Backend** | NestJS 10, Prisma (PostgreSQL 15), JWT + API Keys |
| **Frontend web** | React 18, Vite, Refine.dev, Ant Design 5, **Axios** (cliente HTTP obligado) |
| **Mobile** | React Native + Expo, Zustand, **Axios** |
| **DevOps** | Docker Compose, **Traefik v3.4** (único reverse proxy), GitHub Actions |
| **Observabilidad** | Winston (logs), Sentry (frontend), Prometheus/Grafana |

> **Importante:** Axios es el cliente HTTP obligado. No usar Fetch directamente (ver `docs/troubleshooting/11-axios-vs-fetch.md`).

---

## 3. Autenticación y Autorización

### 3.1 Dos Factores
- **JWT** (usuario/sesión): `Authorization: Bearer <token>`
- **API Key** (tenant): `x-api-key: <key>` o `?apiKey=<key>`

### 3.2 Roles (`UserRole` enum en Prisma — autoritativo)
`ADMIN` | `MANAGER` | `SELLER` | `VIEWER`

> **No existe rol `OWNER`** en el schema. Algunos READMEs/docs antiguos lo mencionan pero el enum real es el anterior.

### 3.3 Flujo de Auth
```
1. POST /api/v1/auth/login     → obtienes accessToken + refreshToken
2. POST /api/v1/auth/select-tenant → JWT con tenantId + role
3. Usar API con: Authorization: Bearer <JWT> + x-api-key: <API_KEY>
```

### 3.4 SuperAdmin
- Flag `User.isSuperAdmin` en JWT (`payload.isSuperAdmin = true`)
- Master API key (`MASTER_API_KEY` en `.env`) otorga contexto de SuperAdmin
- Accede a todos los tenants sin estar en `UserTenantAccess`

### 3.5 Resolución de Tenant
El `ApiKeyGuard` (`backend/src/common/api-key.guard.ts`) resuelve el tenant desde:
1. JWT (`decoded.tenantId`) — si tienes JWT válido
2. Header `x-api-key` — la master key otorga SuperAdmin

El guard inyecta en `req`: `tenant`, `user`, `isSuperAdmin`, `tenantPrisma`.

### 3.6 PIN Verification (FEAT-150)
- Endpoint: `POST /api/v1/auth/verify-pin?tenantId=<id>`
- Verifica PIN contra tabla `employees` (columna `pin_code`)
- Devuelve `accessToken` y `refreshToken` JWT
- **Requisito:** el employee debe tener `user_id` referenciando `users.id`
- El `role` se obtiene de `user_tenant_access.role` o del `employee.position`

---

## 4. Multi-Tenant y Aislamiento de Datos

### 4.1 Regla de Oro
> **`tenantId` es sagrado.** No eliminar `tenantId` de ninguna query ni tabla. Ambos modos dependen de él.

### 4.2 Multi-Tier Isolation
Cada tenant tiene `isolationTier`: `"shared"` (default) | `"dedicated"`.

| Tier | Behavior |
|------|----------|
| `shared` | DB compartida, Prisma singleton (`this.prisma`) |
| `dedicated` | DB propia, Prisma cacheado por tenant (`@TenantPrisma()`) |

### 4.3 Singleton vs Dinámico
- **Legacy services:** usan `this.prisma` (singleton del PrismaService)
- **Nuevos controllers:** usar `@TenantPrisma()` para obtener el PrismaClient correcto según el tier

**Nunca instanciar `new PrismaClient()` directamente.**

---

## 5. API Keys y Modo Público

### 5.1 Generación
- `POST /api/v1/tenants` (público) genera tenant + `apiKeySecret` (`sk_...`)
- La master key (`MASTER_API_KEY`) otorga contexto SuperAdmin

### 5.2 Headers
| Header | Propósito |
|--------|-----------|
| `x-api-key` | Identifica el tenant |
| `Authorization: Bearer` | Identifica al usuario |
| `x-tenant-id` | Override de tenant (usado por sync-standalone, Odoo adapter) |

---

## 6. Convenciones de Código

### 6.1 File Naming
- **`kebab-case`** para todos los archivos (`.tsx`, `.ts`, `.jsx`, `.js`)
  - Ejemplos: `omni-catalog.tsx`, `product-variants.service.ts`, `gastro-mozos.tsx`
- **PascalCase** para nombres de componentes dentro de archivos

### 6.2 Commits
Seguir **Conventional Commits**: `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`

### 6.3 No Comentarios
> **Prohibido agregar comentarios** salvo que se solicite explícitamente.

### 6.4 Colores Hardcodeados
> **Prohibido** usar valores HEX hardcodeados (`#fff`, `#000`, `#e2e8f0`, etc.) en componentes React, CSS inline, Ant Design. Usar `theme.useToken()` de Ant Design o variables `var(--ant-*)`.

### 6.5 Prisma Schema
- Tablas nuevas: `snake_case` con `@map("nombre_columna")` explícito
- Modelos Prisma: `camelCase` (ej: `tenantId`)
- Tablas legacy (pre-2026-09-12): `camelCase` sin `@map()` — no migrar retroactivamente

---

## 7. Estructura del Repositorio

```
orderflow/
├── backend/          # API NestJS (src/, prisma/, test/)
├── frontend/         # React + Refine admin + catálogos públicos
├── mobile/           # React Native + Expo
├── desktop/          # Tauri Desktop Wrapper
├── odoo-adapter/     # Integración Odoo
├── packages/
│   └── auth-shared/  # Validación JWT/API Key para standalones
├── services/
│   ├── *-standalone/ # Microservicios extraídos
├── scripts/          # Deploy, backups, seeds, tests
├── docs/             # ~75 documentos (¡leer antes de asumir!)
├── docker-compose*.yml
├── .env.*            # Variables por entorno
├── VERSION           # Versión del core
├── VERSION           # Versión del core
└── ROADMAP.md
```

---

## 8. Versionamiento

### 8.1 Versionamiento de Version
- **Archivo:** `/opt/orderflow/VERSION`
- **Core modules:** misma versión que el core en `*.manifest.json`
- **Módulos nuevos/experimentales:** versión semántica independiente
- **Campo obligatorio en manifiestos:** `coreCompatibility` (ej: `"1.1.x"`)

### 8.2 Bump de Versión (OBLIGATORIO para features)
Cada feature implementada y desplegada debe incluir incremento de versión:
- `patch`: fixes/correcciones menores
- `minor`: nuevas features con endpoints o lógica de negocio nueva

**Archivos a actualizar:** `VERSION`, `backend/package.json`, `frontend/package.json`, `featurelist.json`

### 8.3 Sync de Manifiestos
Después de bump de versión del core: sincronizar `*.manifest.json` de módulos core + `backend/package.json`, `frontend/package.json`, `VERSION`, `featurelist.json`.

---

## 9. Infraestructura y DevOps

### 9.1 Proxy: Traefik v3.4 Exclusivo
- **Prohibido Nginx.** Traefik administra SSL, subdominios dinámicos y routing.
- Configuración: `/opt/traefik-orderflow/` (local) → `/srv/traefik/` (producción)
- **Para Provecchio:** destino es `/opt/srv/traefik/dynamic/services.yml`
- Recargar: `docker kill -s HUP traefik` (no restart)

### 9.2 Subdominios por Tenant (OBLIGATORIO)
Todo ruta pública usa el subdominio del tenant: `<tenant.subdomain>.<ROOT_DOMAIN>`.
- **Prohibido** crear subdominios por servicio/categoría/módulo
- Solo `CloudflareDnsService` valida/crea subdominios

### 9.3 Entornos
| Entorno | Tipo | URL |
|---------|------|-----|
| `staging` | VPS Hetzner | `staging.pesallaccia.com` |
| `production` | VPS Hetzner | `pesallaccia.com` |
| `provecchio` | Servidor físico | `provecchio.com` |

### 9.4 Deploy
- `./scripts/deploy-production.sh <target>` (targets: `production`, `provecchio`)
- **REGLA:** Autorización explícita del usuario antes de cualquier deploy
- Pre-requisito: cambios commiteados y pusheados a `origin/main`
- Siempre usar `docker compose up --build -d` (nunca `docker compose restart`)

### 9.5 File Store por Tenant
Todos los archivos van a `uploads/{tenantId}/{module}/...` dentro del working directory del backend.

---

## 10. Testing

### 10.1 Test Suite (.scripts/init.sh)
> **REGLA:** Pedir confirmación al usuario antes de ejecutar `init.sh` (consume alta CPU/RAM).

El script verifica:
1. `npx prisma generate`
2. Unit tests 100% aprobados (`jest`)
3. Backend build limpio (`npm run build`)
4. Frontend build limpio (`npm run build`)
5. E2E Playwright (`qa_e2e_check.py`)

### 10.2 Newman (complemento)
- Smoke tests de API: `/api/v1/health`, `/api/v1/auth/login`, endpoints públicos
- Ubicación: `docs/tests/newman/`
- Correr después del build y antes del deploy

### 10.3 E2E Obligatorio para Features
Features que modifiquen flujos críticos deben incluir Playwright E2E cubriendo:
- Flujos críticos: QR → pedido → KDS → mozo → cobro → cierre
- Endpoints públicos
- WebSockets/notificaciones

---

## 11. Troubleshooting First (REGLA DE ORO)

**ANTES de investigar un bug, SIEMPRE consultar:**
👉 [docs/troubleshooting/README.md](docs/troubleshooting/README.md)

1. Buscar el síntoma en el índice
2. Si existe entrada, leer causa raíz y solución antes de modificar código
3. Solo si NO hay entrada, investigar desde cero y **documentar** la nueva entrada

---

## 12. Plan de Acción Obligatorio

Antes de tocar código, la IA **DEBE** presentar:
1. Análisis del problema
2. Propuesta de solución con archivos específicos
3. Verificación de dependencias y efectos secundarios
4. Confirmación del usuario antes de proceder

**Excepción:** emergencias/críticos de producción (notificar al usuario en el primer mensaje).

---

## 13. Flujo de Trabajo con Branches

| Tipo | Patrón | Ejemplo |
|------|--------|---------|
| Feature | `feat/<vertical>-<desc>` | `feat/gastro-kds-multi-station-print` |
| Fix | `fix/<vertical>-<desc>` | `fix/gastro-kitchen-ticket-routing` |
| Hotfix | `hotfix/<desc>` | `hotfix/kds-websocket-reconnect` |

### Ciclo de Vida
```bash
git checkout product/omnigastro     # partir de rama de integración
git pull origin product/omnigastro
git checkout -b feat/gastro-kds-multi-station-print
# ... commits atómicos (Conventional Commits) ...
# PR hacia rama de integración
git branch -d feat/gastro-kds-multi-station-print  # después del merge
```

---

## 14. Checklist de Verificación Rápida

Antes de hacer commit/push:

- [ ] `tenantId` incluido en todas las queries nuevas
- [ ] No hay `if (mode === 'enterprise')` en services
- [ ] No hay `new PrismaClient()` — uso `this.prisma` o `@TenantPrisma()`
- [ ] No hay colores HEX hardcodeados (#fff, #000, etc.) — uso `theme.useToken()`
- [ ] Archivos nombrados en `kebab-case`
- [ ] Commits siguen Conventional Commits
- [ ] Versionamiento actualizado si es feature: `VERSION`, `backend/package.json`, `frontend/package.json`, `featurelist.json`
- [ ] Troubleshooting index revisado
- [ ] `docs/`, `CHANGELOG.md`, `ROADMAP.md` actualizados y sincronizados con wiki

---

## 15. Archivos Clave de Referencia

| Archivo | Propósito |
|---------|-----------|
| `AGENTS.md` | Protocolo de ingeniería (obligatorio) |
| `docs/00-contexto-agentes.md` | Contexto técnico vivo (obligatorio) |
| `docs/troubleshooting/README.md` | Índice de soluciones (obligatorio) |
| `featurelist.json` | Lista estructurada de características |
| `VERSION` | Versión del core |
| `backend/prisma/schema.prisma` | Fuente de verdad del schema DB |
| `backend/src/common/api-key.guard.ts` | Guard de autenticación |
| `backend/src/common/tenant-prisma.decorator.ts` | Decorador Prisma multi-tenant |
| `frontend/src/services/api.ts` | Cliente Axios con interceptor de auth |
| `docs/guides/ROADMAP_MICROSERVICES.md` | Roadmap de microservicios standalone |
| `docs/architecture/tenant-subdomain-standard.md` | Estándar de subdominios |