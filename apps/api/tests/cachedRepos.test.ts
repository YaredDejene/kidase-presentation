import { describe, it, expect } from 'vitest';
import type { Repositories } from '@kidase/shared';
import { cachedRepositories } from '../src/cachedRepos';

describe('cachedRepositories', () => {
  it('memoizes reads per content version and passes writes through', async () => {
    let reads = 0, writes = 0;
    const source = {
      template: {
        getAll: async () => { reads++; return [{ id: 't' }]; },
        getById: async (id: string) => { reads++; return { id }; },
        update: async () => { writes++; },
      },
    } as unknown as Repositories;
    const cached = cachedRepositories(source);

    const r = cached.atVersion(1);
    await r.template.getAll(); await r.template.getAll();
    await r.template.getById('a'); await r.template.getById('a'); await r.template.getById('b');
    expect(reads).toBe(3);

    await r.template.update('a', {}); await r.template.update('a', {});
    expect(writes).toBe(2);

    cached.atVersion(1);
    await r.template.getAll();
    expect(reads).toBe(3);

    cached.atVersion(2);
    await r.template.getAll();
    expect(reads).toBe(4);
  });
});
