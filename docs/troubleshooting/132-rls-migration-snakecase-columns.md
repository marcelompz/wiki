# RLS Migration — Columnas snake_case en Migration SQL

## Symptom

Al ejecutar la migración Prisma `20260912_rls_enable` via `prisma migrate deploy` o `psql`, falla con error:

```
ERROR: column <table>.tenantId does not exist
```

Las tablas `locations`, `stock_quants` y `stock_moves` tienen la columna `tenant_id` (snake_case) en lugar de `tenantId` (camelCase).

## Root Cause

El archivo `backend/prisma/migrations/20260912_rls_enable/migration.sql` asume que TODAS las tablas usan `tenantId` (camelCase) como nombre de columna. Sin embargo, 3 tablas usan `tenant_id` (snake_case) con `@map("tenant_id")` en el schema.prisma:

- `locations` → columna `tenant_id`
- `stock_quants` → columna `tenant_id`
- `stock_moves` → columna `tenant_id`

## Solution

La migración SQL fue corregida para separar las tablas en dos bloques DO:

1. **Primer bloque** (DO $$ ... END $$;): tablas con `tenantId` — usa `tbl."tenantId" = app_current_tenant_id()`
2. **Segundo bloque** (DO $$ ... END $$;): tablas con `tenant_id` — usa `tbl."tenant_id" = app_current_tenant_id()`
3. **Tabla `tenants`** (sección final): usa `id = app_current_tenant_id()` (auto-referencial)

### Aplicar en Provecchio (o cualquier entorno)

```bash
# La migración corregida ya está en el archivo del repo:
cat backend/prisma/migrations/20260912_rls_enable/migration.sql | docker exec -i orderflow-database-1 psql -U orderflow -d orderflow_db
```

### Si la migración ya fue registrada como aplicada pero falló parcialmente

```sql
-- Verificar qué tablas tienen RLS activo:
SELECT relname FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relrowsecurity = true;

-- Si faltan tablas, aplicar el segundo DO block manualmente:
-- (copiar del archivo de migración corregido, línea ~125 en adelante)
```

### Verificación post-aplicación

```sql
-- Todas las tablas deberían tener RLS:
SELECT count(*) FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relrowsecurity = true AND c.relkind = 'r';

-- Verificar políticas:
SELECT polrelid::regclass, polcmd FROM pg_policy ORDER BY polrelid;

-- Verificar que queries filtran correctamente:
SET app.tenant_id = 'provecchio-dimora-001';
SELECT count(*) FROM products; -- debe retornar solo productos del tenant
```

## Affected Environments

- Provecchio (aplicado y verificado 2026-09-14)
- Cualquier despliegue nuevo donde la migración se aplique via `prisma migrate deploy`
