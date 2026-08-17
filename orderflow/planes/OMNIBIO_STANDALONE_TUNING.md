# Plan de Ajuste: OmniBio Standalone (Bio-Links)

**Servicio:** `@orderflow/omni-bio-standalone`  
**Versión actual:** 1.20.9  
**Puerto:** 3022  
**Alias API:** `/api/v1/omnilinks`  
**Database:** `BIOLINKS_DATABASE_URL` (PostgreSQL dedicado)  
**Auth:** `@orderflow/auth-shared` + `ApiKeyGuard`  
**Estado:** Extraído (FEAT-065), rebranding completado (FEAT-066)

---

## 1. Auditoría Rápida (Hallazgos Iniciales)

| Área | Hallazgo | Prioridad |
|---|---|---|
| **Tests** | No hay `*.spec.ts` ni `jest.config.js` | 🔴 Crítica |
| **PWA** | No hay `vite.config.ts` / PWA plugin / `manifest.json` / SW | 🔴 Crítica |
| **Frontend Público** | Solo backend API — el render público vive en `frontend/src/pages/` del monorepo | 🟡 Media |
| **DTO Validación** | `create-omni-bio.dto.ts` usa `class-validator` pero no hay tests de validación | 🟡 Media |
| **Rate Limiting** | No hay throttling/rate-limit en endpoints públicos (`/public/:slug/*`) | 🟡 Media |
| **Observabilidad** | No hay `/health`, `/metrics` (Prometheus), logging estructurado | 🟡 Media |
| **Docker** | `Dockerfile` y `docker-compose.yml` básicos, sin healthcheck ni multi-stage | 🟢 Baja |
| **CI/CD** | No hay pipeline propio; depende de `init.sh` monorepo | 🟢 Baja |

---

## 2. Plan de Ajuste por Categorías

### 2.1 Funcionalidad Core (Backend)
- [ ] **Tests Unitarios**: Crear `omni-bio.service.spec.ts` + `omni-bio.controller.spec.ts` (cobertura ≥ 80%)
  - CRUD config, slug uniqueness, upsert idempotencia
  - Public endpoints: getBySlug, registerClick, createOrderFromBioLink
  - Edge cases: tenant isolation, inactive bioLink, slug conflict cross-tenant
- [ ] **Tests Integración**: `omni-bio.integration.spec.ts` con `supertest` (API contracts)
- [ ] **Validación DTO**: Tests para `CreateOmniBioDto` (themeColor hex, blocks JSON schema, slug pattern)
- [ ] **Rate Limiting**: `@nestjs/throttler` en `/public/:slug/click` y `/public/:slug/order` (ej. 60 req/min/IP)
- [ ] **Health Check**: `GET /health` + `Terminus` para k8s/Docker healthchecks
- [ ] **Métricas**: `/metrics` (Prometheus) — requests, latency, errors, DB pool

### 2.2 PWA / Frontend Público (Crítico para UX)
> El render público de OmniBio (`/:slug`) vive en el monorepo `frontend/src/pages/omni-bio-public.tsx` (o similar). Este plan cubre lo que **el standalone debe proveer** para que el PWA funcione.

- [ ] **API Pública Estable**: Contrato OpenAPI 3.0 (`/api/v1/omnilinks/:slug` + click/order) versionado
- [ ] **CORS Dinámico**: `origin` configurable por `ALLOWED_ORIGINS` env (no `*`)
- [ ] **Headers Seguridad**: `helmet` + CSP estricta para endpoints públicos
- [ ] **Cache-Control**: `public, max-age=300, stale-while-revalidate=600` en `GET /:slug`
- [ ] **ETag / If-None-Match**: Para invalidación eficiente en SW del frontend

