# Diseño de Acceso a Endpoints Basado en Roles para Empleados — OrderFlow v1.36.4

## 1. Resumen ejecutivo

OrderFlow **ya tiene** una infraestructura RBAC granular (no hay que construirla desde cero):

- Enum `UserRole` con 6 roles: `ADMIN`, `MANAGER`, `SELLER`, `WAITER`, `EMPLOYEE`, `VIEWER`.
- Tabla `Permission` (formato `recurso:accion`, 74 permisos catalogados en `common/rbac.service.ts`).
- Tabla `RolePermission` (mapeo rol → permiso, seedeable).
- Tabla `UserTenantPermission` (excepciones por usuario, override puntual).
- `PermissionsGuard` + decorador `@RequirePermissions(...)` para proteger endpoints.
- Puente `Position` (Cargo/puesto: "Mozo", "Cajero", "Cocinero"...) → `baseRole`, para HR.

**El problema real no es "diseñar RBAC" sino que la aplicación es inconsistente al aplicarlo**: de 27 controllers que usan solo `ApiKeyGuard` y 45 que usan `ApiKeyGuard + PermissionsGuard`, el coverage real de `@RequirePermissions` alcanza a 51 controllers. Hay módulos completos donde cualquier usuario autenticado del tenant puede ejecutar operaciones sensibles sin validación de rol. Abajo detallo la matriz de acceso propuesta, los huecos concretos encontrados con archivo y línea, y el plan de implementación corregido contra el código actual.

---

## 2. Modelo de roles para personal operativo (empleados)

| Rol | Uso previsto | Ejemplo de puesto |
|---|---|---|
| `ADMIN` | Dueño/gerente general del tenant. Bypass total. | Dueño del local |
| `MANAGER` | Supervisor de turno. Gestiona caja, mesas, pedidos, personal operativo. | Jefe de sala, encargado de turno |
| `SELLER` | Ventas / mostrador, B2B, cotizaciones. | Vendedor, cajero de mostrador |
| `WAITER` | Atención de mesas, comandas, cobro asistido. | Mozo/camarero |
| `EMPLOYEE` | Personal sin rol comercial: cocina, HR básico (marcar asistencia, ver su legajo). | Cocinero, ayudante |
| `VIEWER` | Solo lectura (auditoría, contable externo). | Contador |

> Recomendación: mantener `UserRole` como el rol "base" a nivel de sistema, y usar `Position.baseRole` para matizar por cargo dentro de cada rol (p. ej. dos `WAITER` con distinto `Position` podrían tener permisos extra vía `UserTenantPermission`, sin crear un rol nuevo por cada cargo).

---

## 3. Matriz de acceso propuesta (módulos operativos / de empleados)

Permisos ya existentes en `PERMISSION_SEED`, y donde falta, permisos nuevos a crear (marcados **NUEVO**).

### 3.1 Mesas / Salón (`api/v1/tables`)

| Endpoint | Permiso requerido | ADMIN | MANAGER | SELLER | WAITER | EMPLOYEE |
|---|---|:-:|:-:|:-:|:-:|:-:|
| `GET /` , `/floor-map`, `/floors` | `tables:own` (lectura) | ✅ | ✅ | ✅ | ✅ | ❌ |
| `POST /floors`, `POST /` (crear mesa) | `tables:manage` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `PATCH /:id`, `DELETE /:id` | `tables:manage` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `POST /:id/move` | `tables:manage` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `POST /:id/assign-owner` | `tables:own` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `POST /:id/release-owner` | `tables:own` (propia) / `tables:reassign` (ajena) | ✅ | ✅ | ✅ | ✅ | ❌ |
| `POST /:id/status` | **NUEVO** `tables:status` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `POST /:id/guests`, `DELETE /guests/:id` | **NUEVO** `tables:guests` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `POST /:id/transfer` | `tables:reassign` (a mesa ajena) / `tables:own` (propia) | ✅ | ✅ | ✅ | ✅ | ❌ |
| `POST /:id/gift`, `/:id/gift-line` | **NUEVO** `tables:gift` (requiere autorización, ver §6.4) | ✅ | ✅ | ❌ | ❌ | ❌ |

