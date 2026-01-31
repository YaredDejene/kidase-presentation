import React from 'react';
import { Slide, SlideBlock } from '../../domain/entities/Slide';
import { Template, TemplateDefinition } from '../../domain/entities/Template';
import { Variable } from '../../domain/entities/Variable';
import { LanguageMap } from '../../domain/entities/Presentation';
import { placeholderService } from '../../services/PlaceholderService';

interface SlideRendererProps {
  slide: Slide;
  template: Template;
  variables: Variable[];
  languageMap: LanguageMap;
  scale?: number;
}

export const SlideRenderer: React.FC<SlideRendererProps> = ({
  slide,
  template,
  variables,
  languageMap: _languageMap,
  scale = 1,
}) => {
  const def = template.definitionJson;

  const getProcessedBlock = (block: SlideBlock): SlideBlock => {
    return placeholderService.replaceInBlock(block, variables);
  };

  const renderLanguageContent = (
    langSlot: 'Lang1' | 'Lang2' | 'Lang3' | 'Lang4',
    langDef: TemplateDefinition['languages'][0]
  ) => {
    const block = slide.blocksJson[0] || {};
    const processedBlock = getProcessedBlock(block);
    const text = processedBlock[langSlot];

    if (!text) return null;

    return (
      <div
        key={langSlot}
        style={{
          fontSize: `${langDef.fontSize * scale}px`,
          fontFamily: langDef.fontFamily,
          color: langDef.color,
          textAlign: langDef.alignment,
          lineHeight: langDef.lineHeight,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {text}
      </div>
    );
  };

  const renderTitle = () => {
    if (!slide.titleJson || !def.title.show) return null;

    const processedTitle = placeholderService.replaceInTitle(slide.titleJson, variables);
    const titleText = processedTitle.Lang1 || processedTitle.Lang2 ||
                     processedTitle.Lang3 || processedTitle.Lang4;

    if (!titleText) return null;

    return (
      <div
        style={{
          fontSize: `${def.title.fontSize * scale}px`,
          color: def.title.color,
          textAlign: def.title.alignment,
          marginBottom: `${30 * scale}px`,
          fontWeight: 'bold',
        }}
      >
        {titleText}
      </div>
    );
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: def.background.color,
        padding: `${def.margins.top * scale}px ${def.margins.right * scale}px ${def.margins.bottom * scale}px ${def.margins.left * scale}px`,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {renderTitle()}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${def.layout.columns}, 1fr)`,
          gap: `${def.layout.gap * scale}px`,
          flex: 1,
          alignContent: 'center',
        }}
      >
        {def.languages.map((langDef) =>
          renderLanguageContent(langDef.slot, langDef)
        )}
      </div>
    </div>
  );
};
