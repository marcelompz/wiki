# Prompt: Mejorar contraste del modo oscuro + polish UI admin

Eres un experto en React + Ant Design + CSS (design tokens).  
Aplica **solo** las correcciones de este documento sobre el frontend OrderFlow (admin).  
No cambies lógica de negocio, rutas ni páginas de contenido.  
No refactorices componentes fuera de los archivos listados.

---

## Objetivo

1. Subir el contraste del **modo oscuro** (texto, bordes, capas, estados hover/selected).
2. Aplicar mejoras prioritarias de legibilidad y UX:
   - Inputs/Select con fondo distinto al surface
   - Tablas con header y row-hover visibles
   - Ítem activo del menú con barra lateral primary
   - Scrollbars dark
   - Focus visible
   - Transición suave al cambiar tema

---

## Archivos a modificar

1. `src/styles/admin-mobile.css`
2. `src/theme/theme.ts`
3. `src/components/Sidebar.tsx` (solo estilos del ítem activo si hace falta clase)
4. Opcional menor: `src/hooks/useTheme.ts` (transición ya cubierta por CSS)

---

## 1. Tokens dark de alto contraste

### Reemplazar bloque `[data-theme='dark']` y el fallback del media query en `admin-mobile.css`

```css
[data-theme='dark'] {
  --bg-app: #0D1117;
  --bg-surface: #161B22;
  --bg-elevated: #21262D;
  --bg-layout: #0D1117;
  --text-primary: #F0F3F6;
  --text-secondary: #A0AEC0;
  --border: #30363D;
  --accent: #3B82F6;
  --ant-color-primary: #3B82F6;
  --group-bg: rgba(255, 255, 255, 0.08);
  --menu-hover: rgba(255, 255, 255, 0.08);
  --menu-selected: rgba(59, 130, 246, 0.18);
  --input-bg: #0D1117;
  --table-header-bg: #1C2128;
  --table-row-hover: rgba(255, 255, 255, 0.04);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    --bg-app: #0D1117;
    --bg-surface: #161B22;
    --bg-elevated: #21262D;
    --bg-layout: #0D1117;
    --text-primary: #F0F3F6;
    --text-secondary: #A0AEC0;
    --border: #30363D;
    --accent: #3B82F6;
    --ant-color-primary: #3B82F6;
    --group-bg: rgba(255, 255, 255, 0.08);
    --menu-hover: rgba(255, 255, 255, 0.08);
    --menu-selected: rgba(59, 130, 246, 0.18);
    --input-bg: #0D1117;
    --table-header-bg: #1C2128;
    --table-row-hover: rgba(255, 255, 255, 0.04);
  }
}
```

Mantén el bloque `[data-theme='light']` y `:root` como están (añade solo las variables nuevas en light si quieres consistencia):

```css
:root,
[data-theme='light'] {
  /* ...valores light existentes... */
  --bg-elevated: #FFFFFF;
  --menu-hover: rgba(0, 0, 0, 0.04);
  --menu-selected: rgba(59, 130, 246, 0.12);
  --input-bg: #FFFFFF;
  --table-header-bg: #F8FAFC;
  --table-row-hover: rgba(0, 0, 0, 0.02);
}
```

### Fondo global + transición

```css
html,
body,
#root {
  background: var(--bg-app) !important;
  color: var(--text-primary);
  min-height: 100%;
  transition: background-color 0.15s ease, color 0.15s ease;
}
```

### Group labels (un poco más legibles en dark)

```css
.admin-menu-group-label {
  display: block;
  padding: 6px 10px;
  margin: 4px 4px 2px;
  border-radius: 6px;
  background: var(--group-bg);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-secondary) !important;
  line-height: 1.3;
}
```

---

## 2. Componentes Ant Design en dark (`src/theme/theme.ts`)

Actualiza **solo** `darkTheme` (y opcionalmente refuerza light si falta):

