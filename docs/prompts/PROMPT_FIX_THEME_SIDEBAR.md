# Prompt: Corregir tema oscuro forzado + Sidebar que no se oculta

Eres un experto en React + Ant Design + CSS.  
Aplica **solo** las correcciones de este documento sobre el frontend OrderFlow.  
No refactorices lógica de negocio ni otras pantallas.

---

## Problemas a resolver

1. **El fondo permanece oscuro** aunque el usuario elija tema claro (el toggle no cambia el fondo de la app).
2. **La barra lateral no se oculta por completo** al colapsar; si una categoría estaba abierta, el contenido del submenú **queda flotando** sobre la página.
3. **Las categorías del menú** muestran un ícono de carpeta `📁`. Se prefiere **fondo distinto en el label del grupo**, sin ícono de carpeta.

---

## Causa raíz

### Tema
En `src/styles/admin-mobile.css` existe:

```css
@media (prefers-color-scheme: dark) {
  :root { /* variables oscuras */ }
}
```

Eso pisa el tema elegido cuando el SO está en dark. Solo hay `[data-theme='dark']`, **no** hay `[data-theme='light']` que fuerce las variables claras.  
`useTheme` y `theme-init` sí setean `data-theme`, pero las CSS variables del media query ganan sobre `:root`.

### Sidebar
En `src/components/Sidebar.tsx`:
- `collapsedWidth={80}` → siempre queda una franja de 80px.
- Los grupos se modelan como **submenús** con `icon: 📁` y `openKeys`. Al colapsar, Ant Design deja el popup del submenú flotando.
- No se limpian `openKeys` al colapsar.

---

## Archivos a modificar

1. `src/styles/admin-mobile.css`
2. `src/components/Sidebar.tsx`
3. `src/hooks/useTheme.ts`
4. `src/theme/theme-init.ts`

---

## Corrección 1 — CSS del tema (`src/styles/admin-mobile.css`)

Reemplaza el contenido del archivo por esto (o aplica los cambios equivalentes):

```css
:root {
  --admin-touch-target: 44px;
  --bg-app: #F4F6F9;
  --bg-surface: #FFFFFF;
  --bg-layout: #F4F6F9;
  --text-primary: #0F172A;
  --text-secondary: #64748B;
  --border: #E5E9F0;
  --accent: #3B82F6;
  --ant-color-primary: #3B82F6;
  --group-bg: rgba(15, 23, 42, 0.04);
}

/* Tema explícito light — prevalece sobre prefers-color-scheme */
[data-theme='light'] {
  --bg-app: #F4F6F9;
  --bg-surface: #FFFFFF;
  --bg-layout: #F4F6F9;
  --text-primary: #0F172A;
  --text-secondary: #64748B;
  --border: #E5E9F0;
  --accent: #3B82F6;
  --ant-color-primary: #3B82F6;
  --group-bg: rgba(15, 23, 42, 0.04);
}

[data-theme='dark'] {
  --bg-app: #0B0F14;
  --bg-surface: #141A22;
  --bg-layout: #0B0F14;
  --text-primary: #E8EEF6;
  --text-secondary: #94A3B8;
  --border: #2A3441;
  --accent: #3B82F6;
  --ant-color-primary: #3B82F6;
  --group-bg: rgba(255, 255, 255, 0.06);
}

/* Solo usar preferencia del SO si aún NO hay data-theme */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    --bg-app: #0B0F14;
    --bg-surface: #141A22;
    --bg-layout: #0B0F14;
    --text-primary: #E8EEF6;
    --text-secondary: #94A3B8;
    --border: #2A3441;
    --accent: #3B82F6;
    --ant-color-primary: #3B82F6;
    --group-bg: rgba(255, 255, 255, 0.06);
  }
}

html,
body,
#root {
  background: var(--bg-app) !important;
  color: var(--text-primary);
  min-height: 100%;
}

/* Grupos del menú: fondo distinto, sin ícono de carpeta */
.admin-sider .ant-menu-item-group-title {
  padding: 8px 12px 4px !important;
}

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

/* Conservar el resto de reglas @media (max-width: 768px) que ya existían */
@media (max-width: 768px) {
  .ant-layout-sider {
    position: fixed !important;
    z-index: 999 !important;
    height: 100vh !important;
  }
  .admin-page-header {
    flex-direction: column;
    align-items: stretch !important;
    gap: 12px !important;
  }
  .admin-page-header .ant-input-search {
    width: 100% !important;
  }
  .admin-page-header .ant-space {
    width: 100%;
    justify-content: stretch;
  }
  .admin-page-header .ant-space-item {
    flex: 1;
  }
  .admin-table-wrapper .ant-table {
    font-size: 13px;
  }
  .admin-table-wrapper .ant-btn {
    min-height: var(--admin-touch-target);
    min-width: var(--admin-touch-target);
  }
  .admin-modal-form .ant-form-item-label {
    padding-bottom: 2px;
  }
  .ant-table-wrapper .ant-table {
    overflow-x: auto;
    display: block;
  }
  .ant-table-wrapper .ant-table-container {
    overflow-x: auto;
  }
}
```

