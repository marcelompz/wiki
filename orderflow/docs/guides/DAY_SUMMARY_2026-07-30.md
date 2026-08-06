# 📅 Resumen Diario de Trabajo — 30 de Julio de 2026

> **Versión del día:** v1.1.7 (release)  
> **Autor:** MarceloMPZ  
> **Commits del día:** 42 (de un total de 83 en el período 29-30/07)  
> **Áreas Impactadas:** WhatsApp Catalog (admin + público), Multi-Tenant Subdomain Resolution, Frontend Stability, QA E2E Suite, Infraestructura

---

## 🎯 Resumen Ejecutivo

El día de hoy se completó la **versión v1.1.7**, un release enfocado en la **estabilidad y madurez del catálogo WhatsApp público**, la **resolución de subdominios multi-tenant**, la **robustez del panel de administración** y la **integración de una suite QA E2E automatizada**. Se resolvieron bugs críticos de renderizado en el subdominio `wellness.pesallaccia.com`, se agregaron controles visuales de personalización avanzada en el admin, y se introdujo una capa de validación E2E con Playwright (Python) como paso obligatorio en `./scripts/init.sh`.

---

## 📦 1. Release v1.1.7 — QA E2E Rendering Suite & Solución de Subdominios Dinámicos

### 1.1 Suite QA E2E Playwright (Python)

**Problema:** No existía una validación automatizada del renderizado del catálogo público antes de cada deploy, permitiendo que regressions visuales o de datos lleguen a producción sin ser detectadas.

**Solución implementada:**

- **Creado `scripts/qa_e2e_check.py`** — Script de validación E2E en navegador headless (Playwright Python) que:
  - Navega a `https://spa-wellness.pesallaccia.com/whatsapp-catalog`
  - Espera a que el spinner `.ant-spin-spinning` desaparezca (DOM estable)
  - Valida que el contenido contenga el nombre del tenant (`SPA Wellness` / `Gaia Wellness`)
  - Verifica la presencia de las 3 categorías oficiales: `Aceites esenciales`, `Almohadillas terapéuticas`, `Difusores`
  - Detecta imágenes rotas validando `naturalWidth > 0` en cada `<img>`
  - Valida el acceso al panel de administración (`/admin/whatsapp-catalog`)

- **Integración en `scripts/init.sh`** — Agregado el paso `[5/5]` como validación obligatoria previa al deploy:
  ```bash
  python3 scripts/qa_e2e_check.py https://spa-wellness.pesallaccia.com/whatsapp-catalog
  ```

- **Ecosistema QA completo (`/opt/orderflow/qa/`):**
  - `qa/config.py` — Configuración centralizada (BASE_URL, CATALOG_PATH, viewport, timeouts)
  - `qa/conftest.py` — Fixtures de sesión, viewport, screenshots on failure
  - `qa/pages/base_page.py` — Page Object base con `SPAWaits` (network idle, spinner detach, root populated)
  - `qa/pages/catalog_page.py` — Validación de cards de productos, títulos y precios
  - `qa/pages/landing_page.py` — Validación de hero section, CTA y shell reemplazado
  - `qa/tests/test_catalog.py` — Tests de renderizado de productos (smoke + regression)
  - `qa/tests/test_landing.py` — Tests de landing page (smoke + regression)
  - `qa/tests/test_checkout.py` — Test de flujo add-to-cart (regression)
  - `qa/utils/spa_waits.py` — Utilidades de espera para SPAs (spinners, network idle, root populated)
  - `qa/requirements.txt` — Dependencias: `playwright==1.49.0`, `pytest==8.3.3`, `pytest-playwright`, `pytest-xdist`, `requests`
  - `qa/pytest.ini` — Configuración de markers (smoke, regression, catalog, checkout)
  - `qa/.env.example` — Template de variables de entorno
  - `qa_endpoint.py` — Script rápido de validación manual (Playwright)

- **Workflow GitHub Actions (`.github/workflows/qa_e2e.yml`):**
  - Trigger en push/PR a `main` y `staging`
  - Instalación de dependencias del sistema (Chrome/Chromium)
  - Instalación de Python deps + `playwright install --with-deps chromium`
  - Ejecución de tests con `--junitxml` y upload de reports + traces on failure

### 1.2 Resolución de Branding y Subdominios Dinámicos

**Problema:** Al acceder a `wellness.pesallaccia.com/whatsapp-catalog`, el catálogo mostraba "No se encontraron productos en esta categoría" a pesar de que los productos existían en la base de datos.

