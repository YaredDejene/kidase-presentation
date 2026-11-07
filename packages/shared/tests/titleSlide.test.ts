import { describe, expect, it } from 'vitest';
import { buildTitleSlideInfo, withReadingSlides } from '../src/domain/titleSlide';

describe('buildTitleSlideInfo', () => {
  it('summarizes a Sunday with its readings and markers', () => {
    const info = buildTitleSlideInfo({
      date: '2026-11-01', isFastingSeason: true, isMehella: false,
      gitsawe: { priority: 1, gitsaweType: 'ሰንበት', name: 'ዘጽጌ ሰንበት', additionalInfo: '6ኛ እሑድ', kidaseType: 'ዘእግዝእትነ', evangelist: 'ሉቃስ', messageStPaul: 'ሮሜ ም 2 ቁ 1-17', misbak: ' ' },
    }, 'ሥርዓተ ቅዳሴ');
    expect(info).toMatchObject({ liturgy: 'ሥርዓተ ቅዳሴ', anaphora: 'ዘእግዝእትነ', dayType: 'ሰንበት', name: 'ዘጽጌ ሰንበት', note: '6ኛ እሑድ', tags: ['ጾም'] });
    expect(info.ethDate.startsWith('እሑድ')).toBe(true);
    expect(info.gregorian).toBe('Sunday, November 1, 2026');
    expect(info.readings).toEqual([{ key: 'pauline', label: 'መልእክተ ጳውሎስ', labelEn: 'Pauline Epistle', value: 'ሮሜ ም 2 ቁ 1-17' }]);
  });

  it('keeps the gitsawe name on ordinary days too', () => {
    const info = buildTitleSlideInfo({ date: '2026-10-31', gitsawe: { priority: 3, name: 'ጥቅምት 21' } }, 'ሥርዓተ ቅዳሴ');
    expect(info).toMatchObject({ name: 'ጥቅምት 21', note: null });
  });

  it('links each reading to the slide that shows it', () => {
    const info = buildTitleSlideInfo({ gitsawe: { messageStPaul: 'ሮሜ', wengel: 'ማቴ' } }, 'ቅዳሴ');
    const linked = withReadingSlides(info, [{}, { lineId: '@meta.gitsawe.wengel' }, { lineId: '@meta.gitsawe.messageStPaul' }]);
    expect(linked.readings.map(r => [r.key, r.slide])).toEqual([['pauline', 2], ['gospel', 1]]);
  });
});
