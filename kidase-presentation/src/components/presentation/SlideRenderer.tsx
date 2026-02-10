import React, { useMemo } from 'react';
import { Slide, SlideBlock } from '../../domain/entities/Slide';
import { Template, TemplateDefinition } from '../../domain/entities/Template';
import { Variable } from '../../domain/entities/Variable';
import { LanguageMap, LanguageSettings, LangSlot, LANG_SLOTS } from '../../domain/entities/Presentation';
import { placeholderService } from '../../services/PlaceholderService';

interface SlideRendererProps {
  slide: Slide;
  template: Template;
  variables: Variable[];
  languageMap: LanguageMap;
  languageSettings?: LanguageSettings;
  scale?: number;
  meta?: Record<string, unknown> | null;
}

export const SlideRenderer: React.FC<SlideRendererProps> = React.memo(({
  slide,
  template,
  variables,
  languageMap,
  languageSettings,
  scale = 1,
  meta,
}) => {
  const def = template.definitionJson;

  // Get enabled languages in the correct order
  const enabledLanguages = useMemo(() => {
    if (languageSettings) {
      // Use languageSettings for order and enabled status
      return LANG_SLOTS
        .filter(slot => languageSettings[slot]?.enabled)
        .map(slot => ({
          ...def.languages.find(l => l.slot === slot)!,
          order: languageSettings[slot]!.order,
        }))
        .sort((a, b) => a.order - b.order);
    }

    // Fallback to languageMap (backward compatibility)
    return def.languages.filter(lang => languageMap[lang.slot] !== undefined);
  }, [def.languages, languageMap, languageSettings]);

  const metaContext = meta ?? undefined;

  const getProcessedBlock = (block: SlideBlock): SlideBlock => {
    return placeholderService.replaceInBlock(block, variables, metaContext);
  };

  // Calculate dynamic font scale based on total content length
  const fontScaleFactor = useMemo(() => {
    const block = slide.blocksJson[0] || {};
    const processedBlock = getProcessedBlock(block);

    // Count total characters across enabled languages only
    let totalChars = 0;
    let langCount = 0;

    for (const langDef of enabledLanguages) {
      const text = processedBlock[langDef.slot];
      if (text) {
        totalChars += text.length;
        langCount++;
      }
    }

    // Also count title if present
    if (slide.titleJson) {
      const processedTitle = placeholderService.replaceInTitle(slide.titleJson, variables, metaContext);
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
  }, [slide, enabledLanguages, variables]);

  const renderLanguageContent = (
    langSlot: LangSlot,
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

    const processedTitle = placeholderService.replaceInTitle(slide.titleJson, variables, metaContext);

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
      ? placeholderService.replaceInTitle(footerTitle, variables, metaContext)
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

    // Build footer parts for each enabled language
    const footerParts: React.ReactNode[] = [];
    for (const langDef of enabledLanguages) {
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
        {enabledLanguages.map((langDef) =>
          renderLanguageContent(langDef.slot, langDef)
        )}
      </div>

      {renderFooter()}
    </div>
  );
});