### 3.2 POS y caja (`api/v1/pos`, `api/v1/pos-sessions`)

| Endpoint | Permiso requerido | ADMIN | MANAGER | SELLER | WAITER |
|---|---|:-:|:-:|:-:|:-:|
| Apertura de sesión (`sessions/open`, `open-pin`) | `cash:open_session` | ✅ | ✅ | ✅ | ❌ |
| Cierre de sesión (`sessions/close`, `close-arqueo`) | `cash:close_session` | ✅ | ✅ | ❌ | ❌ |
| Cash in/out | `cash:collect` | ✅ | ✅ | ✅ | ❌ |
| Reporte X (`reports/x`) | `cash:collect` (propio) | ✅ | ✅ | ✅ | ❌ |
| Reporte Z (`reports/z`) | `cash:audit` | ✅ | ✅ | ❌ | ❌ |
| Configuración de POS (`configs`) | **NUEVO** `pos:config` | ✅ | ✅ | ❌ | ❌ |

### 3.3 Llamados de mozo (`api/v1/waiter/calls`)

| Endpoint | Permiso requerido |
|---|---|
| `GET /`, `PATCH /:id/acknowledge`, `/take-order` | `tables:own` / `orders:read` |
| `PATCH /:id/resolve` | `tables:own` |

### 3.4 KDS, HR-Asistencia, Órdenes

Ya cubiertos correctamente hoy (ver §4): usan `@RequirePermissions` con `orders:*` y `hr:attendance:*`. Sirven como **modelo a replicar** en el resto.

---

## 4. Hallazgos concretos en el código (brechas de seguridad)

Auditoría directa sobre `backend/src/` en main post-FEAT-151/152 (v1.36.4):

| # | Archivo | Líneas | Problema |
|---|---|:-:|---|
| 1 | `pos/pos.controller.ts` | 19-20 | Usa solo `@UseGuards(ApiKeyGuard)`, **sin `PermissionsGuard` ni `@RequirePermissions` en ningún endpoint**. Cualquier usuario autenticado del tenant puede abrir/cerrar caja, hacer cash-in/out, emitir reporte Z, crear pisos/mesas, sin chequeo de rol. |
| 2 | `pos/pos.controller.ts` | 48, 96 | **Instancia `new PrismaService()` directamente**, violando la regla de arquitectura que prohíbe instanciar `PrismaClient` fuera del singleton. |
| 3 | `waiter/waiter-calls.controller.ts` | 23 | Solo `@UseGuards(ApiKeyGuard)`. Sin `PermissionsGuard` ni `@RequirePermissions`. Sin control de rol para resolver/tomar llamados. |
| 4 | `tables/tables.controller.ts` | 166-179 | `updateStatus` **sin ningún check RBAC**. Cualquier usuario autenticado puede cambiar estados de mesa. |
| 5 | `tables/tables.controller.ts` | 214-228 | `addGuest` **sin check RBAC**. |
| 6 | `tables/tables.controller.ts` | 230-242 | `removeGuest` **sin check RBAC**. |
| 7 | `tables/tables.controller.ts` | 244-267 | `transferTable` **sin check RBAC**, a pesar de que el `@ApiOperation` dice explícitamente "requiere tables:manage / tables:reassign". El comentario documenta la intención, el código no la aplica. |
| 8 | `tables/tables.controller.ts` | 273-303, 319-340 | `createGift` y `giftLine` **sin check RBAC**. |
| 9 | `common/rbac.service.ts` | 260 | `if (roleStr === 'ADMIN' || roleStr === 'MANAGER' || roleStr === 'SUPERADMIN' || roleStr === 'OWNER') return true;` — **todo `MANAGER` tiene acceso total e incondicional a cualquier permiso**, anulando `seedRolePermissions`. |
| 10 | `common/rbac.service.ts` | 260 | Los valores `'SUPERADMIN'` y `'OWNER'` no existen en el enum `UserRole` de Prisma (`ADMIN, MANAGER, SELLER, WAITER, EMPLOYEE, VIEWER`). Es código muerto en `hasPermission`, pero `OWNER` sí se usa en el flujo de creación de tenant (`auth.service.ts:155`) y en `PermissionsGuard:28`. Inconsistencia de tipos. |
| 11 | `common/permissions.guard.ts` | 55-57 | **Bypass total por API key**: si el request trae header `x-api-key`, el guard retorna `true` sin verificar permisos. Esto anula el RBAC para terminales POS/KDS que se autentican por API key (el caso de uso principal de OmniGastro). |
| 12 | `pos/pos.controller.ts` vs `pos-sessions/pos-sessions.controller.ts` | — | Hay **dos módulos de sesiones de caja en paralelo**: `pos.controller.ts` tiene `sessions/open`, `sessions/close`, `sessions/close-arqueo` sin RBAC; `pos-sessions.controller.ts` tiene `open`, `:id/close`, `:id/report` con RBAC correcto. Si el frontend usa el primero, el control de roles es inexistente. |
| 13 | `common/rbac.service.ts` | 137-196 | `seedRolePermissions()` solo seedea `WAITER`, `SELLER` y `MANAGER`. `EMPLOYEE` y `VIEWER` no tienen mapeo inicial; cualquier intento de usar RBAC con esos roles falla con acceso denegado hasta seedearlos manualmente. |

