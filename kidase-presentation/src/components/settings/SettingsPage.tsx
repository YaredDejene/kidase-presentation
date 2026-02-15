import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { appSettingsRepository } from '../../repositories';
import { AppSettings } from '../../domain/entities/AppSettings';
import { toast } from '../../store/toastStore';
import '../../styles/dialogs.css';
import '../../styles/settings-page.css';

export const SettingsPage: React.FC = () => {
  const { appSettings, setAppSettings } = useAppStore();
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
    try {
      await appSettingsRepository.setAll(localSettings);
      setAppSettings(localSettings);
      setHasChanges(false);
      toast.success('Settings saved');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-page-toolbar">
        <h1 className="settings-page-title">Settings</h1>
      </div>

      <div className="settings-page-content">
      {/* General */}
      <div className="settings-section">
        <h2 className="settings-section-title">General</h2>
        <div className="setting-row">
          <div className="setting-label">
            <span>Theme</span>
            <span className="setting-hint">Application color theme</span>
          </div>
          <select
            value={localSettings.theme}
            onChange={e => updateSetting('theme', e.target.value as 'dark' | 'light')}
            className="setting-select"
          >
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>

      {/* Display */}
      <div className="settings-section">
        <h2 className="settings-section-title">Display</h2>
        <div className="setting-row">
          <div className="setting-label">
            <span>Show Slide Numbers</span>
            <span className="setting-hint">Display slide counter during presentation</span>
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
            <span>Presentation Display</span>
            <span className="setting-hint">Which display to use for presentations</span>
          </div>
          <select
            value={localSettings.presentationDisplay}
            onChange={e => updateSetting('presentationDisplay', e.target.value as 'primary' | 'secondary' | 'auto')}
            className="setting-select"
          >
            <option value="auto">Auto-detect</option>
            <option value="primary">Primary Monitor</option>
            <option value="secondary">Secondary Monitor</option>
          </select>
        </div>
      </div>

      {/* Export */}
      <div className="settings-section">
        <h2 className="settings-section-title">Export</h2>
        <div className="setting-row">
          <div className="setting-label">
            <span>Default Export Format</span>
            <span className="setting-hint">Default format when exporting presentations</span>
          </div>
          <select
            value={localSettings.defaultExportFormat}
            onChange={e => updateSetting('defaultExportFormat', e.target.value as 'pdf' | 'pptx')}
            className="setting-select"
          >
            <option value="pdf">PDF</option>
          </select>
        </div>
      </div>

      {/* Save bar */}
      {hasChanges && (
        <div className="settings-save-bar">
          <button className="btn-save" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      )}
      </div>
    </div>
  );
};
