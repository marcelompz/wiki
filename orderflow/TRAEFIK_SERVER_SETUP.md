# Guía de configuración de Traefik en servidor

> Esta guía documenta la configuración del stack Traefik en el servidor (`/srv/traefik/`) para que convivan producción y staging de OrderFlow, Axon y Aieer en un solo Traefik.

## 1. Estructura esperada en `/srv/traefik/`

```
/srv/traefik/
├── traefik.yml
├── dynamic/
│   └── services.yml
├── acme.json
└── .env
```

- **`traefik.yml`**: configuración estática (entrypoints, providers, ACME).
- **`dynamic/services.yml`**: routers y servicios de cada ecosistema.
- **`acme.json`**: certificados Let's Encrypt (permisos `600`).
- **`.env`**: variables de entorno (`ACME_EMAIL`, `CF_DNS_API_TOKEN`, etc.).

## 2. Configuración estática (`traefik.yml`)

```yaml
global:
  checkNewVersion: false
  sendAnonymousUsage: false

api:
  dashboard: true
  insecure: true

log:
  level: INFO

entryPoints:
  traefik:
    address: ":8080"
  web:
    address: ":80"
  websecure:
    address: ":443"

providers:
  file:
    directory: /etc/traefik/dynamic
    watch: true

certificatesResolvers:
  letsencrypt:
    acme:
      email: "admin@pesallaccia.com"
      storage: /letsencrypt/acme.json
      caServer: "https://acme-staging-v02.api.letsencrypt.org/directory"
      dnsChallenge:
        provider: cloudflare
        resolvers:
          - "1.1.1.1:53"
```

**Notas:**
- El provider **docker** no se usa en el servidor; todo se define en `services.yml`.
- `acme.json` debe tener permisos `600`.
- Si querés pasar a producción de LE, cambiá `caServer` a `https://acme-v02.api.letsencrypt.org/directory`.

## 3. Configuración dinámica (`dynamic/services.yml`)

### 3.1 Reglas de routers

Cada router se define dos veces: uno para `websecure` (HTTPS) y otro para `web` (HTTP). Ambos apuntan al mismo servicio.

```yaml
http:
  routers:
    # ===================== AXON PROD =====================
    axon-prod:
      rule: "Host(`axon.pesallaccia.com`)"
      entryPoints: [web, websecure]
      tls:
        certResolver: letsencrypt
      service: axon-prod
      middlewares: [secure-headers]

    # ===================== AXON STAGING =====================
    axon-staging:
      rule: "Host(`staging.axon.pesallaccia.com`)"
      entryPoints: [web, websecure]
      tls:
        certResolver: letsencrypt
      service: axon-staging
      middlewares: [secure-headers]

    # ===================== ORDERFLOW PROD =====================
    orderflow-prod:
      rule: "Host(`orderflow.pesallaccia.com`, `provecchio.com`)"
      entryPoints: [web, websecure]
      tls:
        certResolver: letsencrypt
      service: orderflow-prod-frontend
      middlewares: [secure-headers]

    orderflow-prod-api:
      rule: "Host(`orderflow.pesallaccia.com`, `provecchio.com`) && PathPrefix(`/api`)"
      entryPoints: [web, websecure]
      tls:
        certResolver: letsencrypt
      service: orderflow-prod-backend

    orderflow-prod-webhook:
      rule: "Host(`orderflow.pesallaccia.com`, `provecchio.com`) && PathPrefix(`/webhook`)"
      entryPoints: [web, websecure]
      tls:
        certResolver: letsencrypt
      service: orderflow-prod-odoo

    # ===================== ORDERFLOW STAGING =====================
    orderflow-staging:
      rule: "Host(`staging.pesallaccia.com`)"
      entryPoints: [web, websecure]
      tls:
        certResolver: letsencrypt
      service: orderflow-staging-frontend
      middlewares: [secure-headers]

    # ===================== AIER STAGING =====================
    aieer-staging:
      rule: "Host(`staging.aieer.pesallaccia.com`)"
      entryPoints: [web, websecure]
      tls:
        certResolver: letsencrypt
      service: aieer-staging-frontend
      middlewares: [secure-headers]

    aieer-staging-api:
      rule: "Host(`staging.aieer.pesallaccia.com`) && PathPrefix(`/api`)"
      entryPoints: [web, websecure]
      tls:
        certResolver: letsencrypt
      service: aieer-staging-backend

  services:
    # ===================== AXON =====================
    axon-prod:
      loadBalancer:
        servers:
          - url: "http://axon-production-workspace-1:3005"
    axon-staging:
      loadBalancer:
        servers:
          - url: "http://axon-staging-workspace-1:3005"

    # ===================== ORDERFLOW PROD =====================
    orderflow-prod-frontend:
      loadBalancer:
        servers:
          - url: "http://orderflow-frontend-prod:80"
    orderflow-prod-backend:
      loadBalancer:
        servers:
          - url: "http://orderflow-backend-prod:3010"
    orderflow-prod-odoo:
      loadBalancer:
        servers:
          - url: "http://orderflow-odoo-adapter-prod:3005"

    # ===================== ORDERFLOW STAGING =====================
    orderflow-staging-frontend:
      loadBalancer:
        servers:
          - url: "http://orderflow_frontend:80"

    # ===================== AIER STAGING =====================
    aieer-staging-frontend:
      loadBalancer:
        servers:
          - url: "http://staging_frontend:80"
    aieer-staging-backend:
      loadBalancer:
        servers:
          - url: "http://staging_backend:8000"
```

