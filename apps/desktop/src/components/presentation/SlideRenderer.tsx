import React, { useMemo } from 'react';
import {
  Slide,
  Template,
  TemplateDefinition,
  Variable,
  LanguageMap,
  LanguageSettings,
  LangSlot,
  LANG_SLOTS,
  placeholderService,
  computeFontScaleFactor,
} from '@kidase/shared';

const VERTICAL_ALIGN_TO_JUSTIFY = { top: 'flex-start', center: 'center', bottom: 'flex-end' } as const;

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
  const metaContext = meta ?? undefined;

  const enabledLanguages = useMemo(() => {
    if (languageSettings) {
      return LANG_SLOTS
        .filter(slot => languageSettings[slot]?.enabled && def.languages.some(l => l.slot === slot))
        .map(slot => ({
          ...def.languages.find(l => l.slot === slot)!,
          order: languageSettings[slot]?.order ?? 0,
        }))
        .sort((a, b) => a.order - b.order);
    }
    return def.languages.filter(lang => languageMap[lang.slot] !== undefined);
  }, [def.languages, languageMap, languageSettings]);

  // Process block once — used by font scaling, rendering, and column filtering
  const processedBlock = useMemo(() => {
    const block = slide.blocksJson[0] || {};
    return placeholderService.replaceInBlock(block, variables, metaContext);
  }, [slide.blocksJson, variables, metaContext]);

  // Calculate dynamic font scale based on content length and estimated fill
  const fontScaleFactor = useMemo(() => {
    let titleFooterChars = 0;

    if (slide.titleJson) {
      const processedTitle = placeholderService.replaceInTitle(slide.titleJson, variables, metaContext);
      const titleText = processedTitle.Lang1 || processedTitle.Lang2 ||
                       processedTitle.Lang3 || processedTitle.Lang4;
      if (titleText) titleFooterChars += titleText.length;
    }

    if (slide.footerJson) {
      if (slide.footerJson.title) {
        const footerTitle = slide.footerJson.title.Lang1 || slide.footerJson.title.Lang2 ||
                           slide.footerJson.title.Lang3 || slide.footerJson.title.Lang4;
        if (footerTitle) titleFooterChars += footerTitle.length;
      }
      if (slide.footerJson.text) {
        const footerText = slide.footerJson.text.Lang1 || slide.footerJson.text.Lang2 ||
                          slide.footerJson.text.Lang3 || slide.footerJson.text.Lang4;
        if (footerText) titleFooterChars += footerText.length;
      }
    }

    return computeFontScaleFactor({
      def,
      enabledLanguages,
      processedBlock,
      titleFooterChars,
      hasTitle: !!(slide.titleJson && def.title.show),
      hasFooter: !!slide.footerJson,
    });
  }, [slide, enabledLanguages, variables, def, processedBlock, metaContext]);

  const renderLanguageContent = (
    langSlot: LangSlot,
    langDef: TemplateDefinition['languages'][0]
  ) => {
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
          overflow: 'hidden',
        }}
      >
        {text}
      </div>
    );
  };

  const renderTitle = () => {
    if (!slide.titleJson || !def.title.show) return null;

    const processedTitle = placeholderService.replaceInTitle(slide.titleJson, variables, metaContext);

    const titleLang1 = processedTitle.Lang1;
    const titleLang4 = processedTitle.Lang4;

    let displayTitle = titleLang1 || processedTitle.Lang2 || processedTitle.Lang3 || '';
    if (titleLang4 && titleLang1) {
      displayTitle = `${titleLang1} ${titleLang4}`;
    }

    if (!displayTitle) return null;

    const titleFontSize = def.title.fontSize * scale;

    return (
      <div
        style={{
          fontSize: `${titleFontSize}px`,
          color: def.title.color,
          textAlign: def.title.alignment,
          marginBottom: `${24 * scale}px`,
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

    const processedFooterTitle = footerTitle
      ? placeholderService.replaceInTitle(footerTitle, variables, metaContext)
      : null;
    const processedFooterText = footerText
      ? placeholderService.replaceInBlock(footerText, variables, metaContext)
      : null;

    const hasContent = processedFooterTitle || processedFooterText;
    if (!hasContent) return null;

    const footerFontSize = def.title.fontSize * scale;
    const separator = ' • ';

    const footerParts: React.ReactNode[] = [];
    for (const langDef of enabledLanguages) {
      const titlePart = processedFooterTitle?.[langDef.slot];
      const textPart = processedFooterText?.[langDef.slot];

      if (titlePart || textPart) {
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
          marginTop: `${8 * scale}px`,
          fontSize: `${footerFontSize}px`,
          textAlign: 'left',
        }}
      >
        {footerParts}
      </div>
    );
  };

  const titleContent = renderTitle();
  const footerContent = renderFooter();

  const renderLayoutContent = () => {
    const hasChrome = !!titleContent || !!footerContent;
    const justify = hasChrome
      ? 'flex-start'
      : VERTICAL_ALIGN_TO_JUSTIFY[def.layout.verticalAlign ?? 'center'];

    const gap = Math.max(def.layout.gap * scale, 16 * scale);

    if (def.layout.columns > 1) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: `${gap}px`, overflow: 'hidden' }}>
          {def.layout.rows > 1 && enabledLanguages[0] && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: justify, overflow: 'hidden' }}>
              {renderLanguageContent(enabledLanguages[0].slot, enabledLanguages[0])}
            </div>
          )}
          <div
            style={{
              display: 'flex',
              flex: 1,
              gap: `${gap}px`,
              overflow: 'hidden',
            }}
          >
            {(def.layout.rows > 1 ? enabledLanguages.slice(1) : enabledLanguages)
              .filter(langDef => !!processedBlock[langDef.slot])
              .map((langDef) => (
              <div key={langDef.slot} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: justify, overflow: 'hidden' }}>
                {renderLanguageContent(langDef.slot, langDef)}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          justifyContent: justify,
          gap: `${gap}px`,
          overflow: 'hidden',
        }}
      >
        {enabledLanguages.map((langDef) =>
          renderLanguageContent(langDef.slot, langDef)
        )}
      </div>
    );
  };

  const paddingTop = titleContent ? def.margins.top * scale : def.margins.top * scale * 0.4;
  const paddingBottom = footerContent ? def.margins.bottom * scale : def.margins.bottom * scale * 0.4;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: def.background.color,
        padding: `${paddingTop}px ${def.margins.right * scale}px ${paddingBottom}px ${def.margins.left * scale}px`,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {titleContent}

      {renderLayoutContent()}

      {footerContent}
    </div>
  );
});