**Puntos clave:**
- Añadir `[data-theme='light']` con variables claras.
- Cambiar el media query a `:root:not([data-theme])` para que no pise el tema manual.
- Forzar `html, body, #root { background: var(--bg-app) !important; }`.

---

## Corrección 2 — Aplicación del tema en DOM

### `src/hooks/useTheme.ts`

Asegura que al cambiar el modo se escriba `data-theme` y el fondo del `body`:

```ts
import { useState, useEffect, useMemo } from 'react';
import { getThemeConfig } from '../theme/theme';

const STORAGE_KEY = 'admin-theme-preference';

function applyThemeToDom(mode: 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', mode);
  document.documentElement.style.colorScheme = mode;
  document.body.style.backgroundColor = mode === 'dark' ? '#0B0F14' : '#F4F6F9';
}

export function useTheme() {
  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
    applyThemeToDom(mode);
  }, [mode]);

  useEffect(() => {
    applyThemeToDom(mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const themeConfig = useMemo(() => getThemeConfig(mode), [mode]);
  const toggleTheme = () => setMode((prev) => (prev === 'light' ? 'dark' : 'light'));

  return { mode, themeConfig, toggleTheme, isDark: mode === 'dark' };
}
```

### `src/theme/theme-init.ts`

```ts
const STORAGE_KEY = 'admin-theme-preference';

function getInitialTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') return stored;
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

const mode = getInitialTheme();
if (typeof document !== 'undefined') {
  document.documentElement.setAttribute('data-theme', mode);
  document.documentElement.style.colorScheme = mode;
  document.body.style.backgroundColor = mode === 'dark' ? '#0B0F14' : '#F4F6F9';
}
```

---

## Corrección 3 — Sidebar (`src/components/Sidebar.tsx`)

Cambios obligatorios:

1. **Grupos con `type: 'group'`** (no submenú) → no hay `openKeys` ni popup flotante.
2. **Sin ícono `📁`** en el grupo; label con clase `admin-menu-group-label` (fondo vía CSS).
3. **`collapsedWidth={0}`** + `trigger={null}` para ocultar por completo.
4. Estilos de ancho forzado a 0 cuando `collapsed` para que el layout recupere el espacio.
5. Eliminar estado `openKeys` / `handleOpenChange` si ya no se usan.

Estructura de cada ítem de grupo:

```ts
{
  type: 'group',
  key: `group-${idx}`,
  label: (
    <span className="admin-menu-group-label">
      {group.label}
    </span>
  ),
  children: group.items.map((item) => ({
    key: item.key,
    icon: <span style={{ fontSize: 16 }}>{item.icon}</span>,
    label: item.label,
  })),
}
```

Props del `Sider` desktop:

```tsx
<Sider
  collapsible
  collapsed={collapsed}
  onCollapse={onToggle}
  trigger={null}
  width={250}
  collapsedWidth={0}
  className="admin-sider"
  style={{
    background: 'var(--bg-surface, #FFFFFF)',
    borderRight: collapsed ? 'none' : '1px solid var(--border, #E5E9F0)',
    height: '100vh',
    position: 'sticky',
    top: 0,
    overflow: 'auto',
    flex: collapsed ? '0 0 0' : undefined,
    maxWidth: collapsed ? 0 : 250,
    minWidth: collapsed ? 0 : 250,
    transition: 'all 0.2s ease',
  }}
>
```

El botón ☰ del `Topbar` ya llama a `onToggleSidebar`; con `collapsedWidth={0}` la barra desaparece por completo y el contenido ocupa todo el ancho.

**No uses** submenús colapsables para las categorías si el requisito es evitar contenido flotante. `type: 'group'` muestra el título con fondo y los ítems siempre visibles mientras el sider esté abierto.

---

## Checklist de verificación

- [ ] Con el SO en dark mode, al elegir **tema claro** el fondo de layout, body y cards pasa a `#F4F6F9` / blanco.
- [ ] Al elegir **tema oscuro**, fondo `#0B0F14` / superficies `#141A22`.
- [ ] `document.documentElement.getAttribute('data-theme')` coincide con el toggle.
- [ ] Al pulsar ☰ / ✕ el sider pasa a ancho **0** (no queda franja de 80px).
- [ ] No quedan menús flotantes sobre el contenido al colapsar.
- [ ] Las categorías (Operaciones, Catálogo, etc.) se ven con **fondo suave** y **sin** ícono de carpeta; los ítems hijos conservan su emoji.

---

## Criterio de aceptación

Tras aplicar los 4 archivos:

1. Toggle light/dark cambia de verdad el fondo de toda la app admin.
2. Sidebar se oculta al 100% al colapsar.
3. No hay popups de submenú huérfanos.
4. Grupos del menú = label con fondo, sin 📁.

Aplica las correcciones ahora.
