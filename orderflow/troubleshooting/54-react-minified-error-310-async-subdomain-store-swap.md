# 🛠️ Resolución de Error en Consola — Minified React Error #310 (Hook Mismatch / Swap en Render Tree)

**Fecha:** 2026-08-22  
**Módulo / Área:** Frontend / App.tsx / React Hooks  
**Severidad:** Media (Excepción React #310 en consola de producción)  
**Estado:** ✅ **RESUELTO**

---

## 1. Descripción del Problema

En la consola del navegador en producción se registraba la siguiente excepción no capturada al acceder al dominio o rutas del storefront:

```text
Error: Minified React error #310; visit https://reactjs.org/docs/error-decoder.html?invariant=310
    Le vendor-react-BL24cwRE.js:30
    useEffect vendor-react-BL24cwRE.js:9
    an index-Cfh6_pnk.js:18
```

## 2. Causa Raíz

En `frontend/src/App.tsx`:
- `isSubdomainStore` se declaraba mediante un `useState(false)` y se modificaba asíncronamente dentro de un `useEffect` post-render (`setIsSubdomainStore(true)`).
- Durante el **primer render**, `App` renderizaba el árbol por defecto (`<LandingBioLinksCatalog />`), montando sus hooks internos.
- Inmediatamente después, el `useEffect` cambiaba el estado a `true`, forzando a `App` a desmontar `<LandingBioLinksCatalog />` y retornar en su lugar `<PublicStorefrontPage />`.
- Este cambio condicional post-render del árbol de componentes raíz provocaba un desfase de hooks y un desmontaje forzado durante el ciclo de vida de React 18, disparando `Minified React error #310` ("Rendered more/fewer hooks than during the previous render").

## 3. Solución Aplicada

Como la resolución de subdominio depende únicamente del `window.location.hostname` (que está disponible de forma síncrona en el cliente), se convirtió la evaluación de `isSubdomainStore` en una **cálculo síncrono** directo en la función `App()`, previo a cualquier hook o renderizado.

En `frontend/src/App.tsx`:
```typescript
function App() {
  const [hasAuth, setHasAuth] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Evaluación síncrona del estado del subdominio previo al renderizado
  const hostname = window.location.hostname.toLowerCase();
  const parts = hostname.split(".");
  const rootDomain = ROOT_DOMAIN || hostname;
  const rootParts = rootDomain.split(".");
  const isSystemSubdomain = SYSTEM_SUBDOMAINS.includes(parts[0]);
  const matchesRootDomain = rootParts.every((part, index) => parts[parts.length - rootParts.length + index] === part);
  const isDedicatedDomain = !matchesRootDomain && hostname !== 'localhost' && hostname !== '127.0.0.1';
  const isTenantSubdomain = !isSystemSubdomain && parts.length > rootParts.length && matchesRootDomain;
  const isSubdomainStore = isDedicatedDomain || isTenantSubdomain;

  if (isSubdomainStore) {
    return <PublicStorefrontPage />;
  }

  // ...
```

De esta manera, en dominios de tienda/tenant, React renderiza `<PublicStorefrontPage />` desde el primer tick de renderizado, eliminando el parpadeo y la excepción React #310.
