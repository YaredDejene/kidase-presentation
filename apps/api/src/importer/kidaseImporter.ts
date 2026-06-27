import { Db } from 'mongodb';
import { COLLECTIONS } from '../repositories/mongo';
import { Doc, stripUndefined } from '../repositories/mongo/base';

/**
 * A `.kidase` backup: a `BackupService` dump of the 8 tables. Rows are raw
 * SQLite rows (snake_case columns, 1/0 booleans, JSON-string columns). The
 * mappers below also accept already-camelCased rows so a Mongo-origin backup
 * (Phase 4) restores too.
 */
export interface KidaseBackup {
  version?: number;
  createdAt?: string;
  appVersion?: string;
  schemaVersion?: number;
  data: Record<string, Record<string, unknown>[]>;
}

export interface ImportCounts {
  [collection: string]: number;
}

type Row = Record<string, unknown>;

/** First defined value among the given keys (snake_case or camelCase). */
function pick(row: Row, ...keys: string[]): unknown {
  for (const k of keys) {
    if (row[k] !== undefined) return row[k];
  }
  return undefined;
}

function toBool(v: unknown): boolean {
  return v === 1 || v === true || v === '1' || v === 'true';
}

function toStr(v: unknown): string | undefined {
  return v === null || v === undefined || v === '' ? undefined : String(v);
}

function toJson<T>(v: unknown, fallback: T): T {
  if (v === null || v === undefined) return fallback;
  if (typeof v === 'string') {
    try { return JSON.parse(v) as T; } catch { return fallback; }
  }
  return v as T;
}

const MAPPERS: Record<string, (row: Row) => Doc> = {
  [COLLECTIONS.templates]: row => ({
    _id: pick(row, 'id'),
    name: pick(row, 'name'),
    maxLangCount: pick(row, 'max_lang_count', 'maxLangCount'),
    definitionJson: toJson(pick(row, 'definition_json', 'definitionJson'), {}),
    createdAt: pick(row, 'created_at', 'createdAt'),
  }),
  [COLLECTIONS.presentations]: row => ({
    _id: pick(row, 'id'),
    name: pick(row, 'name'),
    type: pick(row, 'type'),
    templateId: pick(row, 'template_id', 'templateId'),
    languageMap: toJson(pick(row, 'language_map', 'languageMap'), {}),
    languageSettings: pick(row, 'language_settings', 'languageSettings')
      ? toJson(pick(row, 'language_settings', 'languageSettings'), undefined)
      : undefined,
    isPrimary: toBool(pick(row, 'is_primary', 'isPrimary')),
    isActive: toBool(pick(row, 'is_active', 'isActive')),
    createdAt: pick(row, 'created_at', 'createdAt'),
  }),
  [COLLECTIONS.slides]: row => ({
    _id: pick(row, 'id'),
    presentationId: pick(row, 'presentation_id', 'presentationId'),
    slideOrder: Number(pick(row, 'slide_order', 'slideOrder') ?? 0),
    lineId: toStr(pick(row, 'line_id', 'lineId')),
    titleJson: pick(row, 'title_json', 'titleJson') ? toJson(pick(row, 'title_json', 'titleJson'), undefined) : undefined,
    blocksJson: toJson(pick(row, 'blocks_json', 'blocksJson'), []),
    footerJson: pick(row, 'footer_json', 'footerJson') ? toJson(pick(row, 'footer_json', 'footerJson'), undefined) : undefined,
    notes: toStr(pick(row, 'notes')),
    isDisabled: toBool(pick(row, 'is_disabled', 'isDisabled')),
    isDynamic: toBool(pick(row, 'is_dynamic', 'isDynamic')),
    templateOverrideId: toStr(pick(row, 'template_override_id', 'templateOverrideId')),
  }),
  [COLLECTIONS.variables]: row => ({
    _id: pick(row, 'id'),
    presentationId: pick(row, 'presentation_id', 'presentationId'),
    name: pick(row, 'name'),
    value: pick(row, 'value'),
    valueLang1: toStr(pick(row, 'value_lang1', 'valueLang1')),
    valueLang2: toStr(pick(row, 'value_lang2', 'valueLang2')),
    valueLang3: toStr(pick(row, 'value_lang3', 'valueLang3')),
    valueLang4: toStr(pick(row, 'value_lang4', 'valueLang4')),
  }),
  [COLLECTIONS.rules]: row => ({
    _id: pick(row, 'id'),
    name: pick(row, 'name'),
    scope: pick(row, 'scope'),
    presentationId: toStr(pick(row, 'presentation_id', 'presentationId')),
    slideId: toStr(pick(row, 'slide_id', 'slideId')),
    gitsaweId: toStr(pick(row, 'gitsawe_id', 'gitsaweId')),
    ruleJson: String(pick(row, 'rule_json', 'ruleJson') ?? ''),
    isEnabled: toBool(pick(row, 'is_enabled', 'isEnabled')),
    createdAt: pick(row, 'created_at', 'createdAt'),
  }),
  [COLLECTIONS.gitsawes]: row => ({
    _id: pick(row, 'id'),
    lineId: pick(row, 'line_id', 'lineId'),
    name: toStr(pick(row, 'name')),
    additionalInfo: toStr(pick(row, 'additional_info', 'additionalInfo')),
    messageStPaul: toStr(pick(row, 'message_st_paul', 'messageStPaul')),
    messageApostle: toStr(pick(row, 'message_apostle', 'messageApostle')),
    messageBookOfActs: toStr(pick(row, 'message_book_of_acts', 'messageBookOfActs')),
    misbak: toStr(pick(row, 'misbak')),
    wengel: toStr(pick(row, 'wengel')),
    kidaseType: toStr(pick(row, 'kidase_type', 'kidaseType')),
    evangelist: toStr(pick(row, 'evangelist')),
    messageApostleEvangelist: toStr(pick(row, 'message_apostle_evangelist', 'messageApostleEvangelist')),
    gitsaweType: toStr(pick(row, 'gitsawe_type', 'gitsaweType')),
    priority: Number(pick(row, 'priority') ?? 0),
    createdAt: pick(row, 'created_at', 'createdAt'),
  }),
  [COLLECTIONS.verses]: row => ({
    _id: pick(row, 'id'),
    segmentId: pick(row, 'segment_id', 'segmentId'),
    verseOrder: Number(pick(row, 'verse_order', 'verseOrder') ?? 0),
    titleLang1: toStr(pick(row, 'title_lang1', 'titleLang1')),
    titleLang2: toStr(pick(row, 'title_lang2', 'titleLang2')),
    titleLang3: toStr(pick(row, 'title_lang3', 'titleLang3')),
    titleLang4: toStr(pick(row, 'title_lang4', 'titleLang4')),
    textLang1: toStr(pick(row, 'text_lang1', 'textLang1')),
    textLang2: toStr(pick(row, 'text_lang2', 'textLang2')),
    textLang3: toStr(pick(row, 'text_lang3', 'textLang3')),
    textLang4: toStr(pick(row, 'text_lang4', 'textLang4')),
    createdAt: pick(row, 'created_at', 'createdAt'),
  }),
  [COLLECTIONS.appSettings]: row => ({
    _id: pick(row, 'key', '_id'),
    value: String(pick(row, 'value') ?? ''),
  }),
};

