export interface Verse {
  id: string;
  segmentId: string;
  verseOrder: number;
  titleLang1?: string;
  titleLang2?: string;
  titleLang3?: string;
  titleLang4?: string;
  textLang1?: string;
  textLang2?: string;
  textLang3?: string;
  textLang4?: string;
  createdAt: string;
}

export function createVerse(
  segmentId: string,
  verseOrder: number,
  options?: {
    titleLang1?: string;
    titleLang2?: string;
    titleLang3?: string;
    titleLang4?: string;
    textLang1?: string;
    textLang2?: string;
    textLang3?: string;
    textLang4?: string;
  },
): Omit<Verse, 'id' | 'createdAt'> {
  return {
    segmentId,
    verseOrder,
    titleLang1: options?.titleLang1,
    titleLang2: options?.titleLang2,
    titleLang3: options?.titleLang3,
    titleLang4: options?.titleLang4,
    textLang1: options?.textLang1,
    textLang2: options?.textLang2,
    textLang3: options?.textLang3,
    textLang4: options?.textLang4,
  };
}
