import { describe, it, expect } from 'vitest';
import { LANG_SLOTS, firstText, type LangSlot } from '../src/domain/entities/Presentation';
import { templateLanguages, type TemplateDefinition } from '../src/domain/entities/Template';
import { PlaceholderService } from '../src/services/PlaceholderService';
import type { Variable } from '../src/domain/entities/Variable';
import * as XLSX from 'xlsx';
import { ExcelImportService } from '../src/services/ExcelImportService';
import { fakeRepositories } from './render/fakeRepos';

describe('language slots', () => {
  it('firstText returns the first non-empty slot in order', () => {
    expect(firstText({ Lang2: '', Lang3: 'c', Lang4: 'd' })).toBe('c');
    expect(firstText({})).toBeUndefined();
    expect(firstText(null)).toBeUndefined();
  });

  it('replaceInBlock substitutes per-language values for every slot', () => {
    const v = { name: '@Saint', value: 'X', valueLang1: 'a', valueLang2: 'b', valueLang3: 'c', valueLang4: 'd' } as Variable;
    const block = Object.fromEntries(LANG_SLOTS.map(s => [s, '@Saint!']));
    // Slots without their own value fall back to the single value.
    expect(new PlaceholderService().replaceInBlock(block, [v])).toEqual({
      Lang1: 'a!', Lang2: 'b!', Lang3: 'c!', Lang4: 'd!', Lang5: 'X!', Lang6: 'X!', Lang7: 'X!', Lang8: 'X!',
    });
  });

  it('templateLanguages styles by position, caps at the row count, keeps color with the language', () => {
    const row = (slot: LangSlot | undefined, fontSize: number, color: string) =>
      ({ slot, fontSize, color, fontFamily: 'f', alignment: 'left' as const, lineHeight: 1 });
    const def = { languages: [row('Lang1', 62, 'white'), row('Lang2', 46, 'yellow'), row(undefined, 40, 'grey')] } as TemplateDefinition;

    const shown = templateLanguages(def, [{ slot: 'Lang2' }, { slot: 'Lang6', color: 'pink' }, { slot: 'Lang1' }, { slot: 'Lang3' }]);
    expect(shown.map(l => [l.slot, l.fontSize, l.color])).toEqual([
      ['Lang2', 62, 'yellow'], // row 1 size, its own slot's color
      ['Lang6', 46, 'pink'],   // its own color setting
      ['Lang1', 40, 'white'],
    ]);                         // Lang3 is beyond the 3 rows
  });
});

describe('Excel import language columns', () => {
  const book = (sheets: Record<string, unknown[][]>) => {
    const wb = XLSX.utils.book_new();
    for (const [name, rows] of Object.entries(sheets)) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
    return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  };
  const service = new ExcelImportService(fakeRepositories({}));

  it('reads every column naming per slot', async () => {
    const result = await service.importFromArrayBuffer(book({
      Metadata: [['PresentationName', 'Lang1Name', 'Language2', 'Lang3'], ['P', "Ge'ez", 'Amharic', 'Tigrinya']],
      Slides: [
        ['Title_Lang2', 'Text_Lang1', 'Lang2Text', 'Lang3', 'FooterText_Lang4'],
        ['T2', 'a', 'b', 'c', 'f4'],
      ],
      Variables: [['VariableName', 'Variable_Lang1', 'Variable_Lang3'], ['Saint', 'x', 'z']],
    }), 'tmpl');

    expect(result.presentation.languageMap).toEqual({ Lang1: "Ge'ez", Lang2: 'Amharic', Lang3: 'Tigrinya' });
    const slide = result.slides[0];
    expect(slide.titleJson).toEqual({ Lang2: 'T2' });
    expect(slide.blocksJson[0]).toEqual({ Lang1: 'a', Lang2: 'b', Lang3: 'c' });
    expect(slide.footerJson).toEqual({ text: { Lang4: 'f4' } });
    expect(result.variables[0]).toMatchObject({ name: '@Saint', value: 'x', valueLang1: 'x', valueLang2: '', valueLang3: 'z' });
  });

  it('reads verse title and text per slot', async () => {
    const { verses } = await service.importVersesFromArrayBuffer(book({
      Verses: [['SegmentId', 'Title_Lang1', 'Text_Lang2'], ['Ps 1', ' t1 ', 'v2']],
    }));
    expect(verses[0]).toMatchObject({ segmentId: 'Ps 1', titleLang1: 't1', textLang2: 'v2' });
    expect(verses[0].textLang1).toBeUndefined();
  });
});
