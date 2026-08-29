# Troubleshooting #62: OmniBio Fast Checkout permite manipulación de precio por cliente

**Síntoma:**  
- El cliente envía `item.price` en el POST `/order`; el backend lo persiste sin validar.  
- Cualquiera con DevTools puede manipular el precio del pedido.

**Causa raíz:**  
`backend/src/biolinks/biolinks.controller.ts:266` (y equivalentes standalone) persistía `price_at_sale` directamente del body sin validar contra fuente autoritativa.

**Solución aplicada:**  
- Frontend (`public-biolink.tsx`) ya no envía `price` en el payload de `/order`.  
- Backend (`createOrderFromBioLink`) resuelve el precio server-side:
  - Si `item.productId` corresponde a un `Product.active`: delega a `OrdersService.create()`, que ignora `price_at_sale` del body y usa `Product.price` real.
  - Si el bloque es `booking` o no tiene `productId`: usa el precio configurado en el `BioLink.blocks` (precio de lista del admin).

**Archivos involucrados:**  
- `frontend/src/pages/public-biolink.tsx`  
- `backend/src/biolinks/biolinks.controller.ts`  
- `services/biolinks-standalone/src/bio-links.controller.ts`  
- `services/biolinks-standalone/src/omni-bio.controller.ts`

**Validación:**  
- POST con `price` manipulado → `price_at_sale` final = `Product.price` real.  
- Bloque sin producto → precio provisto por el admin en el bloque, no por el body.
