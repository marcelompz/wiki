# 171 — Provecchio v1.38.21: POS Products Missing & QR URL Shows OmniLinks Page

## Área
Backend / Frontend / Deploy / Provecchio

## Síntoma principal
Tras deploy v1.38.21 en Provecchio (dimoraserverlocal / 192.168.69.240):
1. **POS products no se ven**: `GET /api/v1/products` retorna HTTP 500 con error Prisma: `The column \`product_variants.tenant_id\` does not exist in the current database.`
2. **QR URL muestra página OmniLinks**: Acceder a `https://provecchio.com/?t=<token>` carga la landing page de BioLinks en vez del catálogo de mesa (OmniCatalog/Gastro POS).

---

## Causa Raíz

### Issue 1: POS Products 500 — Prisma Schema Drift (`product_variants.tenant_id`)
- **Base de datos**: La tabla `product_variants` tiene columna `tenantId` (camelCase) — **no** `tenant_id` (snake_case).
- **Schema Prisma** (`backend/prisma/schema.prisma:516`): Definía `tenantId String @map("tenant_id")`, forzando a Prisma a buscar columna `tenant_id` que no existe.
- **Tablas relacionadas afectadas**: `attributes`, `attribute_values`, `product_attribute_lines`, `modifier_groups`, `modifier_options` — todas usan `tenantId` (camelCase) en BD.
- **Tablas con snake_case correcto**: `stock_quants` (`tenant_id`), `stock_moves` (`tenant_id`), `locations` (`tenant_id`), `warehouses` (`tenant_id`) — creadas post-migración 20260912 con convención snake_case + `@map()` explícito.

**Por qué pasó**: La zona legacy (pre-2026-09-12) usa camelCase sin `@map()`. `product_variants` y tablas de variantes/atributos/modificadores son legacy. El schema tenía `@map("tenant_id")` incorrecto heredado de plantilla nueva.

### Issue 2: QR URL → OmniLinks — `VITE_ROOT_DOMAIN` Incorrecto
- **`App.tsx:50-58`**: Detecta subdominio tenant comparando `hostname` contra `ROOT_DOMAIN` (viene de `import.meta.env.VITE_ROOT_DOMAIN`).
- **`docker-compose.prod.yml`**: `VITE_ROOT_DOMAIN=${VITE_ROOT_DOMAIN:-pesallaccia.com}` — default hardcodeado a `pesallaccia.com`.
- **`.env.prod` en servidor**: No tenía `VITE_ROOT_DOMAIN` → build usaba default `pesallaccia.com`.
- **Resultado**: Al acceder a `provecchio.com`, `App.tsx` no lo reconoce como tenant subdomain → `isSubdomainStore = false` → renderiza `<LandingBioLinksCatalog />` (omni-links) en vez de `<PublicStorefrontPage />` → OmniCatalog.

---

## Solución Aplicada

### Fix 1: Schema Prisma — Quitar `@map("tenant_id")` de tablas legacy
```prisma
// backend/prisma/schema.prisma — model ProductVariant
tenantId       String  // SIN @map("tenant_id") — DB usa camelCase
```
Aplicar igual a: `Attribute.tenantId`, `AttributeValue.tenantId`, `ProductAttributeLine.tenantId`, `ModifierGroup.tenantId`, `ModifierOption.tenantId`.

**Regla**: Tablas legacy (pre-2026-09-12) = camelCase sin `@map()`. Tablas nuevas = snake_case con `@map("tenant_id")` explícito. Ver [#06](06-postgresql-camelcase-column-names.md) y [#132](132-rls-migration-snakecase-columns.md).

### Fix 2: Frontend Env — Set `VITE_ROOT_DOMAIN=provecchio.com`
En servidor Provecchio (`/srv/orderflow/.env.prod`):
```bash
VITE_ROOT_DOMAIN=provecchio.com
```
Luego rebuild frontend: `docker compose -f docker-compose.prod.yml --env-file .env.prod build --no-cache frontend`

**Nota**: `VITE_API_URL=/api` (relativo) ya está correcto en `.env.prod` — ver [#164](164-provecchio-login-blocked-by-vite-api-url.md).

---

## Verificación

| Test | Comando | Esperado |
|------|---------|----------|
| Products API | `curl -H 'x-api-key: provecchio-api-key-2026' https://provecchio.com/api/v1/products` | 200 OK + array productos |
| QR Table URL | `curl https://provecchio.com/?t=7b0075a2-811e-440c-b426-26fbf2b52e33` | HTML con `<title>OmniFlow</title>` + assets cargados |
| Frontend env | `docker exec orderflow-frontend-prod grep provecchio.com /app/dist/assets/index-*.js` | `VITE_ROOT_DOMAIN=provecchio.com` presente |

---

## Referencias
- [#06](06-postgresql-camelcase-column-names.md) — Convención columnas legacy vs nuevas
- [#132](132-rls-migration-snakecase-columns.md) — Migración RLS snake_case
- [#164](164-provecchio-login-blocked-by-vite-api-url.md) — `VITE_API_URL` relativo
- [#169](169-provecchio-traefik-qms-routing-fix.md) — Traefik Provecchio config
- Deploy report: `docs/info/DEPLOY_REPORT_PROVECCIO_2026-10-13.md`