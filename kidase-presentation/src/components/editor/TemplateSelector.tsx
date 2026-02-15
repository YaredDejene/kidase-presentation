import React from 'react';
import { Template } from '../../domain/entities/Template';

interface TemplateSelectorProps {
  templates: Template[];
  selectedId: string | null;
  onSelect: (templateId: string) => void;
  disabled?: boolean;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  templates,
  selectedId,
  onSelect,
  disabled = false,
}) => {
  return (
    <div className="template-selector">
      <label htmlFor="template-select" className="template-selector-label">
        Template
      </label>
      <select
        id="template-select"
        value={selectedId || ''}
        onChange={(e) => onSelect(e.target.value)}
        disabled={disabled || templates.length === 0}
        className="template-selector-dropdown"
      >
        {templates.length === 0 ? (
          <option value="">No templates available</option>
        ) : (
          <>
            <option value="">Select a template...</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} ({template.maxLangCount} languages)
              </option>
            ))}
          </>
        )}
      </select>
    </div>
  );
};