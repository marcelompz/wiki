# Verificación de Producción - OrderFlow

**Fecha:** 2026-07-14
**Servidor:** hetzner-orderflow (/srv/orderflow)
**Dominios:** pesallaccia.com, orderflow.pesallaccia.com

---

## Estado de Contenedores

| Contenedor | Estado | Puerto |
|------------|--------|--------|
| orderflow-frontend-1 | healthy | 80/tcp |
| orderflow-backend-1 | healthy | 3010/tcp |
| orderflow-database-1 | healthy | 5432/tcp |
| orderflow-redis-1 | healthy | 6379/tcp |
| orderflow-odoo_adapter-1 | healthy | 3005/tcp |
| orderflow_traefik | Up | 80, 443, 8080 |

---

## Pruebas de Routing HTTPS

| URL | Host Header | Código | Observación |
|-----|-------------|--------|-------------|
| https://pesallaccia.com | pesallaccia.com | 200 | Homepage OrderFlow OK |
| https://pesallaccia.com | orderflow.pesallaccia.com | 200 | App OrderFlow OK |
| https://pesallaccia.com/api/v1/health | pesallaccia.com | 200 | Backend healthy |
| https://pesallaccia.com | spa-wellness.pesallaccia.com | 530 | Esperado: sin CNAME Cloudflare |

---

## Configuración de Dominio

**Backend (.env):**
- `ROOT_DOMAIN=pesallaccia.com`
- `DOMAIN_NAME=orderflow.pesallaccia.com`
- `CLOUDFLARE_API_TOKEN=***`
- `CF_SUBDOMAIN_PREFIX=` (vacío en producción)

**Frontend (.env.production):**
- `VITE_ROOT_DOMAIN=pesallaccia.com`
- `VITE_SYSTEM_SUBDOMAINS=orderflow,www,staging`
- `VITE_API_URL=/api`

---

## Traefik

- Stack independiente en `/srv/traefik/`
- Config dinámica: `/srv/traefik/dynamic/services.yml`
- Servicios OrderFlow apuntan a contenedores correctos:
  - `orderflow-prod-frontend` → `http://orderflow-frontend-1:80`
  - `orderflow-prod-backend` → `http://orderflow-backend-1:3010`
  - `orderflow-staging-frontend` → `http://orderflow-staging-frontend-1:80`
  - `orderflow-staging-backend` → `http://orderflow-staging-backend-1:3010`

---

## Lógica Frontend

- `App.tsx`: detecta subdominios de tenant comparando contra `VITE_ROOT_DOMAIN`.
- Excluye subdominios de sistema (`orderflow`, `www`, `staging`) para que no se muestren como tiendas.
- Sin autenticación: muestra `OrderFlowLandingPage`.
- Con autenticación: muestra dashboard/catálogo.

---

## Accesos

- Producción: https://pesallaccia.com
- Staging: https://staging.pesallaccia.com
- Backend health: https://pesallaccia.com/api/v1/health
- Traefik dashboard: http://localhost:8080 (interno)
