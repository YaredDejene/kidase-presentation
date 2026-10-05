import { describe, it, expect } from 'vitest';
import { LANG_SLOTS, firstText } from '../src/domain/entities/Presentation';
import { PlaceholderService } from '../src/services/PlaceholderService';
import type { Variable } from '../src/domain/entities/Variable';

describe('language slots', () => {
  it('firstText returns the first non-empty slot in order', () => {
    expect(firstText({ Lang2: '', Lang3: 'c', Lang4: 'd' })).toBe('c');
    expect(firstText({})).toBeUndefined();
    expect(firstText(null)).toBeUndefined();
  });

  it('replaceInBlock substitutes per-language values for every slot', () => {
    const v = { name: '@Saint', value: 'X', valueLang1: 'a', valueLang2: 'b', valueLang3: 'c', valueLang4: 'd' } as Variable;
    const block = Object.fromEntries(LANG_SLOTS.map(s => [s, '@Saint!']));
    expect(new PlaceholderService().replaceInBlock(block, [v])).toEqual({
      Lang1: 'a!', Lang2: 'b!', Lang3: 'c!', Lang4: 'd!',
    });
  });
});
