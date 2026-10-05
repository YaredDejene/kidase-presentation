/**
 * Presentation Entity
 * Represents a complete presentation with metadata.
 *
 * "Kidase" is the user-facing term for a Presentation. All liturgical content
 * (Kidase, Mahlet, Seatat, etc.) is stored as a Presentation entity with a
 * `type` field indicating its specific liturgical category.
 */

/** Ordered array of all language slots. Every per-language list in the app derives from this. */
export const LANG_SLOTS = ['Lang1', 'Lang2', 'Lang3', 'Lang4', 'Lang5', 'Lang6', 'Lang7', 'Lang8'] as const;

/** Language slot identifiers used across the app */
export type LangSlot = (typeof LANG_SLOTS)[number];

/** Each slot's color when neither the language nor the template sets one. Bright enough for a black slide. */
export const DEFAULT_LANG_COLORS: Record<LangSlot, string> = {
  Lang1: '#FFFFFF',
  Lang2: '#FFFF00',
  Lang3: '#00FF00',
  Lang4: '#00BFFF',
  Lang5: '#FFA500',
  Lang6: '#FF69B4',
  Lang7: '#B388FF',
  Lang8: '#FF6B6B',
};

/** Any per-slot record of text: slide title/blocks/footer, language names, etc. */
export type LangText = Partial<Record<LangSlot, string>>;

/** First non-empty value in slot order, e.g. for previews and character-count estimates. */
export function firstText(rec: LangText | null | undefined): string | undefined {
  if (!rec) return undefined;
  for (const slot of LANG_SLOTS) {
    if (rec[slot]) return rec[slot];
  }
  return undefined;
}

// Simple language map for backward compatibility (name only), e.g. Lang1 = "Ge'ez"
export type LanguageMap = LangText;

// Enhanced language configuration with order and enabled status
export interface LanguageConfig {
  name: string;
  enabled: boolean;
  order: number;
  /** Text color for this language; unset keeps the template's color for the slot. */
  color?: string;
}

/** An enabled language in display order. */
export interface OrderedLanguage {
  slot: LangSlot;
  name: string;
  color?: string;
}

export type LanguageSettings = Partial<Record<LangSlot, LanguageConfig>>;

/** Flat per-slot fields on an entity, e.g. LangFields<'value'> = { valueLang1?: string, ... }. */
export type LangFields<P extends string> = { [S in LangSlot as `${P}${S}`]?: string };

/** Field name for a slot, e.g. langField('value', 'Lang3') -> 'valueLang3'. */
export const langField = <P extends string>(prefix: P, slot: LangSlot) => `${prefix}${slot}` as `${P}${LangSlot}`;

/** SQLite column for a slot, e.g. langColumn('value', 'Lang3') -> 'value_lang3'. */
export const langColumn = (prefix: string, slot: LangSlot) => `${prefix}_${slot.toLowerCase()}`;

/** Copies flat per-slot fields into a slot-keyed record, e.g. a verse's textLangN into a slide block. */
export function langFieldsToText<P extends string>(prefix: P, fields: LangFields<P>): LangText {
  const rec: LangText = {};
  for (const slot of LANG_SLOTS) {
    rec[slot] = (fields as Record<string, string | undefined>)[langField(prefix, slot)];
  }
  return rec;
}

/** Maps LangSlot to the corresponding Variable value field name */
export const LANG_VALUE_FIELD_MAP = Object.fromEntries(
  LANG_SLOTS.map(slot => [slot, langField('value', slot)]),
) as { [S in LangSlot]: `value${S}` };

export interface Presentation {
  id: string;
  name: string;
  type: string; // e.g., "Kidase", "Mahlet", "Seatat"
  templateId: string;
  languageMap: LanguageMap; // For backward compatibility
  languageSettings?: LanguageSettings; // Enhanced settings with order/enabled
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
}

// Helper to convert LanguageMap to LanguageSettings
export function languageMapToSettings(map: LanguageMap): LanguageSettings {
  const settings: LanguageSettings = {};

  LANG_SLOTS.forEach((slot, index) => {
    if (map[slot]) {
      settings[slot] = {
        name: map[slot]!,
        enabled: true,
        order: index + 1,
      };
    }
  });

  return settings;
}

/** A configured language, whether or not it is enabled. */
export interface PresentationLanguage extends OrderedLanguage {
  enabled: boolean;
}

// Helper to get every configured language in display order, enabled or not
export function getAllLanguages(settings: LanguageSettings | undefined, map: LanguageMap): PresentationLanguage[] {
  if (!settings) {
    // Fallback to languageMap for backward compatibility
    return LANG_SLOTS
      .filter(slot => map[slot])
      .map(slot => ({ slot, name: map[slot]!, enabled: true }));
  }

  return LANG_SLOTS
    .filter(slot => settings[slot])
    .map(slot => ({ slot, ...settings[slot]! }))
    .sort((a, b) => a.order - b.order)
    .map(({ slot, name, enabled, color }) => (color ? { slot, name, enabled, color } : { slot, name, enabled }));
}

// Helper to get enabled languages in order
export function getOrderedLanguages(settings: LanguageSettings | undefined, map: LanguageMap): OrderedLanguage[] {
  return getAllLanguages(settings, map)
    .filter(lang => lang.enabled)
    .map(({ enabled: _enabled, ...lang }) => lang);
}

export type PresentationType =
  | 'Kidase'
  | 'Mahlet'
  | 'Seatat'
  | 'Tselot'
  | 'Mezmur'
  | 'Custom';

export const PRESENTATION_TYPES: { value: PresentationType; label: string }[] = [
  { value: 'Kidase', label: 'Kidase (Divine Liturgy)' },
  { value: 'Mahlet', label: 'Mahlet (Hymns)' },
  { value: 'Seatat', label: 'Seatat (Hours)' },
  { value: 'Tselot', label: 'Tselot (Prayers)' },
  { value: 'Mezmur', label: 'Mezmur (Psalms)' },
  { value: 'Custom', label: 'Custom' },
];
