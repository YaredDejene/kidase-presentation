import React, { useMemo } from 'react';
import '@fontsource-variable/noto-serif-ethiopic';
import type { TemplateDefinition } from '../domain/entities/Template';
import type { SlideBlock, SlideTitle } from '../domain/entities/Slide';
import { computeFontScaleFactor, EnabledLanguage } from './fontScale';

/** Bundled with both apps so text wraps identically on every platform. */
export const SLIDE_FONT = "'Noto Serif Ethiopic Variable'";
/** Templates name fonts that may not be installed (e.g. Nyala); the bundled font goes first. */
const withSlideFont = (family: string) => `${SLIDE_FONT}, ${family}`;

const VERTICAL_ALIGN_TO_JUSTIFY = { top: 'flex-start', center: 'center', bottom: 'flex-end' } as const;

export interface SlideViewFooter {
  title?: SlideTitle | null;
  text?: SlideBlock | null;
}

export interface SlideViewProps {
  definition: TemplateDefinition;
  /** Languages to show, in display order. */
  enabledLanguages: EnabledLanguage[];
  /** Placeholder-resolved content. */
  block: SlideBlock;
  title?: SlideTitle | null;
  footer?: SlideViewFooter | null;
  /** Container size relative to the 1920x1080 design size. */
  scale?: number;
}

/**
 * The one slide layout shared by desktop and web. Imported by subpath
 * (`@kidase/shared/render/SlideView`), not from the package index, so the
 * API never loads React.
 */
export const SlideView: React.FC<SlideViewProps> = React.memo(({
  definition: def,
  enabledLanguages,
  block,
  title,
  footer,
  scale = 1,
}) => {
  const fontScaleFactor = useMemo(() => {
    const firstText = (t?: SlideTitle | SlideBlock | null) =>
      (t && (t.Lang1 || t.Lang2 || t.Lang3 || t.Lang4)) || '';
    const titleFooterChars =
      firstText(title).length + firstText(footer?.title).length + firstText(footer?.text).length;

    return computeFontScaleFactor({
      def,
      enabledLanguages,
      processedBlock: block,
      titleFooterChars,
      hasTitle: !!(title && def.title.show),
      hasFooter: !!footer,
    });
  }, [def, enabledLanguages, block, title, footer]);

  const renderLanguageContent = (langDef: EnabledLanguage) => {
    const text = block[langDef.slot];
    if (!text) return null;

    return (
      <div
        key={langDef.slot}
        style={{
          fontSize: `${langDef.fontSize * fontScaleFactor * scale}px`,
          fontFamily: withSlideFont(langDef.fontFamily),
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
    if (!title || !def.title.show) return null;

    let displayTitle = title.Lang1 || title.Lang2 || title.Lang3 || '';
    if (title.Lang4 && title.Lang1) {
      displayTitle = `${title.Lang1} ${title.Lang4}`;
    }
    if (!displayTitle) return null;

    return (
      <div
        style={{
          fontSize: `${def.title.fontSize * scale}px`,
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
    if (!footer) return null;
    const { title: footerTitle, text: footerText } = footer;
    if (!footerTitle && !footerText) return null;

    const footerParts: React.ReactNode[] = [];
    for (const langDef of enabledLanguages) {
      const titlePart = footerTitle?.[langDef.slot];
      const textPart = footerText?.[langDef.slot];

      if (titlePart || textPart) {
        if (footerParts.length > 0) {
          footerParts.push(
            <span key={`sep-${langDef.slot}`} style={{ color: '#888888' }}>
              {' • '}
            </span>
          );
        }

        footerParts.push(
          <span
            key={`footer-${langDef.slot}`}
            style={{ fontFamily: withSlideFont(langDef.fontFamily), color: langDef.color }}
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
          fontSize: `${def.title.fontSize * scale}px`,
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
              {renderLanguageContent(enabledLanguages[0])}
            </div>
          )}
          <div style={{ display: 'flex', flex: 1, gap: `${gap}px`, overflow: 'hidden' }}>
            {(def.layout.rows > 1 ? enabledLanguages.slice(1) : enabledLanguages)
              .filter(langDef => !!block[langDef.slot])
              .map(langDef => (
                <div key={langDef.slot} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: justify, overflow: 'hidden' }}>
                  {renderLanguageContent(langDef)}
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
        {enabledLanguages.map(langDef => renderLanguageContent(langDef))}
      </div>
    );
  };

  const paddingTop = (titleContent ? def.margins.top : def.margins.top * 0.4) * scale;
  const paddingBottom = (footerContent ? def.margins.bottom : def.margins.bottom * 0.4) * scale;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: def.background.color,
        fontFamily: withSlideFont('serif'), // title and footer
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
