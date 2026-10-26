import { describe, expect, it } from 'vitest';
import { verseRef } from '../src/lib/text';

describe('verseRef', () => {
  it('narrows a reference to one verse in both conventions', () => {
    expect(verseRef('ሉቃስ ም 12 ቁ 26-32', '27')).toBe('ሉቃስ ም 12 ቁ 27');
    expect(verseRef('መዝ ም 2 ቁ 12-13 B', '1')).toBe('መዝ ም 2 ቁ 1');
    expect(verseRef('Luke 12:26-32', '28')).toBe('Luke 12:28');
    expect(verseRef('Psalm 91(92):12-13', '1')).toBe('Psalm 91(92):1');
  });
});
