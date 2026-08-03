# 10 — Resolución de Errores de Rutas de React Router y Renderizado por Tipos de Arreglos

> **Área:** Frontend / React Router / Rendering / Robustez  
> **Fecha:** 2026-07-31  
> **Estado:** ✅ Resuelto  

---

## 🛑 Síntomas Principales

1. **Conflicto de Rutas en React Router:**
   ```text
   You rendered descendant <Routes> (or called useRoutes()) at "/" (under <Route path="/">) but the parent route path has no trailing "*". This means if you navigate deeper, the parent won't match anymore and therefore the child routes will never render.
   ```
2. **Excepciones de Iteración en Consola JS (`provecchio.com` & `pesallaccia.com`):**
   ```text
   Uncaught TypeError: t is not iterable at _ (index.js)
   Error loading products: TypeError: z.forEach is not a function
   ```

---

## 🔍 Causa Raíz

1. **Ordenamiento de Rutas en `main.tsx`:** La declaración de la ruta raíz `<Route path="/*" element={<App />} />` estaba ubicada al principio de la lista de rutas en `main.tsx`. Al navegar a sub-rutas dinámicas (`/admin/*`, `/tienda`, `/sorteo/:id`), la ruta padre capturaba la navegación bloqueando el árbol de componentes descendientes.
2. **Asunción Implícita de Arreglos en Respuestas HTTP:** Métodos como `loadProducts` en `products.tsx`, `extractCategories` en `catalog-with-categories.tsx` y `loadFeaturedProducts` en `TenantHomepage.tsx` asumían que la respuesta HTTP del servidor siempre retornaba una lista plana `[...]`. Al recibir un objeto envuelto (`{ products: [...], total: X }`) o nulo, la ejecución de `.forEach()` o `.map()` fallaba interrumpiendo el ciclo de vida del componente React (pantalla en blanco).

---

## 🛠️ Soluciones Aplicadas

### 1. Reordenamiento de Rutas en `main.tsx`
Se reestructuró la tabla de rutas situando las rutas específicas arriba y la captura general al final:

```tsx
<Routes>
  <Route path="/landing" element={<OrderFlowLandingPage />} />
  <Route path="/login" element={<LoginPage />} />
  <Route path="/admin/*" element={<AdminApp />} />
  <Route path="/config" element={<ApiKeyConfigPage />} />
  <Route path="/checkout" element={<CheckoutSimplePage />} />
  <Route path="/whatsapp-catalog" element={<WhatsappCatalogPage />} />
  <Route path="/whatsapp-checkout" element={<WhatsappCheckoutPage />} />
  <Route path="/sorteo/:giveawayId" element={<GiveawayRegisterPage />} />
  <Route path="/bio/:slug" element={<PublicBioLinkPage />} />
  <Route path="/tienda" element={<TenantTemplatePage />} />
  <Route path="/*" element={<App />} />
</Routes>
```

### 2. Guardia Defensiva Universal `Array.isArray()`
Se implementaron protecciones para garantizar que cualquier valor no sea iterado si no es un arreglo válido:

```typescript
const list = Array.isArray(res.data) ? res.data : (res.data?.products || []);
setProducts(list);
```

### 3. Ampliación del Suite de Validación E2E (`scripts/qa_e2e_check.py`)
Se añadió la navegación automatizada headless con inspección en tiempo real de la consola del navegador para capturar cualquier `TypeError`, `is not iterable` o `forEach` no capturado en `https://provecchio.com` y `https://spa-wellness.pesallaccia.com`.

---

## 📌 Verificación E2E Exitosa

```bash
🔍 [QA] Iniciando validación E2E para catálogo público: https://spa-wellness.pesallaccia.com/whatsapp-catalog
🖼️ [QA] Se encontraron 10 imágenes en el catálogo público.
✅ [QA SUCCESS] Catálogo público verificado sin imágenes rotas.
🔍 [QA] Iniciando validación E2E para dominio Provecchio: https://provecchio.com
✅ [QA SUCCESS] Dominio Provecchio verificado sin errores JS en consola.
🔍 [QA] Iniciando validación E2E para Panel de Administración: https://spa-wellness.pesallaccia.com/admin/whatsapp-catalog
✅ [QA SUCCESS] Panel de administración y dominios de producción verificados exitosamente.
```
