import type { TemplateDefinition } from '../domain/entities/Template';
import { SITE_URL, type TitleSlideInfo } from '../domain/titleSlide';

/** The parts of a pptxgenjs slide this needs; keeps pptxgenjs out of the shared package. */
interface PptxSlide {
  background?: { color?: string };
  addText(text: string, options: Record<string, unknown>): unknown;
}

const W = 13.333;
const hex6 = (c: string) => c.replace(/^#/, '');

/** Writes the title slide (see TitleSlideView) onto a blank 16:9 pptxgenjs slide. */
export function addTitleSlidePptx(ps: PptxSlide, def: TemplateDefinition, info: TitleSlideInfo): void {
  const accent = hex6(def.title.color);
  const body = hex6(def.languages[0]?.color ?? '#ffffff');
  const fontFace = (def.languages[0]?.fontFamily ?? 'Noto Serif Ethiopic').split(',')[0].trim().replace(/['"]/g, '');
  ps.background = { color: hex6(def.background.color) };

  let y = 0.35;
  const line = (text: string, h: number, fontSize: number, opts: Record<string, unknown> = {}) => {
    ps.addText(text, { x: 0.8, y, w: W - 1.6, h, fontSize, fontFace, color: body, align: 'center', valign: 'middle', margin: 0, shrinkText: true, ...opts });
    y += h;
  };

  const tags = [info.dayType, ...info.tags].filter(Boolean).join('  ·  ');
  if (tags) line(tags, 0.4, 14, { color: accent });
  line(info.liturgy, 0.85, 40, { bold: true, color: accent });
  if (info.anaphora) line(info.anaphora, 0.6, 26);
  line(`${info.ethDate}   ·   ${info.gregorian}`, 0.45, 16, { transparency: 30 });
  y += 0.3;
  // Labels end and references start at the slide's center, like the viewer.
  for (const r of info.readings) {
    const link = r.slide !== undefined ? { hyperlink: { slide: r.slide + 1 } } : {};
    ps.addText(r.label, { x: 0.8, y, w: W / 2 - 1.05, h: 0.5, fontSize: 17, fontFace, color: accent, align: 'right', valign: 'middle', margin: 0, ...link });
    ps.addText(r.value, { x: W / 2 + 0.25, y, w: W / 2 - 1.05, h: 0.5, fontSize: 17, fontFace, color: body, align: 'left', valign: 'middle', margin: 0, shrinkText: true, ...link });
    y += 0.5;
  }
  y += 0.3;
  // The first of name / additional info is the heading; the other sits under it.
  const heading = info.name ?? info.note;
  if (heading) line(heading, 0.5, 20, { bold: true, color: accent });
  if (info.name && info.note) line(info.note, 0.4, 14, { transparency: 30 });
  ps.addText(SITE_URL.replace(/^https?:\/\//, ''), { x: 0.28, y: 7.05, w: 2.5, h: 0.35, fontSize: 12, fontFace, color: body, transparency: 30, valign: 'bottom', margin: 0, hyperlink: { url: SITE_URL } });
}
