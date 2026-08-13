# 35 — Persistencia en Diseñador Web & Merge de Config JSON en Tenants Controller

> **Área:** Frontend / Backend / Homepage Builder / Tenants  
> **Síntoma:** En el Diseñador Web (`/admin/homepage-builder`), al modificar colores, bloques o plantillas y hacer clic en "Guardar Cambios", la vista previa reflejaba el cambio en el momento, pero al navegar a otro módulo y regresar, la configuración volvía a los valores por defecto sin persistir las modificaciones.  
> **Estado:** ✅ Resuelto  
> **Fecha:** 2026-08-13  

---

## 🔍 Causas Raíz

Se identificaron **dos causas independientes** que provocaban este fallo de persistencia:

### 1. Desfase de Prefijo en Ruta Client-Side HTTP (`/v1/` vs `/api/v1/`)
* En `homepage-builder.tsx`, las peticiones `GET` y `PATCH` de configuración utilizaban la ruta relativa `/v1/tenants/config` (omitiendo el prefijo `/api/`).
* Como la instancia global de Axios (`api`) está configurada sobre la raíz de la API, el request terminaba fallando en segundo plano o no alcanzaba el manejador autenticado de NestJS.

### 2. Sobreescritura Completa del JSON `config` en Backend (Perdida de Propiedades)
* En `backend/src/tenants/tenants.controller.ts`, el endpoint `@Patch('config')` reasignaba directamente el objeto completo `updateData.config = data.config;`.
* Al enviar payloads parciales de configuración desde el frontend, cualquier clave preexistente no enviada en el request se borraba de la columna JSON `config` en PostgreSQL, reseteando la configuración del tenant en recargas posteriores.

---

## 🛠️ Solución Aplicada

### 1. Corrección de Rutas en Frontend (`homepage-builder.tsx`)
Se actualizaron todas las llamadas API en `homepage-builder.tsx` para incluir la ruta completa `/api/v1/tenants/config`:

```typescript
// Carga de configuración
const response = await api.get('/api/v1/tenants/config');

// Guardado de configuración
await api.patch('/api/v1/tenants/config', {
  branding: { primaryColor, secondaryColor },
  config: { homepagePreset: preset, fontFamily, homepageBlocks: blocks }
});
```

### 2. Fusionado Atómico de Config en Backend (`tenants.controller.ts`)
Se actualizó el endpoint `@Patch('config')` para recuperar la configuración JSON existente en la base de datos y hacer un merge atómico con el nuevo payload antes de actualizar el registro en Prisma:

```typescript
if (data.config) {
  const existingTenant = await this.prisma.tenant.findUnique({
    where: { id: tenant.id },
    select: { config: true }
  });
  const existingConfig = (existingTenant?.config as Record<string, any>) || {};
  updateData.config = {
    ...existingConfig,
    ...data.config,
  };
}
```

---

## ✅ Verificación

1. **Frontend Build & Types:** Compilación limpia realizada sin advertencias ni errores TypeScript.
2. **Pruebas de Persistencia:** Guardado exitoso de la plantilla **Punta de Lanza (BioLinks + Social Catalog)** y verificación de la persistencia correcta de colores, presets y bloques al recargar la página o cambiar de módulo.
3. **QA E2E Playwright:** Aprobada la suite automatizada `./scripts/init.sh` incluyendo la navegación y verificación sin errores en `/admin/homepage-builder`.
