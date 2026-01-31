/**
 * Presentation Entity
 * Represents a complete presentation with metadata
 */

export interface LanguageMap {
  Lang1?: string; // e.g., "Ge'ez"
  Lang2?: string; // e.g., "Amharic"
  Lang3?: string; // e.g., "English"
  Lang4?: string; // e.g., "Tigrinya"
}

export interface Presentation {
  id: string;
  name: string;
  type: string; // e.g., "Kidase", "Mahlet", "Seatat"
  templateId: string;
  languageMap: LanguageMap;
  isActive: boolean;
  createdAt: string;
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
