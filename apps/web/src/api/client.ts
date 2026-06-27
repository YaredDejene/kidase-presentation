import type { RenderResult, LangSlot } from '@kidase/shared';

export interface PresentationSummary {
  id: string;
  name: string;
  type: string;
  slideCount: number;
  langs: string[];
  languages: { slot: LangSlot; name: string }[];
}

export type RenderPayload = RenderResult & { dataVersion: string };

// Empty base => same-origin (works with the Vite dev proxy and a CDN deploy).
const BASE = import.meta.env.VITE_API_BASE ?? '';

export async function fetchPresentations(): Promise<PresentationSummary[]> {
  const res = await fetch(`${BASE}/api/v1/presentations`);
  if (!res.ok) throw new Error(`Failed to load presentations (${res.status})`);
  return res.json();
}

export async function fetchRender(
  id: string,
  date: string | null,
  isMehella: boolean,
): Promise<RenderPayload> {
  const q = new URLSearchParams();
  if (date) q.set('date', date);
  if (isMehella) q.set('mehella', '1');
  const res = await fetch(`${BASE}/api/v1/presentations/${id}/render?${q.toString()}`);
  if (!res.ok) throw new Error(`Failed to render (${res.status})`);
  return res.json();
}
