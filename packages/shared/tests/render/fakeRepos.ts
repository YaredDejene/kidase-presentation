import type { Repositories } from '../../src/domain/interfaces/Repositories';
import type { Presentation } from '../../src/domain/entities/Presentation';
import type { Slide } from '../../src/domain/entities/Slide';
import type { Template } from '../../src/domain/entities/Template';
import type { Variable } from '../../src/domain/entities/Variable';
import type { RuleDefinition } from '../../src/domain/entities/RuleDefinition';
import type { Gitsawe } from '../../src/domain/entities/Gitsawe';
import type { Verse } from '../../src/domain/entities/Verse';
import type { AppSettings } from '../../src/domain/entities/AppSettings';
import { defaultAppSettings } from '../../src/domain/entities/AppSettings';

export interface SeedData {
  presentations?: Presentation[];
  slides?: Slide[];
  templates?: Template[];
  variables?: Variable[];
  rules?: RuleDefinition[];
  gitsawes?: Gitsawe[];
  verses?: Verse[];
  appSettings?: AppSettings;
}

/**
 * In-memory Repositories for testing the RenderService. Implements only the
 * read methods the RenderService calls; everything else throws if touched.
 */
export function fakeRepositories(seed: SeedData): Repositories {
  const presentations = seed.presentations ?? [];
  const slides = seed.slides ?? [];
  const templates = seed.templates ?? [];
  const variables = seed.variables ?? [];
  const rules = seed.rules ?? [];
  const gitsawes = seed.gitsawes ?? [];
  const verses = seed.verses ?? [];
  const appSettings = seed.appSettings ?? defaultAppSettings;

  return {
    presentation: {
      getById: async (id: string) => presentations.find(p => p.id === id) ?? null,
      getByName: async (name: string) => presentations.find(p => p.name === name) ?? null,
      getAll: async () => presentations,
      getActive: async () => presentations.find(p => p.isActive) ?? null,
      getPrimary: async () => presentations.find(p => p.isPrimary) ?? null,
    } as unknown as Repositories['presentation'],
    slide: {
      getByPresentationId: async (pid: string) =>
        slides.filter(s => s.presentationId === pid).sort((a, b) => a.slideOrder - b.slideOrder),
    } as unknown as Repositories['slide'],
    template: {
      getById: async (id: string) => templates.find(t => t.id === id) ?? null,
      getAll: async () => templates,
    } as unknown as Repositories['template'],
    variable: {
      getByPresentationId: async (pid: string) => variables.filter(v => v.presentationId === pid),
    } as unknown as Repositories['variable'],
    rule: {
      getByPresentationId: async (pid: string) => rules.filter(r => r.presentationId === pid),
      getEnabled: async () => rules.filter(r => r.isEnabled),
    } as unknown as Repositories['rule'],
    gitsawe: {
      getAll: async () => gitsawes,
    } as unknown as Repositories['gitsawe'],
    verse: {
      getAll: async () => verses,
      getBySegmentId: async (segmentId: string) => verses.filter(v => v.segmentId === segmentId),
    } as unknown as Repositories['verse'],
    appSettings: {
      get: async () => appSettings,
    } as unknown as Repositories['appSettings'],
  };
}
