# 🛠️ Deploy a Provecchio abortado: `vite build --mode provecchio` en el host rompe Workbox (2026-11-10)

**Severidad:** Alta (bloquea el deploy 1.46.2 a `provecchio.com`; el sitio queda en la versión anterior)

## Síntoma principal

`./scripts/deploy-production.sh provecchio` abortaba **antes** de construir las imágenes Docker:

```text
✓ built in 2m 7s
error during build:
Error:
  Configure "workbox.maximumFileSizeToCacheInBytes" to change the limit: the default value is 2 MiB.
  Assets exceeding the limit:
  - assets/vendor-antd-BY1_g7OK.js is 3.2 MB, and won't be precached.
    at generateServiceWorker (vite-plugin-pwa/dist/index.js:209:3)
```

## Diagnóstico

1. El script compilaba el frontend **dos veces**:
   - En el host remoto: `docker run node:20-alpine ... npm run build -- --mode provecchio`
     (`vite-plugin-pwa` genera el service worker y aborta por el límite de 2 MiB).
   - En la imagen: `compose build frontend` usa `frontend/Dockerfile.prod`
     (`RUN npm run build` ⇒ `mode production`).
2. El contenedor `orderflow_frontend` es **autocontenido**: `serve` sirve `/app/dist`
   horneado en la imagen. No hay bind mount de `./frontend/dist` (verificado con
   `docker inspect --format '{{range .Mounts}}...'` → vacío; Traefik apunta a
   `orderflow_frontend:80`).
3. La imagen desplegada de 1.46.1 tenía `vendor-antd-zezbCeg-.js` = **1.45 MB**
   (minificado). El build del host generaba `vendor-antd-BY1_g7OK.js` = **3.2 MB**
   porque `frontend/vite.config.ts` tenía `minify: mode === 'production'` y el
   mode custom `provecchio` no minificaba.
4. El CI (`npm run build`, mode production) siempre pasó: nunca ejecutó el build
   del host con `--mode provecchio`.

Conclusión: el build del host era un **resto del setup con bind mount**, no aportaba
el bundle que se sirve, duplicaba el tiempo de deploy (~2 min) y era el único punto
que fallaba.

## Solución aplicada (2026-11-10, v1.46.2)

1. `scripts/deploy-production.sh`: se elimina el bloque que compilaba el frontend en
   el host. El bundle lo genera exclusivamente `compose build frontend`
   (`frontend/Dockerfile.prod`, `mode production`, con los `VITE_*` como build-args).
2. `frontend/vite.config.ts`:
   - `minify: mode !== 'development'` para que cualquier build de release
     (`production`, `staging`, `provecchio`) salga minificado.
   - `maximumFileSizeToCacheInBytes: 4 * 1024 * 1024` en `workbox` como margen:
     un upgrade de `antd` que empuje el chunk por encima de 2 MiB ya no aborta el
     build de la imagen (que es crítico y frena el deploy completo).
3. `scripts/deploy-production.sh`: keepalive SSH (`ServerAliveInterval=15`,
   `ServerAliveCountMax=8`, `TCPKeepAlive=yes`) para tolerar el jump host
   intermitente de Provecchio.

## Verificación

```bash
# El build que realmente se despliega (dentro del Dockerfile.prod)
docker compose -f docker-compose.yml -f docker-compose.provecchio.yml \
  --env-file .env.provecchio build frontend

# Tras el deploy
curl -s https://provecchio.com/api/v1/health | jq .version   # 1.46.2
docker exec orderflow_frontend sh -c 'ls -l /app/dist/assets/vendor-antd-*.js'
```

## Prevención

- No reincorporar builds de frontend en el host: el artefacto de producción es la
  imagen de `Dockerfile.prod`.
- Si se agrega un mode custom de build, actualizar `build.minify` y validar el
  tamaño de los chunks contra el límite de Workbox.
