import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import compress from '@fastify/compress';
import rateLimit from '@fastify/rate-limit';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import scalarApiReference from '@scalar/fastify-api-reference';
import { Db } from 'mongodb';
import type { Repositories, Presentation, LangSlot } from '@kidase/shared';
import { RenderService, getOrderedLanguages } from '@kidase/shared';
import { getContentVersion, bumpContentVersion } from './contentVersion';
import { RenderCache } from './renderCache';
import { createBackup, BackupData } from './backup';
import { importKidaseBackup } from './importer/kidaseImporter';

export interface BuildAppOptions {
  repos: Repositories;
  db: Db;
  renderMaxAge?: number;
  rateLimitMax?: number;
  adminEmail?: string;
  adminPassword?: string;
  jwtSecret?: string;
  appVersion?: string;
}

/** Viewer language codes for the picker badges, by slot. */
const LANG_CODE: Record<LangSlot, string> = {
  Lang1: 'geez',
  Lang2: 'amharic',
  Lang3: 'english',
  Lang4: 'tigrinya',
};

const LANG_SLOTS: LangSlot[] = ['Lang1', 'Lang2', 'Lang3', 'Lang4'];

function langCodes(p: Presentation): string[] {
  return LANG_SLOTS.filter(s => p.languageMap[s]).map(s => LANG_CODE[s]);
}

