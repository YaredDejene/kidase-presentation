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

export interface Slide {
  id: string;
  presentationId: string;
  slideOrder: number;
  lineId?: string;
  titleJson?: SlideTitle;
  blocksJson: SlideBlock[];
  notes?: string;
  isDisabled: boolean;
}

export function createEmptySlide(presentationId: string, order: number): Omit<Slide, 'id'> {
  return {
    presentationId,
    slideOrder: order,
    blocksJson: [{}],
    isDisabled: false,
  };
}

export function getSlidePreviewText(slide: Slide): string {
  const block = slide.blocksJson[0] || {};
  const text = block.Lang1 || block.Lang2 || block.Lang3 || block.Lang4 || '';
  return text.length > 100 ? text.substring(0, 100) + '...' : text;
}