**Causa raíz:**
1. El tenant `SPA Wellness` (`spa-wellness-001`) tenía `subdomain = 'spa-wellness'` en la DB pero la URL usaba `wellness` como subdominio.
2. El `BrandingProvider` caía en un fallback a la API key de Provecchio (`0bb60656...`) cuando no encontraba el tenant por subdominio, mostrando branding incorrecto.
3. El catálogo público (`whatsapp-catalog.tsx`) usaba una API key hardcodeada en lugar de resolver el tenant por subdominio de forma reactiva.

**Soluciones implementadas:**

- **`frontend/src/components/tenant/BrandingProvider.tsx`** — Eliminado el fallback a Provecchio cuando el subdominio es explícito en la URL. Ahora solo usa la API key guardada si no hay subdominio explícito:
  ```typescript
  if (!config && !targetSubdomain) {
    let apiKey = import.meta.env.VITE_TENANT_API_KEY || localStorage.getItem('apiKey');
    if (apiKey) {
      config = await tenantService.getConfigByApiKey(apiKey);
    }
  }
  ```

- **`backend/src/tenants/tenants.controller.ts`** — Incluido `apiKeySecret` en la respuesta de `GET /api/v1/tenants/public/tenant-by-subdomain/:subdomain` para que el frontend pueda resolver el catálogo del tenant sin hardcodear claves.

- **`backend/src/products/public-catalog.controller.ts`** — Eliminado el alias especial `isWellnessAlias` que mapear `wellness` → `spa-wellness` → `spa-wellness-001`. La resolución ahora es genérica por `subdomain` o `id`.

- **`frontend/src/pages/whatsapp-catalog.tsx`** — Refactorización completa de la resolución de tenant:
  - Reacción reactiva al `tenantConfig` del `BrandingProvider` (`useEffect` con dependencia `[tenantConfig]`)
  - Resolución de subdominio por hostname, query params (`subdomain`/`tenant`) o fallback a `apiKey`
  - Uso del cliente HTTP oficial `api` (Axios) en lugar de `fetch` nativo
  - Endpoints actualizados a `/api/v1/public/catalog/config` y `/api/v1/public/catalog/products`
  - Función `getImageUrl()` para resolver URLs relativas a absolutas

- **Base de datos de producción** — Homologado el subdominio: `UPDATE tenants SET subdomain = 'spa-wellness' WHERE id = 'spa-wellness-001'`

- **`backend/scripts/seed-gaiaspa-doterra.ts`** — Estructuración de Gaia Wellness con las 3 categorías oficiales:
  - `Aceites esenciales` (Lavanda, Peppermint, Limón, On Guard, Copaiba, Serenity)
  - `Almohadillas terapéuticas`
  - `Difusores`
  - Imágenes locales en `/doterra_products/` (6 archivos JPEG)

- **`frontend/public/doterra_products/`** — Agregadas 6 imágenes estáticas de productos doTERRA (lavanda, peppermint, lemon, on_guard, copaiba, serenity)

### 1.3 Troubleshooting Docs

- **`docs/troubleshooting/07-whatsapp-catalog-subdomain-tenant-resolution.md`** — Documentación completa del incidente de subdominio `wellness`, causa raíz, solución y verificación.
- **`docs/troubleshooting/08-frontend-array-guards-and-uploads-persistence.md`** — Documentación de los `TypeError` en AdminApp y catálogo legado, persistencia de uploads y configuración de Helmet CORS.

---

## 🎨 2. WhatsApp Catalog Admin — Overhaul de Personalización Visual

### 2.1 Controles de Ajuste Visual con Live Preview

**Archivo:** `frontend/src/pages/admin/whatsapp-catalog.tsx` (+366 líneas)

Se refactorizó completamente la sección de "Personalización" del panel admin, reemplazando los simples inputs de texto por un sistema de ajustes visuales con **vista previa en vivo**:

- **ColorPicker con eyedropper** (Ant Design 5) para:
  - `headerBgColor` — Color de fondo del encabezado
  - `bodyBgColor` — Color de fondo de la página
  - `categoryColors[categoryName]` — Color de fondo por categoría

- **Controles de ajuste de banner y logo:**
  - `bannerFit` — `cover` | `contain` | `fill` (zoom del banner)
  - `bannerPosition` — `center` | `top` | `bottom` (alineación del banner)
  - `logoFit` — `cover` | `contain`
  - `logoPadding` — Margen interno en px (0-30)

- **Modo de visualización de categorías:**
  - `categoryLayoutMode` — `filter` (lista + buscador) | `accordion` (acordeón plegable)

- **Widget de vista previa fiel en vivo:**
  - Simulación del header público con banner, logo y colores reales
  - Renderizado reactivo a cambios en tiempo real
  - Preview del logo con `objectFit` y `padding` configurables

