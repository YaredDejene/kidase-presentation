/**
 * Slide Entity
 * Represents a single slide in a presentation
 */

export interface SlideTitle {
  Lang1?: string;
  Lang2?: string;
  Lang3?: string;
  Lang4?: string;
}

export interface SlideBlock {
  Lang1?: string;
  Lang2?: string;
  Lang3?: string;
  Lang4?: string;
}

export interface SlideFooter {
  title?: SlideTitle;
  text?: SlideBlock;
}

export interface Slide {
  id: string;
  presentationId: string;
  slideOrder: number;
  lineId?: string;
  titleJson?: SlideTitle;
  blocksJson: SlideBlock[];
  footerJson?: SlideFooter;
  notes?: string;
  isDisabled: boolean;
  isDynamic: boolean;
  templateOverrideId?: string;
}

export function createEmptySlide(presentationId: string, order: number): Omit<Slide, 'id'> {
  return {
    presentationId,
    slideOrder: order,
    blocksJson: [{}],
    isDisabled: false,
    isDynamic: false,
  };
}

export function getSlidePreviewText(slide: Slide): string {
  const blocks = slide.blocksJson || [];
  for (const block of blocks) {
    for (const key of ['Lang1', 'Lang2', 'Lang3', 'Lang4'] as const) {
      const val = block[key];
      if (val && typeof val === 'string' && val.trim()) {
        return val.trim().substring(0, 80);
      }
    }
  }
  return '(empty)';
}

/**
 * Check if a slide belongs to the secondary presentation.
 * A slide is secondary if it exists directly in secondarySlides,
 * or if it's a verse expansion of a secondary slide.
 */
export function isSecondarySlide(slide: Slide, secondarySlides: Slide[]): boolean {
  return secondarySlides.some(s => s.id === slide.id)
    || (slide.id.includes('__verse_') && secondarySlides.some(s => slide.id.startsWith(s.id + '__verse_')));
}

/** Check if a slide ID is a synthetic verse expansion */
export function isVerseSlide(id: string): boolean {
  return id.includes('__verse_');
}

/** Extract the parent slide ID from a synthetic verse slide ID */
export function getParentSlideId(id: string): string {
  return id.split('__verse_')[0];
}

export function getSlideTitle(slide: Slide): string | null {
  if (!slide.titleJson) return null;
  for (const key of ['Lang1', 'Lang2', 'Lang3', 'Lang4'] as const) {
    const val = slide.titleJson[key];
    if (val && typeof val === 'string' && val.trim()) {
      return val.trim();
    }
  }
  return null;
}
