# 192 — La cadena de migraciones de Prisma no puede construir una base limpia (`employees` inexistente)

**Fecha:** 2026-10-22
**Componente:** Backend / Prisma / Migraciones
**Estado:** ⚠️ Confirmado (pendiente de decisión de baseline)
**Detectado en:** intento de upgrade de Hetzner `1.36.5 → 1.40.2`

## Síntoma

Ejecutar `prisma migrate deploy` contra una base **vacía** falla en la novena migración:

```
Applying migration `20260920210000_sync_hr_schema`
Error: P3018
Migration name: 20260920210000_sync_hr_schema
Database error code: 42P01
ERROR: relation "employees" does not exist
```

## Reproducción mínima

```bash
docker exec orderflow_db psql -U orderflow -d postgres -c "CREATE DATABASE orderflow_rehearsal;"
cd backend
DATABASE_URL="postgresql://orderflow:***@localhost:5433/orderflow_rehearsal?schema=public" \
  npx prisma migrate deploy
# → P3018 en 20260920210000_sync_hr_schema
```

## Causa raíz

La migración `20260920210000_sync_hr_schema` hace `ALTER TABLE "employees" ADD COLUMN ...`,
pero **ninguna migración anterior crea la tabla `employees`**. El historial de migraciones del
repo está incompleto respecto al `schema.prisma` (patrón ya señalado en el diagnóstico OpenCore:
52 `CREATE TABLE` en migraciones frente a 161 modelos), porque la base histórica se construyó
combinando `db push` y migraciones manuales.

Consecuencia: **`migrate deploy` funciona sólo sobre bases ya existentes** (Provecchio), no sobre
una base nueva. Cualquier host con historial divergente o vacío queda bloqueado.

## Estado actual de los entornos

| Entorno | Tablas | Filas | Migraciones | Situación |
|---|---|---|---|---|
| Provecchio (`provecchio.com`) | 168 | datos reales | 39 aplicadas | ✅ operativo |
| Hetzner (`pesallaccia.com`) | **73** | **0 filas** (0 tenants/productos/pedidos) | 34 aplicadas + **2 fallidas** | ⚠️ esquema incompleto |

Migraciones fallidas en Hetzner:

| Migración | Error | Estado |
|---|---|---|
| `20260920210000_sync_hr_schema` | `relation "employees" does not exist` | rolled back (2026-09-24) |
| `20260927193000_kds_multi_station_printing` | `column "tenant_id" does not exist` (en `products`, que sigue en `tenantId`) | **fallida, bloquea todo `migrate deploy`** |

Además, `prisma migrate diff` entre Hetzner y el `schema.prisma` de v1.40.2 arroja **3.771 líneas**
(95 `CREATE TABLE`, 89 `DROP COLUMN`, 12 `ADD COLUMN`): la base de Hetzner está ~4 versiones atrás.

## Opciones de resolución

1. **Baseline por `db push` + `migrate resolve --applied`** (recomendada para Hetzner, que tiene **0 filas**):
   generar el esquema de v1.40.2 con `prisma db push --accept-data-loss --skip-generate` y marcar
   las 39 migraciones como aplicadas. Riesgo de pérdida de datos: **nulo** (0 filas).
2. **Reparar el historial de migraciones**: crear las migraciones faltantes (`employees`, etc.) y
   reescribir la cadena hasta que `migrate deploy` funcione en vacío. Correcto a largo plazo, pero
   es un proyecto aparte y debe ensayarse en una copia.
3. **No actualizar Hetzner**: mantener `1.36.5` con el 502 ya resuelto.

## Lección

Toda release que exija reconstruir una base desde cero debe validarse con el ensayo de
`migrate deploy` en una base vacía **antes** de dar por bueno el pipeline. Este ensayo debería
formar parte de `scripts/init.sh`.
