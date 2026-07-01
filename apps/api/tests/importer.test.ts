import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db } from 'mongodb';
import { RenderService } from '@kidase/shared';
import { createMongoRepositories, ensureIndexes } from '../src/repositories/mongo';
import { importKidaseBackup, KidaseBackup } from '../src/importer/kidaseImporter';

let mongod: MongoMemoryServer;
let client: MongoClient;
let db: Db;

const templateDef = {
  layout: { columns: 1, rows: 1, gap: 16, verticalAlign: 'center' },
  title: { show: true, fontSize: 48, color: '#fff', alignment: 'center' },
  languages: [{ slot: 'Lang1', fontSize: 40, fontFamily: 'Noto', color: '#fff', alignment: 'center', lineHeight: 1.3 }],
  background: { color: '#000' },
  margins: { top: 40, right: 40, bottom: 40, left: 40 },
  safeArea: { horizontal: 0, vertical: 0 },
};

// A backup in the desktop SQLite shape: snake_case columns, 1/0 booleans, JSON strings.
const backup: KidaseBackup = {
  version: 1,
  data: {
    templates: [
      { id: 't1', name: 'Default', max_lang_count: 4, definition_json: JSON.stringify(templateDef), created_at: '2026-01-01' },
    ],
    presentations: [
      { id: 'p1', name: 'Kidase', type: 'Kidase', template_id: 't1', language_map: JSON.stringify({ Lang1: "Ge'ez" }), language_settings: null, is_primary: 1, is_active: 1, created_at: '2026-01-01' },
    ],
    slides: [
      { id: 's1', presentation_id: 'p1', slide_order: 1, line_id: null, title_json: null, blocks_json: JSON.stringify([{ Lang1: 'Hello {{NAME}}' }]), footer_json: null, notes: null, is_disabled: 0, is_dynamic: 0, template_override_id: null },
      { id: 's2', presentation_id: 'p1', slide_order: 0, line_id: null, title_json: null, blocks_json: JSON.stringify([{ Lang1: 'First' }]), footer_json: null, notes: null, is_disabled: 0, is_dynamic: 0, template_override_id: null },
    ],
    variables: [
      { id: 'v1', presentation_id: 'p1', name: '{{NAME}}', value: 'World', value_lang1: '', value_lang2: '', value_lang3: '', value_lang4: '' },
    ],
    app_settings: [
      { key: 'theme', value: 'light' },
    ],
  },
};

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  client = new MongoClient(mongod.getUri());
  await client.connect();
  db = client.db('test');
  await ensureIndexes(db);
});

afterAll(async () => {
  await client?.close();
  await mongod?.stop();
});

describe('.kidase importer', () => {
  it('imports snake_case/1-0/JSON-string rows preserving ids and converting types', async () => {
    const counts = await importKidaseBackup(db, backup);
    expect(counts).toMatchObject({ templates: 1, presentations: 1, slides: 2, variables: 1, app_settings: 1 });

    const repos = createMongoRepositories(db);

    const pres = await repos.presentation.getById('p1');
    expect(pres).toMatchObject({ id: 'p1', name: 'Kidase', isPrimary: true, isActive: true });
    expect(typeof pres?.isPrimary).toBe('boolean');
    expect(pres?.languageMap.Lang1).toBe("Ge'ez");

    const slides = await repos.slide.getByPresentationId('p1');
    expect(slides.map(s => s.id)).toEqual(['s2', 's1']); // ordered by slideOrder
    expect(slides[1].blocksJson[0].Lang1).toBe('Hello {{NAME}}');
    expect(slides[0].isDisabled).toBe(false);

    const settings = await repos.appSettings.get();
    expect(settings.theme).toBe('light');
  });

  it('renders the imported presentation end-to-end through the Mongo repos', async () => {
    await importKidaseBackup(db, backup);
    const repos = createMongoRepositories(db);
    const svc = new RenderService(repos);

    const result = await svc.render({ presentationId: 'p1', date: '2026-06-25' });
    expect(result.presentation.name).toBe('Kidase');
    expect(result.slides.map(s => s.id)).toEqual(['s2', 's1']);
    expect(result.slides[1].block.Lang1).toBe('Hello World'); // placeholder resolved
    expect(result.templates['t1']).toMatchObject({ layout: { columns: 1 } });
    expect(result.languages).toEqual([{ slot: 'Lang1', name: "Ge'ez" }]);
  });
});
