import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { UiLang } from '@/i18n';

export type CalendarSystem = 'ethiopian' | 'gregorian';
export type Appearance = 'system' | 'light' | 'dark';

export interface Settings {
  /** Verse language code, e.g. "am". */
  readingLang: string;
  /** Second language shown under each verse, or null for off. */
  parallelLang: string | null;
  uiLang: UiLang;
  calendar: CalendarSystem;
  geezNumerals: boolean;
  appearance: Appearance;
  churchMode: boolean;
  textSize: number;
  /** "HH:MM" when the daily reminder is on, else null. */
  reminder: string | null;
  onboarded: boolean;
}

const STORAGE_KEY = 'settings.v1';

/** Device language decides the defaults the first screen preselects. */
function deviceLang(): { uiLang: UiLang; readingLang: string } {
  const code = getLocales()[0]?.languageCode ?? 'en';
  const ui: UiLang = code === 'am' || code === 'ti' ? code : 'en';
  const reading = ['am', 'ti', 'en', 'om', 'rw', 'sv'].includes(code) ? code : 'en';
  return { uiLang: ui, readingLang: reading };
}

export function defaultSettings(): Settings {
  const { uiLang, readingLang } = deviceLang();
  return {
    readingLang, parallelLang: null, uiLang, calendar: 'ethiopian', geezNumerals: false,
    appearance: 'system', churchMode: false, textSize: 18, reminder: null, onboarded: false,
  };
}

interface SettingsContextValue {
  settings: Settings;
  /** False until the stored settings have been read, so the first frame does not flash defaults. */
  ready: boolean;
  update: (patch: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => { if (raw) setSettings({ ...defaultSettings(), ...JSON.parse(raw) }); })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ settings, ready, update }), [settings, ready, update]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
