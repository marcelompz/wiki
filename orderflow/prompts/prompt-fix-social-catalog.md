# Prompt: Corregir errores de parsing TypeScript en `social-catalog.tsx`

## Contexto

Archivo: `frontend/src/pages/social-catalog.tsx` (componente React + TypeScript + Ant Design).

El parser de TypeScript falla al procesar **ternarios JSX complejos** usados inline en la prop `cover` de varios componentes `<Card>`.

### Errores observados

- `TS1003`, `TS1005`, `TS1381`, `TS2657`, `TS17002`
- Ubicaciones aproximadas: líneas ~830, ~1020, ~1060 (y zonas aledañas con JSX residual)

### Causa raíz

Expresiones del estilo:

```tsx
cover={(!showProductImages) ? (
  <div>...</div>
) : (
  <div>...</div>
)}
```

con JSX anidado profundo (ribbons, tags, wishlist, stock) que el parser no puede manejar de forma fiable cuando van **inline** en la prop.

Además, el archivo puede contener:

- Bloques JSX huérfanos (restos de un intento de extraer un helper a medias)
- Cierres incorrectos de `.map` (reseñas, carrito)
- Tags de cierre extra tras `{productDisplay}`
- Shadowing de variables (`showFilters` como state y como flag de config)

---

## Objetivo

Reparar el archivo para que:

1. Compile sin errores de parsing de TypeScript.
2. Conserve el comportamiento visual y funcional actual del catálogo.
3. Deje el código más mantenible (sin ternarios JSX gigantes en props).

---

## Solución requerida

### 1. Extraer la lógica de `cover` a un helper

Antes de construir `productDisplay` / `groupedProducts`, crear una función dentro del componente:

```tsx
const renderProductCover = (product: any, stockStatus?: any) => {
  // ...
};
```

**Comportamiento del helper:**

- Si `!showProductImages`: mostrar placeholder `📦`.
- Si hay imagen: usar `LazyImage` con `getImageUrl(product.imagesUrls?.[0])` y `objectFit: 'contain'`.
- Si no hay imagen: placeholder `📦`.
- Si `showRibbons`: renderizar `product.ribbon` y `product.tags` (absolutos, top-left).
- Botón de wishlist (top-right) con `HeartFilled` / `HeartOutlined`, `toggleWishlist`, y **`e.stopPropagation()`**.
- Stock:
  - Si se pasa `stockStatus`: usar `stockStatus.color` y `stockStatus.label`.
  - Si no: derivar de `product.stockAvailable` (`Sin stock` / `¡Últimos N!` / `Disponible`).
- Contenedor: `height: 240px`, `position: relative`, fondo `cssVars.bgElevated`.

### 2. Reemplazar todos los `cover={(!showProductImages) ? (...`

En cada `<Card>` de producto:

```tsx
// Modo acordeón (donde existe stockStatus)
cover={renderProductCover(product, stockStatus)}

// Modo lista / filtro (sin stockStatus objeto)
cover={renderProductCover(product)}
```

**No** dejar restos del ternario anterior (ni `alt=`, ni `</div>`, ni `)}>` sueltos después del `cover={...}`).

### 3. Limpiar estructura rota del archivo

Revisar y corregir si existen:

| Problema | Acción |
|----------|--------|
| JSX huérfano entre `const bodyBg = ...` y el `return (` principal | Eliminar por completo |
| Tras `{productDisplay}` hay `)}` y/o `</div>` de más | Dejar solo el cierre del contenedor + `</Content>` |
| `.map` de reseñas cierra con `)}` en lugar de `))` | Cerrar como `))` y luego `)}` del ternario |
| `.map` del carrito incompleto | Cerrar con `))}` + `</div>` del contenedor de items |
| `</div>` extra antes de `</Layout>` | Eliminar |
| `const showFilters = socialConfig?.showFilters ?? true` sombrea el state `showFilters` | Renombrar el flag de config a `enableFilters` y usarlo solo para mostrar/ocultar el botón de filtros |

### 4. Mejoras menores recomendadas (opcionales pero útiles)

- En botones “Agregar” dentro de cards con `onClick={() => openDetail(product)}`, usar:
  ```tsx
  onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }}
  ```
- No cambiar APIs, rutas, stores ni estilos visuales salvo lo necesario para compilar.

---

## Criterios de aceptación

- [ ] No quedan ternarios JSX complejos en props `cover={...}`.
- [ ] `tsc` / el IDE no reportan `TS1003`, `TS1005`, `TS1381`, `TS2657`, `TS17002` en este archivo.
- [ ] El catálogo sigue mostrando covers (imagen o placeholder), ribbons, stock y wishlist.
- [ ] Wishlist y “Agregar” no abren el drawer de detalle por bubbling.
- [ ] Drawer de carrito, reseñas y layout general cierran correctamente (sin JSX residual).

---

## Restricciones

- No reescribir todo el componente desde cero si no es necesario.
- No eliminar features (tema, filtros, sort, acordeón vs lista, checkout, etc.).
- Mantener Ant Design, `cssVars`, `LazyImage` y el resto de imports actuales.
- Responder con el archivo completo corregido o un diff claro y aplicable.

---

## Entrada

Usar el contenido actual de `frontend/src/pages/social-catalog.tsx` (o el adjunto `social-catalog.tsx`) como base.

## Salida esperada

Archivo `social-catalog.tsx` corregido, listo para reemplazar el original, sin errores de parsing.