---

## 5. Riesgo de fondo: "sesión de dispositivo compartido" (PIN)

`auth.service.verifyPin()` identifica al empleado por PIN pero **no emite un JWT por empleado**: el dispositivo POS/KDS opera con una sesión de tenant compartida (API key o JWT del turno), y el PIN solo sirve para *atribuir* quién hizo la acción, no para autenticar el request ante `PermissionsGuard`.

**Implicación de diseño:** para acciones de alto riesgo (cierre de caja Z, anulación de pedido, descuento/gift, eliminación de mesa) se necesita un segundo mecanismo, no solo `@RequirePermissions`: un **"step-up" por PIN de un rol autorizado** (p. ej. MANAGER) en el momento de la acción, similar a como un supermercado pide la tarjeta del supervisor para autorizar un descuento. Ver propuesta en §6.4.

**Agravante:** el bypass por API key en `PermissionsGuard` (§4, hallazgo 11) hace que este problema sea crítico en producción: cualquier terminal POS/KDS con API key puede ejecutar acciones de alto riesgo sin第二步 de autorización.

---

## 6. Plan de implementación

### 6.1 Cerrar las brechas encontradas (prioridad alta)

```ts
// pos/pos.controller.ts
@Controller('api/v1/pos')
@UseGuards(ApiKeyGuard, PermissionsGuard)
export class PosController {
  @Post('sessions/open')
  @RequirePermissions('cash:open_session')
  openSession(...) { ... }

  @Post('sessions/close')
  @Post('sessions/close-arqueo')
  @RequirePermissions('cash:close_session')
  closeSession(...) { ... }

  @Post('cash/in')
  @Post('cash/out')
  @RequirePermissions('cash:collect')
  cashMovement(...) { ... }

  @Post('reports/x')
  @RequirePermissions('cash:collect')
  generateXReport(...) { ... }

  @Post('reports/z')
  @RequirePermissions('cash:audit')
  closeSessionZ(...) { ... }

  @Post('configs')
  @Patch('configs/:configId')
  @RequirePermissions('tenants:manage')
  configureTerminal(...) { ... }
}
```

