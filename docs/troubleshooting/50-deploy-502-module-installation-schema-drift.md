# 🛠️ Troubleshooting — Deploy Backend Nuevo con 502 por Schema Drift en ModuleInstallation

> **Estado:** ✅ Resuelto  
> **Área:** Backend / Deploy / Base de Datos  
> **Módulos afectados:** social-catalog, qr-generator, admin general  

---

## 🩺 Síntoma

- Luego de hacer deploy del backend nuevo, la app responde **502** en múltiples endpoints.
- Fallan `GET /api/v1/tenants/config`, `GET /api/v1/modules/installed`, `GET /api/v1/social-catalog/page-config`, `GET /api/v1/social-catalog/instances`, entre otros.
- El frontend muestra: `Error fetching tenant config AxiosError: Request failed with status code 502`.
- Los logs del backend suelen mostrar errores de columnas inexistentes o índices únicos rotos en `module_installations`.

---

## 🔎 Causa Raíz

**Schema drift entre el código nuevo y la base de datos de producción.**

- El backend nuevo agrega una columna `instanceKey` en `ModuleInstallation` y cambia la unique key a `[tenantId, moduleId, instanceKey]`.
- En producción **no se aplicó la migración** antes del deploy.
- El código nuevo consulta esa columna, Prisma genera SQL con `instanceKey`, y la base de datos responde con error.
- Ese error interno del backend se traduce en **502** para todos los módulos que usan `ModuleInstallation`.

---

## ✅ Solución Aplicada

1. **Revertir el cambio de schema**: eliminar `instanceKey` como columna física en `ModuleInstallation`.
2. **Guardar `instanceKey` dentro del `config` JSON** de la instalación, sin tocar la estructura de la tabla.
3. **Actualizar backend/frontend** para leer/escribir `instanceKey` desde `config`, manteniendo compatibilidad con producción.
4. **Eliminar la migración de Prisma** generada para evitar conflictos en deploys futuros.

---

## 📋 Regla para Despliegues

**Nunca deployar un backend que dependa de una migración no aplicada.**

- Antes de deployar:
  - Confirmar que todas las migraciones de Prisma estén aplicadas en producción (`prisma migrate deploy` o migración manual).
  - O bien, implementar la feature de forma **no migratoria** (ej: guardar metadatos en `config` JSON) hasta que se pueda aplicar la migración.
- Si una feature requiere migración y no se puede aplicar inmediatamente, **no incluirla en el deploy**.

---

## 🔗 Referencias

- `backend/prisma/schema.prisma` — `ModuleInstallation`
- `backend/src/social-catalog/social-catalog.service.ts` — métodos `getTenantConfig`, `ensureActive`, `listInstances`, `createInstance`
- `backend/src/social-catalog/social-catalog.controller.ts` — `getConfig`, `getPublicUrl`
- `backend/src/social-catalog/social-catalog-admin.controller.ts` — `getPageConfig`, `updatePageConfig`, `listInstances`, `createInstance`
- `docs/troubleshooting/48-shared-tenant-gallery.md` — troubleshooting relacionado: galería unificada

---

## 📝 Historial

| Fecha | Cambio |
|-------|--------|
| 2026-08-21 | Diagnóstico: deploy produce 502 masivo por `instanceKey` en `module_installations` sin migración aplicada. Solución: mover `instanceKey` a `config` JSON. |
