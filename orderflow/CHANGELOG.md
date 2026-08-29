# Changelog

Todos los cambios notables a este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
y este proyecto se adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.20.70] - 2026-08-29

### 📂 OmniFlow Documentos & Workspace (FEAT-083) y Categorías Anidadas `product_pos`
- **OmniFlow Documentos (FEAT-083)**: Modelado de carpetas y archivos con permisos granulares por usuario y herencia automática. Implementación del almacenamiento local (`LocalDocumentStorageService`) y endpoints REST `/api/v1/documents`.
- **Integración WOPI & Collabora Online**: Controlador nativo WOPI (`wopi-documents.controller.ts`) con soporte completo de `CheckFileInfo`, `GetFile`, `PutFile`, bloqueo atómico de archivos (`LOCK`, `UNLOCK`, `REFRESH_LOCK`) con prevención de conflictos HTTP 409.
- **Frontend Workspace Explorer (`/admin/documents`)**: Interfaz de navegación de archivos tipo Google Drive / Nextcloud con migas de pan, explorador de subcarpetas, tabla de documentos, modal de permisos y visor interactivo Collabora.
- **Jerarquía Multinivel `product_pos` ("Categoría de Producto ➔ Categorías de PDV Anidadas")**: Soporte en el motor backend (`social-catalog.service.ts`) para estructurar la clasificación de productos en 2 niveles (Categoría de Producto Padre ➔ Categoría PDV Subcategoría) cuando los tenants configuran `categorySource: 'product_pos'`.
- **Fondos y Colores por Categoría (`omni-catalog.tsx` & `admin/social-catalog.tsx`)**: Corrección de la tabla de estilos por categoría para listar todas las categorías activas (independiente de la paginación), auto-selección de imágenes subidas en `ImagePicker` y prioridad visual de `customCatColor` e imágenes de fondo en los acordeones públicos.

## [1.20.65] - 2026-08-28


### 🌿 Resolución Dinámica de Instancias Multitenant y Catálogos Especiales (`/social-catalog/:instanceKey`)
- **Resolución Inteligente de Tenants por Instancia (`api-key.guard.ts`)**: Se extendió la resolución de tenants en el guard público de API Keys para que si una URL pública incluye una clave de instancia (ej: `/social-catalog/doterra` o `/social-catalog/wellness`), el backend consulte automáticamente qué tenant posee configurada dicha instancia en sus instalaciones de módulo.
- **Vincular Instancia `doterra` a Gaia Wellness (`spa-wellness-001`)**: Se registró y habilitó la instancia `doterra` bajo el tenant Gaia Wellness (`spa-wellness-001`), permitiendo abrir el catálogo de aceites esenciales y bienestar directamente sin depender exclusivamente del subdominio.

## [1.20.64] - 2026-08-28

### 🖼️ Selección de Fondos y Colores por Categoría & Agrupación Estricta por Categoría de Producto
- **Agrupación Estricta por Categoría de Producto (`omni-catalog.tsx` & `social-catalog.service.ts`)**: Se ajustó la resolución de nombres de categorías para que al seleccionar `categorySource: 'product'`, la agrupación del backend y frontend priorice estrictamente la categoría de producto (`product.categoryName` / `product.categoryRel.name`), evitando forzar la agrupación por categoría PDV.
- **Panel Admin "🖼️ Fondos y Colores por Categoría" (`admin/social-catalog.tsx`)**: Se agregó un nuevo panel interactivo en el Admin para configurar individualmente la imagen de fondo (con selector de almacén/dispositivo) y el color del encabezado de cada categoría del catálogo.

## [1.20.63] - 2026-08-28

