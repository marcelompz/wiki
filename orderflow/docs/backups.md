# Disaster Recovery y Backups — OrderFlow

**Estado:** Diseño  
**Versión:** v1.10.0+  
**Objetivo:** Definir la estrategia de backup, retención y restauración para garantizar la continuidad del negocio.

---

## 1. Política de Backups

### 1.1 Tipos de Backup

| Tipo | Frecuencia | Retención | Incluye |
|------|-----------|-----------|---------|
| **Completo** | Diario (02:00 ART) | 7 días | Base de datos + uploads |
| **Incremental** | Cada 6 horas | 2 días | Solo cambios desde último completo |
| **Pre-deploy** | Antes de cada deploy | 30 días | Base de datos completa |
| **Uploads** | Diario | 7 días | `/uploads/{tenantId}/` |

### 1.2 herramientas

- **Base de datos:** `pg_dump` + `gzip` (nativo PostgreSQL)
- **Uploads:** `rsync` o `tar` comprimido
- **Automatización:** `cron` en el VPS de producción
- **Remoto:** SFTP a servidor de backups secundario (o S3-compatible)

---

## 2. Procedimiento de Backup

### 2.1 Backup de Base de Datos

```bash
#!/bin/bash
# scripts/backup-database.sh

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/orderflow/backups/postgres"
RETENTION_DAYS=7

mkdir -p $BACKUP_DIR

# Backup completo
pg_dump -Fc -U $POSTGRES_USER -d $POSTGRES_DB -f $BACKUP_DIR/db_$TIMESTAMP.dump

# Comprimir
gzip $BACKUP_DIR/db_$TIMESTAMP.dump

# Subir a remoto (si está configurado)
if [ -n "$BACKUP_SFTP_HOST" ]; then
  scp $BACKUP_DIR/db_$TIMESTAMP.dump.gz $BACKUP_SFTP_USER@$BACKUP_SFTP_HOST:/backups/orderflow/
fi

# Limpiar backups antiguos
find $BACKUP_DIR -name "db_*.dump.gz" -mtime +$RETENTION_DAYS -delete

echo "✅ Backup completado: db_$TIMESTAMP.dump.gz"
```

**Variables de entorno requeridas:**

```env
POSTGRES_USER=orderflow
POSTGRES_DB=orderflow
BACKUP_SFTP_HOST=backup.example.com
BACKUP_SFTP_USER=orderflow-backup
```

### 2.2 Backup de Uploads

```bash
#!/bin/bash
# scripts/backup-uploads.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%U)
UPLOAD_DIR="/opt/orderflow/backend/uploads"
BACKUP_DIR="/opt/orderflow/backups/uploads"

tar -czf $BACKUP_DIR/uploads_$TIMESTAMP.tar.gz -C $UPLOAD_DIR .

find $BACKUP_DIR -name "uploads_*.tar.gz" -mtime +7 -delete
```

### 2.3 Cron Jobs

```cron
# /etc/cron.d/orderflow-backups

# Backup completo de BD: diario a las 02:00 ART
0 2 * * * root /opt/orderflow/scripts/backup-database.sh >> /var/log/orderflow-backup.log 2>&1

# Backup de uploads: diario a las 02:30 ART
30 2 * * * root /opt/orderflow/scripts/backup-uploads.sh >> /var/log/orderflow-backup.log 2>&1

# Backup pre-deploy: manual (se ejecuta antes de cada deploy)
```

---

## 3. Procedimiento de Restauración

### 3.1 Restauración Completa

```bash
# 1. Detener servicios
docker compose -f docker-compose.prod.yml down

# 2. Restaurar base de datos
pg_restore -U $POSTGRES_USER -d $POSTGRES_DB -c /opt/orderflow/backups/postgres/db_20260803_020000.dump.gz

# 3. Restaurar uploads
tar -xzf /opt/orderflow/backups/uploads/uploads_20260803_020000.tar.gz -C /opt/orderflow/backend/uploads/

# 4. Reiniciar servicios
docker compose -f docker-compose.prod.yml up -d

# 5. Verificar
curl -f https://orderflow.com/health
```

### 3.2 Restauración Puntual (Tabla Específica)

```bash
# Listar tablas en el dump
pg_restore -l db_20260803_020000.dump | grep appointments

# Restaurar solo una tabla
pg_restore -U $POSTGRES_USER -d $POSTGRES_DB -t appointment_assignments db_20260803_020000.dump
```

---

## 4. Estrategia de Replicación (Alta Disponibilidad)

### 4.1 Streaming Replication (PostgreSQL)

```
Primary (write) ──→ Replica (read-only)
     │
     └─ WAL streaming en tiempo real
```

**Configuración en `postgresql.conf` (primary):**

```ini
wal_level = replica
max_wal_senders = 3
wal_keep_size = 1GB
```

**Configuración en `postgresql.conf` (replica):**

```ini
hot_standby = on
```

**Inicialización:**

```bash
# En el primary
pg_basebackup -h primary-host -D /var/lib/postgresql/data -U replicator -P --wal-method=stream
```

### 4.2 Failover Manual

```bash
# En caso de fallo del primary, promover la réplica
pg_ctl promote -D /var/lib/postgresql/data

# Actualizar DATABASE_URL en el backend al nuevo primary
```

---

## 5. Verificación de Integridad

```bash
# Verificar que el backup no está corrupto
pg_restore -l /opt/orderflow/backups/postgres/db_20260803_020000.dump.gz > /dev/null && echo "✅ Backup OK"

# Verificar tamaño esperado
ls -lh /opt/orderflow/backups/postgres/db_*.dump.gz

# Test de restauración en staging (mensual)
```

---

## 6. Retención y Cumplimiento

- Backups diarios: 7 días
- Backups pre-deploy: 30 días
- Backups de uploads: 7 días
- Backups remotos (SFTP/S3): misma retención que local
- Logs de backup: 30 días en `/var/log/orderflow-backup.log`

---

## 7. Responsabilidades

| Rol | Responsabilidad |
|-----|----------------|
| **DevOps/SRE** | Configurar cron jobs, monitorear éxito de backups, ejecutar restauraciones |
| **Backend Lead** | Validar integridad de backups, coordinar restauraciones |
| **Tech Lead** | Aprobar cambios en la estrategia de backup |

---

## 8. Próximos Pasos

1. Automatizar backups con el script `scripts/backup-database.sh`
2. Configurar replicación de PostgreSQL en staging
3. Ejecutar prueba de restauración completa en staging
4. Documentar procedimiento en runbook de operaciones
