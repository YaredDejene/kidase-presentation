import PptxGenJS from 'pptxgenjs';
import type { LangSlot, TemplateDefinition, EnabledLanguage } from '@kidase/shared';

// Interop-safe constructor (CJS default may be double-wrapped under Node ESM).
const Pptx = ((PptxGenJS as unknown as { default?: typeof PptxGenJS }).default ?? PptxGenJS) as typeof PptxGenJS;
import { computeFontScaleFactor } from '@kidase/shared';
import type { RenderPayload } from '../api/client';

type RSlide = RenderPayload['slides'][number];
export type Progress = (current: number, total: number) => void;

const DESIGN_W = 1920;
const pxToInch = (px: number) => (px / DESIGN_W) * 13.333;
const pxToPoints = (px: number) => px * 0.75;
const hex6 = (c: string) => c.replace(/^#/, '');
const cleanFont = (f: string) => f.split(',')[0].trim().replace(/['"]/g, '');
const mapAlign = (a: string): 'left' | 'center' | 'right' => (a === 'center' || a === 'right' ? a : 'left');

type LangText = { Lang1?: string; Lang2?: string; Lang3?: string; Lang4?: string };
const firstText = (o: LangText | null | undefined) => (o ? (o.Lang1 || o.Lang2 || o.Lang3 || o.Lang4) : undefined);

function enabledLangsFor(def: TemplateDefinition, slots: LangSlot[]): EnabledLanguage[] {
  return slots.map(s => def.languages.find(l => l.slot === s)).filter((l): l is EnabledLanguage => !!l);
}

/** Ported from the desktop PptxExportService, fed with already-resolved slide data. */
function addPptxSlide(pptx: PptxGenJS, slide: RSlide, def: TemplateDefinition | undefined, slots: LangSlot[]): void {
  if (!def) return;
  const enabled = enabledLangsFor(def, slots);

  let titleFooterChars = 0;
  const titleText = firstText(slide.title);
  if (titleText) titleFooterChars += titleText.length;
  if (slide.footer?.title) { const v = firstText(slide.footer.title); if (v) titleFooterChars += v.length; }
  if (slide.footer?.text) { const v = firstText(slide.footer.text); if (v) titleFooterChars += v.length; }
  const fontScale = computeFontScaleFactor({
    def, enabledLanguages: enabled, processedBlock: slide.block, titleFooterChars,
    hasTitle: !!(slide.title && def.title.show), hasFooter: !!slide.footer,
  });

  const ps = pptx.addSlide();
  ps.background = { color: hex6(def.background?.color || '#000000') };

  const marginLeft = pxToInch(def.margins?.left || 0);
  const marginRight = pxToInch(def.margins?.right || 0);
  const marginTop = pxToInch(def.margins?.top || 0);
  const marginBottom = pxToInch(def.margins?.bottom || 0);
  const slideWidth = 13.333, slideHeight = 7.5;
  const contentWidth = slideWidth - marginLeft - marginRight;
  let y = marginTop;

  if (slide.title && def.title.show && titleText) {
    const titleFontSize = pxToPoints(def.title.fontSize) * fontScale;
    const titleHeight = titleFontSize / 72 + 0.1;
    ps.addText(titleText, { x: marginLeft, y, w: contentWidth, h: titleHeight, fontSize: titleFontSize, color: hex6(def.title.color), align: mapAlign(def.title.alignment), bold: true, shrinkText: true, valign: 'top' });
    y += titleHeight + pxToInch(2);
  }

  const footerHeight = slide.footer ? pxToPoints(def.title.fontSize) / 72 + 0.3 : 0;
  const available = slideHeight - y - marginBottom - footerHeight;
  const gap = pxToInch(def.layout.gap);
  const withText = enabled.filter(l => slide.block[l.slot]);
  if (withText.length > 0) {
    const perLang = (available - (withText.length - 1) * gap) / withText.length;
    for (const lang of enabled) {
      const text = slide.block[lang.slot];
      if (!text) continue;
      ps.addText(text, { x: marginLeft, y, w: contentWidth, h: perLang, fontSize: pxToPoints(lang.fontSize) * fontScale, fontFace: cleanFont(lang.fontFamily), color: hex6(lang.color), align: mapAlign(lang.alignment), lineSpacingMultiple: lang.lineHeight, shrinkText: true, valign: 'middle' });
      y += perLang + gap;
    }
  }

  if (slide.footer && (slide.footer.title || slide.footer.text)) {
    const footerFontSize = pxToPoints(def.title.fontSize) * fontScale * 0.6;
    const runs: PptxGenJS.TextProps[] = [];
    let has = false;
    for (const lang of enabled) {
      const titlePart = slide.footer.title?.[lang.slot];
      const textPart = slide.footer.text?.[lang.slot];
      if (!titlePart && !textPart) continue;
      if (has) runs.push({ text: ' • ', options: { fontSize: footerFontSize, color: '888888' } });
      if (titlePart) runs.push({ text: titlePart + (textPart ? ': ' : ''), options: { fontSize: footerFontSize, fontFace: cleanFont(lang.fontFamily), color: hex6(lang.color), bold: true } });
      if (textPart) runs.push({ text: textPart, options: { fontSize: footerFontSize, fontFace: cleanFont(lang.fontFamily), color: hex6(lang.color) } });
      has = true;
    }
    if (runs.length) ps.addText(runs, { x: marginLeft, y: slideHeight - marginBottom - footerHeight + 0.05, w: contentWidth, h: footerHeight, align: 'left', valign: 'bottom', shrinkText: true });
  }
}

/** Build a configured PptxGenJS deck from the resolved render payload (pure; no DOM). */
export function buildPptx(payload: RenderPayload, slots: LangSlot[], onProgress?: Progress): PptxGenJS {
  const pptx = new Pptx();
  pptx.layout = 'LAYOUT_WIDE';
  for (let i = 0; i < payload.slides.length; i++) {
    onProgress?.(i + 1, payload.slides.length);
    addPptxSlide(pptx, payload.slides[i], payload.templates[payload.slides[i].templateId], slots);
  }
  return pptx;
}
