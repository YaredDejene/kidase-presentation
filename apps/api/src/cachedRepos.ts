import type { Repositories } from '@kidase/shared';

/**
 * Memoizes repository reads per content version, so a cold render costs one
 * round trip (the version check) instead of a dozen to Atlas. Every write
 * path bumps the content version, and a new version empties the cache.
 * Reads are any method named get* or count*; everything else passes through.
 */
export function cachedRepositories(source: Repositories): { repos: Repositories; atVersion(v: number): Repositories } {
  let version: number | undefined;
  const cache = new Map<string, Promise<unknown>>();

  const wrap = <T extends object>(name: string, repo: T): T => new Proxy(repo, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== 'function') return value;
      if (!/^(get|count)/.test(String(prop))) return value.bind(target);
      return (...args: unknown[]) => {
        const key = `${name}.${String(prop)}:${JSON.stringify(args)}`;
        let hit = cache.get(key);
        if (!hit) {
          hit = Promise.resolve(value.apply(target, args));
          cache.set(key, hit);
          hit.catch(() => cache.delete(key));
        }
        return hit;
      };
    },
  });

  const repos = Object.fromEntries(
    Object.entries(source).map(([k, r]) => [k, wrap(k, r as object)]),
  ) as unknown as Repositories;

  return {
    repos,
    atVersion(v) {
      if (v !== version) { version = v; cache.clear(); }
      return repos;
    },
  };
}
