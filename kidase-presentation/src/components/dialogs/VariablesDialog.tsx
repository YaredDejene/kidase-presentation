import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Variable, COMMON_VARIABLES } from '../../domain/entities/Variable';
import { Presentation } from '../../domain/entities/Presentation';
import { variableRepository } from '../../repositories';
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
  const [localVariables, setLocalVariables] = useState<Variable[]>([]);
  const [newVarName, setNewVarName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalVariables([...variables]);
  }, [variables, isOpen]);

  const handleValueChange = (id: string, value: string) => {
    setLocalVariables(prev =>
      prev.map(v => (v.id === id ? { ...v, value } : v))
    );
  };

  const handleAddVariable = async () => {
    if (!newVarName.trim()) return;

    // Format the variable name
    let formattedName = newVarName.trim().toUpperCase();
    if (!formattedName.startsWith('{{')) {
      formattedName = `{{${formattedName}`;
    }
    if (!formattedName.endsWith('}}')) {
      formattedName = `${formattedName}}}`;
    }

    // Check if already exists
    if (localVariables.some(v => v.name === formattedName)) {
      alert('Variable already exists');
      return;
    }

    try {
      const newVar = await variableRepository.create({
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
      const newVar = await variableRepository.create({
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
      await variableRepository.delete(id);
      setLocalVariables(prev => prev.filter(v => v.id !== id));
    } catch (error) {
      console.error('Failed to delete variable:', error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update all variables
      for (const variable of localVariables) {
        await variableRepository.update(variable.id, { value: variable.value });
      }
      onVariablesChange(localVariables);
      onClose();
    } catch (error) {
      console.error('Failed to save variables:', error);
      alert('Failed to save variables');
    }
    setIsSaving(false);
  };

  // Get unused common variables
  const unusedCommonVars = COMMON_VARIABLES.filter(
    name => !localVariables.some(v => v.name === name)
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Presentation Variables">
      <div className="dialog-content">
        {/* Presentation Info */}
        <div className="dialog-section">
          <h4>Presentation Info</h4>
          <div className="info-grid">
            <div className="info-row">
              <span className="info-label">Name:</span>
              <span className="info-value">{presentation.name}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Type:</span>
              <span className="info-value">{presentation.type}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Languages:</span>
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
          <h4>Placeholder Values</h4>
          <p className="dialog-hint">
            Set values for placeholders used in your slides. Use format: {'{{VARIABLE_NAME}}'}
          </p>

          {localVariables.length > 0 ? (
            <div className="variables-list">
              {localVariables.map(variable => (
                <div key={variable.id} className="variable-row">
                  <span className="variable-name">{variable.name}</span>
                  <input
                    type="text"
                    value={variable.value}
                    onChange={e => handleValueChange(variable.id, e.target.value)}
                    placeholder="Enter value..."
                    className="variable-input"
                  />
                  <button
                    onClick={() => handleDeleteVariable(variable.id)}
                    className="variable-delete"
                    title="Delete variable"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="dialog-empty">No variables defined yet.</p>
          )}

          {/* Add new variable */}
          <div className="add-variable-row">
            <input
              type="text"
              value={newVarName}
              onChange={e => setNewVarName(e.target.value)}
              placeholder="VARIABLE_NAME"
              className="variable-input"
              onKeyDown={e => e.key === 'Enter' && handleAddVariable()}
            />
            <button onClick={handleAddVariable} className="btn-add">
              Add
            </button>
          </div>

          {/* Common variables */}
          {unusedCommonVars.length > 0 && (
            <div className="common-variables">
              <span className="common-label">Quick add:</span>
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
            Cancel
          </button>
          <button onClick={handleSave} className="btn-save" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
