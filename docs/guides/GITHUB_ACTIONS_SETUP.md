# OrderFlow: CI/CD Setup Guide

**Fecha:** 2026-06-21  
**Estado:** ✅ Workflow configurado con health checks + migraciones + backup

---

## Resumen

El workflow de CI/CD está configurado en `.github/workflows/ci-cd.yml` e incluye:

1. **Tests automáticos**: Backend build (TypeScript), Frontend build + lint
2. **Deploy a Staging**: Cuando se hace push a la rama `staging`
3. **Deploy a Producción**: Cuando se hace push a `main`
4. **Migraciones de Prisma**: Automáticas post-deploy
5. **Health checks**: Backend y frontend después del deploy
6. **Backup pre-deploy**: pg_dump de la base de datos

---

## Secrets Requeridos en GitHub

### Dónde Configurar

Ir a: **GitHub Repo → Settings → Secrets and variables → Actions → New repository secret**

### Secrets Necesarios

| Secret | Descripción | Ejemplo de Valor |
|--------|-------------|------------------|
| `SERVER_HOST` | IP o dominio del servidor | `178.105.226.175` |
| `SERVER_USER` | Usuario SSH para deploy | `root` |
| `SERVER_SSH_KEY` | Private key (formato OpenSSH) | `-----BEGIN OPENSSH PRIVATE KEY-----...` |

---

## Archivos .env

### Producción (`.env.production`)

**Ubicación en servidor:** `/srv/orderflow/.env.production`

```bash
# Database
POSTGRES_USER=orderflow
POSTGRES_DB=orderflow_db
DB_PASSWORD=<generar_aleatorio>

# Puertos (producción)
DB_PORT=5432
BACKEND_PORT=3010
FRONTEND_PORT=3011

# Backend
NODE_ENV=production
MASTER_API_KEY=<generar_aleatorio>
JWT_SECRET=<generar_aleatorio>
FRONTEND_URL=https://orderflow.tudominio.com

# Frontend
VITE_API_URL=https://orderflow.tudominio.com:3010/api
```

### Staging (`.env.staging`)

**Ubicación en servidor:** `/srv/orderflow-staging/.env.staging`

```bash
# Database
POSTGRES_USER=orderflow
POSTGRES_DB=orderflow_db
DB_PASSWORD=<generar_aleatorio>

# Puertos (staging - diferentes a producción)
DB_PORT=5433
BACKEND_PORT=3012
FRONTEND_PORT=3013

# Backend
NODE_ENV=staging
MASTER_API_KEY=<generar_aleatorio>
JWT_SECRET=<generar_aleatorio>
FRONTEND_URL=http://178.105.226.175:3013

# Frontend
VITE_API_URL=http://178.105.226.175:3012/api
```

### Generar Secrets Aleatorios

```bash
# Generar password segura
openssl rand -hex 32

# Generar JWT secret
openssl rand -base64 64

# Generar API key
openssl rand -hex 24
```

---

## Configuración en el Servidor

### 1. Crear directorios

```bash
ssh root@178.105.226.175

# Producción
mkdir -p /srv/orderflow
cd /srv/orderflow
git clone git@github.com:marcelompz/orderflow.git .

# Staging
mkdir -p /srv/orderflow-staging
cd /srv/orderflow-staging
git clone git@github.com:marcelompz/orderflow.git .
```

### 2. Configurar .env

```bash
# En producción
cd /srv/orderflow
cp /opt/orderflow/.env.production .env.production
# Editar .env.production con valores reales

# En staging
cd /srv/orderflow-staging
cp /opt/orderflow/.env.staging .env.staging
# Editar .env.staging con valores reales
```

### 3. Primer deploy manual

```bash
# Producción
cd /srv/orderflow
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# Staging
cd /srv/orderflow-staging
docker compose -f docker-compose.prod.yml --env-file .env.staging up -d
```

---

## Workflow de CI/CD

