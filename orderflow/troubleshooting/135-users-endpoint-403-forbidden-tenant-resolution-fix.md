# 🛠️ Troubleshooting #135: HTTP 403 Forbidden en GET /api/v1/users (Administración de Usuarios)

## 📋 Información General
- **Área:** Backend / Auth / ApiKeyGuard / PermissionsGuard / Users
- **Síntoma:** Error HTTP 403 (Forbidden) al acceder a la administración de usuarios (`/admin/users`), impidiendo listar y gestionar usuarios/colaboradores.
- **Estado:** ✅ Resuelto

---

## 🔍 Causa Raíz
Cuando un usuario iniciaba sesión y su JWT token contenía la clave del tenant como subdominio o slug (ej. `"provecchio"` en lugar del UUID primario del tenant en PostgreSQL):

1. `ApiKeyGuard` intentaba resolver la entidad tenant ejecutando únicamente `this.prisma.tenant.findUnique({ where: { id: tenantId } })`.
2. Al tratarse de una búsqueda por clave primaria `id` (UUID), la consulta retornaba `null` porque `"provecchio"` es el campo `subdomain`/`customDomain`, provocando que la propiedad `request.tenant` quedara en `undefined`.
3. Al pasar el control a `PermissionsGuard`, la evaluación del contexto de usuario y tenant no encontraba la coincidencia exacta de UUID en la relación `UserTenantAccess` y terminaba rechazando la solicitud con `HTTP 403 Forbidden`.

---

## 🛠️ Solución Aplicada

1. **`backend/src/common/api-key.guard.ts`:**
   Se incorporó la búsqueda por slug/subdominio como fallback (`await this.findTenantBySlug(tenantId)`) en los tres puntos de resolución de tenant por token o cabecera `x-tenant-id`. De este modo, si `tenantId` proviene de un slug (como `"provecchio"`), se resuelve correctamente la entidad completa y se reasigna su UUID legítimo a `request.tenant` y `request.user.tenantId`.

2. **`backend/src/common/permissions.guard.ts`:**
   Se incluyeron explícitamente los roles `'SUPERADMIN'` y `'OWNER'` junto a `'ADMIN'` en la exención directa de permisos de `PermissionsGuard`.

---

## 🧪 Verificación
- Compilación limpia de NestJS (`npm run build` en `backend/`).
- Resolución exitosa de requests a `/api/v1/users` tanto con tokens JWT asignados por UUID como por subdominio/slug.
