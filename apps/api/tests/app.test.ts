import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db } from 'mongodb';
import type { FastifyInstance } from 'fastify';
import { createMongoRepositories, ensureIndexes } from '../src/repositories/mongo';
import { importKidaseBackup, KidaseBackup } from '../src/importer/kidaseImporter';
import { buildApp } from '../src/app';
import { bumpContentVersion, getContentVersion } from '../src/contentVersion';

const templateDef = {
  layout: { columns: 1, rows: 1, gap: 16, verticalAlign: 'center' },
  title: { show: true, fontSize: 48, color: '#fff', alignment: 'center' },
  languages: [{ slot: 'Lang1', fontSize: 40, fontFamily: 'Noto', color: '#fff', alignment: 'center', lineHeight: 1.3 }],
  background: { color: '#000' },
  margins: { top: 40, right: 40, bottom: 40, left: 40 },
  safeArea: { horizontal: 0, vertical: 0 },
};

const backup: KidaseBackup = {
  data: {
    templates: [{ id: 't1', name: 'Default', max_lang_count: 4, definition_json: JSON.stringify(templateDef), created_at: '2026-01-01' }],
    presentations: [{ id: 'p1', name: 'Kidase', type: 'Kidase', template_id: 't1', language_map: JSON.stringify({ Lang1: "Ge'ez", Lang2: 'Amharic' }), language_settings: null, is_primary: 1, is_active: 1, created_at: '2026-01-01' }],
    slides: [
      { id: 's2', presentation_id: 'p1', slide_order: 0, blocks_json: JSON.stringify([{ Lang1: 'First' }]), is_disabled: 0, is_dynamic: 0 },
      { id: 's1', presentation_id: 'p1', slide_order: 1, blocks_json: JSON.stringify([{ Lang1: 'Hello {{NAME}}' }]), is_disabled: 0, is_dynamic: 0 },
    ],
    variables: [{ id: 'v1', presentation_id: 'p1', name: '{{NAME}}', value: 'World' }],
    gitsawes: [
      { id: 'g1', line_id: 'ዘወ43', name: 'ጥቅምት 13', priority: 3, kidase_type: 'ዘዮሐንስ አፈወርቅ', evangelist: 'ሉቃስ',
        message_st_paul: '2ኛ ቆሮ ም 9 ቁ 1-10', message_apostle: 'ያዕቆብ ም 1 ቁ 9-17', message_book_of_acts: 'ሐዋ ም 20 ቁ 16-28',
        misbak: 'መዝ ም 91(92) ቁ 12-13', wengel: 'ሉቃስ ም 12 ቁ 26-32', created_at: '2026-01-01' },
      { id: 'g2', line_id: 'በዓ4', name: 'ጥምቀት', priority: 0, wengel: 'ሉቃስ ም 3 ቁ 21-ፍም', created_at: '2026-01-01' },
    ],
    rule_definitions: [
      { id: 'r1', name: 'ዘወ43', scope: 'gitsawe', gitsawe_id: 'g1', is_enabled: 1, created_at: '2026-01-01',
        rule_json: JSON.stringify({ id: 'sel-ዘወ43', when: { 'meta.ethMonthDay': { $eq: '02-13' } }, then: { selected: true }, otherwise: { selected: false } }) },
      { id: 'r2', name: 'በዓ4', scope: 'gitsawe', gitsawe_id: 'g2', is_enabled: 1, created_at: '2026-01-01',
        rule_json: JSON.stringify({ id: 'sel-በዓ4', when: { 'meta.date': { $eq: '$ref:meta.holidays.timket' } }, then: { selected: true }, otherwise: { selected: false } }) },
    ],
    verses: [
      { id: 'w1', segment_id: 'ሉቃስ ም 12 ቁ 26-32', verse_order: 1, text_lang2: '26 እንግዲህ ትንሹን ነገር', text_lang4: '26 If ye then be not able', created_at: '2026-01-01' },
      { id: 'w2', segment_id: 'ሉቃስ ም 12 ቁ 26-32', verse_order: 2, text_lang2: '27 አበቦች እንዴት', text_lang4: '27 Consider the lilies', created_at: '2026-01-01' },
      { id: 'w3', segment_id: 'መዝ ም 91(92) ቁ 12-13', verse_order: 1, text_lang1: 'ጻድቅሰ ከመ በቀልት ይፈሪ፤\nወይበዝኅ ከመ ዘግባ ዘሊባኖስ።', text_lang2: 'ጻድቅ እንደ ዘንባባ ያፈራል', text_lang4: 'The righteous shall flourish', created_at: '2026-01-01' },
      { id: 'w4', segment_id: 'ሉቃስ ም 3 ቁ 21-ፍም', verse_order: 1, text_lang2: '21 ሕዝቡም ሁሉ', text_lang4: '21 Now when all the people', created_at: '2026-01-01' },
      { id: 'w5', segment_id: 'ሉቃስ ም 3 ቁ 21-ፍም', verse_order: 2, text_lang2: '38 የሄኖስ ልጅ', text_lang4: '38 Which was the son of Enos', created_at: '2026-01-01' },
    ],
  },
};

