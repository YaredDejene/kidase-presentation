import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db } from 'mongodb';
import { createMongoRepositories, ensureIndexes } from '../src/repositories/mongo';

let mongod: MongoMemoryServer;
let client: MongoClient;
let db: Db;
let repos: ReturnType<typeof createMongoRepositories>;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  client = new MongoClient(mongod.getUri());
  await client.connect();
  db = client.db('test');
  await ensureIndexes(db);
  repos = createMongoRepositories(db);
});

afterAll(async () => {
  await client?.close();
  await mongod?.stop();
});

describe('Mongo repositories', () => {
  it('round-trips a presentation with nested languageSettings and native booleans', async () => {
    const created = await repos.presentation.create({
      name: 'Kidase', type: 'Kidase', templateId: 't1',
      languageMap: { Lang1: "Ge'ez" },
      languageSettings: { Lang1: { name: "Ge'ez", enabled: true, order: 1 } },
      isPrimary: true, isActive: false,
    });
    expect(created.id).toBeTruthy();

    const fetched = await repos.presentation.getById(created.id);
    expect(fetched).toMatchObject({ name: 'Kidase', type: 'Kidase', isPrimary: true, isActive: false });
    expect(fetched?.languageSettings?.Lang1?.enabled).toBe(true);
    expect(typeof fetched?.isPrimary).toBe('boolean');
    expect((await repos.presentation.getByName('Kidase'))?.id).toBe(created.id);
    expect((await repos.presentation.getPrimary())?.id).toBe(created.id);
  });

  it('stores slides with nested blocksJson and returns them ordered + enabled-filtered', async () => {
    const pid = 'p-order';
    await repos.slide.createMany([
      { presentationId: pid, slideOrder: 2, blocksJson: [{ Lang1: 'B' }], isDisabled: false, isDynamic: false },
      { presentationId: pid, slideOrder: 1, blocksJson: [{ Lang1: 'A' }], isDisabled: true, isDynamic: false },
    ]);
    const slides = await repos.slide.getByPresentationId(pid);
    expect(slides.map(s => s.slideOrder)).toEqual([1, 2]);
    expect(slides[0].blocksJson[0].Lang1).toBe('A');
    expect(slides[0].isDisabled).toBe(true);

    const enabled = await repos.slide.getEnabledByPresentationId(pid);
    expect(enabled.map(s => s.slideOrder)).toEqual([2]);
  });

  it('keeps ruleJson as a string and filters enabled rules', async () => {
    const enabledRule = await repos.rule.create({ name: 'r', scope: 'gitsawe', gitsaweId: 'g1', ruleJson: '{"id":"x","when":{},"then":{}}', isEnabled: true });
    const disabledRule = await repos.rule.create({ name: 'd', scope: 'slide', presentationId: 'p1', ruleJson: '{}', isEnabled: false });
    expect(typeof enabledRule.ruleJson).toBe('string');

    const enabled = await repos.rule.getEnabled();
    expect(enabled.find(x => x.id === enabledRule.id)).toBeTruthy();
    expect(enabled.find(x => x.id === disabledRule.id)).toBeFalsy();
  });

  it('round-trips app settings via key/value docs', async () => {
    await repos.appSettings.setAll({
      theme: 'light', showSlideNumbers: false, showSidebarLabels: true,
      presentationDisplay: 'presenterView', locale: 'am',
    });
    const s = await repos.appSettings.get();
    expect(s).toEqual({
      theme: 'light', showSlideNumbers: false, showSidebarLabels: true,
      presentationDisplay: 'presenterView', locale: 'am',
    });
  });

  it('returns verses by segmentId in verseOrder', async () => {
    await repos.verse.createMany([
      { segmentId: 'seg', verseOrder: 2, textLang1: 'V2' },
      { segmentId: 'seg', verseOrder: 1, textLang1: 'V1' },
    ]);
    const vs = await repos.verse.getBySegmentId('seg');
    expect(vs.map(v => v.textLang1)).toEqual(['V1', 'V2']);
  });
});
