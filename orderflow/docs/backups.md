# Disaster Recovery y Failover — OrderFlow

**Estado:** Diseño + Procedimiento  
**Versión:** v1.12.1+  
**Objetivo:** Definir el procedimiento de backup, restauración y failover para garantizar la continuidad del negocio.

---

## 1. Estrategia de Backup

### 1.1 Tipos de Backup

| Tipo | Frecuencia | Retención | Incluye |
|------|-----------|-----------|---------|
| **Completo** | Diario (02:00 ART) | 7 días | Base de datos + uploads |
| **Incremental** | Cada 6 horas | 2 días | Solo cambios desde último completo |
| **Pre-deploy** | Antes de cada deploy | 30 días | Base de datos completa |
| **Uploads** | Diario | 7 días | `/uploads/{tenantId}/` |

### 1.2 Herramientas

- **Base de datos:** `pg_dump` + `gzip` (nativo PostgreSQL)
- **Uploads:** `tar` comprimido
- **Réplica standby:** Provecchio como servidor de réplica read-only (detenido por defecto)

---

## 2. Procedimiento de Backup

### 2.1 Backup desde Primary (Hetzner VPS)

```bash
#!/bin/bash
# scripts/backup-database.sh

set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/orderflow/backups/postgres"
RETENTION_DAYS=7

mkdir -p "$BACKUP_DIR"

# Backup completo
pg_dump -Fc -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$BACKUP_DIR/db_$TIMESTAMP.dump"

# Comprimir
gzip "$BACKUP_DIR/db_$TIMESTAMP.dump"

# Limpiar backups antiguos
find "$BACKUP_DIR" -name "db_*.dump.gz" -mtime +$RETENTION_DAYS -delete

echo "✅ Backup completado: db_$TIMESTAMP.dump.gz"
```

### 2.2 Backup desde Provecchio (Réplica Standby)

```bash
#!/bin/bash
# scripts/backup-from-replica.sh

set -euo pipefail

# 1. Iniciar réplica
bash /opt/orderflow/scripts/replica-start.sh

# 2. Esperar a que esté lista
sleep 30

# 3. Ejecutar backup desde réplica
docker compose -f docker-compose.prod.yml -f docker-compose.replica.yml exec database-replica pg_dump -Fc -U orderflow -d orderflow_db -f /tmp/db_replica.dump

# 4. Copiar backup a local
docker compose -f docker-compose.prod.yml -f docker-compose.replica.yml cp database-replica:/tmp/db_replica.dump /opt/orderflow/backups/postgres/db_replica_$(date +%Y%m%d_%H%M%S).dump

# 5. Detener réplica
bash /opt/orderflow/scripts/replica-stop.sh
```

---

## 3. Procedimiento de Restauración

### 3.1 Restauración Completa desde Backup

```bash
# 1. Detener servicios
docker compose -f docker-compose.prod.yml down

# 2. Restaurar base de datos
pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c /opt/orderflow/backups/postgres/db_20260804_020000.dump.gz

# 3. Restaurar uploads
tar -xzf /opt/orderflow/backups/uploads/uploads_20260804_020000.tar.gz -C /opt/orderflow/backend/uploads/

# 4. Reiniciar servicios
docker compose -f docker-compose.prod.yml up -d

# 5. Verificar
curl -f https://orderflow.com/health
```

### 3.2 Restauración Puntual (Tabla Específica)

```bash
# Listar tablas en el dump
pg_restore -l db_20260804_020000.dump | grep appointments

# Restaurar solo una tabla
pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t appointment_assignments db_20260804_020000.dump
```

---

## 4. Procedimiento de Failover

### 4.1 Cuándo activar el failover

- El primary (Hetzner VPS) no responde por más de 5 minutos.
- Traefik no puede alcanzar el backend o la base de datos.
- Se detecta corrupción de datos en el primary.

### 4.2 Pasos de failover a Provecchio

**Paso 1: Promocionar la réplica**

```bash
# En Provecchio
bash /opt/orderflow/scripts/replica-start.sh
sleep 30
bash /opt/orderflow/scripts/replica-promote.sh
```

**Paso 2: Verificar que la réplica es primary**

```bash
docker compose -f docker-compose.provecchio.yml exec database-replica psql -U "${POSTGRES_USER:-orderflow}" -d "${POSTGRES_DB:-orderflow_db}" -c "SELECT pg_is_in_recovery();"
# Debe retornar: f (false = ya no está en recovery)
```

**Paso 3: Apuntar el backend a la nueva base de datos**

```bash
# En Provecchio, actualizar DATABASE_URL
export DATABASE_URL=postgresql://orderflow:${POSTGRES_PASSWORD}@database-replica:5432/${POSTGRES_DB:-orderflow_db}?schema=public

# Reiniciar backend
docker compose -f docker-compose.provecchio.yml up -d backend
```

**Paso 4: Redirigir tráfico**

```bash
# Si Traefik está en Provecchio, asegurarse de que esté corriendo
docker compose -f docker-compose.provecchio.yml up -d traefik

# Actualizar DNS/Cloudflare si es necesario para apuntar a Provecchio
```

**Paso 5: Verificar funcionamiento**

```bash
curl -f https://provecchio.com/health
curl -f https://provecchio.com/api/v1/health
```

### 4.3 Recuperación del Primary Original

Cuando el servidor principal se recupera:

```bash
# 1. Detener servicios en el principal
docker compose -f docker-compose.prod.yml down

# 2. Configurar el antiguo primary como nueva réplica
docker compose -f docker-compose.prod.yml -f docker-compose.replica.yml up -d database-replica

# 3. Verificar replicación
docker compose -f docker-compose.prod.yml -f docker-compose.replica.yml logs database-replica | grep "replication"
```

---

## 5. Verificación de Integridad

```bash
# Verificar que el backup no está corrupto
pg_restore -l /opt/orderflow/backups/postgres/db_20260804_020000.dump.gz > /dev/null && echo "✅ Backup OK"

# Verificar tamaño esperado
ls -lh /opt/orderflow/backups/postgres/db_*.dump.gz

# Test de restauración en staging (mensual)
```

---

## 6. Monitoreo

### 6.1 Alertas

| Alerta | Condición | Acción |
|--------|-----------|--------|
| **Primary down** | `docker ps` no muestra `orderflow-database-prod` | Iniciar réplica Provecchio |
| **Replica lag** | WAL lag > 100MB | Verificar red entre primary y réplica |
| **Backup fallido** | `pg_dump` retorna error | Revisar espacio en disco y credenciales |

### 6.2 Dashboards

- **Grafana:** Agregar panel de estado de réplica.
- **Sentry:** Alertar si el backend no puede conectar a la base de datos.
- **Uptime Kuma:** Monitorear endpoints críticos desde outside.

---

## 7. Próximos Pasos

1. Automatizar backup diario con cron en Hetzner VPS.
2. Configurar `wal_level = replica` en PostgreSQL primary.
3. Probar failover completo en staging.
4. Documentar runbook de operaciones para el equipo de soporte.
