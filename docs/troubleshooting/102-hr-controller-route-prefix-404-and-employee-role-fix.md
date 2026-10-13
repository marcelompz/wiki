# Troubleshooting 102: Error HTTP 404 en Endpoints `/api/v1/hr/*` y Adición de Rol `EMPLOYEE` en Gestión de Usuarios

## 🎯 Síntomas
1. Al ingresar al panel de administración de Capital Humano (`/admin/hr`), se mostraban mensajes de error en pantalla:
   - `"Error al cargar la lista de colaboradores"`
   - `"Error al cargar marcaciones de asistencia AxiosError: Request failed with status code 404"`
2. En la consola del navegador se registraban errores `HTTP 404 Not Found` al intentar consumir `GET /api/v1/hr/employees` y `GET /api/v1/hr/attendance/records`.
3. Al gestionar usuarios en `/admin/users`, la lista de roles del sistema no contemplaba la opción de clasificar a un usuario explícitamente como Empleado / Colaborador (`EMPLOYEE`).

---

## 🔍 Causa Raíz
1. **Falta de prefijo `api/v1` en `HrController`:**
   En `backend/src/hr/hr.controller.ts`, el decorador del controlador estaba configurado únicamente como `@Controller('hr')`. Por esta razón, NestJS montaba las rutas bajo `/hr/employees` y `/hr/attendance/records`, mientras que el frontend y el API Gateway esperaban el prefijo unificado `/api/v1/hr/*`, generando un error `404 Not Found`.

2. **Ausencia del rol `EMPLOYEE` en el enum global:**
   El enum `UserRole` en `backend/prisma/schema.prisma` y en el selector de la vista frontend `/admin/users` sólo contenía los roles `ADMIN`, `MANAGER`, `SELLER` y `VIEWER`, imposibilitando la asignación del rol de Empleado / Colaborador a usuarios del sistema.

---

## 🛠️ Solución Aplicada

### 1. Corrección de Rutas en `HrController`
Se actualizó el decorador de ruta base en `backend/src/hr/hr.controller.ts`:
```typescript
// Antes:
@Controller('hr')

// Después:
@Controller('api/v1/hr')
@UseGuards(PermissionsGuard)
export class HrController { ... }
```

### 2. Extensión del Rol `EMPLOYEE` en Backend y Frontend
- **Backend Schema (`backend/prisma/schema.prisma`):**
  ```prisma
  enum UserRole {
    ADMIN     // Administrador total del tenant
    MANAGER   // Gerente (puede gestionar productos, clientes, turnos)
    SELLER    // Vendedor (solo puede crear pedidos y ver clientes)
    EMPLOYEE  // Empleado / Colaborador (marcas de asistencia y legajo)
    VIEWER    // Solo lectura
  }
  ```
- **Frontend User Management (`frontend/src/pages/admin/users.tsx`):**
  Se añadió la opción `EMPLOYEE` en el selector del modal y la etiqueta morada (`purple`) en la tabla de usuarios.

---

## ✅ Verificación
- Se ejecutó `npx prisma generate` y la compilación de NestJS y Vite.
- Se aplicó la sincronización del esquema en producción mediante `npx prisma db push`.
- Se desplegó en el entorno Provecchio con la suite E2E de Playwright aprobando la navegación por todos los módulos del panel de administración (`/admin/products`, `/admin/customers`, `/admin/bookings`, etc.) sin errores JS ni HTTP 500/502.
- Las peticiones a `https://provecchio.com/api/v1/hr/employees` y `https://provecchio.com/api/v1/hr/attendance/records` responden ahora correctamente con **HTTP 200 OK**.