### Flujo Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                    Push a GitHub                                │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  ¿Rama es 'main' o 'staging'?                                   │
└─────────────────────────────────────────────────────────────────┘
                            │
                    ┌───────┴───────┐
                    │               │
                   Sí              No
                    │               │
                    ▼               └──▶ Fin (no hace nada)
┌─────────────────────────────────────────────────────────────────┐
│  Jobs en Paralelo:                                              │
│  1. test-backend (npm install + npm run build)                  │
│  2. test-frontend (npm install + lint + build)                  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  ¿Todos los tests pasaron?                                      │
└─────────────────────────────────────────────────────────────────┘
                            │
                    ┌───────┴───────┐
                    │               │
                   Sí              No
                    │               │
                    ▼               └──▶ Fin (falló, no deploy)
┌─────────────────────────────────────────────────────────────────┐
│  ¿Rama es 'staging'?                                            │
└─────────────────────────────────────────────────────────────────┘
                    │
            ┌───────┴───────┐
            │               │
           Sí              No (es 'main')
            │               │
            ▼               ▼
┌──────────────────┐  ┌─────────────────────────────────────────┐
│ Deploy a Staging │  │ Deploy a Producción                     │
│ /srv/orderflow-  │  │ /srv/orderflow                          │
│ staging/         │  │ + Backup pre-deploy (pg_dump)           │
│                  │  │ + Migraciones Prisma                    │
│                  │  │ + Health checks                         │
└──────────────────┘  └─────────────────────────────────────────┘
```

### Jobs Detallados

#### 1. test-backend
```yaml
- Runner: ubuntu-latest
- Pasos:
  1. Checkout del código
  2. Setup Node.js 20
  3. Instalar dependencias (npm install)
  4. Build (npm run build)
```

#### 2. test-frontend
```yaml
- Runner: ubuntu-latest
- Pasos:
  1. Checkout del código
  2. Setup Node.js 20
  3. Instalar dependencias (npm install)
  4. Lint (npm run lint)
  5. Build (npm run build)
```

#### 3. deploy-staging
```yaml
- Condición: github.ref == 'refs/heads/staging'
- Runner: ubuntu-latest
- Pasos:
  1. SSH al servidor
  2. cd /srv/orderflow-staging
  3. git pull origin staging
  4. docker compose up -d --build
```

#### 4. deploy (producción)
```yaml
- Condición: github.ref == 'refs/heads/main'
- Runner: ubuntu-latest
- Pasos:
  1. Backup pre-deploy (pg_dump)
  2. git pull origin main
  3. docker compose up -d postgres
  4. Esperar 10 segundos
  5. npx prisma migrate deploy (migraciones)
  6. docker compose up -d --build
  7. Esperar 15 segundos
  8. Health checks:
     - http://localhost:3010/health (backend)
     - http://localhost:3011 (frontend)
  9. docker image prune -f
```

---

## Puertos por Entorno

| Servicio | Producción (`main`) | Staging (`staging`) | Local |
|----------|---------------------|---------------------|-------|
| **PostgreSQL** | 5432 | 5433 | 5432 |
| **Backend API** | 3010 | 3012 | 3010 |
| **Frontend** | 3011 | 3013 | 3011 |

---

## Health Checks

### Endpoints

| Servicio | Endpoint | Puerto Producción | Puerto Staging |
|----------|----------|-------------------|----------------|
| **Backend** | `/health` | 3010 | 3012 |
| **Frontend** | `/` (root) | 3011 | 3013 |

### Verificación Manual

```bash
# Producción
curl http://178.105.226.175:3010/health
curl http://178.105.226.175:3011

# Staging
curl http://178.105.226.175:3012/health
curl http://178.105.226.175:3013
```

---

## Migraciones de Prisma

### Automáticas (CI/CD)

El workflow ejecuta automáticamente:
```bash
npx prisma migrate deploy
```

Esto aplica todas las migraciones pendientes en la base de datos.

### Manuales (En el servidor)

```bash
# Producción
cd /srv/orderflow
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Staging
cd /srv/orderflow-staging
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

### Crear Nueva Migración

