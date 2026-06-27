interface Entry {
  etag: string;
  body: string;
}

/** Tiny LRU for serialized render payloads, keyed by contentVersion:id:date:mehella. */
export class RenderCache {
  private readonly map = new Map<string, Entry>();
  constructor(private readonly max = 200) {}

  get(key: string): Entry | undefined {
    const v = this.map.get(key);
    if (v) {
      // refresh recency
      this.map.delete(key);
      this.map.set(key, v);
    }
    return v;
  }

  set(key: string, entry: Entry): void {
    if (this.map.size >= this.max) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, entry);
  }

  clear(): void {
    this.map.clear();
  }
}
