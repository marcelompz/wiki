# Herramientas de Auditoría de Código — OrderFlow

**Fecha:** 2026-08-04  
**Contexto:** Stack NestJS + TypeScript + Prisma + React + Docker  
**Objetivo:** Guía práctica de herramientas y un pipeline mínimo recomendado para auditar calidad, seguridad y arquitectura

---

## 1. Resumen

La auditoría de código en OrderFlow debe cubrir **cinco capas**:

1. Análisis estático (calidad y bugs)
2. Seguridad (SAST, secretos, dependencias)
3. TypeScript y arquitectura de módulos
4. Tests como verificación de comportamiento
5. Runtime / producción (errores, métricas, traces)

No existe una sola herramienta que cubra todo. El valor está en **combinar** un set mínimo en CI y reforzar con herramientas puntuales según el riesgo.

---

## 2. Análisis estático (calidad y bugs)

| Herramienta | Qué hace | Encaje con OrderFlow | Prioridad |
|-------------|----------|----------------------|-----------|
| **ESLint** + `@typescript-eslint` | Estilo, anti-patrones, reglas TypeScript | Backend y frontend; reglas estrictas en services/controllers | Alta |
| **SonarQube / SonarCloud** | Deuda técnica, duplicación, complejidad ciclomática, bugs, coverage | Quality gates en PRs; tracking de deuda a lo largo del tiempo | Alta |
| **CodeQL** (GitHub Advanced Security) | Análisis semántico de seguridad y calidad | Gratis en GitHub; queries para injection, auth, etc. | Alta |
| **Semgrep** | Reglas custom (OWASP, NestJS, multi-tenant) | Ideal para patrones propios: `@TenantPrisma`, no loguear secrets | Alta |

### Uso recomendado

- ESLint en pre-commit y CI (fail on error).
- SonarCloud o CodeQL en cada PR con quality gate (cobertura mínima, cero vulnerabilities bloqueantes).
- Semgrep con reglas del dominio OrderFlow (ver sección 8).

---

## 3. Seguridad: SAST, secretos y dependencias

| Herramienta | Qué hace | Uso típico | Prioridad |
|-------------|----------|------------|-----------|
| **npm audit** / **pnpm audit** | CVEs conocidos en `package.json` | Cada CI y pre-deploy; `--audit-level=high` | Alta |
| **Snyk** o **Socket.dev** | Dependencias + supply-chain + licencias | Más profundo que `npm audit`; monitor continuo | Media-Alta |
| **Trivy** / **Grype** | Imágenes Docker + filesystem | Escaneo de `Dockerfile.prod` y artefactos de build | Alta |
| **gitleaks** / **trufflehog** | Secretos en working tree e historial git | API keys, JWT secrets, tokens Cloudflare, etc. | Alta |
| **OWASP Dependency-Check** | CVEs multi-lenguaje | Alternativa open source a Snyk | Media |

### Dependencias críticas a vigilar en OrderFlow

- `@nestjs/*`, `@prisma/client`, `prisma`
- `stripe`, `mercadopago`
- `bcrypt` / `bcryptjs`
- `jsonwebtoken` / `@nestjs/jwt`
- `ioredis`, `@socket.io/redis-adapter`
- `axios`, `googleapis`

---

## 4. TypeScript y arquitectura

| Herramienta | Qué hace | Prioridad |
|-------------|----------|-----------|
| **tsc --noEmit** | Errores de tipos sin emitir JS | Alta |
| **knip** | Exports, archivos y dependencias no usados | Media |
| **dependency-cruiser** | Ciclos de importación y límites entre módulos | Media |
| **prisma validate** | Consistencia del schema Prisma | Alta |

### Límites de módulos sugeridos (dependency-cruiser)

Ejemplos de reglas útiles:

- `orders` no debe importar UI/frontend.
- Servicios de dominio no deben instanciar `PrismaClient` directo si existe `@TenantPrisma()`.
- `integrations/*` no debe acoplarse a controllers de otros módulos de forma circular.

---

## 5. Tests como auditoría de comportamiento

