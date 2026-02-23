import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../common/Modal';
import { Variable } from '../../domain/entities/Variable';
import { Presentation, LanguageMap, LanguageSettings, LangSlot, LANG_SLOTS, LANG_VALUE_FIELD_MAP } from '../../domain/entities/Presentation';
import { Template } from '../../domain/entities/Template';
import { Slide } from '../../domain/entities/Slide';
import { useVariables } from '../../hooks/useVariables';
import { usePresentation } from '../../hooks/usePresentation';
import { placeholderService } from '../../services/PlaceholderService';
import { useAppStore } from '../../store/appStore';
import { toast } from '../../store/toastStore';
import { DatePicker } from '../common/DatePicker';
import '../../styles/dialogs.css';

type TabId = 'general' | 'languages' | 'placeholders';

interface PresentationSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  presentation: Presentation;
  variables: Variable[];
  slides: Slide[];
  template: Template;
  templates: Template[];
  onPresentationChange: (presentation: Presentation) => void;
  onVariablesChange: (variables: Variable[]) => void;
  onTemplateChange: (templateId: string) => void;
}

interface LanguageConfig {
  slot: LangSlot;
  name: string;
  enabled: boolean;
  order: number;
}

export const PresentationSettingsDialog: React.FC<PresentationSettingsDialogProps> = ({
  isOpen,
  onClose,
  presentation,
  variables,
  slides,
  template,
  templates,
  onPresentationChange,
  onVariablesChange,
  onTemplateChange,
}) => {
  const { t } = useTranslation('dialogs');
  const { ruleEvaluationDate, setRuleEvaluationDate, isMehella, setIsMehella, ruleFilteredSlideIds } = useAppStore();
  const { saveAll } = useVariables();
  const { updatePresentation } = usePresentation();

  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [isSaving, setIsSaving] = useState(false);

  // Languages tab state
  const [languages, setLanguages] = useState<LanguageConfig[]>([]);
  const [originalNames, setOriginalNames] = useState<Record<string, string>>({});

  // Template selector state
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // Placeholders tab state
  const [localVariables, setLocalVariables] = useState<Variable[]>([]);
  const [detectedPlaceholders, setDetectedPlaceholders] = useState<string[]>([]);

  // Initialize state when dialog opens
  useEffect(() => {
    if (isOpen) {
      const settings = presentation.languageSettings;

      // Build language configs from languageSettings or fall back to languageMap
      const langConfigs: LanguageConfig[] = LANG_SLOTS.map((slot, index) => {
        if (settings && settings[slot]) {
          return {
            slot,
            name: settings[slot]!.name,
            enabled: settings[slot]!.enabled,
            order: settings[slot]!.order,
          };
        }
        // Fallback to languageMap for backward compatibility
        const name = presentation.languageMap[slot] || `Language ${index + 1}`;
        return {
          slot,
          name,
          enabled: !!presentation.languageMap[slot],
          order: index + 1,
        };
      });

      // Store original names for when user re-enables a language
      const names: Record<string, string> = {};
      langConfigs.forEach(lang => {
        names[lang.slot] = lang.name;
      });
      setOriginalNames(names);
      setLanguages(langConfigs);

      // Template
      setSelectedTemplateId(presentation.templateId);

      // Placeholders - detect from slides
      const detected = new Set<string>();
      for (const slide of slides) {
        const found = placeholderService.findPlaceholdersInSlide({
          titleJson: slide.titleJson,
          blocksJson: slide.blocksJson,
        });
        found.forEach(p => detected.add(p));
      }
      setDetectedPlaceholders(Array.from(detected).sort());

      // Load existing variables
      setLocalVariables([...variables]);
    }
  }, [isOpen, presentation, variables, slides, template]);

  // Ensure all detected placeholders have variable entries
  useEffect(() => {
    if (detectedPlaceholders.length > 0) {
      const existingNames = new Set(localVariables.map(v => v.name));
      const newVars: Variable[] = [];

      for (const placeholder of detectedPlaceholders) {
        if (!existingNames.has(placeholder)) {
          newVars.push({
            id: `temp-${placeholder}`,
            presentationId: presentation.id,
            name: placeholder,
            value: '',
          });
        }
      }

      if (newVars.length > 0) {
        setLocalVariables(prev => [...prev, ...newVars]);
      }
    }
  }, [detectedPlaceholders, presentation.id]);

  // Language reorder handlers (using buttons instead of drag/drop for reliability)
  const moveLanguage = (fromIndex: number, direction: 'up' | 'down') => {
    setLanguages(prev => {
      // Sort by order first
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;

      // Check bounds
      if (toIndex < 0 || toIndex >= sorted.length) return prev;

      // Swap the items in the array
      const newArr = [...sorted];
      [newArr[fromIndex], newArr[toIndex]] = [newArr[toIndex], newArr[fromIndex]];

      // Reassign order numbers based on new positions
      return newArr.map((lang, i) => ({ ...lang, order: i + 1 }));
    });
  };

  const handleLanguageToggle = (slot: string) => {
    setLanguages(prev =>
      prev.map(lang => {
        if (lang.slot === slot) {
          const newEnabled = !lang.enabled;
          // When re-enabling, restore the original name
          const name = newEnabled ? (originalNames[slot] || lang.name) : lang.name;
          return { ...lang, enabled: newEnabled, name };
        }
        return lang;
      })
    );
  };

  const handleLanguageNameChange = (slot: string, newName: string) => {
    setLanguages(prev =>
      prev.map(lang => (lang.slot === slot ? { ...lang, name: newName } : lang))
    );
    // Also update original names so toggle doesn't reset it
    setOriginalNames(prev => ({ ...prev, [slot]: newName }));
  };

  const handleVariableChange = (name: string, value: string, langSlot?: LangSlot) => {
    setLocalVariables(prev =>
      prev.map(v => {
        if (v.name !== name) return v;
        if (langSlot) {
          return { ...v, [LANG_VALUE_FIELD_MAP[langSlot]]: value };
        }
        return { ...v, value };
      })
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Build updated language map (for backward compatibility)
      const languageMap: LanguageMap = {};
      for (const lang of languages) {
        if (lang.enabled && lang.name) {
          languageMap[lang.slot] = lang.name;
        }
      }

      // Build language settings with order, name, and enabled status
      const languageSettings: LanguageSettings = {};
      for (const lang of languages) {
        languageSettings[lang.slot] = {
          name: lang.name,
          enabled: lang.enabled,
          order: lang.order,
        };
      }

      // Update presentation with both languageMap and languageSettings
      const updatedPresentation = await updatePresentation(presentation.id, {
        languageMap,
        languageSettings,
        templateId: selectedTemplateId,
      });
      if (updatedPresentation) {
        onPresentationChange(updatedPresentation);
      }

      // Update/create variables
      const savedVariables = await saveAll(presentation.id, localVariables);
      onVariablesChange(savedVariables);

      // Handle template change
      if (selectedTemplateId !== presentation.templateId) {
        onTemplateChange(selectedTemplateId);
      }

      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error(t('failedToSaveSettings'));
    }
    setIsSaving(false);
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: 'general', label: t('general') },
    { id: 'languages', label: t('languages') },
    { id: 'placeholders', label: t('placeholders') },
  ];

  const sortedLanguages = [...languages].sort((a, b) => a.order - b.order);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('presentationSettings')}>
      <div className="dialog-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`dialog-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="dialog-content">
        {activeTab === 'general' && (
          <GeneralTab
            ruleEvaluationDate={ruleEvaluationDate}
            onDateChange={setRuleEvaluationDate}
            selectedTemplateId={selectedTemplateId}
            onTemplateIdChange={setSelectedTemplateId}
            templates={templates}
            isMehella={isMehella}
            onMehellaToggle={() => setIsMehella(!isMehella)}
            totalSlides={slides.length}
            activeSlides={slides.filter(s => !s.isDisabled && (ruleFilteredSlideIds === null || ruleFilteredSlideIds.includes(s.id))).length}
            placeholderCount={detectedPlaceholders.length}
          />
        )}

        {activeTab === 'languages' && (
          <LanguagesTab
            sortedLanguages={sortedLanguages}
            onMoveLanguage={moveLanguage}
            onToggle={handleLanguageToggle}
            onNameChange={handleLanguageNameChange}
          />
        )}

        {activeTab === 'placeholders' && (
          <PlaceholdersTab
            localVariables={localVariables}
            languageMap={presentation.languageMap}
            onVariableChange={handleVariableChange}
          />
        )}

        {/* Actions */}
        <div className="dialog-actions">
          <button onClick={onClose} className="btn-cancel">
            {t('common:cancel')}
          </button>
          <button onClick={handleSave} className="btn-save" disabled={isSaving}>
            {isSaving ? t('common:saving') : t('saveChanges')}
          </button>
        </div>
      </div>
    </Modal>
  );
};

