# Troubleshooting #59 — Social Catalog público: featured banner con `config` undefined

## 📌 Síntoma

El catálogo público (`https://provecchio.com/social-catalog`) no muestra el banner de
productos destacados aun cuando `featuredBannerEnabled: true` está configurado en el
admin, y en algunos casos la grilla se queda en loading infinito tras el deploy.

## 🔍 Causa raíz

El hook `useEffect` de carga (`fetchWhatsappConfigAndProducts`) disparaba el request
a `/api/v1/public/social-catalog/featured` **antes** de haber recibido la respuesta
del endpoint `/config`. Como `featuredBannerEnabled` se leía de `socialConfig` (que
aún era `null`), la condición `if (config.featuredBannerEnabled)` evaluaba a
`undefined` → falsy, por lo que el fetch de featured **nunca se ejecutaba**.

Además, el `try/catch/finally` para `setLoading(false)` estaba mal anidado tras la
integración del bloque de featured, provocando que `finally` no se alcanzara en
algunos paths, dejando el spinner activo indefinidamente.

## ✅ Solución aplicada

1. **Reordenamiento de fetch (SC-06 init order):** se garatona el orden:
   `config` → `featured` (solo si `config.featuredBannerEnabled`) → `products`.
2. **Restructura `try/catch/finally`:** el `finally { setLoading(false) }`
    envuelve todo el bloque de carga, garantizando que el spinner se oculte en
   todos los paths (éxito, error, early-return).
3. **Cache key del featured:** se cachea la respuesta del endpoint `/featured` en
   `localStorage` con clave compuesta `social-catalog-config:${cacheKey}:featured`
   y TTL de 5 minutos, evitando request duplicados en navegación.
4. **Fallback:** si `featured` falla o está vacío, el carousel no se renderiza
   (no aporta UI residual).

## 🧪 Validación E2E

- `qa_e2e_check.py`: catálogo público sin imágenes rotas, 0 errores JS, HTTP 200.
- Banner destacado visible en producción (`provecchio.com` y `pesallaccia.com`).
- Featured products renderizados en orden `Product.order` (SC-05 DnD).

## 🔗 Referencias

- `frontend/src/pages/social-catalog.tsx` — `fetchWhatsappConfigAndProducts`, línea ~263.
- `frontend/src/pages/social-catalog.tsx` — Carousel destacado, línea ~1194.
- `backend/src/social-catalog/social-catalog.controller.ts` — `@Get('featured')`.
- `backend/src/social-catalog/social-catalog.service.ts` — `getFeaturedProductsByTag()`.
- `docs/troubleshooting/README.md` — entrada #59.
