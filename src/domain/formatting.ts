import { monthNames, toEC } from 'kenat';

/** Format an ISO date string as a short localized date (e.g., "Feb 15, 2026"). */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Dynamic font scale factor based on total content character count.
 * Shared between SlideRenderer (live preview) and export services (PDF/PPTX).
 */
const FONT_SCALE_POINTS: [number, number][] = [
  [0, 2.2], [80, 2.2], [120, 2.0], [160, 1.85], [200, 1.7],
  [260, 1.55], [320, 1.4], [400, 1.28], [480, 1.16], [560, 1.06],
  [650, 0.97], [750, 0.88], [870, 0.8], [1000, 0.73], [1200, 0.65],
  [1400, 0.58],
];

export function computeFontScale(totalChars: number): number {
  if (totalChars <= 0) return 2.2;
  if (totalChars >= 1400) return 0.5;

  for (let i = 1; i < FONT_SCALE_POINTS.length; i++) {
    if (totalChars <= FONT_SCALE_POINTS[i][0]) {
      const [x0, y0] = FONT_SCALE_POINTS[i - 1];
      const [x1, y1] = FONT_SCALE_POINTS[i];
      const t = (totalChars - x0) / (x1 - x0);
      return y0 + t * (y1 - y0);
    }
  }

  return 0.5;
}

/**
 * Format a Gregorian Date as an Ethiopian date string, e.g. "መስከረም 5, 2019".
 */
export function formatEthiopianDate(date: Date): string {
  const ec = toEC(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const ethMonths: string[] = (monthNames as Record<string, string[]>).amharic;
  return `${ethMonths[ec.month - 1]} ${ec.day}, ${ec.year}`;
}

/**
 * Format a Gregorian Date as a short Ethiopian date label (no year), e.g. "መስከረም 5".
 */
export function formatEthiopianDateShort(date: Date): string {
  const ec = toEC(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const ethMonths: string[] = (monthNames as Record<string, string[]>).amharic;
  return `${ethMonths[ec.month - 1]} ${ec.day}`;
}
