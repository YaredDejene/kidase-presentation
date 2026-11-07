import { describe, it, expect } from 'vitest';
import { RenderService } from '../../src/services/RenderService';
import type { TemplateDefinition } from '../../src/domain/entities/Template';
import { fakeRepositories } from './fakeRepos';

function def(): TemplateDefinition {
  return {
    layout: { columns: 1, rows: 1, gap: 16, verticalAlign: 'center' },
    title: { show: true, fontSize: 48, color: '#fff', alignment: 'center' },
    languages: [
      { slot: 'Lang1', fontSize: 40, fontFamily: 'Noto', color: '#fff', alignment: 'center', lineHeight: 1.3 },
      { slot: 'Lang2', fontSize: 36, fontFamily: 'Noto', color: '#fff', alignment: 'center', lineHeight: 1.3 },
    ],
    background: { color: '#000' },
    margins: { top: 40, right: 40, bottom: 40, left: 40 },
    safeArea: { horizontal: 0, vertical: 0 },
  };
}

describe('RenderService', () => {
  it('resolves placeholders, drops disabled slides, and dedupes the template', async () => {
    const repos = fakeRepositories({
      templates: [{ id: 't1', name: 'Default', maxLangCount: 4, definitionJson: def(), createdAt: '' }],
      presentations: [{
        id: 'p1', name: 'Kidase', type: 'Kidase', templateId: 't1',
        languageMap: { Lang1: "Ge'ez", Lang2: 'Amharic' },
        isPrimary: true, isActive: true, createdAt: '',
      }],
      slides: [
        { id: 's1', presentationId: 'p1', slideOrder: 0, blocksJson: [{ Lang1: 'Hello {{NAME}}', Lang2: 'ሰላም' }], isDisabled: false, isDynamic: false },
        { id: 's2', presentationId: 'p1', slideOrder: 1, blocksJson: [{ Lang1: 'Hidden' }], isDisabled: true, isDynamic: false },
      ],
      variables: [{ id: 'v1', presentationId: 'p1', name: '{{NAME}}', value: 'World' }],
    });

    const svc = new RenderService(repos);
    const result = await svc.render({ presentationId: 'p1', date: '2026-06-25' });

    expect(result.slides).toHaveLength(1);
    expect(result.slides[0].id).toBe('s1');
    expect(result.slides[0].block.Lang1).toBe('Hello World');
    expect(result.slides[0].block.Lang2).toBe('ሰላም');
    expect(result.slides[0].templateId).toBe('t1');
    expect(result.templates['t1']).toEqual(def());
    expect(result.languages).toEqual([
      { slot: 'Lang1', name: "Ge'ez", enabled: true },
      { slot: 'Lang2', name: 'Amharic', enabled: true },
    ]);
    expect(result.presentation).toMatchObject({ id: 'p1', name: 'Kidase', type: 'Kidase' });
    expect(result.context.gregorian).toBe('2026-06-25');
  });

  it('offers disabled languages that have text, but not languages without text', async () => {
    const repos = fakeRepositories({
      templates: [{ id: 't1', name: 'Default', maxLangCount: 4, definitionJson: def(), createdAt: '' }],
      presentations: [{
        id: 'p1', name: 'Kidase', type: 'Kidase', templateId: 't1',
        languageMap: { Lang1: "Ge'ez" },
        languageSettings: {
          Lang1: { name: "Ge'ez", enabled: true, order: 2 },
          Lang3: { name: 'Tigrigna', enabled: false, order: 1 },
          Lang7: { name: 'Language 7', enabled: false, order: 3 },
        },
        isPrimary: true, isActive: true, createdAt: '',
      }],
      slides: [
        { id: 's1', presentationId: 'p1', slideOrder: 0, blocksJson: [{ Lang1: 'a', Lang3: 'c' }], isDisabled: false, isDynamic: false },
      ],
    });

    const result = await new RenderService(repos).render({ presentationId: 'p1', date: '2026-06-25' });
    expect(result.languages).toEqual([
      { slot: 'Lang3', name: 'Tigrigna', enabled: false },
      { slot: 'Lang1', name: "Ge'ez", enabled: true },
    ]);
  });

  it('hides a slide whose enabled rule resolves visible:false', async () => {
    const hideRule = JSON.stringify({
      id: 'r1',
      when: { 'meta.isMehella': { $eq: true } },
      then: { visible: false },
      otherwise: { visible: true },
    });
    const repos = fakeRepositories({
      templates: [{ id: 't1', name: 'Default', maxLangCount: 4, definitionJson: def(), createdAt: '' }],
      presentations: [{
        id: 'p1', name: 'Kidase', type: 'Kidase', templateId: 't1',
        languageMap: { Lang1: "Ge'ez" }, isPrimary: true, isActive: true, createdAt: '',
      }],
      slides: [
        { id: 's1', presentationId: 'p1', slideOrder: 0, blocksJson: [{ Lang1: 'A' }], isDisabled: false, isDynamic: false },
        { id: 's2', presentationId: 'p1', slideOrder: 1, blocksJson: [{ Lang1: 'B' }], isDisabled: false, isDynamic: false },
      ],
      rules: [{ id: 'r1', name: 'hide s2', scope: 'slide', presentationId: 'p1', slideId: 's2', ruleJson: hideRule, isEnabled: true, createdAt: '' }],
    });
    const svc = new RenderService(repos);

    const hidden = await svc.render({ presentationId: 'p1', date: '2026-06-25', isMehella: true });
    expect(hidden.slides.map(s => s.id)).toEqual(['s1']);

    const shown = await svc.render({ presentationId: 'p1', date: '2026-06-25', isMehella: false });
    expect(shown.slides.map(s => s.id)).toEqual(['s1', 's2']);
  });

  it('expands a dynamic slide into its verses by segmentId order', async () => {
    const repos = fakeRepositories({
      templates: [{ id: 't1', name: 'Default', maxLangCount: 4, definitionJson: def(), createdAt: '' }],
      presentations: [{
        id: 'p1', name: 'Kidase', type: 'Kidase', templateId: 't1',
        languageMap: { Lang1: "Ge'ez" }, isPrimary: true, isActive: true, createdAt: '',
      }],
      slides: [
        { id: 's1', presentationId: 'p1', slideOrder: 0, lineId: 'seg1', blocksJson: [{ Lang1: '' }], isDisabled: false, isDynamic: true },
      ],
      verses: [
        { id: 'b', segmentId: 'seg1', verseOrder: 2, textLang1: 'V2', createdAt: '' },
        { id: 'a', segmentId: 'seg1', verseOrder: 1, textLang1: 'V1', createdAt: '' },
      ],
    });
    const svc = new RenderService(repos);
    const result = await svc.render({ presentationId: 'p1', date: '2026-06-25' });

    expect(result.slides.map(s => s.block.Lang1)).toEqual(['V1', 'V2']);
  });

  it('resolves gitsawe readings/feast and auto-merges the secondary kidase', async () => {
    const selectRule = JSON.stringify({
      id: 'g-sel', when: { 'meta.isMehella': { $eq: true } }, then: { visible: true },
    });
    const repos = fakeRepositories({
      templates: [{ id: 't1', name: 'Default', maxLangCount: 4, definitionJson: def(), createdAt: '' }],
      presentations: [
        { id: 'p1', name: 'Kidase', type: 'Kidase', templateId: 't1', languageMap: { Lang1: "Ge'ez" }, isPrimary: true, isActive: true, createdAt: '' },
        { id: 'p2', name: 'Secondary', type: 'Kidase', templateId: 't1', languageMap: { Lang1: "Ge'ez" }, isPrimary: false, isActive: false, createdAt: '' },
      ],
      slides: [
        { id: 's1', presentationId: 'p1', slideOrder: 0, blocksJson: [{ Lang1: 'primary' }], isDisabled: false, isDynamic: false },
        { id: 'sec1', presentationId: 'p2', slideOrder: 0, blocksJson: [{ Lang1: 'secondary' }], isDisabled: false, isDynamic: false },
      ],
      gitsawes: [{ id: 'g1', lineId: 'l1', name: 'Feast X', priority: 1, kidaseType: 'Secondary', messageStPaul: 'Rom 1:1', wengel: 'John 1:1', createdAt: '' }],
      rules: [{ id: 'g-sel', name: 'select g1', scope: 'gitsawe', gitsaweId: 'g1', ruleJson: selectRule, isEnabled: true, createdAt: '' }],
    });
    const svc = new RenderService(repos);
    const result = await svc.render({ presentationId: 'p1', date: '2026-06-25', isMehella: true });

    expect(result.context.feast).toBe('Feast X');
    expect(result.readings.find(r => r.key === 'pauline')?.value).toBe('Rom 1:1');
    expect(result.readings.find(r => r.key === 'gospel')?.value).toBe('John 1:1');
    expect(result.slides.map(s => s.id)).toEqual(['s1', 'sec1']);
    expect(result.slides.find(s => s.id === 'sec1')?.isSecondary).toBe(true);
  });
  describe('readings and anaphora with alternatives', () => {
    const repos = () => fakeRepositories({
      templates: [{ id: 't1', name: 'Default', maxLangCount: 4, definitionJson: def(), createdAt: '' }],
      presentations: [
        { id: 'p1', name: 'Kidase', type: 'Kidase', templateId: 't1', languageMap: { Lang1: "Ge'ez" }, isPrimary: true, isActive: true, createdAt: '' },
        { id: 'pa', name: 'Anaphora A', type: 'Kidase', templateId: 't1', languageMap: { Lang1: "Ge'ez" }, isPrimary: false, isActive: false, createdAt: '' },
        { id: 'pb', name: 'Anaphora B', type: 'Kidase', templateId: 't1', languageMap: { Lang1: "Ge'ez" }, isPrimary: false, isActive: false, createdAt: '' },
      ],
      slides: [
        { id: 'gospel', presentationId: 'p1', slideOrder: 0, lineId: '@meta.gitsawe.wengel', blocksJson: [{ Lang1: '' }], isDisabled: false, isDynamic: true },
        { id: 'a1', presentationId: 'pa', slideOrder: 0, blocksJson: [{ Lang1: 'anaphora A' }], isDisabled: false, isDynamic: false },
        { id: 'b1', presentationId: 'pb', slideOrder: 0, blocksJson: [{ Lang1: 'anaphora B' }], isDisabled: false, isDynamic: false },
      ],
      verses: [
        { id: 'v1', segmentId: 'John 1:1', verseOrder: 1, textLang1: 'In the beginning', createdAt: '' },
        { id: 'v2', segmentId: 'Mark 1:1', verseOrder: 1, textLang1: 'The beginning of the gospel', createdAt: '' },
      ],
      gitsawes: [{ id: 'g1', lineId: 'l1', name: 'Day', priority: 1, kidaseType: 'Anaphora A, Anaphora B', wengel: 'John 1:1፣ Mark 1:1', createdAt: '' }],
      rules: [{ id: 'g-alt', name: 'always', scope: 'gitsawe', gitsaweId: 'g1', isEnabled: true, createdAt: '',
        ruleJson: JSON.stringify({ id: 'g-alt', when: { 'meta.year': { $gte: 2000 } }, then: {} }) }],
    });
    const render = (readingChoice?: Record<string, number>) =>
      new RenderService(repos()).render({ presentationId: 'p1', date: '2026-06-25', readingChoice });
    const reading = (r: Awaited<ReturnType<typeof render>>, key: string) => r.readings.find(x => x.key === key);

    it('uses the first of each by default and lists the alternatives', async () => {
      const r = await render();
      expect(r.slides.map(s => s.block.Lang1)).toEqual(['In the beginning', 'anaphora A']);
      expect(r.presentation.secondaryName).toBe('Anaphora A');
      expect(reading(r, 'gospel')).toMatchObject({ value: 'John 1:1', options: ['John 1:1', 'Mark 1:1'], choice: 0, slideIndex: 0 });
      expect(reading(r, 'kidaseType')).toMatchObject({ value: 'Anaphora A', options: ['Anaphora A', 'Anaphora B'], choice: 0 });
      expect(r.titleSlide.anaphora).toBe('Anaphora A');
      expect(r.titleSlide.readings.find(x => x.key === 'gospel')?.value).toBe('John 1:1');
    });

    it('switches verses, merged anaphora and title slide, and keeps the options listed', async () => {
      const r = await render({ gospel: 1, kidaseType: 1 });
      expect(r.slides.map(s => s.block.Lang1)).toEqual(['The beginning of the gospel', 'anaphora B']);
      expect(r.presentation.secondaryName).toBe('Anaphora B');
      expect(reading(r, 'gospel')).toMatchObject({ value: 'Mark 1:1', options: ['John 1:1', 'Mark 1:1'], choice: 1 });
      expect(reading(r, 'kidaseType')).toMatchObject({ value: 'Anaphora B', options: ['Anaphora A', 'Anaphora B'], choice: 1 });
      expect(r.titleSlide.anaphora).toBe('Anaphora B');
      expect(r.titleSlide.readings.find(x => x.key === 'gospel')?.value).toBe('Mark 1:1');
    });

    it('changes one choice without touching the other', async () => {
      const r = await render({ kidaseType: 1 });
      expect(r.slides.map(s => s.block.Lang1)).toEqual(['In the beginning', 'anaphora B']);
    });

    it('falls back to the first for an out-of-range choice', async () => {
      const r = await render({ gospel: 7, kidaseType: 9 });
      expect(r.slides.map(s => s.block.Lang1)).toEqual(['In the beginning', 'anaphora A']);
      expect(reading(r, 'gospel')?.choice).toBe(0);
    });
  });
});
