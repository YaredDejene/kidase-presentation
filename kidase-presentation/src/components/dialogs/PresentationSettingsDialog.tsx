import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Variable } from '../../domain/entities/Variable';
import { Presentation, LanguageMap, LanguageSettings, LangSlot, LANG_SLOTS, LANG_VALUE_FIELD_MAP } from '../../domain/entities/Presentation';
import { Template, TemplateDefinition } from '../../domain/entities/Template';
import { Slide } from '../../domain/entities/Slide';
import { variableRepository, presentationRepository, templateRepository } from '../../repositories';
import { presentationService } from '../../services/PresentationService';
import { placeholderService } from '../../services/PlaceholderService';
import { useAppStore } from '../../store/appStore';
import '../../styles/dialogs.css';

type TabId = 'general' | 'languages' | 'template' | 'placeholders' | 'danger';

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
  onDelete?: () => void;
}

interface LanguageConfig {
  slot: LangSlot;
  name: string;
  enabled: boolean;
  order: number;
}

const FONT_FAMILIES = [
  'Nyala, serif',
  'Arial, sans-serif',
  'Times New Roman, serif',
  'Georgia, serif',
  'Verdana, sans-serif',
  'Helvetica, sans-serif',
];

const ALIGNMENTS = ['left', 'center', 'right'] as const;

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
  onDelete,
}) => {
  const { ruleEvaluationDate, setRuleEvaluationDate } = useAppStore();

  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [isSaving, setIsSaving] = useState(false);

  // General tab state
  const [name, setName] = useState('');
  const [type, setType] = useState('');

  // Languages tab state
  const [languages, setLanguages] = useState<LanguageConfig[]>([]);
  const [originalNames, setOriginalNames] = useState<Record<string, string>>({});

  // Template tab state
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateDef, setTemplateDef] = useState<TemplateDefinition | null>(null);

  // Placeholders tab state
  const [localVariables, setLocalVariables] = useState<Variable[]>([]);
  const [detectedPlaceholders, setDetectedPlaceholders] = useState<string[]>([]);

  // Initialize state when dialog opens
  useEffect(() => {
    if (isOpen) {
      // General
      setName(presentation.name);
      setType(presentation.type);

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
      setTemplateDef(JSON.parse(JSON.stringify(template.definitionJson)));

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

  // Template editing handlers
  const updateTemplateField = (path: string[], value: any) => {
    if (!templateDef) return;

    setTemplateDef(prev => {
      if (!prev) return prev;
      const newDef = JSON.parse(JSON.stringify(prev));
      let obj: any = newDef;
      for (let i = 0; i < path.length - 1; i++) {
        obj = obj[path[i]];
      }
      obj[path[path.length - 1]] = value;
      return newDef;
    });
  };

  const updateLanguageStyle = (langIndex: number, field: string, value: any) => {
    if (!templateDef) return;

    setTemplateDef(prev => {
      if (!prev) return prev;
      const newDef = JSON.parse(JSON.stringify(prev));
      newDef.languages[langIndex][field] = value;
      return newDef;
    });
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
      const updatedPresentation = await presentationRepository.update(presentation.id, {
        name,
        type,
        languageMap,
        languageSettings,
        templateId: selectedTemplateId,
      });
      onPresentationChange(updatedPresentation);

      // Update template if style settings were modified (not language order)
      if (templateDef && selectedTemplateId === template.id) {
        await templateRepository.update(template.id, {
          definitionJson: templateDef,
        });
      }

      // Update/create variables
      const savedVariables: Variable[] = [];
      for (const variable of localVariables) {
        if (variable.id.startsWith('temp-')) {
          const created = await variableRepository.create({
            presentationId: presentation.id,
            name: variable.name,
            value: variable.value,
            valueLang1: variable.valueLang1,
            valueLang2: variable.valueLang2,
            valueLang3: variable.valueLang3,
            valueLang4: variable.valueLang4,
          });
          savedVariables.push(created);
        } else {
          const updated = await variableRepository.update(variable.id, {
            value: variable.value,
            valueLang1: variable.valueLang1,
            valueLang2: variable.valueLang2,
            valueLang3: variable.valueLang3,
            valueLang4: variable.valueLang4,
          });
          savedVariables.push(updated);
        }
      }
      onVariablesChange(savedVariables);

      // Handle template change
      if (selectedTemplateId !== presentation.templateId) {
        onTemplateChange(selectedTemplateId);
      }

      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    }
    setIsSaving(false);
  };

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${presentation.name}"? This will permanently remove the presentation and all its slides, variables, and rules.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await presentationService.deletePresentation(presentation.id);
      onDelete?.();
      onClose();
    } catch (error) {
      console.error('Failed to delete presentation:', error);
      alert('Failed to delete presentation');
    }
    setIsDeleting(false);
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'languages', label: 'Languages' },
    { id: 'template', label: 'Template' },
    { id: 'placeholders', label: 'Placeholders' },
    { id: 'danger', label: 'Danger Zone' },
  ];

  const sortedLanguages = [...languages].sort((a, b) => a.order - b.order);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Presentation Settings">
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
        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="tab-content">
            <div className="form-group">
              <label className="form-label">Presentation Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="form-input"
                placeholder="Enter presentation name..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                className="form-select"
              >
                <option value="Kidase">Kidase (Divine Liturgy)</option>
                <option value="Mahlet">Mahlet</option>
                <option value="Seatat">Seatat (Hours)</option>
                <option value="Wazema">Wazema</option>
                <option value="Custom">Custom</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Presentation Date</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="date"
                  value={ruleEvaluationDate || ''}
                  onChange={e => setRuleEvaluationDate(e.target.value || null)}
                  className="form-input"
                  style={{ flex: 1 }}
                />
                <button
                  onClick={() => setRuleEvaluationDate(null)}
                  className="btn-cancel"
                  style={{ padding: '6px 12px', fontSize: '13px' }}
                  title="Reset to today"
                >
                  Today
                </button>
              </div>
              <p style={{ margin: '6px 0 0', color: '#888', fontSize: '12px' }}>
                Set the presentation date. Display rules will evaluate against this date. Leave empty to use today's date.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Statistics</label>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-value">{slides.length}</span>
                  <span className="stat-label">Total Slides</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{slides.filter(s => !s.isDisabled).length}</span>
                  <span className="stat-label">Active Slides</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{detectedPlaceholders.length}</span>
                  <span className="stat-label">Placeholders</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Languages Tab */}
        {activeTab === 'languages' && (
          <div className="tab-content">
            <p className="tab-hint">
              Drag and drop to reorder languages. The order here determines display order on slides.
            </p>

            <div className="languages-list">
              {sortedLanguages.map((lang, index) => (
                <div
                  key={lang.slot}
                  className={`language-row ${!lang.enabled ? 'disabled' : ''}`}
                >
                  <div className="language-reorder-btns">
                    <button
                      className="reorder-btn"
                      onClick={() => moveLanguage(index, 'up')}
                      disabled={index === 0}
                      title="Move up"
                    >
                      ▲
                    </button>
                    <button
                      className="reorder-btn"
                      onClick={() => moveLanguage(index, 'down')}
                      disabled={index === sortedLanguages.length - 1}
                      title="Move down"
                    >
                      ▼
                    </button>
                  </div>
                  <span className="language-order-num">{index + 1}</span>
                  <input
                    type="text"
                    className="language-name-input"
                    value={lang.name}
                    onChange={(e) => handleLanguageNameChange(lang.slot, e.target.value)}
                    placeholder="Language name..."
                  />
                  <button
                    className={`toggle-switch ${lang.enabled ? 'active' : ''}`}
                    onClick={() => handleLanguageToggle(lang.slot)}
                    title={lang.enabled ? 'Disable' : 'Enable'}
                  >
                    <span className="toggle-knob" />
                  </button>
                </div>
              ))}
            </div>

            <p className="tab-note">
              Note: Disabled languages will be hidden in the presentation view.
            </p>
          </div>
        )}

        {/* Template Tab */}
        {activeTab === 'template' && templateDef && (
          <div className="tab-content">
            <div className="form-group">
              <label className="form-label">Select Template</label>
              <select
                value={selectedTemplateId}
                onChange={e => {
                  setSelectedTemplateId(e.target.value);
                  const newTemplate = templates.find(t => t.id === e.target.value);
                  if (newTemplate) {
                    setTemplateDef(JSON.parse(JSON.stringify(newTemplate.definitionJson)));
                  }
                }}
                className="form-select"
              >
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Background */}
            <div className="template-section">
              <div className="template-section-header">Background</div>
              <div className="template-row">
                <span className="template-row-label">Color</span>
                <input
                  type="color"
                  value={templateDef.background.color}
                  onChange={e => updateTemplateField(['background', 'color'], e.target.value)}
                  className="template-color-input"
                />
                <span style={{ color: '#888', fontSize: '13px' }}>{templateDef.background.color}</span>
              </div>
            </div>

            {/* Title Settings */}
            <div className="template-section">
              <div className="template-section-header">Title</div>
              <div className="template-lang-grid">
                <div className="template-field">
                  <label className="template-field-label">Font Size</label>
                  <input
                    type="number"
                    value={templateDef.title.fontSize}
                    onChange={e => updateTemplateField(['title', 'fontSize'], parseInt(e.target.value))}
                    className="template-field-input"
                  />
                </div>
                <div className="template-field">
                  <label className="template-field-label">Color</label>
                  <input
                    type="color"
                    value={templateDef.title.color}
                    onChange={e => updateTemplateField(['title', 'color'], e.target.value)}
                    className="template-color-input"
                  />
                </div>
              </div>
            </div>

            {/* Language Styles */}
            <div className="template-section">
              <div className="template-section-header">Language Styles</div>
              {templateDef.languages.map((lang, index) => {
                // Get the user-friendly name from languages state
                const langConfig = languages.find(l => l.slot === lang.slot);
                const displayName = langConfig?.name || lang.slot;
                return (
                <div key={lang.slot} className="template-lang-editor">
                  <div className="template-lang-header">
                    <span
                      className="template-lang-color"
                      style={{ backgroundColor: lang.color }}
                    />
                    <span className="template-lang-title">{displayName}</span>
                  </div>
                  <div className="template-lang-grid">
                    <div className="template-field">
                      <label className="template-field-label">Font Size</label>
                      <input
                        type="number"
                        value={lang.fontSize}
                        onChange={e => updateLanguageStyle(index, 'fontSize', parseInt(e.target.value))}
                        className="template-field-input"
                      />
                    </div>
                    <div className="template-field">
                      <label className="template-field-label">Color</label>
                      <input
                        type="color"
                        value={lang.color}
                        onChange={e => updateLanguageStyle(index, 'color', e.target.value)}
                        className="template-color-input"
                      />
                    </div>
                    <div className="template-field">
                      <label className="template-field-label">Font Family</label>
                      <select
                        value={lang.fontFamily}
                        onChange={e => updateLanguageStyle(index, 'fontFamily', e.target.value)}
                        className="template-field-input"
                      >
                        {FONT_FAMILIES.map(font => (
                          <option key={font} value={font}>{font.split(',')[0]}</option>
                        ))}
                      </select>
                    </div>
                    <div className="template-field">
                      <label className="template-field-label">Alignment</label>
                      <select
                        value={lang.alignment}
                        onChange={e => updateLanguageStyle(index, 'alignment', e.target.value)}
                        className="template-field-input"
                      >
                        {ALIGNMENTS.map(align => (
                          <option key={align} value={align}>{align}</option>
                        ))}
                      </select>
                    </div>
                    <div className="template-field">
                      <label className="template-field-label">Line Height</label>
                      <input
                        type="number"
                        step="0.1"
                        value={lang.lineHeight}
                        onChange={e => updateLanguageStyle(index, 'lineHeight', parseFloat(e.target.value))}
                        className="template-field-input"
                      />
                    </div>
                  </div>
                </div>
              );
              })}
            </div>

            {/* Margins */}
            <div className="template-section">
              <div className="template-section-header">Margins</div>
              <div className="template-lang-grid">
                <div className="template-field">
                  <label className="template-field-label">Top</label>
                  <input
                    type="number"
                    value={templateDef.margins.top}
                    onChange={e => updateTemplateField(['margins', 'top'], parseInt(e.target.value))}
                    className="template-field-input"
                  />
                </div>
                <div className="template-field">
                  <label className="template-field-label">Right</label>
                  <input
                    type="number"
                    value={templateDef.margins.right}
                    onChange={e => updateTemplateField(['margins', 'right'], parseInt(e.target.value))}
                    className="template-field-input"
                  />
                </div>
                <div className="template-field">
                  <label className="template-field-label">Bottom</label>
                  <input
                    type="number"
                    value={templateDef.margins.bottom}
                    onChange={e => updateTemplateField(['margins', 'bottom'], parseInt(e.target.value))}
                    className="template-field-input"
                  />
                </div>
                <div className="template-field">
                  <label className="template-field-label">Left</label>
                  <input
                    type="number"
                    value={templateDef.margins.left}
                    onChange={e => updateTemplateField(['margins', 'left'], parseInt(e.target.value))}
                    className="template-field-input"
                  />
                </div>
              </div>
            </div>

            {/* Layout */}
            <div className="template-section">
              <div className="template-section-header">Layout</div>
              <div className="template-row">
                <span className="template-row-label">Gap between languages</span>
                <input
                  type="number"
                  value={templateDef.layout.gap}
                  onChange={e => updateTemplateField(['layout', 'gap'], parseInt(e.target.value))}
                  className="template-number-input"
                />
                <span style={{ color: '#888', fontSize: '13px' }}>px</span>
              </div>
            </div>
          </div>
        )}

        {/* Placeholders Tab */}
        {activeTab === 'placeholders' && (
          <div className="tab-content">
            <p className="tab-hint">
              Set values for placeholders detected in your slides. These will be replaced when displaying or exporting.
            </p>

            {localVariables.length > 0 ? (
              <div className="placeholders-list">
                {localVariables.map(variable => {
                  const isAtVar = variable.name.startsWith('@');
                  return (
                    <div key={variable.name} className="placeholder-row" style={isAtVar ? { flexDirection: 'column', alignItems: 'stretch' } : undefined}>
                      <div className="placeholder-name">
                        {variable.name.replace(/[{}@]/g, '')}
                      </div>
                      {isAtVar ? (
                        <div className="placeholder-lang-inputs">
                          {LANG_SLOTS.map(slot => {
                            const langName = presentation.languageMap[slot];
                            if (!langName) return null;
                            const fieldKey = LANG_VALUE_FIELD_MAP[slot];
                            return (
                              <div key={slot} className="placeholder-lang-row">
                                <span className="placeholder-lang-label">{langName}</span>
                                <input
                                  type="text"
                                  value={(variable[fieldKey] as string) || ''}
                                  onChange={e => handleVariableChange(variable.name, e.target.value, slot)}
                                  className="placeholder-input"
                                  placeholder={`Value for ${langName}...`}
                                />
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={variable.value}
                          onChange={e => handleVariableChange(variable.name, e.target.value)}
                          className="placeholder-input"
                          placeholder="Enter value..."
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="tab-empty">
                <p>No placeholders detected in your slides.</p>
                <p className="tab-hint">
                  Use {'{{PLACEHOLDER_NAME}}'} for single-value or @VARIABLE_NAME for per-language placeholders.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Danger Zone Tab */}
        {activeTab === 'danger' && (
          <div className="tab-content">
            <div style={{
              border: '1px solid #c53030',
              borderRadius: '8px',
              padding: '20px',
              backgroundColor: 'rgba(197, 48, 48, 0.08)',
            }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#fc8181', fontSize: '16px' }}>
                Delete Presentation
              </h3>
              <p style={{ margin: '0 0 16px 0', color: '#aaa', fontSize: '14px' }}>
                Permanently delete <strong style={{ color: '#fff' }}>{presentation.name}</strong> and
                all its slides ({slides.length}), variables ({variables.length}), and display rules.
                This action cannot be undone.
              </p>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                style={{
                  padding: '8px 20px',
                  backgroundColor: '#c53030',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}
              >
                {isDeleting ? 'Deleting...' : 'Delete This Presentation'}
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="dialog-actions">
          <button onClick={onClose} className="btn-cancel">
            Cancel
          </button>
          <button onClick={handleSave} className="btn-save" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
