# Prompt: Sistema de tokens de diseño (OrderFlow Admin)

## Objetivo
Implementar y documentar el design token set completo para temas light/dark del admin OrderFlow, con CSS variables, utilidades, overrides Ant Design y export TypeScript reutilizable.

### El archivo docs/prompts/tokens.ts 
Debe estar en frontend/theme/tokens.ts
Incluye:
ExportDescripcióndesignTokensSet completo light / dark (bg, text, border, accent, interaction, semantic)cssVarsStrings listos para style={{ color: cssVars.textPrimary }}getDesignTokens(mode)Tokens del modo actual en JSapplyCssVars(mode, target?)Aplica custom properties en el DOMTiposThemeMode, DesignTokens, SemanticTone
Uso rápido
TypeScriptimport { designTokens, cssVars, getDesignTokens, applyCssVars } from './theme/tokens';

// Estilos inline theme-aware
style={{ background: cssVars.bgSurface, color: cssVars.textPrimary }}

// Lógica JS
const tokens = getDesignTokens('dark');
console.log(tokens.semantic.success.color); // #3FB950

// Forzar vars en runtime (opcional; normalmente alcanza con data-theme)
applyCssVars('dark');

---

## 1. Archivo CSS — `styles/admin-mobile.css`

### 1.1 Tokens en `:root` / `[data-theme='light']`

