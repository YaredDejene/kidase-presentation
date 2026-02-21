import PptxGenJS from 'pptxgenjs';
import { Slide, SlideBlock } from '../domain/entities/Slide';
import { Template, TemplateDefinition } from '../domain/entities/Template';
import { Variable } from '../domain/entities/Variable';
import { LanguageMap, LangSlot } from '../domain/entities/Presentation';
import { placeholderService } from './PlaceholderService';

export interface PptxExportOptions {
  width?: number;
  height?: number;
  filename?: string;
}

/** Template font sizes are designed for this resolution */
const DESIGN_WIDTH = 1920;
/** Convert design px to inches (1920px = 13.333in at 144 dpi) */
function pxToInch(px: number): number {
  return (px / DESIGN_WIDTH) * 13.333;
}

/** Convert px to points (1px ≈ 0.75pt) */
function pxToPoints(px: number): number {
  return px * 0.75;
}

/** Strip '#' prefix for pptxgenjs hex colors */
function colorToHex6(color: string): string {
  return color.replace(/^#/, '');
}

/** Extract first font family from a CSS font stack */
function cleanFontFamily(fontFamily: string): string {
  return fontFamily.split(',')[0].trim().replace(/['"]/g, '');
}

/** Map alignment strings to pptxgenjs values */
function mapAlignment(align: string): 'left' | 'center' | 'right' {
  if (align === 'center' || align === 'right') return align;
  return 'left';
}

export class PptxExportService {
  async exportToPptx(
    slides: Slide[],
    template: Template,
    variables: Variable[],
    languageMap: LanguageMap,
    _options: PptxExportOptions = {},
    onProgress?: (current: number, total: number) => void,
    meta?: Record<string, unknown> | null,
    templateMap?: Map<string, Template>,
    variablesMap?: Map<string, Variable[]>,
    languageMapMap?: Map<string, LanguageMap>
  ): Promise<Blob> {
    if (slides.length === 0) {
      throw new Error('No slides to export');
    }

    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5 inches (16:9)

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      onProgress?.(i + 1, slides.length);

      const slideTemplate = templateMap?.get(slide.id) || template;
      const slideVariables = variablesMap?.get(slide.id) || variables;
      const slideLangMap = languageMapMap?.get(slide.id) || languageMap;

      this.addSlide(pptx, slide, slideTemplate, slideVariables, slideLangMap, meta ?? undefined);
    }

    const arrayBuffer = await pptx.write({ outputType: 'arraybuffer' }) as ArrayBuffer;
    return new Blob([arrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    });
  }

  private getEnabledLanguages(
    def: TemplateDefinition,
    languageMap: LanguageMap
  ): TemplateDefinition['languages'] {
    return def.languages.filter(lang => languageMap[lang.slot] !== undefined);
  }

  private calculateFontScale(
    slide: Slide,
    enabledLanguages: TemplateDefinition['languages'],
    variables: Variable[],
    meta?: Record<string, unknown>
  ): number {
    const block = slide.blocksJson[0] || {};
    const processedBlock = placeholderService.replaceInBlock(block, variables, meta);

    let totalChars = 0;

    for (const langDef of enabledLanguages) {
      const text = processedBlock[langDef.slot as keyof SlideBlock];
      if (text) totalChars += text.length;
    }

    if (slide.titleJson) {
      const processedTitle = placeholderService.replaceInTitle(slide.titleJson, variables, meta);
      const titleText = processedTitle.Lang1 || processedTitle.Lang2 ||
                       processedTitle.Lang3 || processedTitle.Lang4;
      if (titleText) totalChars += titleText.length;
    }

    if (slide.footerJson) {
      if (slide.footerJson.title) {
        const ft = slide.footerJson.title;
        const footerTitle = ft.Lang1 || ft.Lang2 || ft.Lang3 || ft.Lang4;
        if (footerTitle) totalChars += footerTitle.length;
      }
      if (slide.footerJson.text) {
        const ftxt = slide.footerJson.text;
        const footerText = (ftxt as Record<string, string>).Lang1 ||
                          (ftxt as Record<string, string>).Lang2 ||
                          (ftxt as Record<string, string>).Lang3 ||
                          (ftxt as Record<string, string>).Lang4;
        if (footerText) totalChars += footerText.length;
      }
    }

    if (totalChars < 100) return 2.0;
    if (totalChars < 200) return 1.6;
    if (totalChars < 350) return 1.35;
    if (totalChars < 500) return 1.15;
    if (totalChars < 700) return 1.0;
    if (totalChars < 1000) return 0.85;
    if (totalChars < 1400) return 0.7;
    return 0.55;
  }

  private addSlide(
    pptx: PptxGenJS,
    slide: Slide,
    template: Template,
    variables: Variable[],
    languageMap: LanguageMap,
    meta?: Record<string, unknown>
  ): void {
    const def = template.definitionJson;
    const enabledLanguages = this.getEnabledLanguages(def, languageMap);
    const fontScale = this.calculateFontScale(slide, enabledLanguages, variables, meta);

    const pptxSlide = pptx.addSlide();

    // Background
    pptxSlide.background = { color: colorToHex6(def.background?.color || '#000000') };

    // Margins in inches
    const marginTop = pxToInch(def.margins?.top || 0);
    const marginRight = pxToInch(def.margins?.right || 0);
    const marginBottom = pxToInch(def.margins?.bottom || 0);
    const marginLeft = pxToInch(def.margins?.left || 0);

    const slideWidth = 13.333;
    const slideHeight = 7.5;
    const contentWidth = slideWidth - marginLeft - marginRight;
    let currentY = marginTop;

    // Title
    if (slide.titleJson && def.title.show) {
      const processedTitle = placeholderService.replaceInTitle(slide.titleJson, variables, meta);
      const titleText = processedTitle.Lang1 || processedTitle.Lang2 ||
                       processedTitle.Lang3 || processedTitle.Lang4;

      if (titleText) {
        const titleFontSize = pxToPoints(def.title.fontSize) * fontScale;
        const titleHeight = titleFontSize / 72 + 0.1; // font height in inches + padding

        pptxSlide.addText(titleText, {
          x: marginLeft,
          y: currentY,
          w: contentWidth,
          h: titleHeight,
          fontSize: titleFontSize,
          color: colorToHex6(def.title.color),
          align: mapAlignment(def.title.alignment),
          bold: true,
          shrinkText: true,
          valign: 'top',
        });

        currentY += titleHeight + pxToInch(2);
      }
    }

    // Footer height reservation
    let footerHeight = 0;
    if (slide.footerJson) {
      footerHeight = pxToPoints(def.title.fontSize) / 72 + 0.3;
    }

    // Body content — distribute available height among enabled languages
    const processedBlock = placeholderService.replaceInBlock(slide.blocksJson[0] || {}, variables, meta);
    const availableHeight = slideHeight - currentY - marginBottom - footerHeight;
    const gapInch = pxToInch(def.layout.gap);
    const langCount = enabledLanguages.filter(lang => processedBlock[lang.slot as keyof SlideBlock]).length;

    if (langCount > 0) {
      const totalGaps = (langCount - 1) * gapInch;
      const perLangHeight = (availableHeight - totalGaps) / langCount;

      for (const langDef of enabledLanguages) {
        const text = processedBlock[langDef.slot as keyof typeof processedBlock];
        if (!text) continue;

        const adjustedFontSize = pxToPoints(langDef.fontSize) * fontScale;

        pptxSlide.addText(text, {
          x: marginLeft,
          y: currentY,
          w: contentWidth,
          h: perLangHeight,
          fontSize: adjustedFontSize,
          fontFace: cleanFontFamily(langDef.fontFamily),
          color: colorToHex6(langDef.color),
          align: mapAlignment(langDef.alignment),
          lineSpacingMultiple: langDef.lineHeight,
          shrinkText: true,
          valign: 'middle',
        });

        currentY += perLangHeight + gapInch;
      }
    }

    // Footer
    if (slide.footerJson) {
      this.addFooter(pptxSlide, slide, enabledLanguages, variables, def, marginLeft, contentWidth, slideHeight - marginBottom - footerHeight + 0.05, footerHeight, fontScale, meta);
    }
  }

  private addFooter(
    pptxSlide: PptxGenJS.Slide,
    slide: Slide,
    enabledLanguages: TemplateDefinition['languages'],
    variables: Variable[],
    def: TemplateDefinition,
    x: number,
    w: number,
    y: number,
    h: number,
    fontScale: number,
    meta?: Record<string, unknown>
  ): void {
    if (!slide.footerJson) return;

    const { title: footerTitle, text: footerText } = slide.footerJson;

    const processedFooterTitle = footerTitle
      ? placeholderService.replaceInTitle(footerTitle, variables, meta)
      : null;
    const processedFooterText = footerText
      ? placeholderService.replaceInBlock(footerText, variables, meta)
      : null;

    if (!processedFooterTitle && !processedFooterText) return;

    const footerFontSize = pxToPoints(def.title.fontSize) * fontScale * 0.6;
    const runs: PptxGenJS.TextProps[] = [];
    let hasContent = false;

    for (const langDef of enabledLanguages) {
      const titlePart = processedFooterTitle?.[langDef.slot as LangSlot];
      const textPart = processedFooterText?.[langDef.slot as keyof SlideBlock];

      if (titlePart || textPart) {
        if (hasContent) {
          runs.push({
            text: ' \u2022 ',
            options: {
              fontSize: footerFontSize,
              color: '888888',
            },
          });
        }

        if (titlePart) {
          runs.push({
            text: titlePart + (textPart ? ': ' : ''),
            options: {
              fontSize: footerFontSize,
              fontFace: cleanFontFamily(langDef.fontFamily),
              color: colorToHex6(langDef.color),
              bold: true,
            },
          });
        }

        if (textPart) {
          runs.push({
            text: textPart,
            options: {
              fontSize: footerFontSize,
              fontFace: cleanFontFamily(langDef.fontFamily),
              color: colorToHex6(langDef.color),
            },
          });
        }

        hasContent = true;
      }
    }

    if (runs.length > 0) {
      pptxSlide.addText(runs, {
        x,
        y,
        w,
        h,
        align: 'left',
        valign: 'bottom',
        shrinkText: true,
      });
    }
  }
}

export const pptxExportService = new PptxExportService();
