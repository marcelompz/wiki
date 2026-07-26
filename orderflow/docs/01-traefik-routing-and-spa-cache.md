# 🛠️ Registro de Errores Comunes y Resolución: Traefik Routing & SPA Caching

**Fecha:** 2026-07-17  
**Módulo / Área:** DevOps / Frontend / Traefik  
**Severidad:** Media (Ruta inaccesible en navegadores por colisión de routers y caché de assets)  
**Estado:** ✅ **RESUELTO**  

---

## 1. Descripción del Problema

Al intentar acceder a la ruta `https://orderflow.pesallaccia.com/login` desde un navegador (ej. Chrome o Firefox sin sesión previa), la URL cambiaba a `/login` pero la interfaz seguía mostrando la página de inicio (`OrderFlowLandingPage`), sin renderizar el formulario de credenciales.

En la consola del navegador se registraron los siguientes mensajes:
```text
[BrandingProvider] Usando API Key de demo (no guardada en localStorage): 0bb60656b9fbfcc27e38ae444e9e376f
index-DwbzVGGK.js:612 [API Interceptor] No credentials found!
Error: An unexpected error occurred spoofer.js:1:38935
GET https://orderflow.pesallaccia.com/api/v1/public/products [HTTP/3 401]
GET https://orderflow.pesallaccia.com/assets/index-DwbzVGGK.js [HTTP/1.1 200]
```

---

## 2. Análisis Técnico y Causa Raíz

Se identificaron **dos causas primarias** interrelacionadas:

### Causa 1: Colisión de Reglas en Traefik (`dynamic/services.yml`)
En la configuración dinámica de Traefik (`/opt/traefik-orderflow/dynamic/services.yml`), la regla wildcard para subdominios de tenants:
```yaml
tenant-storefront:
  rule: "HostRegexp(`{subdomain:.+}.pesallaccia.com`)"
```
No tenía especificada una **prioridad explícita (`priority`)**. Dado que el dominio principal del sistema es `orderflow.pesallaccia.com`, la palabra `orderflow` evaluaba como un subdominio válido en el motor de expresiones regulares, derivando tráfico hacia el servicio genérico de storefront de tenants.

### Causa 2: Fallback de SPA en Assets Inexistentes (`serve`)
Al actualizar y compilar una nueva versión de la SPA de React con Vite, los nombres de los archivos estáticos generados cambian por su hash de contenido (ej. `index-BbJ01scU.js` o `index-Bw8iOdIR.js`). 
Cuando un navegador con un `index.html` previo en caché solicitaba el bundle antiguo `index-DwbzVGGK.js` (ya inexistente en el servidor), el servidor estático Node.js (`serve -s`) aplicaba la regla de reescritura SPA por defecto y devolvía el contenido de `index.html` con tipo `text/html`. Al intentar ejecutar HTML como JavaScript, la consola del navegador lanzaba el error sintáctico `SyntaxError / Unexpected error`.

---

## 3. Solución Aplicada

### 3.1 Priorización de Routers en Traefik
Se agregaron prioridades explícitas (`priority`) a los routers de producción en `/opt/traefik-orderflow/dynamic/services.yml` para garantizar que los dominios del sistema tengan precedencia sobre la regla wildcard de tenants:

```yaml
orderflow-prod:
  rule: "Host(`orderflow.pesallaccia.com`) || Host(`pesallaccia.com`)"
  priority: 100
  entryPoints: [websecure]
  tls:
    certResolver: letsencrypt
  service: orderflow-prod-frontend

orderflow-prod-api:
  rule: "(Host(`orderflow.pesallaccia.com`) || Host(`pesallaccia.com`)) && PathPrefix(`/api`)"
  priority: 110
  entryPoints: [websecure]
  tls:
    certResolver: letsencrypt
  service: orderflow-prod-backend
```

### 3.2 Configuración Estricta de SPA y No-Cache (`frontend/serve.json`)
Se creó el archivo de configuración `frontend/serve.json` en el contenedor del frontend:
* Se configuró el enrutamiento SPA reescribiendo rutas de la aplicación a `/index.html`.
* Se estableció que las solicitudes a `/assets/**` no hagan fallback a `index.html` para retornar un verdadero `HTTP 404` si un archivo estático antiguo ya no existe en el disco.
* Se inyectaron cabeceras HTTP estrictas para que `index.html` nunca sea almacenado en caché:

```json
{
  "public": "dist",
  "rewrites": [
    { "source": "assets/**", "destination": "/assets/$1" },
    { "source": "**", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "index.html",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" },
        { "key": "Pragma", "value": "no-cache" },
        { "key": "Expires", "value": "0" }
      ]
    }
  ]
}
```

### 3.3 Nombre Estático de Contenedores Docker (`docker-compose.prod.yml`)
Se fijó `container_name: orderflow-frontend-prod` y `container_name: orderflow-backend-prod` en `docker-compose.prod.yml` para asegurar la resolución DNS interna entre los contenedores de la red `traefik-public`.

---

## 4. Verificación y Prevención Futura

1. **Verificación:** Al acceder a `https://orderflow.pesallaccia.com/login`, Traefik redirige al contenedor `orderflow-frontend-prod` sirviendo el nuevo bundle SPA sin caché vieja, desplegando el formulario de credenciales.
2. **Prevención:**
   * Al agregar nuevos subdominios o servicios a Traefik en `services.yml`, asignar siempre la propiedad `priority` a los routers de producción.
   * Mantener la regla `no-cache` en `serve.json` para garantizar despliegues continuos sin fricción por caché de navegador.

---

**Firma:** Antigravity AI Engineering Team  
**Archivo:** `docs/troubleshooting/01-traefik-routing-and-spa-cache.md`
