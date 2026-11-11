# Troubleshooting #186 — `/admin/hr` devuelve 500 en `hr/employees` y 404 en `positions`

> **Fecha:** 2026-10-22 · **Estado:** ✅ Resuelto en **v1.39.28** · **Rama:** `fix/hr-positions-404-and-restore-migrations`

## Síntoma

Al abrir `https://provecchio.local/admin/hr` la consola del navegador muestra:

```
XHR GET  /api/v1/hr/employees   → HTTP 500
XHR GET  /api/v1/positions      → HTTP 404
No se pudieron cargar las opciones organizativas   (AxiosError: 404)
```

y en los logs del backend:

```
[SentryExceptionFilter] error: [500] GET /api/v1/hr/employees
PrismaClientKnownRequestError: ...
```

> Los avisos `Unknown property '-moz-osx-font-smoothing'`, `::-ms-clear`, `@-ms-viewport`,
> `::-moz-focus-inner` y el bloqueo de `telemetry.refine.dev` **no son errores**: son reglas CSS
> de vendor prefixes y la telemetría de Refine bloqueada por el navegador. No requieren acción.

## Causa raíz (dos bugs distintos)

### 1. `500` en `/api/v1/hr/employees` — el restore dejaba la base local desalineada

El protocolo de despliegue (AGENTS.md §3.1.1) **restaura el dump de producción en localhost** para
probar contra datos reales. El dump se toma **antes** del deploy, así que la base local queda en el
estado de producción **anterior** a la migración de la release en curso:

- La release v1.39.26 añadió `Employee.canUseMozoPos` (migración `20261022120000`).
- El dump del 2026-10-22 07:10 se tomó de producción **antes** de aplicar esa migración.
- El restore sobrescribió la base local (y la tabla `_prisma_migrations`) → **la columna
  `can_use_mozo_pos` no existía**, pero el backend ya corría el código nuevo → Prisma lanza
  `PrismaClientKnownRequestError` en cualquier consulta que use `Employee` → **500**.

> En **producción** el mismo endpoint respondía 200 porque el deploy sí aplicó la migración.
> El 500 era exclusivo del entorno local, pero rompía la validación previa al deploy.

**Solución:** `scripts/restore-provecchio.sh` ahora ejecuta `prisma migrate deploy` contra la base
recién restaurada (con el `DATABASE_URL` de `backend/.env` redirigido al puerto mapeado
`localhost:5433`), de modo que el entorno local queda **fiel al código que se va a probar**.
Si la migración falla, el script aborta con error en lugar de dejar un entorno desalineado.

### 2. `404` en `/api/v1/positions` — `PositionModule` nunca se registró

`backend/src/app.module.ts` **importaba** `PositionModule` (línea 67) pero **no lo incluía** en el
array `imports` del `AppModule`. Nest no monta los controladores de un módulo que no está
registrado → la ruta `/api/v1/positions` nunca existió → **404** en cualquier tenant.

**Consecuencia:** el formulario de empleados de `/admin/hr` no podía cargar los *cargos*, y la
sección "Empleados Mozo" de `/admin/settings → OmniGastro` tampoco.

**Solución:** registrar `PositionModule` en `imports` del `AppModule`.

## Falso positivo descartado: "migraciones fallidas"

La tabla `_prisma_migrations` tiene **10 filas con `finished_at = NULL`**
(`20260912_rls_enable`, `20260916_add_birthday_campaigns`, `20260920180000_add_position_to_user_tenant_access`,
`20260920210000_sync_hr_schema`, `20260921180000_add_employee_pin_code`, `20260921190000_add_product_kds_visibility`,
`20260921230000_add_cash_registers`, `20260927193000_kds_multi_station_printing`).

**No están fallidas: están `rolled_back_at` no nulo** (revertidas). Prisma no las re-aplica, por lo que
**no había riesgo de fallo en el siguiente deploy**. Antes de "arreglarlas" hay que comprobar
`rolled_back_at`: un `UPDATE ... SET finished_at = now()` a ciegas habría marcado como aplicadas
migraciones cuyo esquema no está (p. ej. `user_tenant_access.position`, que el `schema.prisma` actual
no usa: usa `positionId`).

**Verificación del estado real del esquema** (los efectos de esas migraciones sí están aplicados):

| Efecto | Presente |
|---|---|
| `employees.pin_code` | ✅ |
| `products.kds_visibility_mode` | ✅ |
| tabla `cash_registers` | ✅ |
| tabla `birthday_campaigns` | ✅ |
| tabla `positions` | ✅ |
| `preparation_stations.tenantId` | ✅ (tabla legacy en camelCase, ver AGENTS.md §2.4.2) |
| RLS activo | ✅ 123 tablas con `rowsecurity = true` |

## Validación

- E2E de regresión `frontend/e2e/hr-endpoints.spec.ts`: **3 passed**
  (`hr/employees` 200 con `canUseMozoPos` en el payload · `positions` 200 con la lista de cargos ·
  `hr/organization` 200).
- Verificado en localhost: `hr/employees` 200 · `positions` 200 (6 cargos) · `hr/organization` 200.

## Archivos

| Archivo | Cambio |
|---|---|
| `backend/src/app.module.ts` | `PositionModule` registrado en `imports` |
| `scripts/restore-provecchio.sh` | `prisma migrate deploy` tras el restore (fidelidad del entorno local) |
| `frontend/e2e/hr-endpoints.spec.ts` | **nuevo** — regresión de los tres endpoints |
