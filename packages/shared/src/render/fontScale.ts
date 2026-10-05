import { TemplateDefinition, type EnabledLanguage } from '../domain/entities/Template';
import { SlideBlock } from '../domain/entities/Slide';
import { computeFontScale } from '../domain/formatting';

export const DESIGN_WIDTH = 1920;
export const DESIGN_HEIGHT = 1080;
export const AVG_CHAR_WIDTH_RATIO = 0.70;

/** Count wrapped lines respecting explicit \n newlines in text */
export function countLines(text: string, charsPerLine: number): number {
  let lines = 0;
  for (const seg of text.split('\n')) {
    lines += seg.length === 0 ? 1 : Math.ceil(seg.length / charsPerLine);
  }
  return lines;
}

/** Binary-search scale to fit estimated height within available height */
export function fitScaleToHeight(
  baseScale: number,
  availableHeight: number,
  estimateHeight: (s: number) => number,
): number {
  const baseHeight = estimateHeight(baseScale);
  if (baseHeight <= 0 || availableHeight <= 0) return baseScale;

  const fillRatio = baseHeight / availableHeight;

  // Always fit to ~83% of available height via binary search
  const lo_bound = fillRatio > 1 ? baseScale * 0.3 : baseScale;
  const hi_bound = fillRatio < 1 ? baseScale * 2.0 : baseScale;
  let lo = lo_bound, hi = hi_bound;
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    if (estimateHeight(mid) > availableHeight * 0.85) hi = mid;
    else lo = mid;
  }
  return lo;
}

export interface FontScaleParams {
  def: TemplateDefinition;
  /** Languages to render, in display order (template language defs). */
  enabledLanguages: EnabledLanguage[];
  /** Block already resolved through the placeholder service. */
  processedBlock: SlideBlock;
  /** Combined character count of any title + footer text. */
  titleFooterChars: number;
  /** Whether a title will be shown (slide.titleJson && def.title.show). */
  hasTitle: boolean;
  /** Whether a footer will be shown (!!slide.footerJson). */
  hasFooter: boolean;
}

/**
 * Pure heuristic font-scale computation extracted from SlideRenderer.
 * Given the resolved block, enabled languages and template definition,
 * returns the dynamic font scale factor. No DOM measurement involved.
 */
export function computeFontScaleFactor({
  def,
  enabledLanguages,
  processedBlock,
  titleFooterChars,
  hasTitle,
  hasFooter,
}: FontScaleParams): number {
  const isMultiCol = def.layout.columns > 1;
  const columnLangs = isMultiCol && def.layout.rows > 1
    ? enabledLanguages.slice(1) : enabledLanguages;
  const columnLangsWithText = columnLangs.filter(l => (processedBlock[l.slot] || '').length > 0);

  let contentChars: number;
  if (isMultiCol) {
    contentChars = Math.max(...columnLangsWithText.map(l => (processedBlock[l.slot] || '').length), 0);
  } else {
    contentChars = 0;
    for (const langDef of enabledLanguages) {
      const text = processedBlock[langDef.slot];
      if (text) contentChars += text.length;
    }
  }

  const baseScale = computeFontScale(contentChars + titleFooterChars);

  const availableWidth = DESIGN_WIDTH - def.margins.left - def.margins.right;
  const titleReserve = hasTitle ? def.title.fontSize + 24 : 0;
  const footerReserve = hasFooter ? def.title.fontSize + 10 : 0;
  const availableHeight = DESIGN_HEIGHT - def.margins.top - def.margins.bottom
    - titleReserve - footerReserve;

  const gap = Math.max(def.layout.gap, 16);

  if (isMultiCol) {
    const numCols = columnLangsWithText.length || 1;
    const columnWidth = (availableWidth - gap * (numCols - 1)) / numCols;

    const estimateMultiColHeight = (s: number) => {
      let h = 0;
      if (def.layout.rows > 1 && enabledLanguages[0]) {
        const text = processedBlock[enabledLanguages[0].slot];
        if (text) {
          const fontSize = enabledLanguages[0].fontSize * s;
          const charsPerLine = Math.max(1, Math.floor(availableWidth / (fontSize * AVG_CHAR_WIDTH_RATIO)));
          const lines = countLines(text, charsPerLine);
          h += lines * fontSize * enabledLanguages[0].lineHeight + gap;
        }
      }
      let maxColH = 0;
      for (const langDef of columnLangs) {
        const text = processedBlock[langDef.slot];
        if (!text) continue;
        const fontSize = langDef.fontSize * s;
        const charsPerLine = Math.max(1, Math.floor(columnWidth / (fontSize * AVG_CHAR_WIDTH_RATIO)));
        const lines = countLines(text, charsPerLine);
        maxColH = Math.max(maxColH, lines * fontSize * langDef.lineHeight);
      }
      h += maxColH;
      return h;
    };

    return fitScaleToHeight(baseScale, availableHeight, estimateMultiColHeight);
  }

  // Single-column
  const estimateHeight = (s: number) => {
    let h = 0;
    let count = 0;
    for (const langDef of enabledLanguages) {
      const text = processedBlock[langDef.slot];
      if (!text) continue;
      const fontSize = langDef.fontSize * s;
      const charsPerLine = Math.max(1, Math.floor(availableWidth / (fontSize * AVG_CHAR_WIDTH_RATIO)));
      const lines = countLines(text, charsPerLine);
      h += lines * fontSize * langDef.lineHeight;
      count++;
    }
    if (count > 1) h += (count - 1) * gap;
    return h;
  };

  return fitScaleToHeight(baseScale, availableHeight, estimateHeight);
}