**Notas importantes:**
- Los nombres de servicio (`axon-prod`, `orderflow-prod-frontend`, etc.) deben coincidir exactamente con los nombres de contenedor en `traefik-public`.
- Los contenedores deben estar conectados a la red `traefik-public`.
- El campo `url` debe apuntar al puerto interno del contenedor, no al publicado.

## 4. Middlewares (`dynamic/headers.yml`)

```yaml
http:
  middlewares:
    secure-headers:
      headers:
        frameDeny: true
        contentTypeNosniff: true
        stsSeconds: 63072000
        stsIncludeSubdomains: true
        stsPreload: true
        contentSecurityPolicy: >-
          default-src 'self';
          script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com;
          style-src 'self' 'unsafe-inline';
          img-src 'self' data: https:;
          font-src 'self' data: https://fonts.gstatic.com;
          connect-src 'self' https://cloudflareinsights.com https://*.cloudflareinsights.com;
          frame-ancestors 'self';
          base-uri 'self';
          form-action 'self'
```

**Nota:** No uses `secure-headers-cloudflare` en staging a menos que el backend envíe su propio CSP.

## 5. Despliegue en el servidor

### 5.1 Levantar Traefik

```bash
cd /srv/traefik
docker compose up -d
```

### 5.2 Verificar que Traefik cargó los routers

```bash
curl -s http://localhost:8080/api/http/routers | python3 -m json.tool | grep -E "axon|orderflow|aieer|name" | head -30
```

Deberías ver los routers `axon-prod`, `axon-staging`, `orderflow-prod`, etc.

### 5.3 Verificar contenedores en `traefik-public`

```bash
docker network inspect traefik-public --format '{{range .Containers}}{{.Name}} {{end}}'
```

Todos los contenedores que aparecen en `services.yml` deben estar en esta lista.

### 5.4 Probar endpoints

```bash
# Producción
curl -I https://axon.pesallaccia.com
curl -I https://orderflow.pesallaccia.com
curl -I https://api.pesallaccia.com/api/v1/health

# Staging
curl -I https://staging.axon.pesallaccia.com
curl -I https://staging.pesallaccia.com
curl -I https://staging.aieer.pesallaccia.com
```

Si todo responde `200` (o `301/302` para HTTPS), Traefik está enrutando correctamente.

## 6. Troubleshooting común

### 6.1 Error de sintaxis YAML en `services.yml`

```bash
python3 -c "import yaml; yaml.safe_load(open('/srv/traefik/dynamic/services.yml'))" && echo "YAML OK" || echo "YAML ERROR"
```

Errores comunes:
- Indentación incorrecta (usar 2 espacios, no tabs)
- Faltan dos puntos `:` después de claves
- Servicios duplicados con nombres distintos

### 6.2 Router no aparece en Traefik

```bash
# Ver logs de Traefik
docker logs traefik --tail 100 2>&1 | grep -E "error|ERR|file|provider"
```

Posibles causas:
- Error de sintaxis en `services.yml`
- Falta el archivo `headers.yml` o tiene errores
- El servicio apunta a un contenedor que no existe en `traefik-public`

### 6.3 502 Bad Gateway

Significa que Traefik encontró el router, pero el contenedor destino no responde.

```bash
# Verificar que el contenedor esté corriendo
docker ps --filter "name=orderflow-backend-prod" --format "{{.Names}}\t{{.Status}}"

# Verificar que esté en traefik-public
docker network inspect traefik-public --format '{{range .Containers}}{{.Name}} {{end}}' | grep orderflow-backend-prod
```

Si no está en `traefik-public`, conectarlo:
```bash
docker network connect traefik-public orderflow-backend-prod
```

### 6.4 404 Not Found

Significa que Traefik no encontró un router para ese `Host`.

```bash
# Ver routers cargados
curl -s http://localhost:8080/api/http/routers | python3 -m json.tool | grep -E "orderflow|axon|aieer"
```

Si no aparece el router, verificar:
- El archivo `services.yml` tiene la sección `http: routers:` correctamente definida
- No hay errores de sintaxis YAML
- Traefik recargó la configuración (`docker exec traefik kill -HUP 1`)

### 6.5 Certificados SSL no se emiten

```bash
# Ver logs de ACME
docker logs traefik --tail 100 2>&1 | grep -E "ACME|certificate|resolver"
```

Posibles causas:
- Falta `CF_DNS_API_TOKEN` en `.env`
- `acme.json` tiene permisos incorrectos (`chmod 600`)
- El dominio no apunta a la IP del servidor (verificar DNS)

## 7. Agregar un nuevo servicio

Para agregar un nuevo ecosistema (ej: `nuevo.pesallaccia.com`):

1. Asegurarse de que el contenedor esté corriendo y conectado a `traefik-public`
2. Agregar el router en `services.yml`:

```yaml
    nuevo:
      rule: "Host(`nuevo.pesallaccia.com`)"
      entryPoints: [web, websecure]
      tls:
        certResolver: letsencrypt
      service: nuevo
      middlewares: [secure-headers]
```

3. Agregar el servicio:

```yaml
    nuevo:
      loadBalancer:
        servers:
          - url: "http://nombre-contenedor:puerto"
```

4. Recargar Traefik:

```bash
docker exec traefik kill -HUP 1
```

5. Verificar:

```bash
curl -I https://nuevo.pesallaccia.com
```

## 8. Referencias

- Configuración estática: `/srv/traefik/traefik.yml`
- Configuración dinámica: `/srv/traefik/dynamic/services.yml`
- Middlewares: `/srv/traefik/dynamic/headers.yml`
- Dashboard: `http://<IP_SERVIDOR>:8080`
- API: `http://<IP_SERVIDOR>:8080/api`
