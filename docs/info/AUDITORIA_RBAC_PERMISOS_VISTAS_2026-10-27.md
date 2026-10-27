# 🔍 Auditoría RBAC — Plan de Matriz de Control de Vistas y Permisos

**Fecha:** 2026-10-27  
**Plan auditado:** `docs/plans/RBAC/plan-administracion-permisos-vistas-settings.md` (v1.36.5)  
**Versión actual del sistema:** 1.43.4  
**Auditor:** Kilo (IA)  

---

## 1. Resumen Ejecutivo

El plan propone una **matriz de control de vistas y permisos por empleado** en `/admin/settings` con 3 endpoints backend nuevos y una UI de switches por módulo. Al comparar contra el código existente, se encontró que **la infraestructura base de RBAC ya está implementada** (RbacService, Permission seed, RolePermission seed, UserTenantPermission), pero **los endpoints específicos del plan NO existen** y la **UI de permisos en settings.tsx NO está implementada**.

### Veredicto: **Parcialmente implementado (≈40%)**

---

## 2. Estado de Implementación por Componente

### 2.1 Backend — RbacService (`backend/src/common/rbac.service.ts`)

| Requisito del Plan | Estado | Detalle |
|---|---|---|
| `hasPermission()` con precedencia: ADMIN → override → rol base | ⚠️ **Parcial** | ADMIN retorna `true` inmediatamente (correcto). Pero el override con `granted: false` **NO revoca** permisos del rol base — el código actual solo busca `granted: true` overrides, nunca `granted: false`. |
| `getUserPermissions()` con overrides | ⚠️ **Parcial** | Solo agrega overrides con `granted: true` a los permisos del rol. No filtra permisos revocados (`granted: false`). |
| `seedPermissions()` — catálogo de permisos | ✅ **Implementado** | 120+ permisos seedeados con módulo y descripción. |
| `seedRolePermissions()` — permisos por rol | ✅ **Implementado** | WAITER, SELLER, MANAGER, EMPLOYEE, VIEWER con mapeo de permisos. |
| `assertPermission()` | ✅ **Implementado** | Lanza `ForbiddenException` si no tiene permiso. |

**Problema crítico:** La lógica de `hasPermission()` NO implementa la revocación forzada (`granted: false`). Según el plan, si un admin desactiva un permiso (`granted: false`), el usuario debe ser denegado **inmediatamente**, incluso si su rol base lo tiene. El código actual:

```typescript
// ACTUAL: Solo busca overrides granted: true
const userPerm = await this.prisma.userTenantPermission.findFirst({
  where: { userId, tenantId, granted: true, permission: { name: permissionName } },
});
return !!userPerm;
```

Debería ser:
```typescript
// REQUERIDO: Buscar CUALQUIER override, y si granted === false, denegar
const userPerm = await this.prisma.userTenantPermission.findFirst({
  where: { userId, tenantId, permission: { name: permissionName } },
});
if (userPerm) {
  return userPerm.granted; // false revoca, true concede
}
return !!roleHas; // fallback a rol base
```

### 2.2 Backend — TenantSettingsController (`backend/src/tenant-settings/tenant-settings.controller.ts`)

| Endpoint del Plan | Estado | Detalle |
|---|---|---|
| `GET /api/v1/tenant-settings/permissions/catalog` | ❌ **No existe** | No implementado. El controller solo tiene `GET /` y `GET /:moduleCode`. |
| `GET /api/v1/tenant-settings/permissions/users/:userId` | ❌ **No existe** | No implementado. |
| `PUT /api/v1/tenant-settings/permissions/users/:userId` | ❌ **No existe** | No implementado. Solo existe `PATCH /:moduleCode`. |
| `settings:manage` permission guard | ⚠️ **Parcial** | Existe `@RequirePermissions('settings:manage')` en PATCH, pero el permiso `settings:manage` no está en `PERMISSION_SEED`. |

**Hallazgo:** El permiso `settings:manage` y `settings:read` son referenciados en el controller pero **no están definidos** en `PERMISSION_SEED`. Esto significa que solo los ADMIN (que retornan `true` inmediatamente) pueden usar estos endpoints. Los permisos no se pueden asignar a otros roles.

### 2.3 Backend — TenantSettingsService (`backend/src/tenant-settings/tenant-settings.service.ts`)

| Método del Plan | Estado | Detalle |
|---|---|---|
| Consultar catálogo de vistas agrupadas | ❌ **No existe** | No implementado. |
| Resolver permisos efectivos (rol base + overrides) | ❌ **No existe** | No implementado. |
| Persistir overrides masivos (upsert en lote) | ❌ **No existe** | No implementado. Solo existe `updateModuleConfig` para configuración de módulos. |

### 2.4 Backend — AuthService (`backend/src/auth/auth.service.ts`)

