# Plan de Ajuste: OmniCatalog Standalone (Social Catalog Hub)

**Servicio:** `@orderflow/social-catalog-standalone` (→ renombrar a `@orderflow/omni-catalog-standalone` per FEAT-066)  
**Versión actual:** 0.1.0 → target 1.20.9  
**Puerto:** 3021  
**Alias API:** `/api/v1/omnicatalog` + alias retrocompat `/api/v1/standalone/social-catalog`  
**Database:** `SOCIAL_CATALOG_DATABASE_URL` (PostgreSQL dedicado)  
**Auth:** `@orderflow/auth-shared` (guards en controladores — actualmente `@UseGuards()` vacío)  
**Estado:** Extraído (FEAT-065), rebranding parcial (FEAT-066)

---

## 1. Auditoría Rápida (Hallazgos Iniciales)

| Área | Hallazgo | Prioridad |
|---|---|---|
| **Auth/Guards** | `@UseGuards()` sin guard real — **sin protección real en endpoints** | 🔴 Crítica |
| **Tests** | No hay `*.spec.ts` ni `jest.config.js` | 🔴 Crítica |
| **PWA/Frontend** | Solo backend API — catálogo público + admin preview viven en monorepo `frontend/src/pages/social-*.tsx` | 🟡 Media |
| **Versionado** | `version: "0.1.0"` vs monorepo `1.20.9` — desalineado | 🔴 Crítica |
| **Nombrado** | Paquete `@orderflow/social-catalog-standalone` vs alias OmniCatalog — inconsistencia FEAT-066 | 🟡 Media |
| **Esquema Prisma** | Solo `CatalogChannelConfig` — faltan modelos para productos, variantes, zonas, plantillas WhatsApp (viven en monorepo) | 🟡 Media |
| **Rate Limiting** | No hay throttling | 🟡 Media |
| **Observabilidad** | No `/health`, `/metrics`, logging estructurado | 🟡 Media |
| **Docker** | Básico, sin healthcheck ni multi-stage | 🟢 Baja |
| **CI/CD** | No pipeline propio | 🟢 Baja |

---

## 2. Plan de Ajuste por Categorías

### 2.1 Funcionalidad Core (Backend) — **Prioridad Máxima: Auth**
- [ ] **Guards Reales**: Implementar `JwtAuthGuard` + `TenantGuard` usando `@orderflow/auth-shared` (reemplazar `@UseGuards()` vacío)
- [ ] **Tests Unitarios**: `omni-catalog.service.spec.ts` + `omni-catalog.controller.spec.ts` (≥ 80%)
  - CRUD channels, tenant isolation, default channel logic, enum validation
  - Alias controller parity tests
- [ ] **Tests Integración**: `omni-catalog.integration.spec.ts` con `supertest`
- [ ] **Rate Limiting**: `@nestjs/throttler` en todos los endpoints (ej. 100 req/min/tenant)
- [ ] **Health Check**: `GET /health` + `Terminus`
- [ ] **Métricas**: `/metrics` (Prometheus)

### 2.2 Alineación Versión & Nombrado (FEAT-066)
- [ ] `package.json`: `name: "@orderflow/omni-catalog-standalone"`, `version: "1.20.9"`
- [ ] Actualizar imports internos y `tsconfig.json` paths si aplica
- [ ] Mantener alias controller `/api/v1/standalone/social-catalog` para retrocompatibilidad (documentar deprecación)

### 2.3 Esquema de Datos — Gap Analysis
> El standalone solo tiene `CatalogChannelConfig`. El monorepo tiene en `prisma/schema.prisma`: `SocialProduct`, `SocialProductVariant`, `SocialZone`, `WhatsAppTemplate`, `WhatsAppMessageLog`, etc.

**Opción A (Recomendada)**: Migrar modelos relacionados al standalone en fases
- Fase 1: `SocialProduct`, `SocialProductVariant` (catálogo core)
- Fase 2: `SocialZone`, `DeliveryRate` (geolocalización)
- Fase 3: `WhatsAppTemplate`, `WhatsAppMessageLog` (messaging)

**Opción B**: Mantener en monorepo y exponer vía `CoreHttpService` (como hace OmniBio con `/orders`)

**Decisión**: Empezar por **Opción B** para no romper frontend actual; documentar migración futura en `ARCHITECTURE.md`.

### 2.4 PWA / Frontend Público (Lo que el standalone debe proveer)
- [ ] **API Contrato Estable**: OpenAPI 3.0 para channels + (futuro) products/variants
- [ ] **CORS Dinámico**: `ALLOWED_ORIGINS` env
- [ ] **Headers Seguridad**: `helmet` + CSP
- [ ] **Cache-Control**: `public, max-age=60, stale-while-revalidate=300` en `GET /channels`
- [ ] **Webhook Receiver**: Endpoint público `POST /webhook/:channelId` para callbacks de WhatsApp/Instagram/Telegram (validar firma, enqueue BullMQ)

