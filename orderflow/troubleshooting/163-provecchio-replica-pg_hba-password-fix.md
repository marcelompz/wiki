# Troubleshooting #163 — Réplica Provecchio Bloqueada en Restart por pg_hba y password

- **Fecha:** 2026-09-28
- **Área:** Backend / PostgreSQL / Réplica DR
- **Síntoma:** `orderflow-database-replica-prod` queda en `Restarting (1)` y `pg_basebackup` falla con:
  - `connection refused` cuando el puerto 5432 no estaba expuesto.
  - `no pg_hba.conf entry for replication connection from host "<IP>"` después de exponer el puerto.
  - `Password:` repetido en logs al usar `export PGPASSWORD=...` dentro del `command`.
  - `syntax error in file ... postgresql.conf line 1, near token "="` al escribir `primary_conninfo` sin comillas en `postgresql.conf`.
  - `data directory "/var/lib/postgresql/data" has invalid permissions` al arrancar como `postgres` después de que `pg_basebackup` haya creado archivos como root.
- **Causa raíz:** La combinación de 4 factores:
  1. El contenedor PostgreSQL del primary no publicaba el puerto 5432 al host (`ports` ausente en `docker-compose.prod.yml`).
  2. `pg_hba.conf` del primary no autorizaba la IP pública de Provecchio para replicación.
  3. El `command` con `export PGPASSWORD=...` no era confiable; además, el `primary_conninfo` generado no incluía `password=...` ni comillas, por lo que la réplica volvía a pedir contraseña interactiva.
  4. El arranque como `root` no cumple con la política de la imagen `postgres:15-alpine`; tampoco se garantizaba `chmod 700` sobre el data directory.
- **Solución aplicada:**
  1. Agregar `ports: - "5432:5432"` en `docker-compose.prod.yml` (servidor primary).
  2. Agregar en `pg_hba.conf` del primary:
     ```
     host replication all 38.52.135.227/32 scram-sha-256
     ```
     y recargar con `SELECT pg_reload_conf();`.
  3. Reemplazar el `command` inline por un entrypoint local `scripts/replica-entrypoint.sh` que:
     - hace `pg_basebackup` solo si el data directory está vacío;
     - escribe `primary_conninfo` entre comillas en `postgresql.auto.conf`;
     - crea `standby.signal`;
     - aplica `chown -R postgres:postgres` y `chmod 700`;
     - arranca con `su-exec postgres postgres ...`.
- **Archivos afectados:**
  - `docker-compose.prod.yml`
  - `docker-compose.provecchio.yml`
  - `scripts/replica-entrypoint.sh`
  - `docs/troubleshooting/163-provecchio-replica-pg_hba-password-fix.md`
- **Estado verificado:** `docker ps` → `Up`; `pg_is_in_recovery()` → `t`; logs muestran `database system is ready to accept read-only connections` y `started streaming WAL from primary`.

## Nota de arquitectura

La réplica Provecchio está orientada a **failover activo/DR**, por lo que debe quedar sincronizada en tiempo real.