```bash
# En local (desarrollo)
cd backend
npx prisma migrate dev --name nombre_migracion

# Commitear el archivo generado
git add prisma/migrations/*
git commit -m "feat: add nombre_migracion"
git push
```

---

## Backup de Base de Datos

### Automático (CI/CD)

El workflow crea un backup antes de cada deploy a producción:
```bash
BACKUP_FILE=backup_pre_deploy_$(date +%Y%m%d_%H%M%S).sql
docker compose exec -T postgres pg_dump -U orderflow orderflow_db > $BACKUP_FILE
```

### Manual (En el servidor)

```bash
# Producción
cd /srv/orderflow
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U orderflow orderflow_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Staging
cd /srv/orderflow-staging
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U orderflow orderflow_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restaurar desde Backup

```bash
# En el servidor
cd /srv/orderflow
docker compose -f docker-compose.prod.yml exec -T postgres psql -U orderflow orderflow_db < backup_20260621_120000.sql
```

---

## Troubleshooting

### Error: "Permission denied (publickey)"

**Causa**: La SSH key no está configurada correctamente.

**Solución**:
1. Verificar que `SERVER_SSH_KEY` en GitHub es la private key completa
2. Verificar que la public key correspondiente está en `~/.ssh/authorized_keys` del servidor
3. Verificar permisos: `chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys`

### Error: "Prisma migrate deploy failed"

**Causa**: Las migraciones no pueden aplicarse.

**Solución**:
```bash
# Verificar estado de migraciones
docker compose exec backend npx prisma migrate status

# Si hay migraciones fallidas, resetear (cuidado: borra datos)
docker compose exec backend npx prisma migrate reset

# O aplicar manualmente
docker compose exec backend npx prisma db push
```

### Error: "Health check failed"

**Causa**: Los servicios no levantan correctamente.

**Solución**:
```bash
# Ver logs del servicio fallido
docker compose logs backend
docker compose logs frontend

# Ver estado de contenedores
docker compose ps

# Rebuild completo
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Error: "Port already in use"

**Causa**: El puerto ya está siendo usado por otro servicio.

**Solución**:
```bash
# Ver qué proceso usa el puerto
netstat -tlnp | grep 3010

# O cambiar puertos en .env.production
BACKEND_PORT=3014
FRONTEND_PORT=3015
```

---

## Verificación de Estado

### En el Servidor

```bash
# Conectar
ssh root@178.105.226.175

# Verificar contenedores de producción
docker compose -f /srv/orderflow/docker-compose.prod.yml ps

# Verificar contenedores de staging
docker compose -f /srv/orderflow-staging/docker-compose.prod.yml ps

# Ver logs en tiempo real
docker compose -f /srv/orderflow/docker-compose.prod.yml logs -f
```

### Comandos Útiles

```bash
# Reiniciar producción
cd /srv/orderflow
docker compose -f docker-compose.prod.yml restart

# Reiniciar staging
cd /srv/orderflow-staging
docker compose -f docker-compose.prod.yml restart

# Ver uso de puertos
netstat -tlnp | grep -E '3010|3011|3012|3013|5432|5433'
```

---

## Seguridad

### Best Practices

1. **Nunca commitear `.env` con secrets**
   ```bash
   # .gitignore debe incluir:
   .env
   .env.production
   .env.staging
   *.sql  # Backups de DB
   ```

2. **Usar SSH key dedicada para GitHub Actions**
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/github_actions_orderflow -C "orderflow-github-actions"
   ```

3. **Rotar secrets periódicamente**
   - Cambiar SSH keys cada 6-12 meses
   - Actualizar secrets en GitHub después de rotar
   - Cambiar passwords de DB cada 3-6 meses

4. **Usar entorno protegido para producción**
   - GitHub → Settings → Environments → `production`
   - Requerir aprobación manual para deploy
   - Restringir quién puede aprobar

---

## Referencias

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [appleboy/ssh-action](https://github.com/appleboy/ssh-action)
- [Prisma Migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Docker Compose](https://docs.docker.com/compose/)

---

*Documento creado: 2026-06-21*  
*Próxima revisión: Después del primer deploy exitoso*
