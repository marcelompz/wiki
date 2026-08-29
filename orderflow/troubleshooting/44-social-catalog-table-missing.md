# 🛠️ Troubleshooting #44 — Tabla `social_catalogs` Faltante (Módulo OmniCatalog)

## 📅 Fecha
2026-08-19

## 🎯 Síntoma
- Módulo **Catálogo Social (OmniCatalog)** no carga catálogos en `/admin/social-catalog`
- UI muestra lista vacía o error al guardar configuración
- `docker exec orderflow-database-1 psql -U orderflow -d orderflow_db -c "\dt social_catalogs"` → `relation "social_catalogs" does not exist`
- Logs frontend: `PUT payload` enviado pero no hay respuesta exitosa

## 🔍 Causa Raíz
El modelo `SocialCatalog` (y tablas relacionadas: `social_catalogs`, `social_catalog_products`, etc.) existe en el schema Prisma pero **faltan las migraciones** que crean estas tablas. Al igual que `ProductCategory` (#42), el modelo existe en el schema pero nunca se generó/aplicó la migración.

## ✅ Solución Aplicada
**Sincronizar schema completo con `db push`:**

```bash
docker compose -f docker-compose.prod.yml run --rm --entrypoint 'npx prisma db push --accept-data-loss' backend
```

Esto crea **todas** las tablas faltantes del schema en una sola pasada:
- `social_catalogs`
- `social_catalog_products`
- `social_catalog_categories`
- `social_catalog_config` (config por tenant)
- `product_categories` (ya verificado en #42)
- Cualquier otro modelo nuevo sin migración

## ✅ Verificación
```bash
# Ver tablas creadas
docker exec orderflow-database-1 psql -U orderflow -d orderflow_db -c "\dt social*"
# social_catalogs, social_catalog_products, social_catalog_categories, social_catalog_config

# Ver catálogos existentes
docker exec orderflow-database-1 psql -U orderflow -d orderflow_db -c "SELECT id, name, slug, active FROM social_catalogs"

# Probar endpoint
wget -qO- --header='x-api-key: <TENANT_KEY>' http://localhost:3010/api/v1/social-catalog/config
```

## ⚠️ Nota
`db push` crea las tablas pero **no registra migraciones**. Para mantener historial:
1. En desarrollo: `npx prisma migrate dev --name add_social_catalog_tables`
2. Commit y push
3. En producción: `migrate deploy` aplicará la nueva migración

## 🔗 Referencias
- Relacionado: #42 (ProductCategory), #43 (shadow DB)
- Módulos: `backend/src/social-catalog/`, `backend/src/catalog/`
