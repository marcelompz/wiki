# 🛠️ Troubleshooting 100 — Fallos de Resolución Pública en OmniBio y Enrutamiento de URLs en Generador de QR

## 📋 Información General
- **ID:** `100`
- **Fecha:** 2026-09-05
- **Área:** Backend / Frontend / OmniBio / QR Generator
- **Módulos Afectados:** `BioLinksModule` (`biolinks.controller.ts`, `biolinks.service.ts`), `QrModule` (`qr.controller.ts`, `qr.service.ts`), `PublicBioLinkPage` (`public-biolink.tsx`)
- **Estado:** ✅ Resuelto en `v1.25.04`

---

## 🔍 Síntoma 1: OmniBio Público Muestra "OmniBio No Encontrado - Missing user or tenant context"
Al seleccionar **OmniBio** como la portada activa del tenant en el diseñador web (`homepage-builder`), al acceder a `https://<tenant-domain>.com` el sitio fallaba con un error de permisos `403 Forbidden` (`Missing user or tenant context`) y la pantalla mostraba *"OmniBio No Encontrado"*.

### Causa Raíz
El componente frontend `<PublicBioLinkPage />` intentaba resolver la configuración llamando a `/api/v1/bio/config`. Este endpoint estaba protegido por `ApiKeyGuard` y `PermissionsGuard` (`biolinks:read`), el cual exige tokens `x-api-key` o `Authorization: Bearer` de administrador. Al acceder un visitante público, el backend rechazaba la llamada.

### Solución Aplicada
1. **Nuevo Endpoint Público por Tenant ID (`GET /api/v1/bio/tenant/:tenantId`):**
   - Agregado en `biolinks.controller.ts` y `biolinks.service.ts`. Permite resolver la configuración del BioLink del tenant en modo público sin autenticación administrativa.
   - Si el tenant aún no creó bloques de BioLink, devuelve un fallback seguro con los datos públicos del tenant.
2. **Actualización Frontend (`public-biolink.tsx`):**
   - Integrado con `useTenantConfig()` para resolver por `tenantConfig.id` cuando no existe el parámetro de ruta `:slug`.

---

## 🔍 Síntoma 2: El Generador de QR no Guarda Historial y Genera URLs de BioLink como `/social-catalog/`
1. Al intentar guardar un QR generado en `/admin/qr-generator` o `/admin/social-catalog`, la llamada a `/api/v1/qr/preview` fallaba o el registro no aparecía en la tabla de historial.
2. Al seleccionar el tipo de QR **Biolink (OmniBio)** con un slug (ej: `wellness`), la URL del QR generado apuntaba a `https://<domain>/social-catalog` en lugar de `https://<domain>/bio/wellness`.

### Causa Raíz
1. **Ruta `preview` faltante:** `QrGeneratorModal.tsx` enviaba previsualizaciones a `/api/v1/qr/preview` (endpoint inexistente en el backend), mientras que las llamadas con `saveToHistory: true` requerían el endpoint `POST /api/v1/qr/generate`.
2. **Sobrescritura de URL base:** En `qr.controller.ts`, cuando el DTO era de tipo `biolink` o `catalog`, la variable `publicCatalogUrl` se forzaba siempre como `https://<host>/social-catalog`, ignorando la ruta `/bio/:slug`.

### Solución Aplicada
1. **Endpoint `POST /api/v1/qr/preview` en `qr.controller.ts`:**
   - Agregado para soportar solicitudes de previsualización sin registrar entradas forzadas en la tabla de historial.
2. **Corrección de la Construcción de URLs (`qr.controller.ts` y `qr.service.ts`):**
   - Se reemplazó `publicCatalogUrl` por `publicBaseUrl` (`https://<requestHost>`).
   - Se actualizó el `switch (dto.type)` en `qr.service.ts`:
     - `QrType.BIOLINK`: Construye `${baseUrl}/bio/${dto.biolinkSlug}`.
     - `QrType.CATALOG`: Construye `${baseUrl}/social-catalog` (o con `instanceKey`).
3. **Persistencia en Historial:**
   - Confirmada la llamada a `/api/v1/qr/generate` cuando `saveToHistory: true`, almacenando la entrada con su DTO e imagen en `QrCodeHistory`.

---

## 🧪 Verificación Post-Deploy
- **OmniBio Público:** Verificado con `curl` y Playwright E2E en `https://provecchio.com` y `https://pesallaccia.com`, respondiendo HTTP 200 OK y renderizando la Bio pública.
- **Generador de QR:** Generados QRs de tipo BioLink y Catálogo. Las URLs resultantes ahora son `https://<domain>/bio/<slug>` y los registros aparecen guardados correctamente en la tabla de historial de `/admin/qr-generator`.