let mongod: MongoMemoryServer;
let client: MongoClient;
let db: Db;
let app: FastifyInstance;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  client = new MongoClient(mongod.getUri());
  await client.connect();
  db = client.db('test');
  await ensureIndexes(db);
  await importKidaseBackup(db, backup);
  await bumpContentVersion(db);
  app = await buildApp({ repos: createMongoRepositories(db), db });
  await app.ready();
});

afterAll(async () => {
  await app?.close();
  await client?.close();
  await mongod?.stop();
});

describe('public API', () => {
  it('GET /presentations lists the catalog with slide counts and language codes', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/presentations' });
    expect(res.statusCode).toBe(200);
    const list = res.json();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: 'p1', name: 'Kidase', type: 'Kidase', slideCount: 2, langs: ['geez', 'amharic'] });
  });

  it('GET /presentations lists the primary presentation first', async () => {
    const newer = { _id: 'p0', name: 'Anaphora', type: 'Kidase', templateId: 't1', languageMap: {}, isPrimary: false, isActive: false, createdAt: '2026-02-01' };
    await db.collection('presentations').insertOne(newer as never);
    await bumpContentVersion(db); // direct writes must bump the version, like every API write does, to clear the read cache
    const res = await app.inject({ method: 'GET', url: '/api/v1/presentations' });
    await db.collection('presentations').deleteOne({ _id: 'p0' as never });
    await bumpContentVersion(db);
    expect(res.json().map((p: { id: string }) => p.id)).toEqual(['p1', 'p0']);
  });

  it('GET /:id/render returns resolved, display-ready slides with no engine data', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/presentations/p1/render?date=2026-06-25' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.presentation.name).toBe('Kidase');
    expect(body.slides.map((s: { id: string }) => s.id)).toEqual(['s2', 's1']);
    expect(body.slides[1].block.Lang1).toBe('Hello World');
    expect(body.templates.t1).toBeTruthy();
    expect(body.dataVersion).toBe(String(await getContentVersion(db)));
    // boundary: no engine/rule/variable data leaks
    expect(JSON.stringify(body)).not.toContain('ruleJson');
    expect(res.headers.etag).toBeTruthy();
  });

  it('honors conditional GET (304) and busts the cache on content bump', async () => {
    const first = await app.inject({ method: 'GET', url: '/api/v1/presentations/p1/render?date=2026-06-25' });
    const etag = first.headers.etag as string;

    const notModified = await app.inject({
      method: 'GET',
      url: '/api/v1/presentations/p1/render?date=2026-06-25',
      headers: { 'if-none-match': etag },
    });
    expect(notModified.statusCode).toBe(304);

    const bumped = await bumpContentVersion(db);
    const afterBump = await app.inject({
      method: 'GET',
      url: '/api/v1/presentations/p1/render?date=2026-06-25',
      headers: { 'if-none-match': etag },
    });
    expect(afterBump.statusCode).toBe(200);
    expect(afterBump.headers.etag).not.toBe(etag);
    expect(afterBump.json().dataVersion).toBe(String(bumped));
  });

  it('GET /readings returns the day with stripped verse numbers and English references', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/readings?date=2026-10-23' });
    expect(res.statusCode).toBe(200);
    const day = res.json();
    expect(day.date).toMatchObject({ gregorian: '2026-10-23', ethiopian: '2019-02-13', dayOfWeek: 'Fri', isFastingDay: true, season: 'tsige' });
    expect(day.day).toMatchObject({ kind: 'ordinary', title: null, anaphora: 'ዘዮሐንስ አፈወርቅ', evangelist: 'ሉቃስ' });
    expect(day.readings.map((r: { key: string }) => r.key)).toEqual(['pauline', 'apostle', 'acts', 'misbak', 'gospel']);
    expect(day.readings[4].ref).toEqual({ raw: 'ሉቃስ ም 12 ቁ 26-32', en: 'Luke 12:26-32' });
    expect(day.readings[4].verses[0]).toEqual({ n: '26', text: { am: 'እንግዲህ ትንሹን ነገር', en: 'If ye then be not able' } });
    expect(day.readings[3].verses[0].text.gz).toContain('\n');
    expect(day.readings[0]).toMatchObject({ ref: { en: '2 Corinthians 9:1-10' }, verses: [] });
    expect(day.holidays.timket).toBe('2027-01-19');
    expect(res.headers.etag).toBeTruthy();

    const notModified = await app.inject({ method: 'GET', url: '/api/v1/readings?date=2026-10-23', headers: { 'if-none-match': res.headers.etag as string } });
    expect(notModified.statusCode).toBe(304);
  });

  it('GET /readings resolves a feast and ፍም from the last verse', async () => {
    const day = (await app.inject({ method: 'GET', url: '/api/v1/readings?date=2027-01-19' })).json();
    expect(day.day).toMatchObject({ kind: 'feast', title: 'ጥምቀት' });
    expect(day.readings[4].ref.en).toBe('Luke 3:21-38');
    expect(day.readings[0].ref).toBeNull();
  });

  it('GET /readings serves a range and rejects bad input', async () => {
    const range = await app.inject({ method: 'GET', url: '/api/v1/readings?from=2026-10-23&to=2026-10-25' });
    expect(range.statusCode).toBe(200);
    expect(range.json().days.map((d: { date: { gregorian: string } }) => d.date.gregorian)).toEqual(['2026-10-23', '2026-10-24', '2026-10-25']);
    expect((await app.inject({ method: 'GET', url: '/api/v1/readings?date=2026-13-01' })).statusCode).toBe(400);
    expect((await app.inject({ method: 'GET', url: '/api/v1/readings?from=2026-10-25&to=2026-10-23' })).statusCode).toBe(400);
    expect((await app.inject({ method: 'GET', url: '/api/v1/readings?from=2026-01-01&to=2027-02-05' })).statusCode).toBe(400);
  });

  it('GET /languages lists reading languages in their own script', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/languages' });
    expect(res.statusCode).toBe(200);
    expect(res.json().languages).toEqual([{ code: 'am', slot: 'Lang2', name: 'አማርኛ' }]);
  });

  it('returns 404 for an unknown presentation', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/presentations/nope/render' });
    expect(res.statusCode).toBe(404);
  });

  it('serves the OpenAPI spec and the Scalar reference UI', async () => {
    const spec = await app.inject({ method: 'GET', url: '/openapi.json' });
    expect(spec.statusCode).toBe(200);
    const doc = spec.json();
    expect(doc.openapi).toBeTruthy();
    expect(doc.paths['/api/v1/presentations/{id}/render']).toBeTruthy();

    const ref = await app.inject({ method: 'GET', url: '/docs/' });
    expect(ref.statusCode).toBe(200);
    expect(String(ref.headers['content-type'])).toContain('text/html');
  });
});
