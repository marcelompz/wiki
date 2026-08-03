# 🛠️ Registro de Errores Comunes: Guardias de Tipos en Frontend, Resolución por Subdominio y Gestión de Módulos Instanciados

**Fecha:** 2026-07-30  
**Módulo / Área:** Frontend (Vite/React) / WhatsApp Catalog / AdminApp Layout / Multi-Tenant Subdomain Routing  
**Severidad:** Alta (Excepciones de JavaScript `TypeError: l.some is not a function` y `TypeError: F.forEach is not a function` en producción)  
**Estado:** ✅ **RESUELTO, VERIFICADO Y DESPLEGADO**  

---

## 1. Descripción de los Problemas

1. **`TypeError: l.some is not a function` en Panel Admin (`AdminApp.tsx`)**:
   - Al iniciar sesión o cambiar a un tenant específico (`wellness`), la interfaz rompía completamente con una pantalla blanca en el panel administrativo.
2. **`TypeError: F.forEach is not a function` en Catálogo Legado (`catalog-with-categories.tsx`)**:
   - Al consultar el catálogo público desde ciertas vistas previas, la pantalla arrojaba una excepción por intentar iterar sobre objetos no arreglos.
3. **Resoluciónde Banner, Logo y Fondo de Categorías (`whatsapp-catalog.tsx`)**:
   - La cabecera pública ignoraba los valores subidos desde el administrador del módulo (`bannerUrl`, `logoUrl`) y no renderizaba fondos personalizados en los encabezados de categorías.

---

## 2. Causa Raíz

1. **Payload no Arreglo en `isModuleActive`**:
   - La función `isModuleActive` invocaba directamente `installedModules.some(...)`. Si el endpoint `/api/v1/modules/installed` devolvía temporalmente un objeto o una respuesta no formateada como array, `installedModules` no poseía el prototipo `.some()`.
2. **Endpoint Incompatible en Catálogo Legado**:
   - `catalog-with-categories.tsx` invocaba `/api/v1/public/catalog/products` que devolvía un objeto contenedor en lugar de un arreglo de productos (`Product[]`).
3. **Falta de Persistencia de Archivos e Incompatibilidad de Helmet CORS**:
   - Las imágenes subidas desde la administración de WhatsApp Catalog se guardaban en la carpeta interna del contenedor `/app/uploads` sin un volumen nombrado Docker en Compose.
   - Helmet en NestJS bloqueaba la carga remota de imágenes mediante `crossOriginResourcePolicy`.

---

## 3. Soluciones Implementadas

### A. Guardias de Arreglos en Frontend ([`frontend/src/AdminApp.tsx`](file:///opt/orderflow/frontend/src/AdminApp.tsx#L80-L95))
- Se aseguró la sanitización de la respuesta de módulos y se agregó un guardia en `isModuleActive`:
  ```typescript
  const isModuleActive = (moduleId: string) => {
    if (!Array.isArray(installedModules)) return false;
    return installedModules.some(m => m.moduleId === moduleId && m.active);
  };
  ```

### B. Corrección de Endpoint en Catálogo Legado ([`frontend/src/pages/catalog-with-categories.tsx`](file:///opt/orderflow/frontend/src/pages/catalog-with-categories.tsx#L80-L100))
- Se actualizó el endpoint a `/api/v1/public/storefront/${subdomain}/products` y se aseguró la extracción segura:
  ```typescript
  const response = await api.get(`/api/v1/public/storefront/${subdomain}/products`);
  const rawData = response.data?.data || response.data || [];
  data = Array.isArray(rawData) ? rawData : [];
  ```

### C. Persistencia de Almacén de Archivos y Helmet CORS ([`docker-compose.prod.yml`](file:///opt/orderflow/docker-compose.prod.yml#L60-L65) y [`backend/src/main.ts`](file:///opt/orderflow/backend/src/main.ts#L37-L40))
- Se agregó el volumen nombrado `uploads_data:/app/uploads` en `docker-compose.prod.yml` para persistir las imágenes subidas entre reinicios de contenedores.
- Se configuró `helmet({ crossOriginResourcePolicy: false })` para permitir que el catálogo sirva las imágenes a cualquier origen/subdominio.

### D. Soporte Visual de Categorías, Banner y Logo ([`frontend/src/pages/whatsapp-catalog.tsx`](file:///opt/orderflow/frontend/src/pages/whatsapp-catalog.tsx#L108-L345))
- Se actualizó la resolución de imágenes con fallback en cascada (`whatsappConfig.bannerUrl` -> `tenantConfig.branding.bannerUrl`).
- Se aplicaron fondos personalizados por categoría (`whatsappConfig.categoryBackgrounds[categoryName]`) con superposición de gradiente oscuro para asegurar la legibilidad del texto.

---

## 4. Verificación

- `./scripts/init.sh`: 50/50 test suites pasadas (389 tests unitarios pasados) y compilación limpia de producción.
- Desplegado y verificado en `Hetzner` y `Provecchio`.
