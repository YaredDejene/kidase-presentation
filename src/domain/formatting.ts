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
export function computeFontScale(totalChars: number): number {
  if (totalChars < 100) return 2.0;
  if (totalChars < 200) return 1.6;
  if (totalChars < 350) return 1.35;
  if (totalChars < 500) return 1.15;
  if (totalChars < 700) return 1.0;
  if (totalChars < 1000) return 0.85;
  if (totalChars < 1400) return 0.7;
  return 0.55;
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
