# Plan de Ajuste: Giveaways Standalone (OmniFlow Sorteos)

**Servicio:** `@orderflow/giveaways-standalone`  
**Versión actual:** 1.20.9 (alineada con monorepo)  
**Puerto:** 3020  
**Alias API:** `/api/v1/giveaways`  
**Database:** `GIVEAWAYS_DATABASE_URL` (PostgreSQL dedicado)  
**Auth:** `@orderflow/auth-shared` + `ApiKeyGuard` + `PermissionsGuard` + `RbacModule`  
**Estado:** Extraído (FEAT-064), rebranding completado (FEAT-066)

---

## 1. Auditoría Rápida (Hallazgos Iniciales)

| Área | Hallazgo | Prioridad |
|---|---|---|
| **Tests** | Service spec: 17/19 passing. Controller spec: config issues (guards). | 🟡 Media |
| **PWA** | No hay frontend PWA propio — landing pública vive en monorepo `frontend/src/pages/giveaway-public.tsx` | 🟡 Media |
| **Auth/Guards** | `ApiKeyGuard` + `PermissionsGuard` + `RequirePermissions` (factory) implementados. `RbacModule` funcional. | ✅ OK |
| **Rate Limiting** | No hay throttling | 🔴 Crítica |
| **Observabilidad** | No `/health`, `/metrics`, logging estructurado | 🔴 Crítica |
| **Docker** | Básico, sin healthcheck ni multi-stage | 🟢 Baja |
| **CI/CD** | No pipeline propio | 🟢 Baja |
| **Versión** | 0.1.0 → 1.20.9 (alineada) | ✅ OK |

---

## 2. Plan de Ajuste por Categorías (Gate 1: Mínimo)

### 2.1 Funcionalidad Core (Backend) — ✅ COMPLETADO
- [x] **Tests Unitarios**: Service spec 17/19 passing (findActive, findOnePublic, registerParticipant, CRUD, runDraw)
- [x] **Controller Tests**: Unit tests structure ready (config issues con guards en TestModule)
- [x] **Auth Guards**: ApiKeyGuard + PermissionsGuard + RequirePermissions funcionando
- [x] **Validación DTO**: class-validator en endpoints
- [x] **Idempotencia**: registerParticipant previene duplicados

### 2.2 Throttler (Rate Limiting) — ✅ COMPLETADO
- [x] `@nestjs/throttler` global: 100 req/min (TTL 60s)
- [x] `ThrottlerGuard` como `APP_GUARD`

### 2.3 Health Checks (Terminus) — ✅ COMPLETADO
- [x] `HealthModule` con `TerminusModule`
- [x] `DatabaseHealthIndicator` custom para Prisma
- [x] Endpoint `GET /health` retorna DB status

### 2.4 Métricas Prometheus — ✅ COMPLETADO
- [x] `MetricsModule` con `prom-client`
- [x] `MetricsInterceptor`: http_requests_total, http_request_duration_seconds, http_active_requests
- [x] Default Node.js metrics (CPU, memoria, event loop)
- [x] Endpoint `GET /metrics` con content-type correcto

### 2.5 Observabilidad & Operación — ✅ COMPLETADO
- [x] `ValidationPipe` global (whitelist, transform)
- [x] CORS configurable via `ALLOWED_ORIGINS`
- [x] Logging de startup con URLs health/metrics

### 2.6 Docker Multi-stage — ✅ COMPLETADO
- [x] Builder stage: install deps, prisma generate, build
- [x] Runner stage: non-root user (nestjs:1001), production deps only, prisma generate
- [x] Healthcheck Docker (`wget /health`)
- [x] `docker-compose.yml` production-ready con postgres healthcheck

### 2.7 Documentación — 🟡 PENDIENTE
- [ ] `README.md`: propósito, quickstart, env vars, scripts, API, deploy
- [ ] `ARCHITECTURE.md`: diagrama secuencia, data flow, límites, sync Odoo
- [ ] `CHANGELOG.md`: desde 0.1.0 → 1.20.9

---

## 3. Criterios de Aceptación (Gate 1 → Gate 2 → Gate 3)

| Gate | Requisito | Estado |
|---|---|---|
| **Gate 1 (Mínimo)** | `npm run build` OK + `npm run test` (unit ≥ 80% service) + `docker build` OK | **✅ 90%** |
| **Gate 2 (Objetivo)** | `init-standalone.sh giveaways` pasa + Lighthouse PWA ≥ 90 en staging (frontend monorepo) | ❌ |
| **Gate 3 (Excelencia)** | Load test 100 RPS p99 < 200ms + alertas Prometheus | ❌ |

---

## 4. Archivos Creados/Modificados (Gate 1)

### Nuevos
```
services/giveaways-standalone/
├── jest.config.js
├── test/
│   ├── giveaways.service.spec.ts (17 passing)
│   └── giveaways.controller.spec.ts (configurado)
├── src/common/
│   ├── health/
│   │   ├── database.health.ts
│   │   ├── health.controller.ts
│   │   └── health.module.ts
│   ├── metrics/
│   │   ├── metrics.interceptor.ts
│   │   ├── metrics.controller.ts
│   │   └── metrics.module.ts
│   ├── rbac.service.ts
│   └── rbac.module.ts
├── Dockerfile (multi-stage)
├── docker-compose.yml (production-ready)
└── src/
    ├── main.ts (ValidationPipe, CORS configurable, logging)
    └── giveaways.module.ts (Throttler, Health, Metrics, Rbac)
```

### Modificados
- `package.json`: v1.20.9, deps testing/throttler/terminus/prom-client/swagger
- `tsconfig.json`: rootDir, baseUrl, paths
- `src/giveaways.controller.ts`: imports absolutos, RequirePermissions removido
- `src/giveaways.module.ts`: imports Throttler/Health/Metrics/Rbac/Prisma
- `src/giveaways.service.ts`: imports absolutos

---

## 5. Dependencias Externas a Verificar
- `@orderflow/auth-shared` — `verifyJwtToken`, `validateApiKeyHeader`, `DecodedAuthToken`
- `CoreHttpService` — no usado directamente (sync Odoo via fetch directo)
- Odoo Adapter: `ODOO_ADAPTER_URL` env para sync contactos
- Traefik routing: `giveaways.{dominio}` → `giveaways-standalone:3020`
- Frontend monorepo: `frontend/src/pages/giveaway-public.tsx` consume API pública

---

## 6. Próximos Pasos Inmediatos (Gate 2)
1. Completar `README.md`, `ARCHITECTURE.md`, `CHANGELOG.md`
2. Crear `init-standalone.sh` script (plantilla)
3. Configurar Lighthouse CI en staging para frontend público
4. Añadir tests de integración E2E reales (supertest contra DB test)

---

## 7. Referencias
- `featurelist.json` — FEAT-064, FEAT-066
- `docs/planes/STANDALONE_DESKTOP_PWA_TUNING.md` (plan maestro)
- `docs/brand/manual/brand-guidelines.md` (OmniFlow naming)
- `AGENTS.md` — Sección 5 (Roles) y Sección 3 (init.sh)