# Troubleshooting #179: Production Deploy Provecchio v1.39.8

**Fecha:** 2026-10-19  
**Versión:** 1.39.8 (patch)  
**Target:** provecchio (dimoraserverlocal - 192.168.69.240)  
**Estado:** ✅ Resuelto - Despliegue exitoso

---

## Resumen del Despliegue

Despliegue completo de OrderFlow v1.39.8 en entorno de producción Provecchio. Incluye correcciones críticas de build backend, configuración Traefik, variables de entorno y conectividad Redis.

---

## Errores Corregidos

### 1. Backend Build: `dist/main.js` no se generaba

**Síntoma:** `Error: Cannot find module '/app/dist/main'`

**Causa raíz:** 
- Bind mount `./backend:/app` en docker-compose.yml sobrescribía la carpeta `dist/` compilada con el código fuente del host
- `tsconfig.prod.json` no incluía los `paths` aliases necesarios (`@common/*`, `@auth/*`, etc.)
- TypeScript compilaba pero no emitía `main.js` por configuración incompleta

**Solución:**
```dockerfile
# Dockerfile.dev - Build production
RUN NODE_OPTIONS="--max-old-space-size=4096" npx tsc -p tsconfig.prod.json && \
    node -e "const fs=require('fs'); const tsc=JSON.parse(fs.readFileSync('tsconfig.json')); \
    tsc.compilerOptions.baseUrl='.'; \
    tsc.compilerOptions.paths=Object.fromEntries(Object.entries(tsc.compilerOptions.paths).map(([k,v])=>[k,v.map(p=>p.replace('src/',''))])); \
    fs.writeFileSync('dist/tsconfig.json', JSON.stringify(tsc,null,2));"
```

```yaml
# docker-compose.yml - Eliminar bind mount que sobrescribe dist/
volumes:
  - /app/node_modules
  - ./uploads:/app/uploads
  # ELIMINADO: - ./backend:/app
```

**Archivos modificados:**
- `backend/Dockerfile.dev`
- `backend/tsconfig.prod.json` (nuevo - con paths completos)
- `docker-compose.yml`

---

### 2. Runtime Path Resolution: `@common/prisma.service` no encontrado

**Síntoma:** `Error: Cannot find module '@common/prisma.service'`

**Causa raíz:** Los alias TypeScript (`@common/*`, `@auth/*`, etc.) solo existen en tiempo de compilación. En runtime Node.js no los resuelve.

**Solución:** 
```yaml
# docker-compose.yml - Runtime con tsconfig-paths
command: sh -c "npx prisma migrate deploy && TS_NODE_PROJECT=dist/tsconfig.json node -r tsconfig-paths/register dist/main.js"
```

```dockerfile
# Dockerfile.dev - Instalar tsconfig-paths
RUN NODE_OPTIONS="--max-old-space-size=4096" npm ci && npm install tsconfig-paths
```

---

### 3. Variables de Entorno: `JWT_SECRET` no existe

**Síntoma:** `Configuration key "JWT_SECRET" does not exist`

**Causa raíz:** El servicio backend no cargaba `.env.provecchio` en producción. El `docker-compose.provecchio.yml` no tenía la configuración `env_file` para el servicio backend.

**Solución:**
```yaml
# docker-compose.provecchio.yml
services:
  backend:
    env_file:
      - .env.provecchio
    environment:
      REDIS_URL: redis://:dajV4HxcK4C4WinkGxvVssWQ@redis:6379
      DATABASE_URL: postgresql://orderflow:GwV2UpPdZnCocfdjmOKUfqiX@postgres:5432/orderflow_db?schema=public
```

---

### 4. Redis: Conexión fallida con `localhost`

**Síntoma:** `Error: Stream isn't writeable and enableOfflineQueue options is false`

**Causa raíz:** En `.env.provecchio` producción, `REDIS_URL` apuntaba a `localhost:6379` en lugar del nombre del contenedor `redis:6379`. Además, Redis no tenía password configurado.

**Solución:**
```bash
# .env.provecchio - Corrección
REDIS_URL=redis://:dajV4HxcK4C4WinkGxvVssWQ@redis:6379
```