```ts
export const darkTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#3B82F6',
    borderRadius: 8,
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    colorBgBase: '#0D1117',
    colorBgContainer: '#161B22',
    colorBgElevated: '#21262D',
    colorBgLayout: '#0D1117',
    colorText: '#F0F3F6',
    colorTextSecondary: '#A0AEC0',
    colorTextTertiary: '#8B9BB0',
    colorBorder: '#30363D',
    colorBorderSecondary: '#21262D',
    colorPrimaryBg: 'rgba(59, 130, 246, 0.15)',
    colorPrimaryBorder: '#3B82F6',
    controlItemBgHover: 'rgba(255, 255, 255, 0.08)',
    controlItemBgActive: 'rgba(59, 130, 246, 0.18)',
  },
  components: {
    Layout: {
      headerBg: '#161B22',
      siderBg: '#161B22',
      bodyBg: '#0D1117',
    },
    Menu: {
      itemBg: 'transparent',
      subMenuItemBg: 'transparent',
      itemSelectedBg: 'rgba(59, 130, 246, 0.18)',
      itemHoverBg: 'rgba(255, 255, 255, 0.08)',
      itemSelectedColor: '#F0F3F6',
      itemColor: '#A0AEC0',
    },
    Card: {
      colorBgContainer: '#161B22',
    },
    Table: {
      headerBg: '#1C2128',
      rowHoverBg: 'rgba(255, 255, 255, 0.04)',
      borderColor: '#30363D',
      colorBgContainer: '#161B22',
    },
    Input: {
      colorBgContainer: '#0D1117',
      colorBorder: '#30363D',
      activeBorderColor: '#3B82F6',
      hoverBorderColor: '#484F58',
    },
    Select: {
      colorBgContainer: '#0D1117',
      colorBorder: '#30363D',
      optionSelectedBg: 'rgba(59, 130, 246, 0.18)',
    },
    Modal: {
      contentBg: '#161B22',
      headerBg: '#161B22',
    },
    Dropdown: {
      colorBgElevated: '#21262D',
    },
    Tag: {
      defaultBg: '#21262D',
      defaultColor: '#F0F3F6',
    },
  },
};
```

**Importante:** usa colores hex en tokens Ant Design, **no** `var(--...)`, porque Ant no resuelve CSS variables en todos los tokens de forma fiable.

En `lightTheme`, si `colorPrimary` sigue como `var(--ant-color-primary, #3B82F6)`, cámbialo a `'#3B82F6'` por consistencia.

---

## 3. CSS extra: tablas, inputs, focus, scrollbar, menú activo

Añade al final de `admin-mobile.css` (después de las variables y group labels):

