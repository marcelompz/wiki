# 🛠️ Troubleshooting #42 — Tabla `product_categories` Faltante (Migración FEAT-077 no Creada)

## 📅 Fecha
2026-08-19

## 🎯 Síntoma
- Endpoint `GET /api/v1/catalog/categories/tree` retorna **500 Internal Server Error**
- Frontend muestra: `Error loading category tree: AxiosError: Request failed with status code 500`
- `docker exec orderflow-database-1 psql -U orderflow -d orderflow_db -c "\dt product_category"` → `Did not find any relation named "product_category"`

## 🔍 Causa Raíz
El modelo `ProductCategory` existe en `backend/prisma/schema.prisma` (agregado en FEAT-077 OmniCatalog) **pero nunca se generó la migración correspondiente**. 

Prisma reportaba "Database schema is up to date!" porque **todas las migraciones existentes estaban aplicadas**, pero el modelo nuevo no tenía migración asociada.

## ✅ Solución Aplicada
1. **Verificar modelo en schema**: `grep -n 'model ProductCategory' backend/prisma/schema.prisma` → existe en línea 237
2. **Sincronizar schema con BD** (en producción, sin migración formal):
   ```bash
   docker compose -f docker-compose.prod.yml run --rm --entrypoint 'npx prisma db push --accept-data-loss' backend
   ```
3. Verificar tabla creada:
   ```bash
   docker exec orderflow-database-1 psql -U orderflow -d orderflow_db -c "\dt product*"
   # product_categories | BASE TABLE
   ```
4. Verificar endpoint:
   ```bash
   wget -qO- --header='x-api-key: <TENANT_KEY>' http://localhost:3010/api/v1/catalog/categories/tree?includeProducts=true&maxLevel=2
   ```

## ⚠️ Nota Importante
`prisma db push` **no crea migración** — solo sincroniza el schema actual con la BD. Para entornos con CI/CD estricto, después generar la migración formal:
```bash
# En desarrollo local
npx prisma migrate dev --name add_product_category
git add backend/prisma/migrations/2026xxxx_add_product_category/
git commit -m "feat: add ProductCategory migration"
```

## 🔗 Referencias
- Relacionado: #43 (migración shadow DB falla)
- Schema: `backend/prisma/schema.prisma` línea 237
- Commit relacionado: `prisma db push` ejecutado en Provecchio 2026-08-19
