import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { TemplatePreview } from '../common/TemplatePreview';
import { Template, TemplateDefinition } from '../../domain/entities/Template';
import { toast } from '../../store/toastStore';
import '../../styles/dialogs.css';

const FONT_FAMILIES = [
  'Nyala, serif',
  'Arial, sans-serif',
  'Times New Roman, serif',
  'Georgia, serif',
  'Verdana, sans-serif',
  'Helvetica, sans-serif',
];

const ALIGNMENTS = ['left', 'center', 'right'] as const;

interface TemplateEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  template: Template;
  onSave: (id: string, updates: Partial<Omit<Template, 'id' | 'createdAt'>>) => Promise<Template | null>;
}

export const TemplateEditorDialog: React.FC<TemplateEditorDialogProps> = ({
  isOpen,
  onClose,
  template,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [templateDef, setTemplateDef] = useState<TemplateDefinition | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(template.name);
      setTemplateDef(JSON.parse(JSON.stringify(template.definitionJson)));
    }
  }, [isOpen, template]);

  const updateTemplateField = (path: string[], value: string | number | boolean) => {
    if (!templateDef) return;
    setTemplateDef(prev => {
      if (!prev) return prev;
      const newDef = JSON.parse(JSON.stringify(prev));
      let obj: Record<string, unknown> = newDef;
      for (let i = 0; i < path.length - 1; i++) {
        obj = obj[path[i]] as Record<string, unknown>;
      }
      obj[path[path.length - 1]] = value;
      return newDef;
    });
  };

  const updateLanguageStyle = (langIndex: number, field: string, value: string | number) => {
    if (!templateDef) return;
    setTemplateDef(prev => {
      if (!prev) return prev;
      const newDef = JSON.parse(JSON.stringify(prev));
      newDef.languages[langIndex][field] = value;
      return newDef;
    });
  };

  const handleSave = async () => {
    if (!templateDef) return;
    setIsSaving(true);
    try {
      await onSave(template.id, {
        name,
        definitionJson: templateDef,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save template:', error);
      toast.error('Failed to save template');
    }
    setIsSaving(false);
  };

  if (!templateDef) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Template">
      <div className="dialog-content">
        {/* Live Preview */}
        <div className="template-preview-wrapper">
          <TemplatePreview definition={templateDef} />
        </div>

        {/* Name */}
        <div className="form-group">
          <label className="form-label">Template Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="form-input"
            placeholder="Enter template name..."
          />
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
          {templateDef.languages.map((lang, index) => (
            <div key={lang.slot} className="template-lang-editor">
              <div className="template-lang-header">
                <span
                  className="template-lang-color"
                  style={{ backgroundColor: lang.color }}
                />
                <span className="template-lang-title">{lang.slot}</span>
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
          ))}
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
