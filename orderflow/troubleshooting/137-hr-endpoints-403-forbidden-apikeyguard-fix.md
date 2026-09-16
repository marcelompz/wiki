# 🛠️ Troubleshooting #137: HTTP 403 Forbidden en Endpoints de RRHH / Capital Humano (`/api/v1/hr/*`)

## 📋 Información General
- **Área:** Backend / Auth / HR / ApiKeyGuard
- **Síntoma:** Error HTTP 403 (Forbidden) al cargar legajos de empleados (`GET /api/v1/hr/employees`) o marcaciones de asistencia (`GET /api/v1/hr/attendance/records`) en el panel de administración de RRHH (`/admin/hr`).
- **Estado:** ✅ Resuelto

---

## 🔍 Causa Raíz
El controlador `HrController` (`backend/src/hr/hr.controller.ts`) utilizaba únicamente `@UseGuards(PermissionsGuard)` omitiendo `ApiKeyGuard`.

Como resultado:
1. `ApiKeyGuard` no se ejecutaba para los endpoints `/api/v1/hr/*`.
2. Las propiedades `req.user` y `req.tenant` no eran pobladas en la petición HTTP.
3. `PermissionsGuard` no encontraba el contexto de usuario ni de tenant y rechazaba las solicitudes con `ForbiddenException: Missing user or tenant context` (HTTP 403).

---

## 🛠️ Solución Aplicada

1. **`backend/src/hr/hr.controller.ts`:**
   Se incorporó `ApiKeyGuard` al decorador del controlador `@UseGuards(ApiKeyGuard, PermissionsGuard)`.
2. **Resolución de `tenantId`:**
   Se actualizó la extracción del tenant a `const tenantId = req.tenantId || req.tenant?.id || req.headers['x-tenant-id'] || req.user?.tenantId;` en todos los métodos del controlador.

---

## 🧪 Verificación
- Compilación limpia de NestJS (`npm run build`).
- Carga limpia y sin errores de 403 Forbidden en `/admin/hr`.
