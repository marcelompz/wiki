# Runbook de Operaciones — Alta Disponibilidad OrderFlow

## 1. Estado normal

- **Primary:** Hetzner VPS (`produc-io`)
- **Standby:** Provecchio (`provecchio.com`) — réplica read-only detenida por defecto
- **Failover automático:** no activado; se ejecuta manual desde este runbook

## 2. Checklist diaria

```bash
# 1. Verificar réplica detenida
bash /opt/orderflow/scripts/replica-status.sh || true

# 2. Verificar backups
ls -lh /opt/orderflow/backups/postgres | tail -n 5
```

## 3. Procedimiento de failover manual

```bash
# 1. Iniciar réplica
bash /opt/orderflow/scripts/replica-start.sh

# 2. Promover
bash /opt/orderflow/scripts/replica-promote.sh

# 3. Verificar modo primary
docker compose -f docker-compose.provecchio.yml exec database-replica psql -U orderflow -d orderflow_db -c "SELECT pg_is_in_recovery();"
# Esperado: f

# 4. Apuntar backend
docker compose -f docker-compose.provecchio.yml up -d backend

# 5. Verificar endpoints
curl -f https://provecchio.com/health
curl -f https://provecchio.com/api/v1/health
```

## 4. Rollback / recuperación del primary original

1. Detener stack primario viejo.
2. Configurarlo como réplica del nuevo primary.
3. Promover el primary viejo si se desea volver.
4. Redirigir Traefik/DNS según corresponda.

## 5. Contactos / notas

- Mantener este runbook en `/opt/orderflow/docs/operations/ha-failover-runbook.md`
- Coordinar con el equipo antes de cambiar DNS/Traefik.
