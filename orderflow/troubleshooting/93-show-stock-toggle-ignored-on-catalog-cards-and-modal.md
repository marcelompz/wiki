# Troubleshooting: Casilla "Mostrar inventario (stock)" Desmarcada seguía mostrando "Sin stock" y "Agotado"

## Síntomas
- En el panel de administración (`admin/social-catalog` -> Página y configuración), el checkbox **"Mostrar inventario (stock)"** estaba desmarcado (`showStock: false`), pero en las tarjetas del catálogo y en el modal de detalle del producto seguían apareciendo las etiquetas "Sin stock", "Agotado" y el botón deshabilitado.

## Causa Raíz
1. **Verificación rígida de `isOutOfStock` en `ProductCard.tsx`**: El cálculo `const isOutOfStock = stockStatus?.status === 'out_of_stock'` no evaluaba la propiedad `showStock`. Aunque `showStock` se pasaba como prop con valor `false`, el componente deshabilitaba el botón de compra, mostraba el texto "Agotado", la opacidad reducida y el tooltip "Sin stock".
2. **Hardcode de sección Stock en Modal de Detalle (`omni-catalog.tsx`)**: En el modal de producto, el bloque con la disponibilidad en unidades o la etiqueta "Sin stock" se renderizaba de forma fija sin validar `showStock`. Asimismo, el botón "Agregar al pedido" se deshabilitaba incondicionalmente si `stockAvailable <= 0`.

## Solución Aplicada
1. **Evaluación condicional de `isOutOfStock` (`ProductCard.tsx`)**:
   - Se ajustó el cálculo: `const isOutOfStock = showStock && stockStatus?.status === 'out_of_stock';`.
   - Si `showStock` es `false`, las tarjetas permiten agregar el producto al pedido normalmente, omitiendo estados deshabilitados y tooltips de "Sin stock".
2. **Control por `showStock` en Modal de Detalle (`omni-catalog.tsx`)**:
   - Se envolvió el bloque de unidades con `{showStock && (...)}`.
   - El botón de agregar al pedido ahora evalúa `disabled={showStock && selectedProduct.stockAvailable <= 0}` y el texto `(showStock && selectedProduct.stockAvailable <= 0) ? 'Sin stock' : 'Agregar al pedido'`.
