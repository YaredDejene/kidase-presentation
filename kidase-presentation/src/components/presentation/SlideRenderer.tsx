import React, { useMemo } from 'react';
import { Slide, SlideBlock, SlideTitle } from '../../domain/entities/Slide';
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

  // Calculate dynamic font scale based on total content length
  const fontScaleFactor = useMemo(() => {
    const block = slide.blocksJson[0] || {};
    const processedBlock = getProcessedBlock(block);

    // Count total characters across all languages
    let totalChars = 0;
    let langCount = 0;

    for (const langDef of def.languages) {
      const text = processedBlock[langDef.slot];
      if (text) {
        totalChars += text.length;
        langCount++;
      }
    }

    // Also count title if present
    if (slide.titleJson) {
      const processedTitle = placeholderService.replaceInTitle(slide.titleJson, variables);
      const titleText = processedTitle.Lang1 || processedTitle.Lang2 ||
                       processedTitle.Lang3 || processedTitle.Lang4;
      if (titleText) {
        totalChars += titleText.length;
      }
    }

    // Count footer content
    if (slide.footerJson) {
      if (slide.footerJson.title) {
        const footerTitle = slide.footerJson.title.Lang1 || slide.footerJson.title.Lang2 ||
                           slide.footerJson.title.Lang3 || slide.footerJson.title.Lang4;
        if (footerTitle) totalChars += footerTitle.length;
      }
      if (slide.footerJson.text) {
        const footerText = slide.footerJson.text.Lang1 || slide.footerJson.text.Lang2 ||
                          slide.footerJson.text.Lang3 || slide.footerJson.text.Lang4;
        if (footerText) totalChars += footerText.length;
      }
    }

    // Dynamic scaling based on content length
    // These thresholds are tuned for typical liturgical text
    // More aggressive scaling to fill the slide
    if (totalChars < 100) {
      return 2.0; // Very short - huge fonts
    } else if (totalChars < 200) {
      return 1.6; // Short - extra large fonts
    } else if (totalChars < 350) {
      return 1.35; // Medium-short - large fonts
    } else if (totalChars < 500) {
      return 1.15; // Medium - slightly large
    } else if (totalChars < 700) {
      return 1.0; // Medium-long - base size
    } else if (totalChars < 1000) {
      return 0.85; // Long - slightly smaller
    } else if (totalChars < 1400) {
      return 0.7; // Very long - smaller
    } else {
      return 0.55; // Extra long - much smaller
    }
  }, [slide, def.languages, variables]);

  const renderLanguageContent = (
    langSlot: 'Lang1' | 'Lang2' | 'Lang3' | 'Lang4',
    langDef: TemplateDefinition['languages'][0]
  ) => {
    const block = slide.blocksJson[0] || {};
    const processedBlock = getProcessedBlock(block);
    const text = processedBlock[langSlot];

    if (!text) return null;

    const adjustedFontSize = langDef.fontSize * fontScaleFactor * scale;

    return (
      <div
        key={langSlot}
        style={{
          fontSize: `${adjustedFontSize}px`,
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

    // Get all title parts
    const titleLang1 = processedTitle.Lang1;
    const titleLang4 = processedTitle.Lang4; // English label like "Priest:"

    // Combine title with label if both exist
    let displayTitle = titleLang1 || processedTitle.Lang2 || processedTitle.Lang3 || '';
    if (titleLang4 && titleLang1) {
      displayTitle = `${titleLang1} ${titleLang4}`;
    }

    if (!displayTitle) return null;

    // Title uses fixed size (not affected by dynamic scaling) for visibility
    const titleFontSize = def.title.fontSize * scale;

    return (
      <div
        style={{
          fontSize: `${titleFontSize}px`,
          color: def.title.color,
          textAlign: def.title.alignment,
          marginBottom: `${2 * scale}px`,
          fontWeight: 'bold',
        }}
      >
        {displayTitle}
      </div>
    );
  };

  const renderFooter = () => {
    if (!slide.footerJson) return null;

    const { title: footerTitle, text: footerText } = slide.footerJson;

    // Process footer title and text
    const processedFooterTitle = footerTitle
      ? placeholderService.replaceInTitle(footerTitle, variables)
      : null;
    const processedFooterText = footerText
      ? getProcessedBlock(footerText)
      : null;

    // Check if there's any footer content
    const hasContent = processedFooterTitle || processedFooterText;
    if (!hasContent) return null;

    // Footer uses same size as header title
    const footerFontSize = def.title.fontSize * scale;
    const separator = ' • ';

    // Build footer parts for each language
    const footerParts: React.ReactNode[] = [];
    for (const langDef of def.languages) {
      const titlePart = processedFooterTitle?.[langDef.slot];
      const textPart = processedFooterText?.[langDef.slot];

      if (titlePart || textPart) {
        // Add separator between languages
        if (footerParts.length > 0) {
          footerParts.push(
            <span key={`sep-${langDef.slot}`} style={{ color: '#888888' }}>
              {separator}
            </span>
          );
        }

        footerParts.push(
          <span
            key={`footer-${langDef.slot}`}
            style={{
              fontFamily: langDef.fontFamily,
              color: langDef.color,
            }}
          >
            {titlePart && (
              <span style={{ fontWeight: 'bold' }}>
                {titlePart}
                {textPart && ': '}
              </span>
            )}
            {textPart && <span>{textPart}</span>}
          </span>
        );
      }
    }

    if (footerParts.length === 0) return null;

    return (
      <div
        style={{
          marginTop: `${20 * scale}px`,
          fontSize: `${footerFontSize}px`,
          textAlign: 'left',
        }}
      >
        {footerParts}
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
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          justifyContent: 'center',
          gap: `${def.layout.gap * scale}px`,
        }}
      >
        {def.languages.map((langDef) =>
          renderLanguageContent(langDef.slot, langDef)
        )}
      </div>

      {renderFooter()}
    </div>
  );
};
