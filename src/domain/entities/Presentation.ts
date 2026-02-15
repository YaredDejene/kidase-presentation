/**
 * Presentation Entity
 * Represents a complete presentation with metadata.
 *
 * "Kidase" is the user-facing term for a Presentation. All liturgical content
 * (Kidase, Mahlet, Seatat, etc.) is stored as a Presentation entity with a
 * `type` field indicating its specific liturgical category.
 */

// Simple language map for backward compatibility (name only)
export interface LanguageMap {
  Lang1?: string; // e.g., "Ge'ez"
  Lang2?: string; // e.g., "Amharic"
  Lang3?: string; // e.g., "English"
  Lang4?: string; // e.g., "Tigrinya"
}

// Enhanced language configuration with order and enabled status
export interface LanguageConfig {
  name: string;
  enabled: boolean;
  order: number;
}

export interface LanguageSettings {
  Lang1?: LanguageConfig;
  Lang2?: LanguageConfig;
  Lang3?: LanguageConfig;
  Lang4?: LanguageConfig;
}

/** The four language slot identifiers used across the app */
export type LangSlot = 'Lang1' | 'Lang2' | 'Lang3' | 'Lang4';

/** Ordered array of all language slots */
export const LANG_SLOTS: readonly LangSlot[] = ['Lang1', 'Lang2', 'Lang3', 'Lang4'] as const;

/** Maps LangSlot to the corresponding Variable value field name */
export const LANG_VALUE_FIELD_MAP: Record<LangSlot, 'valueLang1' | 'valueLang2' | 'valueLang3' | 'valueLang4'> = {
  Lang1: 'valueLang1',
  Lang2: 'valueLang2',
  Lang3: 'valueLang3',
  Lang4: 'valueLang4',
} as const;

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

// Helper to get enabled languages in order
export function getOrderedLanguages(settings: LanguageSettings | undefined, map: LanguageMap): Array<{ slot: LangSlot; name: string }> {
  if (!settings) {
    // Fallback to languageMap for backward compatibility
    return LANG_SLOTS
      .filter(slot => map[slot])
      .map(slot => ({ slot, name: map[slot]! }));
  }

  return LANG_SLOTS
    .filter(slot => settings[slot]?.enabled)
    .map(slot => ({ slot, name: settings[slot]!.name, order: settings[slot]!.order }))
    .sort((a, b) => a.order - b.order)
    .map(({ slot, name }) => ({ slot, name }));
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
