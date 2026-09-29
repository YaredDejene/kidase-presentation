/** Layout measurements of one rendered SlideView, taken from the DOM. */
export interface SlideMetrics {
  /** Font multiplier chosen by the fit. */
  fit: number;
  /** Content height as a share of the content area (above 1 = overflow). */
  fill: number;
  /** Content or slide runs past its area. */
  overflows: boolean;
  /** Smallest body text size, in px. */
  minFontPx: number;
  /** Widest space between words in justified text, in font sizes. */
  maxWordGapEm: number;
  /** Lines the footer takes (0 = no footer). */
  footerLines: number;
}

/** Measure a rendered SlideView root (the element holding `--fit`). */
export function measureSlide(root: HTMLElement): SlideMetrics | null {
  const box = root.querySelector<HTMLElement>('[data-fit-box]');
  const texts = Array.from(root.querySelectorAll<HTMLElement>('[data-slide-text]'));
  if (!box || texts.length === 0) return null;

  const gap = parseFloat(getComputedStyle(box).rowGap) || 0;
  const rows = Array.from(box.children) as HTMLElement[];
  const needed = rows.reduce((h, row) => h + row.offsetHeight, 0) + gap * Math.max(0, rows.length - 1);

  let minFontPx = Infinity;
  let maxWordGapEm = 0;
  const range = document.createRange();
  for (const el of texts) {
    const fontPx = parseFloat(getComputedStyle(el).fontSize);
    minFontPx = Math.min(minFontPx, fontPx);
    const node = el.firstChild;
    if (el.style.textAlign !== 'justify' || !node || node.nodeType !== Node.TEXT_NODE) continue;
    const text = node.textContent ?? '';
    for (let i = text.indexOf(' '); i > 0; i = text.indexOf(' ', i + 1)) {
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      maxWordGapEm = Math.max(maxWordGapEm, range.getBoundingClientRect().width / fontPx);
    }
  }

  const footer = box.nextElementSibling as HTMLElement | null;
  let footerLines = 0;
  if (footer) {
    range.selectNodeContents(footer);
    const lineTops = new Set(Array.from(range.getClientRects(), r => Math.round(r.top / 8)));
    footerLines = lineTops.size;
  }

  return {
    fit: parseFloat(root.style.getPropertyValue('--fit')) || 1,
    fill: needed / box.clientHeight,
    overflows: needed > box.clientHeight + 1 || root.scrollHeight > root.clientHeight + 1,
    minFontPx,
    maxWordGapEm,
    footerLines,
  };
}

/** Limits a slide must stay within; returns what it breaks, empty when fine. */
export function checkSlide(m: SlideMetrics): string[] {
  const problems: string[] = [];
  if (m.overflows) problems.push(`overflows (fill ${(m.fill * 100).toFixed(0)}%)`);
  if (m.fit < 0.2 || m.fit > 2.001) problems.push(`font multiplier ${m.fit.toFixed(2)} outside 0.2 to 2`);
  if (m.minFontPx < 30) problems.push(`text is ${m.minFontPx.toFixed(0)}px, under 30px`);
  if (m.maxWordGapEm > 2) problems.push(`word gap ${m.maxWordGapEm.toFixed(2)}em, over 2em`);
  if (m.footerLines > 1) problems.push(`footer wraps to ${m.footerLines} lines`);
  return problems;
}
