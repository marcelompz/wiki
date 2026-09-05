# Troubleshooting #87 — Deduplicación de Categorías, Ocultamiento Estricto de Productos y Resolución Normalizada de Color/Fondo

## 📋 Síntomas

1. **Categorías Repetidas en Panel de Administración**:
   En `/admin/social-catalog` -> tab **Categorías**, se mostraban categorías duplicadas en la tabla de ordenación y en los selectores.
2. **Productos de Categorías Ocultas Visibles como "Fuera de carta"**:
   Al marcar una categoría como oculta (`isVisible: false`), sus productos continuaban apareciendo en catálogos públicos como `https://provecchio.com/social-catalog/menudigital` bajo la cinta "Fuera de carta" en lugar de estar completamente excluidos.
3. **Omisión de Imágenes de Fondo en Categorías ("Veggie", "Sandwich sin TACC", "Chocolate")**:
   Las imágenes de fondo asignadas a ciertas categorías en `categoryBackgrounds` no se renderizaban en las tarjetas/acordeón del catálogo.
4. **Ignorado de Color de Fondo Personalizado ("Agua" `#FFFFFF`)**:
   El color de fondo blanco (`#FFFFFF`) configurado para la categoría "Agua" no aplicaba y caía en el color bordó primario (`#760f11` / `#940220`) del comercio.

---

## 🔍 Causas Raíz

1. **Aplanado Recursivo Acumulativo en `loadCategoryTree` (`social-catalog.tsx`)**:
   `loadCategoryTree` ejecutaba una función `flatten` que empujaba nodos raíz y nodos hijos sin verificar duplicidad de nombres o IDs.
2. **Omisión de `isVisible` en Selects ORM de `getCatalogProducts` (`social-catalog.service.ts`)**:
   `getCatalogProducts` no solicitaba la propiedad `isVisible` en las relaciones `categoryRel` y `posCategoryRel` de Prisma. Los productos de categorías ocultadas no eran filtrados por el backend y se enviaban al catálogo público.
3. **Búsqueda por Clave Sensible a Mayúsculas y Espacios en `omni-catalog.tsx`**:
   Las propiedades `socialConfig.categoryBackgrounds` y `socialConfig.categoryColors` usaban un acceso por clave directa `socialConfig.categoryBackgrounds[node.name]`. Si existía cualquier diferencia en minúsculas/mayúsculas o espacios adicionales (ej: `"Veggie "` vs `"Veggie"`), la búsqueda retornaba `undefined` y caía en los estilos predeterminados con el color primario del comercio.

---

## 🛠️ Solución Aplicada (`v1.20.80`)

1. **Deduplicación por `Map` en `loadCategoryTree` ([social-catalog.tsx](file:///opt/orderflow/frontend/src/pages/admin/social-catalog.tsx))**:
   Se reemplazó el `flatten` acumulativo por una iteración que agrupa categorías en un `Map` por clave normalizada (`name.trim().toLowerCase()`), garantizando 1 sola entrada única por categoría en la administración.

2. **Filtrado Backend de Categorías Ocultas ([social-catalog.service.ts](file:///opt/orderflow/backend/src/social-catalog/social-catalog.service.ts))**:
   Se agregó `isVisible: true` a los selects de `categoryRel` y `posCategoryRel` y se aplicó un filtro explícito:
   ```typescript
   filtered = filtered.filter(p => {
     if (p.categoryRel && p.categoryRel.isVisible === false) return false;
     if (p.posCategoryRel && p.posCategoryRel.isVisible === false) return false;
     return true;
   });
   ```

3. **Búsqueda Normalizada e Insensible a Mayúsculas/Espacios ([omni-catalog.tsx](file:///opt/orderflow/frontend/src/pages/omni-catalog.tsx))**:
   Se implementaron las funciones helper `getCategoryBg()` y `getCategoryColor()` para realizar búsquedas insensibles a minúsculas y espacios con `trim().toLowerCase()`.

4. **Cálculo Dinámico de Contraste de Encabezado ([omni-catalog.tsx](file:///opt/orderflow/frontend/src/pages/omni-catalog.tsx))**:
   Se integró `getHeaderTextColor(bgUrl, customColor)` utilizando `getContrastingTextColor()`. Para colores de fondo claros como blanco (`#FFFFFF`), el sistema aplica automáticamente texto oscuro legible (`#0f172a`).
