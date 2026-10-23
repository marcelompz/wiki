# 183 — Deploy a Provecchio: SSH como root, frontend sin build y servicios standalone en crash-loop

## Área
Deploy / Provecchio (dimoraserverlocal) / Docker Compose / Servicios Standalone / Frontend

## Síntoma principal

El deploy `./scripts/deploy-production.sh provecchio` falló a mitad de la fase `up -d`, dejando **provecchio.com sin backend** (el script borra los contenedores antes de reconstruir):

```
[SYNC] Committing changes on remote...
error: permisos insuficientes para agregar un objeto a la base de datos del repositorio .git/objects
error: VERSION: falló al insertar en la base de datos
fatal: falló la actualización de archivos
...
Image orderflow-backend Built
open /srv/orderflow/.env.provecchio: permission denied
```

Y al revisar el stack ya levantado manualmente aparecieron síntomas adicionales:

| Síntoma | Detalle |
|---|---|
| Frontend servía el bundle viejo | `https://provecchio.com` seguía entregando `index-BvsoY3n5.js` con `"1.39.8"`: los fixes de POS/QR de v1.39.9 no llegaban nunca al sitio |
| `replica-entrypoint.sh` sin permiso de ejecución | `exec: "/entrypoint.sh": permission denied` al crear `orderflow-database-replica-prod` |
| `sync_standalone` en crash-loop | `Cannot find module '/app/dist/src/main.js'` |
| `omnibi_standalone` en crash-loop | `Cannot find module '../../auth-shared-dist/index.d.ts'` y luego `Database 'orderflow_bi' does not exist` |

---

## Causa Raíz

### 1. El script de deploy se conectaba por SSH con el usuario local (no root)

Todas las invocaciones usaban `ssh ${SSH_OPTS} "${REMOTE_HOST}"` (sin `root@`), por lo que el usuario efectivo era `marcelompz`:

- `.env.provecchio` en el servidor es `-rw------- root:root` → **`permission denied`** al resolver el `env_file` del override (compose aborta el `up -d`).
- `.git/objects` pertenece a root → el commit automático en el servidor fallaba.

### 2. El frontend nunca se reconstruía en el servidor

El servicio `frontend` no tiene Dockerfile: sirve `./frontend/dist` montado en el contenedor (`node:20-alpine` + `npx serve`), y el rsync del deploy excluye `**/dist`:

```
--exclude='**/dist' \
```

Por eso el bundle en producción se quedaba en la versión del build anterior, mientras la API sí avanzaba (backend v1.39.10 vs frontend v1.39.8). El síntoma era desconcertante: la API reportaba la versión nueva, pero la página seguía con los bugs de la v1.39.8.

### 3. `scripts/replica-entrypoint.sh` estaba en modo 644 en git

El v1.39.8 lo había arreglado con un `chmod +x` manual en el servidor, pero el modo en el repositorio era `100644` → cada rsync devolvía el archivo a `644` y la réplica de PostgreSQL moría al arrancar.

### 4. Los servicios standalone no podían arrancar en producción

Tres causas encadenadas:

1. **Resolución de `@orderflow/auth-shared`:** el `tsconfig.json` mapeaba `"@orderflow/auth-shared": ["./auth-shared-dist/index.d.ts"]`. TypeScript reescribe el `require` al path mapeado, así que el JS compilado terminaba haciendo `require('../../auth-shared-dist/index.d.ts')` → Node no puede ejecutar un `.d.ts` → `MODULE_NOT_FOUND`.
2. **Empaquetado del paquete:** el Dockerfile copiaba `auth-shared-dist/*` **en la raíz** de `node_modules/@orderflow/auth-shared`, pero su `package.json` declara `"main": "dist/index.js"` → faltaba la subcarpeta `dist/`.
3. **Bind mount de desarrollo en producción:** `sync_standalone` montaba `./services/sync-standalone:/app`, ocultando el `/app/dist` compilado de la imagen → `Cannot find module '/app/dist/src/main.js'`.

Además, `sync_standalone` usaba `REDIS_URL=redis://redis:6379` sin password (el Redis de producción exige `--requirepass`) y su healthcheck usaba `wget`, que **no existe** en `node:20-slim` (siempre_reportaba `unhealthy`).

---

## Solución Implementada

### `scripts/deploy-production.sh`
- SSH como `root@${REMOTE_HOST}` en todas las invocaciones (17 referencias).
- `REMOTE_ENV_FILE` por target: provecchio usa `.env.provecchio` (el que consume el override y contiene el `REDIS_PASSWORD` real).
- Se elimina el `docker volume prune` (podía borrar volúmenes huérfanos con datos).
- `chmod +x ${REMOTE_DIR}/scripts/*.sh` tras el rsync (evita el problema del entrypoint).
- **Nuevo paso de build del frontend** en el servidor (la imagen node:20-alpine no tiene node en el host):

