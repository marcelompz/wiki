# Estrategia de Réplica Standby — Provecchio

**Objetivo:** Usar el servidor Provecchio como réplica read-only de PostgreSQL, manteniéndolo detenido por defecto para no consumir CPU/RAM. Cuando se necesite, se inicia, sincroniza desde el primary y puede servir tráfico de lectura o promocionarse a primary en caso de fallo.

---

## 1. Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│  Servidor Principal (Hetzner VPS)                           │
│  - PostgreSQL Primary                                        │
│  - Backend + Frontend + Redis + Odoo Adapter                │
│  - Traefik                                                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ Streaming Replication / Backup/Restore
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  Servidor Provecchio (standby)                              │
│  - PostgreSQL Replica (detenida por defecto)                 │
│  - Traefik standby (opcional)                                │
│  - Scripts de gestión: start/stop/promote                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Modos de Operación

### 2.1 Standby (default)
- Contenedores de Provecchio detenidos.
- No consume CPU/RAM significativa.
- Útil para backups nocturnos o mantenimiento programado.

### 2.2 Réplica Read-Only
- Se inicia PostgreSQL en modo réplica.
- Sincroniza WALs desde el primary.
- Sirve queries de lectura si el backend lo apunta temporalmente.

### 2.3 Failover (emergencia)
- Si el primary falla, Provecchio se promueve a primary.
- Traefik se redirige a Provecchio.
- El servidor principal, al recuperarse, puede convertirse en réplica.

---

## 3. Implementación Inicial (v1.12.0)

### 3.1 docker-compose.replica.yml

```yaml
services:
  database-replica:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-orderflow}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-orderflow_db}
    volumes:
      - postgres_replica_data:/var/lib/postgresql/data
    command: |
      bash -c "rm -rf /var/lib/postgresql/data/* &&
               pg_basebackup -h ${PRIMARY_HOST:-database} -U ${POSTGRES_USER} -D /var/lib/postgresql/data -P --wal-method=stream &&
               echo \"primary_conninfo = host=${PRIMARY_HOST:-database} port=5432 user=${POSTGRES_USER}\" >> /var/lib/postgresql/data/postgresql.conf &&
               postgres -D /var/lib/postgresql/data -c config_file=/var/lib/postgresql/data/postgresql.conf"
    networks:
      - orderflow-network
    depends_on:
      database:
        condition: service_healthy
```

### 3.2 Scripts de gestión

```bash
# scripts/replica-start.sh
# Inicia la réplica y espera hasta que PostgreSQL esté listo (pg_isready)

# scripts/replica-stop.sh
# Detiene la réplica sin eliminar datos

# scripts/replica-promote.sh
# Promueve la réplica a primary y verifica pg_is_in_recovery()

# scripts/replica-status.sh
# Verifica estado del contenedor, modo recovery y configuración

# scripts/failover-to-provecchio.sh
# Procedimiento automático de failover con logging y health checks
```

### 3.3 Variables de entorno

```env
# .env.provecchio
PRIMARY_HOST=178.105.226.175
POSTGRES_USER=orderflow
POSTGRES_PASSWORD=***
POSTGRES_DB=orderflow_db
```

### 3.4 Health Checks

```bash
# Verificar que la réplica está corriendo
bash scripts/replica-status.sh

# Verificar replicación
docker compose -f docker-compose.provecchio.yml logs database-replica | grep "replication"

# Verificar lag de WAL
docker compose -f docker-compose.provecchio.yml exec database-replica psql -U orderflow -d orderflow_db -c "SELECT pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn)) AS wal_lag;" || true
```

---

## 4. Próximos Pasos

1. Crear `docker-compose.replica.yml` en Provecchio.
2. Crear scripts `replica-start.sh`, `replica-stop.sh`, `replica-promote.sh`.
3. Documentar procedimiento de failover en `docs/backups.md`.
4. Agregar monitoreo de réplica en `docs/monitoreo.md`.
5. En el futuro, automatizar el arranque de la réplica con un cron o webhook cuando el load aumente.

---

## 5. Consideraciones

- La réplica es **read-only** hasta promoción.
- El WAL streaming requiere que el primary tenga `wal_level = replica` y `max_wal_senders > 0`.
- Provecchio debe estar en la misma red que el primary para streaming.
- Si se detiene la réplica, el primary continúa operando normalmente.
- Para ahorrar recursos, Provecchio puede estar completamente apagado y encenderse solo para backups o failover.
