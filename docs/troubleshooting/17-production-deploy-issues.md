# Troubleshooting: Despliegue en Producción

## Errores encontrados y soluciones aplicadas

### 1. Migraciones fallan con `FATAL: sorry, too many clients already`

**Contexto:** Durante el deploy inicial en Hetzner, el paso de migraciones de Prisma fallaba con:

```
PrismaClientInitializationError: Too many database connections opened: FATAL: sorry, too many clients already
```

**Causa:** El servidor PostgreSQL alcanzó el límite de conexiones (`max_connections = 100`) debido a conexiones `idle` acumuladas de sesiones previas de deploy, healthchecks y contenedores.

**Diagnóstico:**
```bash
ssh hetzner-orderflow "docker exec orderflow-database-1 psql -U orderflow -d orderflow_db -c 'SELECT count(*) FROM pg_stat_activity;'"
# Resultado: 102 conexiones (sobre el límite de 100)

ssh hetzner-orderflow "docker exec orderflow-database-1 psql -U orderflow -d orderflow_db -c \"SELECT state, count(*) FROM pg_stat_activity GROUP BY state;\""
# Resultado: 101 idle, 1 active
```

**Solución:**
```bash
# Terminar conexiones idle
ssh hetzner-orderflow "docker exec orderflow-database-1 psql -U orderflow -d orderflow_db -c \"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND pid != pg_backend_pid();\""

# Si persiste, eliminar todas las conexiones no esenciales
ssh hetzner-orderflow "docker exec orderflow-database-1 psql -U orderflow -d orderflow_db -c \"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid != pg_backend_pid();\""
```

**Prevención:** Agregar al deploy script una verificación previa de conexiones y limpieza automática.

### 2. Deploy a Provecchio fallido por permisos SSH

**Contexto:** Al intentar deployar a `root@192.168.69.240` (servidor Provecchio), el script falló en múltiples etapas:

```
 Backup DB: Permiso denegado en /srv/orderflow/backups/
 Git sync: Permiso denegado en .git/index.lock
 Docker: permission denied while trying to connect to the docker API
```

**Causa:** El usuario/SSH utilizado para conectar a Provecchio no tiene privilegios suficientes en ese servidor, o el socket de Docker tiene permisos restrictivos.

**Estado:** No resuelto. Pendiente revisar:
- Usuario SSH utilizado para Provecchio
- Permisos de `/srv/orderflow` en Provecchio
- Configuración de Docker socket (`/var/run/docker.sock`)

**Trabajo temporal:** El deploy a Hetzner (`pesallaccia.com`) se completó exitosamente.

### 3. Archivos de entorno no están en `.gitignore`

**Contexto:** `.env.prod` y `.env.production` contienen credenciales sensibles pero no están excluidos del repositorio.

**Riesgo:** Exposición de secrets en el historial de Git.

**Acción pendiente:** Agregar al `.gitignore` y rotar credenciales si ya fueron commitadas.

## Decisiones tomadas

| Decisión | Justificación |
|----------|---------------|
| Mantener `docker-compose.prod.yml` con reglas Traefik solo para `provecchio.com` | Pesallaccia.com usa su propio Traefik en Hetzner |
| Usar `window.location.hostname` como fallback para `ROOT_DOMAIN` | Evita hardcodear dominios y romper entornos |
| Actualizar frontend de `/api/v1/sync/customers` a `/api/v1/customers` | Backend ya refactorizado |
| Crear `scripts/provision-orderflow-company.sh` separado del deploy | El provisioning de tenant enterprise es operación independiente |

## Próximos pasos pendientes

1. Resolver permisos SSH en Provecchio
2. Revisar límite de conexiones PostgreSQL en producción (`max_connections` recomendado: 200 con `idle_in_transaction_session_timeout`)
3. Rotar credenciales si `.env.prod` fue commitado
4. Ejecutar `provision-orderflow-company.sh` en Hetzner
