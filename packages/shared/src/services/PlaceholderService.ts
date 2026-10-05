import { Variable } from '../domain/entities/Variable';
import { SlideBlock, SlideTitle } from '../domain/entities/Slide';
import { LANG_SLOTS, LANG_VALUE_FIELD_MAP, type LangSlot, type LangText } from '../domain/entities/Presentation';

export class PlaceholderService {
  /**
   * Replace all placeholders in text with variable values.
   * When langSlot is provided, @VarName variables use the per-language value.
   * When meta is provided, @meta.X.Y placeholders are resolved from the meta context.
   */
  replaceInText(text: string, variables: Variable[], langSlot?: LangSlot, meta?: Record<string, unknown>): string {
    let result = text;

    // Resolve @meta.X.Y placeholders first (longer paths before shorter to avoid partial matches)
    if (meta) {
      result = result.replace(/@meta\.([\w.]+)/g, (_match, path: string) => {
        const value = this.resolveMetaPath(meta, path);
        return value !== undefined ? String(value) : _match;
      });
    }

    for (const variable of variables) {
      const pattern = new RegExp(this.escapeRegex(variable.name), 'g');

      let replacement: string;
      if (langSlot && variable.name.startsWith('@')) {
        // @VarName: use per-language value, fall back to single value
        const langValue = this.getLangValue(variable, langSlot);
        replacement = langValue || variable.value;
      } else {
        // {{VAR}}: always use the single value
        replacement = variable.value;
      }

      result = result.replace(pattern, replacement);
    }

    return result;
  }

  /**
   * Replace placeholders in a slide block (language-aware for @VarName)
   */
  replaceInBlock(block: SlideBlock, variables: Variable[], meta?: Record<string, unknown>): SlideBlock {
    return this.replaceInLangText(block, variables, meta);
  }

  /**
   * Replace placeholders in a slide title (language-aware for @VarName)
   */
  replaceInTitle(title: SlideTitle, variables: Variable[], meta?: Record<string, unknown>): SlideTitle {
    return this.replaceInLangText(title, variables, meta);
  }

  private replaceInLangText(rec: LangText, variables: Variable[], meta?: Record<string, unknown>): LangText {
    const result: LangText = {};
    for (const slot of LANG_SLOTS) {
      const text = rec[slot];
      if (text) result[slot] = this.replaceInText(text, variables, slot, meta);
    }
    return result;
  }

  /**
   * Find all placeholders in text (both {{VAR}} and @VarName formats)
   */
  findPlaceholders(text: string): string[] {
    const matches: string[] = [];
    let match;

    // Legacy {{VAR}} pattern
    const legacyPattern = /\{\{([A-Z_]+)\}\}/g;
    while ((match = legacyPattern.exec(text)) !== null) {
      if (!matches.includes(match[0])) {
        matches.push(match[0]);
      }
    }

    // New @VarName pattern
    const atPattern = /@([A-Z_]+)/g;
    while ((match = atPattern.exec(text)) !== null) {
      if (!matches.includes(match[0])) {
        matches.push(match[0]);
      }
    }

    return matches;
  }

  /**
   * Find all placeholders in a slide
   */
  findPlaceholdersInSlide(slide: { titleJson?: SlideTitle; blocksJson: SlideBlock[] }): string[] {
    const allText: string[] = [];

    if (slide.titleJson) {
      allText.push(...LANG_SLOTS.map(slot => slide.titleJson![slot] || ''));
    }

    for (const block of slide.blocksJson) {
      allText.push(...LANG_SLOTS.map(slot => block[slot] || ''));
    }

    const placeholders = new Set<string>();
    for (const text of allText) {
      for (const placeholder of this.findPlaceholders(text)) {
        placeholders.add(placeholder);
      }
    }

    return Array.from(placeholders);
  }

  private getLangValue(variable: Variable, langSlot: LangSlot): string | undefined {
    return variable[LANG_VALUE_FIELD_MAP[langSlot]];
  }

  /**
   * Resolve a @meta.X.Y placeholder string against the meta context.
   * Returns the resolved string value, or undefined if not found.
   */
  resolveMetaPlaceholder(placeholder: string, meta: Record<string, unknown>): string | undefined {
    if (!placeholder.startsWith('@meta.')) return undefined;
    const path = placeholder.slice(6); // strip "@meta."
    const value = this.resolveMetaPath(meta, path);
    return value !== undefined ? String(value) : undefined;
  }

  /**
   * Resolve a dot-separated path from the meta context.
   * Supports both camelCase and snake_case keys (auto-converts snake_case to camelCase).
   */
  private resolveMetaPath(meta: Record<string, unknown>, path: string): unknown {
    const segments = path.split('.');
    let current: unknown = meta;

    for (const segment of segments) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }

      const obj = current as Record<string, unknown>;

      // Try exact key first
      if (segment in obj) {
        current = obj[segment];
      } else {
        // Try converting snake_case to camelCase
        const camelKey = segment.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
        if (camelKey in obj) {
          current = obj[camelKey];
        } else {
          return undefined;
        }
      }
    }

    return current;
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export const placeholderService = new PlaceholderService();
