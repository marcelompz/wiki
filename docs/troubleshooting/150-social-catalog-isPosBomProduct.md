# Troubleshooting: Social Catalog Products API 500 — Column isPosBomProduct Missing

## Fecha
2026-09-16

## Síntoma
`GET /api/v1/admin/social-catalog/products` retorna 500 con mensaje:
```
Invalid prisma.product.findMany() invocation: The column `products.isPosBomProduct` does not exist in the current database.
```

## Causa Raíz
El schema Prisma (`prisma/schema.prisma`) define `isPosBomProduct Boolean @default(false)` en el modelo `Product`, pero la columna correspondiente nunca fue creada en la base de datos (migración no aplicada o schema no sincronizado).

## Solución Aplicada
```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS "isPosBomProduct" BOOLEAN DEFAULT false;
```

## Verificación
```bash
docker exec -i orderflow-database-1 psql -U orderflow -d orderflow_db -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'isPosBomProduct';"
```

## Prevención
- Al actualizar el schema Prisma, siempre ejecutar `npx prisma migrate dev` o aplicar las migraciones correspondientes en producción.
- Verificar que el backend esté en sync con la DB antes de levantar el container.

## Estado
✅ Resuelto