### 2.3 Observabilidad & Operación
- [ ] **Logging Estructurado**: `pino` / `nest-pino` (JSON, nivel por env, correlation IDs)
- [ ] **Tracing**: OpenTelemetry opcional (exportador OTLP)
- [ ] **Docker Multi-stage**: Build → runtime slim (Alpine), non-root user, healthcheck `wget -qO- /health`
- [ ] **docker-compose.yml**: `depends_on` DB, healthcheck, `restart: unless-stopped`
- [ ] **Variables de Entorno Documentadas**: `.env.example` completa

### 2.4 Documentación
- [ ] `README.md`: Propósito, quickstart (dev/prod), env vars, scripts, API endpoints, deploy
- [ ] `ARCHITECTURE.md`: Diagrama secuencia (admin save → public render → click/order), data flow, límites
- [ ] `CHANGELOG.md`: Semver independiente (empezar en `1.20.9`)

---

## 3. Criterios de Aceptación (Gate 1 → Gate 2 → Gate 3)

| Gate | Requisito |
|---|---|
| **Gate 1 (Mínimo)** | `npm run build` OK + `npm run test` (unit ≥ 80%) + `npm run test:e2e` (integración) + `docker build` OK |
| **Gate 2 (Objetivo)** | `init-standalone.sh omni-bio` pasa (unit + build + integración + healthcheck Docker) + Lighthouse PWA ≥ 90 en staging público |
| **Gate 3 (Excelencia)** | Load test (k6) 100 RPS / p99 < 200ms + 0 error rate + alertas Prometheus configuradas |

---

## 4. Archivos a Crear / Modificar

### Nuevos
```
services/biolinks-standalone/
├── jest.config.js
├── test/
│   ├── omni-bio.service.spec.ts
│   ├── omni-bio.controller.spec.ts
│   └── omni-bio.integration.spec.ts
├── .env.example
├── Dockerfile.multistage
├── docker-compose.standalone.yml
├── README.md
├── ARCHITECTURE.md
├── CHANGELOG.md
└── src/
    ├── common/
    │   ├── health/
    │   │   ├── health.controller.ts
    │   │   └── health.module.ts
    │   └── metrics/
    │       └── metrics.interceptor.ts
    ├── app.module.ts (agregar ThrottlerModule, TerminusModule, MetricsModule)
    └── main.ts (helmet, CORS dinámico, logging pino)
```

### Modificar
- `package.json`: agregar `@nestjs/throttler`, `@nestjs/terminus`, `pino`, `nest-pino`, `prom-client`, `supertest`, `jest`, `@types/jest`, `ts-jest`
- `tsconfig.json`: `experimentalDecorators`, `emitDecoratorMetadata` ya OK
- `prisma/schema.prisma`: considerar índices compuestos para queries frecuentes (ej. `tenantId + isActive`)

---

## 5. Dependencias Externas a Verificar
- `@orderflow/auth-shared` — versión compatible, `ApiKeyGuard` funciona standalone
- `CoreHttpService` — llama a monorepo `/orders`; necesita `CORE_API_URL` + `CORE_API_KEY` en env
- Traefik routing: `omnilinks.{dominio}` → `biolinks-standalone:3022` (verificar en `/opt/traefik-orderflow/dynamic/`)

---

## 6. Próximo Paso Inmediato
1. Crear `jest.config.js` + `test/omni-bio.service.spec.ts` (happy path + edge cases)
2. `npm run test` → target ≥ 80%
3. Añadir `ThrottlerModule` + `TerminusModule` en `omni-bio.module.ts`
4. Health endpoint + Docker healthcheck
5. Commit → `feature/omni-bio-tuning` → PR → `init.sh` monorepo no debe romperse

---

## 7. Referencias
- `featurelist.json` — FEAT-065, FEAT-066
- `docs/planes/STANDALONE_DESKTOP_PWA_TUNING.md` (plan maestro)
- `docs/brand/manual/brand-guidelines.md` (OmniFlow naming)
- `AGENTS.md` — Sección 5 (Roles) y Sección 3 (init.sh)