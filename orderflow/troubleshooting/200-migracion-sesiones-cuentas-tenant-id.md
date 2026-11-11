# 200 — Migración de sesiones/cuentas falla con `column "tenant_id" does not exist`

**Fecha:** 2026-10-23  
**Área:** PostgreSQL / Prisma / OmniGastro  
**Estado:** ✅ Resuelto (v1.42.0)

## Síntoma

Al validar la migración `20261023120000_gastro_table_sessions_bills` contra la base
local:

```text
CREATE UNIQUE INDEX ...
ERROR:  column "tenant_id" does not exist
```

La migración había creado las tablas nuevas en `snake_case` y agregado columnas
nuevas también en `snake_case` a `orders`, pero el índice de idempotencia usaba
`"tenant_id"` en `orders`.

## Causa raíz

`orders` es una tabla **legacy** creada antes de la convención `snake_case`
(AGENTS §2.4, troubleshooting #06): sus columnas históricas son `camelCase`
(`"tenantId"`, `"customerId"`, `"createdAt"`), mientras que las columnas nuevas
agregadas por esta feature (`table_session_id`, `bill_id`, `guest_key`,
`idempotency_key`) sí son `snake_case`.

El índice mezclaba ambas convenciones y referenciaba una columna inexistente.

## Solución aplicada

En `backend/prisma/migrations/20261023120000_gastro_table_sessions_bills/migration.sql`:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS "orders_idempotency_key_unique"
  ON "orders" ("tenantId", "idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;
```

Regla para futuras migraciones cross-cutting: antes de escribir un índice/FK
sobre una tabla existente, verificar **columna por columna** la convención real
en PostgreSQL (`information_schema.columns`), nunca asumir que toda la tabla es
`snake_case`.

## Verificación

La migración completa se ejecutó dos veces dentro de una transacción con
`ROLLBACK` sobre la base local (valida sintaxis y FKs sin persistir), y luego se
aplicó con `prisma migrate deploy`. Los índices parciales quedaron creados:

- `table_sessions_one_open_per_table`
- `orders_one_active_per_guest`
- `orders_idempotency_key_unique`
- `table_guests_session_seat`
