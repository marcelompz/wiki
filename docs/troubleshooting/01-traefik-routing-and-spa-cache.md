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

## 5. Catálogo WhatsApp Vacío en Subdominio Alias (`/whatsapp-catalog`)

**Fecha:** 2026-07-27  
**Módulo / Área:** Frontend / Catálogo Unificado  
**Severidad:** Alta (Página pública de catálogo sin productos para tenants resueltos por subdominio alias)  
**Estado:** ✅ **RESUELTO**  

### 🚨 Síntoma / Problema

Al acceder a `https://wellness.pesallaccia.com/whatsapp-catalog` (o cualquier alias como `spa-wellness`), la página carga correctamente el branding del tenant, pero **no muestra productos**. El mensaje visible es: *"No se encontraron productos en esta categoría o búsqueda"*. El backend responde correctamente con productos si se consulta manualmente con `subdomain=wellness`.

### 🔬 Causa Raíz

Dos problemas combinados en el frontend:

1. **Consulta con API key incorrecta en `whatsapp-catalog.tsx`:**
   - La página `/whatsapp-catalog` arma la llamada al catálogo unificado usando `apiKey` y como fallback tiene hardcodeada la clave de **Provecchio Di Mora** (`0bb60656b9fbfcc27e38ae444e9e376f`).
   - Cuando `BrandingProvider` resuelve el tenant por subdominio (`wellness`), `tenantConfig` no trae `apiKeySecret`, así que la página caía a esa API key hardcodeada, consultando productos de otro tenant.

2. **El endpoint soporta `subdomain`, pero el frontend no lo usaba:**
   - El backend ya soporta `GET /api/v1/public/catalog/products?subdomain=wellness` y responde correctamente.
   - La página `/catalogo` (`catalog-with-categories.tsx`) ya usaba `subdomain`, pero `/whatsapp-catalog` no.

3. **El endpoint público de tenant no exponía `subdomain`:**
   - `GET /api/v1/tenants/public/tenant-by-subdomain/:subdomain` no devolvía el campo `subdomain` en la respuesta, impidiendo que el frontend lo reutilizara sin hardcodear alias.

### 🛠️ Solución Aplicada

1. **Frontend (`frontend/src/pages/whatsapp-catalog.tsx`):**
   - Se eliminó la API key hardcodeada de Provecchio.
   - Ahora prioriza `subdomain` cuando `tenantConfig` fue resuelto por subdominio Traefik.
   - Solo usa `apiKey` como fallback cuando no hay subdominio disponible.
   - Si faltan ambos parámetros, aborta la carga y muestra un error controlado en consola.

2. **Backend (`backend/src/tenants/tenants.controller.ts`):**
   - Se agregó `subdomain: true` al `select` del endpoint público `tenant-by-subdomain`.
   - Se expone `subdomain: tenant.subdomain` en la respuesta pública del tenant para que el frontend lo pueda reutilizar.

### Verificación

```bash
# Confirmar que el endpoint responde productos para wellness por subdominio
curl -s "https://wellness.pesallaccia.com/api/v1/public/catalog/products?subdomain=wellness" | head -c 200

# Confirmar tenant resuelto por subdominio wellness
curl -s "https://wellness.pesallaccia.com/api/v1/tenants/public/tenant-by-subdomain/wellness" | jq '.subdomain'
```

### Prevención

- Nunca hardcodear API keys de tenants específicos como fallback en páginas públicas.
- Al agregar un nuevo endpoint público de catálogo, verificar que acepte tanto `apiKey` como `subdomain`.
- Cuando un tenant se resuelve por subdominio, usar ese identificador para consultas públicas; el `apiKeySecret` solo debe usarse en endpoints autenticados.

---

**Firma:** Antigravity AI Engineering Team  
**Archivo:** `docs/troubleshooting/01-traefik-routing-and-spa-cache.md`