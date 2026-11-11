# Auditoría — FEAT-194 F2 · Bandera de Mozo

> **Vertical:** OmniGastro · **Fecha:** 2026-10-22 · **Versión:** v1.39.26
> **Rama:** `feat/gastro-bandera-mozo-f2` (desde `main` @ `52d6a4af`)
> **Plan maestro:** [`plan-actualizacion-v1.39.25-historial-pedidos-bandera-mozo.md`](./plan-actualizacion-v1.39.25-historial-pedidos-bandera-mozo.md) §3

---

## 1. Requerimiento del cliente

> *"El endpoint que alimenta `/admin/gastro/mozos` debe desplegar SOLO los empleados que están
> configurados como Mozo en `/admin/settings` → OmniGastro (restaurante). Esa configuración se valida
> con una bandera en la tabla de empleados (Employee) que habilita la opción de tener sesión en el
> POS de Mozo."*

---

## 2. Causa raíz del comportamiento anterior

| Punto | Antes |
|---|---|
| Selector de mozos | `GET /api/v1/users/staff` → `getGastronomyStaff` filtraba por **texto de cargo** (`GASTRONOMY_POSITIONS`: `WAITER`, `COOK`, `CASHIER`, `Mozo`, `Cajero`, `Cocinero`…) → el cajero y el cocinero también aparecían como mozos |
| Login por PIN | `POST /api/v1/auth/verify-pin` buscaba el PIN en **toda** la gastronomía (`getGastronomyStaff`) → cualquiera con PIN de cocina o caja podía abrir sesión de mozo |
| Modelo de datos | `Employee` no tenía ninguna bandera; no había forma de expresar "habilitado para el POS de Mozo" |
| Configuración | No existía ninguna pantalla para decidir quién es mozo |

---

## 3. Implementación

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 1 | `Employee.canUseMozoPos Boolean @default(false) @map("can_use_mozo_pos")` | `backend/prisma/schema.prisma` | ✅ |
| 2 | Migración `20261022120000_add_can_use_mozo_pos_to_employees` (columna snake_case + backfill D1) | `backend/prisma/migrations/.../migration.sql` | ✅ |
| 3 | `UsersService.getMozoStaff(tenantId)` (filtra `status=ACTIVE` + `canUseMozoPos=true`, **no** por cargo) | `backend/src/users/services/users.service.ts` | ✅ |
| 4 | `GET /api/v1/users/mozo-staff` (con `ApiKeyGuard` + `PermissionsGuard`, devuelve `canUseMozoPos`) | `backend/src/users/users.controller.ts` | ✅ |
| 5 | `AuthService.verifyPin(tenantId, pinCode, scope?)` con `scope:'mozo'` + `user.canUseMozoPos` en la respuesta | `backend/src/auth/auth.service.ts` | ✅ |
| 6 | `POST /api/v1/auth/verify-pin` acepta `scope` | `backend/src/auth/auth.controller.ts` | ✅ |
| 7 | `canUseMozoPos` en `CreateEmployeeDto` y `UpdateEmployeeDto` (`@IsBoolean() @IsOptional()`) | `backend/src/hr/dto/employee.dto.ts` | ✅ |
| 8 | `hr.service` persiste la bandera en alta y edición (se puede **desactivar** con `false`) | `backend/src/hr/hr.service.ts` | ✅ |
| 9 | Selector de mozos: `/api/v1/users/mozo-staff` + `scope:'mozo'` en el verify-pin | `frontend/src/pages/admin/gastro-mozos.tsx` | ✅ |
| 10 | Aviso "Sin habilitación de Mozo" en el panel si la sesión quedó sin la bandera | `frontend/src/pages/admin/gastro.tsx` | ✅ |
| 11 | Sección **"Empleados Mozo"** en `/admin/settings → OmniGastro` (tabla con switch, fuera del Form de tenant-settings) | `frontend/src/pages/admin/settings.tsx` | ✅ |
| 12 | Switch "Puede abrir sesión en el POS de Mozo" en el formulario de empleado | `frontend/src/pages/admin/hr.tsx` | ✅ |

---

## 4. Decisiones aplicadas

| Decisión | Aplicación |
|---|---|
| **D1 · backfill** (aprobada) | La migración marca `can_use_mozo_pos = true` para empleados **de sala** (`WAITER`, `HEAD_WAITER`, `Mozo`, `Jefe de Sala`) con `status='ACTIVE'` y PIN asignado. Los cajeros y cocineros **no** se habilitan (la bandera es del POS de Mozo); el admin puede activarla desde la UI |
| **Fuente de verdad** | La bandera vive en `Employee`; `/admin/settings → OmniGastro` la **deriva** y la edita (no se duplica el estado) |
| **Compatibilidad** | `verify-pin` **sin** `scope` conserva el comportamiento anterior (toda la gastronomía) → los demás flujos de PIN no se rompen |
| **Privacidad** | El endpoint nuevo reutiliza los guards existentes (`ApiKeyGuard` + `PermissionsGuard`); no expone datos nuevos (el `staff` ya devolvía el `pinCode`) |

---

## 5. Validación (localhost, `https://provecchio.local`, backend `1.39.26 ok`)

| Tipo | Resultado |
|---|---|
| E2E `frontend/e2e/mozo-flag.spec.ts` | ✅ **3 passed** |
| Unitarios `users.service.mozo-staff.spec.ts` | ✅ **3 passed** |
| Unitarios `auth.service.mozo-pin.spec.ts` | ✅ **4 passed** |
| `tsc` backend y frontend | ✅ 0 errores |
| eslint sobre los archivos tocados | ✅ 0 errores |
| Verificación manual en BD | `can_use_mozo_pos`: 1 `true` (Ivan Castillo · Mozo), 4 cajeros y 1 cocinero en `false` |

### Qué cubre cada caso E2E

1. **`/api/v1/users/mozo-staff` devuelve solo los habilitados** — todos los elementos traen
   `canUseMozoPos: true` y el subconjunto es estrictamente menor que `/users/staff`.
2. **`verify-pin` con `scope:'mozo'`** — el PIN del empleado habilitado devuelve `success: true` con
   `user.canUseMozoPos: true`; el PIN de un empleado **sin** la bandera devuelve `success: false`, **sin
   token**, y el mensaje *"no está habilitado para el POS de Mozo"*; el mismo PIN **sin** `scope` sigue
   funcionando (no se rompe el flujo previo).
3. **`/admin/gastro/mozos`** — el selector muestra la tarjeta del Mozo habilitado y **no** aparece el
   cajero sin bandera.

---

## 6. Estado de la base tras el backfill

```
 can_use_mozo_pos | position | status
------------------+----------+---------
 t                | Mozo     | ACTIVE     (Ivan Castillo, PIN 1234)
 f                | Cajero   | ACTIVE     (x4)
 f                | Cocinero | ACTIVE
```

---

## 7. Pendiente

- [ ] Verificación manual en la tablet del mozo (login con PIN y con la bandera habilitada).
- [ ] Decidir si algún cajero necesita la habilitación (se hace desde la UI, sin deploy).
- [ ] F4 + F4b (v1.39.27): historial en servidor del mozo y del cajero.
- [ ] Deploy a producción (requiere autorización explícita).
