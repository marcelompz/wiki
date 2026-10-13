# Migración de Datos Hardcodeados a API Dinámica en OmniGastro

> **Área:** Frontend / OmniGastro / API  
> **Síntoma principal:** 4 páginas usaban arrays estáticos (`waitersList`, `mockBills`, operadores) en vez de endpoints reales; riesgo de datos desactualizados en producción  
> **Estado:** ✅ Resuelto

---

## Síntomas

- Datos de ejemplo estáticos en `/admin/gastro`, `/admin/gastro/cashier`, `/admin/pos` e `/admin/gastro/incentives`.
- Descalce entre la información mostrada y el estado real del tenant.

## Causa raíz

Implementación inicial con mocks locales para desarrollo que nunca se migró a endpoints dinámicos.

## Solución aplicada

Reemplazar arrays hardcodeados por llamadas a:
- `/api/v1/users/staff` — personal y operadores.
- `/api/v1/orders/guest/pending` — cuentas/pedidos pendientes en caja.
- `/api/v1/integrations/promotions` — promociones activas.

## Archivos modificados

- `frontend/src/pages/admin/gastro.tsx`
- `frontend/src/pages/admin/gastro-cashier.tsx`
- `frontend/src/pages/admin/pos.tsx`
- `frontend/src/pages/admin/gastro-incentives.tsx`
- `backend/src/integrations/integrations.controller.ts`
- `backend/src/integrations/services/integrations.service.ts`

## Prevención

- No commitear mocks de datos estáticos en páginas admin.
- Establecer convención: todas las páginas admin deben consumir APIs dinámicas.
