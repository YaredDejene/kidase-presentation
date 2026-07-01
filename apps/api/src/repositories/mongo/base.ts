import { v4 as uuidv4 } from 'uuid';

export type Doc = Record<string, unknown>;

/** Drop keys whose value is `undefined` so Mongo stores clean documents. */
export function stripUndefined<T extends Doc>(obj: T): T {
  const out: Doc = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}

/**
 * Entities use a string `id`; Mongo uses `_id`. Storage is otherwise identity
 * (entities are already camelCase nested objects with native booleans), so the
 * mapping is just `id` <-> `_id`. Backup-format conversion (snake_case, 1/0,
 * JSON-strings) lives in the .kidase importer, not here.
 */
export function entityToDoc<T extends { id: string }>(entity: T): Doc {
  const { id, ...rest } = entity;
  return stripUndefined({ _id: id, ...rest });
}

export function docToEntity<T extends { id: string }>(doc: Doc | null): T | null {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: _id as string, ...rest } as T;
}

export { uuidv4 };