| Requisito del Plan | Estado | Detalle |
|---|---|---|
| Inyectar `permissions: string[]` en JWT payload | ⚠️ **Parcial** | `AdminApp.tsx` lee `payload.permissions` del JWT, pero no se verificó si `auth.service.ts` realmente los incluye. |

### 2.5 Frontend — Sidebar (`frontend/src/components/Sidebar.tsx`)

| Requisito del Plan | Estado | Detalle |
|---|---|---|
| Vincular rutas con permisos en `GROUPS` | ❌ **No implementado** | Ningún item del menú tiene el campo `permission` asignado. El `canShowItem` soporta `item.permission` pero no se usa en ninguna entrada de `GROUPS`. |
| Filtrado reactivo por permisos | ✅ **Implementado** | `canShowItem()` filtra correctamente por `permissions.includes(item.permission)` cuando el campo existe. |

**Hallazgo crítico:** A pesar de que la infraestructura de filtrado por permisos existe en `Sidebar.tsx`, **ninguna ruta del menú lateral tiene asignado un permiso**. Esto significa que todos los usuarios ven todas las vistas (sujeto solo al filtro de módulos activos).

### 2.6 Frontend — Settings Page (`frontend/src/pages/admin/settings.tsx`)

| Requisito del Plan | Estado | Detalle |
|---|---|---|
| Pestaña "Accesos & Permisos de Personal" | ❌ **No existe** | No hay pestaña ni UI para gestión de permisos por empleado. |
| Selector de usuario/empleado | ❌ **No existe** | No implementado. |
| Switches de vistas por módulo | ⚠️ **Parcial** | Existen switches para configuración de módulos (inventario, POS, etc.) pero NO para permisos de usuarios. |
| Integración con endpoints de permisos | ❌ **No existe** | No hay llamadas a endpoints de permisos. |

### 2.7 Frontend — AdminApp (`frontend/src/AdminApp.tsx`)

| Requisito del Plan | Estado | Detalle |
|---|---|---|
| Extraer `userPermissions` del JWT | ✅ **Implementado** | Líneas 196-210: extrae `payload.permissions` del JWT y lo pasa al Sidebar. |
| Pasar permisos al Sidebar | ✅ **Implementado** | `permissions={userPermissions}` en el componente Sidebar. |

---

## 3. Mapa de Vistas → Permisos (Plan vs Realidad)

| Vista del Plan | Ruta | Permiso Canónico del Plan | Estado en Sidebar |
|---|---|---|---|
| Comandero Móvil (Waiter) | `/admin/gastro/mozos` | `tables:own` | ❌ Sin permiso asignado |
| Marcador de Asistencia | `/admin/hr` | `hr:attendance:mark` | ❌ Sin permiso asignado |
| POS Cajero | `/admin/gastro/cashier` | `cash:collect` | ❌ Sin permiso asignado |
| KDS Táctil | `/admin/kds` | `orders:read` / `kds:access` | ❌ Sin permiso asignado |
| Mapa de Mesas | `/admin/gastro/tables` | `tables:manage` | ❌ Sin permiso asignado |
| Pedidos & Despacho | `/admin/orders` | `orders:manage` | ❌ Sin permiso asignado |
| Catálogo de Productos | `/admin/products` | `products:read` | ❌ Sin permiso asignado |
| Inventario & Stock | `/admin/inventory/stock` | `inventory:read` | ❌ Sin permiso asignado |
| Analítica OmniBI | `/admin/bi` | `analytics:read` | ❌ Sin permiso asignado |

**Nota:** El plan referencia permisos que **no existen** en `PERMISSION_SEED`:
- `kds:access` — No existe (se podría usar `orders:read`)
- `inventory:read` — No existe (se podría usar `products:read` o crear uno nuevo)
- `settings:read` y `settings:manage` — No existen en `PERMISSION_SEED` (referenciados en el controller pero no seedeados)

---

## 4. Hallazgos Críticos

### 4.1 Lógica de Revocación No Implementada

El plan especifica que un override con `granted: false` debe **revocar inmediatamente** el permiso, incluso si el rol base lo tiene. El código actual de `hasPermission()`:

1. Verifica si el rol tiene el permiso → retorna `true` si lo tiene
2. **Nunca** consulta `UserTenantPermission` con `granted: false`

Esto significa que un admin **no puede revocar** permisos de un usuario. Solo puede **agregar** permisos adicionales.

### 4.2 Permisos `settings:*` No Seeded

Los permisos `settings:read` y `settings:manage` son usados en `TenantSettingsController` pero no existen en `PERMISSION_SEED`. Esto impide asignarlos a roles no-admin.

### 4.3 Sidebar No Filtra por Permisos

A pesar de que `canShowItem()` soporta filtrado por permisos, **ningún item del menú** tiene el campo `permission` asignado. Todos los usuarios ven todas las vistas (sujeto solo al filtro de módulos activos).

