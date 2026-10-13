# 36 — Bug de Ruta Raíz (`/`) Renderizando E-Commerce en vez de Homepage Comercial

> **Área:** Frontend / App Router / Landing Page  
> **Síntoma:** Al acceder a la raíz del dominio principal (`https://pesallaccia.com/` o `http://localhost:3011/`), la aplicación mostraba un catálogo/e-commerce por defecto (`CatalogWithCategoriesPage`) en lugar de la Landing Page comercial de OmniFlow cuando el navegador tenía un token activo (`accessToken` o `apiKey`) en `localStorage`.  
> **Estado:** ✅ Resuelto  
> **Fecha:** 2026-08-13  

---

## 🔍 Causa Raíz

En `frontend/src/App.tsx`, el renderizado de la ruta raíz estaba condicionado defensivamente por el estado de autenticación `hasAuth`:

```tsx
{!hasAuth ? (
  <OmniFlowLandingPage />
) : (
  <Refine ...>
    <Routes>
      <Route path="/" element={<CatalogWithCategoriesPage />} />
      ...
    </Routes>
  </Refine>
)}
```

Cuando un usuario o administrador había iniciado sesión previamente en el panel admin, la presencia de credenciales en `localStorage` hacía que `hasAuth` fuera `true`. En consecuencia, al ingresar a la raíz `/`, el router saltaba a la vista del catálogo e-commerce del tenant por defecto en lugar de presentar la portada comercial e institucional del producto.

---

## 🛠️ Solución Aplicada

1. **Desacople de la Raíz Comercial (`App.tsx`):**
   Se simplificó la renderización de la raíz en el dominio principal para que renderice incondicionalmente la nueva Landing Page "Punta de Lanza" de OmniFlow ([LandingBioLinksCatalog.tsx](file:///opt/orderflow/frontend/src/pages/LandingBioLinksCatalog.tsx)), manteniendo el aislamiento para subdominios dedicados de tenants (`isSubdomainStore`):

   ```tsx
   if (isSubdomainStore) {
     return <PublicStorefrontPage />;
   }

   return (
     <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm }}>
       <LandingBioLinksCatalog />
     </ConfigProvider>
   );
   ```

2. **Ruteo Unificado (`main.tsx`):**
   Se configuraron explícitamente las rutas públicas en `main.tsx`:
   * `/` y `/landing` / `/empezar`: **Landing Page Punta de Lanza (BioLinks + Social Catalog)** para la prueba comercial Fase 0.
   * `/institucional`: **Landing Page Institucional General (`OmniFlowLandingPage`)**.
   * `/admin/*`: **Panel de Administración Refine**.

---

## ✅ Verificación

* **TypeScript & Vite Build:** Compilación limpia validada (`npm run build`).
* **Comprobación de Navegación:** Acceso verificado a la raíz `/` mostrando la Landing Page comercial en viewports móviles y de escritorio independientemente de la sesión guardada en el navegador.
