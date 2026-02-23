import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../common/Modal';
import { Variable, COMMON_VARIABLES, formatVariableName } from '../../domain/entities/Variable';
import { Presentation, LangSlot, LANG_SLOTS, LANG_VALUE_FIELD_MAP } from '../../domain/entities/Presentation';
import { useVariables } from '../../hooks/useVariables';
import { toast } from '../../store/toastStore';
import '../../styles/dialogs.css';

interface VariablesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  presentation: Presentation;
  variables: Variable[];
  onVariablesChange: (variables: Variable[]) => void;
}

export const VariablesDialog: React.FC<VariablesDialogProps> = ({
  isOpen,
  onClose,
  presentation,
  variables,
  onVariablesChange,
}) => {
  const { t } = useTranslation('dialogs');
  const { createVariable, deleteVariable, saveAll } = useVariables();
  const [localVariables, setLocalVariables] = useState<Variable[]>([]);
  const [newVarName, setNewVarName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalVariables([...variables]);
  }, [variables, isOpen]);

  const handleValueChange = (id: string, value: string, langSlot?: LangSlot) => {
    setLocalVariables(prev =>
      prev.map(v => {
        if (v.id !== id) return v;
        if (langSlot) {
          return { ...v, [LANG_VALUE_FIELD_MAP[langSlot]]: value };
        }
        return { ...v, value };
      })
    );
  };

  const handleAddVariable = async () => {
    if (!newVarName.trim()) return;

    const formattedName = formatVariableName(newVarName);

    // Check if already exists
    if (localVariables.some(v => v.name === formattedName)) {
      toast.error(t('variableAlreadyExists'));
      return;
    }

    try {
      const newVar = await createVariable({
        presentationId: presentation.id,
        name: formattedName,
        value: '',
      });
      setLocalVariables(prev => [...prev, newVar]);
      setNewVarName('');
    } catch (error) {
      console.error('Failed to add variable:', error);
    }
  };

  const handleAddCommonVariable = async (name: string) => {
    if (localVariables.some(v => v.name === name)) {
      return; // Already exists
    }

    try {
      const newVar = await createVariable({
        presentationId: presentation.id,
        name,
        value: '',
      });
      setLocalVariables(prev => [...prev, newVar]);
    } catch (error) {
      console.error('Failed to add variable:', error);
    }
  };

  const handleDeleteVariable = async (id: string) => {
    try {
      await deleteVariable(id);
      setLocalVariables(prev => prev.filter(v => v.id !== id));
    } catch (error) {
      console.error('Failed to delete variable:', error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const saved = await saveAll(presentation.id, localVariables);
      onVariablesChange(saved);
      onClose();
    } catch (error) {
      console.error('Failed to save variables:', error);
      toast.error(t('failedToSaveVariables'));
    }
    setIsSaving(false);
  };

  // Get unused common variables
  const unusedCommonVars = COMMON_VARIABLES.filter(
    name => !localVariables.some(v => v.name === name)
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('presentationVariables')}>
      <div className="dialog-content">
        {/* Presentation Info */}
        <div className="dialog-section">
          <h4>{t('presentationInfo')}</h4>
          <div className="info-grid">
            <div className="info-row">
              <span className="info-label">{t('common:name')}:</span>
              <span className="info-value">{presentation.name}</span>
            </div>
            <div className="info-row">
              <span className="info-label">{t('common:type')}:</span>
              <span className="info-value">{presentation.type}</span>
            </div>
            <div className="info-row">
              <span className="info-label">{t('languages')}:</span>
              <span className="info-value">
                {Object.entries(presentation.languageMap)
                  .filter(([, value]) => value)
                  .map(([key, value]) => `${key}: ${value}`)
                  .join(', ') || 'Not set'}
              </span>
            </div>
          </div>
        </div>

        {/* Variables */}
        <div className="dialog-section">
          <h4>{t('placeholderValues')}</h4>
          <p className="dialog-hint">
            {t('placeholderHint')}
          </p>

          {localVariables.length > 0 ? (
            <div className="variables-list">
              {localVariables.map(variable => {
                const isAtVar = variable.name.startsWith('@');
                return (
                  <div key={variable.id} className={`variable-row${isAtVar ? ' variable-row--multilang' : ''}`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="variable-name">{variable.name}</span>
                      <button
                        onClick={() => handleDeleteVariable(variable.id)}
                        className="variable-delete"
                        title={t('deleteVariable')}
                      >
                        ×
                      </button>
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
                                onChange={e => handleValueChange(variable.id, e.target.value, slot)}
                                className="variable-input"
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
                        onChange={e => handleValueChange(variable.id, e.target.value)}
                        placeholder={t('enterValue')}
                        className="variable-input"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="dialog-empty">{t('noVariables')}</p>
          )}

          {/* Add new variable */}
          <div className="add-variable-row">
            <input
              type="text"
              value={newVarName}
              onChange={e => setNewVarName(e.target.value)}
              placeholder={t('variableNamePlaceholder')}
              className="variable-input"
              onKeyDown={e => e.key === 'Enter' && handleAddVariable()}
            />
            <button onClick={handleAddVariable} className="btn-add">
              {t('add')}
            </button>
          </div>

          {/* Common variables */}
          {unusedCommonVars.length > 0 && (
            <div className="common-variables">
              <span className="common-label">{t('quickAdd')}</span>
              <div className="common-tags">
                {unusedCommonVars.map(name => (
                  <button
                    key={name}
                    onClick={() => handleAddCommonVariable(name)}
                    className="common-tag"
                  >
                    + {name.replace(/[{}]/g, '')}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="dialog-actions">
          <button onClick={onClose} className="btn-cancel">
            {t('common:cancel')}
          </button>
          <button onClick={handleSave} className="btn-save" disabled={isSaving}>
            {isSaving ? t('common:saving') : t('common:save')}
          </button>
        </div>
      </div>
    </Modal>
  );
};