> **Nota:** el `new PrismaService()` en líneas 48 y 96 debe reemplazarse por inyección de `PrismaService` en el constructor o usar `@TenantPrisma()`.

```ts
// tables/tables.controller.ts — agregar los checks faltantes
@Post(':id/status')
async updateStatus(@Req() req: any, ...) {
  const { tenantId, userId } = ctx(req);
  await this.rbacService.assertPermission(userId, tenantId, 'tables:status');
  ...
}

@Post(':id/guests')
async addGuest(@Req() req: any, ...) {
  const { tenantId, userId } = ctx(req);
  await this.rbacService.assertPermission(userId, tenantId, 'tables:guests');
  ...
}

@Delete('guests/:guestId')
async removeGuest(@Req() req: any, ...) {
  const { tenantId, userId } = ctx(req);
  await this.rbacService.assertPermission(userId, tenantId, 'tables:guests');
  ...
}

@Post(':id/transfer')
async transferTable(@Req() req: any, ...) {
  const { tenantId, userId } = ctx(req);
  const isOwnTable = await this.tablesService.isOwner(tenantId, fromTableId, userId);
  const permission = isOwnTable ? 'tables:own' : 'tables:reassign';
  await this.rbacService.assertPermission(userId, tenantId, permission);
  ...
}

@Post(':id/gift')
@Post(':id/gift-line')
async createGift(@Req() req: any, ...) {
  const { tenantId, userId } = ctx(req);
  await this.rbacService.assertPermission(userId, tenantId, 'tables:gift');
  ...
}
```

```ts
// waiter/waiter-calls.controller.ts
@Controller('api/v1/waiter/calls')
@UseGuards(ApiKeyGuard, PermissionsGuard)
export class WaiterCallsController {
  @Get()
  @RequirePermissions('tables:own')
  async list(...) { ... }

  @Patch(':id/acknowledge')
  @RequirePermissions('tables:own')
  async acknowledge(...) { ... }

  @Patch(':id/take-order')
  @RequirePermissions('tables:own')
  async takeOrder(...) { ... }

  @Patch(':id/resolve')
  @RequirePermissions('tables:own')
  async resolve(...) { ... }
}
```

### 6.2 Nuevos permisos a agregar a `PERMISSION_SEED`

```ts
{ name: 'tables:status', description: 'Cambiar estado de mesa', module: 'tables' },
{ name: 'tables:guests', description: 'Agregar/quitar comensales de una mesa', module: 'tables' },
{ name: 'tables:gift', description: 'Regalar ítems entre mesas/comensales', module: 'tables' },
{ name: 'pos:config', description: 'Configurar terminales POS', module: 'pos' },
```

Y su mapeo en `seedRolePermissions()`:

```ts
{ role: 'WAITER',  permissionNames: [...actuales, 'tables:status', 'tables:guests'] },
{ role: 'SELLER',  permissionNames: [...actuales, 'tables:status', 'tables:guests'] },
{ role: 'MANAGER', permissionNames: [...actuales, 'tables:status', 'tables:guests', 'tables:gift', 'pos:config'] },
{ role: 'EMPLOYEE', permissionNames: ['tables:status', 'tables:guests'] },
{ role: 'VIEWER', permissionNames: [] },
```

### 6.3 Corregir el bypass de `MANAGER`

Reemplazar el atajo total por una verificación real contra `RolePermission`, dejando el bypass incondicional **solo** para `ADMIN` y `isSuperAdmin`:

```ts
// common/rbac.service.ts
async hasPermission(userId: string, tenantId: string, permissionName: string): Promise<boolean> {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true },
  });

  if (user?.isSuperAdmin) {
    return true;
  }

  const access = await this.prisma.userTenantAccess.findFirst({
    where: { userId, tenantId, active: true },
    select: { role: true },
  });

  if (!access) {
    return false;
  }

  if (access.role === 'ADMIN') return true;

  const roleHas = await this.prisma.rolePermission.findFirst({
    where: { role: access.role, permission: { name: permissionName } },
  });

  if (roleHas) return true;

  const userPerm = await this.prisma.userTenantPermission.findFirst({
    where: {
      userId,
      tenantId,
      granted: true,
      permission: { name: permissionName },
    },
  });

  return !!userPerm;
}
```

