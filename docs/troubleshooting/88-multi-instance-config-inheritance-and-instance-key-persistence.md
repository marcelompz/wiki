# Troubleshooting #88 — Herencia de Configuración Multi-Instancia y Persistencia de `instanceKey` en Administración

## 📋 Síntomas

1. **Razón Social Muestra Incluso Estando Desmarcada**:
   Al desmarcar "Razón Social" (`showBusinessName: false`) en `/admin/social-catalog`, la portada del catálogo público en `https://provecchio.com/social-catalog/menudigital` continuaba mostrando el título de la Razón Social.
2. **Cambios de Color y Fondos de Categoría No Aplicaban a Instancias Específicas**:
   Modificar el color de fondo de una categoría (ej: "Agua" a `#FFFFFF`) o subir una imagen de fondo (ej: "Veggie", "Sandwich sin TACC", "Chocolate") en el panel admin no se reflejaba en `/social-catalog/menudigital` tras recargar.

---

## 🔍 Causas Raíz

1. **Ausencia de Herencia de Configuración Raíz en `getTenantConfig` (`social-catalog.service.ts`)**:
   `getTenantConfig(tenantId, 'menudigital')` retornaba únicamente el objeto aislado `instances['menudigital']`. Si `showBusinessName` estaba desmarcado a nivel general (`rawConfig.showBusinessName = false`), la clave dentro de `instances['menudigital']` era `undefined`. En el frontend, `socialConfig?.showBusinessName ?? true` evaluaba `undefined ?? true => true`, encendiendo la Razón Social forzosamente.
2. **Falta de `instanceKey` en las Peticiones PUT del Panel Admin (`social-catalog.tsx`)**:
   Las peticiones de guardado (`handleSave`, `onColorChange`, `onBgChange`, `onUploadCategoryBg`) enviaban `PUT /api/v1/admin/social-catalog/config` sin incluir `instanceKey` en la query string ni en el body. El backend asumía la instancia `'default'`, por lo que todos los cambios aplicados en la interfaz para `menudigital` se persistían en `'default'` dejando la instancia `menudigital` intacta en PostgreSQL.

---

## 🛠️ Solución Aplicada (`v1.20.81`)

1. **Fusión por Herencia de Configuración Raíz ([social-catalog.service.ts](file:///opt/orderflow/backend/src/social-catalog/social-catalog.service.ts))**:
   Se modificó `getTenantConfig` para realizar una fusión jerárquica de propiedades:
   ```typescript
   const instanceSpecific = (instances[key] || instances['default'] || {}) as Record<string, any>;
   const config = { ...rawConfig, ...instanceSpecific };
   ```
   Cualquier toggle o valor configurado a nivel general es heredado automáticamente por cualquier sub-instancia (`menudigital`).

2. **Inclusión Obligatoria de `instanceKey` en Peticiones Admin ([social-catalog.tsx](file:///opt/orderflow/frontend/src/pages/admin/social-catalog.tsx))**:
   Se incluyó `instanceKey=${selectedInstanceKey}` en la query URL y en el payload de las llamadas `PUT /api/v1/admin/social-catalog/config`.

3. **Autoguardado Inmediato de Colores e Imágenes contra DB**:
   Los callbacks `onColorChange`, `onBgChange` y `onUploadCategoryBg` ahora ejecutan la actualización de la instancia correspondiente contra PostgreSQL en tiempo real.

4. **Sincronización por Parámetro URL (`useSearchParams`)**:
   El panel de administración lee e inicializa la clave activa directamente desde la URL (`/admin/social-catalog?instanceKey=menudigital`).