```bash
docker run --rm --env-file ${REMOTE_DIR}/${REMOTE_ENV_FILE} \
  -e NODE_ENV=development \
  -v ${REMOTE_DIR}/frontend:/app -w /app node:20-alpine \
  sh -c 'npm ci --legacy-peer-deps --no-audit --no-fund --include=dev && npm run build -- --mode provecchio'
```

  (`NODE_ENV=development` + `--include=dev` son obligatorios: con `NODE_ENV=production` el `npm ci` omite `typescript`/`vite` y el build falla con `tsc: not found`).

- `build` con caché en lugar de `--no-cache` (el prune previo del builder ya invalidaba la caché).

### `docker-compose.provecchio.yml`
- `REDIS_URL` y `DATABASE_URL` con interpolación (`${REDIS_PASSWORD}`, `${POSTGRES_USER}`, `${POSTGRES_PASSWORD}`, `${POSTGRES_DB}`) en vez del placeholder hardcodeado `cambiar_redis_password_produccion_aleatorio`, que sobreescribía el valor correcto de `.env.provecchio` y hacía fallar la autenticación de Redis en el backend de producción.
- `sync_standalone`: `volumes: !reset []` (deja de montar el código fuente sobre `/app`) y `REDIS_URL` con password.

### `docker-compose.yml`
- Healthcheck de `sync_standalone` con `node -e "fetch(...)"` en lugar de `wget` (no existe en `node:20-slim`).

### Servicios standalone (`omnibi-standalone`, `sync-standalone`)
- `tsconfig.json`: se elimina el mapping `"@orderflow/auth-shared": ["./auth-shared-dist/index.d.ts"]` para que el import resuelva contra el paquete real en `node_modules`.
- `Dockerfile` (builder): el paquete `file:` de auth-shared se compila dentro de `node_modules/@orderflow/auth-shared/dist` para que TypeScript resuelva los tipos y el runtime apunte al JS.
- `Dockerfile` (runner): `cp -r ./auth-shared-dist/* ./node_modules/@orderflow/auth-shared/dist/` (antes se copiaba en la raíz y no coincidía con `"main": "dist/index.js"`).

### Base de datos
- Creación de la base `orderflow_bi` en el PostgreSQL de producción y aplicación de la migración `20261013000107_init_omnibi_standalone` con el Prisma 5.22 del servicio (el `npx prisma` dentro de la imagen descargaba Prisma 7, incompatible con `url = env(...)` en el schema).

---

## Verificación

- Contenedores en producción: `orderflow_backend`, `orderflow_frontend`, `orderflow_db`, `orderflow_redis`, `orderflow_odoo_adapter`, `orderflow_sync_standalone`, `orderflow_omnibi_standalone` y `orderflow-database-replica-prod` → **todos healthy**.
- `GET https://provecchio.com/api/v1/health` → `200 {"version":"1.39.10","status":"ok"}`.
- Bundle en producción: `/assets/index-CA5tim_H.js` con `"1.39.10"` y `VITE_APP_NAME=Provecchio` (build `--mode provecchio`).
- Log del backend: `✅ Socket.io Redis Adapter initialized successfully` y `Analytics Cache initialized on Redis redis:6379` → el pub/sub de Redis queda **habilitado en producción** (antes caía al fallback in-memory por el password placeholder).
- `scripts/qa_e2e_check.py` contra provecchio.com: catálogo público sin imágenes rotas, dominios sin errores JS y 7 rutas de admin sin 5xx.
- Playwright contra provecchio.com: **64/64 OK** (incluye los fixes de POS en tablet y el QR con menú digital, que solo funcionaban si el bundle estaba reconstruido).

---

## Prevención

- Un deploy a provecchio **debe** dejar el frontend reconstruido: si la API reporta una versión y el bundle otra, el primer síntoma es que "los fixes no aparecen" — revisar `/assets/index-*.js` y su `VERSION` embebida.
- No usar `docker compose` a mano sobre el servidor: el stack de producción es el par `docker-compose.yml` + `docker-compose.provecchio.yml` (proyecto `orderflow`, contenedores `orderflow_backend` / `orderflow_frontend` / `orderflow_db`). Usar `docker-compose.prod.yml` (el del target hetzner) crearía un stack paralelo y, con `--remove-orphans`, eliminaría los contenedores vivos.
- Los bind mounts `./services/<svc>:/app` son solo para desarrollo: en producción el servicio debe correr desde la imagen construida.
- Los healthchecks de imágenes `node:20-slim` deben usar `node -e "fetch(...)"`; `wget` no está instalado.
- Verificar permisos de ejecución de scripts montados (`replica-entrypoint.sh`) tras cada rsync.

## Referencias

- `scripts/deploy-production.sh`
- `docker-compose.yml`, `docker-compose.provecchio.yml`
- `services/omnibi-standalone/{Dockerfile,tsconfig.json}`, `services/sync-standalone/{Dockerfile,tsconfig.json}`
- [179 — Production Deploy Provecchio v1.39.8](179-production-deploy-provecchio-v1.39.8.md)
- [182 — Socket.IO + Redis adapter unhandledRejection](182-socketio-redis-adapter-unhandled-rejection-crash.md)
