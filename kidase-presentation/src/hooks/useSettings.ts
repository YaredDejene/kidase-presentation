import { useCallback } from 'react';
import { usePresentationDataStore } from '../store/presentationDataStore';
import { appSettingsRepository } from '../repositories';
import { AppSettings } from '../domain/entities/AppSettings';
import { toast } from '../store/toastStore';

export function useSettings() {
  const appSettings = usePresentationDataStore(s => s.appSettings);
  const setAppSettings = usePresentationDataStore(s => s.setAppSettings);

  const saveSettings = useCallback(async (settings: AppSettings): Promise<boolean> => {
    try {
      await appSettingsRepository.setAll(settings);
      setAppSettings(settings);
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
      return false;
    }
  }, [setAppSettings]);

  return {
    appSettings,
    saveSettings,
  };
}
