# OmniGastro: Datos Hardcodeados de Mozos y Endpoint Promociones Faltante

> **Área:** Frontend / Backend / OmniGastro  
> **Síntoma principal:** Crash en `/admin/gastro/mozos` por `todayTips` undefined; arrays hardcodeados en 4 páginas; endpoint `/api/v1/integrations/promotions` inexistente  
> **Estado:** ✅ Resuelto

---

## Síntomas

1. Al abrir `/admin/gastro/mozos` y pulsar **Ingresar PIN**, la consima registra:
   - `TypeError: can't access property "toLocaleString", a.todayTips is undefined`
   - El modal de PIN no avanza y la pantalla queda bloqueada.
2. En `/admin/gastro`, `/admin/gastro/cashier`, `/admin/pos` y `/admin/gastro/incentives` se muestran datos de ejemplo estáticos que no reflejan el estado real de personal, pedidos o promociones del tenant.

## Causa raíz

- **Frontend:** las páginas OmniGastro usaban arrays locales (`waitersList`, `mockBills`, `operators`, `promotionsDemo`) en vez de consumir endpoints dinámicos.
- **Backend:** no existía el endpoint `GET /api/v1/integrations/promotions` que necesitaba `gastro-incentives.tsx`.
- **Robustez:** el endpoint `/api/v1/users/staff` puede omitir campos de incentivos (`todayTips`, `todayIncentives`, `activeOrders`), y el frontend no los normalizaba antes de llamar a `toLocaleString()`.

## Solución aplicada

1. **`gastro-mozos.tsx`** — normalizar valores de incentivos con `?? 0` antes de renderizar y en `loadStaff`.
2. **`gastro.tsx`** — reemplazar `waitersList` hardcodeado por `loadWaitersList()` contra `/api/v1/users/staff`.
3. **`gastro-cashier.tsx`** — reemplazar `mockBills` por fetch a `/api/v1/orders/guest/pending`.
4. **`pos.tsx`** — reemplazar operadores hardcodeados por `loadOperators()` contra `/api/v1/users/staff`.
5. **`gastro-incentives.tsx`** — reescribir carga dinámica desde `/api/v1/integrations/promotions` y `/api/v1/users/staff`; corregir imports de `theme` y `api`.
6. **Backend** — agregar `GET /api/v1/integrations/promotions` en `integrations.controller.ts` e implementar `listPromotions()` en `integrations.service.ts` con fallback a 3 promos de ejemplo cuando no existan integraciones `PROMOTION`.

## Archivos modificados

- `frontend/src/pages/admin/gastro-mozos.tsx`
- `frontend/src/pages/admin/gastro.tsx`
- `frontend/src/pages/admin/gastro-cashier.tsx`
- `frontend/src/pages/admin/pos.tsx`
- `frontend/src/pages/admin/gastro-incentives.tsx`
- `backend/src/integrations/integrations.controller.ts`
- `backend/src/integrations/services/integrations.service.ts`

## Prevención

- No reintroducir arrays estáticos en páginas admin; usar siempre endpoints dinámicos.
- Mantener normalización `?? 0` en cualquier campo numérico proveniente de `/api/v1/users/staff`.
