import React from 'react';
import { useTranslation } from 'react-i18next';
import { Slide, SlideBlock } from '../../domain/entities/Slide';
import { LanguageMap, LanguageSettings, LangSlot, getOrderedLanguages } from '../../domain/entities/Presentation';
import { Template } from '../../domain/entities/Template';

interface SlideContentPanelProps {
  slide: Slide;
  languageMap: LanguageMap;
  languageSettings?: LanguageSettings;
  template?: Template | null;
}

export const SlideContentPanel: React.FC<SlideContentPanelProps> = ({
  slide,
  languageMap,
  languageSettings,
  template,
}) => {
  const { t } = useTranslation('editor');
  const languages = getOrderedLanguages(languageSettings, languageMap);

  // Build a map of slot → color from the template's language definitions
  const langColors: Record<string, string> = {};
  if (template) {
    for (const langDef of template.definitionJson.languages) {
      langColors[langDef.slot] = langDef.color;
    }
  }

  return (
    <div className="editor-content-panel">
      {slide.isDisabled && (
        <div className="editor-content-disabled-badge">{t('disabled')}</div>
      )}

      {/* Title */}
      {slide.titleJson && (
        <div className="editor-content-section">
          <div className="editor-content-section-header">{t('title')}</div>
          {languages.map(({ slot, name }) => {
            const value = slide.titleJson?.[slot];
            if (!value) return null;
            return (
              <div key={slot} className="editor-content-lang-row">
                <span className="editor-content-lang-label">{name}</span>
                <span
                  className="editor-content-lang-value"
                  style={langColors[slot] ? { color: langColors[slot] } : undefined}
                >
                  {value}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Content Blocks */}
      <div className="editor-content-section">
        <div className="editor-content-section-header">
          {slide.blocksJson.length > 1
            ? t('contentBlocksCount', { count: slide.blocksJson.length })
            : t('contentBlocks')}
        </div>
        {slide.blocksJson.map((block, blockIndex) => (
          <div key={blockIndex} className="editor-content-block">
            {slide.blocksJson.length > 1 && (
              <div className="editor-content-block-label">{t('block', { index: blockIndex + 1 })}</div>
            )}
            {languages.map(({ slot, name }) => {
              const value = block[slot as keyof SlideBlock];
              if (!value) return null;
              return (
                <div key={slot} className="editor-content-lang-row">
                  <span className="editor-content-lang-label">{name}</span>
                  <pre
                    className="editor-content-lang-value"
                    style={langColors[slot] ? { color: langColors[slot] } : undefined}
                  >
                    {value}
                  </pre>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer */}
      {slide.footerJson && (
        <div className="editor-content-section">
          <div className="editor-content-section-header">{t('footer')}</div>
          {slide.footerJson.title && languages.map(({ slot, name }) => {
            const value = slide.footerJson?.title?.[slot as LangSlot];
            if (!value) return null;
            return (
              <div key={`ft-${slot}`} className="editor-content-lang-row">
                <span className="editor-content-lang-label">{name} {t('footerTitle')}</span>
                <span
                  className="editor-content-lang-value"
                  style={langColors[slot] ? { color: langColors[slot] } : undefined}
                >
                  {value}
                </span>
              </div>
            );
          })}
          {slide.footerJson.text && languages.map(({ slot, name }) => {
            const value = slide.footerJson?.text?.[slot as keyof SlideBlock];
            if (!value) return null;
            return (
              <div key={`fx-${slot}`} className="editor-content-lang-row">
                <span className="editor-content-lang-label">{name} {t('footerText')}</span>
                <span
                  className="editor-content-lang-value"
                  style={langColors[slot] ? { color: langColors[slot] } : undefined}
                >
                  {value}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Details */}
      <div className="editor-content-section">
        <div className="editor-content-section-header">{t('details')}</div>
        <div className="editor-detail-row">
          <span className="editor-detail-label">{t('order')}</span>
          <span>{slide.slideOrder}</span>
        </div>
        {slide.lineId && (
          <div className="editor-detail-row">
            <span className="editor-detail-label">{t('lineIdLabel')}</span>
            <span>{slide.lineId}</span>
          </div>
        )}
        {slide.isDynamic && (
          <div className="editor-detail-row">
            <span className="editor-detail-label">{t('typeLabel')}</span>
            <span>{t('dynamicType')}</span>
          </div>
        )}
        {slide.notes && (
          <div className="editor-detail-row">
            <span className="editor-detail-label">{t('notesLabel')}</span>
            <span className="editor-detail-notes">{slide.notes}</span>
          </div>
        )}
      </div>
    </div>
  );
};
