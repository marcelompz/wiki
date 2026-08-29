# 🛠️ Troubleshooting #52 — Tabla `_ProductTags` Faltante (Relación Product-Tag)

## 📅 Fecha
2026-08-22

## 🎯 Síntoma
- Endpoint `GET /api/v1/social-catalog/products` retorna **500 Internal Server Error**
- Logs del backend:
```
Invalid `prisma.product.findMany()` invocation:
The table `public._ProductTags` does not exist in the current database.
```
- Error ocurre al cargar catálogo social en `pesallaccia.com` y `provecchio.com`

## 🔍 Causa Raíz
El modelo `Product` tiene una relación many-to-many con `Tag` definida como:
```prisma
tags Tag[] @relation("ProductTags")
```

Prisma crea automáticamente la tabla de unión `_ProductTags` para esta relación. Sin embargo:
1. La migración `20260822_add_ribbon_tag` (que crea `_ProductTags`, `tags`, `ribbons`, `ribbon_rules`, `tenant_settings`) **nunca se aplicó en producción**
2. La migración `20260812_sync_production_schema` estaba en estado **fallido** (error: `constraint "follow_up_jobs_ruleId_fkey" does not exist`), bloqueando todas las migraciones subsiguientes
3. Por tanto, las tablas nuevas del schema Prisma no existían en la BD de producción

## ✅ Solución Aplicada
**Sincronizar schema completo con `db push` (bypass de migraciones fallidas):**

```bash
# En el servidor de producción (Hetzner)
ssh hetzner-orderflow "docker compose -f /srv/orderflow/docker-compose.prod.yml run --rm --entrypoint 'npx prisma db push --accept-data-loss' backend"

# En el servidor de producción (Dimora)
ssh dimoraserverlocal "docker compose -f /srv/orderflow/docker-compose.prod.yml run --rm --entrypoint 'npx prisma db push --accept-data-loss' backend"
```

Esto crea **todas** las tablas faltantes del schema en una sola pasada:
- `_ProductTags` (tabla de unión Product ↔ Tag)
- `tags`
- `ribbons`
- `ribbon_rules`
- `tenant_settings`
- Cualquier otro modelo nuevo sin migración

**Reiniciar backend:**
```bash
ssh hetzner-orderflow "docker restart orderflow-backend-prod"
ssh dimoraserverlocal "docker restart orderflow-backend-prod"
```

## ✅ Verificación
```bash
# Ver tablas creadas
docker exec orderflow-database-1 psql -U orderflow -d orderflow_db -c "\dt _Product* tags ribbons"

# Probar endpoint
curl -H "x-api-key: <TENANT_KEY>" http://localhost:3010/api/v1/social-catalog/products
```

## ⚠️ Nota Importante
`prisma db push` **no crea migraciones** — solo sincroniza el schema actual con la BD. Para mantener historial:

1. En desarrollo: `npx prisma migrate dev --name add_product_tag_ribbon`
2. Commit y push
3. En producción: `migrate deploy` aplicará la nueva migración (requiere resolver la migración fallida `20260812_sync_production_schema` primero)

## 🔗 Referencias
- Relacionado: #42 (ProductCategory), #44 (social_catalogs), #43 (shadow DB)
- Migración bloqueante: `20260812_sync_production_schema` (error FK `follow_up_jobs_ruleId_fkey`)
- Schema: `backend/prisma/schema.prisma` líneas 230-231 (relation ProductTags), 248-265 (model Tag), 267-283 (model Ribbon)