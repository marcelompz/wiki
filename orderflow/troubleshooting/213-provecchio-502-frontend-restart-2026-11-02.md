# 🛠️ 502 Bad Gateway en provecchio.com — Frontend tras reinicio de contenedor (2026-11-02)

**Severidad:** Alta (HTTP 502 Bad Gateway en `https://provecchio.com/`)

## Síntoma principal

`https://provecchio.com/` devolvía **HTTP 502 Bad Gateway** desde Cloudflare. El certificado SSL era válido (Google Trust Services WE1, expira 26/01/2027), por lo que el problema no era TLS.

## Diagnóstico

1. **Backend respondía correctamente** en localhost:
   - `curl http://localhost:3010/api/v1/health` → HTTP 200, `{"version":"1.45.4", ..., "status":"ok"}`
2. **Contenedores running** (`docker ps`): `orderflow_backend` (healthy, 36 min), `orderflow_frontend` (Up 24 min), `traefik` (Up 7 horas), todos los servicios standalone healthy.
3. **Ambos contenedores en red `traefik-public`**: `orderflow_frontend` (172.18.0.8), `orderflow_backend` (172.18.0.2) — DNS interno de Traefik funcional.
4. **Prueba local a través de Traefik**:
   - `curl -sk -H 'Host: provecchio.com' https://localhost:443/` → **HTTP 200** (frontend)
   - `curl -sk -H 'Host: provecchio.com' https://localhost:443/api/v1/health` → **HTTP 200** (API)
5. **Desde fuera (Cloudflare)**: `curl -kv https://provecchio.com/` → **HTTP 200** tras estabilización.

## Causa raíz

El contenedor `orderflow_frontend` se había reiniciado hace 24 minutos y, al momento del primer request externo, Traefik aún no había estabilizado la ruta al frontend o el contenedor aún no estaba listo para aceptar conexiones, generando el 502 en Cloudflare. Una vez el contenedor frontend estuvo completamente up y Traefik reintentó la conexión, el servicio volvió a funcionar normalmente.

No hubo cambios de código, ni de esquema de base de datos, ni de configuración de Traefik. El `services.yml` de Traefik (`/opt/srv/traefik/dynamic/services.yml`) ya tenía los routers `provecchio-frontend` y `provecchio-api` correctos apuntando a `orderflow_frontend:80` y `orderflow_backend:3010`.

**Nota (AGENTS.md §9.1):** Los routers `provecchio-frontend` / `provecchio-api` usan únicamente entrypoint `websecure` (HTTPS); HTTP retorna 404 y eso es esperado (el redirect HTTP→HTTPS se maneja en edge/Cloudflare). No se agregaron routers HTTP para `provecchio.com`.

## Solución aplicada

No se requirió intervención de código ni de configuración. El sitio se recuperó por sí solo una vez el contenedor frontend se estabilizó. Pasos de verificación ejecutados:

```bash
# 1. Verificar contenedores
docker ps | grep orderflow

# 2. Verificar salud del backend
curl http://localhost:3010/api/v1/health

# 3. Verificar a través de Traefik (localhost)
curl -sk -H 'Host: provecchio.com' https://localhost:443/
curl -sk -H 'Host: provecchio.com' https://localhost:443/api/v1/health

# 4. Verificar desde fuera (Cloudflare)
curl -kv https://provecchio.com/
curl -kv https://provecchio.com/api/v1/health
```

## Si el 502 vuelve a ocurrir

Ejecutar en el servidor de Provecchio (`root@192.168.69.240`):

```bash
# Verificar estado de contenedores
docker ps | grep -E 'orderflow_frontend|orderflow_backend|traefik'

# Revisar logs del frontend
docker logs --tail=50 orderflow_frontend

# Revisar logs de Traefik
docker logs --tail=50 traefik | grep -iE 'provecchio|502|error|ERR'

# Forzar recarga de rutas Traefik (si hubo cambio de config)
docker kill -s HUP traefik

# Si el frontend no responde, reiniciar solo ese servicio
docker compose -f docker-compose.provecchio.yml restart orderflow_frontend
```

## Validación post-incidente

| Endpoint | Resultado | Estado |
|----------|-----------|--------|
| `https://provecchio.com/` | HTTP 200 (frontend React) | ✅ |
| `https://provecchio.com/api/v1/health` | HTTP 200, `status: ok`, v1.45.4 | ✅ |
| Contenedores `orderflow_frontend` / `orderflow_backend` | Up | ✅ |
| Red `traefik-public` con ambos contenedores | OK | ✅ |

**Versión desplegada:** v1.45.4  
**Fecha del incidente:** 2026-11-02  
**Estado:** ✅ Resuelto — sin cambios de código ni configuración
