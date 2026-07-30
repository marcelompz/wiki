# Plan de Recuperación de Desastres (DRP) — OrderFlow

## Objetivo
Definir procedimientos claros para recuperar staging, production y provecchio ante fallos de base de datos, disco, contenedor o proxy.

## Alcance
- Backups de base de datos PostgreSQL
- Configuración de entornos (`.env`, `docker-compose`, Traefik)
- Código y builds frontend/backend
- Secretos y variables de entorno

## Responsable
- Producción: `marcelompz`
- Staging: `marcelompz`
- Provecchio legacy: `marcelompz` (hotfix mínimo)

## Frecuencia de backups
- Base de datos: automático en cada deploy (`scripts/backup-production.sh`)
- Retención local: 7 días
- Retención remota: 7 días

## Procedimiento de recuperación

### 1. Producción / Staging
```bash
cd /srv/orderflow
./scripts/backup-production.sh production
# o
./scripts/backup-production.sh staging
```

### 2. Provecchio (legacy)
```bash
cd /srv/orderflow
./scripts/backup-production.sh provecchio
```

### 3. Verificación
```bash
ls -lh backups/
gzip -t backups/pre_deploy_*.sql.gz 2>/dev/null || true
```

### 4. Restauración
```bash
docker compose -f docker-compose.prod.yml exec -T database psql -U orderflow -d orderflow_db < backups/pre_deploy_production_YYYYMMDD_HHMMSS.sql
```

### 5. Post-restauración
```bash
docker compose -f docker-compose.prod.yml up -d backend frontend
curl -sf http://127.0.0.1:3010/api/v1/health
```

## Notas
- Provecchio es producción legacy congelada. No aplicar actualizaciones automáticas del repo actual.
- Cualquier cambio en Provecchio debe ser hotfix mínimo y quirúrgico.
