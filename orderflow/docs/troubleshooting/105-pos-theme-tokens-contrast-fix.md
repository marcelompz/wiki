# Troubleshooting: Tokenización de Temas & Corrección de Contraste en POS y Vistas Gastro

## 📋 Síntoma / Problema

En el módulo del Punto de Venta Base (`/admin/pos`) y vistas gastro derivadas (`/admin/gastro/mozos`):
1. **Pérdida de Legibilidad en Modal de Operador / Mozo:** Al abrir el modal "Selección de Operador / Mozo Activo" en modo oscuro, las tarjetas de los operadores presentaban un fondo blanco hardcodeado (`#ffffff`) con texto claro de Ant Design (`Text`), provocando que el nombre ("Juan Pérez", "María González", etc.) fuera completamente ilegible (texto blanco o gris claro sobre fondo blanco).
2. **Incompatibilidad de Tema en Carrito y Totales:** La lista de productos en el carrito y la barra de totales poseían fondos hardcodeados (`#ffffff` y `#f8fafc`) y colores de texto hardcodeados (`#0f172a`), los cuales no respetaban el tema de Ant Design ni las variables de entorno de personalización de temas.
3. **Cards y Modales Incompatibles:** Las tarjetas de terminales/cajas, mesas del plano de salón y productos del catálogo utilizaban bordes y fondos absolutos en lugar de tokens dinámicos del sistema.

---

## 🔍 Causa Raíz

Uso de estilos inline con colores HEX estáticos (`backgroundColor: '#ffffff'`, `borderColor: '#e2e8f0'`, `color: '#0f172a'`) en componentes clave de la vista POS en lugar de consumir los tokens del tema Ant Design (`theme.useToken()`).

---

## 🛠️ Solución Aplicada

1. **Uso Estándar de `theme.useToken()`:**
   - Inyección de `const { token } = theme.useToken();` en `POSPage` (`pos.tsx`) y `GastroMozosPage` (`gastro-mozos.tsx`).

2. **Reemplazo de Estilos por Tokens de Ant Design:**
   - **Modal de Operadores:**
     - `backgroundColor: activeWaiter?.id === w.id ? token.colorPrimaryBg : token.colorBgContainer`
     - `borderColor: activeWaiter?.id === w.id ? token.colorPrimary : token.colorBorderSecondary`
     - `color: token.colorText` y `color: token.colorTextSecondary`
   - **Carrito & NumPad:**
     - Fondo de ítems: `token.colorPrimaryBg` (seleccionado) y `token.colorBgContainer` (por defecto).
     - Bloque de Totales: `token.colorFillAlter` con bordes `token.colorBorderSecondary` y texto `token.colorText` / `token.colorSuccess`.
   - **Grilla de Productos & Plano de Mesas:**
     - Tarjetas de catálogo y mesas adaptadas a `token.colorBgContainer`, `token.colorPrimaryBg` y `token.colorSuccessBg`.

---

## ✅ Verificación

- Build de producción Vite/TypeScript (`npm run build`) en `frontend/` compilado limpiamente en 25.4s.
- Verificación visual: El modal de operador, las tarjetas de producto y el carrito se adaptan fluidamente tanto al modo claro como al modo oscuro con contraste 100% legibles.
