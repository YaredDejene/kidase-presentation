import { describe, it, expect } from 'vitest';
import { LANG_SLOTS, firstText } from '../src/domain/entities/Presentation';
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
    expect(new PlaceholderService().replaceInBlock(block, [v])).toEqual({
      Lang1: 'a!', Lang2: 'b!', Lang3: 'c!', Lang4: 'd!',
    });
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
