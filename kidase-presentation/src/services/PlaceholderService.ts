import { Variable } from '../domain/entities/Variable';
import { SlideBlock, SlideTitle } from '../domain/entities/Slide';
import type { LangSlot } from '../domain/entities/Presentation';

export class PlaceholderService {
  /**
   * Replace all placeholders in text with variable values.
   * When langSlot is provided, @VarName variables use the per-language value.
   */
  replaceInText(text: string, variables: Variable[], langSlot?: LangSlot): string {
    let result = text;

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
  replaceInBlock(block: SlideBlock, variables: Variable[]): SlideBlock {
    const result: SlideBlock = {};

    if (block.Lang1) result.Lang1 = this.replaceInText(block.Lang1, variables, 'Lang1');
    if (block.Lang2) result.Lang2 = this.replaceInText(block.Lang2, variables, 'Lang2');
    if (block.Lang3) result.Lang3 = this.replaceInText(block.Lang3, variables, 'Lang3');
    if (block.Lang4) result.Lang4 = this.replaceInText(block.Lang4, variables, 'Lang4');

    return result;
  }

  /**
   * Replace placeholders in a slide title (language-aware for @VarName)
   */
  replaceInTitle(title: SlideTitle, variables: Variable[]): SlideTitle {
    const result: SlideTitle = {};

    if (title.Lang1) result.Lang1 = this.replaceInText(title.Lang1, variables, 'Lang1');
    if (title.Lang2) result.Lang2 = this.replaceInText(title.Lang2, variables, 'Lang2');
    if (title.Lang3) result.Lang3 = this.replaceInText(title.Lang3, variables, 'Lang3');
    if (title.Lang4) result.Lang4 = this.replaceInText(title.Lang4, variables, 'Lang4');

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
      allText.push(
        slide.titleJson.Lang1 || '',
        slide.titleJson.Lang2 || '',
        slide.titleJson.Lang3 || '',
        slide.titleJson.Lang4 || ''
      );
    }

    for (const block of slide.blocksJson) {
      allText.push(
        block.Lang1 || '',
        block.Lang2 || '',
        block.Lang3 || '',
        block.Lang4 || ''
      );
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
    switch (langSlot) {
      case 'Lang1': return variable.valueLang1;
      case 'Lang2': return variable.valueLang2;
      case 'Lang3': return variable.valueLang3;
      case 'Lang4': return variable.valueLang4;
    }
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export const placeholderService = new PlaceholderService();
