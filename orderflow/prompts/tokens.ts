/**
 * OrderFlow Admin — Design tokens (light / dark)
 * Fuente de verdad en TS para docs, Storybook y consumo en JS.
 * Los valores espejan styles/admin-mobile.css y theme/theme.ts.
 */

export type ThemeMode = 'light' | 'dark';

export const designTokens = {
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
      scrollbarThumb: '#CBD5E1',
    },
    semantic: {
      success: {
        color: '#16A34A',
        bg: '#F0FDF4',
        border: '#86EFAC',
      },
      warning: {
        color: '#D97706',
        bg: '#FFFBEB',
        border: '#FCD34D',
      },
      danger: {
        color: '#DC2626',
        bg: '#FEF2F2',
        border: '#FECACA',
      },
      info: {
        color: '#2563EB',
        bg: '#EFF6FF',
        border: '#93C5FD',
      },
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
      scrollbarThumb: '#30363D',
    },
    semantic: {
      success: {
        color: '#3FB950',
        bg: 'rgba(63, 185, 80, 0.12)',
        border: 'rgba(63, 185, 80, 0.4)',
      },
      warning: {
        color: '#D29922',
        bg: 'rgba(210, 153, 34, 0.12)',
        border: 'rgba(210, 153, 34, 0.4)',
      },
      danger: {
        color: '#F85149',
        bg: 'rgba(248, 81, 73, 0.12)',
        border: 'rgba(248, 81, 73, 0.4)',
      },
      info: {
        color: '#58A6FF',
        bg: 'rgba(56, 139, 253, 0.12)',
        border: 'rgba(56, 139, 253, 0.4)',
      },
    },
  },
} as const;

export type DesignTokens = (typeof designTokens)['light'];
export type SemanticTone = keyof DesignTokens['semantic'];

/** Nombres de CSS variables para usar en style={{ ... }} */
export const cssVars = {
  bgApp: 'var(--bg-app)',
  bgSurface: 'var(--bg-surface)',
  bgElevated: 'var(--bg-elevated)',
  bgLayout: 'var(--bg-layout)',
  bgMuted: 'var(--bg-muted)',
  bgSubtle: 'var(--bg-subtle)',
  inputBg: 'var(--input-bg)',
  tableHeaderBg: 'var(--table-header-bg)',

  textPrimary: 'var(--text-primary)',
  textSecondary: 'var(--text-secondary)',
  textMuted: 'var(--text-muted)',

  border: 'var(--border)',
  borderSubtle: 'var(--border-subtle)',

  accent: 'var(--accent)',
  onAccent: 'var(--on-accent)',
  menuHover: 'var(--menu-hover)',
  menuSelected: 'var(--menu-selected)',
  groupBg: 'var(--group-bg)',
  tableRowHover: 'var(--table-row-hover)',

  success: 'var(--success)',
  successBg: 'var(--success-bg)',
  successBorder: 'var(--success-border)',
  warning: 'var(--warning)',
  warningBg: 'var(--warning-bg)',
  warningBorder: 'var(--warning-border)',
  danger: 'var(--danger)',
  dangerBg: 'var(--danger-bg)',
  dangerBorder: 'var(--danger-border)',
  info: 'var(--info)',
  infoBg: 'var(--info-bg)',
  infoBorder: 'var(--info-border)',
} as const;

/** Tokens del modo actual (útil en lógica JS, no en CSS) */
export function getDesignTokens(mode: ThemeMode): DesignTokens {
  return designTokens[mode];
}

/**
 * Aplica el set de tokens como CSS custom properties en un elemento
 * (p. ej. document.documentElement). Complementa data-theme en el HTML.
 */
export function applyCssVars(
  mode: ThemeMode,
  target: HTMLElement = document.documentElement
): void {
  const t = designTokens[mode];
  const map: Record<string, string> = {
    '--bg-app': t.bg.app,
    '--bg-surface': t.bg.surface,
    '--bg-elevated': t.bg.elevated,
    '--bg-layout': t.bg.layout,
    '--bg-muted': t.bg.muted,
    '--bg-subtle': t.bg.subtle,
    '--input-bg': t.bg.input,
    '--table-header-bg': t.bg.tableHeader,
    '--text-primary': t.text.primary,
    '--text-secondary': t.text.secondary,
    '--text-muted': t.text.muted,
    '--border': t.border.default,
    '--border-subtle': t.border.subtle,
    '--accent': t.accent,
    '--ant-color-primary': t.accent,
    '--on-accent': t.onAccent,
    '--menu-hover': t.interaction.menuHover,
    '--menu-selected': t.interaction.menuSelected,
    '--group-bg': t.interaction.groupBg,
    '--table-row-hover': t.interaction.tableRowHover,
    '--scrollbar-thumb': t.interaction.scrollbarThumb,
    '--success': t.semantic.success.color,
    '--success-bg': t.semantic.success.bg,
    '--success-border': t.semantic.success.border,
    '--warning': t.semantic.warning.color,
    '--warning-bg': t.semantic.warning.bg,
    '--warning-border': t.semantic.warning.border,
    '--danger': t.semantic.danger.color,
    '--danger-bg': t.semantic.danger.bg,
    '--danger-border': t.semantic.danger.border,
    '--info': t.semantic.info.color,
    '--info-bg': t.semantic.info.bg,
    '--info-border': t.semantic.info.border,
  };

  for (const [key, value] of Object.entries(map)) {
    target.style.setProperty(key, value);
  }
}