| Tipo | Herramienta | Rol en auditoría | Estado aparente en OrderFlow |
|------|-------------|------------------|------------------------------|
| Unitarios | **Jest** (backend) | Regresiones de lógica (confirm, stock, descuentos, idempotencia) | En progreso (~498 tests) |
| Unitarios FE | **Vitest** + Testing Library | Componentes y hooks críticos | Planificado (v1.9.0) |
| E2E | **Playwright** | Login, POS, checkout, KDS, storefront | Presente (~14 tests) |
| Carga | **k6** | p95, resiliencia, smoke en CI | Integrado en CI/CD |
| Cobertura | `jest --coverage` / `vitest --coverage` | Umbral hacia 70–80 % | Objetivo roadmap |

### Casos de auditoría prioritarios en tests

- Confirm con descuento (`discountAmount`).
- Confirm concurrente (simular `P2025` / doble `DRAFT → CONFIRMED`).
- Stock insuficiente (warn vs hard-fail según política).
- Side-effects no revierten la venta si fallan (loyalty, FacturaSend, webhook).
- Aislamiento multi-tenant (pedido de tenant A no accesible por tenant B).

---

## 6. Runtime y producción

| Herramienta | Qué hace | Estado en OrderFlow |
|-------------|----------|---------------------|
| **Sentry** | Errores 5xx, stack traces, release tracking | Integrado (backend + frontend) |
| **Prometheus** (`prom-client`) | Métricas HTTP, negocio, salud | Endpoint `/metrics` |
| **Grafana + Loki + Tempo** | Dashboards, logs, traces | En `docker-compose.prod.yml` |
| **Alertmanager** | Alertas operativas | Presente en stack prod |

La auditoría de código no termina en CI: los errores en producción (Sentry) y las métricas (Grafana) cierran el ciclo de mejora continua.

---

## 7. Pipeline mínimo recomendado (CI)

```text
GitHub Actions (por PR / push a main|staging)
│
├── 1. Checkout + setup Node
├── 2. npm ci (backend + frontend)
├── 3. tsc --noEmit (backend + frontend)
├── 4. ESLint (fail on error)
├── 5. npm audit --audit-level=high
├── 6. gitleaks detect
├── 7. prisma validate
├── 8. Jest (backend) + coverage threshold
├── 9. Playwright smoke (subset crítico)
├── 10. k6 smoke (opcional en PR, full en main)
└── 11. Trivy image (post-build Docker)
```

### Quality gates sugeridos

| Gate | Umbral inicial | Objetivo medio plazo |
|------|----------------|----------------------|
| Cobertura unitaria backend | ≥ 45 % | ≥ 70 % |
| Vulnerabilidades high/critical (npm audit / Trivy) | 0 | 0 |
| Secretos detectados (gitleaks) | 0 | 0 |
| ESLint errors | 0 | 0 |
| `tsc --noEmit` | 0 errores | 0 errores |
| E2E smoke críticos | 100 % pass | 100 % pass |

---

## 8. Reglas Semgrep orientadas a OrderFlow (ejemplos)

Reglas de dominio que aportan más que el set genérico:

| ID | Descripción | Severidad |
|----|-------------|-----------|
| `tenant-prisma-required` | En controllers de tenant, preferir `@TenantPrisma()` sobre `this.prisma` directo | Warning / Error |
| `no-log-api-key` | Prohibir log de `apiKeySecret`, `passwordHash`, tokens | Error |
| `confirm-status-guard` | En updates de Order a CONFIRMED, exigir filtro por status DRAFT | Warning |
| `no-raw-sql-tenant` | Evitar SQL raw sin `tenantId` en WHERE | Error |
| `webhook-timeout` | Llamadas HTTP externas deben definir timeout | Warning |

Estas reglas se versionan en el repo (p. ej. `.semgrep/`) y se ejecutan en CI.

---

## 9. Matriz de auditoría por capa de OrderFlow

| Capa | Qué auditar | Herramientas principales |
|------|-------------|--------------------------|
| **Auth / multi-tenant** | Fugas de `tenantId`, guards, rotación de API keys | Semgrep, CodeQL, tests de isolation |
| **Pedidos / confirm** | Race conditions, stock, descuentos, side-effects | Jest (casos borde), review manual |
| **Secrets** | `.env`, keys en repo, logs | gitleaks, scrubbing en Sentry |
| **Dependencias** | CVEs en Nest, Prisma, Stripe, Mercado Pago | npm audit, Snyk/Socket, Trivy |
| **Infra** | Dockerfiles, puertos, Traefik | Trivy, docker scout, review de compose |
| **Datos** | Schema Prisma, índices, soft-delete, migraciones | `prisma validate`, review de migrations |
| **Frontend** | XSS, tokens en localStorage, rutas públicas | ESLint security plugins, Playwright |

