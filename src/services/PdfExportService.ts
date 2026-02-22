import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Slide, SlideBlock } from '../domain/entities/Slide';
import { Template, TemplateDefinition } from '../domain/entities/Template';
import { Variable } from '../domain/entities/Variable';
import { LanguageMap, LangSlot } from '../domain/entities/Presentation';
import { placeholderService } from './PlaceholderService';
import { computeFontScale } from '../domain/formatting';

export interface PdfExportOptions {
  width?: number;
  height?: number;
  quality?: number;
  filename?: string;
}

const DEFAULT_OPTIONS: Required<PdfExportOptions> = {
  width: 960,
  height: 540,
  quality: 2,
  filename: 'presentation.pdf',
};

/** Template font sizes are designed for this resolution */
const DESIGN_WIDTH = 1920;

export class PdfExportService {
  async exportToPdf(
    slides: Slide[],
    template: Template,
    variables: Variable[],
    languageMap: LanguageMap,
    options: PdfExportOptions = {},
    onProgress?: (current: number, total: number) => void,
    meta?: Record<string, unknown> | null,
    templateMap?: Map<string, Template>,
    variablesMap?: Map<string, Variable[]>,
    languageMapMap?: Map<string, LanguageMap>
  ): Promise<Blob> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    if (slides.length === 0) {
      throw new Error('No slides to export');
    }

