import React, { useMemo } from 'react';
import type { TemplateDefinition, SlideBlock, SlideTitle, LangSlot, EnabledLanguage } from '@kidase/shared';
import { computeFontScaleFactor } from '@kidase/shared';

const VERTICAL_ALIGN_TO_JUSTIFY = { top: 'flex-start', center: 'center', bottom: 'flex-end' } as const;

export interface ResolvedFooter {
  title: SlideTitle | null;
  text: SlideBlock | null;
}

interface WebSlideRendererProps {
  definition: TemplateDefinition;
  /** Active language slots, in display order (from the render payload). */
  activeSlots: LangSlot[];
  block: SlideBlock;
  title: SlideTitle | null;
  footer: ResolvedFooter | null;
}

/**
 * Thin renderer for the public viewer. Consumes the already-resolved render
 * payload (no engine/placeholder logic) and computes the font scale locally via
 * the shared `computeFontScaleFactor` so language toggles re-fit instantly.
 * Renders at the fixed 1920x1080 design stage; the parent scales it to fit.
 */
export const WebSlideRenderer: React.FC<WebSlideRendererProps> = React.memo(({
  definition: def,
  activeSlots,
  block,
  title,
  footer,
}) => {
  const enabledLanguages = useMemo<EnabledLanguage[]>(() => {
    return activeSlots
      .map(slot => def.languages.find(l => l.slot === slot))
      .filter((l): l is EnabledLanguage => !!l);
  }, [def.languages, activeSlots]);

  const fontScaleFactor = useMemo(() => {
    let titleFooterChars = 0;
    if (title) {
      const t = title.Lang1 || title.Lang2 || title.Lang3 || title.Lang4;
      if (t) titleFooterChars += t.length;
    }
    if (footer?.title) {
      const ft = footer.title.Lang1 || footer.title.Lang2 || footer.title.Lang3 || footer.title.Lang4;
      if (ft) titleFooterChars += ft.length;
    }
    if (footer?.text) {
      const fx = footer.text.Lang1 || footer.text.Lang2 || footer.text.Lang3 || footer.text.Lang4;
      if (fx) titleFooterChars += fx.length;
    }
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
          fontSize: `${langDef.fontSize * fontScaleFactor}px`,
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
    if (!title || !def.title.show) return null;
    const lang1 = title.Lang1;
    const lang4 = title.Lang4;
    let displayTitle = lang1 || title.Lang2 || title.Lang3 || '';
    if (lang4 && lang1) displayTitle = `${lang1} ${lang4}`;
    if (!displayTitle) return null;
    return (
      <div style={{ fontSize: `${def.title.fontSize}px`, color: def.title.color, textAlign: def.title.alignment, marginBottom: '24px', fontWeight: 'bold' }}>
        {displayTitle}
      </div>
    );
  };

  const renderFooter = () => {
    if (!footer) return null;
    const fTitle = footer.title;
    const fText = footer.text;
    if (!fTitle && !fText) return null;
    const separator = ' • ';
    const parts: React.ReactNode[] = [];
    for (const langDef of enabledLanguages) {
      const titlePart = fTitle?.[langDef.slot];
      const textPart = fText?.[langDef.slot];
      if (titlePart || textPart) {
        if (parts.length > 0) {
          parts.push(<span key={`sep-${langDef.slot}`} style={{ color: '#888888' }}>{separator}</span>);
        }
        parts.push(
          <span key={`footer-${langDef.slot}`} style={{ fontFamily: langDef.fontFamily, color: langDef.color }}>
            {titlePart && <span style={{ fontWeight: 'bold' }}>{titlePart}{textPart && ': '}</span>}
            {textPart && <span>{textPart}</span>}
          </span>,
        );
      }
    }
    if (parts.length === 0) return null;
    return <div style={{ marginTop: '8px', fontSize: `${def.title.fontSize}px`, textAlign: 'left' }}>{parts}</div>;
  };

  const titleContent = renderTitle();
  const footerContent = renderFooter();

  const renderLayoutContent = () => {
    const hasChrome = !!titleContent || !!footerContent;
    const justify = hasChrome ? 'flex-start' : VERTICAL_ALIGN_TO_JUSTIFY[def.layout.verticalAlign ?? 'center'];
    const gap = Math.max(def.layout.gap, 16);

    if (def.layout.columns > 1) {
      const columnLangs = def.layout.rows > 1 ? enabledLanguages.slice(1) : enabledLanguages;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: `${gap}px`, overflow: 'hidden' }}>
          {def.layout.rows > 1 && enabledLanguages[0] && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: justify, overflow: 'hidden' }}>
              {renderLanguageContent(enabledLanguages[0])}
            </div>
          )}
          <div style={{ display: 'flex', flex: 1, gap: `${gap}px`, overflow: 'hidden' }}>
            {columnLangs.filter(l => !!block[l.slot]).map(langDef => (
              <div key={langDef.slot} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: justify, overflow: 'hidden' }}>
                {renderLanguageContent(langDef)}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: justify, gap: `${gap}px`, overflow: 'hidden' }}>
        {enabledLanguages.map(langDef => renderLanguageContent(langDef))}
      </div>
    );
  };

  const paddingTop = titleContent ? def.margins.top : def.margins.top * 0.4;
  const paddingBottom = footerContent ? def.margins.bottom : def.margins.bottom * 0.4;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: def.background.color,
        padding: `${paddingTop}px ${def.margins.right}px ${paddingBottom}px ${def.margins.left}px`,
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
