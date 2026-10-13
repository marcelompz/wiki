# Jest: Mock `employee` Faltante e Import Incorrecto

> **Área:** Backend / Jest / Tests  
> **Síntoma principal:** `position.service.spec.ts` falla por `prisma.employee.findFirst` undefined; `localization.registry.spec.ts` no encuentra módulo por import relativo incorrecto  
> **Estado:** ✅ Resuelto

---

## Síntomas

1. `FAIL src/positions/position.service.spec.ts`
   - `TypeError: Cannot read properties of undefined (reading 'findFirst')`
   - Ocurre en `PositionService.remove()` porque el mock de Prisma no incluye `employee`.
2. `FAIL src/hr/localization/localization.registry.spec.ts`
   - `Cannot find module '../localization.registry'`
   - El import relativo apunta a una ruta inexistente.

## Causa raíz

1. **Mock incompleto:** `position.service.spec.ts` solo mockeaba `position` y `userTenantAccess`, pero `PositionService.remove()` también llama a `prisma.employee.findFirst`.
2. **Import roto:** `localization.registry.spec.ts` usaba `../localization.registry` cuando el archivo está en el mismo directorio.

## Solución aplicada

1. Agregar `employee: { findFirst: jest.fn() }` al mock de Prisma en `position.service.spec.ts`.
2. Corregir import a `./localization.registry` en `localization.registry.spec.ts`.

## Archivos modificados

- `backend/src/positions/position.service.spec.ts`
- `backend/src/hr/localization/localization.registry.spec.ts`

## Prevención

- Al mockear `PrismaService`, incluir todos los modelos que use el servicio bajo prueba.
- Usar imports relativos consistentes dentro del mismo directorio (`./` en vez de `../`).
