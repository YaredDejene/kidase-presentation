import type { LangFields } from './Presentation';

export type VerseText = LangFields<'title'> & LangFields<'text'>;

export interface Verse extends VerseText {
  id: string;
  segmentId: string;
  verseOrder: number;
  createdAt: string;
}
