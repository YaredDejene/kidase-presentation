import { describe, it, expect } from 'vitest';
import { expandDynamicSlides } from '../../src/domain/slideFiltering';
import type { Slide } from '../../src/domain/entities/Slide';
import type { Verse } from '../../src/domain/entities/Verse';

const slide: Slide = { id: 's1', presentationId: 'p1', slideOrder: 0, blocksJson: [{}], isDisabled: false, isDynamic: true, lineId: 'Ps 83' };
const verse = (id: string, verseOrder: number, textLang1: string, textLang2 = 'b'): Verse =>
  ({ id, segmentId: 'Ps 83', verseOrder, textLang1, textLang2, createdAt: '' });

describe('expandDynamicSlides', () => {
  it('shows each distinct verse text once, in order, ignoring whitespace differences', () => {
    const out = expandDynamicSlides([slide], [
      verse('v3', 3, 'B'),
      verse('v1', 1, 'A  x'),
      verse('v2', 2, 'A x'),
      verse('v4', 4, 'B'),
      verse('v5', 5, 'A x', 'other'),
    ], null);
    expect(out.map(s => s.id)).toEqual(['s1__verse_v1', 's1__verse_v3', 's1__verse_v5']);
  });
});
