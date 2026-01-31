import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Slide } from '../domain/entities/Slide';
import { Template } from '../domain/entities/Template';
import { Variable } from '../domain/entities/Variable';
import { LanguageMap } from '../domain/entities/Presentation';
import { placeholderService } from './PlaceholderService';

export interface PdfExportOptions {
  width?: number;
  height?: number;
  quality?: number;
  filename?: string;
}

const DEFAULT_OPTIONS: Required<PdfExportOptions> = {
  width: 1920,
  height: 1080,
  quality: 1,
  filename: 'presentation.pdf',
};

export class PdfExportService {
  async exportToPdf(
    slides: Slide[],
    template: Template,
    variables: Variable[],
    languageMap: LanguageMap,
    options: PdfExportOptions = {}
  ): Promise<Blob> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const enabledSlides = slides.filter(s => !s.isDisabled);

    if (enabledSlides.length === 0) {
      throw new Error('No enabled slides to export');
    }

    // Create PDF in landscape orientation (16:9 ratio)
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [opts.width, opts.height],
    });

    for (let i = 0; i < enabledSlides.length; i++) {
      const slide = enabledSlides[i];

      // Create a temporary container for rendering
      const container = this.createSlideContainer(slide, template, variables, languageMap, opts);
      document.body.appendChild(container);

      try {
        // Convert to canvas
        const canvas = await html2canvas(container, {
          width: opts.width,
          height: opts.height,
          backgroundColor: template.definitionJson.background.color,
          scale: opts.quality,
        });

        // Add page (except for first slide)
        if (i > 0) {
          pdf.addPage();
        }

        // Add image to PDF
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, opts.width, opts.height);
      } finally {
        // Clean up
        document.body.removeChild(container);
      }
    }

    // Return as Blob
    return pdf.output('blob');
  }

  async downloadPdf(
    slides: Slide[],
    template: Template,
    variables: Variable[],
    languageMap: LanguageMap,
    options: PdfExportOptions = {}
  ): Promise<void> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const blob = await this.exportToPdf(slides, template, variables, languageMap, opts);

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = opts.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private createSlideContainer(
    slide: Slide,
    template: Template,
    variables: Variable[],
    _languageMap: LanguageMap,
    opts: Required<PdfExportOptions>
  ): HTMLDivElement {
    const def = template.definitionJson;
    const container = document.createElement('div');

    // Container styles
    Object.assign(container.style, {
      position: 'absolute',
      left: '-9999px',
      top: '0',
      width: `${opts.width}px`,
      height: `${opts.height}px`,
      backgroundColor: def.background.color,
      padding: `${def.margins.top}px ${def.margins.right}px ${def.margins.bottom}px ${def.margins.left}px`,
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: 'Arial, sans-serif',
    });

    // Render title if present
    if (slide.titleJson && def.title.show) {
      const processedTitle = placeholderService.replaceInTitle(slide.titleJson, variables);
      const titleText = processedTitle.Lang1 || processedTitle.Lang2 ||
                       processedTitle.Lang3 || processedTitle.Lang4;

      if (titleText) {
        const titleEl = document.createElement('div');
        Object.assign(titleEl.style, {
          fontSize: `${def.title.fontSize}px`,
          color: def.title.color,
          textAlign: def.title.alignment,
          marginBottom: '30px',
          fontWeight: 'bold',
        });
        titleEl.textContent = titleText;
        container.appendChild(titleEl);
      }
    }

    // Render content blocks
    const contentWrapper = document.createElement('div');
    Object.assign(contentWrapper.style, {
      display: 'grid',
      gridTemplateColumns: `repeat(${def.layout.columns}, 1fr)`,
      gap: `${def.layout.gap}px`,
      flex: '1',
      alignContent: 'center',
    });

    const processedBlock = placeholderService.replaceInBlock(slide.blocksJson[0] || {}, variables);

    for (const langDef of def.languages) {
      const text = processedBlock[langDef.slot as keyof typeof processedBlock];

      if (text) {
        const langEl = document.createElement('div');
        Object.assign(langEl.style, {
          fontSize: `${langDef.fontSize}px`,
          fontFamily: langDef.fontFamily,
          color: langDef.color,
          textAlign: langDef.alignment,
          lineHeight: String(langDef.lineHeight),
          whiteSpace: 'pre-wrap',
        });
        langEl.textContent = text;
        contentWrapper.appendChild(langEl);
      }
    }

    container.appendChild(contentWrapper);
    return container;
  }
}

export const pdfExportService = new PdfExportService();
