# Troubleshooting: Fuga de Datos entre Tenants y Fallo de Resolución de Subdominio en pesallaccia.com

## Síntomas
- Al acceder a `pesallaccia.com/social-catalog/provecchio` o al cambiar nombres de categorías en Provecchio ("Para comer", "Para beber"), las categorías desaparecían o mostraban productos y categorías de otro tenant (`gaia-wellness-001` / Doterra).
- En `pesallaccia.com`, la navegación pública no aplicaba correctamente el subdominio o parámetro de instancia (`instanceKey`).

## Causa Raíz
1. **Interceptor HTTP Frontend (`api.ts`)**: Inyectaba incondicionalmente `localStorage.getItem('apiKey')` a la cabecera `x-api-key` de todas las peticiones (incluyendo catálogos públicos). Si en `localStorage` había una API Key guardada de otro tenant (`067059e2...`), se enviaba en peticiones públicas.
2. **Prioridad en `ApiKeyGuard.ts`**: El guardián backend evaluaba la presencia de `x-api-key` **antes** de la resolución por subdominio/host. Al encontrar la API Key de Doterra/Gaia Spa, forzaba el tenant a `gaia-wellness-001`, ignorando `provecchio.com` o `provecchio`.
3. **Parsing de Subdominio para Dominio Raíz (`omni-catalog.tsx`)**: Al navegar en `pesallaccia.com`, `hostname.includes('.pesallaccia.com')` evaluaba a `false`, asignando `urlSubdomain = "pesallaccia.com"`. Como no existe tenant con subdominio `"pesallaccia.com"`, la búsqueda por `instanceKey` quedaba bloqueada.

## Solución Aplicada
1. **Prioridad en `ApiKeyGuard.ts`**: Se reordenó la resolución de tenant para priorizar subdominios (`subdomain`, `customDomain`, `querySubdomain`) e `instanceKey` sobre la cabecera `x-api-key`, e ignorar nombres de dominio raíz (`pesallaccia.com`, `pesallaccia`, `www`).
2. **Subdominio de Fallback en `omni-catalog.tsx`**: Se corrigió el parsing de hostnames con subdominio y se usó `instanceKey` como fallback de subdominio cuando se navega en el dominio raíz (`pesallaccia.com/social-catalog/provecchio`).
3. **Omisión de API Key Stale en Rutas Públicas (`api.ts`)**: Se evitó adjuntar automáticamente `x-api-key` de `localStorage` en peticiones públicas (`/api/v1/public/`, `/social-catalog`, `/tienda`, `/bio`).
