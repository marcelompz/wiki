# 🛠️ Resolución de 502 Bad Gateway — Contenedor Frontend Ausente en Provecchio (Julio 2026)

**Fecha:** 2026-07-31  
**Módulo / Área:** DevOps / Docker / Traefik / Deploy  
**Severidad:** Alta (HTTP 502 Bad Gateway en `provecchio.com` después del deploy)  
**Estado:** ✅ **RESUELTO & HOMOLOGADO**

---

## 1. Descripción del Problema

Tras el deploy de la versión v1.1.9 a `dimoraserverlocal` (seridor de Provecchio, IP interna `192.168.69.240`, accesible vía salto SSH a través de `dimoraserver1` en `38.52.135.227:2021`):

- `https://provecchio.com` devolvía **HTTP 502 Bad Gateway**
- `https://provecchio.com/api/v1/health` devolvía **HTTP 502**
- El catálogo público `https://spa-wellness.pesallaccia.com/whatsapp-catalog` (Hetzner) funcionaba correctamente

## 2. Causa Raíz

**El contenedor `orderflow-frontend-prod` no existía en el servidor de Provecchio.**

Durante el deploy con `docker compose -f docker-compose.prod.yml up -d --build --remove-orphans`, el contenedor frontend fue **creado pero no iniciado** (estado Docker: `Created` en lugar de `Up`). El build completó correctamente, pero el proceso de inicio falló debido a un *timeout* en el deploy script — el backend (que depende de la base de datos) no estaba listo cuando el frontend intentó iniciarse.

El archivo `services.yml` de Traefik (`providers.file`) apuntaba a `http://orderflow-frontend-prod:80`, pero como el contenedor no existía, la resolución DNS fallaba silenciosamente y Traefik devolvía **502 Bad Gateway**.

### Diagnóstico paso a paso

```bash
# 1. Verificar contenedores activos
docker ps --format 'table {{.Names}}\t{{.Status}}'
# Resultado: orderflow-frontend-prod NO aparece en la lista

# 2. Verificar contenedores creados pero no iniciados
docker ps -a | grep frontend
# Resultado: "Created" (no "Up")

# 3. Verificar puertos internos de los Node.js process
python3 -c "
def parse_tcp(path):
    results = []
    with open(path) as f:
        for line in f:
            parts = line.split()
            if len(parts) > 4 and parts[3] == '0A':
                port = int(parts[1].split(':')[1], 16)
                results.append(port)
    return results
# Frontend (pid 3480511): LISTENING on ports: [3005, 45231]
# Backend  (pid 3485675): LISTENING on ports: [3010, 40505]
# → El frontend escucha en el puerto 3005 (servidor dev) en vez del 80 (producción)
# → El servicio en services.yml apuntaba a :80 → 502
"

# 4. Verificar conectividad desde Traefik
curl -sk 'https://localhost:443/' -H 'Host: provecchio.com' --resolve 'provecchio.com:443:127.0.0.1'
# Resultado: HTTP 502
```

### Arquitectura de despliegue de Provecchio

| Componente | Host | Puerto SSH | Usuario | Directorio |
|---|---|---|---|---|
| Jump host (dimoraserver1) | `38.52.135.227` | `2021` | `marcelompz` | — |
| Servidor de despliegue (dimoraserverlocal) | `192.168.69.240` | `22` | `root` | `/srv/orderflow` |
| Traefik (externo) | `192.168.69.240` | `80/443/8083` | — | `/srv/traefik` |

## 3. Solución Ejecutada

```bash
# 1. Sincronizar código
cd /srv/orderflow
git fetch origin main
git reset --hard origin/main

# 2. Reconstruir y levantar todos los contenedores
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans

# 3. Si el frontend sigue ausente, forzar su inicio individual
docker compose -f docker-compose.prod.yml up -d frontend

# 4. Verificar estado
docker compose -f docker-compose.prod.yml ps --format 'table {{.Names}}\t{{.Status}}'
# orderflow-frontend-prod  Up 2 min (healthy)  80/tcp

# 5. Migraciones Prisma
docker compose -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy

# 6. Verificar salud
curl -s http://localhost:8083/api/http/services | grep "orderflow-prod-frontend"
# serverStatus: {"http://orderflow-frontend-prod:80": "UP"}
```

## 4. Verificación Post-Solución

| Endpoint | Estado |
|---|---|
| `https://provecchio.com` | ✅ HTTP 200 |
| `https://provecchio.com/api/v1/health` | ✅ HTTP 200 (`status: ok`) |
| `https://provecchio.com/admin/products` | ✅ HTTP 200 |
| `https://spa-wellness.pesallaccia.com/whatsapp-catalog` | ✅ HTTP 200 |
| `./scripts/init.sh` (barrera QA) | ✅ PASS (50 suites / 389 tests) |

## 5. Protocolo de Prevención para Futuros Deploys

1. **Verificar contenedores después de `docker compose up`**: siempre ejecutar `docker ps` y confirmar que todos los contenedores críticos (`*-prod`) están en estado `Up (healthy)`.
2. **Retry manual del frontend**: si `docker compose up -d frontend` no inicia correctamente, usar `docker compose up -d frontend` por separado después de que la base de datos y Redis estén healthy.
3. **Health check automático post-deploy**: agregar al final de `deploy-production.sh` una verificación que haga `curl -sf https://$DOMAIN/health || docker compose up -d frontend` como mecanismo de recuperación.
4. **Documentación de redes**: `traefik.yml` usa exclusivamente `providers.file` (NO Docker provider) para evitar el error de versión de API de Docker (`client version 1.24 is too old`). El enrutamiento se define en `services.yml` apuntando a container names resueltos vía Docker DNS en la red `traefik-public`.

---

**Referencias:**
- [06-provecchio-traefik-ssl-and-502-diagnosis.md](06-provecchio-traefik-ssl-and-502-diagnosis.md) — 502 anterior (network isolation + Cloudflare loop)
- [09-docker-orphan-containers-cleanup.md](09-docker-orphan-containers-cleanup.md) — contenedores duplicados
- `scripts/deploy-production.sh` — script de deploy
- `scripts/init.sh` — barrera de validación QA