### 2.2 Sanitización de Colores y Objeto Corrupto

**Archivo:** `backend/src/whatsapp-catalog/whatsapp-catalog.service.ts`

- Agregada función `cleanColor()` en `sanitizeConfigUrls()` que:
  - Normaliza strings hex (`"#5B3A7B"`)
  - Extrae `.hex` de objetos ColorPicker de Ant Design (`{ hex: "#5B3A7B", ... }`)
  - Aplica a `headerBgColor`, `bodyBgColor` y `categoryColors` (por categoría)

- Agregados nuevos campos en la interfaz `WhatsappCatalogConfig`:
  - `bannerFit`, `bannerPosition`, `logoFit`, `logoPadding`
  - `headerBgColor`, `bodyBgColor`
  - `categoryLayoutMode`, `categoryColors`

### 2.3 Thumbnails Interactivos y Estado Reactivo

- **`bannerUrlState` / `logoUrlState`** — Estado React dedicado para thumbnails, separado del formulario, para forzar re-render correcto
- **`form.setFieldValue()`** — Reemplazado `form.setFieldsValue()` por `setFieldValue()` para actualizaciones puntuales sin resetear el formulario
- **`loadProducts()` al montar** — Los productos se cargan inmediatamente (no solo al cambiar a la pestaña "Productos"), necesario para el selector de categorías en el panel de fondos
- **`getImageUrl()`** — Helper para resolver URLs relativas a absolutas en thumbnails
- **`categoryColors` state** — Estado separado para colores por categoría, sincronizado en `handleSave`

### 2.4 Subida de Imágenes por Categoría

- **`handleImageUpload(file, 'category')`** — Botón de subida de dispositivo para imágenes de fondo por categoría
- **Selector de categoría** — `setSelectedCategoryForBg(cat)` antes de abrir el picker
- **Lista de categorías** — Incluye categorías de productos, categorías con fondo existente y categorías por defecto (`Aceites esenciales`, `Almohadillas terapéuticas`, `Difusores`)

### 2.5 Correcciones de URL y Persistencia

- **`backend/src/whatsapp-catalog/whatsapp-catalog-admin.controller.ts`**:
  - `uploadImage()` — Cambiado de URL absoluta (`${protocol}://${hostname}/...`) a ruta relativa (`/uploads/whatsapp-catalog/{tenantId}/{filename}`)
  - `listTenantImages()` — Mismo cambio: URL relativa para consistencia en el modal de almacén

---

## 🌐 3. WhatsApp Catalog Público — Refactor de UI y Resolución de Tenant

**Archivo:** `frontend/src/pages/whatsapp-catalog.tsx` (+285 líneas)

### 3.1 Resolución Reactiva de Tenant

- `useEffect` ahora depende de `[tenantConfig]` en lugar de `[]` (montaje único)
- Resolución de subdominio: hostname → query params (`subdomain`/`tenant`) → `apiKey` de localStorage
- Uso del cliente Axios oficial (`api`) en lugar de `fetch` nativo
- Endpoints actualizados a `/api/v1/public/catalog/config` y `/api/v1/public/catalog/products`

### 3.2 Modo Acordeón Plegable

- Nuevo `Collapse` de Ant Design con `defaultActiveKey` = todas las categorías
- Cada `Collapse.Panel` muestra: nombre de categoría, badge de cantidad de productos, imagen de fondo opcional con overlay de gradiente oscuro
- Texto del encabezado con color dinámico (blanco sobre imagen, oscuro sobre gradiente)

### 3.3 Modo Lista + Filtro (default)

- Selector "🌟 Todas las categorías" con `value="all"` → `setCategoryFilter(undefined)`
- Imágenes de fondo por categoría con `getImageUrl()` y overlay de gradiente
- Color de fondo personalizado por categoría (`categoryColors`)
- Padding dinámico según presencia de imagen de fondo

### 3.4 Mejoras de UI/UX

- `getImageUrl()` helper para resolver URLs relativas a absolutas
- Fallback de banner y logo para subdominio `wellness`/`spa-wellness`/`spa-wellness-001` (Gaia Wellness)
- `objectFit: contain` con padding configurable en el avatar del logo
- `objectFit: contain` en imágenes de productos (en lugar de `cover`)
- Badge de stock: "Sin stock" (naranja) / "¡Últimos N!" (rojo) / normal (verde)
- Altura de cover de imagen: 240px (en lugar de 200px) con centering y padding
- Transición CSS en imágenes de productos (`transform 0.3s ease`)
- Spinner de carga con fondo `#f8fafc` (en lugar de `#fff5f5`)
- Mensaje "Cargando catálogo..." (en lugar de "Preparando el catálogo fresco...")

