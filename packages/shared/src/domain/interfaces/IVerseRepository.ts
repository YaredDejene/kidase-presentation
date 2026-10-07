import { Verse } from '../entities/Verse';

export interface IVerseRepository {
  getAll(): Promise<Verse[]>;
  getById(id: string): Promise<Verse | null>;
  getBySegmentId(segmentId: string): Promise<Verse[]>;
  create(verse: Omit<Verse, 'id' | 'createdAt'>): Promise<Verse>;
  createMany(verses: Omit<Verse, 'id' | 'createdAt'>[]): Promise<Verse[]>;
  /** Insert or update by (segmentId, verseOrder); rows not in the input are left untouched. */
  upsertMany(verses: Omit<Verse, 'id' | 'createdAt'>[]): Promise<void>;
  update(id: string, verse: Partial<Omit<Verse, 'id' | 'createdAt'>>): Promise<Verse>;
  delete(id: string): Promise<void>;
  count(): Promise<number>;
}
