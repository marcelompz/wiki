# Troubleshooting: Odoo 14 Adapter Connection Failure on Localhost

**Fecha:** 2026-10-18  
**Entorno:** Local (provecchio.local) / Docker Compose  
**Severidad:** Alta — Integración Odoo no funciona en `/admin/integrations`

---

## Síntoma

En `https://provecchio.local/admin/integrations`:
- Test de conexión Odoo falla: "Connection error: fetch failed"
- En producción `https://provecchio.com/admin/integrations` funciona correctamente
- Mismas credenciales: Host 192.168.69.246, Port 8081, User soporte@crossnexion.com

---

## Causa Raíz (Múltiple)

### 1. Contenedor `orderflow_odoo_adapter` detenido
- `restart: "no"` en docker-compose.yml impedía auto-reinicio
- Contenedor estaba `Exited (255) 4 weeks ago`

### 2. Configuración Odoo incorrecta en docker-compose.yml
```yaml
# INCORRECTO
ODOO_HOST: host.docker.internal
ODOO_PORT: 8083
ODOO_DB: wellnesscoffee
ODOO_USER: soporte@crossnexion.com
ODOO_PASSWORD: admin
```
- `host.docker.internal` no resuelve a 192.168.69.246 desde el contenedor
- Puerto 8083 incorrecto (producción usa 8081)
- Contraseña `admin` incorrecta (producción usa `Cross1983_`)

### 3. Falta configuración Redis en odoo_adapter
- `table-sync-worker.js` usa `REDIS_HOST || 'redis'` pero no había env vars
- `redis.lpop()` fallaba con `ENOTFOUND redis`

### 4. Falta `depends_on: redis` en odoo_adapter
- Worker intentaba conectar a Redis antes de que estuviera listo

---

## Solución

### Fix 1: Docker Compose — `restart: unless-stopped` para todos los servicios
```yaml
# ANTES (todos los servicios)
restart: "no"

# DESPUÉS
restart: unless-stopped
```
Asegura que `docker compose up -d` inicie todos los contenedores y auto-reinicien en crash.

### Fix 2: odoo_adapter — Configuración correcta
```yaml
odoo_adapter:
  environment:
    ODOO_HOST: 192.168.69.246
    ODOO_PORT: 8081
    ODOO_DB: wellnesscoffee
    ODOO_USER: soporte@crossnexion.com
    ODOO_PASSWORD: Cross1983_
    REDIS_HOST: redis
    REDIS_PORT: 6379
    REDIS_PASSWORD: dajV4HxcK4C4WinkGxvVssWQ
    REDIS_DB: 0
  depends_on:
    - backend
    - redis
```

### Fix 3: odoo_adapter — `depends_on: redis` con healthcheck
Redis ya tiene healthcheck; odoo_adapter espera a que esté healthy.

---

## Verificación

```bash
# 1. Levantar todo
docker compose up -d

# 2. Verificar odoo_adapter logs
docker logs orderflow_odoo_adapter --tail 20
# Debe mostrar:
# [TableSyncWorker] Listening on Redis queue: odoo-table-sync
# (SIN errores de ENOTFOUND redis)

# 3. Test conexión desde adapter
curl -X POST http://localhost:3005/test-connection \
  -H "Content-Type: application/json" \
  -d '{"host":"192.168.69.246","port":8081,"db":"wellnesscoffee","username":"soporte@crossnexion.com","password":"Cross1983_"}'
# → {"success":true,"message":"Autenticación exitosa","uid":...}

# 4. Test desde frontend (provecchio.local)
curl -X POST https://provecchio.local/api/v1/integrations/odoo/test-connection \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"host":"192.168.69.246","port":8081,"db":"wellnesscoffee","username":"soporte@crossnexion.com","password":"Cross1983_"}'
```

---

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `docker-compose.yml` | `restart: unless-stopped` en todos los servicios |
| `docker-compose.yml` | `odoo_adapter`: ODOO_HOST, PORT, DB, USER, PASSWORD corregidos |
| `docker-compose.yml` | `odoo_adapter`: REDIS_HOST, PORT, PASSWORD, DB agregados |
| `docker-compose.yml` | `odoo_adapter`: `depends_on: redis` agregado |

---

## Regla General

> **Todo servicio que dependa de Redis/DB/Odoo debe tener:**
> 1. `restart: unless-stopped`
> 2. Variables de conexión correctas (IP real, no `host.docker.internal` para hosts externos)
> 3. `depends_on` con `condition: service_healthy` para servicios con healthcheck
> 4. Healthcheck propio

---

## Referencias

- AGENTS.md Regla #4: "Infraestructura Proxy Exclusive Traefik v3.4"
- AGENTS.md Regla #11: "Rebuild de Imágenes Docker (OBLIGATORIO): `docker compose up --build -d`"
- Relacionado: #175 (Traefik router), #176 (WebSocket), #177 (Gastro POS)
- Commit: v1.39.8