```css
:root,
[data-theme='light'] {
  --admin-touch-target: 44px;

  /* Surfaces */
  --bg-app: #F4F6F9;
  --bg-surface: #FFFFFF;
  --bg-elevated: #F8FAFC;
  --bg-layout: #F4F6F9;
  --bg-muted: #F5F5F5;
  --bg-subtle: #FAFAFA;
  --input-bg: #FFFFFF;
  --table-header-bg: #F8FAFC;

  /* Text */
  --text-primary: #0F172A;
  --text-secondary: #64748B;
  --text-muted: #94A3B8;

  /* Borders */
  --border: #E5E9F0;
  --border-subtle: #F0F0F0;

  /* Accent & interaction */
  --accent: #3B82F6;
  --ant-color-primary: #3B82F6;
  --on-accent: #FFFFFF;
  --group-bg: rgba(15, 23, 42, 0.04);
  --menu-hover: rgba(0, 0, 0, 0.04);
  --menu-selected: rgba(59, 130, 246, 0.12);
  --table-row-hover: rgba(0, 0, 0, 0.02);
  --scrollbar-thumb: #CBD5E1;

  /* Semantic */
  --success: #16A34A;
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
}
1.2 Tokens en [data-theme='dark']
CSS[data-theme='dark'] {
  --bg-app: #0D1117;
  --bg-surface: #161B22;
  --bg-elevated: #21262D;
  --bg-layout: #0D1117;
  --bg-muted: #1C2128;
  --bg-subtle: #161B22;
  --input-bg: #0D1117;
  --table-header-bg: #1C2128;

  --text-primary: #F0F3F6;
  --text-secondary: #A0AEC0;
  --text-muted: #8B9BB0;

  --border: #30363D;
  --border-subtle: #21262D;

  --accent: #3B82F6;
  --ant-color-primary: #3B82F6;
  --on-accent: #FFFFFF;
  --group-bg: rgba(255, 255, 255, 0.08);
  --menu-hover: rgba(255, 255, 255, 0.08);
  --menu-selected: rgba(59, 130, 246, 0.18);
  --table-row-hover: rgba(255, 255, 255, 0.04);
  --scrollbar-thumb: #30363D;

  --success: #3FB950;
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
}
Repetir los valores dark dentro de:
CSS@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) { /* mismos valores dark */ }
}
1.3 Utilidades
CSS.bg-app / .bg-surface / .bg-elevated / .bg-muted / .bg-subtle / .bg-input
.text-primary / .text-secondary / .text-muted
.text-success / .text-warning / .text-danger / .text-info / .text-accent
.border-theme / .border-subtle-theme

.panel-success { background: var(--success-bg); border: 1px solid var(--success-border); color: var(--text-primary); }
.panel-info    { background: var(--info-bg);    border: 1px solid var(--info-border);    color: var(--text-primary); }
.panel-warning { background: var(--warning-bg); border: 1px solid var(--warning-border); color: var(--text-primary); }
.panel-danger  { background: var(--danger-bg);  border: 1px solid var(--danger-border);  color: var(--text-primary); }
1.4 Overrides Ant (mínimos)

Cards: meta title → --text-primary, description → --text-secondary
.ant-card-actions → --bg-elevated + borde --border
Botones text en actions: secondary; hover → accent; danger → --danger
Dark: inputs, table, modal, dropdown, typography, empty con tokens
.module-card--installed → box-shadow: 0 0 0 1px var(--success-border)


2. Ant Design — theme/theme.ts
TypeScript// light token extras
colorTextTertiary: '#94A3B8',
colorSuccess: '#16A34A',
colorWarning: '#D97706',
colorError: '#DC2626',
colorInfo: '#2563EB',

// dark token extras
colorSuccess: '#3FB950',
colorWarning: '#D29922',
colorError: '#F85149',
colorInfo: '#58A6FF',
Mantener el resto de tokens existentes (bg, text, border, menu, card, table, input, select, modal, dropdown, tag).

3. Export TypeScript — theme/tokens.ts (nuevo)
Crear archivo reutilizable para docs / Storybook / JS:
TypeScriptexport const designTokens = {
  light: {
    bg: {
      app: '#F4F6F9',
      surface: '#FFFFFF',
      elevated: '#F8FAFC',
      layout: '#F4F6F9',
      muted: '#F5F5F5',
      subtle: '#FAFAFA',
      input: '#FFFFFF',
      tableHeader: '#F8FAFC',
    },
    text: {
      primary: '#0F172A',
      secondary: '#64748B',
      muted: '#94A3B8',
    },
    border: {
      default: '#E5E9F0',
      subtle: '#F0F0F0',
    },
    accent: '#3B82F6',
    onAccent: '#FFFFFF',
    interaction: {
      menuHover: 'rgba(0, 0, 0, 0.04)',
      menuSelected: 'rgba(59, 130, 246, 0.12)',
      groupBg: 'rgba(15, 23, 42, 0.04)',
      tableRowHover: 'rgba(0, 0, 0, 0.02)',
    },
    semantic: {
      success: { color: '#16A34A', bg: '#F0FDF4', border: '#86EFAC' },
      warning: { color: '#D97706', bg: '#FFFBEB', border: '#FCD34D' },
      danger:  { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
      info:    { color: '#2563EB', bg: '#EFF6FF', border: '#93C5FD' },
    },
  },
  dark: {
    bg: {
      app: '#0D1117',
      surface: '#161B22',
      elevated: '#21262D',
      layout: '#0D1117',
      muted: '#1C2128',
      subtle: '#161B22',
      input: '#0D1117',
      tableHeader: '#1C2128',
    },
    text: {
      primary: '#F0F3F6',
      secondary: '#A0AEC0',
      muted: '#8B9BB0',
    },
    border: {
      default: '#30363D',
      subtle: '#21262D',
    },
    accent: '#3B82F6',
    onAccent: '#FFFFFF',
    interaction: {
      menuHover: 'rgba(255, 255, 255, 0.08)',
      menuSelected: 'rgba(59, 130, 246, 0.18)',
      groupBg: 'rgba(255, 255, 255, 0.08)',
      tableRowHover: 'rgba(255, 255, 255, 0.04)',
    },
    semantic: {
      success: { color: '#3FB950', bg: 'rgba(63, 185, 80, 0.12)', border: 'rgba(63, 185, 80, 0.4)' },
      warning: { color: '#D29922', bg: 'rgba(210, 153, 34, 0.12)', border: 'rgba(210, 153, 34, 0.4)' },
      danger:  { color: '#F85149', bg: 'rgba(248, 81, 73, 0.12)', border: 'rgba(248, 81, 73, 0.4)' },
      info:    { color: '#58A6FF', bg: 'rgba(56, 139, 253, 0.12)', border: 'rgba(56, 139, 253, 0.4)' },
    },
  },
} as const;

export type ThemeMode = 'light' | 'dark';
export type DesignTokens = typeof designTokens.light;

/** CSS var names (para style={{ color: 'var(--text-primary)' }}) */
export const cssVars = {
  bgApp: 'var(--bg-app)',
  bgSurface: 'var(--bg-surface)',
  bgElevated: 'var(--bg-elevated)',
  bgMuted: 'var(--bg-muted)',
  textPrimary: 'var(--text-primary)',
  textSecondary: 'var(--text-secondary)',
  textMuted: 'var(--text-muted)',
  border: 'var(--border)',
  borderSubtle: 'var(--border-subtle)',
  accent: 'var(--accent)',
  menuSelected: 'var(--menu-selected)',
  success: 'var(--success)',
  successBg: 'var(--success-bg)',
  successBorder: 'var(--success-border)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  info: 'var(--info)',
} as const;

4. Reglas de uso en componentes

CasoCorrectoIncorrectoFondo cardvar(--bg-surface)#fff / whiteTexto bodyvar(--text-primary)#333 / #666Texto secundariovar(--text-secondary)#999Bordevar(--border)#e8e8e8 / #f0f0f0Activo/selectedvar(--menu-selected) + borde --accent#e6f7ff / #eff6ffPanel infoclassName="panel-info"background: #f0f5ffÉxitovar(--success) / .panel-success#52c41a + #f6ffedPrimary/linkvar(--accent)#1890ff
tsx// Ejemplo card módulo
style={{
  background: 'var(--bg-surface)',
  borderColor: installed ? 'var(--success-border)' : 'var(--border)',
  color: 'var(--text-primary)',
}}

// Ejemplo seleccionado
style={{
  background: 'var(--menu-selected)',
  border: '1.5px solid var(--accent)',
}}

5. Criterios de aceptación

 Light y dark definidos en CSS + prefers-color-scheme fallback
 Utilidades .bg-*, .text-*, .panel-* disponibles
theme.ts con colorSuccess/Warning/Error/Info en ambos modos
theme/tokens.ts exporta designTokens y cssVars
 Ningún hardcode de blanco/gris claro en pages admin migradas
 Contraste legible en dark (texto primary sobre surface)

6. Archivos tocados

styles/admin-mobile.css — tokens + utilidades + overrides
theme/theme.ts — semantic colors Ant
theme/tokens.ts — nuevo export TS/JSON-friendly

text---

### JSON compacto (para Storybook / Figma tokens)

```json
{
  "light": {
    "bg": { "app": "#F4F6F9", "surface": "#FFFFFF", "elevated": "#F8FAFC", "muted": "#F5F5F5" },
    "text": { "primary": "#0F172A", "secondary": "#64748B", "muted": "#94A3B8" },
    "border": { "default": "#E5E9F0", "subtle": "#F0F0F0" },
    "accent": "#3B82F6",
    "semantic": {
      "success": { "color": "#16A34A", "bg": "#F0FDF4", "border": "#86EFAC" },
      "warning": { "color": "#D97706", "bg": "#FFFBEB", "border": "#FCD34D" },
      "danger":  { "color": "#DC2626", "bg": "#FEF2F2", "border": "#FECACA" },
      "info":    { "color": "#2563EB", "bg": "#EFF6FF", "border": "#93C5FD" }
    }
  },
  "dark": {
    "bg": { "app": "#0D1117", "surface": "#161B22", "elevated": "#21262D", "muted": "#1C2128" },
    "text": { "primary": "#F0F3F6", "secondary": "#A0AEC0", "muted": "#8B9BB0" },
    "border": { "default": "#30363D", "subtle": "#21262D" },
    "accent": "#3B82F6",
    "semantic": {
      "success": { "color": "#3FB950", "bg": "rgba(63,185,80,0.12)", "border": "rgba(63,185,80,0.4)" },
      "warning": { "color": "#D29922", "bg": "rgba(210,153,34,0.12)", "border": "rgba(210,153,34,0.4)" },
      "danger":  { "color": "#F85149", "bg": "rgba(248,81,73,0.12)", "border": "rgba(248,81,73,0.4)" },
      "info":    { "color": "#58A6FF", "bg": "rgba(56,139,253,0.12)", "border": "rgba(56,139,253,0.4)" }
    }
  }
}
Con esto tenés el prompt MD para aplicar el sistema y el export TS/JSON para documentación o Storybook.
