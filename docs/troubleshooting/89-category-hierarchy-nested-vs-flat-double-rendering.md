# Troubleshooting #89 — Corrección de Algoritmo de Visualización de Categorías Anidadas vs Planas

## 📋 Síntoma

En el panel de administración `/admin/social-catalog` -> tab **Categorías**, cuando el origen de categorías está configurado en modo combinado (`categorySource === 'product_pos'`), las categorías de PDV (Nivel 1) aparecían renderizadas **tanto anidadas/identadas dentro de su categoría de producto padre (Nivel 0) como fuera de ella a su mismo nivel raíz**, provocando duplicidad visual.

---

## 🔍 Causa Raíz

1. **Aplanado Prematuro en `loadCategoryTree` (`social-catalog.tsx`)**:
   `loadCategoryTree` tomaba la estructura de árbol devuelta por el backend y la aplanaba iterando por `children`, empujando tanto a los padres como a sus hijos dentro de la matriz principal `categoryTree`.
2. **Iteración Completa sin Filtrado de Nodos Raíz en `CategoryManagement.tsx`**:
   `CategoryManagement.tsx` iteraba sobre `items.map(category => ...)` renderizando cada elemento a nivel raíz (0), y además ejecutaba `category.children.map(child => ...)` en `renderMode === 'nested'`. Dado que `items` contenía tanto padres como hijos en la raíz, los hijos se mostraban dos veces: una vez como raíz y otra vez como hijos anidados.

---

## 🛠️ Solución Aplicada (`v1.20.83`)

1. **Preservación del Árbol Raíz en `loadCategoryTree` ([social-catalog.tsx](file:///opt/orderflow/frontend/src/pages/admin/social-catalog.tsx))**:
   Se actualizó `loadCategoryTree` para conservar la jerarquía nativa devuelta por el backend, insertando en el `Map` únicamente los nodos de nivel 0 (`rootNodes`) sin forzar a los hijos a nivel raíz.

2. **Filtrado Estricto de Nodos Raíz en `renderMode === 'nested'` ([CategoryManagement.tsx](file:///opt/orderflow/frontend/src/components/admin/CategoryManagement.tsx))**:
   Se aplicó un filtro en la iteración principal para evaluar únicamente nodos de nivel 0:
   ```tsx
   items
     .filter((c) => !c.parentId || c.level === 0)
     .map((category, index) => (
       <React.Fragment key={category.id}>
         {renderCategoryRow(category, index, false)}
         {category.children && category.children.length > 0 && (
           category.children.map((childCat, childIdx) => renderCategoryRow(childCat, childIdx, true))
         )}
       </React.Fragment>
     ))
   ```

3. **Aplanado Deduplicado en `renderMode === 'flat'` ([CategoryManagement.tsx](file:///opt/orderflow/frontend/src/components/admin/CategoryManagement.tsx))**:
   Se creó el helper `flattenTree(items)` para el "Modo plano", asegurando que al cambiar de vista cada nodo (padre e hijo) aparezca exactamente una sola vez en la lista.

4. **Soporte Garantizado para las 3 Combinaciones**:
   - `categorySource === 'product'`: Categorías de producto únicas en raíz con subcategorías anidadas.
   - `categorySource === 'pos'`: Categorías de PDV únicas en raíz con subcategorías anidadas.
   - `categorySource === 'product_pos'`: Categoría de producto en Nivel 0 y Categorías de PDV identadas en Nivel 1, sin duplicación raíz.
