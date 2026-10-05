import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { OrderedLanguage } from '@kidase/shared';
import { WebSlideRenderer } from '../components/WebSlideRenderer';
import type { RenderPayload } from '../api/client';
import { buildPptx, Progress } from './pptx';

export type { Progress };
type RSlide = RenderPayload['slides'][number];

const DESIGN_W = 1920;
const DESIGN_H = 1080;

/** Render one resolved slide through WebSlideRenderer off-screen and rasterize it. */
async function slideToCanvas(payload: RenderPayload, slide: RSlide, languages: OrderedLanguage[], scale: number): Promise<HTMLCanvasElement | null> {
  const def = payload.templates[slide.templateId];
  if (!def) return null;
  const host = document.createElement('div');
  Object.assign(host.style, { position: 'fixed', left: '-99999px', top: '0', width: `${DESIGN_W}px`, height: `${DESIGN_H}px`, overflow: 'hidden' });
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    flushSync(() => root.render(
      <WebSlideRenderer definition={def} languages={languages} block={slide.block} title={slide.title} footer={slide.footer} />,
    ));
    try { await (document as Document & { fonts?: FontFaceSet }).fonts?.ready; } catch { /* ignore */ }
    await new Promise(r => setTimeout(r, 30));
    return await html2canvas(host, { width: DESIGN_W, height: DESIGN_H, scale, backgroundColor: def.background?.color || '#000000', useCORS: true, allowTaint: true, logging: false });
  } finally {
    root.unmount();
    document.body.removeChild(host);
  }
}

export async function exportPdf(payload: RenderPayload, languages: OrderedLanguage[], filename: string, onProgress?: Progress): Promise<void> {
  const pageW = 1280, pageH = 720;
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [pageW, pageH] });
  let first = true;
  for (let i = 0; i < payload.slides.length; i++) {
    onProgress?.(i + 1, payload.slides.length);
    const canvas = await slideToCanvas(payload, payload.slides[i], languages, 1);
    if (!canvas) continue;
    if (!first) pdf.addPage([pageW, pageH], 'landscape');
    first = false;
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.85), 'JPEG', 0, 0, pageW, pageH);
    canvas.width = 0; canvas.height = 0;
  }
  pdf.save(filename);
}

export async function exportPptx(payload: RenderPayload, languages: OrderedLanguage[], filename: string, onProgress?: Progress): Promise<void> {
  const pptx = buildPptx(payload, languages, onProgress);
  await pptx.writeFile({ fileName: filename });
}