### 3.5 Eliminación de Fallbacks Hardcodeados

- **`frontend/src/components/tenant/BrandingProvider.tsx`** — Eliminado fallback a `0bb60656b9fbfcc27e38ae444e9e376f` (Provecchio) cuando hay subdominio explícito
- **`frontend/src/pages/whatsapp-catalog.tsx`** — Eliminada API key hardcodeada, ahora resuelve por subdominio o apiKey del tenantConfig

---

## 🛡️ 4. Frontend Stability & Admin Guards

### 4.1 Guardia de Arreglos en AdminApp

**Archivo:** `frontend/src/AdminApp.tsx`

- **`isModuleActive()`** — Protegida contra payloads no arreglos:
  ```typescript
  const defaultCoreModules = ['products', 'users', 'customers', 'integrations', 'whatsapp-catalog'];
  if (!Array.isArray(installedModules) || installedModules.length === 0) {
    if (defaultCoreModules.includes(moduleId)) return true;
  }
  ```
- **`fetchModules()`** — Sanitización de respuesta: `Array.isArray(res.data) ? res.data : (res.data?.modules || [])`
- **`defaultCoreModules`** — Agregado `whatsapp-catalog` a la lista de módulos core garantizados

### 4.2 Interceptor de Headers (Authorization + API Key)

**Archivo:** `frontend/src/AdminApp.tsx`

- Cambiado de `else if (apiKey)` a `if (apiKey)` independiente, permitiendo que **ambos** headers (`Authorization: Bearer` y `x-api-key`) se envíen simultáneamente. Esto es crítico para endpoints que requieren ambos factores de autenticación.

### 4.3 Corrección de Endpoint en Catálogo Legado

**Archivo:** `frontend/src/pages/catalog-with-categories.tsx`

- Endpoint actualizado de `/api/v1/public/catalog/products` a `/api/v1/public/storefront/${subdomain}/products`
- Agregada extracción segura: `response.data?.data || response.data || []` con `Array.isArray()` guard
- Agregado `setProducts([])` en el catch para evitar estado inconsistente

---

## 🔒 5. Backend Fixes & Security

### 5.1 JwtAuthGuard — Bypass de Tenant Mismatch para SuperAdmins

**Archivo:** `backend/src/auth/jwt-auth.guard.ts`

- El guard de verificación de coincidencia de tenant (`payload.tenantId !== reqTenant.id`) ahora se omite para SuperAdmins:
  ```typescript
  if (!isSuperAdmin && reqTenant && payload.tenantId && payload.tenantId !== reqTenant.id) {
    throw new UnauthorizedException('El token no pertenece al entorno actual');
  }
  ```
- Esto permite que un SuperAdmin navegue entre tenants sin que su JWT fije un `tenantId` que entre en conflicto con el del request.

### 5.2 Helmet CORS — crossOriginResourcePolicy

**Archivo:** `backend/src/main.ts`

- Configurado `helmet({ crossOriginResourcePolicy: false })` para permitir que el catálogo sirva imágenes a cualquier origen/subdominio, resolviendo errores de carga de assets en subdominios personalizados.

### 5.3 Persistencia de Uploads en Docker Compose

**Archivo:** `docker-compose.prod.yml`

- Agregado volumen persistente `uploads_data:/app/uploads` al servicio de backend
- Declarado el volumen `uploads_data` en la sección de volumes

---

## 📚 6. Documentación & Sincronización de Versiones

### 6.1 Versionamiento

| Archivo | Antes | Después |
|---------|-------|---------|
| `VERSION` | 1.1.6 | **1.1.7** |
| `backend/package.json` | 1.1.5 | 1.1.6 ⚠️ |
| `frontend/package.json` | 1.1.5 | 1.1.6 ⚠️ |
| `featurelist.json` | 1.1.5 | **1.1.7** |
| `docs/00-contexto-agentes.md` | v1.1.3 | **v1.1.7** |
| `docs/CHANGELOG.md` | v1.1.5 | **v1.1.7** |
| Wiki `VERSION` | 1.1.6 | **1.1.7** |

> ⚠️ **Nota:** `backend/package.json` y `frontend/package.json` quedaron en 1.1.6 (bump de ayer). Deberían sincronizarse a 1.1.7 en el próximo commit de release.

### 6.2 Featurelist.json — Features Completados

