import { Variable } from '../domain/entities/Variable';
import { SlideBlock, SlideTitle } from '../domain/entities/Slide';

export class PlaceholderService {
  /**
   * Replace all placeholders in text with variable values
   */
  replaceInText(text: string, variables: Variable[]): string {
    let result = text;

    for (const variable of variables) {
      const pattern = new RegExp(this.escapeRegex(variable.name), 'g');
      result = result.replace(pattern, variable.value);
    }

    return result;
  }

  /**
   * Replace placeholders in a slide block
   */
  replaceInBlock(block: SlideBlock, variables: Variable[]): SlideBlock {
    const result: SlideBlock = {};

    if (block.Lang1) result.Lang1 = this.replaceInText(block.Lang1, variables);
    if (block.Lang2) result.Lang2 = this.replaceInText(block.Lang2, variables);
    if (block.Lang3) result.Lang3 = this.replaceInText(block.Lang3, variables);
    if (block.Lang4) result.Lang4 = this.replaceInText(block.Lang4, variables);

    return result;
  }

  /**
   * Replace placeholders in a slide title
   */
  replaceInTitle(title: SlideTitle, variables: Variable[]): SlideTitle {
    const result: SlideTitle = {};

    if (title.Lang1) result.Lang1 = this.replaceInText(title.Lang1, variables);
    if (title.Lang2) result.Lang2 = this.replaceInText(title.Lang2, variables);
    if (title.Lang3) result.Lang3 = this.replaceInText(title.Lang3, variables);
    if (title.Lang4) result.Lang4 = this.replaceInText(title.Lang4, variables);

    return result;
  }

  /**
   * Find all placeholders in text
   */
  findPlaceholders(text: string): string[] {
    const pattern = /\{\{([A-Z_]+)\}\}/g;
    const matches: string[] = [];
    let match;

    while ((match = pattern.exec(text)) !== null) {
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

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export const placeholderService = new PlaceholderService();
