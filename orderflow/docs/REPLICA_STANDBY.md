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
#!/bin/bash
docker compose -f docker-compose.prod.yml -f docker-compose.replica.yml up -d database-replica

# scripts/replica-stop.sh
#!/bin/bash
docker compose -f docker-compose.prod.yml -f docker-compose.replica.yml stop database-replica

# scripts/replica-promote.sh
#!/bin/bash
docker compose -f docker-compose.prod.yml -f docker-compose.replica.yml exec database-replica pg_ctl promote -D /var/lib/postgresql/data
```

### 3.3 Variables de entorno

```env
# .env.provecchio
PRIMARY_HOST=178.105.226.175
POSTGRES_USER=orderflow
POSTGRES_PASSWORD=***
POSTGRES_DB=orderflow_db
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
