# Troubleshooting: Deploy Script Bugs Fixed

## Bugs encontrados y corregidos en `deploy-production.sh`

### 1. Sin verificación de salud de la aplicación (solo contenedor)

**Contexto:** El script solo verificaba si el contenedor Docker estaba `Running` usando `docker inspect`, pero no verificaba que la aplicación dentro del contenedor estuviera respondiendo a requests HTTP.

**Síntoma:** El deploy reportaba éxito pero el backend/frontend no eran accesibles porque la aplicación había crashado dentro del contenedor.

**Causa:** `docker inspect --format='{{.State.Running}}'` solo verifica que el proceso principal del contenedor esté vivo, no que la app esté serviendo requests.

**Solución aplicada:** Agregar verificación de salud a nivel de aplicación después de que los contenedores estén corriendo:

```bash
echo "🔍 Verifying backend application health..."
ssh ${SSH_OPTS} "${REMOTE_HOST}" "
  ATTEMPTS=0
  until curl -sf http://localhost:3010/api/v1/health >/dev/null 2>&1; do
    ATTEMPTS=\$((ATTEMPTS+1))
    if [ \"\${ATTEMPTS}\" -ge 30 ]; then
      echo '❌ Backend health check failed after 30s'
      exit 1
    fi
    sleep 1
  done
  echo '✅ Backend health check passed'
"
```

### 2. Sin rollback automático tras fallo del deploy

**Contexto:** Si el deploy fallaba después de que los contenedores estaban levantados (migraciones fallan, health checks fallan), no había mecanismo de rollback automático a la versión anterior.

**Síntoma:** El sistema quedaba en un estado inconsistente con la versión nueva del código pero sin poder servir requests.

**Causa:** El script guardaba un snapshot del `.env` para rollback (`ROLLBACK_INFO`) pero no implementaba un procedimiento de rollback real.

**Solución aplicada:** El rollback ya existe parcialmente (snapshot del env), pero se mejoró con:
- Timeout en `prisma migrate deploy` (`timeout 300`) para evitar hangs infinitos
- Rollback automático de contenedores si las migraciones fallan

### 3. Sin validación de variables de entorno requeridas

**Contexto:** El script no validaba que las variables de entorno críticas estuvieran presentes en el archivo `.env` antes de iniciar el deploy.

**Síntoma:** El deploy fallaba a mitad de camino cuando el backend intentaba conectarse a la DB sin `DATABASE_URL`, o cuando JWT no funcionaba sin `JWT_SECRET`.

**Causa:** Falta de validación previa.

**Solución aplicada:** Agregar validación de variables requeridas antes de proceder:

```bash
REQUIRED_ENV_VARS=("DATABASE_URL" "JWT_SECRET" "JWT_REFRESH_SECRET" "MASTER_API_KEY")

echo "🔍 Validating required environment variables..."
MISSING_VARS=0
for var in "${REQUIRED_ENV_VARS[@]}"; do
  if ! grep -q "^${var}=" "${BASE_DIR}/${ENV_FILE_PATH}" 2>/dev/null; then
    echo "   ❌ Missing required variable: ${var}"
    MISSING_VARS=1
  fi
done
if [ "${MISSING_VARS}" -eq 1 ]; then
  echo "❌ Deploy aborted: missing required environment variables"
  exit 1
fi
```

### 4. Traefik `docker network connect` solo incluía frontend, no backend

**Contexto:** La línea `docker network connect traefik-public orderflow-frontend-prod` solo conectaba el contenedor frontend a la red de Traefik, pero el backend también necesita estar en esa red para que Traefik pueda rutear el tráfico de la API.

**Síntoma:** Traefik podía servir el frontend pero no podía enrutar requests de API al backend (502 Bad Gateway para `/api/*`).

**Causa:** El contenedor `orderflow-backend-prod` no estaba conectado a la red `traefik-public`.

**Solución aplicada:** Agregar la conexión del backend también:

```bash
docker network connect traefik-public orderflow-frontend-prod 2>/dev/null || true
docker network connect traefik-public orderflow-backend-prod 2>/dev/null || true
```

### 5. Sin timeout en `prisma migrate deploy`

**Contexto:** El comando `prisma migrate deploy` podía quedarse colgado indefinidamente si había un problema con la base de datos o las migraciones.

**Síntoma:** El deploy se quedaba esperando eternamente en el paso de migraciones.

**Causa:** Falta de timeout en el comando SSH remoto.

**Solución aplicada:** Envolver con `timeout 300` (5 minutos):

```bash
ssh ${SSH_OPTS} "${REMOTE_HOST}" "cd ${REMOTE_DIR} && timeout 300 docker compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE_PATH} run --rm backend npx prisma migrate deploy"
```

## Decisiones tomadas

| Decisión | Justificación |
|----------|---------------|
| Agregar health check a nivel de aplicación | `docker inspect` solo verifica que el proceso esté vivo, no que la app sirva requests |
| Validar env vars antes del deploy | Fallar temprano es mejor que fallar a mitad del deploy con estado inconsistente |
| Conectar backend a traefik-public | Traefik necesita acceso directo al backend para enrutar `/api/*` |
| Timeout de 300s en migraciones | Las migraciones de Prisma pueden tardar en bases de datos grandes; 5 min es razonable |

## Próximos pasos pendientes

1. Implementar rollback automático completo (revertir `docker compose` a imagen anterior)
2. Rotar credenciales si `.env.prod` fue commitado
3. Revisar límite de conexiones PostgreSQL en producción (`max_connections` recomendado: 200)