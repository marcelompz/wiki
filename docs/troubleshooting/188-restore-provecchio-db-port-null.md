# 188 — `restore-provecchio.sh` aborta en las migraciones: `DB_PORT` toma el literal `"null"`

> **Fecha:** 2026-10-22 · **Estado:** ✅ **Resuelto** (rama `fix/restore-db-port-null`) · **Detectado en:** deploy v1.40.0
> **Severidad:** baja (no corrompe datos; rompe la repetibilidad del script y oculta el mensaje de cierre)

## Síntoma

Al ejecutar `./scripts/restore-provecchio.sh` con un backup de producción generado por
`backup-production.sh`, el script **restaura correctamente** la base de datos y los uploads:

```text
[12:55:42] ✅ Database restored successfully!
[12:55:42] 📦 Restoring uploads from: /opt/orderflow/backups/pre_deploy_provecchio_20261022_125507_uploads.tar.gz
[12:55:42] ✅ Uploads restored successfully!
[12:55:42] 🔍 Verifying restored database...
[12:55:42] ✅ Verification passed: 168 tables, 1 tenants, 6 employees, 4 cash_registers
[12:55:42] 🔄 Applying pending migrations (prisma migrate deploy)...
```

…y **termina ahí**, con `exit code 1`, sin imprimir el resumen final del restore.

El log revela el valor corrupto en la línea de conexión:

```text
[12:55:31] Extracted connection info: user=orderflow, host=dimoraserverlocal, port=null, database=orderflow_db, auth_method=ssh_key
```

## Causa raíz

El `backup_info.json` que genera `backup-production.sh` para `provecchio` trae
`connection.port = null` (la conexión real se hace por SSH al contenedor, sin puerto TCP publicado).
`jq -r` convierte ese JSON `null` en la **cadena** `"null"`:

```bash
DB_PORT=$(jq -r '.connection.port' "$BACKUP_INFO_FILE" 2>/dev/null)   # → "null" (string, no vacío)
DB_PORT=${DB_PORT:-5433}                                              # "null" no es "", se conserva
```

Después, la construcción de la URL local para Prisma sustituye host:puerto:

```bash
LOCAL_DATABASE_URL=$(echo "$LOCAL_DATABASE_URL" | sed -E "s#@[^/:@]+:[0-9]+/#@localhost:${DB_PORT}/#")
# → postgresql://orderflow:***@localhost:null/orderflow_db
```

`prisma migrate deploy` no puede parsear `localhost:null` y falla. Como el script corre con
`set -euo pipefail`, la asignación `MIGRATE_OUT=$(... npx prisma migrate deploy ...)` propaga el
código de salida y el script **aborta antes** del `log "✅ Restore completed successfully!"`.

> **Nota:** el bloque de migraciones se agregó en la release v1.39.28 justamente para dejar la base
> local fiel al código. El bug quedó latente hasta el primer restore ejecutado con ese bloque.

## Impacto

- **Datos:** ninguno. El dump se restaura íntegro y la verificación de conteos (168 tablas,
  1 tenant, 6 empleados, 4 cajas) pasa antes del punto de fallo.
- **Operación:** el script no es repetible de forma desatendida y el deploy-to-local-first
  (§3.1.1) requiere intervención manual para confirmar las migraciones.
- **Diagnóstico:** el mensaje de error real de Prisma **no se muestra** (se captura en
  `MIGRATE_OUT` y el script muere antes de imprimirlo), lo que hace parecer que el restore
  se colgó en lugar de haber fallado.

## Solución aplicada (verificación manual, v1.40.0)

Se ejecutó la migración a mano con la URL correcta y se confirmó que **no había nada pendiente**:

```bash
DBURL=$(grep -E '^DATABASE_URL=' backend/.env | head -1 | cut -d= -f2- | tr -d '"' \
      | sed -E 's#@[^/:@]+:[0-9]+/#@localhost:5433/#')
cd backend && DATABASE_URL="$DBURL" npx prisma migrate deploy
# → 39 migrations found · No pending migrations to apply.
```

## Fix aplicado

Normalizar el literal `"null"` como "sin valor" en los **dos** bloques que extraen `DB_PORT`
(líneas ~63-70 y ~188-195 de `scripts/restore-provecchio.sh`), igual que ya se hace con
`UPLOADS_BACKUP_FILE != "null"`:

```bash
DB_PORT=$(jq -r '.connection.port' "$BACKUP_INFO_FILE" 2>/dev/null)
[ "$DB_PORT" = "null" ] && DB_PORT=""     # normaliza el null de jq
DB_PORT=${DB_PORT:-5433}
```

Se evita además que `set -e` mate el script antes de mostrar el error de Prisma, y se agrega una
guarda que cae a `5433` si `DB_PORT` no es numérico:

```bash
case "$DB_PORT" in
  ''|*[!0-9]*) log "⚠️ DB_PORT invalido ('${DB_PORT}'): se usa 5433"; DB_PORT="5433" ;;
esac

if ! MIGRATE_OUT=$(cd "${BASE_DIR}/backend" && DATABASE_URL="$LOCAL_DATABASE_URL" npx prisma migrate deploy 2>&1); then
  log "❌ prisma migrate deploy failed:"
  echo "$MIGRATE_OUT" | tail -15
  exit 1
fi
```

### Verificación end-to-end

Se volvió a ejecutar el restore completo sobre el mismo backup
(`pre_deploy_provecchio_20261022_125507`):

```text
[13:43:14] Extracted connection info: user=orderflow, host=dimoraserverlocal, port=5433, ...
[13:43:25] ✅ Verification passed: 168 tables, 1 tenants, 6 employees, 4 cash_registers
[13:43:27] ✅ Migraciones aplicadas / al dia: No pending migrations to apply.
[13:43:27] ✅ Restore completed successfully!
EXIT=0
```

Datos intactos tras la re-ejecución: **226 productos, 18 mesas, 4 cajas, 6 empleados,
2 mozos habilitados, 10 usuarios**; `https://provecchio.local/api/v1/health` → `1.40.0`.

## Prevención

- Al construir URLs de conexión a partir de JSON, tratar explícitamente el `null` de `jq`
  (`jq -r` devuelve `"null"`, nunca vacío). Usar `jq -r '.connection.port // empty'` es la forma
  más limpia de evitarlo.
- En scripts con `set -e`, envolver las capturas de salida de comandos externos en `if ! OUT=$(...)`
  para poder registrar el error antes de abortar.

## Referencias

- `scripts/restore-provecchio.sh` (líneas 63-70, 188-195, 297-315)
- `scripts/backup-production.sh` (generación de `backup_info.json`)
- Reporte de deploy: [`docs/plans/omnigastro/DEPLOY_REPORT_2026-10-22-v1.40.0.md`](../plans/omnigastro/DEPLOY_REPORT_2026-10-22-v1.40.0.md) §4.2
- Relacionado: [#186](186-admin-hr-500-empleados-y-404-posiciones.md) (origen del bloque de migraciones)