Se marcaron como `"completed"` los siguientes ítems:
- **FEAT-008** — Profundización Integral: Variantes/Modificadores, Geolocalización GPS, Tarifas por Zona y Plantillas WhatsApp
- **FEAT-013** — Plan de maduración UX/UI mobile-first del catálogo WhatsApp
- **FEAT-014** — Customización del catálogo WhatsApp por Tenant Admin y SuperAdmin
- **FEAT-015** — Endpoint público unificado `/api/v1/public/catalog/products` y `/config`
- **FEAT-017** — Actualización de imágenes principales doTERRA y resolución dinámica multi-tenant por subdominio
- **FEAT-018** — Integración de suite E2E rendering Playwright con Python en init.sh

### 6.3 Troubleshooting Docs Creados

- `docs/troubleshooting/07-whatsapp-catalog-subdomain-tenant-resolution.md`
- `docs/troubleshooting/08-frontend-array-guards-and-uploads-persistence.md`

---

## 📊 7. Métricas de Calidad

| Métrica | Estado | Notas |
|---------|--------|-------|
| Test Suites | 50/50 ✅ | 389 tests unitarios pasados |
| Backend Build | ✅ Limpio | NestJS compila sin errores |
| Frontend Build | ✅ Limpio | Vite + TypeScript compila sin errores |
| QA E2E | ✅ Integrado | Playwright Python en `init.sh` [5/5] |
| Imágenes rotas | 0 ✅ | Validado por QA E2E en producción |

---

## 📁 8. Archivos Modificados Hoy (Resumen)

### Backend (6 archivos)
- `backend/src/auth/jwt-auth.guard.ts` — Bypass tenant mismatch para SuperAdmin
- `backend/src/main.ts` — Helmet crossOriginResourcePolicy: false
- `backend/src/products/public-catalog.controller.ts` — Eliminado wellness alias, resolución genérica
- `backend/src/tenants/tenants.controller.ts` — apiKeySecret en subdomain resolution
- `backend/src/whatsapp-catalog/whatsapp-catalog.service.ts` — Sanitización de colores, nuevos campos
- `backend/src/whatsapp-catalog/whatsapp-catalog-admin.controller.ts` — URLs relativas en upload/list

### Frontend (5 archivos)
- `frontend/src/pages/whatsapp-catalog.tsx` — Refactorización completa (accordion, getImageUrl, resolución reactiva)
- `frontend/src/pages/admin/whatsapp-catalog.tsx` — Overhaul visual (ColorPicker, live preview, category backgrounds)
- `frontend/src/AdminApp.tsx` — Array guards, defaultCoreModules, interceptor headers
- `frontend/src/components/tenant/BrandingProvider.tsx` — Eliminado fallback Provecchio
- `frontend/src/pages/catalog-with-categories.tsx` — Endpoint storefront, array guards

### Infraestructura (2 archivos)
- `docker-compose.prod.yml` — Volumen `uploads_data` persistente
- `scripts/init.sh` — Paso [5/5] QA E2E

### QA Suite (12 archivos nuevos)
- `scripts/qa_e2e_check.py`, `qa_endpoint.py`
- `qa/config.py`, `qa/conftest.py`, `qa/pytest.ini`, `qa/.env.example`, `qa/requirements.txt`
- `qa/pages/base_page.py`, `qa/pages/catalog_page.py`, `qa/pages/landing_page.py`
- `qa/tests/test_catalog.py`, `qa/tests/test_landing.py`, `qa/tests/test_checkout.py`
- `qa/utils/spa_waits.py`
- `.github/workflows/qa_e2e.yml`

### Assets (6 archivos nuevos)
- `frontend/public/doterra_products/lavanda_prod.jpeg`
- `frontend/public/doterra_products/peppermint_prod.jpeg`
- `frontend/public/doterra_products/lemon_prod.jpeg`
- `frontend/public/doterra_products/on_guard_prod.jpeg`
- `frontend/public/doterra_products/copaiba_prod.jpeg`
- `frontend/public/doterra_products/serenity_prod.jpeg`

### Backend Scripts (1 archivo)
- `backend/scripts/seed-gaiaspa-doterra.ts` — Categorías oficiales + imágenes locales

### Documentación (4 archivos)
- `docs/CHANGELOG.md` — Entradas v1.1.7 y v1.1.5
- `docs/00-contexto-agentes.md` — Versión v1.1.7
- `docs/troubleshooting/07-whatsapp-catalog-subdomain-tenant-resolution.md` — Nuevo
- `docs/troubleshooting/08-frontend-array-guards-and-uploads-persistence.md` — Nuevo

### Configuración (2 archivos)
- `featurelist.json` — Versión 1.1.7, features completados
- `backend/package.json`, `frontend/package.json` — Bump a 1.1.6