---

## 10. Comandos rápidos de referencia

```bash
# --- Dependencias ---
npm audit --audit-level=moderate
npx snyk test   # si está configurado

# --- Tipos ---
cd backend && npx tsc --noEmit
cd frontend && npx tsc --noEmit

# --- Lint ---
npx eslint "src/**/*.{ts,tsx}"

# --- Secretos ---
gitleaks detect --source . -v

# --- Prisma ---
npx prisma validate
npx prisma format

# --- Tests + cobertura ---
cd backend && npm run test:cov

# --- Imagen Docker ---
trivy image orderflow-backend:latest
trivy fs .

# --- Arquitectura (opcional) ---
npx dependency-cruiser src --validate
npx knip
```

---

## 11. Priorización de adopción

### Fase 1 — Inmediata (ya viable con el stack actual)

1. `tsc --noEmit` + ESLint en CI (fail on error).
2. `npm audit --audit-level=high` en CI.
3. `gitleaks` en CI.
4. `prisma validate` en CI.
5. Mantener Jest + Playwright + k6; fijar umbral de cobertura.

### Fase 2 — Corto plazo

6. Trivy sobre imágenes de producción.
7. Semgrep con 3–5 reglas de dominio (tenant, secrets, confirm).
8. SonarCloud o CodeQL con quality gate en PRs.

### Fase 3 — Medio plazo

9. Snyk/Socket para monitor continuo de deps.
10. dependency-cruiser con límites de módulos.
11. Ampliar E2E y tests de isolation multi-tenant.
12. Dashboard de deuda técnica (Sonar) revisado en sprint review.

---

## 12. Conclusión

Para OrderFlow, la auditoría de código efectiva combina:

- **Prevención en CI** (tipos, lint, audit, secretos, tests).
- **Reglas de dominio** (multi-tenant, confirm, stock, no filtrar secrets).
- **Visibilidad en producción** (Sentry + Grafana).

El pipeline mínimo de la sección 7 cubre el 80 % del riesgo con herramientas maduras y de bajo costo operativo. Las reglas Semgrep y el quality gate de cobertura son el siguiente paso de mayor retorno, especialmente tras los cambios de hardening en `orders.service.ts` (v1.12.1).

---

## 13. Implementación en OrderFlow (v1.12.1)

- Workflow mínimo CI creado en `.github/workflows/ci.yml`.
- Backend: agregados `lint` y `typecheck` en `backend/package.json`.
- Reglas Semgrep específicas en `.semgrep/orderflow.yml` (tenant-prisma, no-log-api-key, confirm-status-guard, webhook-timeout, no-raw-sql-tenant).
- ESLint agregado en backend (`.eslintrc.cjs`); frontend ya tenía configuración.
- Code-split frontend aplicado en `vite.config.ts` con `manualChunks` para vendor-react, vendor-antd y vendor-refine.
- `featurelist.json` corregido (estructura JSON válida, sin features duplicadas fuera del array).

### Estado por gate

| Gate | Estado |
|------|--------|
| `tsc --noEmit` backend | Implementado |
| ESLint backend | Implementado |
| `prisma validate` | Implementado |
| `npm audit --audit-level=high` | Implementado |
| gitleaks | Implementado |
| Jest orders (sample) | Implementado |
| Frontend typecheck + build | Implementado |
| Semgrep domain rules | Implementado |
| Code-split frontend | Implementado |
| featurelist.json válido | Implementado |

---

## Anexo — Mapa herramienta → riesgo

| Riesgo | Herramienta principal | Secundaria |
|--------|----------------------|------------|
| CVE en dependencia | npm audit / Snyk | Trivy |
| Secreto commiteado | gitleaks | trufflehog |
| Bug de tipos | tsc --noEmit | ESLint `@typescript-eslint` |
| Race en confirm | Jest (test concurrente) | Code review |
| Fuga cross-tenant | Tests de isolation + Semgrep | CodeQL |
| Imagen Docker vulnerable | Trivy | Grype |
| Deuda / complejidad | SonarQube | knip, dependency-cruiser |
| Error en producción | Sentry | Loki / Tempo |
| Regresión de flujo de negocio | Playwright + Jest | k6 |

---

*Documento de referencia para el equipo OrderFlow. Actualizar cuando se incorporen nuevas herramientas al CI o cambien los quality gates.*
