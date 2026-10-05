import React, { useLayoutEffect, useMemo, useRef } from 'react';
import '@fontsource-variable/noto-serif-ethiopic';
import type { TemplateDefinition } from '../domain/entities/Template';
import type { SlideBlock, SlideTitle } from '../domain/entities/Slide';
import { firstText } from '../domain/entities/Presentation';
import { computeFontScaleFactor, EnabledLanguage } from './fontScale';
import { wordGapEm } from './layoutMetrics';

/** Bundled with both apps so text wraps identically on every platform. */
export const SLIDE_FONT = "'Noto Serif Ethiopic Variable'";
/** Templates name fonts that may not be installed (e.g. Nyala); the bundled font goes first. */
const withSlideFont = (family: string) => `${SLIDE_FONT}, ${family}`;

/** Justifying fewer or shorter lines than this stretches a handful of words across the slide. */
const MIN_JUSTIFIED_LINES = 3;
const MIN_JUSTIFIED_CHARS_PER_LINE = 30;
/** Justified text whose long words stretch a space wider than this falls back to left. */
const MAX_WORD_GAP_EM = 2;

/** Share of the content area the text may fill; the rest is breathing room. */
const FILL = 0.94;
/**
 * Preferred range of the font multiplier, relative to the template's sizes.
 * Keeps sizes steady from slide to slide; short slides get empty space
 * instead of giant text.
 */
const MIN_FIT = 0.6;
const MAX_FIT = 2;
/** Slides are never split, so text too long for MIN_FIT may shrink down to this. */
const FLOOR_FIT = 0.2;
/** Footer size relative to the template's title size. */
const FOOTER_RATIO = 0.6;
const clampFit = (v: number) => Math.min(MAX_FIT, Math.max(MIN_FIT, v));

/**
 * One decision per slide, so every language looks the same: when all blocks
 * are long they keep the template alignment; if any is short (few lines, or
 * narrow columns), or justifying stretches a word gap too far, they all drop
 * justify for left and balance their lines so no word sits alone. Neither
 * change alters the line count.
 */
function alignTexts(root: HTMLElement): void {
  const texts = Array.from(root.querySelectorAll<HTMLElement>('[data-slide-text]'));
  const allLong = texts.every(el => {
    const lineHeightPx = parseFloat(getComputedStyle(el).lineHeight);
    const lines = Math.max(1, Math.round(el.offsetHeight / lineHeightPx));
    return lines >= MIN_JUSTIFIED_LINES
      && (el.textContent ?? '').length / lines >= MIN_JUSTIFIED_CHARS_PER_LINE;
  });
  const justified = texts.filter(el => el.dataset.slideText === 'justify');
  const apply = (justify: boolean) => {
    for (const el of texts) el.style.setProperty('text-wrap-style', justify ? 'pretty' : 'balance');
    for (const el of justified) el.style.textAlign = justify ? 'justify' : 'left';
  };
  apply(allLong);
  if (allLong && justified.some(el => wordGapEm(el) > MAX_WORD_GAP_EM)) apply(false);
}

/**
 * Size the text by measuring it: adjust the `--fit` font multiplier until the
 * rendered content fills the content area. Height grows roughly with the
 * square of the font size (taller lines and fewer characters per line), hence
 * the square-root step.
 */
function fitSlide(root: HTMLElement): void {
  const box = root.querySelector<HTMLElement>('[data-fit-box]');
  if (!box || box.clientHeight === 0) return;

  const gap = parseFloat(getComputedStyle(box).rowGap) || 0;
  const rows = Array.from(box.children) as HTMLElement[];
  const needed = () =>
    rows.reduce((h, row) => h + row.offsetHeight, 0) + gap * Math.max(0, rows.length - 1);

  let fit = 1;
  const setFit = (v: number) => {
    fit = v;
    root.style.setProperty('--fit', String(fit));
  };
  setFit(clampFit(parseFloat(root.style.getPropertyValue('--fit')) || 1));

  for (let i = 0; i < 6; i++) {
    const height = needed();
    if (height === 0) return;
    // The footer scales with --fit, so the box height moves too.
    const ratio = height / (box.clientHeight * FILL);
    if (ratio <= 1 && ratio >= 0.93) break;
    const next = clampFit(fit / Math.sqrt(ratio));
    if (Math.abs(next - fit) < 0.005) break;
    setFit(next);
  }

  alignTexts(root);

  // Never overflow: step down until it fits.
  for (let i = 0; i < 40 && fit > FLOOR_FIT && needed() > box.clientHeight; i++) {
    setFit(fit * 0.96);
  }
}

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
    const chars = (t?: SlideTitle | SlideBlock | null) => (firstText(t) || '').length;
    const titleFooterChars = chars(title) + chars(footer?.title) + chars(footer?.text);

    return computeFontScaleFactor({
      def,
      enabledLanguages,
      processedBlock: block,
      titleFooterChars,
      hasTitle: !!(title && def.title.show),
      hasFooter: !!footer,
    });
  }, [def, enabledLanguages, block, title, footer]);

  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    fitSlide(root);
    // The bundled font may arrive after first paint and change the wrapping.
    let cancelled = false;
    document.fonts?.ready.then(() => { if (!cancelled) fitSlide(root); });
    return () => { cancelled = true; };
  });

  const renderLanguageContent = (langDef: EnabledLanguage) => {
    const text = block[langDef.slot];
    if (!text) return null;

    return (
      <div
        key={langDef.slot}
        data-slide-text={langDef.alignment}
        style={{
          fontSize: `calc(var(--fit) * ${langDef.fontSize * scale}px)`,
          fontFamily: withSlideFont(langDef.fontFamily),
          color: langDef.color,
          textAlign: langDef.alignment,
          lineHeight: langDef.lineHeight,
          whiteSpace: 'pre-wrap',
          flexShrink: 0,
          wordBreak: 'break-word',
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
          // A small caption; shrinks further with dense text, never grows.
          fontSize: `calc(min(var(--fit), 1) * ${def.title.fontSize * FOOTER_RATIO * scale}px)`,
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
    const justify = VERTICAL_ALIGN_TO_JUSTIFY[def.layout.verticalAlign ?? 'center'];

    const gap = Math.max(def.layout.gap * scale, 16 * scale);

    const boxStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      minHeight: 0,
      justifyContent: justify,
      gap: `${gap}px`,
      overflow: 'hidden',
    };

    if (def.layout.columns > 1) {
      return (
        <div data-fit-box style={boxStyle}>
          {def.layout.rows > 1 && enabledLanguages[0] && renderLanguageContent(enabledLanguages[0])}
          <div style={{ display: 'flex', alignItems: 'flex-start', flexShrink: 0, gap: `${gap}px` }}>
            {(def.layout.rows > 1 ? enabledLanguages.slice(1) : enabledLanguages)
              .filter(langDef => !!block[langDef.slot])
              .map(langDef => (
                <div key={langDef.slot} style={{ flex: 1, minWidth: 0 }}>
                  {renderLanguageContent(langDef)}
                </div>
              ))}
          </div>
        </div>
      );
    }

    return (
      <div data-fit-box style={boxStyle}>
        {enabledLanguages.map(langDef => renderLanguageContent(langDef))}
      </div>
    );
  };

  const paddingTop = (titleContent ? def.margins.top : def.margins.top * 0.4) * scale;
  const paddingBottom = (footerContent ? def.margins.bottom : def.margins.bottom * 0.4) * scale;

  return (
    <div
      ref={rootRef}
      style={{
        // Starting guess from the character-count heuristic; fitSlide refines it by measuring.
        ['--fit' as string]: fontScaleFactor,
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