export async function buildApp(opts: BuildAppOptions): Promise<FastifyInstance> {
  // bodyLimit raised so /admin/restore can accept a full .kidase backup.
  const app = Fastify({ logger: false, bodyLimit: 64 * 1024 * 1024 });
  const renderService = new RenderService(opts.repos);
  const cache = new RenderCache();
  const maxAge = opts.renderMaxAge ?? 60;
  const adminEmail = opts.adminEmail ?? 'admin@church.org';
  const adminPassword = opts.adminPassword ?? 'changeme';
  const appVersion = opts.appVersion ?? '1.0.3';

  await app.register(cors, { origin: true });
  await app.register(compress, { global: true });
  await app.register(rateLimit, { max: opts.rateLimitMax ?? 120, timeWindow: '1 minute' });
  await app.register(jwt, { secret: opts.jwtSecret ?? 'dev-insecure-secret-change-me' });

  // OpenAPI document (generated from route schemas) + Scalar reference/testing UI.
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Kidase Presentation API',
        version: '1.0.3',
        description: 'Public read API for the Kidase web viewer. Render output is deterministic per (presentation, date, mehella) and HTTP-cacheable.',
      },
      tags: [
        { name: 'public', description: 'Public viewer endpoints' },
        { name: 'admin', description: 'Auth-protected admin endpoints (JWT bearer)' },
      ],
      components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
    },
  });
  await app.register(scalarApiReference, { routePrefix: '/docs' });
  app.get('/openapi.json', { schema: { hide: true } }, async () => app.swagger());

  function cacheHeaders(reply: FastifyReply, etag: string): void {
    reply.header('ETag', etag);
    reply.header('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=86400`);
  }

  app.get('/api/v1/health', { schema: { tags: ['public'], summary: 'Health check' } }, async () => ({ ok: true }));

  // Picker catalog — every presentation in the store.
  app.get('/api/v1/presentations', {
    schema: { tags: ['public'], summary: 'List the presentation catalog for the picker' },
  }, async (req, reply) => {
    const cv = await getContentVersion(opts.db);
    const etag = `"plist:${cv}"`;
    if (req.headers['if-none-match'] === etag) {
      cacheHeaders(reply, etag);
      return reply.code(304).send();
    }
    const all = await opts.repos.presentation.getAll();
    const list = await Promise.all(all.map(async p => ({
      id: p.id,
      name: p.name,
      type: p.type,
      slideCount: await opts.repos.slide.count(p.id),
      langs: langCodes(p),
      languages: getOrderedLanguages(p.languageSettings, p.languageMap),
    })));
    cacheHeaders(reply, etag);
    return list;
  });

  // Viewer config meta for one presentation.
  app.get<{ Params: { id: string } }>('/api/v1/presentations/:id', {
    schema: {
      tags: ['public'],
      summary: 'Viewer config meta for one presentation',
      params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    },
  }, async (req, reply) => {
    const cv = await getContentVersion(opts.db);
    const etag = `"pmeta:${cv}:${req.params.id}"`;
    if (req.headers['if-none-match'] === etag) {
      cacheHeaders(reply, etag);
      return reply.code(304).send();
    }
    const p = await opts.repos.presentation.getById(req.params.id);
    if (!p) {
      return reply.code(404).send({ error: 'Presentation not found' });
    }
    cacheHeaders(reply, etag);
    return {
      id: p.id,
      name: p.name,
      type: p.type,
      templateId: p.templateId,
      langs: langCodes(p),
      languages: getOrderedLanguages(p.languageSettings, p.languageMap),
      defaultConfig: { isMehella: false },
    };
  });

  // The heavy, deterministic, cacheable render.
  app.get<{ Params: { id: string }; Querystring: { date?: string; mehella?: string } }>(
    '/api/v1/presentations/:id/render',
    {
      schema: {
        tags: ['public'],
        summary: 'Render a presentation for a date (deterministic, cacheable)',
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        querystring: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'Service date, YYYY-MM-DD (defaults to today)' },
            mehella: { type: 'string', description: '"1"/"true" for the Mehella variant', enum: ['0', '1', 'true', 'false'] },
          },
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params;
      const date = req.query.date;
      const mehella = req.query.mehella === '1' || req.query.mehella === 'true';
      const cv = await getContentVersion(opts.db);
      const key = `${cv}:${id}:${date ?? ''}:${mehella ? 1 : 0}`;
      const etag = `"${key}"`;

      if (req.headers['if-none-match'] === etag) {
        cacheHeaders(reply, etag);
        return reply.code(304).send();
      }

      const cached = cache.get(key);
      if (cached) {
        cacheHeaders(reply, cached.etag);
        reply.header('content-type', 'application/json; charset=utf-8');
        return reply.send(cached.body);
      }

      let result;
      try {
        result = await renderService.render({ presentationId: id, date, isMehella: mehella });
      } catch {
        return reply.code(404).send({ error: 'Presentation not found' });
      }

      const body = JSON.stringify({ ...result, dataVersion: String(cv) });
      cache.set(key, { etag, body });
      cacheHeaders(reply, etag);
      reply.header('content-type', 'application/json; charset=utf-8');
      return reply.send(body);
    },
  );

  // ---- Admin (JWT-protected) ----
  async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
    try { await req.jwtVerify(); } catch { return reply.code(401).send({ error: 'Unauthorized' }); }
  }

  app.post<{ Body: { email?: string; password?: string } }>('/api/v1/admin/login', {
    schema: {
      tags: ['admin'], summary: 'Sign in — returns a JWT bearer token',
      body: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string' }, password: { type: 'string' } } },
    },
  }, async (req, reply) => {
    const { email, password } = req.body ?? {};
    if (email !== adminEmail || password !== adminPassword) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }
    const token = app.jwt.sign({ sub: email, role: 'admin' }, { expiresIn: '12h' });
    return { token, tokenType: 'Bearer', expiresIn: 43200 };
  });

  app.get('/api/v1/admin/backup', {
    preHandler: requireAdmin,
    schema: { tags: ['admin'], summary: 'Download a full .kidase backup of all collections', security: [{ bearerAuth: [] }] },
  }, async (_req, reply) => {
    const backup = await createBackup(opts.db, appVersion);
    reply.header('content-type', 'application/json; charset=utf-8');
    reply.header('content-disposition', `attachment; filename="kidase-backup-${backup.createdAt.slice(0, 10)}.kidase"`);
    return backup;
  });

  app.post<{ Body: BackupData }>('/api/v1/admin/restore', {
    preHandler: requireAdmin,
    schema: {
      tags: ['admin'], summary: 'Restore a .kidase backup (replaces all data)',
      security: [{ bearerAuth: [] }],
      body: { type: 'object', additionalProperties: true },
    },
  }, async (req, reply) => {
    if (!req.body?.data || typeof req.body.data !== 'object') {
      return reply.code(400).send({ error: 'Invalid backup: missing data' });
    }
    const counts = await importKidaseBackup(opts.db, req.body);
    const contentVersion = await bumpContentVersion(opts.db);
    return { counts, contentVersion };
  });

  return app;
}
