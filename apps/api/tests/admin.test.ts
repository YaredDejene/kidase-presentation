import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db } from 'mongodb';
import type { FastifyInstance } from 'fastify';
import { createMongoRepositories, ensureIndexes } from '../src/repositories/mongo';
import { importKidaseBackup, KidaseBackup } from '../src/importer/kidaseImporter';
import { buildApp } from '../src/app';

const templateDef = {
  layout: { columns: 1, rows: 1, gap: 16, verticalAlign: 'center' },
  title: { show: true, fontSize: 48, color: '#fff', alignment: 'center' },
  languages: [{ slot: 'Lang1', fontSize: 40, fontFamily: 'Noto', color: '#fff', alignment: 'center', lineHeight: 1.3 }],
  background: { color: '#000' }, margins: { top: 40, right: 40, bottom: 40, left: 40 }, safeArea: { horizontal: 0, vertical: 0 },
};
const backup: KidaseBackup = {
  data: {
    templates: [{ id: 't1', name: 'Default', max_lang_count: 4, definition_json: JSON.stringify(templateDef), created_at: '2026-01-01' }],
    presentations: [{ id: 'p1', name: 'Kidase', type: 'Kidase', template_id: 't1', language_map: JSON.stringify({ Lang1: "Ge'ez" }), is_primary: 1, is_active: 1, created_at: '2026-01-01' }],
    slides: [{ id: 's1', presentation_id: 'p1', slide_order: 0, blocks_json: JSON.stringify([{ Lang1: 'Hi' }]), is_disabled: 0, is_dynamic: 0 }],
    app_settings: [{ key: 'theme', value: 'light' }],
  },
};

const ADMIN = { email: 'admin@test.org', password: 'secret123' };
let mongod: MongoMemoryServer; let client: MongoClient; let db: Db; let app: FastifyInstance;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  client = new MongoClient(mongod.getUri()); await client.connect();
  db = client.db('test'); await ensureIndexes(db);
  await importKidaseBackup(db, backup);
  app = await buildApp({ repos: createMongoRepositories(db), db, adminEmail: ADMIN.email, adminPassword: ADMIN.password, jwtSecret: 'test-secret' });
  await app.ready();
});
afterAll(async () => { await app?.close(); await client?.close(); await mongod?.stop(); });

async function login(): Promise<string> {
  const res = await app.inject({ method: 'POST', url: '/api/v1/admin/login', payload: ADMIN });
  return res.json().token as string;
}

describe('admin auth + backup/restore', () => {
  it('rejects bad credentials and issues a token for valid ones', async () => {
    const bad = await app.inject({ method: 'POST', url: '/api/v1/admin/login', payload: { email: ADMIN.email, password: 'wrong' } });
    expect(bad.statusCode).toBe(401);
    const ok = await app.inject({ method: 'POST', url: '/api/v1/admin/login', payload: ADMIN });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().token).toBeTruthy();
  });

  it('protects backup/restore (401 without a token)', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/v1/admin/backup' })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/api/v1/admin/restore', payload: backup })).statusCode).toBe(401);
  });

  it('backs up all collections with a valid token', async () => {
    const token = await login();
    const res = await app.inject({ method: 'GET', url: '/api/v1/admin/backup', headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.presentations).toHaveLength(1);
    expect(body.data.slides).toHaveLength(1);
    expect(body.data.app_settings).toHaveLength(1);
    expect(String(res.headers['content-disposition'])).toContain('.kidase');
  });

  it('round-trips: backup → wipe → restore replaces all data and bumps contentVersion', async () => {
    const token = await login();
    const auth = { authorization: `Bearer ${token}` };
    const dump = (await app.inject({ method: 'GET', url: '/api/v1/admin/backup', headers: auth })).json();

    await db.collection('presentations').deleteMany({});
    await db.collection('slides').deleteMany({});

    const res = await app.inject({ method: 'POST', url: '/api/v1/admin/restore', headers: auth, payload: dump });
    expect(res.statusCode).toBe(200);
    const out = res.json();
    expect(out.counts.presentations).toBe(1);
    expect(out.contentVersion).toBeGreaterThanOrEqual(1);

    const repos = createMongoRepositories(db);
    const restored = await repos.presentation.getById('p1');
    expect(restored).toMatchObject({ name: 'Kidase', isPrimary: true });
  });
});
