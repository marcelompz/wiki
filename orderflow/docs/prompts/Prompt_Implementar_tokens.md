# Prompt: Implementar tokens de tema para contraste (Admin OrderFlow)

## Contexto
Admin multi-tenant (OrderFlow) con tema claro/oscuro vía:
- CSS variables en `styles/admin-mobile.css` (`[data-theme='light'|'dark']`)
- Config Ant Design en `theme/theme.ts` (`getThemeConfig(mode)`)

Problema: muchos componentes usan colores hardcodeados de modo claro (`#e6f7ff`, `#f0f5ff`, `#e8e8e8`, `white`, `#666`, `#999`, `#1890ff`, `#eff6ff`, etc.). En dark mode el contraste es malo (cajas blancas, bordes invisibles, texto apagado).

## Objetivo
1. Ampliar el sistema de design tokens (semánticos + utilidades).
2. Reemplazar hardcodes en páginas/componentes del admin por `var(--token)` o clases utilitarias.
3. Mantener responsive y sin romper lógica de negocio.

---

## Parte A — Tokens CSS (`styles/admin-mobile.css`)

### Tokens base (ya existentes — no romper)
```css
--bg-app, --bg-surface, --bg-elevated, --bg-layout, --bg-muted, --bg-subtle
--text-primary, --text-secondary, --text-muted
--border, --border-subtle
--accent, --menu-selected, --menu-hover, --input-bg
--table-header-bg, --table-row-hover, --scrollbar-thumb
Tokens semánticos a agregar (light + dark + prefers-color-scheme)
Light
CSS--success: #16A34A;
--success-bg: #F0FDF4;
--success-border: #86EFAC;
--warning: #D97706;
--warning-bg: #FFFBEB;
--warning-border: #FCD34D;
--danger: #DC2626;
--danger-bg: #FEF2F2;
--danger-border: #FECACA;
--info: #2563EB;
--info-bg: #EFF6FF;
--info-border: #93C5FD;
--on-accent: #FFFFFF;
Dark
CSS--success: #3FB950;
--success-bg: rgba(63, 185, 80, 0.12);
--success-border: rgba(63, 185, 80, 0.4);
--warning: #D29922;
--warning-bg: rgba(210, 153, 34, 0.12);
--warning-border: rgba(210, 153, 34, 0.4);
--danger: #F85149;
--danger-bg: rgba(248, 81, 73, 0.12);
--danger-border: rgba(248, 81, 73, 0.4);
--info: #58A6FF;
--info-bg: rgba(56, 139, 253, 0.12);
--info-border: rgba(56, 139, 253, 0.4);
--on-accent: #FFFFFF;
Repetir los mismos valores dark dentro de:
CSS@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) { ... }
}
Utilidades CSS a agregar
CSS.text-success / .text-warning / .text-danger / .text-info / .text-accent
.panel-success / .panel-info / .panel-warning / .panel-danger
Cada .panel-*:

background: var(--*-bg)
border: 1px solid var(--*-border)
color: var(--text-primary)

Overrides Ant Design (dark + genéricos)

.ant-card meta title → --text-primary
meta description → --text-secondary
.ant-card-actions → fondo --bg-elevated, borde superior --border
botones text en actions → --text-secondary; hover → --accent
dangerous → --danger
.module-card--installed → box-shadow: 0 0 0 1px var(--success-border)
Tipografía Ant en dark → --text-primary / secondary
.ant-btn-text en dark con hover legible
.ant-empty-description → --text-muted


Parte B — Ant Design theme (theme/theme.ts)
Agregar en token de light y dark:
TypeScriptcolorSuccess: light '#16A34A' | dark '#3FB950'
colorWarning: light '#D97706' | dark '#D29922'
colorError:   light '#DC2626' | dark '#F85149'
colorInfo:    light '#2563EB' | dark '#58A6FF'
En light también: colorTextTertiary: '#94A3B8'.
No cambiar algoritmos ni el resto de tokens existentes.

Parte C — Archivos prioritarios a migrar
1. pages/admin/modules.tsx (App Store)

Card módulo
background: var(--bg-surface)
borderColor: installed ? var(--success-border) : var(--border)
className: module-card + module-card--installed si instalado
styles.actions: fondo --bg-elevated, borde --border
Icono: var(--success) / var(--accent)
Título: --text-primary
Descripción: --text-secondary
Versión/deps: --text-muted

Grid: Col xs={24} sm={12} lg={8}, Row gutter={[16, 16]}
Selector Tenant (superadmin): className="panel-info" (quitar #f0f5ff / #adc6ff)
Títulos de sección: color: var(--text-primary)
README modal: pre con color: var(--text-primary)
Botón backup: borderColor/color: var(--success)

2. components/tenant/UserProfileMenu.tsx

Menú perfil: avatar --accent, nombre --text-primary, email --text-secondary, tenant --accent, logout --danger
Modal Cambiar Tenant:
Overlay con padding 16px
Panel: --bg-surface, borde --border, maxWidth: 380, maxHeight: min(85vh, 520px), responsive
Ítem activo: background: var(--menu-selected), borde --accent
Ítem inactivo: var(--bg-elevated)
Hover inactivo: var(--bg-muted) + borde accent
Textos: primary / muted (API key mono)
Badge Activo: var(--success)
Cancelar: elevated + text-primary
Prohibido: white, #e6f7ff, #666, #999, #1890ff


3. pages/admin/pos.tsx y pos.tsx
TypeScriptborder: isSelected ? "2px solid var(--accent)" : "1px solid var(--border)"
background: isSelected ? "var(--menu-selected)" : "var(--bg-surface)"
// total:
color: "var(--accent)"  // no #1e3a8a
4. pages/admin/integrations.tsx
Cards de resumen de comparación:

Coinciden → className="panel-success" + número var(--success)
Solo OrderFlow → panel-info + var(--info)
Solo Odoo → panel-warning + var(--warning)
Labels secundarios: var(--text-secondary)
Grid: Col xs={24} sm={8}


Reglas generales

Nunca en admin: white, #fff, #e6f7ff, #eff6ff, #f0f5ff, #fafafa, #f5f5f5, #e8e8e8, #f0f0f0, #666, #999, #1890ff (usar --accent).
Preferir var(--token) con fallback opcional: var(--accent, #3B82F6).
Paneles de estado → clases .panel-*.
No cambiar lógica de API, install/uninstall, fetch, etc.
Responsive: grids con breakpoints Ant (xs/sm/lg), modales con width: 100% + maxWidth.
A11y: contraste texto/fondo ≥ WCAG AA cuando sea posible con estos tokens.

Cómo buscar más hardcodes
Bashgrep -rn "background.*#\|backgroundColor.*#\|borderColor.*#\|color:.*['\"]#\|#e6f7ff\|#eff6ff\|#f0f5ff\|#e8e8e8\|#fafafa\|#f5f5f5\|white\|#666\|#999\|#1890ff\|#1e3a8a" \
  --include="*.tsx" pages/admin components
Criterios de aceptación

/admin/modules en dark: cards legibles, bordes visibles, sin cajas blancas
 Modal Cambiar Tenant en dark: ítems elevated, activo con azul suave
 Integrations: paneles success/info/warning correctos en ambos temas
 POS: mesa seleccionada con --menu-selected, no azul clarito
 Light mode sin regresiones visuales
 Mobile: modules 1 col, integrations apilados, modal tenant usable

Extra (opcional)
Barrido de: dashboard.tsx, subscription.tsx, loyalty.tsx, giveaways.tsx, homepage-builder.tsx con el mismo patrón de tokens.
