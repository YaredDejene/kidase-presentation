/**
 * Template Entity
 * Represents a slide template with layout and styling information
 */

import type { LangSlot, OrderedLanguage } from './Presentation';

export interface TemplateDefinition {
  layout: {
    columns: number;
    rows: number;
    gap: number;
    verticalAlign: 'top' | 'center' | 'bottom';
  };
  title: {
    show: boolean;
    fontSize: number;
    color: string;
    alignment: 'left' | 'center' | 'right';
  };
  /**
   * Style rows, applied by display position: the first shown language gets row 1, and so on.
   * The row count is how many languages the template shows at once.
   * `slot` is kept only so a language without its own color keeps the color it had in this row.
   */
  languages: {
    slot?: LangSlot;
    fontSize: number;
    fontFamily: string;
    color: string;
    alignment: 'left' | 'center' | 'right' | 'justify';
    lineHeight: number;
  }[];
  background: {
    color: string;
  };
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  safeArea: {
    horizontal: number;
    vertical: number;
  };
}

export type TemplateLanguageStyle = TemplateDefinition['languages'][number];

/** A template style row bound to the language it renders. */
export type EnabledLanguage = TemplateLanguageStyle & { slot: LangSlot };

/**
 * Pairs the languages to show (in display order) with the template's style rows by position.
 * Languages beyond the template's row count are not shown. Color follows the language, not the row.
 */
export function templateLanguages(def: TemplateDefinition, langs: Pick<OrderedLanguage, 'slot' | 'color'>[]): EnabledLanguage[] {
  return langs.slice(0, def.languages.length).map(({ slot, color }, i) => ({
    ...def.languages[i],
    slot,
    color: color ?? def.languages.find(l => l.slot === slot)?.color ?? def.languages[i].color,
  }));
}

/** Template used for new and imported presentations. Change this to switch the default. */
export const DEFAULT_TEMPLATE_NAME = 'Default Template';

/** The default template from a list (or the first one if it is missing). */
export function findDefaultTemplate<T extends { name: string }>(templates: T[]): T | undefined {
  return templates.find(t => t.name === DEFAULT_TEMPLATE_NAME) ?? templates[0];
}

export interface Template {
  id: string;
  name: string;
  maxLangCount: number;
  definitionJson: TemplateDefinition;
  createdAt: string;
}
