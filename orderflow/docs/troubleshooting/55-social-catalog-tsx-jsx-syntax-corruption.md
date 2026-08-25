# 🛠️ Troubleshooting 55 — Errores de Sintaxis TSX/JSX y Cierres en Social-Catalog

> **Área:** Frontend / Backend / Social-Catalog  
> **Síntoma:** Error en `npm run build` frontend por 16 excepciones de sintaxis TypeScript/JSX en `social-catalog.tsx` y error TS1005 (`'}' expected`) en `products.service.ts`  
> **Estado:** ✅ Resuelto  
> **Fecha:** 24 de Agosto de 2026  

---

## 1. Síntomas

Al ejecutar `npm run build` o `npx tsc --noEmit` en el frontend, el compilador TypeScript fallaba con 16 errores en `frontend/src/pages/social-catalog.tsx`:
```text
src/pages/social-catalog.tsx:986:7 - error TS1128: Declaration or statement expected.
src/pages/social-catalog.tsx:1352:10 - error TS1381: Unexpected token. Did you mean `{'}'}` or `&rbrace;`?
src/pages/social-catalog.tsx:1353:9 - error TS17002: Expected corresponding JSX closing tag for 'Content'.
src/pages/social-catalog.tsx:1600:10 - error TS1005: ',' expected.
```

Al compilar el backend, el compilador indicaba:
```text
src/products/products.service.ts:348:1 - error TS1005: '}' expected.
```

---

## 2. Causa Raíz

1. **Frontend (`social-catalog.tsx`):**
   - Durante ediciones previas de refactorización visual, se pegó accidentalmente un bloque de JSX huérfano (duplicado de `renderProductCover`, aproximadamente 85 líneas) directamente en el cuerpo del componente entre la inicialización de variables de estilo (`const bodyBg = ...`) y la sentencia `return (...)`.
   - En la sección de reviews (`reviews.map`), la función de mapeo se cerró con `)}` en lugar de `))`.
   - En el contenedor principal `<Content>`, faltaba la etiqueta de cierre correspondiente antes de `</Layout>`.
   - Se declaró la variable `showFilters` dos veces (como estado local `useState` y como constante derivada de `socialConfig`).

2. **Backend (`products.service.ts` & `social-catalog.service.ts`):**
   - A la clase `ProductsService` le faltaba la llave de cierre `}` en la última línea (348).
   - El método `Tag.create` intentaba enviar la propiedad `active: true` la cual no existe en el esquema de `Tag` (solo en `Ribbon`).
   - El filtro en `SocialCatalogService` contenía un parámetro implícito `c` sin tipo declarado en `finalCategoryOrder`.

---

## 3. Solución Aplicada

1. **Frontend (`frontend/src/pages/social-catalog.tsx`):**
   - **Limpieza de bloque huérfano:** Se eliminaron las 85 líneas de JSX fuera de función en la línea 951, dejando el flujo directo entre las constantes `headerBg`/`bodyBg` y la instrucción `return (<ConfigProvider...>)`.
   - **Corrección de cierres:**
     - En `reviews.map`, se cambió `)}` por `))`.
     - En el cierre de la vista principal, se agregó la etiqueta `</Content>` antes de `</Layout>`.
   - **Desambiguación de variables:** Se renombró el estado local `const [showFilterPanel, setShowFilterPanel] = useState(false);` para desacoplarlo de `socialConfig.showFilters`.
   - **Implementación SC-02 y SC-05:** Se reestructuró el layout del toolbar móvil en 2 filas y se unificó la opción de ordenamiento `sortBy=admin` con `adminSortLabel`.

2. **Backend (`backend/src/`):**
   - Se agregó la llave `}` al final de `ProductsService` ([products.service.ts](file:///opt/orderflow/backend/src/products/products.service.ts#L348)).
   - Se removió `active: true` en `Tag.create`.
   - Se tipó explícitamente `(c: string)` en `social-catalog.service.ts`.

---

## 5. Mapeo Multi-Instancia y Pulido UX (v1.20.18)

- **Causa Raíz de Switches Desmarcados:** Al guardar desde el Admin en instancias secundarias (`menudigital`), `handleSave` no enviaba `instanceKey: selectedInstanceKey`, por lo que el Backend persistía la configuración siempre en la instancia `'default'`.
- **Solución:**
  1. Se incluyó `instanceKey` en el payload de `handleSave` (`admin/social-catalog.tsx`).
  2. Se actualizó el endpoint `PUT /api/v1/social-catalog/config` (`social-catalog-admin.controller.ts`) para procesar `instanceKey`.
  3. Se aisló la caché en `localStorage` con la clave `social-catalog-config:${subdomain}:${instanceKey}`.
  4. Se redujo el espacio entre categorías en el acordeón a `gap: 6px` y `borderRadius: 12px` para una presentación de menú digital compacta.
