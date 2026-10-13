# Troubleshooting #84 — Fallo de Carga y Resolución de Tenant/Instancia en Catálogos Multi-Instancia (`/social-catalog/:instanceKey`)

## 📋 Síntoma
Al ingresar a una URL pública de catálogo multi-instancia (por ejemplo `https://pesallaccia.com/social-catalog/doterra`), la página no cargaba los datos del tenant `0bb60656b9fbfcc27e38ae444e9e376f` (Provecchio Di Mora / PROVECCHIO), ni su instancia de catálogo `doterra`.

## 🔍 Causa Raíz
1. **Acoplamiento de Slug de Ruta con Búsqueda de Tenant (`BrandingProvider.tsx`)**:
   `BrandingProvider` estaba extrayendo la palabra `doterra` del path URL `/social-catalog/doterra` y asignándola a `targetSubdomain = "doterra"`. Al intentar buscar un tenant con subdominio o ID `"doterra"` (el cual no existe, ya que el ID del tenant es `provecchio-dimora-001` con API Key `0bb60656b9fbfcc27e38ae444e9e376f`), `getTenantBySubdomain` fallaba y `BrandingProvider` no resolvía el tenant `0bb60656b9fbfcc27e38ae444e9e376f`.
2. **Asignación Errónea de `effectiveSubdomain = instanceKey` en `SocialCatalogPage` (`omni-catalog.tsx`)**:
   En el frontend, `omni-catalog.tsx` estaba sobreescribiendo el subdominio del tenant con la variable de ruta `instanceKey` (`effectiveSubdomain = instanceKey`), enviando `?subdomain=doterra` al backend en lugar de enviar la API key / subdominio del tenant (`0bb60656b9fbfcc27e38ae444e9e376f`).
3. **Ambivalencia entre Tenant e Instancia en `ApiKeyGuard` (`api-key.guard.ts`)**:
   En el backend, `ApiKeyGuard` confundía `query.instanceKey` con la búsqueda de tenant.

## 🛠️ Solución Aplicada
1. **Desacoplamiento de Slug en `BrandingProvider.tsx`**: Se removió la sobreescritura de `targetSubdomain` con slugs de ruta. El tenant se resuelve por el nombre de dominio principal (`pesallaccia.com` -> tenant `provecchio-dimora-001` / API key `0bb60656b9fbfcc27e38ae444e9e376f`) o subdominios reales de tenant (ej. `spa-wellness.pesallaccia.com`).
2. **Separación de Responsabilidades en `omni-catalog.tsx`**: `SocialCatalogPage` envía independientemente la API Key/Subdomain del tenant y el parámetro `instanceKey: "doterra"` al backend en `requestParams`.
3. **Delimitación en `ApiKeyGuard` (`api-key.guard.ts`)**: `ApiKeyGuard` procesa `subdomain`/`tenantId` para identificar al tenant `provecchio-dimora-001`, dejando que `instanceKey` se procese en `SocialCatalogPublicController` y `SocialCatalogService`.
4. Desplegado y verificado en producción en la versión **`v1.20.61`**.
