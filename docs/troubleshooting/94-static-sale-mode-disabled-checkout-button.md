# Troubleshooting: Botón de Enviar Pedido Habilitado en Modo de Venta Estático (`saleMode: 'static'`)

## Síntomas
- Al configurar el catálogo en modo de venta estático (**Static: menú digital informativo sin envío ni pasarela**, `saleMode: 'static'`), los clientes podían agregar productos al carrito y el cajón del carrito (*CartDrawer*) mantenía habilitado el botón "Confirmar Pedido" / "Enviar Pedido", permitiendo redirigir al checkout.

## Causa Raíz
- Los componentes de carrito ([CartDrawer.tsx](file:///opt/orderflow/frontend/src/components/catalog/CartDrawer.tsx) y [omni-catalog.tsx](file:///opt/orderflow/frontend/src/pages/omni-catalog.tsx)) no recibían la propiedad `saleMode` de la configuración del catálogo social (`socialConfig.saleMode`). Por tanto, la validación del botón de confirmación sólo verificaba si `cart.length > 0`, sin restringir la acción en modo estático.

## Solución Aplicada
1. **Paso de `saleMode` en `omni-catalog.tsx`**:
   - Se transmitió la propiedad `saleMode={socialConfig?.saleMode}` al componente `<CartDrawer />`.
2. **Restricción de Checkout y Cartel Informativo (`CartDrawer.tsx`)**:
   - Se introdujo `const isStaticMode = saleMode === 'static';`.
   - Se deshabilitó el botón de confirmación: `disabled={cart.length === 0 || isStaticMode}`.
   - Se ajustó el texto del botón: `{isStaticMode ? '🚫 Enviar Pedido Deshabilitado' : 'Confirmar Pedido'}`.
   - Se agregó una alerta visual informativa (`<Alert type="warning">`) indicando que el catálogo opera únicamente como menú digital de consulta de precios.
   - En `handleCheckout()`, se detiene la navegación si se detecta modo estático, mostrando una notificación explicativa.
