import { useCallback } from 'react';
import i18n from '../i18n';
import { useSettings } from './useSettings';

export function useLocale() {
  const { appSettings, saveSettings } = useSettings();

  const changeLocale = useCallback(async (locale: 'en' | 'am') => {
    await i18n.changeLanguage(locale);
    await saveSettings({ ...appSettings, locale });
  }, [appSettings, saveSettings]);

  return {
    locale: appSettings.locale,
    changeLocale,
  };
}
