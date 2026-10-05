import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Slide } from '@kidase/shared/domain/entities/Slide';
import { Template, EnabledLanguage, templateLanguages } from '@kidase/shared/domain/entities/Template';
import { Variable } from '@kidase/shared/domain/entities/Variable';
import { OrderedLanguage, LangSlot, firstText } from '@kidase/shared/domain/entities/Presentation';
import { placeholderService } from '@kidase/shared';
import { computeFontScale } from '@kidase/shared/domain/formatting';

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
    languages: OrderedLanguage[],
    options: PdfExportOptions = {},
    onProgress?: (current: number, total: number) => void,
    meta?: Record<string, unknown> | null,
    templateMap?: Map<string, Template>,
    variablesMap?: Map<string, Variable[]>,
    languagesMap?: Map<string, OrderedLanguage[]>
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
      const slideLanguages = languagesMap?.get(slide.id) || languages;
      const container = this.createSlideContainer(slide, slideTemplate, slideVariables, slideLanguages, opts, meta ?? undefined);
      document.body.appendChild(container);

      try {
        // Layout is synchronous; only fonts may still be loading.
        await document.fonts?.ready;

        // Convert to canvas
        const canvas = await html2canvas(container, {
          width: opts.width,
          height: opts.height,
          backgroundColor: template.definitionJson.background?.color || '#000000',
          scale: opts.quality,
          logging: false,
          useCORS: true,
          allowTaint: true,
          // html2canvas clones the whole page per capture; skip the app (hundreds of slide thumbnails).
          ignoreElements: el => el.parentElement === document.body && el !== container,
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

  /**
   * Calculate dynamic font scale based on total content length.
   * Mirrors SlideRenderer's fontScaleFactor logic.
   */
  private calculateFontScale(
    slide: Slide,
    enabledLanguages: EnabledLanguage[],
    variables: Variable[],
    meta?: Record<string, unknown>
  ): number {
    const block = slide.blocksJson[0] || {};
    const processedBlock = placeholderService.replaceInBlock(block, variables, meta);

    let totalChars = 0;

    for (const langDef of enabledLanguages) {
      const text = processedBlock[langDef.slot];
      if (text) totalChars += text.length;
    }

    if (slide.titleJson) {
      const processedTitle = placeholderService.replaceInTitle(slide.titleJson, variables, meta);
      const titleText = firstText(processedTitle);
      if (titleText) totalChars += titleText.length;
    }

    if (slide.footerJson) {
      if (slide.footerJson.title) {
        const ft = slide.footerJson.title;
        const footerTitle = firstText(ft);
        if (footerTitle) totalChars += footerTitle.length;
      }
      if (slide.footerJson.text) {
        const ftxt = slide.footerJson.text;
        const footerText = firstText(ftxt);
        if (footerText) totalChars += footerText.length;
      }
    }

    return computeFontScale(totalChars);
  }

  private createSlideContainer(
    slide: Slide,
    template: Template,
    variables: Variable[],
    languages: OrderedLanguage[],
    opts: Required<PdfExportOptions>,
    meta?: Record<string, unknown>
  ): HTMLDivElement {
    const def = template.definitionJson;
    const enabledLanguages = templateLanguages(def, languages);
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
      const titleText = firstText(processedTitle);

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
      const text = processedBlock[langDef.slot];

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
    enabledLanguages: EnabledLanguage[],
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
      const textPart = processedFooterText?.[langDef.slot];

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
