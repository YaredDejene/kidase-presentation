import { Db } from 'mongodb';

const META = 'meta';
const ID = 'content';

/**
 * Monotonic content version, bumped on every import/restore. Embedded in ETags
 * and render cache keys so a content push invalidates all caches automatically.
 */
export async function getContentVersion(db: Db): Promise<number> {
  const doc = await db.collection(META).findOne({ _id: ID as never });
  return (doc?.version as number | undefined) ?? 0;
}

export async function bumpContentVersion(db: Db): Promise<number> {
  const doc = await db.collection(META).findOneAndUpdate(
    { _id: ID as never },
    { $inc: { version: 1 } },
    { upsert: true, returnDocument: 'after' },
  );
  return (doc?.version as number | undefined) ?? 1;
}
