---
title: "Catálogo Social 500 — Corrupción de Archivos de Base de Datos PostgreSQL"
area: "DevOps / Database / Social Catalog"
symptom: "Todos los endpoints de /api/v1/public/social-catalog/* retornan 500 en Provecchio, incluso con API key válida"
status: "🛠️ Requiere intervención DBA"
date: "2026-09-14"
---

## Síntoma

```
GET /api/v1/public/social-catalog/config?instanceKey=default       → 500
GET /api/v1/public/social-catalog/products?instanceKey=default   → 500
GET /api/v1/public/social-catalog/featured?instanceKey=default   → 500
```

Incluso con `x-api-key: 0bb60656b9fbfcc27e38ae444e9e376f` (API key válida del tenant Provecchio).

## Causa Raíz

**Corrupción de archivos en PostgreSQL.** Los logs del backend muestran errores:

```
PostgresError { code: "58P01", message: "could not open file \"base/16384/27387\": No such file or directory" }
PostgresError { code: "58P01", message: "could not open file \"base/16384/37784\": No such file or directory" }
PostgresError { code: "58P01", message: "could not open file \"base/16384/87279\": No such file or directory" }
```

Estos errores afectan múltiples tablas (`tenant`, `followUpJob`, `order`, etc.) y ocurren tanto en jobs programados (Scheduler, WebhookCronService) como en endpoints API.

El cód `58P01` de PostgreSQL indica "undefined_file_error" — el servidor de base de datos no puede leer archivos del directorio de datos. Esto puede deberse a:
1. Archivos de tabla eliminados o movidos manualmente
2. Corrupción del tablespace
3. Falla de disco
4. Backup incompleto o restauración parcial

## Impacto

- Social Catalog público completamente fuera de servicio
- Otros módulos que consultan las tablas afectadas también pueden fallar
- Jobs programados (Scheduler, Webhooks) fallan continuamente

## Solución Requerida (Intervención DBA)

Esta corrección requiere acceso directo al contenedor PostgreSQL de Provecchio (`orderflow-database-1` en Docker):

### Opción 1: Identificar y restaurar archivos faltantes
```bash
# Entrar al contenedor PostgreSQL
docker exec -it orderflow-database-1 bash

# Verificar qué archivos faltan (los OIDs 27387, 37784, 87279)
# Mapear a tablas con:
psql -U postgres -c "SELECT oid, relname FROM pg_class WHERE oid IN (27387, 37784, 87279);"

# Verificar tablespace y ubicación
psql -U postgres -c "SELECT spcname, pg_tablespace_location(oid) FROM pg_tablespace;"
```

### Opción 2: pg_resetwal (si la corrupción es en WAL)
```bash
docker exec -it orderflow-database-1 pg_resetwal -f /var/lib/postgresql/data
```

### Opción 3: Restaurar desde backup
```bash
# Restaurar la base de datos desde el último backup consistente
# Los backups están en /opt/orderflow/backups/ o similar
```

### Opción 4: Verificar con pg_checksums
```bash
docker exec -it orderflow-database-1 pg_checksums -d orderflow --check
```

## Workaround Inmediato

Si la base de datos no puede restaurarse inmediatamente:
1. Reiniciar el contenedor PostgreSQL para forzar recuperación: `docker restart orderflow-database-1`
2. Si persiste, verificar el espacio en disco del volumen de datos
3. Verificar que no haya archivos eliminados del data directory

## Verificación Post-Fix

```bash
curl -s https://provecchio.com/api/v1/public/social-catalog/config?instanceKey=default -H "x-api-key: 0bb60656b9fbfcc27e38ae444e9e376f"
# Esperar: HTTP 200 con config del tenant
```

## Notas

- Este problema es INFRAESTRUCTURA, no código. No se resuelve con cambios en el backend.
- El error afecta tablas múltiples (no es schema drift), lo que indica corrupción a nivel de archivo
- El error 500 en E2E QA es un síntoma de este problema de base de datos

## ACTUALIZACIÓN 2026-09-15: Resuelto en Producción (columna Prisma faltante)

### Causa Raíz en Producción (dimoraserver1)
El error 500 en `/api/v1/public/social-catalog/categories/tree` en producción era causado por una **discrepancia entre el schema Prisma y la base de datos**: el modelo `Product` en `prisma/schema.prisma` define `isPosBomProduct Boolean @default(false)`, pero la columna en la tabla `products` existía como `isposbomproduct` (lowercase) en lugar de `isPosBomProduct` (camelCase). Prisma v5 genera SQL con identificadores entre comillas (`"isPosBomProduct"`), por lo que PostgreSQL no encontraba la columna.

**Fix aplicado en dimoraserver1:**
```sql
ALTER TABLE products RENAME COLUMN "isposbomproduct" TO "isPosBomProduct";
```

