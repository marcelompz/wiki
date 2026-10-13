# 🛠️ Troubleshooting #32 — Schema Drift: Columnas Faltantes en Producción

**Estado:** ✅ Resuelto  
**Fecha:** 2026-08-12  
**Área:** Backend / Prisma / Deploy  
**Síntoma principal:** 500 en login y `/api/v1/orders` tras deploy por columnas nuevas sin migración

---

## 📋 Resumen

Tras un deploy a producción (`provecchio.com`), el login comenzó a fallar con HTTP 500.  
El análisis de logs reveló que no era un problema de secrets, sino un **schema drift** entre el `schema.prisma` y la base de datos PostgreSQL.

### Errores observados

```text
Invalid `prisma.user.findUnique()` invocation:
The column `tenants.odooConnection` does not exist in the current database.

Invalid `prisma.order.findMany()` invocation:
The column `orders.seller_id` does not exist in the current database.

Invalid `prisma.order.findMany()` invocation:
The column `orders.traffic_source` does not exist in the current database.
```

---

## 🔍 Causa raíz

Se agregaron múltiples campos al `schema.prisma` sin crear sus respectivas migraciones en `prisma/migrations/`:

- `Tenant.odooConnection` (`Json?`)
- `Order.sellerId` / `seller_id` (`String?`)
- `Order.trafficSource` / `traffic_source` (`String?`)

Además, existían columnas duplicadas con nombres camelCase (`sellerId`, `trafficSource`) conviviendo con las snake_case esperadas por Prisma (`seller_id`, `traffic_source`), resultado de migraciones previas inconsistentes.

El script `deploy-production.sh` ejecuta `prisma migrate deploy` en el contenedor backend, pero al no existir las migraciones en el directorio, Prisma reportaba `No pending migrations to apply` aunque la base de datos no tenía las columnas.

---

## ✅ Solución aplicada

### 1. Diagnóstico inmediato

Se comparó el schema de Prisma contra la base de datos de producción mediante:

```bash
docker exec orderflow-backend-prod npx prisma migrate diff \
  --from-url "postgresql://..." \
  --to-schema-datamodel /app/prisma/schema.prisma \
  --script
```

Esto generó el SQL completo de diferencias, incluyendo:
- Columnas faltantes
- Columnas duplicadas camelCase
- Tablas nuevas (`deploy_instances`)
- Relaciones renombradas (`_ServerTenants` -> `_ServerToTenant`)
- Índices y constraints desincronizados

### 2. Generación de migración integral

Se creó la migración `20260812_sync_production_schema` con el SQL completo del diff, previa verificación de que las tablas afectadas estaban vacías (seguras para DROP):

```bash
SELECT COUNT(*) FROM "_ServerTenants";   -- 0
SELECT COUNT(*) FROM follow_up_jobs;     -- 0
SELECT COUNT(*) FROM retention_rules;    -- 0
```

### 3. Aplicación en producción

```bash
git add backend/prisma/migrations/20260812_sync_production_schema/migration.sql
git commit -m "fix: add migration to sync production DB schema"
git push origin main
./scripts/deploy-production.sh provecchio
```

El deploy aplicó exitosamente la migración y los 500 desaparecieron.

### 4. Medidas correctivas preventivas

- Se removió `prisma/migrations` del `.gitignore` de backend para forzar versionado de migraciones.
- Se generaron migraciones atómicas adicionales para los campos específicos (`odooConnection`, `seller_id`, `traffic_source`) como red de seguridad.
- Se actualizó el QA post-deploy para verificar no solo salud de endpoints, sino también llamadas reales de login y listado de órdenes.

---

## 🧪 Verificación post-deploy

```bash
# Auth
curl -s -o /dev/null -w "%{http_code}" -X POST https://provecchio.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"...","password":"..."}'

# Órdenes
curl -s -o /dev/null -w "%{http_code}" https://provecchio.com/api/v1/orders?page=1&pageSize=50
```

Ambas retornaron `200` luego del deploy correctivo.

---

## 🔗 Referencias

- Contexto vivo del proyecto: [docs/00-contexto-agentes.md](../00-contexto-agentes.md)
- Política de deploys: [docs/troubleshooting/README.md](README.md) — entrada #24
