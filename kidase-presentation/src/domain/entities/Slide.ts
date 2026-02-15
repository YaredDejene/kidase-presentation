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
