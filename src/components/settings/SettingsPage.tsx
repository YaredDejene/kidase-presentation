import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../hooks/useSettings';
import { useLocale } from '../../hooks/useLocale';
import { AppSettings } from '../../domain/entities/AppSettings';
import { toast } from '../../store/toastStore';
import '../../styles/dialogs.css';
import '../../styles/settings-page.css';

export const SettingsPage: React.FC = () => {
  const { t } = useTranslation('settings');
  const { appSettings, saveSettings } = useSettings();
  const { locale, changeLocale } = useLocale();
  const [localSettings, setLocalSettings] = useState<AppSettings>(appSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalSettings(appSettings);
    setHasChanges(false);
  }, [appSettings]);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const success = await saveSettings(localSettings);
    if (success) {
      setHasChanges(false);
      toast.success(t('settingsSaved'));
    }
    setIsSaving(false);
  };

  const handleLocaleChange = async (newLocale: 'en' | 'am') => {
    await changeLocale(newLocale);
  };

  return (
    <div className="settings-page">
      <div className="settings-page-toolbar">
        <h1 className="settings-page-title">{t('title')}</h1>
      </div>

      <div className="settings-page-content">
      {/* General */}
      <div className="settings-section">
        <h2 className="settings-section-title">{t('general')}</h2>
        <div className="setting-row">
          <div className="setting-label">
            <span>{t('theme')}</span>
            <span className="setting-hint">{t('themeHint')}</span>
          </div>
          <select
            value={localSettings.theme}
            onChange={e => updateSetting('theme', e.target.value as 'dark' | 'light')}
            className="setting-select"
          >
            <option value="dark">{t('dark')}</option>
          </select>
        </div>

        <div className="setting-row">
          <div className="setting-label">
            <span>{t('language')}</span>
            <span className="setting-hint">{t('languageHint')}</span>
          </div>
          <select
            value={locale}
            onChange={e => handleLocaleChange(e.target.value as 'en' | 'am')}
            className="setting-select"
          >
            <option value="en">{t('english')}</option>
            <option value="am">{t('amharic')}</option>
          </select>
        </div>
      </div>

      {/* Display */}
      <div className="settings-section">
        <h2 className="settings-section-title">{t('display')}</h2>
        <div className="setting-row">
          <div className="setting-label">
            <span>{t('showSlideNumbers')}</span>
            <span className="setting-hint">{t('showSlideNumbersHint')}</span>
          </div>
          <button
            className={`toggle-switch ${localSettings.showSlideNumbers ? 'active' : ''}`}
            onClick={() => updateSetting('showSlideNumbers', !localSettings.showSlideNumbers)}
          >
            <span className="toggle-knob"></span>
          </button>
        </div>

        <div className="setting-row">
          <div className="setting-label">
            <span>{t('presentationDisplay')}</span>
            <span className="setting-hint">{t('presentationDisplayHint')}</span>
          </div>
          <select
            value={localSettings.presentationDisplay}
            onChange={e => updateSetting('presentationDisplay', e.target.value as 'primary' | 'secondary' | 'auto')}
            className="setting-select"
          >
            <option value="auto">{t('autoDetect')}</option>
            <option value="primary">{t('primaryMonitor')}</option>
            <option value="secondary">{t('secondaryMonitor')}</option>
          </select>
        </div>
      </div>

      {/* Export */}
      <div className="settings-section">
        <h2 className="settings-section-title">{t('exportSection')}</h2>
        <div className="setting-row">
          <div className="setting-label">
            <span>{t('defaultExportFormat')}</span>
            <span className="setting-hint">{t('defaultExportFormatHint')}</span>
          </div>
          <select
            value={localSettings.defaultExportFormat}
            onChange={e => updateSetting('defaultExportFormat', e.target.value as 'pdf' | 'pptx')}
            className="setting-select"
          >
            <option value="pdf">{t('pdf')}</option>
          </select>
        </div>
      </div>

      {/* Save bar */}
      {hasChanges && (
        <div className="settings-save-bar">
          <button className="btn-save" onClick={handleSave} disabled={isSaving}>
            {isSaving ? t('common:saving') : t('saveSettings')}
          </button>
        </div>
      )}
      </div>
    </div>
  );
};
