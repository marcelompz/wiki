# 📊 Observabilidad y Load Testing — OrderFlow

## Sentry (Error Tracking)

### Backend
- **SDK:** `@sentry/nestjs` v10.63+
- **Instrumentación:** `backend/src/instrument.ts` — se importa antes que todo en `main.ts`
- **Config:** DSN via `SENTRY_DSN` (env var), environment via `NODE_ENV`
- **Filtro global:** `SentryExceptionFilter` registrado en `main.ts`
  - Captura automática de excepciones 5xx con contexto multi-tenant
  - Ignora errores HTTP < 500 (4xx son errores de cliente)
  - Enriquece scope con: `tenantId`, `userId`, `method`, `url`, body/query/params
  - API keys sanitizadas (no se envían a Sentry)
- **SentryModule.forRoot()** en `AppModule` para integración con NestJS DI
- **beforeSend:** Filtra `HttpException` con status < 500

### Frontend
- **SDK:** `@sentry/react`
- **Config:** DSN via `VITE_SENTRY_DSN`

### Variables de entorno requeridas
```bash
# Backend (.env)
SENTRY_DSN=https://xxx@oXXX.ingest.sentry.io/XXXXX

# Frontend (.env)
VITE_SENTRY_DSN=https://yyy@oYYY.ingest.sentry.io/YYYYY
```

---

## Traefik (Reverse Proxy + SSL)

### Configuración
- **Static config:** `traefik/traefik.yml`
  - HTTP → HTTPS redirect automático
  - Let's Encrypt via TLS-ALPN-01
  - Docker provider + File provider (dynamic)
- **Dynamic config:** `traefik/dynamic/`
  - `headers.yml` — Secure headers middleware (HSTS, XSS filter, frame deny)
  - `wildcard-subdomains.yml` — Router wildcard para subdominios de tenant

### Subdominios de Tenant
Cada tenant puede tener un subdominio público: `<slug>.pesallaccia.com`

**Flujo:**
1. `POST /api/v1/tenants` → `CloudflareDnsService.ensureSubdomain()` → CNAME en Cloudflare (DNS Only)
2. Traefik resuelve `{subdomain}.pesallaccia.com` con `wildcard-subdomains.yml`
3. Let's Encrypt emite SAN certificate `*.pesallaccia.com`
4. Frontend resuelve tenant por `window.location.hostname`

### Routers (producción)
| Router | Rule | Service | TLS |
|--------|------|---------|-----|
| `backend-api` | `Host(api.pesallaccia.com)` | backend:3010 | Let's Encrypt |
| `frontend` | `Host(pesallaccia.com)` | frontend:80 | Let's Encrypt |
| `frontend-wildcard` | `HostRegexp({subdomain}.pesallaccia.com)` | frontend:80 | SAN wildcard |

---

## Load Testing (k6)

### Script
`scripts/k6-load-test.js`

### Endpoints testeados
| Grupo | Endpoint | Método |
|-------|----------|--------|
| Health Check | `/api/v1/health` | GET |
| Products | `/api/v1/products` | GET |
| Orders List | `/api/v1/orders?limit=10` | GET |
| Customers | `/api/v1/sync/customers` | GET |
| Loyalty Rules | `/api/v1/loyalty/rules` | GET |
| Create Order | `/api/v1/orders` | POST |
| Bookings | `/api/v1/bookings/availability` | GET |

### Escenarios
1. **Smoke** (0-30s): 5 VUs constantes
2. **Load** (30s-210s): Ramp up 0 → 20 → 50 → 0 VUs

### Thresholds
- `p(95) < 500ms`
- `p(99) < 1000ms`
- Error rate < 5%

### Ejecución
```bash
# Local (requiere k6 instalado: https://k6.io/docs/get-started/installation/)
k6 run scripts/k6-load-test.js

# Con más carga
k6 run --vus 100 --duration 300s scripts/k6-load-test.js

# Contra staging
k6 run --env BASE_URL=https://api.pesallaccia.com --env API_KEY=sk_xxx scripts/k6-load-test.js
```
