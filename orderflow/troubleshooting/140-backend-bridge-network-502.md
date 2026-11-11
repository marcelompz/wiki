---
title: "502 Bad Gateway — Backend en red bridge (no traefik-public)"
area: "DevOps / Docker / Traefik"
symptom: "API endpoints (`/api/*`) retornan 502 Bad Gateway vía Cloudflare, pero frontend (`/`) funciona correctamente. Traefik no puede resolver `orderflow-backend-prod` vía DNS interno."
status: "🔧 Aplicado"
---

## Síntoma

- `https://provecchio.com/` → 200 OK
- `https://provecchio.com/api/v1/health` → 502 Bad Gateway
- `docker exec traefik wget http://orderflow-backend-prod:3010/...` → NXDOMAIN o Connection refused

## Causa raíz

El contenedor `orderflow-backend-prod` fue iniciado manualmente (o se detached de Docker Compose) y quedó en la red `bridge` (docker0) en vez de las redes `orderflow-network` y `traefik-public`.

Traefik corre en la red `traefik-public`. Cuando intenta enrutar a `orderflow-backend-prod:3010`, Docker DNS no resuelve el nombre porque el backend no está en una red compartida con Traefik.

Causa típica:
- Ejecución manual de `docker run` sin `--network traefik-public`
- Detener y reiniciar un contenedor fuera de Docker Compose
- Fallo parcial de deploy que dejó el backend corriendo con red incorrecta

## Solución aplicada

```bash
# 1. Conectar el backend a las redes correctas
docker network connect orderflow-network orderflow-backend-prod
docker network connect traefik-public orderflow-backend-prod

# 2. (Alternativa más limpia) Reiniciar vía Docker Compose
cd /srv/orderflow
docker compose -f docker-compose.prod.yml stop backend
docker compose -f docker-compose.prod.yml rm -f backend
docker compose -f docker-compose.prod.yml up -d --no-deps backend
```

### Variante: IP hardcoded vs Docker DNS (provecchio.local)

En entornos locales/dev, el servicio `orderflow-local-backend` en `/opt/traefik-orderflow/dynamic/services.yml` apuntaba a una IP estática (`172.19.0.3:3010`) que no existía. La solución fue usar el nombre del contenedor Docker (`orderflow_backend:3010`) que Docker DNS resuelve automáticamente cuando el contenedor está conectado a la red `traefik-public`.

```bash
# Conectar backend a traefik-public
docker network connect traefik-public orderflow_backend

# Usar Docker DNS name en vez de IP hardcoded
# services.yml:
#   orderflow-local-backend:
#     loadBalancer:
#       servers:
#         - url: "http://orderflow_backend:3010"  # ✅ Docker DNS
# vs:
#         - url: "http://172.19.0.3:3010"        # ❌ IP puede cambiar
```

## Verificación

```bash
# DNS debe resolver
docker exec traefik nslookup orderflow-backend-prod
# Debe retornar IP interna (ej: 172.21.0.x)

# Connectivity
docker exec traefik wget http://orderflow-backend-prod:3010/api/v1/health
# Debe retornar JSON de health

# Público
curl -sk https://provecchio.com/api/v1/health
# Debe retornar 200 OK
```

## Preventivo

- Siempre usar `docker compose` para gestionar contenedores, nunca `docker run` directo.
- Verificar redes tras cualquier intervención manual: `docker inspect <container> --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'`
- El script `deploy-production.sh` maneja correctamente las redes; usarlo para deploys.
