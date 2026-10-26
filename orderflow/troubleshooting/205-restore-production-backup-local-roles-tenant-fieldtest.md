# #205 — Restaurar backup de producción en local: roles ausentes (`orderflow_app`/`orderflow_migrator`) y tenant field-test huérfano

> **Fecha:** 2026-10-26 · **Relacionados:** #203, AGENTS §3.1.2 (deploy-to-local-first) · **Impacto:** restore del backup falla o deja datos inconsistentes en `localhost`

## Síntoma

Restaurar `backups/pre_deploy_provecchio_<TS>.sql` (pg_dump plain de `.240`) en la DB local (`orderflow_db`) arroja cientos de `ERROR: role "orderflow_app" does not exist` / `role "orderflow_migrator" does not exist` (GRANT/OWNER en cascada) y, si se importa igual, el restore queda con ownership de roles inexistentes. Además, tras el restore desaparece el tenant local field-test (`tid-provecchio-local`) y **no se puede iniciar sesión con la credencial rotada** si la rotación se aplica solo en prod (hm, inverso: el restore TRAE el hash rotado y las credenciales viejas dejan de funcionar en local).

## Causa raíz

1. Los dumps de prod incluyen `OWNER`/`GRANT` de los roles de prod (`orderflow_app`, `orderflow_migrator`) que **no existen en la DB local** (local usa el rol `orderflow`).
2. El backup es de **producción**: solo contiene los tenants de prod — el tenant de field-testing definido **solo en local** (`tid-provecchio-local`, su `bio_links`, `exchange_rates` y `omnigastro_settings` en modo ODOO) se pierde con el DROP SCHEMA.
3. Las credenciales rotables (SuperAdmin) viven en la DB del restore: después de un restore, **el password local pasa a ser el de prod** (por diseño del flujo §3.1.2).

## Solución aplicada (2026-10-26)

```bash
# 0) Snapshot previo del estado local (rollback del restore local)
docker exec orderflow_db pg_dump -U orderflow -d orderflow_db > backups/local_snapshot_pre_restore_<TS>.sql

# 1) Backup completo de prod (DB + uploads)
./scripts/backup-production.sh provecchio

# 2) Roles dummy que exige el dump (NOLOGIN, sin permisos)
docker exec orderflow_db psql -U orderflow -d orderflow_db \
  -c "CREATE ROLE orderflow_app NOLOGIN; CREATE ROLE orderflow_migrator NOLOGIN;"

# 3) Restore
docker exec orderflow_db psql -U orderflow -d orderflow_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
docker exec -i orderflow_db psql -U orderflow -d orderflow_db < backups/pre_deploy_provecchio_<TS>.sql   # → 0 errores

# 4) Reasignar ownership a un rol real del local
docker exec orderflow_db psql -U orderflow -d orderflow_db \
  -c "REASSIGN OWNED BY orderflow_app TO orderflow; REASSIGN OWNED BY orderflow_migrator TO orderflow;"

# 5) Seed huérfanos local (ver #203): tenant field-test + bio_links + omnigastro_settings + exchange_rates
#    → extraer del snapshot local pre-restore las filas de tid-provecchio-local y re-insertarlas.

# 6) reiniciar backend para liberar caches
docker restart orderflow_backend
```

## Verificación post-restore (obligatoria)

```sql
SELECT count(*) FROM tenants;                      -- 2 (dimora + field-test)
SELECT email, "isSuperAdmin", length("passwordHash") FROM users WHERE email='marcelo@pesallaccia.com';  -- t | 60
SELECT "tenantId", slug FROM bio_links;
SELECT "tenantId", "paymentRouting" IS NOT NULL FROM omnigastro_settings;  -- modo ODOO del field-test
```

- `GET /api/v1/tenants/public/tenant-by-subdomain/provecchio.local` → `tid-provecchio-local`.
- `GET /api/v1/bio/tenant/tid-provecchio-local` → 200 con blocks.
- Login con la credencial de prod → 200; con la vieja → 409.
- `GET /api/v1/health` → `{"version":"1.43.3", "database": "ok"}`.

## Prevención / Lecciones

1. **Toda asignación de restore en local:** crear primero los roles dummy y correr `REASSIGN OWNED` — de lo contrario el dump de prod queda mitad-aplicado y con owners muertos.
2. **Tenant field-test + BioLink + settings de local NO están en prod**: conservar en un snapshot `local_snapshot_pre_restore_<TS>.sql` y re-seedear tras cada restore (paso 5). Gra maxte en el flujo standard backup/restore (documento `documentation/backup-restore/restore-production-backup-to-local.md` si existe).
3. **Después de un restore local la credencial local == credencial de prod** — informarlo para no mezclar casos (rotaciones aplicadas solo en un lado dejan de ser válidas en el otro hasta el próximo restore).
4. Evitar re-importar el dump sobre un schema existente: crea ruido de `already exists` que oculta estos errores de roles.
