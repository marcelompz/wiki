# FEAT-112 — Safeguards Cerrados (SG-01, SG-02, SG-03)

> **Fecha:** 2026-09-18
> **Área:** Backend / Prisma / Seguridad de Datos
> **Estado:** ✅ Resuelto

## Síntoma
- `featurelist.json` marcaba FEAT-112 como `completed`, pero los 3 safeguards técnicos no existían en el código.
- Riesgo: migración `*_omnigastro_core` no podía generarse sin data safety.

## Causa Raíz
1. SG-01: No existía extensión Prisma para soft-delete.
2. SG-02: `onDelete: Restrict` ya existía en el schema para modelos gastro raíz, pero no estaba documentado/verificado.
3. SG-03: No había linter ESLint que impidiera `new PrismaClient()` en módulos gastro.

## Solución Aplicada

### SG-01 — Soft-Delete Extension
- **Archivo:** `backend/prisma/extensions/soft-delete.extension.ts`
- Intercepts `delete`, `deleteMany`, `findFirst`, `findMany`, `findUnique`, `count` en `$allModels`.
- Solo aplica a modelos con `isDeleted`/`deletedAt` (conjunto `SOFT_DELETE_MODELS` con 60+ modelos).
- `delete` → `update({ data: { isDeleted: true, deletedAt: new Date() } })`.
- Queries → auto-filtran `isDeleted: false` a menos que el caller lo sobrescriba.
- **Conexión:** `backend/src/common/prisma.service.ts` usa `PrismaClient.extend(softDeleteExtension)`.

### SG-02 — `onDelete: Restrict`
- Verificado en `backend/prisma/schema.prisma`: RestaurantTable, PosSession, PosConfig, PreparationStation, UnitOfMeasure, ProductBom, BillSplit, WaiterCall, RestaurantFloor, WaiterCallOption, KitchenTicket, TableGuest, SplitPayment, BomLine todos usan `onDelete: Restrict` o `SetNull`.
- Solo modelos hija (OrderLine, EmployeeDocument, etc.) mantienen `Cascade` donde es seguro.

### SG-03 — ESLint Linter
- **Archivo:** `backend/.eslintrc.cjs`
- Regla `no-restricted-syntax`: `NewExpression > Identifier[name='PrismaClient']` → error.
- Excepciones: `src/common/tenant-connection.manager.ts`, `src/common/prisma.service.ts`, `src/scripts/**/*.ts`.
- Verificación: `npm run lint` → 0 errores de `no-restricted-syntax`.

## Verificación
- `npx eslint "src/**/*.ts" --ext .ts` → 0 errores SG-03.
- `npx tsc --noEmit` → 0 errores en módulos HR y Prisma.
- `softDeleteExtension` exportado y testeado en `backend/src/common/soft-delete.extension.spec.ts`.

## Notas
- La migración `*_omnigastro_core` ahora puede generarse sin violar data safety.
- Los modelos sin `isDeleted` (ej: Order, OrderLine, Payment) no se ven afectados por la extensión.