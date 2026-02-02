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
    layout: { columns: 1, rows: 1, gap: 18 },
    title: {
      show: true,
      fontSize: 64,
      color: '#FFD700',
      alignment: 'left',
    },
    languages: [
      {
        slot: 'Lang1',
        fontSize: 62,
        fontFamily: 'Nyala, serif',
        color: '#FFFFFF',
        alignment: 'left',
        lineHeight: 1.15,
      },
      {
        slot: 'Lang2',
        fontSize: 46,
        fontFamily: 'Nyala, serif',
        color: '#FFFF00',
        alignment: 'left',
        lineHeight: 1.15,
      },
      {
        slot: 'Lang3',
        fontSize: 46,
        fontFamily: 'Nyala, serif',
        color: '#00FF00',
        alignment: 'left',
        lineHeight: 1.15,
      },
      {
        slot: 'Lang4',
        fontSize: 46,
        fontFamily: 'Nyala, serif',
        color: '#00BFFF',
        alignment: 'left',
        lineHeight: 1.15,
      },
    ],
    background: { color: '#000000' },
    margins: { top: 20, right: 40, bottom: 20, left: 40 },
    safeArea: { horizontal: 5, vertical: 5 },
  };
}
