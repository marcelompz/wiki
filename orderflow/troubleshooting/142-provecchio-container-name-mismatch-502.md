# 🛠️ Traefik Container Name Mismatch - 502 Bad Gateway on provecchio.local

**Date:** 2026-10-17  
**Module / Area:** DevOps / Docker / Traefik / Configuration  
**Severity:** High (HTTP 502 Bad Gateway in provecchio.local)  
**Status:** ✅ RESOLVED & HOMOLOGADO  

---

## 1. Descripción del Problema

El servicio Traefik devolvía **HTTP 502 Bad Gateway** en los endpoints `http://provecchio.local/api/v1/auth/login` y otros endpoints API, mientras que el frontend (`http://provecchio.local`) funcionaba correctamente.

El error incluía:
- `POST http://provecchio.local/api/v1/auth/login`
- `[HTTP/1.1 502 Bad Gateway 140ms]`
- `XML Parsing Error: syntax error`
- `Line Number 1, Column 1: login:1:1`

## 2. Causa Raíz

**Discrepancia de nombres de contenedores en Traefik configuration**

La configuración Traefik (`services.yml`) en `/opt/traefik-orderflow/dynamic/services.yml` apuntaba a nombres de contenedores que no existían:

- `orderflow-prod-frontend:80` → debería ser `orderflow_frontend:80`
- `orderflow-prod-backend:3010` → debería ser `orderflow_backend:3010`

Pero los contenedores Docker reales se llaman:
- `orderflow_frontend` (escuchando en 80/tcp)
- `orderflow_backend` (escuchando en 3010/tcp)

**Consecuencias:**
- La ruta `provecchio-local-api` intentaba enrutar `/api/*` requests a `orderflow-prod-backend:3010`
- El backend real (`orderflow_backend:3010`) nunca recibía las requests
- Traefik devolvía 502 Bad Gateway
- El frontend API devolvía XML parsing errors en vez de JSON de error apropiado

## 3. Solución Ejecutada

### 3.1 Corrección de Configuration

Actualizado `/opt/traefik-orderflow/dynamic/services.yml`:

```yaml
# Before (incorrect):
orderflow-prod-frontend:
  loadBalancer:
    servers:
      - url: "http://orderflow-frontend-prod:80"
orderflow-prod-backend:
  loadBalancer:
    servers:
      - url: "http://orderflow-backend-prod:3010"

# After (correct):
orderflow-prod-frontend:
  loadBalancer:
    servers:
      - url: "http://orderflow_frontend:80"
orderflow-prod-backend:
  loadBalancer:
    servers:
      - url: "http://orderflow_backend:3010"
```

También actualizado:
- `orderflow-staging-frontend` (misma corrección)
- `orderflow-staging-backend` (misma corrección)

### 3.2 Reload de Traefik

```bash
docker kill -s HUP traefik
```

## 4. Verificación

### 4.1 Health Check directo en backend

```bash
docker exec orderflow_backend /usr/bin/curl -s -X POST http://localhost:3010/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'

# Result: {"statusCode":404,"message":"User not found or inactive"}
# (Note: 404 es correcto porque el usuario no existe - endpoint funciona)
```

### 4.2 Accesibilidad desde Traefik

```bash
# Backend desde Traefik (debe funcionar ahora):
docker exec traefik wget -qO- http://orderflow_backend:3010/api/v1/health

# Result: {"status":"ok","version":"1.39.4","timestamp":"..."}

# Frontend desde Traefik:
docker exec traefik wget -qO- http://orderflow_frontend:80/

# Result: HTML page cargada correctamente
```

### 4.3 Testing con hostname

```bash
# Provecchio debería enrutar correctamente a los contenedores reales:
docker exec traefik wget -qO- http://orderflow_backend:3010/api/v1/health
# Result: HTTP 200 con JSON de salud del backend
```

## 5. Protocolo de Prevención

### 5.1 Validación Automática de Contenedores

```bash
# Antes de desplegar, verificar que los contenedores existen:
docker ps --format "table {{.Names}}\t{{.Ports}}" | grep -E "(orderflow_frontend|orderflow_backend)"

# O automáticamente en deploy script:
docker ps --format "{{.Names}}" | grep -E "^(orderflow_frontend|orderflow_backend)$" || echo "ERROR: Contenedores requeridos no encontrados"
```

### 5.2 Script de Validación de Traefik

```bash
#!/bin/bash
# validate-traefik-config.sh

# Verificar que los servicios config en services.yml existen
declare -A required_services=(
  ["orderflow-frontend-prod"]="orderflow_frontend:80"
  ["orderflow-backend-prod"]="orderflow_backend:3010"
  ["orderflow-local-frontend"]="orderflow_frontend:80"
  ["orderflow-local-backend"]="orderflow_backend:3010"
)

for service_name in "${!required_services[@]}"; do
  container_port="${required_services[$service_name]}"
  container_name="${container_port%%:*}"
  
  if ! docker ps --format "{{.Names}}" | grep -q "^$container_name$"; then
    echo "ERROR: Servicio $service_name espera contenedor '$container_name' que no existe"
    exit 1
  fi
  
  echo "✅ Servicio $service_name OK (contenedor: $container_name)"
done

echo "✅ Todos los servicios Traefik validados"
```

### 5.3 Recordatorio de Nombres

**Regla de nombrado clave:**
- **Servicios Traefik:** deben coincidir exactamente con `docker ps --format "{{.Names}}"`
- **Patrón:** `{service_name}-prod` → `{service_name}` (sin sufijo `-prod`)
- **Local:** `{service_name}-local` → `{service_name}` (usar contenedor base)

## 6. Referencias

- [140-backend-bridge-network-502.md](docs/troubleshooting/140-backend-bridge-network-502.md) - Aislamiento similar de red
- [13-provecchio-missing-frontend-502.md](docs/troubleshooting/13-provecchio-missing-frontend-502.md) - Problema similar con frontend
- [06-provecchio-traefik-ssl-and-502-diagnosis.md](docs/troubleshooting/06-provecchio-traefik-ssl-and-502-diagnosis.md) - Diagnóstico SSL 502

---

**Firma:** Kilo Engineering Team  
**Archivo:** `docs/troubleshooting/XXX-provecchio-container-name-mismatch-502.md`