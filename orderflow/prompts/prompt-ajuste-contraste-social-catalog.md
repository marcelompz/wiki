# Prompt — Ajuste de contraste y verificación del sistema de temas en OmniCatalog público

## Contexto

Archivo objetivo: `frontend/src/pages/social-catalog.tsx` (vista pública en `/social-catalog/:instanceKey`, ej. `menudigital`).
Sistema de temas de referencia (ya funciona en `/admin`): `frontend/src/theme/theme.ts`, `frontend/src/theme/tokens.ts`, `frontend/src/theme/theme-init.ts`.

Este archivo ya fue migrado en una pasada previa para:
- corregir un bug de orden de Hooks (el `useEffect` de tema estaba después de un `return` condicional),
- envolver el layout en `<ConfigProvider theme={getThemeConfig(mode)}>`,
- reemplazar ~90 colores hardcodeados por `cssVars.*` de `theme/tokens.ts`,
- agregar un toggle visible de tema (sol/luna) con preferencia del visitante persistida en `localStorage` (clave `social-catalog-visitor-theme:<instanceKey>`), con fallback a la config del admin (`socialConfig.theme`: light/dark/system).

**Antes de tocar nada**: confirmar que esa versión migrada está efectivamente desplegada en el entorno que se está probando. Si no lo está, desplegarla primero — varios de los defectos de abajo pueden desaparecer solo con eso.

## Defectos observados (con capturas de referencia del usuario)

1. **Texto de baja legibilidad en tarjetas de producto**: la categoría del producto (label uppercase, ej. "FILTRADOS"), el nombre del producto y el precio aparecen en un tono rosa/rojo pálido sobre fondo blanco — contraste insuficiente. Sospecha: ese texto usa `primaryColor` (color de marca del tenant) directo en vez de `cssVars.textPrimary` / `cssVars.textSecondary`, y el `primaryColor` de este tenant es un rojo que no fue pensado para usarse como color de texto de cuerpo.
2. **Dropdown de "Categorías" casi ilegible**: las opciones del `<Select>` se ven en gris muy claro sobre fondo blanco.
3. **Título del negocio, subtítulo y dirección lavados**: sobre el banner/hero, el texto aparece con contraste bajo en vez de nítido.
4. **CTA "📢 Menu digital"**: el texto queda casi del mismo tono que su fondo — prácticamente invisible.

## Tarea

1. **Reproducir en ambos temas** (claro y oscuro, alternando con el toggle) los 4 puntos de arriba, en el entorno real (no solo leyendo código) — capturar cuáles persisten en cuál tema.
2. **Para cada defecto, ubicar el estilo responsable** en `social-catalog.tsx` (o en un CSS/componente compartido si aplica, ej. `HeaderSocialLinks`, estilos de `.ant-select-dropdown` inyectados globalmente) y corregirlo:
   - Texto de cuerpo (nombres, precios, labels) → `cssVars.textPrimary` o `cssVars.textSecondary`, **nunca** `primaryColor` crudo salvo que sea explícitamente un acento (links, precio destacado, ícono) y se haya verificado que pasa 4.5:1 contra su fondo real.
   - Si el problema del Select es que `ConfigProvider` no está alcanzando el popup del dropdown (se renderiza en un portal), revisar si hace falta `getPopupContainer` o si hay CSS externo (ej. `admin-mobile.css`, mencionado como espejo de `tokens.ts`) filtrándose a la página pública y sobrescribiendo el color con algo tipo `color-mix`/opacity baja.
   - Texto sobre el banner/hero (título, subtítulo, dirección, CTA) → verificar si están usando `Text type="secondary"` de AntD (que en tema claro puede quedar demasiado tenue para ese tamaño de fuente) en vez de `cssVars.textPrimary`, o si el banner tiene una imagen/overlay de fondo que reduce el contraste real del texto que iba pensado para fondo sólido.
3. **Verificar contraste real**, no solo "se ve mejor": usar el panel de Accessibility de Chrome DevTools o Lighthouse sobre la página en ambos temas. Mínimos:
   - Texto normal: 4.5:1
   - Texto grande (≥18pt o 14pt bold): 3:1
   - Bordes/íconos funcionales: 3:1
4. **Confirmar que el toggle de tema es visible y funcional** en el viewport real (no solo que existe en el código): en mobile, verificar que no quede oculto detrás de otros elementos flotantes ni fuera del área visible inicial.

## Fuera de alcance (no tocar en esta tarea)
- El bug de sintaxis JSX preexistente en la prop `cover` del `Card` de vista grilla (reportado aparte).
- El degradado de fondo del header de categoría basado en `primaryColor`/`secondaryColor` con alpha — se revisa en una pasada separada.

## Entregable
Diff acotado a los estilos corregidos + antes/después (capturas o descripción) de los 4 puntos, en tema claro y oscuro.
