import { Db } from 'mongodb';
import type { Repositories } from '@kidase/shared';
import { MongoTemplateRepository } from './MongoTemplateRepository';
import { MongoPresentationRepository } from './MongoPresentationRepository';
import { MongoSlideRepository } from './MongoSlideRepository';
import { MongoVariableRepository } from './MongoVariableRepository';
import { MongoRuleRepository } from './MongoRuleRepository';
import { MongoGitsaweRepository } from './MongoGitsaweRepository';
import { MongoVerseRepository } from './MongoVerseRepository';
import { MongoAppSettingsRepository } from './MongoAppSettingsRepository';

/** Mongo collection names — mirror the desktop SQLite tables 1:1. */
export const COLLECTIONS = {
  templates: 'templates',
  presentations: 'presentations',
  slides: 'slides',
  variables: 'variables',
  rules: 'rule_definitions',
  gitsawes: 'gitsawes',
  verses: 'verses',
  appSettings: 'app_settings',
} as const;

/** Build the injected Repositories container backed by MongoDB. */
export function createMongoRepositories(db: Db): Repositories {
  return {
    template: new MongoTemplateRepository(db.collection(COLLECTIONS.templates)),
    presentation: new MongoPresentationRepository(db.collection(COLLECTIONS.presentations)),
    slide: new MongoSlideRepository(db.collection(COLLECTIONS.slides)),
    variable: new MongoVariableRepository(db.collection(COLLECTIONS.variables)),
    rule: new MongoRuleRepository(db.collection(COLLECTIONS.rules)),
    gitsawe: new MongoGitsaweRepository(db.collection(COLLECTIONS.gitsawes)),
    verse: new MongoVerseRepository(db.collection(COLLECTIONS.verses)),
    appSettings: new MongoAppSettingsRepository(db.collection(COLLECTIONS.appSettings)),
  };
}

/** Create the indexes that keep cold render loads cheap (see plan §API efficiency). */
export async function ensureIndexes(db: Db): Promise<void> {
  await Promise.all([
    db.collection(COLLECTIONS.slides).createIndex({ presentationId: 1, slideOrder: 1 }),
    db.collection(COLLECTIONS.verses).createIndex({ segmentId: 1, verseOrder: 1 }),
    db.collection(COLLECTIONS.gitsawes).createIndex({ priority: 1 }),
    // Non-unique: real liturgical data may repeat or omit lineId; uniqueness isn't
    // required for correctness, only lookup speed (getByLineId).
    db.collection(COLLECTIONS.gitsawes).createIndex({ lineId: 1 }),
    db.collection(COLLECTIONS.rules).createIndex({ presentationId: 1 }),
    db.collection(COLLECTIONS.rules).createIndex({ scope: 1, gitsaweId: 1, isEnabled: 1 }),
    db.collection(COLLECTIONS.presentations).createIndex({ name: 1 }),
    db.collection(COLLECTIONS.presentations).createIndex({ isActive: 1 }),
    db.collection(COLLECTIONS.presentations).createIndex({ isPrimary: 1 }),
  ]);
}
