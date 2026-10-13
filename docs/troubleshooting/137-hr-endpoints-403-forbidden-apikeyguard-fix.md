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

---

## 📌 Variante: 403 por `findTenantBySlug` false positive (provecchio.local)

### Síntoma adicional (2026-10-04)
Al acceder a `/api/v1/hr/*` vía `provecchio.local` (HTTP), el endpoint retornaba **403 Forbidden** con el mensaje "Missing user or tenant context", incluso con el master API key. El mismo request vía `localhost:3010` funcionaba correctamente.

### Causa
La función `findTenantBySlug()` en `backend/src/common/api-key.guard.ts` usaba `{ id: { startsWith: clean } }` en su consulta OR, que hacía match con el tenant `provecchio-dimora-001` cuando el host era `provecchio.local` (el subdominio `provecchio` hace match con IDs que empiezan con `provecchio`).

Esto causaba que `paramTenant` se resolviera al tenant equivocado, saltándose la validación del master API key (`isSuperAdmin` nunca se seteaba). El `PermissionsGuard` luego rechazaba la request porque `req.user` era undefined.

### Fix
```typescript
// api-key.guard.ts:31 — Added 'provecchio' and 'provecchio.local' to excluded slugs
if (!clean || clean === 'default' || clean === 'pesallaccia.com' || clean === 'pesallaccia' || clean === 'localhost' || clean === 'www' || clean === 'provecchio' || clean === 'provecchio.local') return null;
```

Estos dominios son exclusivos de desarrollo local y no deben resolverse a ningún tenant.