```yaml
# docker-compose.yml - Redis con password
redis:
  command: redis-server --requirepass ${REDIS_PASSWORD}
  healthcheck:
    test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
```

---

### 5. Traefik: Bad Gateway en `provecchio.com`

**Síntoma:** 502 Bad Gateway al acceder a `https://provecchio.com/`

**Causa raíz:** En `/srv/traefik/dynamic/services.yml` los servicios `orderflow-prod-frontend` y `orderflow-prod-backend` apuntaban a contenedores inexistentes:
- `orderflow-frontend-prod:80` (no existe)
- `orderflow-backend-prod:3010` (no existe)

Los contenedores reales son:
- `orderflow_frontend:80`
- `orderflow_backend:3010`

**Solución:**
```bash
# En servidor producción
sed -i 's/orderflow-frontend-prod:80/orderflow_frontend:80/g' /srv/traefik/dynamic/services.yml
sed -i 's/orderflow-backend-prod:3010/orderflow_backend:3010/g' /srv/traefik/dynamic/services.yml
docker kill -s HUP traefik
```

---

### 6. Réplica DB: Permisos entrypoint.sh

**Síntoma:** `exec: "/entrypoint.sh": permission denied`

**Solución:**
```bash
chmod +x /srv/orderflow/scripts/replica-entrypoint.sh
```

---

## Archivos Modificados en Producción

| Archivo | Cambio |
|---------|--------|
| `/srv/orderflow/docker-compose.yml` | Redis con password, backend sin bind mount |
| `/srv/orderflow/docker-compose.provecchio.yml` | Backend con env_file y REDIS_URL/DATABASE_URL explícitos |
| `/srv/orderflow/.env.provecchio` | REDIS_URL corregido a `redis:6379` |
| `/srv/traefik/dynamic/services.yml` | Servicios orderflow-prod apuntan a contenedores reales |
| `/srv/orderflow/scripts/replica-entrypoint.sh` | Permisos +x |

---

## Archivos Modificados en Local (para sync futuro)

| Archivo | Cambio |
|---------|--------|
| `backend/Dockerfile.dev` | Build con tsc + tsconfig-paths runtime |
| `backend/tsconfig.prod.json` | Nuevo - paths completos copiados de tsconfig.json |
| `backend/tsconfig.build.json` | `incremental: false` |
| `docker-compose.yml` | Redis con password, backend sin bind mount |
| `docker-compose.provecchio.yml` | Backend env_file + environment explícitos |
| `.env.provecchio` | REDIS_URL = `redis://:password@redis:6379` |

---

## Verificación Post-Despliegue

### Endpoints funcionales:
- ✅ `https://provecchio.com/api/v1/health` - 200 OK
- ✅ `https://provecchio.com/bio/dimora` - 200 OK  
- ✅ `https://provecchio.com/api/v1/bio/dimora` - 200 OK
- ✅ `https://provecchio.com/social-catalog/menudigital` - 200 OK
- ✅ `https://provecchio.com/api/v1/auth/login` - 200 OK

### Contenedores saludables:
- `orderflow_backend` - healthy (v1.39.8)
- `orderflow_frontend` - healthy
- `orderflow_redis` - healthy (con auth)
- `orderflow_odoo_adapter` - healthy
- `orderflow_db` - healthy
- `traefik` - running (Let's Encrypt cert para provecchio.com)

### Certificados SSL:
- Let's Encrypt válido para `provecchio.com` y `www.provecchio.com` (verificado en acme.json)

---

## Notas para Futuros Despliegues

1. **Siempre sincronizar Traefik:** `/opt/traefik-orderflow/dynamic/services.yml` → `/srv/traefik/dynamic/services.yml` + `docker kill -s HUP traefik`

2. **Verificar nombres de contenedores:** En producción los contenedores no llevan sufijo `-prod` (son `orderflow_backend`, no `orderflow-backend-prod`)

3. **Redis password obligatorio:** En producción siempre configurar `--requirepass` y healthcheck con `-a password`

4. **Env files:** `docker-compose.provecchio.yml` debe incluir `env_file: .env.provecchio` para backend

5. **Build backend:** Usar `tsconfig.prod.json` con paths completos, no confiar en `nest build` para producción
