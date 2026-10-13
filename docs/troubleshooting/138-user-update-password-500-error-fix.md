# 🛠️ Troubleshooting #138: HTTP 500 en PATCH /api/v1/users/:id al Editar Usuario o Cambiar Contraseña

## 📋 Información General
- **Área:** Backend / Users / UsersService / UsersController
- **Síntoma:** Error HTTP 500 (Internal Server Error) al intentar actualizar los datos de un usuario o modificar su contraseña en la vista de administración de usuarios (`/admin/users`).
- **Estado:** ✅ Resuelto

---

## 🔍 Causa Raíz
Cuando el formulario de edición de usuarios en el frontend (`frontend/src/pages/admin/users.tsx`) enviaba el objeto `values` a `PATCH /api/v1/users/:id`, la petición contenía atributos como `role` y `contactId` (o `password`).

`UsersService.update` pasaba el objeto `data` completo directamente a `this.prisma.user.update({ where: { id }, data })`.

Dado que en la estructura del modelo Prisma `User` (`schema.prisma`):
1. El atributo `role` reside en la relación `UserTenantAccess` y no existe como columna directa de la tabla `users`.
2. Prisma lanzaba una excepción de argumento no reconocido (`Unknown arg 'role' in data.role for type UserUpdateInput`), devuelta como un error **HTTP 500 Internal Server Error**.

---

## 🛠️ Solución Aplicada

1. **`backend/src/users/services/users.service.ts`:**
   - Se extrajeron y separaron los atributos no pertenecientes al modelo `User` (`role`, `contactId`).
   - Se filtró `userUpdateData` para incluir únicamente columnas válidas del modelo `User` (`name`, `email`, `active`, `isSuperAdmin`, `pinCode`, `defaultTenantId`, `uiPreferences`).
   - Se añadió el hashing seguro de la contraseña solo si `password` es provisto como un string no vacío, ignorando strings vacíos o valores no definidos.

2. **`backend/src/users/users.controller.ts`:**
   - Se conectó la actualización del rol en `UserTenantAccess` mediante `this.userTenantAccessService.assignAccess(id, tenantId, data.role, data.contactId)` cuando `data.role` es enviado en la petición de actualización.

---

## 🧪 Verificación
- Compilación limpia de NestJS (`npm run build` en `backend/`).
- Actualización exitosa de usuarios, cambios de contraseña y actualización de roles (`ADMIN`, `EMPLOYEE`, `MANAGER`, etc.) sin errores HTTP 500.
