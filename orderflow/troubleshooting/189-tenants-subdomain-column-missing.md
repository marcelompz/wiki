# 189 — Columna `tenants.subdomain` Faltante

## Síntoma
- `GET /api/v1/tenants/public/tenant-by-subdomain/provecchio.local` → HTTP 500.
- `POST /api/v1/auth/login` → HTTP 500 (dependiente de la misma tabla).
- Logs del backend: `Invalid prisma.tenant.findFirst(): The column tenants.subdomain does not exist in the current database.`

## Causa Raíz
La base de datos fue recreada desde cero durante las correcciones de infraestructura. El modelo `Tenant` en `schema.prisma` tiene `subdomain String? @unique` (línea 69) y `@@index([subdomain])` (línea 4437), pero la tabla real en PostgreSQL no tenía la columna `subdomain`. Prisma generó el cliente contra el schema actual, y al ejecutar la query, falló porque la columna no existía en la BD.

## Solución Aplicada
```sql
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "subdomain" VARCHAR(255);
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "subdomainVerified" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS "tenants_subdomain_key" ON "tenants" ("subdomain");
```

## Estado
- Columna agregada correctamente.
- Endpoint `GET /api/v1/tenants/public/tenant-by-subdomain/:subdomain` ahora retorna `404 Tienda no encontrada` (esperado, sin tenants en BD fresca) en vez de 500.
- Endpoint `POST /api/v1/auth/login` ahora retorna `404 User not found or inactive` (esperado, sin usuarios) en vez de 500.

## Notas
- La BD tiene 0 tenants porque fue recreada. Se requiere seed de tenants iniciales (provecchio-dimora-001 con subdomain `provecchio.local`) antes de que el frontend pueda cargar el login.
- Ver también: `#190-superadmin-auth-integrations-403.md`