# 169 — Provecchio: Traefik Enrutando a QMSSuite en vez de OrderFlow

## 🎯 Síntoma
- `provecchio.com` y `pesallaccia.com` mostraban **502 Bad Gateway** o cargaban **QMSSuite** (puerto 3000/3001)
- Health checks de backend/API fallaban tras deploy
- Traefik loadBalancer URLs apuntaban a contenedores QMSSuite: `qms-web-app:3000` / `qms-backend-api:3001`

## 🔍 Causa Raíz
El archivo `/opt/srv/traefik/dynamic/services.yml` en el servidor de producción tenía configurados los servicios de OrderFlow Provecchio apuntando a los contenedores de **QMSSuite** (que usa puertos 3000/3001) en lugar de los contenedores de **OrderFlow/OmniFlow** (puertos 3010/3011/80).

Esto ocurrió porque:
1. La configuración de Traefik se gestionaba desde `/opt/traefik-orderflow/` en local
2. Pero el servidor de producción lee de `/opt/srv/traefik/dynamic/services.yml`
3. Los cambios locales no se habían sincronizado al servidor
4. QMSSuite y OrderFlow comparten el mismo Traefik, pero son servicios independientes

## ✅ Solución Aplicada

### 1. Actualizar services.yml local (`/opt/traefik-orderflow/dynamic/services.yml`)
```yaml
orderflow-prod-frontend:
  loadBalancer:
    servers:
      - url: "http://orderflow-frontend-prod:80"   # antes: qms-web-app:3000
orderflow-prod-backend:
  loadBalancer:
    servers:
      - url: "http://orderflow-backend-prod:3010"  # antes: qms-backend-api:3001
```

### 2. Sincronizar al servidor de producción
```bash
scp /opt/traefik-orderflow/dynamic/services.yml root@192.168.69.240:/opt/srv/traefik/dynamic/services.yml
# o vía ProxyJump:
scp -o "ProxyJump root@38.52.135.227:2021" /opt/traefik-orderflow/dynamic/services.yml root@192.168.69.240:/opt/srv/traefik/dynamic/services.yml
```

### 3. Recargar Traefik (sin reiniciar contenedor)
```bash
docker kill -s HUP traefik
# Verificar que cargó la nueva config:
docker exec traefik wget -qO- http://localhost:8080/api/http/services | grep orderflow-prod
```

### 4. Limpiar contenedores huérfanos antes de deploy
```bash
docker rm -f orderflow-frontend-prod orderflow-backend-prod orderflow-odoo-adapter-prod \
  orderflow-database-1 orderflow-redis-1 orderflow-loki orderflow-tempo \
  orderflow-alertmanager orderflow-grafana orderflow-promtail
```

### 5. Deploy con build forzado
```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

## ✅ Verificación Post-Deploy

| Endpoint | Host Header | Resultado |
|----------|-------------|-----------|
| `https://provecchio.com/api/v1/health` | `provecchio.com` | ✅ `{"status":"ok"}` |
| `https://provecchio.com/` | `provecchio.com` | ✅ HTML frontend |
| `https://www.provecchio.com/api/v1/health` | `www.provecchio.com` | ✅ `{"status":"ok"}` |
| `https://pesallaccia.com/api/v1/health` | `pesallaccia.com` | ✅ `{"status":"ok"}` |
| `https://orderflow.pesallaccia.com/api/v1/health` | `orderflow.pesallaccia.com` | ✅ `{"status":"ok"}` |
| `https://tenant.pesallaccia.com/api/v1/health` | `tenant.pesallaccia.com` | ✅ `{"status":"ok"}` |

**Nota importante:** Los routers de `provecchio.com` solo tienen entrypoint `websecure` (HTTPS). HTTP retorna 404 — esto es **esperado**, el redirect a HTTPS se maneja a nivel de edge/Cloudflare.

## 📋 Checklist para Próximos Deploys Provecchio

- [ ] Verificar que `/opt/traefik-orderflow/dynamic/services.yml` tiene URLs correctas de OrderFlow
- [ ] Sincronizar a `/opt/srv/traefik/dynamic/services.yml` en servidor
- [ ] `docker kill -s HUP traefik` para recargar config
- [ ] Limpiar contenedores OrderFlow previos: `docker rm -f orderflow-*`
- [ ] `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build`
- [ ] Verificar health checks: `docker ps --filter 'name=orderflow' --format '{{.Names}} {{.Status}}'`
- [ ] Testear routing: `docker exec traefik wget -qO- --no-check-certificate --header='Host: provecchio.com' https://localhost/api/v1/health`

## 🔗 Referencias
- AGENTS.md §4: "Infraestructura Proxy Exclusive Traefik v3.4 — La configuración de Traefik se gestiona desde `/opt/traefik-orderflow` y debe sincronizarse a `/srv/traefik` en el servidor de producción después de cada cambio mayor"
- AGENTS.md §9: "Autorización Previa Obligatoria para Despliegues"
- AGENTS.md §11: "Rebuild de Imágenes Docker (OBLIGATORIO): `docker compose up --build -d`"