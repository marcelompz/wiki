# 🛠️ Troubleshooting #136: HTTP 403 Forbidden en POST /api/v1/tables/floors (Gestión de Pisos y Salones)

## 📋 Información General
- **Área:** Backend / Auth / RBAC / Tables & Salones
- **Síntoma:** Error HTTP 403 (Forbidden) al crear/gestionar zonas, pisos o mesas (`POST /api/v1/tables/floors`, `POST /api/v1/tables`) en el panel de administración de salones (`/admin/gastro/tables`).
- **Estado:** ✅ Resuelto

---

## 🔍 Causa Raíz
1. En `backend/src/common/rbac.service.ts`, el método `hasPermission` no evaluaba si el usuario tenía la bandera `isSuperAdmin` activa ni si su rol dentro de `UserTenantAccess` pertenecía a los roles administrativos (`ADMIN`, `MANAGER`, `OWNER`, `SUPERADMIN`), dependiendo exclusivamente de la presencia de filas en la tabla `RolePermission` de la base de datos.
2. En `backend/src/tables/tables.controller.ts`, el parámetro `tenantId` dependía únicamente de `req.tenantId || req.user?.tenantId`, omitiendo la lectura de `req.tenant?.id` (el cual es poblado por `ApiKeyGuard` al resolver el tenant por subdominio/slug).

---

## 🛠️ Solución Aplicada

1. **`backend/src/common/rbac.service.ts`:**
   Se incorporó la evaluación prioritaria para `user.isSuperAdmin` y la exención directa para roles administrativos (`ADMIN`, `MANAGER`, `SUPERADMIN`, `OWNER`) en el método `hasPermission`.

2. **`backend/src/tables/tables.controller.ts`:**
   Se actualizó la extracción del identificador del tenant a `const tenantId = req.tenantId || req.tenant?.id || req.user?.tenantId;` en todos los métodos de creación, edición, movimiento y eliminación de pisos y mesas.

---

## 🧪 Verificación
- Compilación limpia del backend NestJS (`npm run build`).
- Creación y edición exitosa de zonas y pisos en salones.
