# Troubleshooting #30: Provecchio Migration History Inconsistency

**Fecha:** 2026-08-08  
**Severidad:** Alta  
**Entorno:** Provecchio (provecchio.com)  
**Estado:** Resuelto

---

## Síntoma

Durante el deploy a Provecchio via WAN (jump host 38.52.135.227:2021), `prisma migrate deploy` fallaba repetidamente con errores `P3018` / `P3009`:

```
ERROR: column "sessionConfig" of relation "tenants" already exists
ERROR: column "paymentStatus" of relation "orders" already exists  
ERROR: column "userId" of relation "contacts" already exists
```

Las migraciones fallaban porque las columnas ya existían en la base de datos, pero el historial de migraciones (`_prisma_migrations`) tenía entradas duplicadas, incompletas o en estado `failed`.

---

## Causa Raíz

**Cambios de schema aplicados manualmente en la DB de Provecchio sin registrar migraciones Prisma.**

Alguien ejecutó `ALTER TABLE ... ADD COLUMN` directo en PostgreSQL (probablemente via psql o herramienta GUI) para agregar columnas como:
- `tenants.sessionConfig`
- `orders.paymentStatus`
- `contacts.userId`
- etc.

Esto hizo que el schema real de la DB estuviera "adelantado" respecto al historial de migraciones de Prisma. Cuando Prisma intentaba aplicar las migraciones correspondientes, fallaban por colisión de nombres (error 42701).

Además, la tabla `_prisma_migrations` tenía entradas duplicadas y con `finished_at = NULL`, lo que confundía a Prisma.

---

## Solución Aplicada

### 1. Limpiar entradas duplicadas/fallidas en `_prisma_migrations`
```sql
DELETE FROM _prisma_migrations WHERE finished_at IS NULL;
```

### 2. Marcar migraciones "fantasma" como aplicadas
Para cada migración que Prisma intentaba aplicar pero la columna ya existía:
```bash
npx prisma migrate resolve --applied <migration_name>
```
Ejecutado para:
- `20260706000000_add_session_config`
- `20260729000000_add_payment_model`
- `20260805173200_contacts_improvements`

### 3. Crear baseline migration para sincronizar historial
Generar SQL del schema actual completo:
```bash
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/20260101000000_baseline_provecchio/migration.sql
```

Esto crea una migración "baseline" que representa el estado actual de la DB. Como el schema ya coincide, Prisma la detecta como "no pending" y no intenta aplicarla.

### 4. Agregar check preventivo en deploy script
En `scripts/deploy-production.sh`, antes de `prisma migrate deploy`:
```bash
# Verificar migraciones pendientes
npx prisma migrate status --json
# Parsear y advertir si hay pendientes
```

---

## Prevención Futura

### Regla Obligatoria: **Nunca modificar schema directo en producción**
- Todo cambio de schema = migración Prisma (`npx prisma migrate dev` en local, commit, deploy)
- Prohibido `ALTER TABLE`, `CREATE INDEX`, etc. directo en psql/GUI en prod

### Baseline inicial para entornos existentes
Si un entorno ya tiene schema "a futuro" sin historial coherente:
1. Generar baseline (`prisma migrate diff --from-empty`)
2. Registrar como aplicada (`prisma migrate resolve --applied`)
3. A partir de ahí, solo migraciones normales

### CI/CD Gate
En pipeline de PR: `prisma migrate diff` comparando schema actual vs `prisma/schema.prisma`. Fallar si hay drift no versionado.

### Documentación en deploy script
El check de `prisma migrate status --json` ahora advierte antes de aplicar, permitiendo detectar inconsistencias temprano.

---

## Verificación Post-Fix

Deploy exitoso a Provecchio:
- ✅ 0 migraciones pendientes detectadas
- ✅ `prisma migrate deploy` → "No pending migrations to apply"
- ✅ Health checks backend/frontend OK
- ✅ Traefik v3.3 activo
- ✅ E2E QA Playwright: catálogo público, dominio, panel admin (6 módulos) sin errores JS ni HTTP 500

---

## Referencias
- [Prisma Migrate Resolve Docs](https://www.prisma.io/docs/orm/prisma-migrate/workflows/resolving-migration-issues)
- [Prisma Migrate Diff](https://www.prisma.io/docs/orm/prisma-migrate/workflows/baselining)
- Deploy script: `scripts/deploy-production.sh` (líneas ~150-160)