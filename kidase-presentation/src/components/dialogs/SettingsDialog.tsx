import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { appSettingsRepository } from '../../repositories';
import { AppSettings, defaultAppSettings } from '../../domain/entities/AppSettings';
import '../../styles/dialogs.css';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const { appSettings, setAppSettings } = useAppStore();
  const [localSettings, setLocalSettings] = useState<AppSettings>(defaultAppSettings);
  const [activeTab, setActiveTab] = useState<'general' | 'display' | 'export'>('general');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(appSettings);
    }
  }, [isOpen, appSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await appSettingsRepository.setAll(localSettings);
      setAppSettings(localSettings);
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">Application Settings</h2>
        <button className="modal-close" onClick={onClose}>&times;</button>

        <div className="modal-body">
          <div className="dialog-tabs">
            <button
              className={`dialog-tab ${activeTab === 'general' ? 'active' : ''}`}
              onClick={() => setActiveTab('general')}
            >
              General
            </button>
            <button
              className={`dialog-tab ${activeTab === 'display' ? 'active' : ''}`}
              onClick={() => setActiveTab('display')}
            >
              Display
            </button>
            <button
              className={`dialog-tab ${activeTab === 'export' ? 'active' : ''}`}
              onClick={() => setActiveTab('export')}
            >
              Export
            </button>
          </div>

          <div className="dialog-content" style={{ flex: 1 }}>
            {activeTab === 'general' && (
              <>
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
              </>
            )}

            {activeTab === 'display' && (
              <>
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
              </>
            )}

            {activeTab === 'export' && (
              <>
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
              </>
            )}
          </div>
        </div>

        {/* Footer with buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px',
          padding: '16px 20px',
          borderTop: '1px solid #333',
          backgroundColor: '#1a1a1a',
        }}>
          <button className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-save" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsDialog;
