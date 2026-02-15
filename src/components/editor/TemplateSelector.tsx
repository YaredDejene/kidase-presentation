import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('editor');

  return (
    <div className="template-selector">
      <label htmlFor="template-select" className="template-selector-label">
        {t('template')}
      </label>
      <select
        id="template-select"
        value={selectedId || ''}
        onChange={(e) => onSelect(e.target.value)}
        disabled={disabled || templates.length === 0}
        className="template-selector-dropdown"
      >
        {templates.length === 0 ? (
          <option value="">{t('noTemplatesAvailable')}</option>
        ) : (
          <>
            <option value="">{t('selectTemplate')}</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} ({t('languageCount', { count: template.maxLangCount })})
              </option>
            ))}
          </>
        )}
      </select>
    </div>
  );
};
