# Troubleshooting #61: OmniBio rutas públicas `/click` y `/order` devuelven 404

**Síntoma:**  
- Clics en bloques tipo `link` no se registran (0 analítica).  
- Fast Checkout no crea orden (botón "Confirmar Pedido" falla silenciosamente).

**Causa raíz:**  
Doble error de ruta en `frontend/src/pages/public-biolink.tsx`:  
1. `API_URL` se construye con `/api` incluido (`VITE_API_URL`), pero el código llamaba a `/v1/bio/${slug}/click` sin prefijo `/api/v1/bio/public/`.  
2. El backend define `@Controller('api/v1/bio')` con `@Post('public/:slug/click')`, por lo que la ruta correcta es `/api/v1/bio/public/${slug}/click`.

**Solución aplicada:**  
- Corregidas las llamadas en `public-biolink.tsx:149` y `:187` para usar `/api/v1/bio/public/${slug}/click` y `/api/v1/bio/public/${slug}/order`.

**Archivos involucrados:**  
- `frontend/src/pages/public-biolink.tsx`  
- `backend/src/biolinks/biolinks.controller.ts`  
- `services/biolinks-standalone/src/bio-links.controller.ts`  
- `services/biolinks-standalone/src/omni-bio.controller.ts`

**Validación:**  
- E2E: clic en un bloque → `BioLinkClick` registrado en DB.  
- E2E: Fast Checkout → `orderId` devuelto y orden creada en DB con `totalAmount` correcto.
