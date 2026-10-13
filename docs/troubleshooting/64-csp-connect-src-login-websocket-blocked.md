# Troubleshooting #64: Content-Security-Policy (connect-src) Bloqueando Inicio de Sesión o Conexiones API/WebSockets

## Síntomas
Al intentar iniciar sesión o conectar con la API / WebSockets desde el frontend (o desde entornos locales/desarrollo/red local `http://localhost:3010`), la consola del navegador reporta el siguiente error:

```text
Content-Security-Policy: La configuración de la página bloqueó la carga de un recurso (connect-src) en http://localhost:3010/api/v1/auth/login porque viola la siguiente directiva: “connect-src 'self' https://cloudflareinsights.com https://*.cloudflareinsights.com”
```

## Causa Raíz
1. La directiva `connect-src` en las cabeceras HTTP de seguridad administradas por Traefik (`/opt/traefik-orderflow/dynamic/headers.yml`) estaba restringida únicamente a `'self'` y dominios de Cloudflare Insights, bloqueando peticiones HTTP/HTTPS externas, entornos de desarrollo locales (`http://localhost:3010`), IP locales de red (`http://192.168.69.x`) y WebSockets (`ws:` / `wss:`).
2. El cliente de API en el frontend (`frontend/src/services/api.ts`) poseía un fallback estático a `http://localhost:3010` cuando `VITE_API_URL` venía vacío en builds de producción, lo que provocaba que al cargar en un dominio de producción (ej. `provecchio.com`) intentara hacer llamadas a `http://localhost:3010/api/v1/...`.

## Solución Aplicada
1. **Actualización de Cabeceras Traefik (CSP):**
   Se actualizó la directiva `connect-src` en los middlewares `secure-headers` y `secure-headers-cloudflare` en `/opt/traefik-orderflow/dynamic/headers.yml`:

```yaml
connect-src 'self' http: https: ws: wss: https://cloudflareinsights.com https://*.cloudflareinsights.com;
```

2. **Resolución Dinámica de URL Base de API:**
   Se implementó `getApiBaseUrl()` y `getApiV1Url()` en `frontend/src/services/api.ts` para resolver dinámicamente el origen de la ventana (`window.location.origin`) si `VITE_API_URL` no está definida, previniendo el fallback a `http://localhost:3010` en producción. Se actualizó su uso en `login.tsx`, `useMultiTenant.ts` y `AdminApp.tsx`.

3. **Sincronización & Despliegue:**
   - Se commiteó y pusheó `/opt/traefik-orderflow` a GitHub (`origin/main`) y se sincronizó hacia los servidores remotos Hetzner (`hetzner-orderflow:/srv/traefik/dynamic/headers.yml`) y Provecchio (`/srv/traefik/dynamic/headers.yml`).
   - Traefik recargó automáticamente la configuración dinámica en caliente sin caída de servicio.

