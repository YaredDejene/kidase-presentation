import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getVersion } from '@tauri-apps/api/app';
import { save, open } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { useSettings } from '../../hooks/useSettings';
import { useLocale } from '../../hooks/useLocale';
import { AppSettings } from '../../domain/entities/AppSettings';
import { toast } from '../../store/toastStore';
import { backupService, BackupData } from '../../services';
import { ConfirmDialog } from '../common/ConfirmDialog';
import '../../styles/dialogs.css';
import '../../styles/settings-page.css';

export const SettingsPage: React.FC = () => {
  const { t } = useTranslation('settings');
  const { appSettings, saveSettings } = useSettings();
  const { locale, changeLocale } = useLocale();
  const [localSettings, setLocalSettings] = useState<AppSettings>(appSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [version, setVersion] = useState('');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [pendingRestoreData, setPendingRestoreData] = useState<BackupData | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    getVersion().then(v => setVersion(v)).catch(() => {});
  }, []);

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
      // Apply locale change if it differs from current
      if (localSettings.locale !== locale) {
        await changeLocale(localSettings.locale);
      }
      setHasChanges(false);
      toast.success(t('settingsSaved'));
    }
    setIsSaving(false);
  };

  const handleCreateBackup = async () => {
    try {
      const filePath = await save({
        title: t('createBackup'),
        defaultPath: `kidase-backup-${new Date().toISOString().slice(0, 10)}.kidase`,
        filters: [{ name: 'Kidase Backup', extensions: ['kidase'] }],
      });
      if (!filePath) return;

      setIsBackingUp(true);
      const backup = await backupService.createBackup(version);
      await writeTextFile(filePath, JSON.stringify(backup, null, 2));
      toast.success(t('backupCreated'));
    } catch (error) {
      toast.error(t('backupFailed', { message: (error as Error).message }));
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreBackup = async () => {
    try {
      const filePath = await open({
        title: t('restoreBackup'),
        filters: [{ name: 'Kidase Backup', extensions: ['kidase'] }],
        multiple: false,
      });
      if (!filePath) return;

      const content = await readTextFile(filePath as string);
      let data: BackupData;
      try {
        data = JSON.parse(content);
      } catch {
        toast.error(t('invalidBackupFile'));
        return;
      }

      if (!data.version || !data.data) {
        toast.error(t('invalidBackupFile'));
        return;
      }

      setPendingRestoreData(data);
      setShowRestoreConfirm(true);
    } catch (error) {
      toast.error(t('restoreFailed', { message: (error as Error).message }));
    }
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestoreData) return;
    setShowRestoreConfirm(false);
    setIsRestoring(true);

    try {
      await backupService.restoreBackup(pendingRestoreData);
      toast.success(t('restoreSuccess'));
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'INCOMPATIBLE_VERSION') {
        toast.error(t('incompatibleBackup'));
      } else {
        toast.error(t('restoreFailed', { message: msg }));
      }
      setIsRestoring(false);
    } finally {
      setPendingRestoreData(null);
    }
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
            value={localSettings.locale}
            onChange={e => updateSetting('locale', e.target.value as 'en' | 'am')}
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

      {/* Advanced */}
      <div className="settings-section">
        <h2
          className="settings-section-title settings-section-toggle"
          onClick={() => setShowAdvanced(prev => !prev)}
        >
          <span>{t('advanced')}</span>
          <span className={`settings-chevron ${showAdvanced ? 'open' : ''}`}>&#9656;</span>
        </h2>
        {showAdvanced && (
          <>
            <div className="setting-row">
              <div className="setting-label">
                <span>{t('createBackup')}</span>
                <span className="setting-hint">{t('createBackupHint')}</span>
              </div>
              <button
                className="setting-action-btn"
                onClick={handleCreateBackup}
                disabled={isBackingUp}
              >
                {isBackingUp ? '...' : t('backup')}
              </button>
            </div>
            <div className="setting-row">
              <div className="setting-label">
                <span>{t('restoreBackup')}</span>
                <span className="setting-hint">{t('restoreBackupHint')}</span>
              </div>
              <button
                className="setting-action-btn"
                onClick={handleRestoreBackup}
                disabled={isRestoring}
              >
                {isRestoring ? '...' : t('restore')}
              </button>
            </div>
          </>
        )}
      </div>

      {/* About */}
      <div className="settings-section">
        <h2 className="settings-section-title">{t('about')}</h2>
        <div className="setting-row">
          <div className="setting-label">
            <span>{t('appName')}</span>
          </div>
          <span className="setting-value">{version && `v${version}`}</span>
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

      <ConfirmDialog
        isOpen={showRestoreConfirm}
        title={t('restoreConfirmTitle')}
        message={t('restoreConfirmMessage')}
        confirmLabel={t('restore')}
        onConfirm={handleConfirmRestore}
        onCancel={() => {
          setShowRestoreConfirm(false);
          setPendingRestoreData(null);
        }}
      />
    </div>
  );
};