> Antes de aplicar este cambio: correr `seedRolePermissions()` con la matriz completa de MANAGER (incluyendo módulos HR, integraciones, etc. que hoy dependen del bypass), o los `MANAGER` existentes perderán acceso de golpe. Hacerlo en un solo despliegue con la seed actualizada.

### 6.4 Cerrar el bypass por API key en `PermissionsGuard`

El guard actual retorna `true` para cualquier request con header `x-api-key` (línea 55-57). Esto anula el RBAC para terminales POS/KDS, que se autentican precisamente por API key.

**Solución:** cambiar el bypass de API key a un bypass **solo para ADMIN** (porque la API key representa al tenant, no a un usuario operativo):

```ts
// common/permissions.guard.ts
if (apiKeyAuth && tenant?.id) {
  const apiKey = request.headers['x-api-key'] as string;
  const apiTenant = await this.prisma.tenant.findUnique({
    where: { apiKeySecret: apiKey },
  });
  if (apiTenant && apiTenant.active && apiTenant.id === tenant.id) {
    // La API key autentica al tenant, pero NO otorga permisos de operador.
    // Para POS/KDS compartido, el endpoint debe requerir un permiso EXPLÍCITO
    // o usar step-up por PIN. No retornar true aquí.
    (request as any).apiKeyAuth = true;
  }
}
```

**Impacto:** esto es un cambio de comportamiento. Terminales que hoy usan API key sin JWT van a recibir `403` en endpoints protegidos. Hay dos caminos:

- **Opción A (recomendada):** los endpoints de terminal compartido (POS, KDS) usan `step-up` por PIN para acciones sensibles, y el PIN resuelve el usuario operativo contra `authService.verifyPin()` antes de llamar a `hasPermission`.
- **Opción B:** crear un rol de sistema `TERMINAL` con permisos limitados y mapear la API key a ese rol en el guard.

Para OmniGastro, la Opción A es la correcta porque el flujo PIN ya existe.

### 6.5 Unificar sesiones de caja

`pos.controller.ts` tiene `sessions/open`, `sessions/close`, `sessions/close-arqueo` sin RBAC, y `pos-sessions.controller.ts` tiene las mismas operaciones con RBAC correcto.

**Decisión:** deprecar las rutas de `pos.controller.ts` y redirigir el frontend a `pos-sessions.controller.ts`. Mantener `pos.controller.ts` solo para:
- `configs` (CRUD de `PosConfig`)
- `floors`, `tables` (OmniGastro)

Eliminar de `pos.controller.ts`: `sessions/*`, `cash/*`, `reports/*`.

### 6.6 Step-up de autorización para acciones críticas

Para las acciones marcadas como sensibles en la matriz (gift, cierre Z, anulación), agregar un guard adicional que exija un segundo PIN de un rol autorizado en el `body`, reutilizando `authService.verifyPin`:

```ts
export const RequireStepUpRole = (...roles: string[]) => SetMetadata('stepUpRoles', roles);

@Injectable()
export class StepUpGuard implements CanActivate {
  constructor(private reflector: Reflector, private authService: AuthService) {}
  async canActivate(ctx: ExecutionContext) {
    const roles = this.reflector.get<string[]>('stepUpRoles', ctx.getHandler());
    if (!roles) return true;
    const req = ctx.switchToHttp().getRequest();
    const { authorizerPin } = req.body;
    if (!authorizerPin) throw new ForbiddenException('Se requiere PIN de autorización');
    const result = await this.authService.verifyPin(req.tenant.id, authorizerPin);
    if (!result.success || !roles.includes(result.user.role)) {
      throw new ForbiddenException('PIN de autorización inválido para esta acción');
    }
    req.authorizedBy = result.user;
    return true;
  }
}

// Uso:
@Post(':id/gift')
@RequirePermissions('tables:gift')
@RequireStepUpRole('MANAGER', 'ADMIN')
@UseGuards(StepUpGuard)
createGift(...) { ... }
```

