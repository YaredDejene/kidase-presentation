import type { CSSProperties } from 'react';

export type ThemeName = 'dark' | 'light';

/** Exact palettes from the design mock. */
export function themeVars(theme: ThemeName): CSSProperties {
  if (theme === 'light') {
    return {
      ['--bg' as string]: '#f7f7f8', ['--surface' as string]: '#ffffff', ['--surface2' as string]: '#f7f7f8', ['--elevated' as string]: '#eef0f2',
      ['--border' as string]: '#e5e7eb', ['--border2' as string]: '#d1d5db', ['--text' as string]: '#1f2937', ['--text2' as string]: '#6b7280', ['--muted' as string]: '#9ca3af',
      ['--accent' as string]: '#2563eb', ['--accent-hover' as string]: '#1d4ed8', ['--accent2' as string]: '#6366f1', ['--info' as string]: '#0891b2', ['--warning' as string]: '#d97706',
    } as CSSProperties;
  }
  return {
    ['--bg' as string]: '#0a0a0a', ['--surface' as string]: '#141414', ['--surface2' as string]: '#1a1a1a', ['--elevated' as string]: '#222222',
    ['--border' as string]: '#222222', ['--border2' as string]: '#333333', ['--text' as string]: '#ffffff', ['--text2' as string]: '#b0b0b0', ['--muted' as string]: '#6b7280',
    ['--accent' as string]: '#3b82f6', ['--accent-hover' as string]: '#2563eb', ['--accent2' as string]: '#6366f1', ['--info' as string]: '#06b6d4', ['--warning' as string]: '#f59e0b',
  } as CSSProperties;
}

export const iconBtn: CSSProperties = {
  width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--text2)', cursor: 'pointer',
  transition: 'all .15s', flexShrink: 0,
};

export function field(isDark: boolean): CSSProperties {
  return {
    height: 40, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border2)',
    background: 'var(--bg)', color: 'var(--text)', fontSize: 14, outline: 'none',
    boxSizing: 'border-box', colorScheme: isDark ? 'dark' : 'light',
    transition: 'border-color .15s, box-shadow .15s',
  };
}

export function select(isDark: boolean): CSSProperties {
  return {
    ...field(isDark), appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
    cursor: 'pointer', paddingRight: 36,
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
  };
}

export function switchTrack(on: boolean): CSSProperties {
  return { width: 42, height: 24, borderRadius: 12, background: on ? 'var(--accent)' : 'var(--border2)', position: 'relative', transition: 'background .18s', flexShrink: 0 };
}
export function switchKnob(on: boolean): CSSProperties {
  return { position: 'absolute', top: 2, left: on ? 20 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .18s', boxShadow: '0 1px 2px rgb(0 0 0 / 0.3)', display: 'block' };
}

export const sectionCard: CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 22px',
};
