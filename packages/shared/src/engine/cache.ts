import { NormalizedRule } from './types';

interface CacheEntry {
  rule: NormalizedRule;
  timestamp: number;
}

export class ASTCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number;
  private ttlMs: number;

  constructor(maxSize = 256, ttlMs = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  get(id: string): NormalizedRule | undefined {
    const entry = this.cache.get(id);
    if (!entry) return undefined;

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(id);
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(id);
    this.cache.set(id, entry);

    return entry.rule;
  }

  set(id: string, rule: NormalizedRule): void {
    // Remove if already exists (to update position)
    this.cache.delete(id);

    // Evict LRU if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(id, { rule, timestamp: Date.now() });
  }

  has(id: string): boolean {
    return this.get(id) !== undefined;
  }

  invalidate(id: string): void {
    this.cache.delete(id);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}