### 🎨 Integración Completa de Temas y Placeholder Configurable en Checkout Público (`/social-checkout`)
- **Adaptación a Sistema de Temas (`social-checkout.tsx`)**: Se integró `getThemeConfig(mode)`, `applyCssVars(mode)` y `<ConfigProvider theme={themeConfig}>` en la vista de confirmación de pedido (`/social-checkout`), permitiendo heredar de forma impecable el modo claro/oscuro/sistema del catálogo y eliminando estilos hardcodeados (#fff, #f8fafc, #000).
- **Placeholder Configurable por Admin (`social-catalog.tsx` & `social-catalog.service.ts`)**: Se añadió la propiedad `commentsPlaceholder` en la configuración del catálogo y un nuevo campo editable en la administración bajo **"📱 Datos de contacto"**, permitiendo personalizar el placeholder de aclaraciones de pedido por cada catálogo (ej: SPA/Wellness, Restaurante, Retail).

## [1.20.62] - 2026-08-28

### 🎨 Personalización de Nombre Comercial / Marca en Catálogos Públicos y Admin
- **Campo `businessName` en Admin Social Catalog (`social-catalog.tsx`)**: Se agregó el campo editable `Form.Item name="businessName"` en el panel de administración bajo la sección **"📱 Datos de contacto"**, permitiendo configurar el nombre de la marca o tienda por cada catálogo (ej: `doTERRA Paraguay`, `PROVECCHIO`).
- **Priorización de Nombre Comercial en Catálogo Público (`omni-catalog.tsx` & `social-catalog.service.ts`)**: Se actualizó la jerarquía del nombre en el encabezado y pie de página para priorizar `whatsappConfig.businessName` -> `tenantConfig.name` ("PROVECCHIO" / marca comercial) sobre la Razón Social jurídica ("DIMORA S.R.L.").

## [1.20.61] - 2026-08-28

### 🛡️ Corrección de Enrutamiento de Instancias de Catálogo por Tenant
- **Desacoplamiento de Slug e Identificador de Tenant (`BrandingProvider.tsx`)**: Se removió la extracción automática de slug de ruta para resolución de tenant, permitiendo que la resolución de tenant por dominio (`pesallaccia.com` -> `provecchio-dimora-001` / API key `0bb60656b9fbfcc27e38ae444e9e376f`) prevalezca en lugar de intentar buscar un tenant inexistente llamado `doterra`.
- **Delimitación de Responsabilidad en `ApiKeyGuard` (`api-key.guard.ts`)**: Se separó la búsqueda de tenant (`subdomain`/`tenantId`) de la clave de instancia (`instanceKey`), permitiendo que el backend asocie correctamente la petición al tenant correspondiente y use `instanceKey` para filtrar la instancia del catálogo.
- **Paso Limpio de Parámetros en `SocialCatalogPage` (`omni-catalog.tsx`)**: Se corrigió el envío de `requestParams` para incluir la API Key / Subdomain del tenant junto con `instanceKey=doterra`.

## [1.20.60] - 2026-08-28

### 🛡️ Resolución Multi-Instancia y Enrutamiento Dinámico de Catálogos por Slug
- **Desenvolvimiento de Configuración Multi-Instancia (`social-catalog.controller.ts`)**: Se corrigió el endpoint público `/api/v1/public/social-catalog/config` para que invoque `socialCatalogService.getTenantConfig(tenant.id, instanceKey)`, des-anidando las configuraciones de catálogos multicanal (`doterra`, `wellness`, `default`) en lugar de devolver la estructura contenedora `instances`.
- **Priorización de Slug/InstanceKey en Guard de Autenticación (`api-key.guard.ts`)**: Se actualizó `ApiKeyGuard` para que reconozca parámetros explicitos de consulta o ruta (`instanceKey`, `subdomain`, `tenant`), dándoles prioridad absoluta sobre cabeceras obsoletas de `x-api-key` almacenadas en `localStorage`.
- **Extracción Inteligente de Slugs en Branding (`BrandingProvider.tsx`)**: Se configuró `BrandingProvider` para que parsee rutas públicas tipo `/social-catalog/:slug` o `/tienda/:slug`, resolviendo dinámicamente el tenant e impidiendo fallbacks falsos al tenant por defecto.
- **Resolución Bivalente en Backend (`tenants.controller.ts`)**: Se actualizó `getTenantBySubdomain` para consultar tanto la tabla de tenants por subdominio/id/customDomain como la configuración `instanceKey` de `moduleInstallation`, restringiendo el fallback al tenant por defecto a solicitudes de dominio raíz puro.

## [1.20.59] - 2026-08-28

### 🛡️ Eliminación de Excepción React #310 y Orden Estricto de Hooks
- **Reordenamiento Incondicional de Hooks en Catálogo (`omni-catalog.tsx`)**: Se reestructuraron todos los hooks (`useState`, `useEffect`, `useMemo`) en `SocialCatalogPage` para que se invoquen incondicionalmente en la parte superior del componente antes de la evaluación de carga (`if (loading || configLoading)`), eliminando definitivamente la excepción `Minified React error #310`.
- **Limpieza de Precargas de Navegador**: Se removió el elemento de precarga no estándar con `as="document"` que generaba advertencias de consola en navegadores modernos.

## [1.20.58] - 2026-08-28

### 🛠️ Corrección de Validación de Mapeo de Columnas y UX en Importación Masiva
- **Resolución de Error Falso Positivo de Mapeo**: Se corrigió la lógica en `BulkUploadModal.tsx` donde se intentaba comparar el nombre arbitrario de la columna del Excel contra una lista fija de alias en lugar de verificar la clave del campo destino (`isFieldMapped('name')` y `isFieldMapped('price')`), eliminando el bloqueo que indicaba *"Falta mapear la columna requerida: name / price"* cuando ya estaban asignados.
- **Detección Ampliada de Columnas**: Se agregaron variaciones de cabeceras en español e inglés (`descripcion nombre`, `detalle`, `articulo`, `p.venta`, `pvp`, `monto`, `rubro`, `familia`, `cod.barras`, etc.) en `ImportWizardModal.tsx` y `BulkUploadModal.tsx`.
- **Acceso Permanente al Selector de Codificación**: Se hizo visible la tarjeta de configuración de codificación de archivos y separadores en el paso 0 de `ImportWizardModal.tsx` desde la apertura del modal.

## [1.20.57] - 2026-08-28

### 🛡️ DTOs para Parámetros de Importación y Prevención de Excepciones de Validación NestJS
- **Soporte de `fileEncoding` y `encoding` en DTOs de Importación**: Se incluyeron `@IsOptional()` y `@IsString()` para `fileEncoding` y `encoding` en `BulkUploadProductDto` e `ImportFileOptionsDto` (`bulk-upload-product.dto.ts`).
- **Resolución de Error `property fileEncoding should not exist`**: Se actualizaron los endpoints `bulkUploadPreview`, `bulkUpload`, `validateImportFile` y `executeImportFile` en `products.controller.ts` para usar los DTOs oficiales, eliminando el rechazo de `ValidationPipe` al enviar codificaciones de archivo personalizadas.

## [1.20.56] - 2026-08-28

### 🛡️ Mapeo Seguro de Categorías y Prevención de Excepciones HTTP 500
- **Protección Defensiva en `autoSyncCategoriesFromProducts`**: Se trasladó y encapsuló la auto-sincronización dentro de `CatalogService` con bloques try/catch y validación estricta de clientes Prisma pasados desde el controlador.
- **Prevención de Excepciones TypeError**: Corregido el acceso a `autoSyncCategoriesFromProducts` en `catalog.controller.ts` resolviendo la excepción `Cannot read properties of undefined (reading 'product')` de forma definitiva.

## [1.20.55] - 2026-08-28

### 🛍️ Visualización de Categorías PDV, ID de Sistema Copiable & Mapeo Completo en Catálogo Social
- **Resolución de Categorías PDV & Cadenas de Texto**: Se actualizó `mapProduct` en `social-catalog.service.ts` para capturar `posCategory` y `posCategoryName` directamente desde campos textuales de productos y relaciones POS.
- **Inclusión de Categorías Vacías en Árbol Admin**: Se agregó el parámetro `includeEmpty` a `getCategoryTree` para garantizar que la administración muestre el árbol completo sin ocultar nodos.
- **Visualización de ID Sistema y Categoría PDV**: Se agregaron las columnas `ID Sistema` (con copiado al portapapeles en 1 clic) y `Categoría PDV` en las tablas de `/admin/products` y `/admin/social-catalog`.
- **Selectores de Categoría en Modal de Producto**: Se reemplazó la entrada de texto plano por selectores emergentes de categorías de productos y PDV en el modal de edición de productos del Catálogo Social.

## [1.20.54] - 2026-08-28

### 🛡️ Visibilidad Total de Categorías en Panel de Administración & Acordeón Público Plegado
- **Sincronización Automática de Categorías (`autoSyncCategoriesFromProducts`)**: Se agregó sincronización automática en `catalog.controller.ts` y `social-catalog-admin.controller.ts` que convierte automáticamente cualquier categoría textual de productos importados por CSV/Excel/POS en registros de `ProductCategory`.
- **Soporte de Autenticación Admin en Endpoints de Categoría**: Configurado fallback en `social-catalog.controller.ts` para resolver `tenantId` desde `user.tenantId` cuando los endpoints se consultan con token JWT de administración.
- **Visualización en Panel Admin**: `admin/social-catalog.tsx` consulta de forma segura el endpoint administrativo de categorías `/api/v1/admin/social-catalog/categories/tree` con fallbacks resilientes.
- **Acordeón Plegado en Vista Pública Cliente**: Revertido `defaultActiveKey` a `[]` en `omni-catalog.tsx` manteniendo los paneles de acordeón colapsados por defecto en el catálogo público del cliente según pedido específico.

## [1.20.53] - 2026-08-28

### 🗂️ Barra de Navegación por Pestañas/Pills de Categorías & Mapeo Completo en Catálogo Público
- **Barra de Navegación de Categorías (Pills / Tabs)**: Agregada barra horizontal deslizable de pestañas de categorías (`[🌟 Todas] [🏷️ Categoría 1] [🏷️ Categoría 2]...`) con contadores dinámicos de productos y filtrado instantáneo en `omni-catalog.tsx`.
- **Apertura Predeterminada de Secciones**: Configurado `defaultActiveKey` para abrir todas las categorías por defecto en el modo acordeón/collapse.
- **Resolución Resiliente en `getCategoryTree`**: Si el `targetCatId` del producto no se encuentra en el mapa o el ID no coincide, se resuelve por coincidencia de nombre (insensible a mayúsculas) o se asigna a un nodo de categoría virtual sin descartar ningún producto ni categoría.
- **Matching de Categorías en Frontend**: Búsqueda insensible a mayúsculas y espacios sobre `product.category`, `product.posCategoryName`, `product.categoryRel.name` y `product.posCategoryRel.name`.

## [1.20.52] - 2026-08-28

### 🐛 Fix de Sintaxis en Controller & Despliegue de Producción Estable
- **Cierre de Método `bulkDelete`**: Corrección de llave de cierre faltante en `products.controller.ts` para posibilitar la compilación Docker de backend en servidor de producción.

## [1.20.51] - 2026-08-28

### 🔤 Selector de Codificación de Caracteres (`fileEncoding`) & Detección Completa de Categorías en Catálogo Público
- **Selección de Codificación (Encoding/Nomenclatura)**: Agregado selector de codificación (`fileEncoding`) en `BulkUploadModal` y `ImportWizardModal`, con **UTF-8** por defecto e integración de `Windows-1252` / `ISO-8859-1` / `ISO-8859-15` / `ASCII` mediante `TextDecoder` y SheetJS codepages.
- **Resolución de Categorías en Catálogo (`social-catalog.service.ts`)**: Se removió el filtro restrictivo de `odooPosCategoryId`, permitiendo que categorías creadas localmente o por CSV se incluyan en `getCategoryTree`.
- **Detección Dinámica & Nodos Virtuales**: Creación dinámica de nodos de categoría en `getCategoryTree` para asegurar que ningún producto quede sin categoría asignada en la vista pública.

## [1.20.50] - 2026-08-28

### 🐛 Fix en Mapeo & Procesamiento de Campos en Carga Masiva (`bulkUpload`)
- **Persistencia de Campos en `bulkUpload` (`products.controller.ts`)**: Se solucionó la omisión de `costPrice`, `productSubcategory`, `posCategory` y `posSubcategory` en la función de parseo de la Carga Masiva, permitiendo que la importación procese y cree la estructura de categorías y precios de costo.
- **Soporte `costPrice` en `products.service.ts`**: Actualización de los métodos `create` y `update` en `bulkUploadProducts` para guardar y actualizar el precio de costo de los productos.

## [1.20.49] - 2026-08-28

### 🚫 Opción "Omitir Campo", Mapeo de Precio de Costo & Adaptación de Tema Oscuro en Modales
- **Opción de Omitir Campo (`__SKIP__`)**: Incorporación de la opción explícita `🚫 Omitir (No importar campo)` en todos los selectores de mapeo de columnas en `ImportWizardModal.tsx` y `BulkUploadModal.tsx`, permitiendo ignorar columnas sin sobreescribir datos en backend.
- **Mapeo de Precio de Costo Separado**: Desacoplamiento de alias en `detectColumnMapping`, aislando `costPrice` (`['precio costo', 'costo', 'cost']`) de `price` (Precio de Venta) para evitar colisiones.
- **Estilos Adaptables a Tema Oscuro (Dark Theme Tokens)**: Reemplazo de fondos estáticos claros por `token.colorBgContainer` y `token.colorBgElevated` de Ant Design, garantizando contraste elevado en tema oscuro.

## [1.20.48] - 2026-08-28

### 🎯 Selección & Mapeo de Columnas de Categorías en Wizard & Carga Masiva
- **Mapeo de Columnas en Wizard (`ImportWizardModal.tsx`)**: Integración de autodetección de cabeceras de archivo y tarjeta interactiva de selección de mapeo para definir explícitamente qué columna del archivo corresponde a: Nombre, Categoría de Producto (Nivel 1), Subcategoría de Producto (Nivel 2), Categoría de PDV (Nivel 1), Subcategoría de PDV (Nivel 2), Precio Venta, Precio Costo, Stock, SKU, Código de Barras, Descripción y Handle.
- **Campos Ampliados en Carga Masiva (`BulkUploadModal.tsx`)**: Incorporación de selectores para `productSubcategory`, `posCategory` y `posSubcategory` en la grilla de mapeo de Carga Masiva.
- **Soporte `columnMapping` en Backend (`products.controller.ts` & `batch-product-import.service.ts`)**: Procesamiento del parámetro `columnMapping` en endpoints `POST /import/validate` y `POST /import/execute`, priorizando la columna elegida por el usuario para cada campo sobre los alias automáticos en parseos Excel y CSV.

## [1.20.47] - 2026-08-28

### 📂 Doble Jerarquía de Categorías Independientes, Preservación de Texto CSV & Enriquecimiento DataView
- **Independencia de Cadenas de Categorías (Producto vs PDV)**: Separación estricta de `productChain` (`Categoría de Producto` $\rightarrow$ `Subcategoría`) y `posChain` (`Categoría de PDV` $\rightarrow$ `Subcategoría PDV`) vinculando ambas cadenas atómicamente a la base de datos tanto en `BulkUploadModal` como en `ImportWizardModal`.
- **Preservación de Texto en Lectura CSV (`SheetJS`)**: Inyección de `{ raw: true, rawNumbers: false }` en `XLSX.read` impidiendo la corrupción automática de números formateados como `15.000` o `18.000` en importaciones CSV.
- **DataView de Productos Enriquecido (`products.tsx`)**: Incorporación de columnas visualizables y filtrables para `skuInterno`, `barcode`, `description`, `posCategory`, `costPrice` y estado `active`.
- **Formulario de Edición Ampliado**: Enriquecimiento del modal de edición de productos para editar todos los atributos clave (`posCategoryId`, `skuInterno`, `barcode`, `costPrice`, `active`).

## [1.20.46] - 2026-08-28

### 🗑️ Fix de Eliminación Masiva por Selección Explícita y Categoría (`DynamicQueryBuilder`)
- **Garantía de Eliminación Inmediata por IDs**: Cuando se selecciona un conjunto explícito de filas (`mode === 'selected'`), la consulta SQL/Prisma prioriza los `ids` directos eliminando cualquier descalce con el nombre o ID de categoría.
- **Búsqueda Robusta por Categoría**: Cuando se utiliza eliminación global (`mode === 'all'`), la cláusula de categoría matchea mediante `OR` la propiedad `category` (texto), `categoryId` (relación producto) y `posCategoryId` (relación PDV).

## [1.20.45] - 2026-08-28

### 📱 Registro de Módulos POS y KDS en App Store (`modules.registry.ts`)
- **Manifiestos de Módulos (`pos.manifest.json` y `kds.manifest.json`)**: Creación de los archivos de manifiesto para los módulos Punto de Venta (POS) y Pantalla de Cocina (KDS).
- **Registro en Backend (`ModulesRegistry`)**: Incorporación de `pos` y `kds` en el array de escaneo del backend (`modules.registry.ts`), exponiendo ambos módulos en el App Store (`/admin/modules`).

## [1.20.44] - 2026-08-28

### 📂 Jerarquía de Categorías de Izquierda a Derecha & Selector en Social Catalog (OmniCatalog)
- **Importación Jerárquica de Categorías**: Implementación de `findOrCreateCategoryHierarchy(tenantId, chain)` en `products.service.ts` y `batch-product-import.service.ts`, procesando la prelación de izquierda a derecha (`Categoría de Producto` $\rightarrow$ `Categoría de PDV` $\rightarrow$ `Subcategoría de PDV`) en `BulkUploadModal` y `ImportWizardModal`.
- **Selector de Estructura de Categorías en Admin**: Agregada la opción `categorySource` en `social-catalog.tsx` permitiendo alternar entre `Categorías de PDV`, `Categoría de Producto ➔ Categorías de PDV Anidadas` y `Categoría de Producto Únicamente`.
- **Soporte de Columnas Duplicadas en CSV**: Detección inteligente de múltiples columnas con el mismo nombre en la cabecera del archivo (ej. `Categoria de PDV` en Col J y Col K).

## [1.20.43] - 2026-08-28

### 📊 DataView Suite: Selección Global, Fix de Agrupaciones y Paginación Ampliada
- **Aislamiento en Selección por Agrupación**: Corrección de `handleSelectGroupPage` y `selectedRowKeys` en `DataTableContainer.tsx` para que al seleccionar items en el encabezado de un grupo, solo afecte a ese grupo.
- **Selección Global (`mode: 'all'`) & Banner**: Integración de selección de la totalidad de registros filtrados (incluso los no visibles) con los endpoints masivos atómicos (`bulk-delete`).
- **Paginación Ampliada**: Opciones `[10, 20, 50, 100, 150, 200, 250, 300, 500]` configuradas en `DataTableContainer.tsx`.
- **Parsing de Precios en CSV & Wizard**: Integración de `parseCurrencyNumber(val, format)` en `products.controller.ts`, `social-catalog-admin.controller.ts`, y `batch-product-import.service.ts` con `{ raw: true }` en SheetJS, resolviendo el recorte de miles en CSV y garantizando la importación síncrona en el Wizard.

## [1.20.42] - 2026-08-28

### 🛍️ Soporte Multi-Instancia Simultánea en Social Catalog & Catálogos Reducidos (Coffee Party)
- **Estructura Multi-Instancia (`config.instances`):** Migración del almacenamiento de configuraciones de catálogo en `ModuleInstallation.config.instances[instanceKey]` en [social-catalog.service.ts](file:///opt/orderflow/backend/src/social-catalog/social-catalog.service.ts), resolviendo la sobreescritura del catálogo predeterminado producida por la restricción `@@unique([tenantId, moduleId])` de Prisma.
- **Eliminación y Gestión de Instancias:** Endpoint `DELETE /api/v1/admin/social-catalog/instances/:instanceKey` en [social-catalog-admin.controller.ts](file:///opt/orderflow/backend/src/social-catalog/social-catalog-admin.controller.ts) y control visual con `Popconfirm` en el selector superior de [social-catalog.tsx](file:///opt/orderflow/frontend/src/pages/admin/social-catalog.tsx).
- **Catálogos Reducidos por Evento (Coffee Party):** Soporte para `includedCategoryIds` e `includedTagIds` en `SocialCatalogConfig`, permitiendo filtrar categorías y productos permitidos en el catálogo público (`getCatalogProducts`, `getCategoryTree`).
- **Troubleshooting #75:** Documentación de la resolución en [75-social-catalog-multi-instance-overwrite-fix.md](file:///opt/orderflow/docs/troubleshooting/75-social-catalog-multi-instance-overwrite-fix.md).

## [1.20.41] - 2026-08-27

### 📊 OmniFlow DataView Suite — Integración Total en Pantallas Admin & Presets
- **Integración Total en Pantallas Admin (`frontend/src/pages/admin/`):** Sustitución de tablas estáticas por `<DataTableContainer>` en `/admin/products` (`products.tsx`), `/admin/contacts` (`contacts.tsx`) y `/admin/orders` (`orders.tsx`), exponiendo el Toolbar de Filtros Avanzados, Visibilidad de Columnas y Banner de Selección Global.
- **Componente `SavedViews` (Frontend UI):** Nuevo componente [SavedViews.tsx](file:///opt/orderflow/frontend/src/components/data-view/SavedViews.tsx) integrado en la barra de herramientas para guardar, cargar y gestionar presets de filtros/columnas persistidos en PostgreSQL.
- **Corrección de Checkbox Duplicado:** Eliminación de la columna manual de checkbox en `products.tsx`, unificando el control de selección a través del `rowSelection` nativo de `DataTableContainer`.
- **Troubleshooting #72:** Documentación de la guía de resolución para el desacople de DataView Suite y la duplicación de casillas de verificación.

### 🚢 Estandarización de Inventario (Paso 8: Landed Costs) & Wizard Onboarding Odoo 1-Click
- **Landed Costs en Recepción de Órdenes de Compra (`PurchasesService`):** Prorrateo proporcional de costes de destino (flete, aranceles, seguro) sobre los productos de una OC al recibirla, recalculando atómicamente el Precio Medio Ponderado (PMP) (`costPricePmp` y `costPrice`) e impactando el Kardex.
- **Wizard Visual de Onboarding Odoo 1-Click (`<OdooOnboardingWizardModal>`):** Asistente modal en 4 pasos en el Dashboard SuperAdmin (`/admin/deploy`) para auto-configurar datos de empresa, categorías, depósitos y credenciales Odoo con descarga o envío directo del manifiesto `tenant_manifest.json`.

## [1.20.40] - 2026-08-26

### 🤖 Motor de Integración LLM Local (OmniAI) & Onboarding Zero-Touch Odoo
- **Motor LLM Local (`LlmModule`):** Módulo NestJS inyectable (`LlmService`, `LlmController`) con conexión a servicios de Inteligencia Artificial locales (Ollama / vLLM en `ai.provecchio.com` o proxy Traefik SSL) sin enviar datos sensibles a servicios de terceros.
- **Endpoints de Inferencia:** `/api/v1/integrations/llm/status` (chequeo de salud) y `/api/v1/integrations/llm/chat/completions` (generación de respuestas con modelos `llama3`, `mistral`, `gemma`).
- **Onboarding Zero-Touch Odoo (`tenant_manifest.json`):** Endpoint `POST /api/v1/public/webhooks/odoo/onboard-manifest` y método `onboardTenantFromManifest` para aprovisionar datos de empresa, categorías, depósitos e integración Odoo en 1-Click.

## [1.20.39] - 2026-08-26

### 📊 OmniFlow DataView Suite (Gestión Estándar de Vistas & Selección Global)
- **Backend Core DataView (`backend/src/common/data-view/`):** DTOs `FilterQueryDto`, `SelectionPayloadDto`, `BulkActionDto`, decorador `@DataViewQuery()` y servicio universal `DynamicQueryBuilder` para parsing de operadores dinámicos (`eq`, `ne`, `like`, `ilike`, `gt`, `gte`, `between`, `in`) y soporte de selección global de registros en base de datos (`mode: 'all'`, `selected`, `none`).
- **SavedViews & Presets (`SavedViewsModule`):** Modelo `SavedView` en Prisma con visibilidad `PRIVATE`/`PUBLIC`, auto-gestión de vista por defecto y endpoints REST CRUD (`/api/v1/saved-views`).
- **DataView UI Kit (Frontend):** Suite de componentes React/AntDesign (`DataTableContainer.tsx`, `SelectionBanner.tsx`, `FilterBuilder.tsx`, `ColumnVisibility.tsx`) y hook declarativo `useDataTable`.
- **Instanciación en Módulos:** Configuraciones declarativas `ProductListConfig.tsx`, `ContactListConfig.tsx`, `OrderListConfig.tsx`, e `InventoryListConfig.tsx` para habilitar vistas avanzadas, filtros combinables y acciones masivas en la UI admin.

## [1.20.24] - 2026-08-25

### 🏭 Inventory Standardization (Paso 3 — Stock Reservation)
- **Reserva de stock en pedidos:** `OrdersService.create()` y `OrdersService.confirm()` ahora usan `InventoryService.reserveStock()` y `confirmReservationAsMove()` cuando `USE_DOUBLE_ENTRY_STOCK=true`.
- **Liberación en cancelación:** `OrdersService.cancel()` libera reservas con `InventoryService.releaseStockReservation()` en lugar de decrementar directamente `Product.stockAvailable`.
- **Feature flag:** comportamiento controlado por `USE_DOUBLE_ENTRY_STOCK`; sin flag, se mantiene la lógica original de `stockAvailable` para no afectar pedidos admin existentes.
- **Nuevos métodos en `InventoryService`:** `reserveStock`, `releaseStockReservation`, `confirmReservationAsMove` para manejo explícito de `StockQuant.reservedQuantity`.

## [1.20.22] - 2026-08-25

### 🚀 Product Variants & Batch Import
- Backend: servicios `variants.service.ts`, `attributes.service.ts`, `batch-product-import.service.ts` para variantes estilo Odoo y carga masiva.
- Schema Prisma extendido con tablas de variantes y atributos.
- Frontend: modales `VariantMatrixModal.tsx`, `AttributeManagerModal.tsx`, `ImportWizardModal.tsx` integrados en admin de productos.

### 🎨 Enhanced (OmniCatalog UX/UI — SC-09..SC-13)
- **SC-09 — Inserción de variables en plantillas:** confirmado funcional; `TemplateVariablePicker` inserta `{{clientName}}`, etc. en el caret del textarea activo.
- **SC-10 — Autoasignación de imagen de categoría:** al subir/archivar imagen con `target === 'category'`, se asigna automáticamente a `categoryBackgrounds[selectedCategoryForBg]`.
- **SC-11 — Live Preview:** agregado componente `CatalogLivePreview` que refleja en tiempo real config, productos, categorías, banner y logo sin recargar.
- **SC-12 — Acordeón admin:** reorganizado formulario de OmniCatalog en 8 secciones colapsables (`Collapse.Panel`): contacto, redes, envíos, venta, personalización, banner destacado, visibilidad, categorías.
- **SC-13 — Sentence case:** corregidos labels/títulos en admin (`social-catalog.tsx`, `biolinks.tsx`) a mayúscula inicial.

### 🔧 Refactor / Fixes Varios
- **Social Catalog sortBy default:** cambiado default a `sortBy='admin'` y envío siempre de `sortBy` al backend para respetar orden admin (carta física).
- **Eliminación de categorías:** `DELETE /api/v1/social-catalog/categories/:id` ahora desvincula productos (`category: null`, `categoryId: null`) y elimina la categoría. Documentado en troubleshooting #63.
- **Refactor naming:** renombrados archivos de páginas frontend a `kebab-case` (`omni-catalog.tsx`, `api-key-config.tsx`, etc.) y eliminados backups residuales.

## [1.20.21] - 2026-08-25

### 🎨 Enhanced (OmniCatalog UX/UI — SC-09..SC-13)
- **SC-09 — Inserción de variables en plantillas:** confirmado funcional; `TemplateVariablePicker` inserta `{{clientName}}`, etc. en el caret del textarea activo.
- **SC-10 — Autoasignación de imagen de categoría:** al subir/archivar imagen con `target === 'category'`, se asigna automáticamente a `categoryBackgrounds[selectedCategoryForBg]`.
- **SC-11 — Live Preview:** agregado componente `CatalogLivePreview` que refleja en tiempo real config, productos, categorías, banner y logo sin recargar.
- **SC-12 — Acordeón admin:** reorganizado formulario de OmniCatalog en 8 secciones colapsables (`Collapse.Panel`): contacto, redes, envíos, venta, personalización, banner destacado, visibilidad, categorías.
- **SC-13 — Sentence case:** corregidos labels/títulos en admin (`social-catalog.tsx`, `biolinks.tsx`) a mayúscula inicial.

### 🔧 Refactor / Fixes Varios
- **Social Catalog sortBy default:** cambiado default a `sortBy='admin'` y envío siempre de `sortBy` al backend para respetar orden admin (carta física).
- **Eliminación de categorías:** `DELETE /api/v1/social-catalog/categories/:id` ahora desvincula productos (`category: null`, `categoryId: null`) y elimina la categoría. Documentado en troubleshooting #63.

## [1.20.20] - 2026-08-25

### 🐛 Fixed (OmniBio / Bio-Links — BL-01, BL-02, BL-06)
- **Rutas públicas rotas en Fast Checkout (BL-01):**
  - Corregido doble error en `public-biolink.tsx`: faltaba el prefijo `/api/v1/bio/public/` en las llamadas a `/click` y `/order`.
  - Backend `@Controller('api/v1/bio')` ya exponía `@Post('public/:slug/click')` y `@Post('public/:slug/order')`; el frontend estaba llamando `/v1/bio/${slug}/...`.
  - Documentado en troubleshooting #61: `docs/troubleshooting/61-omnibio-public-routes-click-order-missing-prefix.md`
- **Precio manipulado por cliente en Fast Checkout (BL-02):**
  - Eliminado `price` del payload del frontend hacia `/order`.
  - Backend `createOrderFromBioLink` ahora resuelve el precio server-side:
    - Si el bloque es `product` y existe `productId`, delega a `OrdersService.create()` que valida contra `Product.price` real.
    - Si el bloque es `booking` o no tiene `productId`, usa el precio configurado en el `BioLink.blocks` (precio de lista del admin), ignorando cualquier valor del body.
  - Documentado en troubleshooting #62: `docs/troubleshooting/62-omnibio-checkout-client-price-injection.md`
- **Enriquecimiento de bloques tipo producto (BL-06):**
  - `getPublicBySlug` ahora incluye `stockStatus`, `imagesUrls`, `ribbon` y `tags` del `Product` referenciado en bloques `product`.
  - Extraído helper `getStockStatus` a `backend/src/utils/stock-utils.ts` para reusar en social-catalog.
  - Frontend público renderiza badge de stock (AGOTADO / ¡Última unidad! / Pocas unidades) y deshabilita el bloque si está agotado.

### 🎨 Enhanced (OmniBio UX/UI — BL-03, BL-04, BL-05)
- **Consistencia de moneda (BL-03):**
  - Reemplazado símbolo `$` hardcodeado por helper `formatCurrency(amount, tenant.currency)` en `public-biolink.tsx`.
  - Símbolos soportados: `PYG` → `₲`, `USD` → `$`, `ARS` → `$`, `BRL` → `R$`, etc.
- **Theme del checkout (BL-04):**
  - Botón "Confirmar Pedido" y botón "Volver a la Bio" ahora usan `themeColor` del `BioLink` cargado.
  - Eliminado hardcode `#3D2235` en checkout público.
- **Validación de contraste en admin (BL-05):**
  - Agregado display en vivo de ratio de contraste entre `themeColor` y `textColor` en `biolinks.tsx`.
  - Muestra warning si ratio < 4.5:1 y sugiere color de texto alternativo.

### 🔧 Refactor
- **Standalone同步:**
  - `services/biolinks-standalone/src/bio-links.controller.ts` y `omni-bio.controller.ts` sincronizados con misma lógica de resolución de precio server-side.
  - Rutas standalone ya exponían `@Post('public/:slug/click')` y `@Post('public/:slug/order')` correctamente; solo se alineó la lógica de negocio.

## [1.20.19] - 2026-08-24

### 🐛 Fixed (Social-Catalog Public Toggling Visibility Bug)
- **Persistencia de toggles de visibilidad `false` en Social-Catalog Público:**
  - Corregido bug crítico donde los toggles de visibilidad de elementos en el catálogo público (mostrar/ocultar) no persistían el estado `false`.
  - Causa raíz: switches que se desmárcan en admin volvían visibles los elementos por el flag `show*` no se guardaba como `false` explícito (se omitía del payload).
  - Solución: agregados `initialValues` basados en `configInstance.show*` y coerción explícita con `?? false` antes de enviar el payload `PUT`.
  - Documentado en troubleshooting #57: `docs/troubleshooting/57-social-catalog-admin-visibility-toggles-not-persisting-false.md`

### 🔧 Alineado con v5 Plan (SC-02, SC-03, SC-05)
- **SC-02 - Toolbar Móvil Responsiva de 2 Filas:** implementado layout flex-wrap en `.toolbar-filters-mobile` para envolver botones cuando el ancho de pantalla es < 768px.
- **SC-03 - Badges de Stock "¡Última unidad!":** renderización de badge cuando `stock === 1` (exacto) en los tiles de producto.
- **SC-05 - Ordenamiento Admin Unificado:** integrado `sortBy: 'admin'` con fallback a `adminSortLabel` configurable desde el panel de administración.

## [1.20.18] - 2026-08-24

### 🐛 Fixed (Social-Catalog / Multi-Instance Config & UX)
- **Persistencia por `instanceKey` en Panel de Administración:**
  - Corregido bug crítico en el envío de configuración donde `handleSave` en `/admin/social-catalog` no incluía `instanceKey: selectedInstanceKey` en el payload `PUT`, provocando que las modificaciones de visibilidad (Razón Social, Filtros, Buscador, Dirección, etc.) sobreescritas en instancias como `menudigital` se guardaran siempre en la instancia `default`.
  - Actualizado el endpoint backend `PUT /api/v1/social-catalog/config` (`social-catalog-admin.controller.ts`) para procesar `instanceKey` y actualizar la instancia seleccionada correctamente.
- **Aislamiento de Caché Local:**
  - Parametrizadas las funciones `readCachedConfig` y `writeCachedConfig` con una clave compuesta `social-catalog-config:${subdomain}:${instanceKey}` para evitar colisiones de caché entre instancias o tenants en `localStorage`.
- **UX/UI & Dark Mode Adjustments:**
  - **Fondo de Página en Modo Oscuro:** `bodyBg` ahora utiliza los tokens de superficie oscura del tema (`cssVars.bgApp`, `#0f172a`) cuando el visitante activa el tema oscuro, manteniendo el color personalizado del admin en modo claro.
  - **Avatar Circular del Logo:** Actualizado a `objectFit: 'cover'` por defecto y sustituido el borde estático `#fff` por `border: 4px solid ${cssVars.bgSurface}`, logrando un recorte limpio y centrado del logo.
  - **Paginador Inferior:** Oculto automáticamente cuando la tienda está configurada en modo acordeón desplegable (`categoryLayoutMode === 'accordion'`).

### 🚀 Added / Enhanced (Social-Catalog v5)
- **SC-02 - Toolbar Móvil Responsiva:** Layout de 2 filas para `< 768px` (Fila 1: Buscador full-width; Fila 2: Categorías, Filtros, Orden). Desktop: layout original de una fila. Toggle cliente vista lista/tarjeta con persistencia `localStorage`.
- **SC-03 - Alertas de Inventario:** Badge "¡Última unidad!" (stock === 1) ahora se muestra correctamente en todos los modos (card, list, detail). Integración con `stockStatus` del backend (`last_unit`, `low_stock`, `out_of_stock`). Reemplazado icono emoji `📢` por `InfoCircleOutlined`.
- **SC-05 - Orden Admin Unificado:** Criterio `sortBy=admin` fusiona Carta física y Manual. Alias `carta_fisica`/`manual` → `admin` para compatibilidad. Configurable `adminSortLabel` en admin. Orden de categorías configurable (`categoryOrder`).
- **SC-06 - Banner Destacado Modo A (Tag):** endpoint `GET /api/v1/public/social-catalog/featured` con filtro por tag (`featuredTagId`); carousel autoplay en frontend público con badge stock integrado.
- **SC-07 - Banner Destacado Modo B (Manual):** modelo Prisma `CatalogFeaturedProduct` (tenantId, instanceKey, productId, order); CRUD admin (`/featured-products` + `/featured-products/order`); drag & drop reorder con `PATCH`; picker multi-selección en admin. Frontend reutiliza el carousel del SC-06.
- **Bugfix - Visibility Toggles Persistence:** Switches `show*` desmarcados en admin ahora persisten `false` correctamente. Documentado en troubleshooting #57.
- **Dark Theme Contrast Improvement:** Tokens dark mode ajustados (`text.primary: #F1F5F9`, `text.secondary: #CBD5E1`, `text.muted: #94A3B8`) para mejor contraste ≥ 4.5:1.
- **Client-Side View Mode Toggle:** Estado `clientViewMode` con persistencia en `localStorage` (`social-catalog-view-mode`). UI con iconos `BarsOutlined` (lista) y `AppstoreOutlined` (tarjetas).

## [1.20.17] - 2026-08-24

### 🚀 Added / Enhanced (Core / Social-Catalog / OmniCatalog)
- **Evaluación del Estado del Arte & Alineación v5:**
  - Implementada la Toolbar Móvil responsiva de 2 filas para pantallas `< 768px` (Fila 1: Buscador full width; Fila 2: Categorías, Filtros, Orden).
  - Badges de inventario extendidos (SC-03): badge `AGOTADO` (`<=0`), `¡Última unidad!` (`===1`) y `Pocas unidades` (`1<stock<=5`).
  - Consolidado el criterio `sortBy=admin` (SC-05) fusionando Carta física y Manual con soporte para la etiqueta configurable `adminSortLabel`.

### 🐛 Fixed
- **Frontend TSX Syntax Repair:** Eliminadas 85 líneas de código JSX huérfano y duplicado en `frontend/src/pages/social-catalog.tsx`. Resueltos cierres desbalanceados de tags y colisión de variable `showFilters`. Compilación `npm run build` 100% limpia.
- **Backend ProductsService & SocialCatalogService:** Corregida falta de llave de cierre en `ProductsService` (`products.service.ts`), eliminada propiedad `active` en `Tag.create` y tipado explícito `(c: string)` en `social-catalog.service.ts`.

## [1.20.11] - 2026-08-18

### 🚀 Added / Enhanced (Infraestructura / Deploy Manager & Odoo Provisioning)
- **Visualización Instantánea y Estado del Deploy:**
  - El Wizard `/admin/deploy` ahora crea la estructura de la instancia en DB (estado `pending`) y cierra el modal al instante para dar visibilidad inmediata en la lista de instancias.
  - Habilitada la consulta y stream de logs en vivo mientras Odoo ejecuta su aprovisionamiento en background.
- **Soporte Diferenciado para Recetas & Listas de Materiales (BoM):**
  - Separación entre **MRP BoM (`mrp.bom`)** para recetas de cocina y fabricación, y **POS BoM (`pos.combo`)** para combos y recetas comerciales del Punto de Venta.
  - Añadidas tarjetas de subida independientes en el Wizard: `4a. LdM Fabricación (MRP BoM)` y `4b. Recetas Combos (POS BoM)`.
- **Carga Masiva de Usuarios, Empleados, PIN POS & Contactos Categorizados:**
  - Ingesta de **Usuarios Odoo (`res.users`)** con rol y contraseña.
  - Auto-creación de **Ficha de Empleado (`hr.employee`)** con PIN de seguridad para cajeros/meseros en el POS.
  - Ingesta de **Contactos Categorizados (`res.partner`)** distinguiendo Clientes (`customer_rank`), Proveedores (`supplier_rank`) y Empleados.
  - **Configuración de PDVs (`pos.config`)** activando el modo `module_pos_hr` y vinculando automáticamente la lista de empleados autorizados.
- **Grilla de Plantillas CSV de Ingesta:**
  - Añadidos botones de descarga en un clic para las 8 plantillas CSV oficiales de aprovisionamiento zero-touch.

### 🐛 Fixed
- **Troubleshooting #33 (Traefik Write Failure):**
  - Inyectada la creación recursiva automatizada (`fs.mkdir(..., { recursive: true })`) para el directorio `/opt/traefik-orderflow/dynamic/deploy-manager` evitando errores de permisos / ENOENT al generar rutas YAML.
- **Sincronización JSON a CSV:**
  - Conversión del mapa de salón y mesas `pos_floors.json` a `pos_floors.csv` homologado.

---

## [1.20.8] - 2026-08-14

### 🚀 Added / Changed (FEAT-065 + FEAT-066)
- **Schema Decoupling (Fase 3 - Bio-Links):**
  - Schema standalone propio en `services/biolinks-standalone/prisma/schema.prisma` (`BioLink`, `BioLinkClick`).
  - Cliente Prisma aislado generado (`biolinks-client`).
  - Refactor de `biolinks-standalone` a `PrismaService` + `CoreHttpService` propio, sin dependencias del schema monolítico.
- **Rebranding OmniFlow (FEAT-066):**
  - Estandarización de nombres comerciales: OmniBio (`biolinks-standalone`), OmniCatalog (`social-catalog-standalone`), OmniBookings (`bookings-standalone`).
  - Retrocompatibilidad total en rutas legacy (`/api/v1/bio`, `/api/v1/standalone/social-catalog`, `/api/v1/bookings`).
  - Labels UI actualizadas en `frontend/src/components/Sidebar.tsx` manteniendo rutas legacy.
  - Documentación de brand y mapeo de rebranding actualizada en `docs/brand/` y `docs/planes/SCHEMA_DECOUPLING_PLAN.md`.

### 🐛 Fixed
- Imports legacy `../common/...` corregidos a `./common/...` en `biolinks-standalone` para resolver correctamente módulos locales.
- Specs legacy obsoletas eliminadas de `biolinks-standalone` para evitar errores de compilación en `nest build`.

### ✅ QA / Validación
- `./scripts/init.sh` OK: 74 suites / 580 tests passed.
- Backend + Frontend builds limpios.
- E2E QA (Playwright): 0 JS errors, 0 HTTP 502/404.

---

## [1.20.9] - 2026-08-14

### 🚀 Added / Changed (FEAT-011 + FEAT-012)
- **Réplica Standby Mejorada (FEAT-011):**
  - Script `replica-prom
  ote.sh` mejorado con verificación de conexión post-promoción.
  - Procedimiento de failover actualizado en `docs/backups.md`.
- **Mobile Alignment (FEAT-012):**
  - `mobile/package.json` y `mobile/app.json` alineados a **OmniFlow**.
  - Cliente móvil centralizado bajo `/api/v1` en `mobile/src/services/api.ts`.

### ✅ QA / Validación
- `./scripts/init.sh` OK: 74 suites / 580 tests passed.
- Backend + Frontend builds limpios.
- E2E QA (Playwright): 0 JS errors, 0 HTTP 502/404.

---

## [1.20.10] - 2026-08-14 (En desarrollo)

### 🚀 Added / Changed (Deploy Manager Odoo)
- **Deploy Manager Odoo:** despliegue y ciclo de vida multi-sistema desde Super Admin (FEAT-060/actualización).
- Esta versión incluye el deploy-manager de Odoo en curso.

---

## [1.20.7] - 2026-08-13

### 🚀 Added
- **Provisioning Autónomo Self-Service (`register-tenant`):**
  - Endpoint backend público `POST /api/v1/auth/register-tenant` para creación instantánea de tiendas/tenants, asignación de usuario `OWNER` con `UserRole.ADMIN` e instalación por defecto del módulo `biolinks` (Plan FREE).
  - Pestaña *"Crear mi Catálogo Gratis"* en `/login?mode=register` con auto-login e ingreso inmediato a `/admin/biolinks`.
- **Rediseño de Landing Page Comercial "Punta de Lanza":**
  - Tagline *"Tu biografía no es solo un directorio de links: es tu nueva caja registradora"* y propuesta 0% comisiones.
  - *Calculadora Interactiva de Ahorro* en React para simulación de ventas vs. 12% Linktree Free.
  - Conmutador interactivo *Tab Switcher Bio-Links vs. Social Catalog* y *Matriz Comparativa Destructiva*.
- **Optimización Edge Core Performance:**
  - Purga atómica de claves Redis (`cache:biolink:${slug}`, `bio:${slug}`, `catalog:tenant:${tenantId}`) en `BioLinksService`.
- **Documentación & QA E2E Comercial:**
  - Guía técnica `docs/user-manuals/07-flujo-comercial-end-to-end.md` y runner automatizado Playwright `scripts/manual_flows/commercial_flow.py`.
- **Restauración en Sidebar:**
  - Separación limpia en el menú lateral entre `BioLinks (Link-in-Bio)` (`/admin/biolinks`) y `Diseño Web & Portada` (`/admin/homepage-builder`).

---

## [1.20.6] - 2026-08-13

### 🐛 Fixed
- **Root domain landing (BUG #36):** el dominio raíz `/` ahora renderiza `LandingBioLinksCatalog` (spearhead landing page) en vez del catálogo e-commerce cuando hay sesión iniciada. Refactor de `frontend/src/App.tsx` + nuevo `frontend/src/pages/LandingBioLinksCatalog.tsx`.
- Documentada entrada de troubleshooting `36-root-domain-ecommerce-vs-landing-bug`.

---

## [1.20.5] - 2026-08-13

### 🚀 Added / Changed (FEAT-065 - Social Catalog Standalone Extraction)
- **Schema Decoupling (Fase 2 - Social Catalog):**
  - Schema monolítico: eliminado `MessagingChannel` enum y modelo `CatalogChannelConfig`.
  - `RetentionRule.channel` cambiado de `MessagingChannel` a `String` + agregado campo `config Json?`.
  - `FollowUpJob` mantiene `channel` como String (no enum).
  - Adapters de mensajería (WhatsApp, Telegram, Instagram, Messenger, Custom Webhook) desacoplados del Prisma monolítico: ahora reciben `config` vía payload.
- **Social Catalog Standalone (`services/social-catalog-standalone/`):**
  - Nuevo microservicio con su propio schema Prisma (`MessagingChannel` + `CatalogChannelConfig`).
  - Cliente Prisma aislado generado (`social-catalog-client`).
  - Endpoints CRUD para canales de mensajería (`/api/v1/standalone/social-catalog/channels`).
  - Build y tests validados.
- **Core (OrderFlow monolito):**
  - `SocialCatalogService` y `SocialCatalogAdminController` usan `HttpService` para proxy hacia standalone.
  - `FollowUpQueueProcessor` pasa `config` de regla al adapter.
  - Eliminados imports de `CatalogChannelConfig` y `MessagingChannel` del core.
  - Migración de datos one-way script actualizado: `backend/src/social-catalog/migrations/migrate-whatsapp-to-social.ts`.
- **Validación completa:**
  - `prisma generate` OK (core + standalone).
  - 74 test suites / 580 tests passed.
  - Backend + Frontend builds limpios.
  - E2E QA (Playwright): provecchio.com + admin routes HTTP 200, sin errores JS.

---

## [1.20.4] - 2026-08-13

### 🚀 Added / Changed (FEAT-064 - Schema Decoupling + FEAT-065 - Social Catalog/Bio-Links)
- **Schema Decoupling (Fase 0 + Fase 1 Giveaways):**
  - `backend/prisma/schema.prisma` documentado con bounded contexts (Platform Core / Commerce Core / Feature Modules).
  - Schema standalone de Giveaways creado en `services/giveaways-standalone/prisma/schema.prisma`.
  - Cliente Prisma aislado generado (`giveaways-client`).
  - Script de migración idempotente: `services/giveaways-standalone/scripts/migrate-from-core.ts`.
  - Schema PostgreSQL `giveaways` creado y tablas migradas en producción.
- **Arquitectura:**
  - Separación de deploys OrderFlow vs Odoo documentada en `docs/guides/odoo-deploy-standardization.md`.
  - Fase 1 Social Catalog + Bio-Links planificada en `docs/planes/SCHEMA_DECOUPLING_PLAN.md`.

---

## [1.20.1] - 2026-08-12

### 🚀 Added / Changed (FEAT-059 - Infrastructure Deploy Manager + FEAT-060 - Manuales con Playwright)
- **Backend `deploy-manager` (multi-sistema):**
  - CRUD de `Server` e `DeployInstance` con discriminador `system` (`odoo | orderflow | axon | aieer | vitalog | leadqualifier | other`).
  - Endpoints protegidos por `ApiKeyGuard` + `PermissionsGuard` + `infra:deploy` + `isSuperAdmin`.
  - Lifecycle actions: `deploy`, `start`, `stop`, `restart`, `backup`, `restore`, `status`.
- **Odoo Deploy Real:**
  - `OdooDeployHandler` ahora ejecuta el `deploy.sh` real del servidor por SSH en lugar de generar un template.
  - Soporte para flags `--clean`, `--with-products`, `--import-data`, `--edition`, `--version`.
  - Generación de passwords aleatorios y retorno de `deploymentReport` con credenciales.
  - Estructura canónica de directorios: `/srv/odoo-deploy/<version>/<tenant>/`, `/srv/odoo-addons/<version>/`, `/srv/odoo-l10n-py/<version>/`.
- **Post-deploy Odoo:**
  - `OdooIntegrationService`: instala módulo `orderflow_connect` vía SSH y prepara conexión tenant↔Odoo.
  - Actualización de `Tenant.odooConnection` tras deploy exitoso.
- **Frontend Wizard:**
  - Campos de versión y edición (`ce` / `ee`) en formulario de instancia Odoo.
  - Checkboxes para `--clean` y `--import-data`.
  - Modal de informe de deploy con passwords copyables y rutas de addons/l10n.
- **Validaciones centralizadas:**
  - `DeployValidationService`: puerto libre, dominio único, validación Traefik.
- **Integración Traefik real (file provider):**
  - `DeployTraefikService`: escribe routers/services dinámicos en `/opt/traefik-orderflow/dynamic/deploy-manager/`.
  - Auto-reload por `watch: true`; borrado de rutas al eliminar instancia.
- **Ejecución SSH real:**
  - `DeploySshService` con `ssh2`: ejecución remota, escritura de archivos, `docker compose up/down/ps`, `docker exec`.
- **UI Super Admin:**
  - Página `/admin/deploy` con dashboard, CRUD servidores/instancias, wizard de creación, detalle con acciones y drawer de lifecycle.
  - Acceso desde menú lateral: **Super Admin → Infraestructura / Deploy**.
- **Documentación:**
  - `docs/guides/odoo-deploy-standardization.md` extendido a `deploy-manager` genérico multi-sistema.
  - `docs/timeline.md` con línea de tiempo completa, matriz de avance, troubleshooting histórico y métricas.
  - Landing page: sección “Evolución de OmniFlow” con `Timeline` y acceso a `/docs/timeline.md`.
  - `docs/planes/PLAN_ODOO_PROVECCHIO_DEPLOY.md` con plan detallado para deploy de Odoo 18 en Provecchio.
- **Manuales de usuario automáticos (FEAT-060):**
  - `scripts/generate_user_manual.py`: generador de manuales con screenshots automáticos usando Playwright.
  - Modos: `--flow`, `--all`, `--markdown`, `--html`.
  - Flujos definidos en `scripts/manual_flows/`.
  - Salida en `docs/manual/screenshots/` y `docs/manual/*.md`.
  - Galería navegable en `docs/manual/index.html`.

---

## [1.20.2] - 2026-08-13

### 🚀 Added / Changed (UX/UI Mobile Admin)
- **Mobile Navigation Drawer:**
  - `Sidebar` en mobile ahora renderiza como `Drawer` overlay en lugar de acordeón inline.
  - `Topbar` mobile compacto: hamburger + tenant name truncado + theme toggle + Ver Tienda icon-only + perfil.
  - Cierre automático del drawer al navegar o tocar fuera.
  - `MobileBottomNav` mantiene 5 destinos frecuentes con safe-area respetada.
- **Desktop sin regresiones:**
  - `Sider` colapsable/expandible mantiene comportamiento previo.
  - Estado `drawerOpen` aislado de desktop.

---

## [1.20.4] - 2026-08-13

### 🚀 Added / Changed (Orders Debug)
- **State Machine:**
  - `updateStatus` ahora valida transiciones permitidas (`DRAFT → CONFIRMED/CANCEELLED`, etc.) y rechaza inválidas con `400`.
- **Cancel Seguro:**
  - Bloquea cancelación de `DELIVERED`.
  - Repone stock si aplica.
  - Genera `cashMovement` de reversión (`OUT`).
  - Emite WS a KDS/POS.
- **Confirm Idempotente:**
  - Si ya está `CONFIRMED`, devuelve el pedido sin error ni doble stock/caja.
- **Tests:**
  - 17 casos en `orders.service.spec.ts`, incluyendo nuevos escenarios de `updateStatus` y `cancel`.

---

## [1.19.0] - 2026-08-10

### 🎨 Added / Changed (Rebranding Parcial - Capa Visible)
- **Marca pública:** se adopta **OmniFlow** como nombre visible para clientes y usuarios finales.
- **Capa técnica mantenida:** el código, APIs, tablas, variables, colas, jobs, endpoints, imágenes Docker y rutas Traefik siguen bajo **OrderFlow** para preservar compatibilidad productiva.
- **Frontend:**
  - Landing page renombrada a `omni-flow-landing.tsx` y textos actualizados.
  - `App.tsx`, `main.tsx`, `i18n/index.ts`, `BrandingProvider.tsx` y `Sidebar.tsx` actualizados a marca pública OmniFlow.
  - `index.html`: título y meta tags actualizados.
- **Documentación técnica:**
  - `docs/00-contexto-agentes.md`: aclarada convención de marca (OmniFlow público / OrderFlow técnico).
- **Nota:** este release es 100% compatible hacia atrás; no hay breaking changes en APIs ni esquemas.

## [1.18.2] - 2026-08-10

### 🧪 Added / Changed (E2E Coverage + Integration Flows)
- **E2E QA ampliada (`scripts/qa_e2e_check.py`):**
  - Agregada ruta `/admin/follow-up-rules` al smoke test de navegación admin.
- **Tests de integración backend:**
  - `orders.seller-attribution.integration.spec.ts`: flujo completo de seller attribution (SELLER auth, DTO, líneas).
  - `follow-up.flow.integration.spec.ts`: flujo end-to-end de follow-up (regla -> job -> cola -> adapter -> cooldown).
- **QA:** `./scripts/init.sh` validado.

## [1.18.1] - 2026-08-10

### 🧪 Added / Changed (Test Coverage + Policy)
- **Tests unitarios Follow-Up Omnicanal (FEAT-056):**
  - `follow-up.service.spec.ts`: cobertura de `scheduleCartAbandoned`, `scheduleBookingReminder`, `cancelJobsForOrder`, `checkCooldown`, `interpolateVariables`, CRUD de reglas, `retryJob`.
  - `follow-up-queue.processor.spec.ts`: cobertura de cancelación, regla inactiva, order confirmada, envío por adapter, fallo en max attempts.
  - `follow-up-queue.producer.spec.ts`: cobertura de encolado con opciones BullMQ y cancelación.
  - `whatsapp-web-engine.adapter.spec.ts`: URL con `sellerId` y stub de envío.
  - `custom-webhook.adapter.spec.ts`: mock de `fetch` para verificar payload JSON.
- **Tests unitarios Seller Attribution (FEAT-057):**
  - `orders-export.controller.spec.ts`: export CSV con columnas seller/trafficSource.
  - `orders.service.spec.ts`: sellerId desde DTO, auto-set para rol `SELLER`, propagación por línea.
- **Testing Policy (`.kilo/testing-policy.md`):**
  - Estándar mínimo de tests por tipo de cambio (backend services, controllers, queues, adapters, frontend, E2E).
  - Flujo de desarrollo obligatorio con checklist pre-merge.
  - Regla de bloqueo: no se mergea ni depliega sin suite actualizada.
- **QA:** `./scripts/init.sh` validado (tests + builds + E2E Playwright sin errores).

## [1.18.0] - 2026-08-10

### 🚀 Added / Changed (FEAT-056 + FEAT-057)
- **Follow-Up Omnicanal (FEAT-056):**
  - `IMessagingAdapter` extendido con `sendMessage()` y `SendMessagePayload`.
  - Nuevos adaptadores: `WhatsappCloudApiAdapter` (Meta HSM), `WhatsappWebEngineAdapter` (texto libre/queue stub).
  - `sendMessage()` implementado en WhatsApp/Telegram/Instagram/Messenger/CustomWebhook.
  - Split de `MessagingChannel`: agregados `WHATSAPP_CLOUD_API` y `WHATSAPP_WEB_QR`.
  - Modelos Prisma: `RetentionRule`, `FollowUpJob`, `RetentionEventType`, `FollowUpJobStatus`.
  - Cola BullMQ `follow-up-jobs` (producer/processor) con 3 reintentos y backoff exponencial.
  - `FollowUpService`: scheduling/cancelación/cooldown/interpolación + CRUD de reglas.
  - `FollowUpCronService`: cron cada 5min para pendientes/fallidos; limpieza cada 6h.
  - Integración bookings: `sendBookingReminder()` movido a cola (reemplaza envío síncrono).
  - Integración orders: DRAFT agenda cart-abandoned; CONFIRMED cancela follow-up jobs.
  - Endpoints admin: `GET/POST/PATCH/DELETE /follow-up/rules`, `GET /follow-up/jobs`, `POST /follow-up/jobs/:id/retry`.
  - Frontend: panel admin `follow-up-rules.tsx` + ruta `/admin/follow-up-rules`.
  - RBAC: permisos `follow-up:read` y `follow-up:write`.
- **Seller Attribution Engine (FEAT-057):**
  - Schema: `sellerId` + `trafficSource` en `Order`; `sellerId` en `OrderLine`.
  - `CreateOrderDto` extendido con `sellerId`, `trafficSource` y `sellerId` por línea.
  - `OrdersService.create()` autocompleta seller desde JWT `SELLER` (`crm_assisted`) o DTO (`social_catalog`).
  - Frontend social catalog: captura `?seller=` en `sessionStorage` (24h) y lo adjunta al checkout.
  - Frontend POS: selector de vendedor + envío de `sellerId` + `trafficSource: pos_counter`.
  - Export CSV: `GET /api/v1/orders/export` con columnas de seller/traffic source.
- **QA:** `./scripts/init.sh` validado (523/523 tests, builds limpios, E2E Playwright sin errores).

### 🛠️ Changed
- Actualización de `featurelist.json` con FEAT-056 y FEAT-057.
- Alineación de rutas y permisos para panel de retención.

## [1.17.0] - 2026-08-09

### 🎨 Design Tokens & Dark Mode Contrast (Prompt_Implementar_tokens)
- **Tokens CSS** (`styles/admin-mobile.css`): semánticos `--success/--warning/--danger/--info` (+ bg/border) en light/dark/prefers-color-scheme; utilidades `.text-*`, `.panel-*`; overrides Ant Design (cards, buttons, modals, dropdowns, selects).
- **Ant Design Theme** (`theme/theme.ts`): `colorSuccess`, `colorWarning`, `colorError`, `colorInfo` + `colorTextTertiary` en light/dark tokens.
- **modules.tsx**: Card módulo con `var(--bg-surface)`, `var(--success-border)`, `.module-card--installed`; Selector Tenant → `.panel-info`; Botón backup `var(--success)`; README modal tokens; Títulos `var(--text-primary)`; Grid `gutter={[16,16]}`.
- **UserProfileMenu.tsx**: Avatar `--accent`; textos `--text-primary/secondary`; Modal tenant `--bg-surface/--bg-elevated`, items `--bg-elevated/--menu-selected/--bg-muted`; Badge Activo `--success`; Cancelar `--bg-elevated`; Quitados `#e6f7ff`, `#666`, `#999`, `#1890ff`, `white`.
- **integrations.tsx**: 3 cards comparación → `.panel-success`/`.panel-info`/`.panel-warning`; Config panel tokens; Quitados `#f6ffed`, `#e6f7ff`, `#fff7e6`, `#52c41a`, `#1677ff`, `#fa8c16`.
- **pos.tsx**: Mesa seleccionada `border: var(--accent)`, `background: var(--menu-selected)`; Total `var(--accent)`; Botones sin hardcodes (`#22c55e`, `#2563eb`, `#111827`); `Space` → `div` flex.
- **Refactor estético global:** migración de ~150 hardcodes de color en páginas admin y componentes a design tokens CSS (`homepage-builder`, `biolinks`, `giveaways`, `super-admin-dashboard`, `loyalty`, `social-catalog`, `kds`, `subscription`, `bookings`, `customers`, `quotations`, `spa-dashboard`, `contacts`, `DashboardKPIs`, `CartDrawer`, `ThemeToggle`, `TenantSwitcher`, `ChannelSelector`, `ProductChannelPreview`, `MobileBottomNav`).
- **Unificación de Tags:** reemplazo de `<Tag color="blue|green|red|orange|purple|cyan|magenta|gold">` por estilos semánticos con tokens (`var(--accent)`, `var(--success)`, `var(--danger)`, `var(--warning)`, `var(--info)`).
- **Nuevo export TypeScript:** `frontend/src/theme/tokens.ts` con `designTokens`, `cssVars`, `getDesignTokens(mode)`, `applyCssVars(mode)`.
- **Quotes fix**: comillas dobles en template strings JSX (`"var(--token)"`).
- Versión tag: `v1.17.0`.

### 🚀 Added / Improved (Odoo Adapter ↔ OrderFlow Invoice Sync)
- **FEAT:** `odoo-adapter/src/odoo-client.js` — compatibilidad corregida en `createCustomerInvoice` y `postInvoice` (`execute` unificado para Odoo 19 CE JSON-RPC y XML-RPC).
- **FEAT:** `odoo-adapter/src/index.js` — nuevo endpoint `POST /webhook/orderflow/invoice-posted` integrado al `OdooInvoicePlugin` para sincronización automática de comprobantes de ventas `account.move`.
- **FEAT:** `backend/src/products/products.controller.ts` — fallback dinámico `os.tmpdir()` para `FileInterceptor` en tests unitarios para prevenir errores EACCES.
- **QA:** Barrera de calidad `./scripts/init.sh` validada exitosamente (65 test suites NestJS pasadas, 523 unit tests, Vite React build limpio y auditoría E2E Playwright con cero errores HTTP/JS).

---

## [1.16.3] - 2026-08-09

### 🛠️ Fixed (Sidebar Module Permissions Filtering)
- **FEAT:** `Sidebar.tsx` — filtro de visibilidad por módulo instalado/activo y permisos JWT.
  - Mapeo `moduleId`/`permission`/`superAdminOnly` por ítem de menú.
  - Función `canShowItem`: superAdminOnly → moduleId+isModuleActive → permission.
  - Grupos sin ítems visibles desaparecen.
  - Props nuevas: `isModuleActive`, `permissions`, `modulesStatus`.
  - Fallback loading/error: solo core modules + ítems sin moduleId.
- **FEAT:** `AdminApp.tsx` — pasa `isModuleActive`, `permissions`, `modulesStatus` al Sidebar.
  - Extracción de permisos del JWT (`payload.permissions`/`perms`/`roles`).
  - Estado `modulesStatus`: `'loading' | 'ready' | 'error'` para evitar menú fantasma.
  - Rutas protegidas por `isModuleActive` (defensa en profundidad) — preparadas.
- **FEAT:** `MobileBottomNav.tsx` — mismo filtro `canShowItem` con props `isModuleActive`, `permissions`, `isSuperAdmin`.
- Versión tag en header actualizado a `v1.16.3`.

---

## [1.16.2] - 2026-08-09

### 🛠️ Fixed (Sidebar Collapsible Groups Bug)
- **FIX:** `Sidebar.tsx` — grupos del menú lateral ahora son colapsables (acordeón) con `useMemo` para estabilidad de referencias.
  - `menuItems` memoizado según `isSuperAdmin` para evitar recreación en cada render.
  - `handleOpenChange` simplificado: detecta `newKey` vs `openKeys` actual para acordeón real.
  - `useEffect` para ruta activa usa `menuItems` memoizado estable.
  - Fix: click en categoría ahora expande/colapsa correctamente en lugar de recargar la ya abierta.
  - Versión tag en header actualizado a `v1.16.2`.

---

## [1.16.1] - 2026-08-07

### 🛠️ Fixed (Admin Dark Mode & Deploy Robustness)
- **FIX:** Reemplazo de fondos hardcodeados (`#fafafa`, `#f5f5f5`, `#fff`, `#f0f0f0`) por tokens CSS variables en panel admin.
  - `src/styles/admin-mobile.css`: parche completo con design tokens `light/dark`, utilidades theme-aware (`.bg-subtle`, `.bg-muted`, `.bg-elevated`, `.text-secondary`), `.admin-placeholder/-lg/-md`, `.admin-panel-muted`, overrides Ant Design y fallbacks para estilos inline.
  - `src/pages/admin/dashboard.tsx`: 3 placeholders del dashboard ahora usan `.admin-placeholder` (sin `backgroundColor: '#fafafa'` inline).
  - Barrido en `integrations.tsx`, `modules.tsx`, `tenant-access.tsx`, `pos.tsx`, `contacts.tsx`, `social-catalog.tsx` (admin), `MobileBottomNav.tsx`, `ChannelSelector.tsx`, `UserProfileMenu.tsx`, `TenantSwitcher.tsx`, `ApiKeyConfig.tsx`.
  - Protegido storefront público, giveaway, biolink, landing y badges de estado (sin cambios no deseados).
- **FIX:** `scripts/deploy-production.sh` — escapado de comillas en mensaje de commit remoto para evitar error `ruta especificada ... no concordó con ningún archivo`.
- **FIX:** `frontend/.dockerignore` agregado para reducir build context y evitar hangs en `npm ci` por descarga de browsers de Playwright.
- **FIX:** Dashboard Tag de versión ahora lee `package.json` dinámicamente (antes hardcodeado `v1.16.0`).

### 🔒 Security (Tenant Image Isolation)
- Eliminado `serve-static` global de `main.ts` (servía TODO `/uploads` sin validación de tenant).
- `UploadsController` en `src/common/uploads.controller.ts`: endpoints por tenant con validación.
  - Admin: `GET /api/v1/uploads/{type}/{tenantId}/{filename}` (ApiKeyGuard + assert tenant).
  - Público: `GET /api/v1/uploads/public/{type}/{tenantId}/{filename}` (valida tenant activo).
- `products.service.ts` y `social-catalog.service.ts` transforman `imagesUrls` a endpoints por tenant.
- Frontend `getImageUrl` usa los nuevos endpoints (TenantHomepage, social-catalog público).
- **Build fix:** `UploadsModule` no se resolvía en Docker build (TS2307); se registró `UploadsController` directo en `AppModule`.

### 🛡️ RLS (Row Level Security) — Base de Implementación
- `tenant-rls.interceptor.ts` en `src/common/`, registrado como `APP_INTERCEPTOR` en `AppModule`.
- SQL scripts en `backend/prisma/rls/`: `001_enable_rls.sql`, `002_roles_and_grants.sql`, `003_verify_rls.sql`, `999_disable_rls.sql`.
- **Pendiente de aplicar en DB:** los scripts SQL aún no se ejecutaron contra PostgreSQL (requiere roles `orderflow_app` / `orderflow_migrator` y verificación de FKs del schema real).
- Eliminado `docs/orderflow_rls_postgresql/` (ya implementado).

### ⏸️ Deploy
- Production (pesallaccia.com): ✅ Completo.
- Provecchio (provecchio.com): ⏳ Pendiente — falló por timeout SSH al jump host (red), no por código. Reintentar mañana.

---

## [1.16.0] - 2026-08-06

### 🚀 Added (Admin UI/UX Overhaul)
- **FEAT-049:** Tema oscuro de primera clase en admin con toggle y persistencia en `localStorage`.
  - `frontend/src/theme/theme.ts`, `frontend/src/hooks/useTheme.ts`, `frontend/src/components/ThemeToggle.tsx`
  - Tokens CSS variables + Ant Design `ConfigProvider` con `theme.darkAlgorithm` / `theme.defaultAlgorithm`.
- **FEAT-050:** Sidebar agrupada por dominios (Operaciones / Catálogo & Canales / Relaciones / Sistema).
  - `frontend/src/components/Sidebar.tsx` con collapse en desktop y drawer en mobile.
- **FEAT-051:** Topbar mejorada con toggle de tema, chip de tenant y botón "Ver Tienda".
  - `frontend/src/components/Topbar.tsx`
- **FEAT-052:** Dashboard KPIs contextualizados con sparklines y empty states accionables.
  - `frontend/src/components/DashboardKPIs.tsx`, `frontend/src/components/EmptyState.tsx`
- **FEAT-053:** Catálogo Social admin con preview por canal (WhatsApp/Telegram/Instagram/Messenger).
  - `frontend/src/components/ProductChannelPreview.tsx`
  - Backend endpoint `GET /api/v1/social-catalog/products/:id/channel-preview`

---

## [1.15.1] - 2026-08-06

### 🚀 Added (Social Catalog Payments)
- **FEAT-013 Ext:** Integración de Pagopar en `social-catalog` checkout.
  - Backend: `PagoparSocialService` con creación de transacción y webhook propio en `/api/v1/social-catalog/webhooks/pagopar`.
  - `PaymentService` ahora soporta `gateway: 'pagopar'` además de `stripe` y `mercadopago`.
  - Frontend: opción "Pago con Pagopar" en el formulario de checkout del catálogo social.

---

## [1.15.0] - 2026-08-06

### 🚀 Added (Social Commerce Omnichannel Hub)
- **FEAT-48:** Refactorización completa de `whatsapp-catalog` a `social-catalog` (Catálogo Social Omnicanal).
  - **Backend:** Nuevo módulo `backend/src/social-catalog/` con arquitectura Strategy Pattern para canales de mensajería.
  - **Prisma Schema:** Enum `MessagingChannel` (WHATSAPP, INSTAGRAM, MESSENGER, TELEGRAM, CUSTOM_WEBHOOK) y modelo `CatalogChannelConfig` con relación a `Tenant`.
  - **Adapters:** `WhatsappAdapter`, `TelegramAdapter`, `InstagramAdapter`, `MessengerAdapter`, `CustomWebhookAdapter` con interfaz `IMessagingAdapter`.
  - **Migración:** Script `migrate-whatsapp-to-social.ts` que extrae `whatsappNumber` del JSON de `ModuleInstallation` y crea registros en `CatalogChannelConfig`.
  - **Frontend:** Utilidad `messaging-deep-links.ts` con `generateDeepLink`, `getChannelIcon`, `getChannelColor`, `getChannelLabel`. Componente `ChannelSelector` para selección de canal.
  - **Rutas:** Aliases legacy mantenidos (`/whatsapp-catalog` → `/social-catalog`, `/whatsapp-checkout` → `/social-checkout`).
  - **Webhooks:** Rutas de Stripe y MercadoPago migradas a `/api/v1/social-catalog/webhooks/`.

---

## [1.14.0] - 2026-08-06

### 🚀 Added (Core Architecture / EventBus, Queues, Inventory, Mapper & Audit)
- **FEAT-43:** Implementación de la cola duradera de eventos y webhooks con **BullMQ** y **Redis 7** (`backend/src/queues/`).
- **FEAT-44:** Arquitectura de Eventos Extensible e interna con **`EventsModule`** y `@nestjs/event-emitter` (`backend/src/events/`).
  - **`AppEventBusPublisher`:** Publicador centralizado de eventos de dominio (`OrderCreatedEvent`, `OrderStatusChangedEvent`, `BookingCreatedEvent`, `CustomerCreatedEvent`).
  - **`WebhookEventListener`:** Listener desacoplado que reacciona a eventos de órdenes y despacha de forma asíncrona hacia la cola BullMQ de FEAT-43.
- **FEAT-45:** Control de Inventario Multidepósito y Doble Entrada en `backend/src/inventory/` y `schema.prisma`.
  - **Entidades Prisma:** Modelos `Warehouse`, `Location`, `StockQuant` y `StockMove` con relaciones inversas en `Tenant` y `Product`.
  - **`InventoryService` & `InventoryController`:** Lógica transaccional para creación de depósitos/ubicaciones y ejecución de transferencias atómicas entre ubicaciones de origen y destino (`StockMoveState.DONE`).
- **FEAT-46:** Mapeador de Integraciones Configurable (`orderflow_connector`) en `backend/src/integrations/orderflow-connector/`.
  - **Modelo Prisma:** Entidad `IntegrationFieldMap` para almacenar reglas dinámicas de transformación JSON por tenant e integración (`ODOO`, `TANGO`, `SAP`, `CUSTOM`).
  - **`IntegrationMapperService` & `IntegrationMapperController`:** Motor de transformación dinámica con soporte para rutas anidadas (`customer.taxId` -> `vat`).
- **FEAT-47:** Auditoría Transaccional Ampliada en `backend/src/common/audit.service.ts` y `schema.prisma`.
  - **Campos Extendidos:** Clasificación por severidad (`INFO`, `WARNING`, `CRITICAL`) y metadatos JSON flexibles (`metadata`) para contexto transaccional en `AuditLog`.
- **Módulo de Colas (`QueuesModule`):** Módulo global NestJS configurado con conexión asíncrona a Redis para registro de colas.
- **Productor de Webhooks (`WebhookQueueProducer`):** Despacho asíncrono con reintentos exponenciales (*exponential backoff* en 5 intentos: 2s, 4s, 8s, 16s, 32s).
- **Procesador de Webhooks (`WebhookQueueProcessor`):** Consumidor con timeout de 10s y auditoría de eventos entregados o fallos permanentes en `AuditLog`.
- **Pruebas Unitarias:** Cobertura de tests unitarios completa para `EventsModule`, `QueuesModule`, `InventoryModule`, `OrderflowConnectorModule` y `AuditService` (67 test suites / 525 tests pasados).

---

## [1.13.2] - 2026-08-05

### 🛠️ Refactor (Deploy Robustness)
- **Entrypoint:** `backend/entrypoint.sh` now runs `prisma migrate deploy` (instead of `prisma db push --accept-data-loss`) and executes any provided command via `exec "$@"` instead of always starting the Nest app. This isolates schema/migration checks from application startup and respects migration history in production.
- **Deploy:** `deploy-production.sh` runs the migration verification with `--entrypoint 'npx prisma migrate deploy'`, so it executes `prisma migrate deploy` in isolation (no app startup). Fixes the false-positive `❌ Migrations failed` caused by Postgres connection exhaustion (`FATAL: too many clients already`) during the deploy container overlap.
- **Deploy:** Backend health check now uses `docker exec ... wget http://localhost:3010/api/v1/health` inside the container instead of `curl` against the host port (port 3010 is not published to the host). Fixes a false-positive `❌ Backend health check failed`.
- **Production DB:** Resolved stale failed migration records in `_prisma_migrations` (`20260614022842_init` and subsequent) so `migrate deploy` applies cleanly. The schema was already in sync via previous `db push`.

---

## [1.13.1] - 2026-08-05

### 🛠️ Refactor
- **Scripts:** Modified `init.sh` to accept flags (`--skip-e2e`, `--only-backend`, etc.) to prevent OS hangs on local development by allowing selective execution of validation steps. Changed Jest execution to `--maxWorkers=2` to bound CPU/RAM usage.
### 🧹 Cleanup
- **Branding:** Removed `Linktree` (direct competitor) from all system references across code, schema comments and documentation.
- **UI:** Removed `Odoo` from the Integrations admin menu label (`"Integraciones (Odoo)"` → `"Integraciones"`). Odoo integration code/adapter references are unchanged.
### 🔧 Build
- **Versions:** Aligned `backend/package.json` and `frontend/package.json` to `1.13.1` (was `1.13.0`).
### 📚 Documentación
- **Troubleshooting:** Added doc #25 (`25-init-sh-hangs-os.md`) explaining why `init.sh` saturates CPU/RAM and documenting the new flags as a solution.
- **Troubleshooting:** Updated `docs/troubleshooting/README.md` to index the new document #25.
- **Roadmap:** Incorporated 5 strategic milestones from `docs/Informe_Comparativo_Odoo_vs_OrderFlow.md` as `v1.16.0` (pre-K8s) targets: Durable Event Queue, Extensible EventBus, Multi-Warehouse Inventory, Configurable Integration Mapper and Expanded AuditLog.

## [1.13.0] - 2026-08-05

### ✨ Features
- **Contacts:** Added `taxId` duplicate detection — `create()` and `update()` now verify uniqueness per tenant, throwing `ConflictException` if a duplicate RUC/NIT exists.
- **Contacts:** Added `findOrCreateByEmail(tenantId, email, defaultData?)` to `ContactsService` — finds a contact by email or creates a new one with default data.
- **Contacts:** Added `findByEmail(tenantId, email)` to `ContactsService` — returns contact if found or `null`.
- **Contacts:** Added address propagation — when a company contact's address fields (`street`, `city`, `state`, `zip`, `country`) are updated, changes propagate to all child contacts via batch `updateMany`.
- **Contacts:** Added `getDisplayName()` computed resolver — returns `"Empresa, Contacto"` format when contact has a company parent, otherwise just `name`.
- **Contacts:** Added `resolveCommercialPartner()` — walks `parentId` chain up until `isCompany=true` to find the commercial entity root.
- **Contacts:** Added `convertToCompany(contactId)` — creates a new `isCompany=true` parent contact and links the original as a child.
- **Contacts:** Added `ContactAddress` model with CRUD endpoints — supports `contact`, `invoice`, `delivery`, `other`, `private` address types with `isDefault` flag.
- **Contacts:** Added `ContactCategory` and `ContactCategoryMap` (M2M) models with CRUD endpoints — tags/categories for contact segmentation.
- **Contacts:** Added `userId` field to Contact — assigns a sales representative to a contact.
- **Contacts:** Added `creditLimit` (Decimal) and `commercialPartnerId` (FK to contacts) fields.
- **Contacts:** Added `ContactBankAccount` model with CRUD endpoints — bank account data for payment processing.
- **Contacts:** Added `@@unique([tenantId, email])` and `@@unique([tenantId, taxId])` constraints to prevent duplicates.
- **Contacts:** Added new API endpoints: `GET/POST /contacts/by-email`, `GET /contacts/:id/display-name`, `GET /contacts/:id/commercial-partner`, `POST /contacts/:id/convert-to-company`, address/category/bank-account CRUD endpoints.
- **Deploy:** Fixed `deploy-production.sh` — added app-level health check, env var validation, Traefik backend network connect, migration timeout, and rollback improvements.
- **Troubleshooting:** Added doc #24 documenting deploy script bugs and fixes.

### 🐛 Bug Fixes
- **Contacts:** Fixed `parentId` field having zero propagation logic — now supports address sync and parent validation.

## [1.12.3] - 2026-08-05

### 🐛 Bug Fixes
- **Odoo Adapter:** Fixed Python f-string syntax (`f"INV-{invoice.invoice_id}"`) in `odoo-invoice.plugin.js` causing `SyntaxError` and container crash loop. Replaced with JS template literal `` `INV-${invoice.invoice_id}` ``.
- **Contacts:** Unified Users + Clients in Contacts module. Backfilled `Contact` records for existing `user_tenant_access` rows with NULL `contactId`; fixed `create-production-tenants.sql` to create and link `Contact` (`type=USER`, role `USER`) for every assigned user so they appear in `/admin/contacts`.

### ✨ Features
- **Contacts:** Added `?groupBy=email` query parameter to `GET /api/v1/contacts` for SuperAdmin — returns deduplicated rows grouped by email with `tenants[]` and `roles[]` arrays.
- **Contacts:** SuperAdmin can now create/update contacts and promote them to Users with password and access role (`ADMIN`, `MANAGER`, `SELLER`, `VIEWER`) via the `user` payload field.
- **Contacts:** `ContactsController` now injects `UsersService` and `UserTenantAccessService`; `syncUserForContact()` creates/updates User records and upserts `user_tenant_access` with the given role and linked `contactId`.
- **Contacts:** `ContactsModule` now imports `UsersModule` for dependency injection.
- **Contacts:** Frontend contacts page includes "Agrupar por Email" toggle for SuperAdmin (grouped deduped view), and password + access-level fields in the form when `USER` role is selected.
- **Users:** Added `findByEmail` method to `UsersService`.
- **Users:** Added `upsertAccess` (upsert instead of throw-on-conflict) to `UserTenantAccessService`; `assignAccess` kept as alias for backward compatibility.

## [1.12.2] - 2026-08-05

### 🐛 Bug Fixes
- **Admin:** Merge sidebar items Usuarios/Clientes into single Contactos entry.
- **Admin:** Guard `installedModules.some()` against non-array values to fix Contactos page crash (`U.some is not a function`).
- **Tests:** Fix `bookings.service.spec.ts`, `webhook-cron.service.spec.ts`, `product-imports.service.spec.ts` missing mocks/typing.

## [1.12.1] - 2026-08-04

### 🐛 Bug Fixes
- **Orders:** Mover side-effects (webhook, WebSocket KDS) fuera de la transacción de confirmación para separar commit de DB de notificaciones.
- **Orders:** Aplicar `discountAmount` consistente en `PATCH /api/v1/orders/:id/confirm` y persistirlo en metadata.
- **Orders:** Endurecer transición `DRAFT -> CONFIRMED` con `UPDATE WHERE status = 'DRAFT'` para evitar confirmaciones concurrentes.
- **Orders/Stock:** Agregar flag `allowNegativeStock` por tenant para controlar si se permite stock negativo al confirmar pedidos.
- **Orders/Cash:** Reemplazar upsert ad-hoc de `Integration` ("Caja - Ventas") por modelo formal `CashMovement` con registro individual por orden.

### 🛠️ Refactor
- **Schema:** Agregar modelo `CashMovement` y campo `allowNegativeStock` en `Tenant`.
- **Mobile:** Completar flujo client-first con historial y detalle de pedidos en `app/(tabs)/profile/orders`.
- **WhatsApp Catalog:** Agregar detalle de producto en modal, wishlist UI, reseñas mock, ordenamiento, paginación, compartir y ayuda en `whatsapp-catalog.tsx`.
- **Frontend/UX Mobile-First:** Reparar build frontend (`MobileBottomNav`, `bookings`, `super-admin-dashboard`, `whatsapp-checkout`) y completar FEAT-025.
- **Frontend/UX Desktop-First:** Rediseñar FEAT-037 como tenant switcher desktop-first en header de SuperAdmin, con FAB mobile-only.
- **QA/Auditoría:** Agregar workflow CI mínimo (`.github/workflows/ci.yml`), ESLint backend, Semgrep domain rules, scripts `lint`/`typecheck` y documentación de implementación en `docs/OrderFlow_Herramientas_Auditoria_Codigo.md`.
- **Deuda técnica:** Corregir `featurelist.json` (JSON inválido por trailing comma y features duplicadas fuera del array), aplicar code-split frontend en `vite.config.ts` (`manualChunks`) y eliminar warning de chunk >500kB.

### 📚 Documentación
- **Sprint:** Creado `docs/OrderFlow_v1.12.1_Informe_Sprint.md` con análisis diferencial y veredicto.
- **UX Mobile-First:** Actualizado `docs/guides/PLAN_UX_UI_MOBILE_FIRST.md` con estado completado.

## [1.12.0] - 2026-08-04

### 🚀 Features
- **Frontend Testing:** Configuración de Vitest + React Testing Library y tests iniciales para hooks y stores críticos.
- **UX/UI Mobile:** One-Page Checkout Express con modo express y autocompletado de direcciones.
- **UX/UI Mobile:** Navegación móvil adaptativa backoffice con Bottom Navigation Bar.
- **UX/UI Responsive:** Transformación de tablas admin a tarjetas responsive en customers y bookings.
- **UX/UI Desktop:** SuperAdmin Tenant Switcher flotante táctil.
- **UX/UI Desktop:** Refactorización de Dashboard a layout multi-columna.
- **Backend Testing:** Aumento de cobertura con service tests para billing, contacts, orders, webhook-cron, whatsapp-catalog y product-imports.
- **QA/E2E:** Suite Playwright para validar endpoints públicos de FacturaSend (401 unauthenticated).

### 🛠️ Refactor
- Reorganización de featurelist.json: renumeración de FEAT-029 duplicado a FEAT-041.
- Actualización de versiones a v1.12.0 en VERSION, package.json, README, ROADMAP, CHANGELOG.

## [1.11.0] - 2026-08-03

### 📚 Documentación
- **Plan de Sprint:** Creado `docs/PLAN_SPRINT_V1_11_0.md` con alcance, secuenciación y criterios de aceptación para v1.11.0/v1.12.0.
- **Contribución:** Renombrado `CONTRIBUTING.md` a `CONTRIBUTINGen.md` y creada versión en español `CONTRIBUTING.md`.
- **Análisis:** Agregado `docs/INFORME_MADUREZ_1.9.0_actualizado.md` con reevaluación de documentación.

## [1.10.0] - 2026-08-03

### 📚 Documentación
- **Gobernanza:** Creado `CONTRIBUTING.md` y `SECURITY.md` para colaboradores externos.
- **Escalabilidad:** Documentada estrategia de escalado horizontal de NestJS + microservicios.
- **Disaster Recovery:** Documentado procedimiento de backup/restauración y replicación PostgreSQL.
- **Monitorización:** Definido stack Prometheus + Grafana + Alertmanager con métricas y alertas.
- **SLA:** Creado `docs/sla.md` con acuerdos por plan (Startup, Professional, Enterprise).

## [1.9.0] - 2026-08-03

### 🚀 Features
- **Billing:** Integración de Pagopar como pasarela de pagos local (Paraguay) con webhook, DTOs y módulo dedicado.
- **Bookings:** Notificaciones post-reserva por WhatsApp Business API y sincronización automática con Google Calendar.

### 🛠️ Refactor
- **Integrations:** Agregados `GOOGLE_CALENDAR` y `WHATSAPP` al enum `IntegrationType`.
- **Schema:** Campo `googleCalendarEventId` en `AppointmentAssignment` para tracking de eventos.

### 📚 Documentación
- Creada `docs/guides/PAGOPAR_INTEGRATION.md`.
- Creada `docs/STAFFING_ARCHITECTURE_ANALYSIS.md`.

## [1.8.1] - 2026-08-03

### ⚙️ Proceso y Documentación
- **Proceso de Despliegue:** Formalizada y documentada la Fase 5 del proceso de despliegue, que incluye la verificación y sincronización explícita con el repositorio de GitHub (tags, changelog, roadmap) como paso final obligatorio.
- **Documentación:** Creado el documento `docs/guides/DEPLOYMENT_PROCESS.md` que detalla el procedimiento de despliegue en producción de 5 fases.
- **Protocolo de Agente:** Actualizado `AGENTS.md` para incluir la creación de `git tags` como parte del rol del Revisor/Auditor.

### 🚀 Despliegue v1.8.1 a Producción
- **Deploy a Hetzner:** Despliegue exitoso de v1.8.1 a producción (`pesallaccia.com`) y staging (`staging.pesallaccia.com`) mediante `./scripts/deploy-production.sh`.
- **Traefik v3.4:** Toda la documentación de Traefik actualizada de v3.3 a v3.4 en todos los documentos del proyecto.
- **Versión sincronizada:** `VERSION`, `backend/package.json`, `frontend/package.json`, `featurelist.json`, `README.md` y `ROADMAP.md` actualizados a v1.8.1.
- **Validación:** `./scripts/init.sh` pasado (54 suites / 444 tests, build backend y frontend limpios).
- **Troubleshooting:** Creada entrada `#20` en `docs/troubleshooting/` para el error de build de `AdaptiveTable` resuelto durante el despliegue.

## [1.8.0] - 2026-08-03

### 🧪 **Deuda Técnica: Aumento de Cobertura de Pruebas (Backend)**
- **Planificación:** Creado el documento `docs/PLAN_TESTING_COVERAGE_V1_8_0.md` para guiar el aumento de cobertura de pruebas del backend del ~45% al 70%.
- **Testing (`orders.service.spec.ts`):** Ampliada la cobertura de `OrdersService`, cubriendo escenarios de error y el caso de éxito para la función `confirm()` (actualización de stock, transacciones e integraciones).
- **Testing (`billing.service.spec.ts`):** Implementados los tests para el `BillingService`, cubriendo la delegación de webhooks a los servicios de Stripe y Mercado Pago, y el manejo de gateways desconocidos.
- **Testing (`contacts.service.spec.ts`):** Completada la cobertura de `ContactsService`, incluyendo la creación, actualización y la lógica `findOrCreateFromSource` para manejar contactos existentes y nuevos.
- **Testing (`integrations.service.spec.ts`):** Ampliada la cobertura de `IntegrationsService`, cubriendo tanto el envío exitoso a Odoo como el caso en que la integración no está activa.
- **Testing (`currency.service.spec.ts`):** Creado el archivo de especificaciones para `CurrencyService` con la estructura inicial para probar la lógica de cotizaciones.

## [1.7.0] - 2026-08-03

### 💻 **Refinamiento UX/UI Escritorio (Desktop-First Admin)**
- **Planificación:** Se ha creado el documento `docs/PLAN_DESKTOP_UX_REFINEMENT.md` que guiará la optimización de la experiencia de usuario en el backoffice de escritorio.
- **Frontend:** Se ha creado la hoja de estilos inicial `frontend/src/styles/admin-desktop.css` con media queries y reglas base para pantallas `>1200px`.
- **Roadmap:** Se ha actualizado el `ROADMAP.md` para incluir el nuevo objetivo `v1.7.0 — Refinamiento UX/UI Escritorio`.
- **Frontend (Core):** Se ha importado la nueva hoja de estilos `admin-desktop.css` en el punto de entrada de la aplicación para su aplicación global.
- **Frontend (Componente Adaptativo):** Se ha creado el componente `AdaptiveTable.tsx`, que renderiza una tabla de Ant Design en escritorio y una lista de tarjetas en móvil, aplicando la Fase 2 del plan de refinamiento de UX.
- **Frontend (Refactorización):** Se ha refactorizado la página de administración de Productos (`products.tsx`) para utilizar el nuevo `AdaptiveTable`, mejorando la experiencia tanto en escritorio como en móvil.
- **Frontend (Refactorización):** Se ha refactorizado la página de administración de Contactos (`contacts.tsx`) para utilizar el `AdaptiveTable`, unificando la experiencia de usuario en las vistas de lista principales.
- **Frontend (Refactorización):** Se ha refactorizado el Dashboard principal (`dashboard.tsx`) para utilizar un layout de múltiples columnas en escritorio, mejorando la densidad de información con KPIs y gráficos.

## [1.6.0] - 2026-08-03

### 📱 **UX/UI Mobile-First & Ergonomía Intuitiva**
- **Frontend (Catálogo/Checkout):**
  - Implementada `Sticky Action Bar` y `Bottom Sheets` para mejorar la experiencia de usuario en dispositivos móviles en el catálogo y checkout.
  - Desarrollado `One-Page Checkout Express` con integración de geolocalización y autocompletado de direcciones para agilizar el proceso de compra.
- **Frontend (Backoffice):**
  - Implementada `Navegación Móvil Adaptativa` con una `Bottom Navigation Bar` para el backoffice, optimizando la usabilidad en pantallas pequeñas.
  - Completada la `Transformación Responsive de Tablas Admin a Tarjetas` para todas las tablas principales del panel de administración, mejorando la visualización en móvil.
  - Desarrollado `SuperAdmin Tenant Switcher Flotante Táctil` para una gestión de tenants más eficiente en dispositivos táctiles.
## [1.5.2] - 2026-08-03

### 📄 **Análisis y Documentación del Ecosistema**
- **Documentación:**
  - Creado `docs/RESUMEN_ECOSISTEMA_Y_PROYECTOS.md` con un resumen completo del estado del arte de OrderFlow, Traefik y la Wiki.
  - Creado `docs/ANALISIS_METODOLOGIA_HUMANO_IA.md` con el análisis del modelo de desarrollo "Cyborg Lead Developer".

## [1.5.1] - 2026-08-02

### 🎨 **Responsive UX/UI Backoffice + Traefik v3.4 (QA-001)**
- **Frontend (admin pages):**
  - `admin-mobile.css`: CSS global responsive para mobile (<768px): header stack, tablas con scroll horizontal, touch targets 44px, modales con width adaptativo.
  - 17 páginas admin adaptadas: `customers`, `products`, `users`, `contacts`, `bookings`, `dashboard`, `giveaways`, `integrations`, `loyalty`, `quotations`, `spa-dashboard`, `subscription`, `super-admin-dashboard`, `tenant-access`, `whatsapp-catalog`, `super-whatsapp-catalog`, `homepage-builder`, `pos`, `kds`, `modules`, `biolinks`.
  - Clases aplicadas: `admin-page`, `admin-page-header`, `admin-table-wrapper`, `admin-modal-form`, `scroll={{ x: 'max-content' }}`.
- **QA (`scripts/init.sh`):**
  - Agregada validación de Traefik en producción: estado del contenedor, puertos 80/443, detección de error de API Docker.
  - Agregado sync automático de `/opt/traefik-orderflow` a `/srv/traefik` en Hetzner después de cada build.
- **Infraestructura (Traefik):**
  - Actualizado Traefik de v3.3 a v3.4 en Hetzner.
  - Configuración centralizada en `/opt/traefik-orderflow` y sincronizada a `/srv/traefik` en producción.
  - Resuelto error de API Docker (`client version 1.24 is too old`) configurando `DOCKER_API_VERSION=1.55` y endpoint TCP.
- **Documentación (`AGENTS.md`):**
  - Actualizada regla de infraestructura: Traefik v3.4 exclusivo, configuración desde `/opt/traefik-orderflow` con sync a `/srv/traefik`.

## [1.5.0] - 2026-08-01

### 🏢 **OrderFlow como Tenant Enterprise + Fixes Frontend/Routing (FEAT-024)**
- **Frontend (`Dockerfile.prod`, `docker-compose.prod.yml`):**
  - Agregados `ARG` faltantes para `VITE_ROOT_DOMAIN` y `VITE_SYSTEM_SUBDOMAINS` en build de producción.
  - Agregados build args correspondientes en `docker-compose.prod.yml` con defaults por entorno.
- **Frontend (`App.tsx`):**
  - `ROOT_DOMAIN` ahora fallback a `window.location.hostname` cuando `VITE_ROOT_DOMAIN` no está definido, evitando break de `provecchio.com`.
- **Frontend (admin pages):**
  - Corregidos todos los calls a `/api/v1/sync/customers` (404) redirigiéndolos a `/api/v1/customers` y `/api/v1/customers/sync`.
  - Archivos: `customers.tsx`, `dashboard.tsx`, `spa-dashboard.tsx`, `quotations.tsx`, `checkout.tsx`, `checkout-simple.tsx`.
- **Infraestructura (`docker-compose.prod.yml`):**
  - Confirmado que `pesallaccia.com` se despliega en servidor Hetzner separado; regla Traefik de provecchio mantenida sin rutas cruzadas.
- **Configuración (`.env.prod`, `.env.production`):**
  - Agregada variable `ORDERFLOW_COMPANY_DB_URL` para provisioning de DB dedicada del tenant enterprise.
- **QA & Despliegue:** `./scripts/init.sh` pasado (58 suites / 498 tests, build backend y frontend limpios, E2E Playwright sin errores).

## [1.4.0] - 2026-08-01

### 🇵🇾 **Facturación Electrónica Paraguaya con FacturaSend (SIFEN)**
- **Prisma Schema (`schema.prisma`):**
  - Nuevo modelo `FacturasendTenantConfig` para almacenar la configuración de FacturaSend por tenant.
  - Nuevo modelo `ElectronicDocument` para registrar los documentos electrónicos emitidos.
- **Servicios:**
  - `FacturasendAuthService`: Gestión de configuración y cifrado AES-256 de API keys.
  - `FacturasendClient`: Cliente HTTP con reintentos y timeout para la API de FacturaSend.
  - `FacturasendMapper`: Mapeo de datos de OrderFlow a JSON de FacturaSend (multi-moneda, IVA 5/10%, B2B/B2C).
  - `FacturasendService`: Lógica de emisión, consulta de estado, pruebas de conexión y emisión desde payloads de Odoo.
  - `FacturasendLocationService`: Caché de ubicaciones SIFEN (departamentos/ciudades).
- **Controller:**
  - `FacturasendController`: REST API para configuración, pruebas, emisión, listado de documentos y recepción de webhooks.
- **Integración:**
  - Hook en `orders.service.confirm()` para emisión directa si el tenant tiene configuración de FacturaSend.
- **QA & Despliegue:** `./scripts/init.sh` pasado (72 tests específicos de FacturaSend, 58 suites / 498 tests totales).

## [1.3.0] - 2026-08-01

### 💱 **Automatización de Cotizaciones desde Fuentes Locales de PY (FEAT-022)**
- **Prisma Schema (`schema.prisma`):**
  - Nuevo modelo `ExchangeRate` con `tenantId`, `fromCurrency`, `toCurrency`, `rate`, `provider`, `isFallback`, `createdAt`/`updatedAt`. Índice `@@unique([tenantId, fromCurrency, toCurrency])`.
  - Relación `exchangeRates ExchangeRate[]` agregada al modelo `Tenant`.
- **Currency Providers (`backend/src/currency/providers/`):**
  - Extraído `dolarapi.com` del código inline del `CurrencyService` → `DolarApiProvider` (USD→ARS, USD→EUR).
  - Nuevo `BcpProvider` (Banco Central del Paraguay — API pública + parsing HTML).
  - Nuevo `CambiosChacoProvider` (API/scraper Cambios Chaco).
  - Nuevo `BonanzaProvider` (API/scraper Bonanza Cambios).
  - Nuevo `ManualProvider` (fallback configurable desde `Tenant.config.currencyFallbackRate`).
  - Todos los providers implementan timeout 5s, retry 1x y `withRetry` utility.
- **CurrencyService (`currency.service.ts`):**
  - Registrado en `CurrencyModule` (dejaba de ser un servicio huérfano `@Injectable()`).
  - Chain de providers en orden de prioridad desde `Tenant.config.currencyProviders`.
  - Persistencia de rates en DB vía `upsertExchangeRate` (findFirst + create/update) con deduplicación por cambio.
  - Cache: in-memory LRU (max 100 entries, TTL 5 min) + lectura desde `ExchangeRate` DB si está fresca.
  - Fallback a última rate de DB cuando todos los providers fallan.
  - Soporte para `currencyRateOverride` (tasa manual de emergencia).
- **Cron (`CurrencyRateCronService`):**
  - `@Cron('0 */15 * * * *')` — refresco cada 15 min, solo horario comercial PY (07:00–18:00, timezone `America/Asuncion`).
  - Itera todos los tenants activos y omite tenants con `currencyRateOverride: true`.
- **API Admin (`CurrencyController`):**
  - `GET /api/v1/currency/rates/:from/:to` — rate actual + provider + timestamp (público, tenant por host).
  - `GET /api/v1/currency/providers/:tenantId` — providers configurados.
  - `PATCH /api/v1/currency/settings` — actualiza `Tenant.config` (providers, fallback, override).
  - `POST /api/v1/currency/refresh/:tenantId` — trigger manual de refresh.
- **QA & Despliegue:** `./scripts/init.sh` pasado (54 suites / 426 tests, build backend y frontend limpios).

## [1.1.9] - 2026-07-31

### 🚀 **Unificación de Navegación & QA E2E Integral**
- **Backend (`customers.controller.ts`):**
  - Corregida la ruta base `@Controller('api/v1/customers')` permitiendo la consulta limpia de clientes `/api/v1/customers`.
- **Frontend (`AdminApp.tsx`, `bookings.tsx`, `homepage-builder.tsx`):**
  - Unificado el menú de administración removiendo duplicidades e integrando la agenda de Spa en **Turnos & Agendas Spa**.
  - Destacado el módulo **🎨 Diseñador Web & Portada** con accesos directos de previsualización.
  - Agregada guardia de arbolado defensivo `Array.isArray()` en `BookingsPage`.
- **QA & Testing (`scripts/qa_e2e_check.py`):**
  - Ampliada la suite E2E de Playwright en Python para verificar la navegación de todas las subrutas administrativas (`/admin/products`, `/admin/customers`, `/admin/bookings`, `/admin/loyalty`, `/admin/homepage-builder`, `/admin/whatsapp-catalog`) y descartar errores JS y HTTP 502/404.

## [1.1.8] - 2026-07-31

### 🎨 **Gestor Visual de Portada & Enrutamiento Separado (Landing vs. Tienda)**
- **Frontend (`TenantHomepage.tsx`, `App.tsx`, `PublicStorefrontPage.tsx`):**
  - Implementada portada institucional dinámica (`TenantHomepage.tsx`) con bloques modulares (Hero, Productos Destacados, Beneficios, Testimonios, Contacto & Redes).
  - Separación de rutas: la raíz (`/`) carga la Portada Institucional del Tenant, mientras que `/tienda` alberga la Tienda/Catálogo interactivo con carrito.
  - Incorporado botón de **Acceso Administración (`🔐`)** en el encabezado de las portadas públicas.
- **Admin App (`homepage-builder.tsx`, `AdminApp.tsx`):**
  - Creado diseñador visual de portada en `/admin/homepage-builder` con selector de plantillas por rubro (Retail, Gastronomía, Spa/Servicios, B2B), paleta de colores y fuentes de Google Fonts.
  - Vista previa en tiempo real Desktop y Mobile.
- **Protocolo & Documentación:**
  - Actualizados `featurelist.json` (FEAT-019), `docs/00-contexto-agentes.md` y guías de arquitectura.

## [1.1.3] - 2026-07-27

### 🛡️ **File Store Unificado por Tenant + Backups**
- **Backend (`main.ts`, `whatsapp-catalog-admin.controller.ts`):**
  - Uploads de imágenes del catálogo ahora se guardan en `uploads/whatsapp-catalog/{tenantId}/{filename}` (aislado por tenant).
  - Agregado endpoint `POST /api/v1/whatsapp-catalog/upload` para subir imágenes de banner/logo con validación de MIME y tamaño.
  - Servicio estático `/uploads` expuesto desde `process.cwd()/uploads` en `main.ts`.
- **Backend (`product-imports/scrapers/base-scraper.ts`):**
  - Unificada ruta de imágenes de proveedores a `uploads/suppliers/{tenantId}/{supplierSlug}/{filename}`.
  - URLs públicas ahora usan `/uploads/suppliers/...` en vez de `/static/uploads/suppliers/...`.
- **Backup (`scripts/backup-production.sh`):**
  - Ahora incluye backup comprimido del file store: `pre_deploy_{env}_{timestamp}_uploads.tar.gz`.
  - Incluye rollback env snapshot + verificación de tamaño para DB y archivos.
- **Verificación (`scripts/verify-backups.sh`):**
  - Ahora valida también backups `_uploads.tar.gz` (tamaño + integridad tar.gz).
- **Documentación:**
  - Creado `docs/BACKUP_RESTORE.md` con procedimientos de backup, restore y consideraciones multi-tier.
  - Actualizada regla de file store en `docs/00-contexto-agentes.md`: todos los archivos deben vivir bajo `uploads/{tenantId}/{module}/`.
  - Actualizado `.gitignore` para excluir `uploads/` del repositorio.

## [1.1.2] - 2026-07-27

### 🐛 **Fix: Envío de pedido por WhatsApp sin contenido**
- **Frontend (`whatsapp-checkout.tsx`):**
  - Corregido botón flotante mobile sticky que solo abría WhatsApp sin enviar el mensaje: ahora ejecuta `form.validateFields().then(handleConfirmOrder)` para generar el mensaje completo.
  - Agregado `name="deliveryAddress"` al `TextArea` de dirección para que `values.deliveryAddress` llegue al cuerpo del mensaje.
- **Backend (`public-orders.controller.ts`):**
  - Sigue usando los mismos endpoints, pero ahora el frontenv envía correctamente `subdomain` o `apiKey` resuelto, sin hardcodear claves.

### 🚀 **Admin: Administración del Catálogo WhatsApp**
- **Backend (`whatsapp-catalog.service.ts`, `whatsapp-catalog-admin.controller.ts`):**
  - Agregados endpoints de productos del catálogo: `GET/POST/PUT/DELETE /api/v1/whatsapp-catalog/products` y `GET/PUT /api/v1/whatsapp-catalog/page-config`.
  - CRUD de productos del catálogo con permisos `whatsapp-catalog:read` y `whatsapp-catalog:manage`.
  - Mapeo de `Decimal` a `number` para precios y campos extendidos de producto.
- **Backend (`schema.prisma`):**
  - Agregado campo `order Int` en modelo `Product` para ordenamiento personalizado.
- **Frontend (`admin/whatsapp-catalog.tsx`):**
  - Extendido panel de administración con pestaña **Productos** (tabla + crear/editar/eliminar).
  - Pestaña **Página y Configuración** mantiene toda la configuración de contacto, envíos, zonas, banner, logo y plantilla de mensaje.
  - El Tenant Admin ahora puede editar completamente la página pública y gestionar su inventario del catálogo sin salir del admin.

### 🔧 **Fix resolución de tenant en checkout**
- **Frontend (`whatsapp-checkout.tsx`):**
  - Eliminada API key hardcodeada del checkout.
  - Ahora resuelve tenant por `subdomain`, query param o `apiKey` tenant config, igual que el catálogo público.

## [1.1.1] - 2026-07-27

### 🐛 **Fix: Catálogo WhatsApp vacío para tenants resueltos por subdominio alias**
- **Frontend (`whatsapp-catalog.tsx`):**
  - Eliminada API key hardcodeada de Provecchio Di Mora como fallback.
  - Ahora prioriza `subdomain` cuando `tenantConfig` fue resuelto por subdominio Traefik.
  - Solo usa `apiKey` como fallback cuando no hay subdominio disponible.
- **Backend (`tenants.controller.ts`):**
  - Expones `subdomain` en la respuesta pública `GET /api/v1/tenants/public/tenant-by-subdomain/:subdomain`.
- **Troubleshooting:** Agregado incidente y resolución en `docs/troubleshooting/01-traefik-routing-and-spa-cache.md`.

---

## [1.1.0] - 2026-07-26

### 🚀 **Microservicios Standalone & Extracción de Arquitectura**
- **Microservicio `whatsapp-catalog-standalone`**:
  - Extraído el módulo de catálogo WhatsApp a `services/whatsapp-catalog-standalone` como servicio autónomo expuesto en puerto `3021`.
  - Integrado con la librería interna `@orderflow/auth-shared` para validación multi-tenant compartida de tokens JWT y API Keys.

### 🛡️ **Soft-Delete de Tenants & Retención de Datos**
- **Modelo de Retención de 30 Días**:
  - Agregados los campos `softDeleted` y `deletedAt` en el modelo `Tenant` de Prisma.
  - Endpoint `DELETE /api/v1/tenants/:id` actualizado a Soft-Delete (desactiva el tenant sin borrar datos físicamente).
  - Creado el endpoint `POST /api/v1/tenants/:id/restore` para restauración inmediata.
  - Creado el endpoint `DELETE /api/v1/tenants/:id/hard-delete` de eliminación física definitiva restringido exclusivamente al SuperAdmin.

### 📡 **Escalado Horizontal de WebSockets (Redis IoAdapter)**
- **`RedisIoAdapter` Socket.io**:
  - Integrado `@socket.io/redis-adapter` e `ioredis` en NestJS bootstrap (`main.ts`).
  - Sincronización en tiempo real Pub/Sub entre réplicas de KDS y POS con fallback automático a memoria.

### 🏬 **App Store Marketplace & Buscador en Tiempo Real**
- **Filtro en Tiempo Real**:
  - Incorporado buscador dinámico `Input.Search` en la App Store (`/admin/modules`).
  - Filtro por nombre, categoría y descripción en tiempo real.

---

## [1.0.0] - 2026-07-25

### ☸️ **Estructura Kubernetes & Helm (v2.0.0 Ready)**
- **Arquitectura de Helm Charts Preparada (`k8s/`)**:
  - Creado el directorio `k8s/` con la estructura completa de Helm Charts en `k8s/helm/orderflow-core` y `k8s/helm/microservices`.
  - Archivos `Chart.yaml`, `values.yaml` y la guía operativa [k8s/README.md](file:///opt/orderflow/k8s/README.md) listos para desplegar en clusters Kubernetes cuando el servidor requiera autoscaling horizontal masivo.

### 🏆 **RELEASE COMERCIAL HISTÓRICO v1.0.0 — OrderFlow SaaS Platform**
- **Plataforma Omnicanal Multi-Tenant & Multi-Tier**:
  - Infraestructura completa con aislamiento de datos `Shared` y `Dedicated PostgreSQL` por tenant Enterprise.
- **Billing SaaS & Facturación Automática**:
  - Motor de suscripciones recurrentes integrado con `Stripe` y `Mercado Pago`, cálculo global de MRR/ARR y suspensión automática por impago en `TenantThrottlerGuard`.
- **Portal de Suscripción Self-Service del Cliente**:
  - Panel interactivo en `/admin/subscription` para cambiar de plan y elegir preferencia de base de datos dedicada.
- **Marketplace & Plugin SDK para Terceros**:
  - Registro de extensiones certificadas de desarrollo independiente (`MarketplaceModule`).
- **White-Label & Multi-Language (i18n)**:
  - Personalización total de marcas, dominios custom, favicons, títulos y soporte multi-idioma (Español 🇪🇸, Inglés 🇺🇸, Portugués 🇧🇷).
- **Conectores ERP Enterprise & Microservicios Standalone**:
  - Integración nativa con Odoo 19 CE, MIDA y SAP ERP, junto a 3 microservicios desacoplados (`giveaways`, `whatsapp-catalog`, `biolinks`).

### 🔒 **RBAC Granular Ampliado (Seguridad)**
- **Nuevos Guardias y Permisos**:
  - `ContactsController`: endpoints de contactos protegidos con `contacts:read`, `contacts:create`, `contacts:update`, `contacts:delete`.
  - `LoyaltyController`: tarjetas y reglas protegidas con `loyalty:read` y `loyalty:manage`.
  - `IntegrationsController`: integraciones y sincronización Odoo protegidas con `integrations:read` e `integrations:manage`.
  - Mocks de `PermissionsGuard` y `RbacService` incorporados a todas las suites unitarias para mantener el 100% de tests verdes (340 tests).

## [0.8.0] - 2026-07-25

### 🔌 **Integraciones ERP Enterprise (MIDA / SAP)**
- **Conectores ERP MIDA & SAP Enterprise**:
  - Extendido `IntegrationsService` para dar soporte nativo a pruebas de conectividad y sincronización de eventos webhooks con sistemas ERP MIDA y SAP.

### 🌍 **Internacionalización & Multi-Idioma (v1.0.0 Target)**
- **Infraestructura Multi-Language i18n**:
  - Configurado `i18n.ts` con diccionario de traducción completo para Español 🇪🇸, Inglés 🇺🇸 y Portugués 🇧🇷.
  - Componente global `LanguageSelector.tsx` integrado en la barra de navegación del Admin Dashboard permitiendo alternar idioma en tiempo real con persistencia en `localStorage`.

### 🚀 **RELEASE OFICIAL v0.8.0 — Marketplace SDK, White-Label & Billing SaaS**
- **Suscripciones & Billing SaaS Engine (`BillingModule`)**:
  - Gestión de los 4 planes SaaS (`FREE`, `STARTER`, `PRO`, `ENTERPRISE`) y procesamiento de webhooks para pasarelas de pago (`Stripe` y `Mercado Pago`).
  - Endpoint de consulta de suscripción `GET /api/v1/billing/subscription` y cambio de plan `POST /api/v1/billing/subscribe`.
  - Endpoint global de métricas MRR/ARR `GET /api/v1/billing/metrics/mrr` para SuperAdmin.
- **Mecanismo de Suspensión Automática por Impago**:
  - `TenantThrottlerGuard` bloquea automáticamente con `403 Forbidden` a cuentas en estado `SUSPENDED` por impago.
- **Portal de Suscripción del Cliente (Frontend)**:
  - Creada la página `subscription.tsx` en `/admin/subscription` con tarjetas comparativas y modal interactivo de upgrade/downgrade.
  - Selección self-service entre Base de Datos Compartida (`Shared`) y Dedicada (`Dedicated PostgreSQL`).
- **Marketplace & Plugin SDK para Desarrolladores (`MarketplaceModule`)**:
  - Registro dinámico de plugins de terceros con endpoints `GET /api/v1/marketplace/plugins`, `POST /api/v1/marketplace/install` y `POST /api/v1/marketplace/register`.
- **White-Label Completo**:
  - Extendido `BrandingProvider.tsx` para inyectar dinámicamente el `document.title` y el `favicon` personalizado del tenant, eliminando marcas de OrderFlow al activar `removeOrderflowBranding`.
- **Cobertura de Pruebas**:
  - Suite de backend ampliada a **349 tests unitarios aprobados en 45 test suites (100% éxito)** y **14 tests E2E de Playwright**.

## [0.7.0] - 2026-07-25

### 💳 **Billing SaaS & Métricas Financieras (v1.0.0 Target)**
- **Self-Service Multi-Tier Database Selection**:
  - Habilitada la selección interactiva entre Base de Datos Compartida (`Shared`) y Dedicada (`Dedicated PostgreSQL`) en el modal de suscripción del Portal de Cliente.
- **White-Label Completo (Frontend & Branding)**:
  - Extendido `BrandingProvider.tsx` para inyectar dinámicamente el `document.title` y el `favicon` personalizado del tenant.
  - Soporte para la bandera `removeOrderflowBranding` ocultando menciones de marca de OrderFlow en la vista del cliente.
- **Marketplace & Plugin SDK para Desarrolladores (v0.8.0-dev)**:
  - Creado `MarketplaceModule` (`MarketplaceController` y `MarketplaceService`) para ofrecer un Registro de Plugins de terceros.
  - Endpoints `GET /api/v1/marketplace/plugins` (catálogo disponible), `POST /api/v1/marketplace/install` (instalación por tenant) y `POST /api/v1/marketplace/register` (SDK para desarrolladores terceros).
  - Cobertura de 4 tests unitarios adicionales en `marketplace.controller.spec.ts` elevando la suite a **349 tests unitarios aprobados (100%)**.
- **Mecanismo de Suspensión por Impago**:
  - `TenantThrottlerGuard` verifica el estado de la suscripción del tenant en cada petición backend y bloquea con `403 Forbidden` a cuentas en estado `SUSPENDED`.
- **Portal de Suscripción del Cliente (Frontend)**:
  - Creada la página `subscription.tsx` con carga diferida (`React.lazy`) en `/admin/subscription`.
  - Tarjetas comparativas de precios, límites y características por plan (`FREE`, `STARTER`, `PRO`, `ENTERPRISE`).
  - Modal interactivo de upgrade/downgrade con selección de pasarela preferida (Stripe / Mercado Pago) e indicador de aislamiento de base de datos (`shared` vs `dedicated`).
- **Nuevo Módulo `BillingModule`**:
  - `BillingController` y `BillingService` integrados al backend para gestionar planes SaaS (`FREE`, `STARTER`, `PRO`, `ENTERPRISE`) y procesar eventos webhooks de pasarelas de pago (`Stripe`, `Mercado Pago`).
  - Endpoint de consulta de suscripción `GET /api/v1/billing/subscription` y cambio de plan `POST /api/v1/billing/subscribe`.
  - Endpoint global de métricas MRR (Monthly Recurrent Revenue) y ARR (Annual Recurrent Revenue) `GET /api/v1/billing/metrics/mrr` para el SuperAdmin.
  - Cobertura de 5 tests unitarios aprobados en `billing.controller.spec.ts` elevando la suite a **345 tests pasar exitosamente**.

### 🚀 **RELEASE OFICIAL v0.7.0 — Multi-Tier Isolation & Microservicios Standalone**
- **Multi-Tier Isolation (Bases de Datos Dedicadas por Tenant Enterprise)**:
  - Soporte completo para tenants `shared` (DB principal) y `dedicated` (PostgreSQL aislada).
  - Inyección dinámica `@TenantPrisma()` mediante `TenantConnectionManager`.
  - Script de aprovisionamiento automatizado `scripts/provision-dedicated-db.sh`.
  - Super Admin Dashboard habilitado con control visual y endpoint `PATCH /tenants/:id/isolation-tier`.
- **Microservicios Standalone Desacoplados**:
  - Librería compartida `@orderflow/auth-shared` compilada en TypeScript.
  - Microservicio standalone `giveaways-standalone` (`:3020`).
  - Microservicio standalone `whatsapp-catalog-standalone` (`:3021`).
  - Microservicio standalone `biolinks-standalone` (`:3022`).
  - Routers dinámicos integrados en **Traefik v3.3**.
- **Calidad & Integración Continua**:
  - Pruebas de carga con k6 integradas automáticamente en GitHub Actions CI/CD (`.github/workflows/ci-cd.yml`).
  - Cobertura total de 340 tests unitarios y 14 tests E2E con Playwright.
- **Librería Compartida `@orderflow/auth-shared`**:
  - Creado paquete npm interno `packages/auth-shared/` con utilidades compiladas de validación unificada de JWT (`verifyJwtToken`) y API Keys (`validateApiKeyHeader`).
- **Microservicio Standalone `giveaways-standalone`**:
  - Creada estructura base `services/giveaways-standalone/` para empaquetar y comercializar el módulo de Sorteos de forma independiente del monolito.
  - Incluye `docker-compose.yml` dedicado para ejecución standalone en puerto `3020`.
- **Segundo Microservicio Standalone `whatsapp-catalog-standalone`**:
  - Creada la estructura base `services/whatsapp-catalog-standalone/` para comercializar el catálogo interactivo de WhatsApp de forma autónoma.
  - Incluye su `docker-compose.yml` desacoplado expuesto en el puerto `3021`.
- **Integración Continua & Pruebas de Carga (k6 en CI/CD)**:
  - Añadido el job `test-k6-load` a la pipeline de GitHub Actions (`.github/workflows/ci-cd.yml`) ejecutando automáticamente smoke tests de rendimiento de latencia con `grafana/k6-action`.

### ⚡ **Multi-Tier Tenant Isolation (DB Dedicada por Tenant Enterprise)**
- **Aislamiento Multi-Tier Backend**:
  - `ApiKeyGuard` inyecta automáticamente `req.tenantPrisma` resolviendo entre DB compartida (`shared`) y DBs dedicadas enterprise (`dedicated`) vía `TenantConnectionManager`.
  - Inyector `@TenantPrisma()` preparado para controladores del sistema.
- **Endpoint de Asignación de Tier**:
  - `PATCH /api/v1/tenants/:id/isolation-tier` para promover o revertir el tier de un tenant (`shared` / `dedicated`) especificando la conexión `dedicatedDatabaseUrl`.
- **Script de Aprovisionamiento**:
  - Creado `scripts/provision-dedicated-db.sh` para la creación automatizada de bases de datos PostgreSQL independientes y aplicación del schema Prisma (`prisma db push`).
- **Super Admin Dashboard (Frontend)**:
  - Nueva columna y etiqueta visual `DB Tier` (`💎 Dedicated` vs `👥 Shared`) en la tabla de gestión de tenants (`super-admin-dashboard.tsx`).

### ⚡ **Escalabilidad, Performance UX & Cobertura E2E**

#### 🎉 Features & Performance
- **Integración de Redis 7 en Infraestructura**:
  - Incorporación de Redis 7 (`redis:7-alpine`) en `docker-compose.yml` con volumen persistente (`redis_data`) y healthchecks.
  - Habilitado para rate-limiting distribuido y adaptación horizontal de WebSockets KDS/POS.
- **Índices de Base de Datos de Alto Rendimiento**:
  - Índices compuestos agregados en Prisma schema: `orders` (`tenantId, createdAt, status` y `tenantId, customerId`) y `products` (`tenantId, active`).
  - Optimización de latencia en consultas del KDS, POS e historial de clientes.
- **Optimización UX & Frontend Bundling**:
  - Implementado *Code Splitting* mediante `React.lazy` y `<Suspense>` en `AdminApp.tsx`.
  - Carga bajo demanda de módulos de administración (POS, KDS, Sorteos, Bio-Links, Presupuestos), reduciendo la huella del bundle inicial.

#### 🧪 Testing & Calidad
- **Expansión E2E con Playwright**:
  - `frontend/e2e/app.spec.ts` ampliado a **14 tests E2E pasando (100% de éxito)**.
  - Cobertura de rutas públicas, auth guards y navegación de POS, KDS y Bio-Links.
- **Seguridad & Gestión de Secretos**:
  - Exclusión estricta de archivos de credenciales (`client_secret*.json`, `*.pem`, `*.key`) en `.gitignore`.

---

## [0.5.1] - 2026-07-19

### ✅ **Observabilidad avanzada & E2E**

#### 🎉 Features Agregadas
- **Métricas avanzadas en `MetricsModule`:**
  - HTTP request total, duration y errores con `tenant_id`.
  - Contadores de negocio: orders, bookings, Bio-Link clicks, webhooks activos, colas.
  - Endpoint `/metrics` mantenido y documentado.

- **Logs estructurados para Loki:**
  - Winston JSON con `tenantId`, `requestId`, `traceId`, `context`, `timestamp`.
  - Transporte diario rotado (`logs/orderflow-*.log`) y consola para desarrollo.

- **Stack avanzado documentado:**
  - `docs/observability/README.md`
  - `docs/observability/loki-config.md`
  - `docs/observability/grafana-dashboards.md`
  - `docker-compose.observability.yml` (Loki, Tempo, Grafana, Promtail, Alertmanager)
  - Dashboard JSON inicial: `docs/observability/dashboards/tenant-overview.json`

- **Backend E2E seed:**
  - Datos mínicos en `backend/test/e2e/seed.ts` para pruebas reproducibles.

- **API Keys - Seguridad inicial:**
  - Endpoints `POST /api/v1/tenants/:id/api-key/rotate` y `/revoke`.
  - Auditoría en `ApiKeyRotation` y `ApiKeyAuditLog`.
  - Rate limit por tenant con `TenantThrottlerGuard`.

- **API Keys - Rotación automática programada:**
  - `ApiKeyRotationSchedulerService` rota API keys cada 90 días vía `@Cron`.
  - Sincroniza nuevas claves con integraciones Odoo activas.
  - Registra rotaciones en `ApiKeyRotation` y `ApiKeyAuditLog`.

- **API Keys - Sincronización automática con Odoo:**
  - `IntegrationsService.syncApiKeyToOdooIntegrations` actualiza `orderflow_connector.api_key` en Odoo.
  - Nuevo endpoint en `odoo-adapter`: `POST /odoo/update-connector-api-key`.
  - Documentado flujo post-rotación en `docs/ODOO_INTEGRATION_GUIDE.md`.

- **k6 smoke / carga continua:**
  - Ampliación de `scripts/k6-load-test.js` con escenarios de login, health, products, customers, orders y order-create.
  - Ampliación de `scripts/k6-biolinks-smoke.js` con health, bio 404 y productos públicos.

- **Grafana + Loki + Tempo:**
  - Stack completo integrado en `docker-compose.prod.yml`.
  - Servicios: loki, tempo, grafana, promtail, alertmanager.
  - Dashboards provisionados en `docs/observability/dashboards/`.

- **RBAC granular:**
  - `RbacService` con catálogo de permisos y seed inicial.
  - `PermissionsGuard` + decorador `@RequirePermissions()`.
  - Modelos Prisma: `Permission`, `RolePermission`, `UserTenantPermission`.
  - Integración en `AppModule` y endpoints protegidos en `ProductsController`.

- **Auditoría completa:**
  - Modelo Prisma `AuditLog` para eventos genéricos de auditoría.
  - `AuditService` con scope request para registrar acciones, recursos y cambios.

- **RBAC granular:**
  - `RbacService` con catálogo de permisos y seed inicial.
  - `PermissionsGuard` + decorador `@RequirePermissions()`.
  - Modelos Prisma: `Permission`, `RolePermission`, `UserTenantPermission`.

- **Playwright E2E suite:**
  - Expansión de `frontend/e2e/app.spec.ts` con rutas públicas y admin.
  - Cobertura inicial de landing, login, storefront, WhatsApp catalog, Bio-Links, checkout y redirecciones de admin.

- **Backup verificado + DRP documentado:**
  - `scripts/verify-backups.sh` valida integridad de backups SQL.
  - Documento `docs/DRP.md` con procedimientos de recuperación por entorno.

- **Secretos gestionados:**
  - `SecretsValidationService` valida secrets críticos al iniciar la app.
  - Detección de secrets débiles o faltantes en `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `MASTER_API_KEY`.

- **RBAC granular propagada a controllers críticos:**
  - `OrdersController`: `orders:create`, `orders:read`, `orders:update`, `orders:delete`.
  - `CustomersController`: `customers:create`, `customers:read`, `customers:update`, `customers:delete`.
  - `BookingsController`: `bookings:create`, `bookings:read`, `bookings:update`, `bookings:delete`, `bookings:manage`.
  - `GiveawaysController`: endpoints públicos preservados; admin endpoints protegidos con `giveaways:read/create/update/delete/manage`.
  - `UsersController`: `users:read`, `users:invite`, `users:manage`.
  - Tests actualizados con mocks de `PermissionsGuard` y `RbacService`.

- **Provecchio Backup & Restore:**
  - Created `scripts/restore-provecchio.sh`: parses NDJSON backup, transforms data for new multi-tenancy DDL, generates restore SQL with `isolationTier='shared'`.
  - Created `scripts/update-provecchio-version.sh`: updates Provecchio tenant to stable OrderFlow version (runs migrations, updates VERSION file, refreshes schema version in DB, clears caches).
  - New migration `20260729170000_add_tenant_multitier_isolation`: adds `isolationTier`, `dedicatedDatabaseUrl`, `dedicatedSchemaVersion` columns to `tenants` table.
  - Backup files at `/home/marcelompz/backups_sorteo/`: `giveaway_full_data.json` (NDJSON with registrations, winners, giveaway data) and `giveaway_backup_20260729_154949.sql` (DDL schema).

- **App Store / Marketplace (Super Admin Panel):**
  - RBAC granular en `SystemModulesController`: permisos `modules:read`, `modules:install`, `modules:uninstall`, `modules:configure`.
  - DTOs con `class-validator` para todos los endpoints de módulos.
  - Auditoría de acciones de módulos via `AuditService` (install, uninstall, toggle, config, update, readme).
  - Auto-instalación de dependencias faltantes usando `ModulesRegistry.getInstallOrder()`.
  - Frontend `modules.tsx`: loading states por acción, remoción de master key hardcodeada.

#### 📚 Documentación
- `AGENTS.md`: actualizada sección de DevOps con observabilidad avanzada.
- `ROADMAP.md`: observabilidad marcada como inicial.

---

## [0.5.0] - 2026-07-18

### ✅ **Traefik v3.3 Exclusivo, Redirecciones HTTPS & App Store Fixes**

#### 🔧 Infraestructura & Traefik v3.3
- **Redirección Global HTTP ➔ HTTPS (Puerto 80)**: Configurado `http.redirections` permanente (HTTP 308) en el entryPoint `web` de Traefik v3.3.
- **Sintaxis de Dominios Traefik v3**: Corregida sintaxis de exclusión en reglas `!Host(...)` para routers de tenants en `services.yml`.
- **Integración con Cloudflare Universal SSL**: Configuración validada en modo `Full (Strict)` con `Always Use HTTPS: ON` y renovación automática de certificados Let's Encrypt mediante el desafío `DNS-01` con `CLOUDFLARE_API_TOKEN`.

#### 🐛 Bug Fixes
- **App Store / Manifiestos de Módulos en Docker (`/admin/modules`)**:
  - `ModulesRegistry.loadAll()` mejorado con un algoritmo de evaluación de candidate paths (`src/`, `dist/`, `__dirname`, `__dirname/src/`).
  - Solucionado el problema donde los manifiestos JSON no se encontraban en imágenes Docker de producción (`node:22-alpine` multi-stage build sin `/app/src`).
- **Navegación y Redirección en `/config`**:
  - `ApiKeyConfig.tsx`: Se reemplazaron rutas obsoletas (`/spa`, `/retail`) por redirecciones hacia el Panel Admin (`/admin`) o la Tienda (`/tienda`).
- **Acceso SuperAdmin al Menú de Integraciones**:
  - `AdminApp.tsx`: Garantizada la visibilidad constante de **Integraciones (`/admin/integrations`)** y herramientas clave para el rol SuperAdmin en la barra lateral.

#### 📚 Documentación
- `docs/troubleshooting/02-production-docker-manifests-and-ssl-redirects.md` — Guía de troubleshooting para Docker producción, SSL y menú SuperAdmin.
- `AGENTS.md` — Actualizadas las normas de arquitectura exclusiva de Traefik v3.3 y la preservación de datos en migraciones de Odoo 19 CE.

---

## [0.5.0-alpha.2] - 2026-07-19

### ✅ Bio-Links Ajuste a Especificación (sugerencias_bio-links.md)

#### 🎉 Features Agregadas
- **Backend alineado a especificación:**
  - Ruta pública corregida: `GET /api/v1/bio/:slug` (sin `/public` intermedio).
  - CRUD admin por ID: `GET /:id/detail`, `PATCH /:id`, `DELETE /:id`.
  - Cache Redis con prefijo `cache:biolink:<slug>` y TTL 3600s.
  - Invalidación de cache en mutaciones (`upsert`, `update`, `delete`).
  - `BioLinkClick` para analytics de clics.

- **Frontend Admin:**
  - Drag & Drop nativo en lista de bloques (eventos HTML5) con reordenamiento y persistencia de `order`.
  - Bloque BOOKING agregado al wizard con selector de servicios (`/v1/bookings/services`).
  - Preview smartphone reactiva manteniendo tema, avatar y bloques.

- **Frontend Público:**
  - Ruta pública consumiendo `/v1/bio/:slug`.
  - Soporte de bloque BOOKING en Fast Checkout Drawer (campo de fecha/hora).
  - Tracking de clics a `/v1/bio/:slug/click`.

- **Testing:**
  - 23 unit tests pasando en `biolinks.service.spec.ts` y `biolinks.controller.spec.ts`.
  - Cobertura de cache, CRUD por ID, clicks, orden desde Bio-Link.

#### 🔧 Refactor
- `CreateBioLinkDto` ahora es completamente opcional para updates parciales.
- Se agregó método `getById` y `updateBioLink`/`deleteBioLink` en servicio.
- Controller admin renombrado de `getConfig/updateConfig` a `getById/updateById` manteniendo `/config` como alias legacy.

---

## [0.4.3] - 2026-07-16

### ✅ Testing Expansion

#### 🎉 Testing Unitario
- **Expansión de cobertura de controllers**
  - `orders.controller.spec.ts`: 8 tests
  - `products.controller.spec.ts`: 7 tests
  - `users.controller.spec.ts`: 8 tests
  - `bookings.controller.spec.ts`: 17 tests
  - `integrations.controller.spec.ts`: 7 tests
  - `giveaways.controller.spec.ts`: 12 tests
  - `contacts.controller.spec.ts`: 9 tests
  - `loyalty.controller.spec.ts`: 6 tests
  - `quotations.controller.spec.ts`: 3 tests
  - `whatsapp-catalog.controller.spec.ts`: 2 tests
  - `backups.controller.spec.ts`: 4 tests
  - `health.controller.spec.ts`: 2 tests
  - `root-health.controller.spec.ts`: 1 test
  - `metrics.controller.spec.ts`: 1 test
  - `public-products.controller.spec.ts`: 2 tests
  - `public-storefront.controller.spec.ts`: 5 tests
  - `sync-products.controller.spec.ts`: 6 tests
  - `public-orders.controller.spec.ts`: 1 test
  - `notifications.controller.spec.ts`: 2 tests
- **Total:** 298 tests passing, 39 test suites
- **Fix pre-existentes:**
  - `customers.controller.spec.ts`: corregidos argumentos invertidos en `syncCustomers`
  - `notifications.controller.ts`: tipado de `@Request()` arreglado, tests agregados
  - Regeneración de Prisma Client para resolver `pushToken`

#### 🔧 Refactor
- Prisma Client regenerado para alinear tipos con `schema.prisma`

---

## [0.4.2] - 2026-07-15

### ✅ Tauri Desktop Wrapper + Observabilidad

#### 🎉 Features Agregadas
- **Tauri Desktop Wrapper para POS**
  - Estructura inicial en `desktop/` con Vite + React.
  - Comandos nativos Rust: impresión ESC/POS (`/dev/usb/lp*`), `toggle_fullscreen`, `set_always_on_top`.
  - Shortcuts globales registrados desde Rust y consumidos desde el frontend.
  - Iframe embebido apuntando a `https://pesallaccia.com/admin/pos` con toolbar nativa.

- **Observabilidad**
  - Backend Sentry: traces/replays configurados en `instrument.ts` con DSN por env.
  - Frontend Sentry: integrado via `SentryModule` + `SentryExceptionFilter`.
  - Prometheus `/metrics` endpoint con `prom-client` (histogramas de HTTP, contadores de órdenes y bookings).

#### 🔧 Refactor
- Dominio configurable backend/frontend (`ROOT_DOMAIN`, `VITE_ROOT_DOMAIN`, `VITE_SYSTEM_SUBDOMAINS`).
- White-label en páginas públicas: removido branding OrderFlow de footers.

---

## [0.4.1] - 2026-07-15

### ✅ Fixes Producción + Dominio Configurable

#### 🐛 Bug Fixes
- **Traefik producción** - Corregidos nombres de servicios en `/srv/traefik/dynamic/services.yml`
  - `orderflow-prod-frontend` → `http://orderflow-frontend-1:80`
  - `orderflow-prod-backend` → `http://orderflow-backend-1:3010`
  - `orderflow-staging-frontend` → `http://orderflow-staging-frontend-1:80`
  - `orderflow-staging-backend` → `http://orderflow-staging-backend-1:3010`
- **Backend crash loop** - Corregido `POSTGRES_PASSWORD` en `.env` que tenía placeholder en vez de la credencial real de producción.
- **Frontend login no redirigía** - El backend estaba en restart loop por Prisma `P1000`; una vez fijada la DB, el login funciona correctamente.

#### 🔧 Refactor
- **Dominio configurable en backend** (`CloudflareDnsService`, `TenantsController`, `main.ts`)
  - Nuevas variables: `ROOT_DOMAIN` (fallback `DOMAIN_NAME`, fallback `pesallaccia.com`).
  - CORS dinámico según `ROOT_DOMAIN`.
- **Dominio configurable en frontend**
  - Nuevas variables: `VITE_ROOT_DOMAIN`, `VITE_SYSTEM_SUBDOMAINS`.
  - `App.tsx`: detecta subdominios de tenant usando `VITE_ROOT_DOMAIN` y excluye subdominios de sistema (`orderflow`, `www`, `staging`).
  - `PublicStorefrontPage.tsx`: usa `VITE_ROOT_DOMAIN` para construir el hostname del tenant.
  - Sin autenticación: muestra `OrderFlowLandingPage` en vez del warning anterior.
- **Landing page generalizada**
  - Eliminadas referencias hardcodeadas a empresas reales (Gaia Spa, Repuestos Enciso).
  - Links actualizados a rutas genéricas (`/tienda`, `/landing`).

#### 📚 Documentación
- `docs/guides/GUIA_DESPLIEGUE_Y_TENANTS.md` - Actualizada para reflejar que `/srv/traefik/` ya existe y contiene configuración multi-tenant; eliminado paso de crear desde cero.
- `docs/guides/GUIA_DESPLIEGUE_SERVIDORES.md` - Aclarado que el backend se accede por path `/api` sobre el dominio principal (no por `api.pesallaccia.com`); eliminadas referencias hardcodeadas a Nginx.
- `docs/info/verificacion-produccion.md` - Nuevo archivo con verificación de producción.

#### 🔒 Seguridad
- Credenciales de producción centralizadas en `.env.prod`; `.env` sincronizado con valores reales.
- Eliminada exposure de nombres de empresas reales en docs de demo y credenciales.

---

## [0.4.0] - 2026-07-14

### ✅ **POS / KDS / Loyalty / Subdominios — Sprint 3**

#### 🎉 Features Agregadas
- **Punto de Venta (POS) Web**
  - Modo Mozo (agregar ítems a mesas activas) y Modo Caja (cobro centralizado).
  - Diseño offline-first con Dexie.js (IndexedDB) y Zustand sync queue.
  - Búsqueda rápida de productos, categorías y modificadores contextuales.

- **Pantalla de Cocina (KDS) en Tiempo Real**
  - WebSocket Gateway (`OrdersGateway`) en namespace `/orders` con aislamiento por sala `tenant:<tenantId>`.
  - Eventos `order:new` y `order:status_updated` para transmisión instantánea de comandas.
  - Semáforo de criticidad por tiempo: 🟩 Normal (0-10 min), 🟨 Alerta (10-20 min), 🟥 Crítico (20+ min con parpadeo).

- **Transición de Estado de Órdenes**
  - Nuevo endpoint `PATCH /api/v1/orders/:id/status` para control de cocina.
  - `OrderStatus` enum ampliado: `DRAFT`, `CONFIRMED`, `PREPARING`, `READY`, `DELIVERED`, `CANCELLED`.

- **Módulo de Fidelización (Loyalty) — Backend**
  - Controller con 5 endpoints: `GET /card/:customerId`, `GET /rules`, `POST /rules`, `PATCH /rules/:id`, `POST /redeem`.
  - Motor de acumulación automática de puntos en checkout (`awardPointsForOrder`).
  - Sistema de tiers: BRONZE → SILVER (500pts) → GOLD (2000pts) → PLATINUM (5000pts).
  - Auto-generación de tarjetas con código de barras único (`LC-[PREFIX]-[HASH]`).
  - Schema Prisma: `LoyaltyCard`, `LoyaltyTransaction`, `LoyaltyRule`.

- **Módulo de Fidelización (Loyalty) — Admin UI**
  - Panel de administración (`/admin/loyalty`) con KPIs, gestión de reglas (crear/activar/desactivar).
  - Consulta de tarjeta de fidelidad por cliente con historial de transacciones.
  - Canje de puntos desde el panel admin con validación de saldo.
  - Registrado en el menú lateral de AdminApp (condicional al módulo `loyalty`).

- **Subdominios Públicos por Tenant**
  - `PublicStorefrontPage`: storefront público que resuelve tenant por subdominio.
  - Cloudflare DNS automático al crear tenant (`cloudflare-dns.service.ts`).
  - Soporte para `https://<tenant>.pesallaccia.com` con DNS Only (Traefik SSL).

#### 🔧 Infraestructura
- Sentry frontend integrado (`SentryModule.forRoot()` en AppModule).
- ThrottlerModule: rate limiting global (100 req/min).
- ScheduleModule para cron jobs (@nestjs/schedule).

#### 📚 Documentación
- `docs/POS_KDS_ARCHITECTURE.md` — Arquitectura completa POS/KDS.
- `docs/06-pos-kds.md` — Guía de integración POS/KDS.
- `docs/07-uml-diagrams.md` — Diagramas UML del sistema.
- `docs/08-loyalty.md` — Documentación del módulo Loyalty.

---

## [0.3.1] - 2026-07-12

### ✅ Mejoras de Gestión de Tenants (Super Admin)

#### 🎉 Features Agregadas
- **Gestión de Tenants desde el dashboard Super Admin**
  - Botón **Deshabilitar / Habilitar** por tenant (`active` reversible) en la tabla de tenants.
  - Acción **Eliminar** tenant con confirmación de eliminación irreversible.
  - Botón **Crear Nuevo Tenant** funcional (modal) que muestra la API Key generada.
- **Autorización por rol `ADMIN`**
  - Un usuario con rol `ADMIN` (vía `UserTenantAccess`) puede gestionar los tenants a los que tiene acceso, sin requerir al Super Admin.
  - El Super Admin (`isSuperAdmin` por JWT o master API key) sigue gestionando cualquier tenant.
- **Nuevos endpoints de Tenants** (`backend/src/tenants/tenants.controller.ts`)
  - `PATCH /api/v1/tenants/:id/disable` → deshabilita (`active=false`).
  - `PATCH /api/v1/tenants/:id/enable` → rehabilita (`active=true`).
  - `DELETE /api/v1/tenants/:id` → eliminación definitiva (hard delete, con cascade).
  - `GET /api/v1/tenants` ahora devuelve también `businessName`, `industry`, `ecommerceEnabled` y `bookingsEnabled`.

#### 🔒 Seguridad
- `findAll`, `update`, `disable`, `enable` y `delete` de tenants validan `assertCanManageTenant`:
  Super Admin o `ADMIN` del tenant; cualquier otro rol recibe `403 Forbidden`.
- La creación de tenants (`POST`) se mantiene **pública** por diseño.

---

## [0.3.0] - 2026-07-06

### ✅ **COMPLETADO - Sprint 1**

#### 🎉 Features Agregadas
- **Swagger API Documentation 100%** - 65/65 endpoints documentados
  - Auth, Tenants, Users, Products, Orders, Giveaways, Contacts, Categories, Bookings, Quotations
  - Bearer JWT + API Key authentication configurada
  - Disponible en `http://localhost:3010/api/docs`

- **Staging Environment 100% Operativo**
  - Deploy en Hetzner VPS (`staging.provecchio.com`)
  - Nginx API proxy configurado
  - Database migrations graceful handling
  - Test user creado (`test@staging.com`)

- **Test Utilities**
  - `backend/test/utils/mocks.ts` con mocks reutilizables
  - `createPrismaMock()`, `createJwtMock()`, `createConfigMock()`
  - 7 tests unitarios pasando (35% coverage baseline)

#### 🐛 Bug Fixes
- **DB Migration Error** - Fix para `P3005 - schema is not empty` en staging
  - Creado `backend/entrypoint.sh` para migraciones graceful
  - Health check de database con netcat

- **Frontend API 404** - Nginx no proxyeaba `/api/*` al backend
  - Creado `frontend/frontend.conf` con API proxy config
  - Fix: `/api/*` → `http://orderflow-backend-prod:3010`

- **Build Docker con Tests** - Tests fallaban en production build
  - Creado `backend/tsconfig.build.json` excluyendo tests
  - Updated `Dockerfile.prod` para usar tsconfig.build

#### 📚 Documentación
- `docs/GOOGLE_OAUTH_FIX_SUMMARY.md` - OAuth fix summary
- `docs/GOOGLE_OAUTH_SETUP.md` - OAuth configuration guide
- `docs/PRODUCCION_DEPLOY_COMPLETE.md` - Production deployment guide
- `docs/STAGING_DEPLOYMENT_GUIDE.md` - Staging deployment step-by-step
- `docs/DAY_SUMMARY_2026-07-06.md` - Daily work summary

#### 🔧 Technical Debt
- **35% Test Coverage** - Baseline establecido
  - 7 tests passing en staging
  - Test utilities creadas para futuro crecimiento a 50%+

---

## [0.2.0] - 2026-06-22

### ✅ FASE 3 COMPLETADA

#### Features
- **Mobile Offline Mode** - React Native + Zustand persist
- **SQL Migration Engine** - Native SQL migrations con `{{TENANT_ID}}`
- **CI/CD Pipeline** - GitHub Actions con 3-ecosystem validation
- **Unit Tests Init** - 4 tests iniciales (ModulesRegistry, SystemModules)

#### Technical
- Modular architecture Odoo-style
- App Store UI para module management
- Dynamic module icons
- Git Flow versioning (MAJOR.MINOR.PATCH-PRERELEASE)

---

## [0.1.0] - 2026-06-15

### ✅ MVP INICIAL

#### Features
- Multi-tenant core con API key isolation
- Giveaway module con landing page
- WhatsApp catalog integration
- Basic authentication (API key only)

#### Technical
- NestJS + Prisma backend
- React + Refine.dev frontend
- PostgreSQL database
- Docker containers

---

## Versiones

| Versión | Fecha | Estado | Notas |
|---------|-------|--------|-------|
| **1.1.9** | 2026-07-31 | ✅ Released | Unificación de navegación & QA E2E integral |
| **1.7.0** | 2026-08-03 | ✅ Released | UX/UI Mobile-First & Ergonomía Intuitiva (Continuación) |
| **1.6.0** | 2026-08-03 | ✅ Released | Inicio del Plan de Refinamiento UX/UI para Escritorio |
| **1.5.2** | 2026-08-03 | ✅ Released | Análisis y Documentación del Ecosistema |
| **1.5.1** | 2026-08-02 | ✅ Released | Responsive UX/UI Backoffice + Traefik v3.4 (QA-001) |
| **1.1.8** | 2026-07-31 | ✅ Released | Homepage Visual Builder, Landing vs. Tienda routing |
| **1.1.7** | 2026-07-30 | ✅ Released | QA E2E Playwright Suite, Subdomain Resolution Fixes |
| **1.1.3** | 2026-07-27 | ✅ Released | File Store Unificado por Tenant + Backups + WhatsApp Catalog Admin |
| **1.1.2** | 2026-07-27 | ✅ Released | WhatsApp Catalog Admin, Checkout tenant resolution |
| **1.1.1** | 2026-07-27 | ✅ Released | WhatsApp Catalog subdomain resolution fix |
| **1.1.0** | 2026-07-26 | ✅ Released | Standalone Suite, Soft-Delete Tenants, Redis WebSockets |
| **1.0.0** | 2026-07-25 | ✅ Released | Commercial SaaS Release: Billing, Marketplace, White-label, i18n |
| **0.8.0** | 2026-07-25 | ✅ Released | ERP Integrations (MIDA/SAP), Multi-language i18n |
| **0.7.0** | 2026-07-25 | ✅ Released | Multi-Tier Isolation, 6 Microservicios Standalone, RBAC, k6 CI |
| **0.5.1** | 2026-07-19 | ✅ Released | Observabilidad avanzada, RBAC, E2E, API Key rotation |
| **0.5.0-alpha.2** | 2026-07-19 | 🚧 Alpha | Bio-Links ajuste a especificación |
| **0.5.0-alpha.1** | 2026-07-18 | 🚧 Alpha | Bio-Links backend + admin UI + public SPA + Fast Checkout |
| **0.5.0** | 2026-07-18 | ✅ Released | Traefik v3.3 + App Store fixes |
| **0.4.3** | 2026-07-16 | ✅ Released | Testing expansion: 298 tests / 39 suites |
| **0.4.2** | 2026-07-15 | ✅ Released | Tauri Desktop POS + Observabilidad (Sentry/Prometheus) |
| **0.4.1** | 2026-07-15 | ✅ Released | Fixes producción: Traefik, DB password, dominio configurable |
| **0.4.0** | 2026-07-14 | ✅ Released | POS/KDS WebSockets + Loyalty backend+UI + Subdominios |
| **0.3.1** | 2026-07-12 | ✅ Released | Gestión de tenants (disable/enable/delete) + rol ADMIN |
| **0.3.0** | 2026-07-06 | ✅ Released | Swagger 100% + Staging 100% + Tests 35% |
| **0.2.0** | 2026-06-22 | ✅ Released | Mobile offline + SQL migrations + CI/CD |
| **0.1.0** | 2026-06-15 | ✅ Released | MVP inicial |

---