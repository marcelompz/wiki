# 📋 Plan de Implementación: Matriz de Control de Vistas y Permisos por Empleado en `/admin/settings`

> **Módulo:** Tenant Settings & RBAC Dinámico  
> **Target UI:** `/admin/settings` (Pestaña "Accesos & Permisos de Personal")  
> **Versión:** 1.36.5  
> **Fecha:** 21 de Octubre de 2026  
> **Autor:** Antigravity (OrderFlow Core Team)  

---

## 1. ANÁLISIS DE LA NECESIDAD Y OBJETIVO

### Contexto y Requerimiento
El **ADMIN** de cada Tenant necesita gobernar con precisión quirúrgica qué pantallas (vistas del menú lateral) y qué endpoints de la API puede utilizar cada colaborador de su organización.

**Caso de Uso Canónico:**
* Un usuario con rol **`WAITER` (Mozo)** solo debe ver y tener acceso a:
  1. 👨‍🍳 **Comandero Móvil / Waiter App:** `/admin/gastro/mozos`
  2. 👥 **Marcador de Asistencia / Mi Turno:** `/admin/hr`
* Todas las demás opciones del menú lateral (Catálogo maestro, Cajas POS, Pedidos globales, KDS, etc.) deben permanecer ocultas y sus endpoints protegidos con `403 Forbidden`.
* Eventualmente, el ADMIN puede encender vistas adicionales para ese mozo (por ejemplo, habilitarle temporalmente el mapa de mesas o la estación KDS) desde un panel centralizado e intuitivo en **`/admin/settings`**.

---

## 2. ARQUITECTURA DE LA SOLUCIÓN

