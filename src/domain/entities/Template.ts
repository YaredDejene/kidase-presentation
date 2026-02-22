/**
 * Template Entity
 * Represents a slide template with layout and styling information
 */

import type { LangSlot } from './Presentation';

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
    slot: LangSlot;
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