/** Maps a backup table name (matches the SQLite tables) to its collection. */
const TABLE_TO_COLLECTION: Record<string, string> = {
  templates: COLLECTIONS.templates,
  presentations: COLLECTIONS.presentations,
  slides: COLLECTIONS.slides,
  variables: COLLECTIONS.variables,
  rule_definitions: COLLECTIONS.rules,
  gitsawes: COLLECTIONS.gitsawes,
  verses: COLLECTIONS.verses,
  app_settings: COLLECTIONS.appSettings,
};

/** Insert order respecting referential dependencies (templates before presentations, etc.). */
const TABLE_ORDER = ['templates', 'presentations', 'slides', 'variables', 'gitsawes', 'verses', 'rule_definitions', 'app_settings'];

/**
 * Restore a `.kidase` backup into MongoDB: clears the 8 collections, then maps
 * and inserts every row preserving original ids and foreign keys. The supported
 * desktop -> server content path. Returns per-collection insert counts.
 */
export async function importKidaseBackup(db: Db, backup: KidaseBackup): Promise<ImportCounts> {
  if (!backup?.data || typeof backup.data !== 'object') {
    throw new Error('Invalid backup: missing data');
  }

  const counts: ImportCounts = {};

  // Clear all known collections first (full replace, like desktop restore).
  await Promise.all(Object.values(COLLECTIONS).map(c => db.collection(c).deleteMany({})));

  for (const table of TABLE_ORDER) {
    const rows = backup.data[table];
    if (!rows || rows.length === 0) continue;
    const collection = TABLE_TO_COLLECTION[table];
    const mapper = MAPPERS[collection];
    const docs = rows.map(r => stripUndefined(mapper(r)));
    if (docs.length > 0) {
      await db.collection(collection).insertMany(docs as never);
      counts[collection] = docs.length;
    }
  }

  return counts;
}
