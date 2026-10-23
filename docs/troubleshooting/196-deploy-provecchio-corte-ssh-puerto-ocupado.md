# 196 — El deploy a Provecchio se cortó por SSH, dejó el sitio en 502 y un contenedor huérfano reteniendo el puerto 3010

**Fecha:** 2026-10-23 00:55–01:15 (America/Argentina)
**Componente:** `scripts/deploy-production.sh` target `provecchio` (`root@192.168.69.240`)
**Duración de la caída:** ~20 minutos
**Estado:** ✅ Resuelto (servicio restaurado en 1.41.1)

---

## Síntoma

Durante el deploy de v1.41.1 la sesión SSH murió en medio del build:

```
#43 [omnibi_standalone builder ...] COPY prisma ./prisma/
Timeout, server 38.52.135.227 not responding.
Connection to 192.168.69.240 closed by remote host.
client_loop: send disconnect: Broken pipe
```

`https://provecchio.com` quedó en **502** (frontend y API) y `docker ps` no mostraba contenedores de
OrderFlow.

## Causa raíz

Dos factores combinados:

1. **El script elimina los contenedores antes de construir.** Al morir el proceso del deploy, el stack
   quedó abajo y sin nadie que lo levante (el script no tiene `trap` de recuperación).
2. **El corte dejó un contenedor "huérfano" con nombre hasheado**
   (`003efb18c065_orderflow_backend`) que **retuvo el puerto 3010**. Al reintentar
   `docker compose up -d`, el nuevo `orderflow_backend` falló con:

   ```
   Bind for 0.0.0.0:3010 failed: port is already allocated
   ```

   Ese contenedor era el intento previo de `up -d` que había arrancado antes de que el proceso padre
   muriera (Docker lo dejó vivo con nombre temporal).

El corte fue de red/relay (`38.52.135.227` es el ProxyJump de fallback), no de recursos: al momento del
diagnóstico había **7.8 G libres** y **5 G de RAM disponible**.

## Solución aplicada

1. **Rebuild desacoplado** para que un corte SSH no lo mate:

   ```bash
   ssh root@192.168.69.240 'cd /srv/orderflow && nohup setsid bash -c \
     "CACHE_BUST=$(cat VERSION) docker compose -f docker-compose.yml --env-file .env.prod \
      up -d --build --remove-orphans > /tmp/deploy-1411.log 2>&1; echo EXIT=$? >> /tmp/deploy-1411.log" \
     >/dev/null 2>&1 &'
   ```

2. **Eliminar el contenedor huérfano** que retenía el puerto y volver a levantar sin rebuild
   (las imágenes ya estaban construidas):

   ```bash
   docker rm -f 003efb18c065_orderflow_backend
   docker compose -f docker-compose.yml --env-file .env.prod up -d --remove-orphans
   ```

3. **Verificación:** `health` → `1.41.1` (`database:ok`, `odoo_adapter:ok`), frontend `200`,
   contenedores `healthy`, 76 migraciones, datos intactos (1 tenant, 18 mesas, 226 productos,
   30 pedidos). QA post-deploy (`scripts/qa_e2e_check.py https://provecchio.com`) → ✅.

## Prevención

- **Construir antes de borrar:** el script debería hacer `docker compose build` y sólo después
  `up -d`, para que un fallo de build no tumbe el sitio (mejora pendiente).
- **`trap ERR` con recuperación:** si el deploy muere, intentar `docker compose up -d` con las
  imágenes existentes antes de salir.
- **Limpiar huérfanos antes de `up -d`:** `docker ps --filter "name=^[0-9a-f]\{12\}_" -q | xargs -r docker rm -f`
  (contenedores con prefijo hash creados por un `up` interrumpido).
- Para deploys largos, usar `nohup`/`tmux` en el host; no depender de la sesión SSH del operador.

## Hallazgo colateral (pre-existente, no causado por este deploy)

`orderflow_sync_standalone` está en crash-loop desde hace días:

```
Error: Cannot find module '/app/dist/src/main.js'
```

El servicio monta `./services/sync-standalone:/app` como **bind mount**, y ese directorio del host
**no tiene `dist/`** (su `package.json` es del 2026-10-12). La imagen sí contiene `dist/src/main.js`,
pero el mount la tapa. No afecta el core (health, POS, catálogo y QA funcionan); requiere
`npm ci && npm run build` en `services/sync-standalone` o eliminar el bind mount en producción.

---

## Resolución aplicada en v1.41.2 (2026-10-23)

### 1. `orderflow_sync_standalone` — causa raíz real: overlay omitido

El diagnóstico inicial (falta de `dist/`) era parcial. El repo **ya** resuelve el problema con
`docker-compose.provecchio.yml`, que hace `volumes: !reset []` para `sync_standalone`:

```yaml
sync_standalone:
  volumes: !reset []
  environment:
    REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
```

El crash-loop apareció porque la recuperación manual del incidente levantó el stack **solo** con
`docker-compose.yml` (sin el overlay), dejando activo el bind mount de desarrollo. La forma correcta
en provecchio es siempre:

```bash
cd /srv/orderflow
docker compose -f docker-compose.yml -f docker-compose.provecchio.yml \
  --env-file .env.provecchio up -d --remove-orphans
```

Verificado: contenedor `healthy`, sin mounts de desarrollo, `OmniSync is running on:
http://localhost:3015/api/v1`.

> **Ojo con el env file:** el script usa `.env.prod` como `ENV_FILE_PATH` local, pero
> `REMOTE_ENV_FILE=.env.provecchio` para el compose remoto. Levantar a mano con `--env-file .env.prod`
> arranca Redis/DB con credenciales incorrectas.

### 2. Hardening de `scripts/deploy-production.sh` (implementado)

| Mejora | Detalle |
|---|---|
| Build antes de borrar | `compose build` → limpieza → `compose rm -f -s` → `compose up -d`. Un build fallido ya no deja el sitio en 502. |
| Huérfanos con prefijo hash | `docker ps -aq --filter 'name=^[0-9a-f]\{12\}_' | xargs -r docker rm -f` antes del `up`, evita conflictos de nombre/puerto (3010). |
| Recuperación automática | `trap recover_stack_on_error EXIT` con flag `REMOTE_TOUCHED`: si el deploy aborta tras tocar contenedores y antes de confirmar el stack, reintenta `compose up -d` con las imágenes existentes. |
| Sin `--build` redundante | El `up` ya no recompila (se hizo antes), reduciendo ventana de indisponibilidad. |

Validado con `bash -n` y con el deploy real de v1.41.2.
