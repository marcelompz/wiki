# 191 — 502 persistente en `pesallaccia.com` (Hetzner): Traefik apuntando a nombres de contenedor de Provecchio

**Fecha:** 2026-10-22
**Componente:** DevOps / Traefik / Docker Compose
**Estado:** ✅ Resuelto
**Versión:** v1.40.2

## Síntoma

- `https://pesallaccia.com/api/v1/health` y `https://pesallaccia.com/` devolvían **502** (`error code: 502` desde el edge de Cloudflare).
- Los contenedores del host estaban **`Up 3 weeks (healthy)`**: `orderflow-backend-prod`, `orderflow-frontend-prod`, `orderflow-database-1`, `orderflow-redis-1`.
- `provecchio.com` funcionaba con normalidad en el mismo momento.

## Diagnóstico

1. El TLS/edge de Cloudflare estaba correcto: el fallo venía del **origen**.
2. `curl -k -H "Host: pesallaccia.com" https://127.0.0.1/api/v1/health` desde el propio host devolvía **502 Bad Gateway** → el problema era de Traefik, no de red.
3. Prueba directa desde dentro del contenedor de Traefik:

```
docker exec traefik wget -qO- http://orderflow-backend-prod:3010/api/v1/health   # 200 → v1.36.5
docker exec traefik wget -qO- http://orderflow_backend:3010/api/v1/health        # bad address
docker exec traefik wget -qO- http://orderflow_frontend:80/                      # bad address
```

4. En `/srv/traefik/dynamic/services.yml` del host:

```yaml
orderflow-prod-frontend:
  loadBalancer:
    servers:
      - url: "http://orderflow_frontend:80"      # ❌ no existe en este host
orderflow-prod-backend:
  loadBalancer:
    servers:
      - url: "http://orderflow_backend:3010"     # ❌ no existe en este host
```

## Causa raíz

El commit `42e67c7` (*"refactor(dynamic): standardize orderflow service target names"*) estandarizó
`dynamic/services.yml` con los nombres de contenedor de **Provecchio** (`orderflow_backend`,
`orderflow_frontend`). Ese archivo se sincronizó al servidor de **Hetzner**, donde
`docker-compose.prod.yml` crea los contenedores como `orderflow-backend-prod` /
`orderflow-frontend-prod`. Traefik no resuelve el nombre en la red `traefik-public` y responde 502.

Es una recaída del mismo patrón documentado en [#142](142-provecchio-container-name-mismatch-502.md)
y [#169](169-provecchio-traefik-qms-routing-fix.md): **un único `services.yml` no puede asumir
los `container_name` de dos hosts distintos**.

## Solución aplicada

### 1. Corrección inmediata en el host (sin reiniciar Traefik)

```bash
cp /srv/traefik/dynamic/services.yml /srv/traefik/dynamic/services.yml.bak-20261022-502
sed -i 's#http://orderflow_frontend:80#http://orderflow-frontend-prod:80#; \
        s#http://orderflow_backend:3010#http://orderflow-backend-prod:3010#' \
        /srv/traefik/dynamic/services.yml
docker kill -s HUP traefik
```

### 2. Corrección estructural en el repositorio

`docker-compose.prod.yml` declara **alias de red** en `traefik-public`, de modo que el
`services.yml` canónico (nombres de Provecchio) también resuelva en Hetzner en el próximo deploy:

```yaml
networks:
  orderflow-network:
  traefik-public:
    aliases:
      - orderflow_backend    # backend
      - orderflow_frontend   # frontend
```

Con esto ambos hosts resuelven los mismos nombres aunque sus `container_name` difieran.

## Verificación

| Prueba | Resultado |
|---|---|
| `traefik-local api` (`Host: pesallaccia.com`) | **200** |
| `traefik-local frontend` | **200** |
| `https://pesallaccia.com/api/v1/health` | **200** — `1.36.5`, `database: ok`, `odoo_adapter: ok` |

## Nota operativa

El host de Hetzner quedó en **v1.36.5**; este fix restablece el servicio pero **no** actualiza la
versión. El salto a v1.40.2 requiere su propio deploy con backup y ventana.