```css
/* ---- Inputs / selects: contraste vs surface ---- */
[data-theme='dark'] .ant-input,
[data-theme='dark'] .ant-input-affix-wrapper,
[data-theme='dark'] .ant-select-selector,
[data-theme='dark'] .ant-picker,
[data-theme='dark'] .ant-input-number {
  background: var(--input-bg) !important;
  border-color: var(--border) !important;
  color: var(--text-primary) !important;
}

[data-theme='dark'] .ant-input::placeholder,
[data-theme='dark'] .ant-select-selection-placeholder {
  color: var(--text-secondary) !important;
  opacity: 0.85;
}

/* ---- Tablas ---- */
[data-theme='dark'] .ant-table-thead > tr > th {
  background: var(--table-header-bg) !important;
  color: var(--text-primary) !important;
  border-bottom-color: var(--border) !important;
}

[data-theme='dark'] .ant-table-tbody > tr:hover > td {
  background: var(--table-row-hover) !important;
}

[data-theme='dark'] .ant-table,
[data-theme='dark'] .ant-table-container {
  border-color: var(--border) !important;
}

/* ---- Cards / bordes visibles ---- */
[data-theme='dark'] .ant-card {
  border-color: var(--border);
  background: var(--bg-surface);
}

[data-theme='dark'] .ant-layout-header,
[data-theme='dark'] .admin-sider {
  border-color: var(--border);
}

/* ---- Menú: selected con barra primary ---- */
.admin-sider .ant-menu-item-selected {
  background: var(--menu-selected) !important;
  color: var(--text-primary) !important;
  position: relative;
}

.admin-sider .ant-menu-item-selected::before {
  content: '';
  position: absolute;
  left: 0;
  top: 6px;
  bottom: 6px;
  width: 3px;
  border-radius: 0 2px 2px 0;
  background: var(--accent, #3B82F6);
}

.admin-sider .ant-menu-item:hover {
  background: var(--menu-hover) !important;
}

/* ---- Focus visible (a11y) ---- */
.admin-sider .ant-menu-item:focus-visible,
.ant-btn:focus-visible,
.ant-input:focus-visible,
.ant-select-selector:focus-visible {
  outline: 2px solid var(--accent, #3B82F6) !important;
  outline-offset: 2px;
}

/* ---- Scrollbar dark ---- */
[data-theme='dark'] ::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
[data-theme='dark'] ::-webkit-scrollbar-track {
  background: var(--bg-app);
}
[data-theme='dark'] ::-webkit-scrollbar-thumb {
  background: #30363D;
  border-radius: 5px;
  border: 2px solid var(--bg-app);
}
[data-theme='dark'] ::-webkit-scrollbar-thumb:hover {
  background: #484F58;
}

/* Firefox */
[data-theme='dark'] {
  scrollbar-color: #30363D #0D1117;
}
```

---

## 4. Sidebar — asegurar clase y selected

En `src/components/Sidebar.tsx`, el `Sider` **debe** tener `className="admin-sider"` (si ya lo tiene, no lo toques).

El `Menu` debe seguir usando `selectedKeys={[location.pathname]}`.

No vuelvas a poner submenús con `📁` ni `openKeys`. Mantén `type: 'group'` y `collapsedWidth={0}`.

Si el pathname a veces es `/admin/` vs `/admin`, normaliza si hace falta:

```ts
selectedKeys={[location.pathname.replace(/\/$/, '') || '/admin']}
```

solo si observas que el Dashboard no marca selected.

---

## 5. Body background en JS (opcional, coherencia)

En `useTheme.ts` / `theme-init.ts`, si ya setean `document.body.style.backgroundColor`, actualiza los hex al nuevo palette:

- dark → `#0D1117`
- light → `#F4F6F9`

---

## Orden de aplicación

1. `src/theme/theme.ts` → `darkTheme` completo  
2. `src/styles/admin-mobile.css` → variables dark + reglas de contraste  
3. Verificar `className="admin-sider"` en Sidebar  
4. Ajustar hex en `useTheme` / `theme-init` si aplica  

---

## Checklist de verificación

- [ ] Dark: texto primario legible sobre cards (`#F0F3F6` sobre `#161B22`)
- [ ] Bordes de cards, inputs y tablas visibles (`#30363D`)
- [ ] Input/Select más oscuros que la card (no se funden)
- [ ] Header de tabla más claro que el body de la tabla
- [ ] Row hover perceptible
- [ ] Ítem de menú activo: fondo azul suave + barra izquierda primary
- [ ] Hover de menú visible
- [ ] Group labels con fondo y texto secundario legible
- [ ] Scrollbar oscura en Chrome/Firefox
- [ ] Focus visible con outline accent al navegar con teclado
- [ ] Toggle light ↔ dark sin flash raro; fondos coherentes
- [ ] Light mode no regresa (no romper `[data-theme='light']`)

---

## Criterio de aceptación

En modo oscuro:

1. Se distinguen claramente **layout / surface / elevated / input**.  
2. No hay texto secundario ni bordes “fantasma”.  
3. Estados **hover** y **selected** del menú y tablas se notan a primera vista.  
4. El modo claro sigue intacto.

Aplica los cambios ahora.
