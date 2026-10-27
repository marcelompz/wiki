# Pruebas de API con Newman

Esta carpeta contiene colecciones de Postman/Newman estandarizadas para validar contratos de API y endpoints críticos de OrderFlow.

> **Nota sobre credenciales (FEAT-209 / #209, #201):** el environment
> `provecchio.postman_environment.json` mantiene `adminPassword` vacío
> deliberadamente — la password real del SuperAdmin rota y NO se commitea al
> repo. Inyectarla al correr: `NEWMAN_ADMIN_PASSWORD=... newman run ...` o
> completar el environment en runtime solo localmente. En specs Playwright el
> patrón equivalente es `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` (o
> `PLAYWRIGHT_ADMIN_EMAIL` / `PLAYWRIGHT_ADMIN_PASSWORD` en specs de Odoo),
> definidos en `.env.local` (gitignored).

## Colecciones

| Archivo | Descripción |
|---------|-------------|
| `contracts.postman_collection.json` | Colección principal con health, auth, catálogo público, webhook, KDS |
| `production.postman_environment.json` | Ambiente base para producción (`https://api.pesallaccia.com`) |

## Uso

```bash
# Ejecutar colección completa contra producción
newman run docs/tests/newman/contracts.postman_collection.json \
  --environment docs/tests/newman/production.postman_environment.json \
  --reporters cli,html \
  --reporter-html-export docs/tests/newman/report.html
```

## Notas

- Completar las variables secretas (`MASTER_API_KEY`, `adminPassword`) antes de ejecutar.
- En CI/CD, ejecutar después del build y antes del deploy.
- Esta suite no reemplaza Playwright; es complementaria para validar contratos de API.
