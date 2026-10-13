# Troubleshooting #83 — Excepción React #310 por Invocación Condicional de Hooks en Catálogo Público (`omni-catalog.tsx`)

## 📋 Síntoma
Al cargar el catálogo público del cliente en la URL `https://pesallaccia.com` o `/social-catalog`, en la consola del navegador aparecía:
`Error: Minified React error #310; visit https://reactjs.org/docs/error-decoder.html?invariant=310`
`Uncaught Error: Minified React error #310 ... useMemo ($n index-Buwlxl3R.js:18)`
`La precarga de https://pesallaccia.com/ fue ignorada debido a valores desconocidos de "as" o "type"`

## 🔍 Causa Raíz
1. **Infracción de Reglas de Hooks de React**: El componente `SocialCatalogPage` en `omni-catalog.tsx` contenía una condición de retorno temprano `if (loading || configLoading) return (<Spin ... />)`. Sin embargo, el hook `useMemo` para `activeCategoryKeys` estaba ubicado **después** de ese retorno. Al cambiar el estado de `loading` de `true` a `false`, React ejecutaba `useMemo` en el segundo renderizado pero no en el primero, violando la regla de orden estricto e incondicional de invocación de hooks (React Error #310).
2. **Advertencia de Precarga**: Se incluía un `useEffect` que inyectaba un elemento `<link rel="preload" href="/" as="document">` no estándar que los navegadores modernos rechazan.

## 🛠️ Solución Aplicada
1. **Reordenamiento Incondicional de Hooks**: Se reestructuraron todos los hooks (`useState`, `useEffect`, `useMemo`) en `omni-catalog.tsx` colocándolos en la parte superior del componente antes de la verificación de carga. De este modo, en todos los renders (con o sin carga), la cantidad y secuencia de hooks invocados es exactamente la misma.
2. **Depuración de Preload**: Se removió el bloque de precarga `as="document"` eliminando las advertencias de consola.
3. Compilado y desplegado exitosamente en el release **`v1.20.59`**.
