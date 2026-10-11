import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import jsPDF from 'jspdf';
import type { OrderedLanguage } from '@kidase/shared';
import { WebSlideRenderer } from '../components/WebSlideRenderer';
import type { RenderPayload } from '../api/client';
import { buildPptx, Progress } from './pptx';

export type { Progress };
type RSlide = RenderPayload['slides'][number];

const DESIGN_W = 1920;
const DESIGN_H = 1080;
/** Page in points (13.33 x 7.5 in, same as the PPTX). jsPDF's px unit mis-scales fonts, so everything is points. */
const PAGE_W = 960;
const PAGE_H = 540;
/** Design px to page points. */
const K = PAGE_W / DESIGN_W;

const FONT = 'NotoSerifEthiopic';
/** Same face the slides are rendered with, as TrueType for embedding (public/fonts, OFL). */
const FONT_URL = '/fonts/NotoSerifEthiopic.ttf';

/** Mount one resolved slide off-screen at design size; the caller unmounts. */
function mountSlide(payload: RenderPayload, slide: RSlide, languages: OrderedLanguage[], pageLabel: string) {
  const def = payload.templates[slide.templateId];
  if (!def) return null;
  const host = document.createElement('div');
  Object.assign(host.style, { position: 'fixed', left: '-99999px', top: '0', width: `${DESIGN_W}px`, height: `${DESIGN_H}px`, overflow: 'hidden' });
  document.body.appendChild(host);
  const root = createRoot(host);
  flushSync(() => root.render(
    <WebSlideRenderer definition={def} languages={languages} block={slide.block} title={slide.title} footer={slide.footer} pageLabel={pageLabel} />,
  ));
  return { host, def, unmount: () => { root.unmount(); document.body.removeChild(host); } };
}

async function embedFont(pdf: jsPDF): Promise<void> {
  const bytes = new Uint8Array(await (await fetch(FONT_URL)).arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  pdf.addFileToVFS('NotoSerifEthiopic.ttf', btoa(bin));
  pdf.addFont('NotoSerifEthiopic.ttf', FONT, 'normal');
  pdf.setFont(FONT, 'normal');
}

interface Word { text: string; rect: DOMRect; style: CSSStyleDeclaration }

/** Every word of a mounted slide with the box the browser laid it out in; a word broken across lines yields its characters. */
function* words(host: HTMLElement): Generator<Word> {
  const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? '';
    const style = getComputedStyle(node.parentElement!);
    for (const m of text.matchAll(/\S+/g)) {
      const start = m.index!;
      range.setStart(node, start); range.setEnd(node, start + m[0].length);
      const rects = range.getClientRects();
      if (rects.length === 1) { yield { text: m[0], rect: rects[0], style }; continue; }
      for (let i = 0; i < m[0].length; i++) {
        range.setStart(node, start + i); range.setEnd(node, start + i + 1);
        const r = range.getClientRects()[0];
        if (r) yield { text: m[0][i], rect: r, style };
      }
    }
  }
}

/**
 * Draw the slide's text where the browser placed it, word by word, so the PDF
 * keeps the renderer's fit, wrapping and justification without rasterizing.
 */
function drawSlide(pdf: jsPDF, host: HTMLElement, background: string): void {
  pdf.setFillColor(background);
  pdf.rect(0, 0, PAGE_W, PAGE_H, 'F');
  const origin = host.getBoundingClientRect();
  // Where the baseline sits inside the browser's line box, from the font's own metrics.
  const meta = (pdf.getFont() as unknown as { metadata: { ascender: number; decender: number } }).metadata;
  const baseline = meta.ascender / (meta.ascender - meta.decender);
  for (const w of words(host)) {
    const fontPt = parseFloat(w.style.fontSize) * K;
    const [r, g, b] = (w.style.color.match(/[\d.]+/g) ?? ['255', '255', '255']).map(Number);
    const bold = parseInt(w.style.fontWeight, 10) >= 600;
    pdf.setFontSize(fontPt);
    pdf.setTextColor(r, g, b);
    if (bold) { pdf.setDrawColor(r, g, b); pdf.setLineWidth(fontPt * 0.03); }
    const x = (w.rect.left - origin.left) * K;
    const y = (w.rect.top - origin.top + w.rect.height * baseline) * K;
    pdf.text(w.text, x, y, { renderingMode: bold ? 'fillThenStroke' : 'fill' });
  }
}

export async function exportPdf(payload: RenderPayload, languages: OrderedLanguage[], filename: string, onProgress?: Progress): Promise<void> {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: [PAGE_W, PAGE_H] });
  await embedFont(pdf);
  try { await document.fonts?.ready; } catch { /* ignore */ }
  let first = true;
  for (let i = 0; i < payload.slides.length; i++) {
    onProgress?.(i + 1, payload.slides.length);
    const mounted = mountSlide(payload, payload.slides[i], languages, `${i + 1} / ${payload.slides.length}`);
    if (!mounted) continue;
    try {
      if (!first) pdf.addPage([PAGE_W, PAGE_H], 'landscape');
      first = false;
      drawSlide(pdf, mounted.host, mounted.def.background?.color || '#000000');
    } finally {
      mounted.unmount();
    }
    // Let the progress bar paint; a long export otherwise freezes the dialog.
    if (i % 20 === 19) await new Promise(r => setTimeout(r, 0));
  }
  pdf.save(filename);
}

export async function exportPptx(payload: RenderPayload, languages: OrderedLanguage[], filename: string, onProgress?: Progress): Promise<void> {
  const pptx = buildPptx(payload, languages, onProgress);
  await pptx.writeFile({ fileName: filename });
}
