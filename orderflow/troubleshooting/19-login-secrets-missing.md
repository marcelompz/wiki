# Login Fallido por Secrets Faltantes en Producción

## Síntoma

No es posible iniciar sesión con `marcelo@pesallaccia.com` (ni con ningún usuario). El backend muestra:

```
2026-08-01 15:41:24 [SecretsValidation] error: Missing critical secrets: JWT_SECRET, JWT_REFRESH_SECRET, MASTER_API_KEY
```

El contenedor backend se reinicia en loop y devuelve `PrismaClientInitializationError: P1000` al intentar conectar a la base de datos.

## Causa raíz

Commit `a13f2c1` eliminó `.env.production` del tracking de git por seguridad, reemplazándolo por un template con placeholders (`cambiar_*`). Los secrets reales se perdieron del archivo versionado, y en el servidor quedaron solo los valores placeholder.

Cuando el contenedor backend se creó el 2026-08-01 15:41, arrancó con:
- `JWT_SECRET=cambiar_jwt_secret_produccion_aleatorio`
- `JWT_REFRESH_SECRET=cambiar_jwt_refresh_secret_produccion_aleatorio`
- `MASTER_API_KEY=cambiar_master_key_produccion_aleatorio`

Esto provocó:
1. `SecretsValidation` falla → `Missing critical secrets`
2. El servicio de auth no puede firmar JWTs → login siempre falla
3. Posteriormente, al intentar regenerar secrets, se introdujo un mismatch de contraseña de PostgreSQL → `P1000`

## Cadena de eventos

```
Commit a13f2c1 (seguridad)
    ↓
.env.production queda con placeholders en servidor
    ↓
docker compose up -d backend (2026-08-01 15:41)
    ↓
Backend arranca con secrets falsos
    ↓
SecretsValidation → Missing critical secrets
    ↓
Login falla (no se pueden firmar JWTs)
    ↓
Intento de fix: regenerar secrets
    ↓
POSTGRES_PASSWORD en .env.production no coincide con hash en PostgreSQL
    ↓
P1000: Authentication failed against database server at `database`
    ↓
Backend en crash loop (12+ restarts)
```

## Diagnóstico

```bash
# 1. Verificar secrets en el contenedor backend
docker exec orderflow-backend-prod env | grep -E 'JWT_SECRET|JWT_REFRESH_SECRET|MASTER_API_KEY'

# 2. Ver logs de validación
docker logs orderflow-backend-prod 2>&1 | grep SecretsValidation

# 3. Verificar estado del contenedor
docker ps --filter "name=orderflow-backend" --format "{{.Names}}\t{{.Status}}"

# 4. Verificar contraseña de PostgreSQL
docker exec orderflow-database-1 psql -U orderflow -d orderflow_db -c "SELECT usename, passwd FROM pg_shadow WHERE usename = 'orderflow';"
```

## Solución

### Paso 1: Restaurar secrets reales

Los secrets originales están disponibles en `deploy-artifacts/rollback-*.env` (último artifact con valores reales).

```bash
# En /opt/orderflow/.env.production, reemplazar placeholders por valores reales:
JWT_SECRET=<valor_real_de_rollback>
JWT_REFRESH_SECRET=<valor_real_de_rollback>
MASTER_API_KEY=<valor_real_de_rollback>
```

### Paso 2: Sincronizar contraseña de PostgreSQL

Si la contraseña de `.env.production` no coincide con el hash en PostgreSQL:

```bash
# Obtener contraseña actual de .env.production
grep POSTGRES_PASSWORD /opt/orderflow/.env.production

# Sincronizar en la base de datos
docker exec orderflow-database-1 psql -U orderflow -d orderflow_db -c \
  "ALTER USER orderflow WITH PASSWORD '<contraseña_de_.env.production>';"
```

### Paso 3: Redeployar backend

```bash
docker compose -f docker-compose.prod.yml up -d backend
```

### Paso 4: Verificar

```bash
# Secrets cargados
docker exec orderflow-backend-prod env | grep -E 'JWT_SECRET|JWT_REFRESH_SECRET|MASTER_API_KEY'

# Validación exitosa
docker logs orderflow-backend-prod 2>&1 | grep SecretsValidation

# Contenedor healthy
docker ps --filter "name=orderflow-backend" --format "{{.Names}}\t{{.Status}}"

# Login funcional
curl -X POST https://orderflow.provecchio.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"marcelo@pesallaccia.com","password":"SuperAdmin123!"}'
```

## Prevención

1. **Rotar secrets:** Los secrets actuales están expuestos en git history (`deploy-artifacts/rollback-*.env`). Generar nuevos secrets:

   ```bash
   /opt/orderflow/scripts/generate-secrets.sh
   # Actualizar .env.production con los nuevos valores
   # Redeployar backend
   ```

2. ** Nunca commitear `.env.production`:** Confirmar que está en `.gitignore`.

3. **Backup de secrets:** Guardar secrets generados en un gestor de secrets seguro (Vault, AWS Secrets Manager, etc.), no solo en archivos `.env`.

4. **Validación temprana:** Agregar `SecretsValidation` al healthcheck del compose para detectar este problema antes de que el backend entre en crash loop.

## Referencias cruzadas

- **Rollback artifacts:** `deploy-artifacts/rollback-production-*.env`
- **Secrets generation:** `scripts/generate-secrets.sh`
- **AGENTS.md:** Regla de sincronización de documentación con Wiki y Traefik
- **Troubleshooting relacionado:**
  - [#18](18-cloudflare-api-token-warn.md) — Variable `CLOUDFLARE_API_TOKEN` mal nombrada
  - [#06-SSL](06-provecchio-traefik-ssl-and-502-diagnosis.md) — SSL y 502 en Provecchio