# Backup & Restore — OrderFlow

## Resumen

OrderFlow usa dos fuentes de datos que deben respaldarse en conjunto:

1. **Base de datos PostgreSQL** (datos relacionales: tenants, productos, pedidos, clientes, configuraciones).
3. **File store** (`uploads/`) (archivos subidos o generados por tenant: banners, logos, imágenes de productos, adjuntos).

Ambas deben incluirse en cualquier backup/restore para garantizar consistencia.

---

## Estructura del File Store

Todos los archivos se almacenan bajo el directorio `uploads/` dentro del working directory del backend, organizados por tenant y módulo:

```
uploads/
├── whatsapp-catalog/
│   └── {tenantId}/
│       └── {filename}
├── suppliers/
│   └── {tenantId}/
│       └── {supplierSlug}/
│           └── {filename}
```

Esta estructura garantiza:
- **Aislamiento por tenant/tier:** cada tenant tiene su propia carpeta.
- **Backup/restore sencillo:** el directorio `uploads/` completo se puede respaldar/restaurar en bloque, o filtrar por tenant si se requiere granularidad.
- **Compatibilidad multi-tier:** funciona igual para `shared` y `dedicated`.

> Regla: **no** almacenar archivos de negocio en carpetas globales sin partición por `tenantId`. Ver `docs/00-contexto-agentes.md`.

---

## Backup

El script principal es `scripts/backup-production.sh`. Genera dos archivos:

| Archivo | Contenido |
|---------|-----------|
| `pre_deploy_{env}_{timestamp}.sql` | Dump PostgreSQL del entorno indicado. |
| `pre_deploy_{env}_{timestamp}_uploads.tar.gz` | Compresión tar.gz del directorio `uploads/`. |
| `rollback-{env}-{timestamp}.env` | Snapshot del `.env.{env}` para rollback. |

### Uso

```bash
./scripts/backup-production.sh production
```

Salida ejemplo:
```
🧷 Rollback env snapshot saved: backups/rollback-production-20260727_210000.env
🛡️ Starting backup for environment: production
📦 Backing up database...
✅ Database backup completed: backups/pre_deploy_production_20260727_210000.sql (12345 bytes)
📦 Backing up file store: /opt/orderflow/uploads
✅ File store backup completed: backups/pre_deploy_production_20260727_210000_uploads.tar.gz (678901 bytes)

✅ Backup completed successfully
   DB backup     : backups/pre_deploy_production_20260727_210000.sql
   File store    : backups/pre_deploy_production_20260727_210000_uploads.tar.gz
   Rollback env  : backups/rollback-production-20260727_210000.env
```

### Backup manual por tenant (opcional)

Si solo querés respaldar un tenant específico:

```bash
tar -czf backups/tenant-{tenantId}-{timestamp}.tar.gz -C /opt/orderflow/uploads {tenantId}
```

---

## Verificación

El script `scripts/verify-backups.sh` verifica la integridad de backups de los últimos N días (default: 7).

```bash
./scripts/verify-backups.sh 7
```

Verifica:
- Tamaño no cero de archivos `.sql`.
- Validez del gzip en backups comprimidos.
- Tamaño no cero de archivos `_uploads.tar.gz`.
- Integridad del tar.gz (`tar -tzf`).

---

## Restore

### Prerequisitos

- Tener el dump SQL y el tar.gz de uploads de la misma fecha/timestamp.
- Tener el `.env.{env}` correspondiente (o usar el rollback snapshot guardado en `backups/`).

### Restore de base de datos

```bash
# Opción A: restore local (docker compose)
cat backups/pre_deploy_production_20260727_210000.sql | \
  docker compose -f docker-compose.prod.yml --env-file .env.production exec -T database \
  psql -U orderflow orderflow_db

# Opción B: restore remoto (ejecutar en el servidor)
ssh root@servidor 'cat /srv/orderflow/backups/pre_deploy_production_20260727_210000.sql | \
  docker compose -f /srv/orderflow/docker-compose.prod.yml --env-file /srv/orderflow/.env.production exec -T database \
  psql -U orderflow orderflow_db'
```

### Restore de file store

```bash
# Restore completo del file store
tar -xzf backups/pre_deploy_production_20260727_210000_uploads.tar.gz -C /opt/orderflow

# Restore por tenant específico
tar -xzf backups/tenant-{tenantId}-20260727_210000.tar.gz -C /opt/orderflow/uploads
```

### Restore del entorno

```bash
cp backups/rollback-production-20260727_210000.env .env.production
```

---

## Consideraciones

- **Retención:** configurar rotación de backups en `backups/` según política de retención (ej: 7 días).
- **Almacenamiento:** para producción, considerar respaldo externo (S3, SFTP, etc.) además del disco local.
- **Permisos:** el directorio `uploads/` debe ser escribible por el proceso del backend (`node`). En Docker, verificar volumenes montados.
- **Multi-tier:** en modo `dedicated`, el backup de DB incluye todos los tenants dedicados; el file store sigue igual porque está en el mismo volumen/working directory del backend.

---

## Comandos rápidos

```bash
# Backup completo
./scripts/backup-production.sh production

# Verificar backups
./scripts/verify-backups.sh 7

# Restore DB
cat backups/pre_deploy_production_*.sql | docker compose -f docker-compose.prod.yml --env-file .env.production exec -T database psql -U orderflow orderflow_db

# Restore archivos
tar -xzf backups/pre_deploy_production_*_uploads.tar.gz -C /opt/orderflow
```