### 2.5 Observabilidad & Operación
- [ ] **Logging Estructurado**: `pino` / `nest-pino`
- [ ] **Tracing**: OpenTelemetry opcional
- [ ] **Docker Multi-stage**: Build → runtime slim, non-root, healthcheck
- [ ] **docker-compose.yml**: `depends_on` DB, healthcheck, `restart: unless-stopped`
- [ ] **Variables de Entorno**: `.env.example` completa

### 2.6 Documentación
- [ ] `README.md`: Propósito, quickstart, env vars, scripts, API, deploy, retrocompatibilidad
- [ ] `ARCHITECTURE.md`: Diagrama secuencia (admin config channel → webhook receive → frontend render), data flow, límites, plan migración modelos
- [ ] `CHANGELOG.md`: Desde `0.1.0` → `1.20.9`

---

## 3. Criterios de Aceptación (Gate 1 → Gate 2 → Gate 3)

| Gate | Requisito |
|---|---|
| **Gate 1 (Mínimo)** | Auth real funcionando + `npm run build` OK + `npm run test` (unit ≥ 80%) + `npm run test:e2e` + `docker build` OK + versión 1.20.9 |
| **Gate 2 (Objetivo)** | `init-standalone.sh omni-catalog` pasa + Lighthouse PWA ≥ 90 en staging (frontend monorepo consumiendo API) |
| **Gate 3 (Excelencia)** | Load test 100 RPS / p99 < 200ms + webhook receiver procesa 1k req/s + alertas Prometheus |

---

## 4. Archivos a Crear / Modificar

### Nuevos
```
services/social-catalog-standalone/
├── jest.config.js
├── test/
│   ├── omni-catalog.service.spec.ts
│   ├── omni-catalog.controller.spec.ts
│   └── omni-catalog.integration.spec.ts
├── .env.example
├── Dockerfile.multistage
├── docker-compose.standalone.yml
├── README.md
├── ARCHITECTURE.md
├── CHANGELOG.md
└── src/
    ├── common/
    │   ├── guards/
    │   │   ├── jwt-auth.guard.ts
    │   │   └── tenant.guard.ts
    │   ├── health/
    │   │   ├── health.controller.ts
    │   │   └── health.module.ts
    │   └── metrics/
    │       └── metrics.interceptor.ts
    ├── app.module.ts (agregar AuthModule, ThrottlerModule, TerminusModule, MetricsModule)
    └── main.ts (helmet, CORS dinámico, logging pino, global prefix 'api/v1')
```

### Modificar
- `package.json`: `name`, `version`, deps: `@nestjs/throttler`, `@nestjs/terminus`, `pino`, `nest-pino`, `prom-client`, `supertest`, `jest`, `@types/jest`, `ts-jest`, `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`
- `omni-catalog.controller.ts`: reemplazar `@UseGuards()` por `@UseGuards(JwtAuthGuard, TenantGuard)` en ambos controladores
- `tsconfig.json`: verificar `paths` si renombra paquete
- `prisma/schema.prisma`: añadir `@@index([tenantId, active])` en `CatalogChannelConfig`

---

## 5. Dependencias Externas a Verificar
- `@orderflow/auth-shared` — exporta `JwtAuthGuard`, `TenantGuard`, `ApiKeyGuard` compatibles
- Traefik routing: `omnicatalog.{dominio}` → `social-catalog-standalone:3021` + alias legacy
- Frontend monorepo: `frontend/src/pages/admin/social-catalog.tsx` y `social-catalog-public.tsx` consumen esta API

---

## 6. Próximo Paso Inmediato
1. **Fix Auth Crítico**: Implementar `JwtAuthGuard` + `TenantGuard` y aplicarlos en controladores
2. Crear `jest.config.js` + `test/omni-catalog.service.spec.ts` (happy path + tenant isolation)
3. `npm run test` → target ≥ 80%
4. Actualizar `package.json` version a `1.20.9` y nombre a `@orderflow/omni-catalog-standalone`
5. Añadir `ThrottlerModule` + `TerminusModule` en `app.module.ts`
6. Health endpoint + Docker healthcheck
7. Commit → `feature/omni-catalog-tuning` → PR → `init.sh` monorepo no debe romperse

---

## 7. Referencias
- `featurelist.json` — FEAT-048, FEAT-065, FEAT-066
- `docs/planes/STANDALONE_DESKTOP_PWA_TUNING.md` (plan maestro)
- `docs/brand/manual/brand-guidelines.md` (OmniFlow naming)
- `AGENTS.md` — Sección 5 (Roles) y Sección 3 (init.sh)