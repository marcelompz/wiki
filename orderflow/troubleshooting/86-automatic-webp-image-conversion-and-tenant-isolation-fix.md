# Troubleshooting #86 — Conversión Automática WebP Universal y Corrección de Aislamiento Multi-Tenant

## 📋 Síntomas

1. **Subida de Imágenes sin Conversión WebP**:
   Al subir imágenes desde `social-catalog/admin`, las imágenes se guardaban con extensión `.jpg` / `.png` (ejemplo: `tangerine_prod_full.jpg` y `lavanda_prod_full.jpg`).
2. **Filtrado de Categorías de Otros Tenants**:
   En el panel de administración de un tenant específico (o en la vista de instancias), aparecían categorías pertenecientes a otro tenant de la base de datos.
3. **Visibilidad Indeseada de Pills de Categoría y Conteos**:
   A pesar de deshabilitar la opción de filtro de categorías (`showCategoryFilter: false`) o conteo de productos (`showProductCounts: false`), las pills de navegación (`🌟 Todas (17)`, `🏷️ Categoría (17)`) continuaban mostrándose en el catálogo público.

---

## 🔍 Causas Raíz

1. **Paso por Alto de Conversión WebP en `ImageProcessingService`**:
   `ImageProcessingService` retenía la extensión original del archivo subido en lugar de forzar re-codificación WebP porque `sharp` había sido removido en revisiones previas por problemas con procesadores antiguos.
2. **Asignación Incompleta de `req.tenant` en `ApiKeyGuard` y Fallback Inseguro**:
   - Cuando las peticiones venían autenticadas por JWT (panel de administración), `ApiKeyGuard` validaba la sesión y seteaba `req.user`, pero **no asignaba `req.tenant`**.
   - Los controladores de `social-catalog-admin` leían `const tenant = (req as any)['tenant']`, resultando en `undefined.id` y fallando con HTTP 500.
   - Al fallar la llamada admin, la UI del frontend retrocedía a `/api/v1/public/social-catalog/categories/tree`.
   - En el endpoint público, `ApiKeyGuard` contenía una regla de fallback insegura (`if (!tenant) tenant = await prisma.tenant.findFirst({ where: { active: true } })`), lo que provocaba que **cualquier petición sin subdominio explícito devolviera los datos del primer tenant activo de la base de datos (Tenant 1)**, rompiendo el aislamiento multi-tenant.
3. **Falta de Validación de Flags en `omni-catalog.tsx`**:
   Las pills de navegación de la barra de categorías (`🌟 Todas`, `🏷️ Categoría`) no comprobaban el flag `showCategoryFilter` ni `showProductCounts`.

---

## 🛠️ Soluciones Aplicadas (`v1.20.76`)

1. **Integración Directa de `sharp` (v0.33.5) & Procesamiento WebP**:
   - Re-integración de `sharp` en `backend/package.json`.
   - Actualización de `ImageProcessingService` ([image-processing.service.ts](file:///opt/orderflow/backend/src/common/image-processing.service.ts)) para procesar imágenes entrantes a `.webp` (calidad 82), creando miniatura (`_thumb.webp`) y fallback.
   - Creación y ejecución exitosa del script de migración retroactiva ([convert-existing-images-to-webp.ts](file:///opt/orderflow/backend/scripts/convert-existing-images-to-webp.ts)), el cual **convirtió las 31 imágenes existentes en disco a `.webp` y actualizó 15 referencias en base de datos PostgreSQL**.

2. **Blindaje de Aislamiento Multi-Tenant**:
   - **`ApiKeyGuard` ([api-key.guard.ts](file:///opt/orderflow/backend/src/common/api-key.guard.ts))**:
     - Durante la verificación JWT, se consulta y asigna automáticamente `(request as any)['tenant'] = tenantObj` usando `decoded.tenantId` o `user.defaultTenantId`.
     - **Se eliminó por completo el fallback inseguro** `findFirst({ where: { active: true } })`.
   - **`SocialCatalogAdminController` ([social-catalog-admin.controller.ts](file:///opt/orderflow/backend/src/social-catalog/social-catalog-admin.controller.ts))**:
     - Se implementó el helper `getTenant(req)` que extrae defensivamente el tenant activo tanto de `req.tenant` como de `req.user.tenantId`, garantizando que ninguna llamada admin falle ni acceda a datos ajenos.
   - **`SocialCatalogPublicController` ([social-catalog.controller.ts](file:///opt/orderflow/backend/src/social-catalog/social-catalog.controller.ts))**:
     - Se aplicó resolución de `tenantId` defensiva en todos los endpoints públicos.

3. **Corrección de Visibilidad en Frontend ([omni-catalog.tsx](file:///opt/orderflow/frontend/src/pages/omni-catalog.tsx))**:
   - Se encerró el bloque de pills de navegación dentro del condicional `{showCategoryFilter && categories.length > 0 && (...)}`.
   - Se condicionó el conteo `(17)` a `{showProductCounts ? `(${products.length})` : ''}`.

4. **Resiliencia ante Hardware Legacy (Procesadores pre-AVX en `dimoraserver1`)**:
   - Servidores modernos como Hetzner (x86_64 con AVX) ejecutan `sharp` nativamente convirtiendo el 100% de las imágenes subidas a WebP.
   - En procesadores legados sin instrucciones AVX (como el AMD G-T56N en `dimoraserver1`), los binarios C de libvips emiten `SIGILL` (Illegal Instruction). Gracias a la arquitectura defensiva en `ImageProcessingService`, la excepción es capturada dinámicamente y el backend aplica el fallback seguro, almacenando el archivo sin interrumpir la operación ni provocar errores 500.
