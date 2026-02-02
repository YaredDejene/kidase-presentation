import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import '../../styles/dialogs.css';

interface Settings {
  defaultFontScaling: boolean;
  presentationTransition: 'none' | 'fade' | 'slide';
  autoSave: boolean;
  theme: 'dark' | 'light';
}

const DEFAULT_SETTINGS: Settings = {
  defaultFontScaling: true,
  presentationTransition: 'none',
  autoSave: true,
  theme: 'dark',
};

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('kidase-settings');
    if (savedSettings) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
      } catch {
        setSettings(DEFAULT_SETTINGS);
      }
    }
  }, [isOpen]);

  const handleChange = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    setIsSaving(true);
    try {
      localStorage.setItem('kidase-settings', JSON.stringify(settings));
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    }
    setIsSaving(false);
  };

  const handleReset = () => {
    if (confirm('Reset all settings to defaults?')) {
      setSettings(DEFAULT_SETTINGS);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings">
      <div className="dialog-content">
        {/* Display Settings */}
        <div className="dialog-section">
          <h4>Display</h4>

          <div className="setting-row">
            <label className="setting-label">
              <span>Dynamic Font Scaling</span>
              <span className="setting-hint">Automatically adjust font size based on content length</span>
            </label>
            <input
              type="checkbox"
              checked={settings.defaultFontScaling}
              onChange={e => handleChange('defaultFontScaling', e.target.checked)}
              className="setting-checkbox"
            />
          </div>

          <div className="setting-row">
            <label className="setting-label">
              <span>Theme</span>
              <span className="setting-hint">Application color theme</span>
            </label>
            <select
              value={settings.theme}
              onChange={e => handleChange('theme', e.target.value as 'dark' | 'light')}
              className="setting-select"
            >
              <option value="dark">Dark</option>
              <option value="light">Light (Coming Soon)</option>
            </select>
          </div>
        </div>

        {/* Presentation Settings */}
        <div className="dialog-section">
          <h4>Presentation</h4>

          <div className="setting-row">
            <label className="setting-label">
              <span>Slide Transition</span>
              <span className="setting-hint">Animation between slides</span>
            </label>
            <select
              value={settings.presentationTransition}
              onChange={e => handleChange('presentationTransition', e.target.value as 'none' | 'fade' | 'slide')}
              className="setting-select"
            >
              <option value="none">None</option>
              <option value="fade">Fade</option>
              <option value="slide">Slide</option>
            </select>
          </div>
        </div>

        {/* Editor Settings */}
        <div className="dialog-section">
          <h4>Editor</h4>

          <div className="setting-row">
            <label className="setting-label">
              <span>Auto-Save</span>
              <span className="setting-hint">Automatically save changes</span>
            </label>
            <input
              type="checkbox"
              checked={settings.autoSave}
              onChange={e => handleChange('autoSave', e.target.checked)}
              className="setting-checkbox"
            />
          </div>
        </div>

        {/* About */}
        <div className="dialog-section">
          <h4>About</h4>
          <div className="about-info">
            <p><strong>Kidase Presentation</strong></p>
            <p>Version 1.0.0</p>
            <p className="setting-hint">A presentation tool for Ethiopian Orthodox liturgical texts</p>
          </div>
        </div>

        {/* Actions */}
        <div className="dialog-actions">
          <button onClick={handleReset} className="btn-reset">
            Reset to Defaults
          </button>
          <div className="dialog-actions-right">
            <button onClick={onClose} className="btn-cancel">
              Cancel
            </button>
            <button onClick={handleSave} className="btn-save" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