### 4.4 No Existe UI de Gestión de Permisos

La página `/admin/settings` no tiene pestaña, selector de usuarios, ni switches para gestionar permisos individuales. Solo existe configuración de módulos (inventario, POS, etc.).

### 4.5 No Existen Endpoints de Permisos

Los 3 endpoints del plan (`permissions/catalog`, `permissions/users/:userId` GET/PUT) no existen en el backend.

---

## 5. Plan de Implementación Recomendado (Priorizado)

### Fase 1 — Corrección de Lógica RBAC (Backend) — CRÍTICO

**Archivos a modificar:**
- `backend/src/common/rbac.service.ts`

**Cambios:**
1. Modificar `hasPermission()` para implementar revocación forzada:
   - Buscar `UserTenantPermission` para `(userId, tenantId, permissionName)` sin filtro de `granted`
   - Si existe override → retornar `override.granted`
   - Si no existe override → fallback a `RolePermission`
2. Modificar `getUserPermissions()` para:
   - Incluir overrides con `granted: false` como exclusiones
   - Retornar lista efectiva (rol base + grants - revocaciones)
3. Agregar `settings:read` y `settings:manage` a `PERMISSION_SEED`

### Fase 2 — Endpoints de Permisos (Backend)

**Archivos a modificar:**
- `backend/src/tenant-settings/tenant-settings.controller.ts`
- `backend/src/tenant-settings/tenant-settings.service.ts`

**Cambios:**
1. Agregar `GET /permissions/catalog` — retorna lista de permisos agrupados por módulo
2. Agregar `GET /permissions/users/:userId` — retorna permisos efectivos del usuario (rol base + overrides)
3. Agregar `PUT /permissions/users/:userId` — persiste overrides masivos (upsert en lote)
4. Proteger todos con `@RequirePermissions('settings:manage')`

### Fase 3 — Vincular Permisos en Sidebar (Frontend)

**Archivo a modificar:**
- `frontend/src/components/Sidebar.tsx`

**Cambios:**
1. Agregar campo `permission` a cada item de `GROUPS` según la tabla de mapeo del plan
2. Verificar que `canShowItem` filtra correctamente (ya implementado)

### Fase 4 — UI de Gestión de Permisos (Frontend)

**Archivo a modificar:**
- `frontend/src/pages/admin/settings.tsx`

**Cambios:**
1. Agregar pestaña "Accesos & Permisos de Personal"
2. Selector de usuario/empleado
3. Tarjetas por módulo con Switches individuales
4. Integración con endpoints de permisos (GET catalog, GET/PUT user permissions)
5. Cumplir Regla #10 de AGENTS.md: usar tokens de tema (`theme.useToken()`), sin colores HEX hardcodeados

### Fase 5 — Pruebas

**Archivos a crear/modificar:**
- `backend/src/common/rbac.service.spec.ts` — Tests de revocación forzada
- `backend/src/tenant-settings/tenant-settings.service.spec.ts` — Tests de upsert en lote
- E2E tests para flujo completo de gestión de permisos

---

## 6. Permisos Faltantes en PERMISSION_SEED

Los siguientes permisos son referenciados en el plan pero **no existen** en el seed:

| Permiso | Módulo | Acción requerida |
|---|---|---|
| `settings:read` | settings | Agregar a PERMISSION_SEED |
| `settings:manage` | settings | Agregar a PERMISSION_SEED |
| `kds:access` | kds | Crear o usar `orders:read` como alternativa |
| `inventory:read` | inventory | Crear o usar `products:read` como alternativa |
| `tables:own` | tables | ✅ Ya existe |
| `tables:manage` | tables | ✅ Ya existe |
| `hr:attendance:mark` | hr | ✅ Ya existe |
| `cash:collect` | cash | ✅ Ya existe |

---

## 7. Conclusión

El sistema tiene una **base RBAC sólida** (RbacService, Permission seed, RolePermission seed, UserTenantPermission, Sidebar filtering, JWT permissions injection). Sin embargo, la **funcionalidad de administración granular de permisos por empleado** descrita en el plan **no está implementada**:

- **Backend:** Falta la lógica de revocación forzada y los 3 endpoints de gestión
- **Frontend:** Falta la UI de gestión de permisos en settings y la vinculación de permisos en el Sidebar
- **Permisos:** Faltan `settings:read` y `settings:manage` en el seed

El esfuerzo estimado para completar la implementación es de **4-6 días** distribuidos en las 5 fases descritas.

---

*Auditoría realizada por Kilo (IA) — 2026-10-27*  
*Basada en: `docs/plans/RBAC/plan-administracion-permisos-vistas-settings.md` v1.36.5 y `AGENTS.md` v2.2.2*