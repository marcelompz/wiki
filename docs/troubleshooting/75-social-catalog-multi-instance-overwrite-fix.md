# 🛠️ Troubleshooting 75: Sobreescritura de Catálogos al Crear Instancias Nuevas en Social Catalog

## 📌 Síntoma Principal
Al intentar crear una nueva instancia de catálogo para un tenant en el panel admin (`/admin/social-catalog`) o mediante `POST /api/v1/admin/social-catalog/instances`, el sistema en lugar de crear un segundo catálogo renombraba y sobreescribía la configuración del catálogo existente (`default`).

---

## 🔍 Causa Raíz
1. **Restricción Unique en Base de Datos**: La tabla de Prisma `module_installations` cuenta con la restricción `@@unique([tenantId, moduleId])` ([schema.prisma](file:///opt/orderflow/backend/prisma/schema.prisma#L1356)). Por lo tanto, no se pueden crear múltiples filas de `ModuleInstallation` con `moduleId: 'social-catalog'` para un mismo tenant.
2. **Mutación del primer registro en el Backend**: `SocialCatalogService.createInstance` y `updateTenantConfig` obtenían `installations[0]` si ya existía una instalación previa, actualizando `installations[0].config.instanceKey` con el nuevo `instanceKey` en lugar de estructurar instancias independientes dentro de `config.instances`.

---

## 🛠️ Solución Aplicada
1. **Estructura Multi-Instancia en JSON (`config.instances[instanceKey]`)**:
   - Refactorización de `SocialCatalogService` ([social-catalog.service.ts](file:///opt/orderflow/backend/src/social-catalog/social-catalog.service.ts)):
     - `getTenantConfig`: Lee la instancia activa desde `config.instances[instanceKey]` manteniendo compatibilidad con configuraciones legacy.
     - `updateTenantConfig`: Modifica de forma aislada la clave `config.instances[instanceKey]`.
     - `createInstance`: Agrega una nueva entrada en `config.instances[instanceKey]` heredando la marca visual de la instancia por defecto.
     - `deleteInstance`: Permite remover instancias secundarias (`DELETE /api/v1/admin/social-catalog/instances/:instanceKey`).

2. **Soporte para Catálogos Reducidos (Coffee Party)**:
   - Se incorporó `includedCategoryIds` e `includedTagIds` en `SocialCatalogConfig`.
   - `getCatalogProducts` y `getCategoryTree` aplican los filtros de categorías permitidas cuando se consulta un catálogo reducido.

3. **Interfaz del Panel Admin & Catálogo Público**:
   - `frontend/src/pages/admin/social-catalog.tsx`: Agregado selector de catálogo con botón de eliminación (`Popconfirm`) para instancias secundarias, y selector múltiple de categorías incluidas.
   - `frontend/src/pages/omni-catalog.tsx`: Se aseguró que `instanceKey` siempre se envíe en los `requestParams` de la API pública.

---

## ✅ Verificación
- Pruebas unitarias de Jest ejecutadas y aprobadas (`npm run test -- src/social-catalog`).
- Verificación de tipos TypeScript (`npx tsc --noEmit`) en frontend y backend sin errores.
