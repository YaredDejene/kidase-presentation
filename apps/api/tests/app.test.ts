import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db } from 'mongodb';
import type { FastifyInstance } from 'fastify';
import { createMongoRepositories, ensureIndexes } from '../src/repositories/mongo';
import { importKidaseBackup, KidaseBackup } from '../src/importer/kidaseImporter';
import { buildApp } from '../src/app';
import { bumpContentVersion } from '../src/contentVersion';

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
    presentations: [{ id: 'p1', name: 'Kidase', type: 'Kidase', template_id: 't1', language_map: JSON.stringify({ Lang1: "Ge'ez" }), language_settings: null, is_primary: 1, is_active: 1, created_at: '2026-01-01' }],
    slides: [
      { id: 's2', presentation_id: 'p1', slide_order: 0, blocks_json: JSON.stringify([{ Lang1: 'First' }]), is_disabled: 0, is_dynamic: 0 },
      { id: 's1', presentation_id: 'p1', slide_order: 1, blocks_json: JSON.stringify([{ Lang1: 'Hello {{NAME}}' }]), is_disabled: 0, is_dynamic: 0 },
    ],
    variables: [{ id: 'v1', presentation_id: 'p1', name: '{{NAME}}', value: 'World' }],
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
    expect(list[0]).toMatchObject({ id: 'p1', name: 'Kidase', type: 'Kidase', slideCount: 2, langs: ['geez'] });
  });

  it('GET /:id/render returns resolved, display-ready slides with no engine data', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/presentations/p1/render?date=2026-06-25' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.presentation.name).toBe('Kidase');
    expect(body.slides.map((s: { id: string }) => s.id)).toEqual(['s2', 's1']);
    expect(body.slides[1].block.Lang1).toBe('Hello World');
    expect(body.templates.t1).toBeTruthy();
    expect(body.dataVersion).toBe('1');
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

    await bumpContentVersion(db);
    const afterBump = await app.inject({
      method: 'GET',
      url: '/api/v1/presentations/p1/render?date=2026-06-25',
      headers: { 'if-none-match': etag },
    });
    expect(afterBump.statusCode).toBe(200);
    expect(afterBump.headers.etag).not.toBe(etag);
    expect(afterBump.json().dataVersion).toBe('2');
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