    // Create PDF in landscape orientation (16:9 ratio)
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [opts.width, opts.height],
    });

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];

      onProgress?.(i + 1, slides.length);

      // Create a temporary container for rendering (per-slide resolution)
      const slideTemplate = templateMap?.get(slide.id) || template;
      const slideVariables = variablesMap?.get(slide.id) || variables;
      const slideLangMap = languageMapMap?.get(slide.id) || languageMap;
      const container = this.createSlideContainer(slide, slideTemplate, slideVariables, slideLangMap, opts, meta ?? undefined);
      document.body.appendChild(container);

      try {
        // Small delay to let the DOM settle before capture
        await new Promise(r => setTimeout(r, 50));

        // Convert to canvas
        const canvas = await html2canvas(container, {
          width: opts.width,
          height: opts.height,
          backgroundColor: template.definitionJson.background?.color || '#000000',
          scale: opts.quality,
          logging: false,
          useCORS: true,
          allowTaint: true,
        });

        // Add page (except for first slide)
        if (i > 0) {
          pdf.addPage();
        }

        // Add image to PDF (JPEG is much smaller than PNG)
        const imgData = canvas.toDataURL('image/jpeg', 0.85);
        pdf.addImage(imgData, 'JPEG', 0, 0, opts.width, opts.height);

        // Free canvas memory
        canvas.width = 0;
        canvas.height = 0;
      } catch (err) {
        console.error(`Failed to render slide ${i + 1}:`, err);
        // Add a blank page for failed slides instead of crashing
        if (i > 0) pdf.addPage();
      } finally {
        document.body.removeChild(container);
      }
    }

    // Return as Blob
    return pdf.output('blob');
  }

  private getEnabledLanguages(
    def: TemplateDefinition,
    languageMap: LanguageMap
  ): TemplateDefinition['languages'] {
    return def.languages.filter(lang => languageMap[lang.slot] !== undefined);
  }

  /**
   * Calculate dynamic font scale based on total content length.
   * Mirrors SlideRenderer's fontScaleFactor logic.
   */
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

    return computeFontScale(totalChars);
  }

  private createSlideContainer(
    slide: Slide,
    template: Template,
    variables: Variable[],
    languageMap: LanguageMap,
    opts: Required<PdfExportOptions>,
    meta?: Record<string, unknown>
  ): HTMLDivElement {
    const def = template.definitionJson;
    const enabledLanguages = this.getEnabledLanguages(def, languageMap);
    const fontScale = this.calculateFontScale(slide, enabledLanguages, variables, meta);
    // Scale all measurements from design resolution to container resolution
    const viewportScale = opts.width / DESIGN_WIDTH;
    const s = (px: number) => px * viewportScale;

    const container = document.createElement('div');

    // Container styles — matches SlideRenderer layout
    Object.assign(container.style, {
      position: 'absolute',
      left: '-9999px',
      top: '0',
      width: `${opts.width}px`,
      height: `${opts.height}px`,
      backgroundColor: def.background?.color || '#000000',
      padding: `${s(def.margins?.top || 0)}px ${s(def.margins?.right || 0)}px ${s(def.margins?.bottom || 0)}px ${s(def.margins?.left || 0)}px`,
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    });

    // Render title if present
    if (slide.titleJson && def.title.show) {
      const processedTitle = placeholderService.replaceInTitle(slide.titleJson, variables, meta);
      const titleText = processedTitle.Lang1 || processedTitle.Lang2 ||
                       processedTitle.Lang3 || processedTitle.Lang4;

      if (titleText) {
        const titleEl = document.createElement('div');
        Object.assign(titleEl.style, {
          fontSize: `${s(def.title.fontSize)}px`,
          color: def.title.color,
          textAlign: def.title.alignment,
          marginBottom: `${s(2)}px`,
          fontWeight: 'bold',
        });
        titleEl.textContent = titleText;
        container.appendChild(titleEl);
      }
    }

    // Render content blocks — flex column layout matching SlideRenderer
    const contentWrapper = document.createElement('div');
    Object.assign(contentWrapper.style, {
      display: 'flex',
      flexDirection: 'column',
      flex: '1',
      justifyContent: 'center',
      gap: `${s(def.layout.gap)}px`,
    });

    const processedBlock = placeholderService.replaceInBlock(slide.blocksJson[0] || {}, variables, meta);

    for (const langDef of enabledLanguages) {
      const text = processedBlock[langDef.slot as keyof typeof processedBlock];

      if (text) {
        const langEl = document.createElement('div');
        const adjustedFontSize = s(langDef.fontSize) * fontScale;
        Object.assign(langEl.style, {
          fontSize: `${adjustedFontSize}px`,
          fontFamily: langDef.fontFamily,
          color: langDef.color,
          textAlign: langDef.alignment,
          lineHeight: String(langDef.lineHeight),
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        });
        langEl.textContent = text;
        contentWrapper.appendChild(langEl);
      }
    }

    container.appendChild(contentWrapper);

    // Render footer if present
    if (slide.footerJson) {
      const footerEl = this.createFooterElement(
        slide, enabledLanguages, variables, s(def.title.fontSize), meta
      );
      if (footerEl) container.appendChild(footerEl);
    }

    return container;
  }

  private createFooterElement(
    slide: Slide,
    enabledLanguages: TemplateDefinition['languages'],
    variables: Variable[],
    titleFontSize: number,
    meta?: Record<string, unknown>
  ): HTMLDivElement | null {
    if (!slide.footerJson) return null;

    const { title: footerTitle, text: footerText } = slide.footerJson;

    const processedFooterTitle = footerTitle
      ? placeholderService.replaceInTitle(footerTitle, variables, meta)
      : null;
    const processedFooterText = footerText
      ? placeholderService.replaceInBlock(footerText, variables, meta)
      : null;

    if (!processedFooterTitle && !processedFooterText) return null;

    const footerEl = document.createElement('div');
    Object.assign(footerEl.style, {
      marginTop: '20px',
      fontSize: `${titleFontSize}px`,
      textAlign: 'left',
    });

    const separator = ' \u2022 '; // bullet
    let hasContent = false;

    for (const langDef of enabledLanguages) {
      const titlePart = processedFooterTitle?.[langDef.slot as LangSlot];
      const textPart = processedFooterText?.[langDef.slot as keyof SlideBlock];

      if (titlePart || textPart) {
        if (hasContent) {
          const sepSpan = document.createElement('span');
          sepSpan.style.color = '#888888';
          sepSpan.textContent = separator;
          footerEl.appendChild(sepSpan);
        }

        const langSpan = document.createElement('span');
        langSpan.style.fontFamily = langDef.fontFamily;
        langSpan.style.color = langDef.color;

        if (titlePart) {
          const boldSpan = document.createElement('span');
          boldSpan.style.fontWeight = 'bold';
          boldSpan.textContent = titlePart + (textPart ? ': ' : '');
          langSpan.appendChild(boldSpan);
        }
        if (textPart) {
          const textSpan = document.createElement('span');
          textSpan.textContent = textPart;
          langSpan.appendChild(textSpan);
        }

        footerEl.appendChild(langSpan);
        hasContent = true;
      }
    }

    return hasContent ? footerEl : null;
  }
}

export const pdfExportService = new PdfExportService();
