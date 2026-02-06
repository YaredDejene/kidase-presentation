import { RuleContext, ResolvedValue } from './types';

export class RefResolver {
  /** Resolve a dotted path against the context object */
  resolve(path: string, context: RuleContext): unknown {
    const segments = path.split('.');
    let current: unknown = context;

    for (const segment of segments) {
      if (current === null || current === undefined) return undefined;
      if (typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[segment];
    }

    return current;
  }

  /** Resolve a ResolvedValue to its concrete value */
  resolveValue(rv: ResolvedValue, context: RuleContext): unknown {
    switch (rv.kind) {
      case 'literal':
        return rv.value;
      case 'ref':
        return this.resolve(rv.path, context);
      case 'array':
        return rv.items.map(item => this.resolveValue(item, context));
    }
  }

  /** Check if a dotted path exists in context */
  pathExists(path: string, context: RuleContext): boolean {
    const segments = path.split('.');
    let current: unknown = context;

    for (const segment of segments) {
      if (current === null || current === undefined) return false;
      if (typeof current !== 'object') return false;
      if (!(segment in (current as Record<string, unknown>))) return false;
      current = (current as Record<string, unknown>)[segment];
    }

    return true;
  }
}
