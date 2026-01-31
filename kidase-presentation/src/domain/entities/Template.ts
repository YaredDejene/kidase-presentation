/**
 * Template Entity
 * Represents a slide template with layout and styling information
 */

export interface TemplateDefinition {
  layout: {
    columns: number;
    rows: number;
    gap: number;
  };
  title: {
    show: boolean;
    fontSize: number;
    color: string;
    alignment: 'left' | 'center' | 'right';
  };
  languages: {
    slot: 'Lang1' | 'Lang2' | 'Lang3' | 'Lang4';
    fontSize: number;
    fontFamily: string;
    color: string;
    alignment: 'left' | 'center' | 'right';
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

export interface Template {
  id: string;
  name: string;
  maxLangCount: number;
  definitionJson: TemplateDefinition;
  createdAt: string;
}

export function createDefaultTemplate(): TemplateDefinition {
  return {
    layout: { columns: 2, rows: 1, gap: 40 },
    title: {
      show: true,
      fontSize: 32,
      color: '#FFD700',
      alignment: 'center',
    },
    languages: [
      {
        slot: 'Lang1',
        fontSize: 28,
        fontFamily: 'Nyala, serif',
        color: '#FFFFFF',
        alignment: 'center',
        lineHeight: 1.5,
      },
      {
        slot: 'Lang2',
        fontSize: 24,
        fontFamily: 'Arial, sans-serif',
        color: '#FFFFFF',
        alignment: 'center',
        lineHeight: 1.4,
      },
    ],
    background: { color: '#000000' },
    margins: { top: 40, right: 60, bottom: 40, left: 60 },
    safeArea: { horizontal: 5, vertical: 5 },
  };
}