Aprovecharemos la infraestructura existente en PostgreSQL sin alterar esquemas de base de datos, explotando la tabla [`UserTenantPermission`](file:///opt/orderflow/backend/prisma/schema.prisma#L2161-L2175) como **capa de override (concesión / denegación explícita)**:

```mermaid
flowchart TD
    subgraph UI ["Frontend (/admin/settings)"]
        AdminView["Pestaña 'Accesos de Personal'"]
        Selector["Selector de Usuario / Empleado"]
        Switches["Switches de Vistas y Permisos por Módulo"]
    end

    subgraph API ["Backend API"]
        Controller["TenantSettingsController / TenantPermissionsController"]
        RbacService["RbacService.hasPermission()"]
        Prisma["Prisma ORM"]
    end

    subgraph DB ["Base de Datos PostgreSQL"]
        RolePerm["RolePermission (Permisos por defecto del rol)"]
        UserPerm["UserTenantPermission (Overrides: granted true / false)"]
    end

    AdminView -->|1. Cargar usuarios y catálogo de vistas| Controller
    Controller -->|2. Consulta permisos base + overrides| RbacService
    RbacService --> Prisma
    Prisma --> RolePerm
    Prisma --> UserPerm
    AdminView -->|3. Guardar toggle (Switch ON/OFF)| Controller
    Controller -->|4. Upsert UserTenantPermission (granted: true/false)| Prisma
```

### Lógica de Evaluación en `RbacService.hasPermission`:
1. **Paso 1 (SuperAdmin / Admin local):** Si el usuario es SuperAdmin o `ADMIN` en este tenant $\rightarrow$ Concedido.
2. **Paso 2 (Override Específico del Usuario en el Tenant):**  
   Buscar en `UserTenantPermission` para `(userId, tenantId, permissionId)`.  
   * Si existe con `granted: false` $\rightarrow$ **DENEGADO INMEDIATAMENTE** (revocación forzada del admin).
   * Si existe con `granted: true` $\rightarrow$ **CONCEDIDO INMEDIATAMENTE** (habilitación puntual).
3. **Paso 3 (Fallback a Rol Base):**  
   Si no hay override en `UserTenantPermission`, se aplica la política estándar de `RolePermission` para el rol del usuario (`WAITER`, `SELLER`, `EMPLOYEE`, etc.).

---

## 3. ARCHIVOS A MODIFICAR Y CREAR

### 3.1 Backend (NestJS & Prisma)

| Archivo | Acción | Descripción |
| :--- | :---: | :--- |
| [`backend/src/common/rbac.service.ts`](file:///opt/orderflow/backend/src/common/rbac.service.ts) | **Modificar** | Ajustar `hasPermission()` y `getUserPermissions()` para soportar precedencia estricta de overrides (`granted === false` revoca permisos del rol). |
| [`backend/src/tenant-settings/tenant-settings.controller.ts`](file:///opt/orderflow/backend/src/tenant-settings/tenant-settings.controller.ts) | **Modificar** | Agregar endpoints protegidos con `@RequirePermissions('settings:manage')`: <br>• `GET /api/v1/tenant-settings/permissions/catalog`<br>• `GET /api/v1/tenant-settings/permissions/users/:userId`<br>• `PUT /api/v1/tenant-settings/permissions/users/:userId` |
| [`backend/src/tenant-settings/tenant-settings.service.ts`](file:///opt/orderflow/backend/src/tenant-settings/tenant-settings.service.ts) | **Modificar** | Métodos para consultar el catálogo de vistas agrupadas, resolver permisos efectivos y persistir overrides masivos en `userTenantPermission`. |
| [`backend/src/auth/auth.service.ts`](file:///opt/orderflow/backend/src/auth/auth.service.ts) | **Modificar** | En `generateAccessToken`, inyectar `permissions: string[]` en el payload JWT y en la respuesta de login/selectTenant para que el frontend no requiera peticiones adicionales. |

---

### 3.2 Frontend (React & Ant Design)

| Archivo | Acción | Descripción |
| :--- | :---: | :--- |
| [`frontend/src/pages/admin/settings.tsx`](file:///opt/orderflow/frontend/src/pages/admin/settings.tsx) | **Modificar** | Añadir nuevo ítem al menú lateral de Settings: **"Accesos & Permisos de Personal"** con selector de colaboradores, tarjetas por módulo y Switches individuales. |
| [`frontend/src/components/Sidebar.tsx`](file:///opt/orderflow/frontend/src/components/Sidebar.tsx) | **Modificar** | Vincular cada ruta del menú con su permiso requerido en `GROUPS` (ej: `/admin/gastro/mozos` $\rightarrow$ `tables:own` / `gastro:mozos:access`, `/admin/hr` $\rightarrow$ `hr:attendance:mark`). |
| [`frontend/src/AdminApp.tsx`](file:///opt/orderflow/frontend/src/AdminApp.tsx) | **Modificar** | Asegurar que `userPermissions` se extraiga reactivamente del token JWT o del estado global para alimentar el filtrado del Sidebar y rutas. |

---

## 4. MAPEO DE VISTAS PRINCIPALES A PERMISOS

| Vista del Frontend | Ruta en App | Permiso Canónico Asociado | Estado por Defecto para `WAITER` |
| :--- | :--- | :--- | :---: |
| **Comandero Móvil (Waiter)** | `/admin/gastro/mozos` | `tables:own` | ✅ **Activo** |
| **Marcador de Asistencia** | `/admin/hr` | `hr:attendance:mark` | ✅ **Activo** |
| **POS Cajero (Caja y Salón)** | `/admin/gastro/cashier` | `cash:collect` | ❌ Inactivo |
| **Cocina & Bar (KDS Táctil)** | `/admin/kds` | `orders:read` (o `kds:access`) | ❌ Inactivo |
| **Plano y Mapa de Mesas** | `/admin/gastro/tables` | `tables:manage` | ❌ Inactivo |
| **Pedidos & Despacho** | `/admin/orders` | `orders:manage` | ❌ Inactivo |
| **Catálogo de Productos** | `/admin/products` | `products:read` | ❌ Inactivo |
| **Inventario & Stock** | `/admin/inventory/stock` | `inventory:read` | ❌ Inactivo |
| **Analítica OmniBI** | `/admin/bi` | `analytics:read` | ❌ Inactivo |

---

## 5. REGLAS DE CALIDAD Y BARRERAS DE SEGURIDAD (AGENTS.md)

1. **Tokens de Diseño Ant Design:** Cumplimiento estricto de la Regla #10 de AGENTS.md. Prohibido el uso de colores HEX hardcodeados. Utilizar `token.colorBgContainer`, `token.colorPrimary`, `token.colorTextSecondary`, etc.
2. **Aislamiento Multi-Tenant:** Toda consulta en `tenant-settings.service.ts` filtrará obligatoriamente por `req.tenant.id`. Un ADMIN nunca podrá leer ni modificar permisos de usuarios fuera de su tenant.
3. **Protección a Endpoints Públicos:** Los endpoints de clientes QR de mesa y Bio-Links (`/api/v1/guest/*`, `/api/v1/bio/*`) no se verán afectados, preservando la regla de cero autenticación para clientes comensales.
4. **Respaldo de Auditoría:** Registrar en logs de auditoría cada cambio de permisos realizado por un administrador para trazabilidad interna.

---

## 6. ESTRATEGIA DE PRUEBAS Y VERIFICACIÓN

1. **Pruebas Unitarias Backend:**
   * Test en `rbac.service.spec.ts`: Verificar que un override con `granted: false` bloquea a un usuario cuyo rol base sí tenía el permiso.
   * Test en `tenant-settings.service.spec.ts`: Validar upsert de permisos en lote para un colaborador.
2. **Pruebas E2E / Integración en Frontend:**
   * Iniciar sesión como `ADMIN`: Entrar a `/admin/settings`, seleccionar un usuario `WAITER`, desactivar permisos no deseados y guardar.
   * Iniciar sesión como el `WAITER`: Confirmar que el Sidebar **únicamente** renderiza `/admin/gastro/mozos` y `/admin/hr`.
   * Intentar navegar directamente por URL a `/admin/orders`: Confirmar redirección o pantalla de acceso denegado.