/* ── Tab Sub-Components ───────────────────────────────────────────── */

interface GeneralTabProps {
  ruleEvaluationDate: string | null;
  onDateChange: (date: string | null) => void;
  selectedTemplateId: string;
  onTemplateIdChange: (id: string) => void;
  templates: Template[];
  isMehella: boolean;
  onMehellaToggle: () => void;
  totalSlides: number;
  activeSlides: number;
  placeholderCount: number;
}

function GeneralTab({
  ruleEvaluationDate, onDateChange, selectedTemplateId, onTemplateIdChange,
  templates, isMehella, onMehellaToggle, totalSlides, activeSlides, placeholderCount,
}: GeneralTabProps) {
  const { t } = useTranslation('dialogs');
  return (
    <div className="tab-content">
      <div className="form-group">
        <label className="form-label">{t('presentationDate')}</label>
        <DatePicker value={ruleEvaluationDate} onChange={onDateChange} />
        <p className="form-hint">{t('dateHint')}</p>
      </div>

      <div className="form-group">
        <label className="form-label">{t('template')}</label>
        <select
          value={selectedTemplateId}
          onChange={e => onTemplateIdChange(e.target.value)}
          className="form-select"
        >
          {templates.map(tmpl => (
            <option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <div className="setting-row">
          <div className="setting-label">
            <span>{t('mehella')}</span>
            <span className="setting-hint">{t('mehellaHint')}</span>
          </div>
          <button
            className={`toggle-switch ${isMehella ? 'active' : ''}`}
            onClick={onMehellaToggle}
          >
            <span className="toggle-knob" />
          </button>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">{t('statistics')}</label>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-value">{totalSlides}</span>
            <span className="stat-label">{t('totalSlides')}</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{activeSlides}</span>
            <span className="stat-label">{t('activeSlides')}</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{placeholderCount}</span>
            <span className="stat-label">{t('placeholders')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface LanguagesTabProps {
  sortedLanguages: LanguageConfig[];
  onMoveLanguage: (fromIndex: number, direction: 'up' | 'down') => void;
  onToggle: (slot: string) => void;
  onNameChange: (slot: string, name: string) => void;
}

function LanguagesTab({ sortedLanguages, onMoveLanguage, onToggle, onNameChange }: LanguagesTabProps) {
  const { t } = useTranslation('dialogs');
  return (
    <div className="tab-content">
      <p className="tab-hint">{t('languageReorderHint')}</p>

      <div className="languages-list">
        {sortedLanguages.map((lang, index) => (
          <div key={lang.slot} className={`language-row ${!lang.enabled ? 'disabled' : ''}`}>
            <div className="language-reorder-btns">
              <button
                className="reorder-btn"
                onClick={() => onMoveLanguage(index, 'up')}
                disabled={index === 0}
                title={t('moveUp')}
              >
                ▲
              </button>
              <button
                className="reorder-btn"
                onClick={() => onMoveLanguage(index, 'down')}
                disabled={index === sortedLanguages.length - 1}
                title={t('moveDown')}
              >
                ▼
              </button>
            </div>
            <span className="language-order-num">{index + 1}</span>
            <input
              type="text"
              className="language-name-input"
              value={lang.name}
              onChange={e => onNameChange(lang.slot, e.target.value)}
              placeholder={t('languageNamePlaceholder')}
            />
            <button
              className={`toggle-switch ${lang.enabled ? 'active' : ''}`}
              onClick={() => onToggle(lang.slot)}
              title={lang.enabled ? t('disable') : t('enable')}
            >
              <span className="toggle-knob" />
            </button>
          </div>
        ))}
      </div>

      <p className="tab-note">{t('disabledLanguagesNote')}</p>
    </div>
  );
}

interface PlaceholdersTabProps {
  localVariables: Variable[];
  languageMap: LanguageMap;
  onVariableChange: (name: string, value: string, langSlot?: LangSlot) => void;
}

function PlaceholdersTab({ localVariables, languageMap, onVariableChange }: PlaceholdersTabProps) {
  const { t } = useTranslation('dialogs');
  return (
    <div className="tab-content">
      <p className="tab-hint">{t('placeholderDetectionHint')}</p>

      {localVariables.length > 0 ? (
        <div className="placeholders-list">
          {localVariables.map(variable => {
            const isAtVar = variable.name.startsWith('@');
            return (
              <div key={variable.name} className={`placeholder-row${isAtVar ? ' placeholder-row--multilang' : ''}`}>
                <div className="placeholder-name">
                  {variable.name.replace(/[{}@]/g, '')}
                </div>
                {isAtVar ? (
                  <div className="placeholder-lang-inputs">
                    {LANG_SLOTS.map(slot => {
                      const langName = languageMap[slot];
                      if (!langName) return null;
                      const fieldKey = LANG_VALUE_FIELD_MAP[slot];
                      return (
                        <div key={slot} className="placeholder-lang-row">
                          <span className="placeholder-lang-label">{langName}</span>
                          <input
                            type="text"
                            value={(variable[fieldKey] as string) || ''}
                            onChange={e => onVariableChange(variable.name, e.target.value, slot)}
                            className="placeholder-input"
                            placeholder={t('valueForLang', { lang: langName })}
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={variable.value}
                    onChange={e => onVariableChange(variable.name, e.target.value)}
                    className="placeholder-input"
                    placeholder={t('enterValue')}
                  />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="tab-empty">
          <p>{t('noPlaceholders')}</p>
          <p className="tab-hint">{t('placeholderUsageHint')}</p>
        </div>
      )}
    </div>
  );
}