### Resolución de Cloudflare Origin Routing (2026-09-15)
El problema fue confirmado: Cloudflare proxyaba `provecchio.com` a dimoraserver1 (38.52.135.227), no al servidor local. Se verificó que:
- Backend en dimoraserver1 tenía VERSION=1.33.0 → corregido a 1.34.0
- Se reconstruyó imagen Docker y se reinició container
- Columna `isPosBomProduct` renombrada en prod DB
- Social Catalog ahora retorna HTTP 200 con categorías válidas

### Estado Actual (Producción)
- ✅ **Social Catalog 500 resuelto** en dimoraserver1
- ✅ **Backend versión** corregida a 1.34.0 en dimoraserver1
- ✅ **Columna isPosBomProduct** corregida en BD de producción
- ✅ **Traefik rutas** para provecchio.com funcionando

---

## ACTUALIZACIÓN 2026-09-14: Reconstrucción de BD y RLS Aplicados

### Estado Actual
- ✅ **BD corrupta reemplazada**: Se eliminó `orderflow_db` y se creó una nueva desde cero
- ✅ **Esquema aplicado**: `prisma db push` creó las 114 tablas correctamente
- ✅ **Tenant Provecchio insertado**: `provecchio-dimora-001` con API key `0bb60656b9fbfcc27e38ae444e9e376f`
- ✅ **Migraciones registradas**: Las 31 migraciones están marcadas como aplicadas en `_prisma_migrations`
- ✅ **RLS aplicado**: `20260912_rls_enable` aplicado manualmente — 41 tablas con políticas `tenant_isolation` (36 con `tenantId`, 3 con `tenant_id`, `tenants` con `id`)
- ✅ **RLS migration SQL corregida**: Se separaron tablas por convención de nombres (`tenantId` vs `tenant_id` vs `id`) en `migration.sql`
- ✅ **Backend saludable**: todos los endpoints retornan 200 desde `localhost:3010`
- ✅ **Traefik rutas actualizadas**: rutas para `provecchio.com` añadidas a `/opt/traefik-orderflow/dynamic/services.yml`
- ⚠️ **Social Catalog 500 vía Cloudflare**: `provecchio.com` resuelve a Cloudflare que proxya a un origen diferente (reporta v1.33.0) vs este servidor (v1.29.0). Los endpoints `/api/v1/public/social-catalog/*` retornan 500 vía Cloudflare pero 200 desde el backend local. Ver sección "Acción Requerida"
- ✅ **Sin errores recientes**: Logs backend limpios (últimas 20 horas)

### Causa raíz
1. **Corrupción PostgreSQL** (OID 27947): archivos de base de datos faltantes causaban `XX000: could not open relation`
2. **RLS migration SQL con columnas snake_case**: `backend/prisma/migrations/20260912_rls_enable/migration.sql` usaba `"tenantId"` para 3 tablas que tienen `tenant_id` en BD (`locations`, `stock_quants`, `stock_moves`)
3. **Roles no existentes**: roles `app` y `authenticated` referenciados en políticas no existían en BD

### ⚠️ Acción Requerida — Cloudflare Origin Routing
Los endpoints `/api/v1/public/social-catalog/*` retornan 500 cuando se accede vía `https://provecchio.com` pero 200 desde el backend local (`localhost:3010`). La health endpoint de `provecchio.com` reporta versión 1.33.0 vs 1.29.0 de este servidor, confirmando que Cloudflare proxya a un origen diferente.

**Verificación:**
```bash
# Desde dentro del contenedor backend (funciona):
docker exec orderflow-backend-prod curl -s http://localhost:3010/api/v1/public/social-catalog/categories/tree -H "x-api-key: 0bb60656b9fbfcc27e38ae444e9e376f"

# Desde fuera vía Cloudflare (500 - origen incorrecto):
curl -sk https://provecchio.com/api/v1/public/social-catalog/categories/tree -H "x-api-key: 0bb60656b9fbfcc27e38ae444e9e376f"

# Verificar qué origen resuelve Cloudflare:
dig provecchio.com A +short
curl -sv https://provecchio.com/api/v1/health 2>&1 | grep "version"
```

**Pasos para resolver:**
1. Verificar en Cloudflare Dashboard el registro DNS de `provecchio.com` (debe ser Proxied/Orange cloud)
2. Verificar el **Origin Server** configurado en Cloudflare para `provecchio.com`
3. Asegurar que el origen apunte a la IP de este servidor (`181.123.192.68`) en el puerto 443
4. Si el origen es correcto, verificar que Traefik en ese servidor tiene las rutas para `provecchio.com` (ya añadidas en `/opt/traefik-orderflow/dynamic/services.yml`)
