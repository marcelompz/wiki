# Prompt: Eliminar fondos hardcodeados + parche CSS dark (estilo Tailwind)

Eres un experto en React + Ant Design + CSS.  
Aplica este plan sobre el frontend OrderFlow.  
**No instales Tailwind CSS como dependencia** (Ant Design + Tailwind completo genera conflictos de preflight).  
Usa el mismo modelo que Tailwind dark mode: selector `[data-theme='dark']` + utilidades theme-aware.

---

## Objetivo

1. Quitar los paneles blancos en modo oscuro (placeholders del dashboard y resto de admin).
2. Sustituir `#fafafa`, `#f5f5f5`, `#fff`, `#f0f0f0` hardcodeados por tokens/clases.
3. Aplicar el **parche CSS completo** (`admin-theme-patch.css`).

---

## Paso 1 — CSS

1. Copia el contenido del archivo `admin-theme-patch.css` a:
   - `src/styles/admin-mobile.css` **(reemplazo total)**, **o**
   - `src/styles/admin-theme-patch.css` y en `AdminApp.tsx` / `main.tsx`:

```ts
import "./styles/admin-mobile.css";
// o
import "./styles/admin-theme-patch.css";
```

El CSS ya define:
- Tokens light/dark
- Utilidades: `.bg-subtle`, `.bg-muted`, `.bg-elevated`, `.text-secondary`, etc.
- `.admin-placeholder` / `.admin-placeholder-lg` / `.admin-placeholder-md`
- `.admin-panel-muted`
- Overrides Ant Design en dark
- Fallback parcial para `style` inline con `#fafafa` / `#f5f5f5` dentro de `.admin-page`

---

## Paso 2 — Dashboard (prioridad: los blancos de las capturas)

Archivo: `src/pages/admin/dashboard.tsx`

**Antes:**
```tsx
<div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa' }}>
  Gráfico de Ventas
</div>
```

**Después (3 ocurrencias):**
```tsx
<div className="admin-placeholder admin-placeholder-lg">
  Gráfico de Ventas
</div>
```

```tsx
<div className="admin-placeholder admin-placeholder-lg">
  Lista de Actividad Reciente
</div>
```

```tsx
<div className="admin-placeholder admin-placeholder-md">
  Métricas de sistema y salud
</div>
```

(Elimina `backgroundColor: '#fafafa'` y el flex inline; la clase ya centra el contenido.)

---

## Paso 3 — Resto de admin (barrido completo)

### `src/pages/admin/integrations.tsx` (~línea 305)
```tsx
// Antes
<div style={{ background: '#fafafa', padding: 16, borderRadius: 8, marginBottom: 24, border: '1px solid #f0f0f0' }}>

// Después
<div className="admin-panel-muted" style={{ marginBottom: 24 }}>
```

### `src/pages/admin/modules.tsx` (~línea 506)
```tsx
// Antes
<div style={{ maxHeight: '60vh', overflowY: 'auto', background: '#f5f5f5', padding: 16, borderRadius: 8 }}>

// Después
<div className="admin-panel-muted" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
```

### `src/pages/admin/tenant-access.tsx` (~línea 154)
```tsx
// Antes
background: "#f5f5f5",

// Después
background: "var(--bg-muted)",
```

### `src/pages/admin/pos.tsx`
Reemplaza bordes `#f0f0f0` por:
```tsx
border: "1px solid var(--border)",
// o
borderTop: "1px solid var(--border)",
```

### `src/pages/admin/contacts.tsx`
En `<th style={{ ..., borderBottom: '1px solid #f0f0f0' }}>`:
```tsx
borderBottom: '1px solid var(--border)',
```

### `src/pages/admin/social-catalog.tsx` (~629)
```tsx
// Antes
backgroundColor: '#fff',

// Después
backgroundColor: 'var(--bg-surface)',
```

### `src/components/admin/MobileBottomNav.tsx`
```tsx
// Antes
background: '#ffffff',
borderTop: '1px solid #f0f0f0',

// Después
background: 'var(--bg-surface)',
borderTop: '1px solid var(--border)',
// ideal: className="admin-mobile-bottom-nav"
```

### `src/components/ChannelSelector.tsx` (~53)
```tsx
backgroundColor: 'var(--bg-surface)',
```

### `src/components/tenant/UserProfileMenu.tsx`
- `borderBottom: '1px solid #f0f0f0'` → `var(--border)`
- hover `#f5f5f5` → `var(--menu-hover)` o `var(--bg-muted)`

### `src/components/tenant/TenantSwitcher.tsx`
- `borderBottom: '1px solid #f0f0f0'` → `var(--border)`

### `src/pages/ApiKeyConfig.tsx` (~177)
```tsx
<Card ... style={{ background: "var(--bg-muted)" }}>
```

---

## Paso 4 — NO tocar (storefront / branding intencional)

Dejar como están (tema de marca / light forzado a propósito):

- `GiveawayRegister.tsx` (usa `isLightTheme` explícito)
- `TenantTemplate.tsx`, `social-catalog.tsx` (storefront público)
- `public-biolink.tsx`, `orderflow-landing.tsx`
- Colores de badge/tag de estado (`#fff` sobre fondos de color)

Solo admin + shell (Sidebar, Topbar, MobileBottomNav, dashboard, integrations, modules, pos, contacts, tenant-access, ChannelSelector, menús de perfil).

---

## Paso 5 — theme.ts (ya debería estar; verificar)

`darkTheme` con:
- `colorBgContainer: '#161B22'`
- `colorBgElevated: '#21262D'`
- `colorBgLayout: '#0D1117'`
- tokens Table/Input/Menu del prompt anterior de contraste

`useTheme` / `theme-init`: body background dark `#0D1117`, light `#F4F6F9`.

---

## Equivalencia Tailwind

| Tailwind | Este proyecto |
|----------|----------------|
| `darkMode: 'selector'` | `[data-theme='dark']` |
| `dark:bg-gray-900` | `.bg-app` / `var(--bg-app)` |
| `bg-gray-50` | `.bg-subtle` / `.admin-placeholder` |
| `bg-gray-100` | `.bg-muted` / `.admin-panel-muted` |
| `text-gray-500` | `.text-secondary` |

Si en el futuro se añade Tailwind, configurar:

```ts
// tailwind.config.js
module.exports = {
  darkMode: ['selector', '[data-theme="dark"]'],
  corePlugins: { preflight: false }, // crítico con Ant Design
}
```

Por ahora **no** hace falta.

---

## Checklist

- [ ] Dark: placeholders del dashboard ya no son blancos
- [ ] Light: placeholders grises suaves (`--bg-elevated`)
- [ ] Integrations / modules / tenant-access sin cajas blancas en dark
- [ ] Mobile bottom nav respeta tema
- [ ] Bordes `#f0f0f0` en POS/contacts visibles en dark
- [ ] Storefront / giveaway / biolink sin cambios no deseados

## Criterio de aceptación

Comparar con las capturas: en dark, **ningún** rectángulo interior del Dashboard queda blanco puro; usa `--bg-elevated` / `--bg-muted`.

Aplica los cambios ahora.
