/**
 * Presentation Entity
 * Represents a complete presentation with metadata
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

export interface Presentation {
  id: string;
  name: string;
  type: string; // e.g., "Kidase", "Mahlet", "Seatat"
  templateId: string;
  languageMap: LanguageMap; // For backward compatibility
  languageSettings?: LanguageSettings; // Enhanced settings with order/enabled
  isActive: boolean;
  createdAt: string;
}

// Helper to convert LanguageMap to LanguageSettings
export function languageMapToSettings(map: LanguageMap): LanguageSettings {
  const settings: LanguageSettings = {};
  const slots: ('Lang1' | 'Lang2' | 'Lang3' | 'Lang4')[] = ['Lang1', 'Lang2', 'Lang3', 'Lang4'];

  slots.forEach((slot, index) => {
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
export function getOrderedLanguages(settings: LanguageSettings | undefined, map: LanguageMap): Array<{ slot: 'Lang1' | 'Lang2' | 'Lang3' | 'Lang4'; name: string }> {
  if (!settings) {
    // Fallback to languageMap for backward compatibility
    const slots: ('Lang1' | 'Lang2' | 'Lang3' | 'Lang4')[] = ['Lang1', 'Lang2', 'Lang3', 'Lang4'];
    return slots
      .filter(slot => map[slot])
      .map(slot => ({ slot, name: map[slot]! }));
  }

  const slots: ('Lang1' | 'Lang2' | 'Lang3' | 'Lang4')[] = ['Lang1', 'Lang2', 'Lang3', 'Lang4'];
  return slots
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