### 6.7 Orden de trabajo sugerido

1. Corregir el bypass por API key en `PermissionsGuard` (§6.4) — **este cambio desbloquea la necesidad de step-up**.
2. Implementar `StepUpGuard` para gift, cierre Z y anulación de pedido (§6.6).
3. Agregar los 4 permisos nuevos (§6.2) y correr seed completa (incluyendo `EMPLOYEE` y `VIEWER`).
4. Blin dar `pos.controller.ts` (solo configs/floors/tables) y `waiter-calls.controller.ts` con `PermissionsGuard` (§6.1).
5. Completar checks faltantes en `tables.controller.ts` (§6.1).
6. Eliminar rutas duplicadas de sesiones/caja/reportes de `pos.controller.ts` y consolidar en `pos-sessions.controller.ts` (§6.5).
7. Corregir bypass de `MANAGER` en `rbac.service.ts` (§6.3) junto con la seed actualizada.
8. Corregir `new PrismaService()` en `pos.controller.ts` líneas 48 y 96.
9. Escribir tests de `PermissionsGuard`/`RbacService` por rol para los endpoints tocados (ya existe `rbac.service.spec.ts` como base).
10. Actualizar `auth.service.ts` para normalizar el rol `OWNER` a `ADMIN` en el JWT (o agregar `OWNER` al enum `UserRole` si se decide mantenerlo como rol válido).

---

## 7. Resumen de la matriz final propuesta (por rol)

| Módulo | ADMIN | MANAGER | SELLER | WAITER | EMPLOYEE | VIEWER |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Mesas — lectura | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Mesas — gestión/plano | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Mesas — atender/transferir propias | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Mesas — gift/regalo | ✅ | ✅ (o step-up) | ❌ | ❌ | ❌ | ❌ |
| Caja — abrir sesión | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Caja — cerrar sesión / Z | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Caja — cash in/out | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| KDS — bump/cancelar comanda | ✅ | ✅ | ✅ | ✅ | ✅ (cocina) | ❌ |
| HR — marcar asistencia propia | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| HR — gestionar legajos/nómina | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Reportes / analítica | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |

---

## 8. Cambios respecto al diseño original

| # | Corrección | Motivo |
|---|---|---|
| 1 | Stats actualizados: 51 controllers con `@RequirePermissions`, no "53 de 88" | Conteo real en v1.36.4 |
| 2 | Agregado hallazgo 10: `PermissionsGuard` bypass por API key (líneas 55-57) | Crítico para POS/KDS compartido |
| 3 | Agregado hallazgo 11: dualidad `pos.controller.ts` vs `pos-sessions.controller.ts` con rutas duplicadas sin RBAC | Impacta rollout de OmniGastro |
| 4 | Agregado hallazgo 12: `EMPLOYEE`/`VIEWER` sin seed en `seedRolePermissions()` | Bloquea rollout de roles operativos |
| 5 | Corregido §6.3: el bypass de MANAGER es el problema principal, no `SUPERADMIN`/`OWNER` que son código muerto en `hasPermission` | `OWNER` se usa en auth pero no en RBAC |
| 6 | Orden de implementación invertido: cerrar bypass API key primero, luego step-up, luego seed, luego MANAGER bypass | Sin paso 1, los pasos 3-7 no son seguros en producción |
| 7 | §6.5 agregado: unificación de sesiones de caja | Elimina ruta zombie sin RBAC |

---

*Documento corregido: 2026-09-27. Auditado contra backend v1.36.4 (main post-FEAT-151/152).*
