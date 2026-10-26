import { useColorScheme } from 'react-native';
import { useSettings } from '@/store/settings';

export type Palette = Record<'bg' | 'surface' | 'elevated' | 'border' | 'borderStrong' | 'text' | 'secondary' | 'muted' | 'accent' | 'accentHover' | 'onAccent' | 'accentSoft' | 'fastTint' | 'skeleton', string>;

/** Colour tokens from the design mock; light uses hairlines, dark uses slight elevation. */
export const palettes: Record<'light' | 'dark', Palette> = {
  light: {
    bg: '#f7f7f8', surface: '#ffffff', elevated: '#eef0f2', border: '#e5e7eb', borderStrong: '#d1d5db',
    text: '#1f2937', secondary: '#6b7280', muted: '#9ca3af', accent: '#8A2232', accentHover: '#5E1620',
    onAccent: '#ffffff', accentSoft: '#f3e6e9', fastTint: '#eef0f2', skeleton: '#e5e7eb',
  },
  dark: {
    bg: '#0a0a0a', surface: '#141414', elevated: '#222222', border: '#222222', borderStrong: '#333333',
    text: '#ffffff', secondary: '#b0b0b0', muted: '#6b7280', accent: '#E3B341', accentHover: '#EDC25E',
    onAccent: '#1C1713', accentSoft: '#2b2410', fastTint: '#1a1a1a', skeleton: '#222222',
  },
};


/** Font family names as registered by the Google Fonts packages in the root layout. */
export const fonts = {
  ethiopic: 'NotoSerifEthiopic_400Regular',
  ethiopicMedium: 'NotoSerifEthiopic_500Medium',
  ethiopicBold: 'NotoSerifEthiopic_700Bold',
  serif: 'SourceSerif4_400Regular',
  serifSemi: 'SourceSerif4_600SemiBold',
} as const;

export const radius = { card: 12, control: 8, pill: 999 } as const;

export interface Theme {
  colors: Palette;
  dark: boolean;
  /** Church mode: dark, larger text, screen awake, no motion. */
  church: boolean;
  /** Reading body size in points, after the church mode bump. */
  bodySize: number;
  /** Multiplier for Ethiopic text so it reads at the same perceived size as Latin. */
  ethiopicScale: number;
  motion: boolean;
}

export const CHURCH_MODE_BUMP = 4;
export const TEXT_SIZE_MIN = 15;
export const TEXT_SIZE_MAX = 28;

export function useTheme(): Theme {
  const { settings } = useSettings();
  const system = useColorScheme();
  const church = settings.churchMode;
  const dark = church || settings.appearance === 'dark' || (settings.appearance === 'system' && system === 'dark');
  return {
    colors: dark ? palettes.dark : palettes.light,
    dark,
    church,
    bodySize: settings.textSize + (church ? CHURCH_MODE_BUMP : 0),
    ethiopicScale: 1.06,
    motion: !church,
  };
}
