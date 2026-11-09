import { TITLE_SLIDE_ID, type RenderResult, type LangSlot, type Country, type TitleSlideInfo } from '@kidase/shared';

export interface PresentationSummary {
  id: string;
  name: string;
  type: string;
  slideCount: number;
  langs: string[];
  languages: { slot: LangSlot; name: string }[];
}

export type RenderSlide = RenderResult['slides'][number] & { titleInfo?: TitleSlideInfo };
export type RenderPayload = Omit<RenderResult, 'slides'> & { slides: RenderSlide[]; dataVersion: string };

/** Puts the generated title slide first; reading jumps move with the slides. */
function withTitleSlide(payload: RenderPayload): RenderPayload {
  const first = payload.slides[0];
  if (!first || !payload.titleSlide) return payload;
  const readings = payload.readings.map(r => (r.slideIndex === undefined ? r : { ...r, slideIndex: r.slideIndex + 1 }));
  const titleInfo = {
    ...payload.titleSlide,
    readings: payload.titleSlide.readings.map(r => ({ ...r, slide: readings.find(x => x.key === r.key)?.slideIndex })),
  };
  return {
    ...payload,
    slides: [
      { id: TITLE_SLIDE_ID, order: 0, isSecondary: false, templateId: first.templateId, title: null, footer: null, block: {}, titleInfo },
      ...payload.slides,
    ],
    readings,
  };
}

declare global {
  interface Window { __presentations?: Promise<Response> }
}

// Empty base => same-origin (works with the Vite dev proxy and a CDN deploy).
const BASE = import.meta.env.VITE_API_BASE ?? '';

export async function fetchPresentations(): Promise<PresentationSummary[]> {
  // index.html starts this same request early (keep the URL and cache option in sync); use it once, then fetch normally.
  const early = BASE === '' ? window.__presentations : undefined;
  window.__presentations = undefined;
  // Always re-check with the server (a cheap 304 via the ETag), so content edits show up on the next load.
  const res = await (early ?? fetch(`${BASE}/api/v1/presentations`, { cache: 'no-cache' }));
  if (!res.ok) throw new Error(`Failed to load presentations (${res.status})`);
  return res.json();
}

export async function fetchRender(
  id: string,
  date: string | null,
  isMehella: boolean,
  country: Country,
  readings = '',
): Promise<RenderPayload> {
  const q = new URLSearchParams();
  if (date) q.set('date', date);
  if (isMehella) q.set('mehella', '1');
  q.set('country', country);
  if (readings) q.set('readings', readings);
  const res = await fetch(`${BASE}/api/v1/presentations/${id}/render?${q.toString()}`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Failed to render (${res.status})`);
  return withTitleSlide(await res.json());
}
