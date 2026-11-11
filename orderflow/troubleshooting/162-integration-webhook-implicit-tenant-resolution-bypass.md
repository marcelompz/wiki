# Webhook OrderFlow Acepta Llamadas Sin Credenciales por Resolución Implícita de Tenant

> **Área:** Backend / Integraciones / Auth  
> **Estado:** 🛠️ Documentado  
> **Síntoma principal:** `POST /api/v1/integrations/orderflow/webhook` devuelve `201` sin JWT ni API key cuando la request llega por un host/subdominio conocidos; bypass de autenticación.

---

## Causa raíz

`ApiKeyGuard` incluye un fallback de resolución de tenant por host/subdominio. Cuando la request HTTP llega desde un dominio conocido (`provecchio.com`, `orderflow.provecchio.com`, etc.), el guard encuentra el tenant por subdominio/host y marca la request como autenticada, incluso si no se envió `Authorization: Bearer ...` ni `x-api-key`.

El controlador `OrderFlowIntegrationController` usaba solo `@UseGuards(ApiKeyGuard)` en toda la ruta `api/v1/integrations`, por lo que el endpoint de webhook quedó accesible sin credenciales desde fuera.

## Evidencia

- Test E2E: `facturasend-api.spec.ts:37`
- Comportamiento real: `curl -X POST https://provecchio.com/api/v1/integrations/orderflow/webhook ...` devuelve `201` sin headers de auth.

## Solución aplicada

1. Documentar el hallazgo en `docs/troubleshooting/README.md`.
2. Ajustar el controlador de integraciones para rechazar requests sin credenciales explícitas, preservando la resolución por host solo para requests autenticadas con API key o JWT.
3. Agregar permiso RBAC explícito `integrations:webhook:receive` al seed y al endpoint con `@RequirePermissions('integrations:webhook:receive')`.
4. Corregir error de tipado TS2678 en build Docker: `event` no estaba definido antes del `switch`. Se asignó `const event = (payload?.event || '') as string;` antes del bloque.
5. Actualizar el test E2E para usar credenciales válidas y cubrir el caso negativo correctamente.
6. Agregar colección de Newman en `docs/tests/newman/contracts.postman_collection.json` para estandarizar la validación del webhook y endpoints críticos.

## Archivos afectados

- `backend/src/common/api-key.guard.ts`
- `backend/src/common/rbac.service.ts`
- `backend/src/common/permissions.guard.ts`
- `backend/src/integrations/orderflow-integration.controller.ts`
- `frontend/e2e/facturasend-api.spec.ts`
- `docs/tests/newman/contracts.postman_collection.json`
- `docs/tests/newman/production.postman_environment.json`
- `docs/troubleshooting/README.md`
- `docs/plans/omnigastro/auditoria-feat151-152-e2e-20260927.md`

## Referencias

- `docs/plans/omnigastro/auditoria-feat151-152-e2e-20260927.md`
- `docs/troubleshooting/README.md`
- `docs/tests/newman/README.md`
