import * as XLSX from 'xlsx';
import { readFile } from '@tauri-apps/plugin-fs';
import { Presentation, LanguageMap } from '../domain/entities/Presentation';
import { Slide, SlideBlock, SlideTitle, SlideFooter } from '../domain/entities/Slide';
import { Variable } from '../domain/entities/Variable';
import { placeholderService } from './PlaceholderService';

interface ImportMetadata {
  presentationName: string;
  presentationType: string;
  templateName?: string;
  lang1Name?: string;
  lang2Name?: string;
  lang3Name?: string;
  lang4Name?: string;
}

interface ImportedSlideRow {
  // Line ID
  LineID?: string;
  LineId?: string;
  // Title columns
  Title_Lang1?: string;
  Title_Lang2?: string;
  Title_Lang3?: string;
  Title_Lang4?: string;
  // Text columns (new format: Text_Lang1)
  Text_Lang1?: string;
  Text_Lang2?: string;
  Text_Lang3?: string;
  Text_Lang4?: string;
  // Legacy format (Lang1Text)
  Lang1Text?: string;
  Lang2Text?: string;
  Lang3Text?: string;
  Lang4Text?: string;
  // Original format (Lang1)
  Lang1?: string;
  Lang2?: string;
  Lang3?: string;
  Lang4?: string;
  // Footer columns
  FooterTitle_Lang1?: string;
  FooterTitle_Lang2?: string;
  FooterTitle_Lang3?: string;
  FooterTitle_Lang4?: string;
  FooterText_Lang1?: string;
  FooterText_Lang2?: string;
  FooterText_Lang3?: string;
  FooterText_Lang4?: string;
  // Notes
  Notes?: string;
}

export interface ImportResult {
  presentation: Omit<Presentation, 'id' | 'createdAt'>;
  slides: Omit<Slide, 'id'>[];
  variables: Omit<Variable, 'id'>[];
  warnings: string[];
}

export class ExcelImportService {
  async importFromArrayBuffer(
    buffer: ArrayBuffer,
    templateId: string
  ): Promise<ImportResult> {
    const workbook = XLSX.read(buffer, { type: 'array' });
    return this.parseWorkbook(workbook, templateId);
  }

  async importFromFile(file: File, templateId: string): Promise<ImportResult> {
    const buffer = await file.arrayBuffer();
    return this.importFromArrayBuffer(buffer, templateId);
  }

  async importFromPath(filePath: string, templateId: string): Promise<ImportResult> {
    const data = await readFile(filePath);
    return this.importFromArrayBuffer(data.buffer, templateId);
  }

  private parseWorkbook(workbook: XLSX.WorkBook, templateId: string): ImportResult {
    const warnings: string[] = [];

    // Read metadata sheet
    const metadataSheet = workbook.Sheets['Metadata'] || workbook.Sheets['metadata'];
    if (!metadataSheet) {
      warnings.push('Metadata sheet not found, using defaults');
    }

    const metadata = metadataSheet
      ? this.parseMetadata(metadataSheet)
      : this.getDefaultMetadata();

    // Read content sheet (support multiple naming conventions)
    const contentSheet =
      workbook.Sheets['Slides'] ||
      workbook.Sheets['slides'] ||
      workbook.Sheets['Content'] ||
      workbook.Sheets['content'] ||
      workbook.Sheets[workbook.SheetNames.find(name =>
        !['metadata', 'variables'].includes(name.toLowerCase())
      ) || workbook.SheetNames[0]];

    if (!contentSheet) {
      throw new Error('Content sheet not found in Excel file');
    }

    const rows = XLSX.utils.sheet_to_json<ImportedSlideRow>(contentSheet);

    if (rows.length === 0) {
      throw new Error('No content rows found in Excel file');
    }

    // Build language map
    const languageMap: LanguageMap = {};
    if (metadata.lang1Name) languageMap.Lang1 = metadata.lang1Name;
    if (metadata.lang2Name) languageMap.Lang2 = metadata.lang2Name;
    if (metadata.lang3Name) languageMap.Lang3 = metadata.lang3Name;
    if (metadata.lang4Name) languageMap.Lang4 = metadata.lang4Name;

    // Build presentation
    const presentation: Omit<Presentation, 'id' | 'createdAt'> = {
      name: metadata.presentationName,
      type: metadata.presentationType,
      templateId: templateId,
      languageMap: languageMap,
      isActive: false,
    };

    // Build slides
    const slides = this.parseSlides(rows);

    // Extract variables from content
    const variables = this.extractVariables(slides);

    return { presentation, slides, variables, warnings };
  }

  private parseMetadata(sheet: XLSX.WorkSheet): ImportMetadata {
    const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
    const metadata: Record<string, string> = {};

    // Check if first row looks like headers (has multiple columns)
    const rows = data as unknown[][];
    if (rows.length >= 2 && Array.isArray(rows[0]) && rows[0].length > 2) {
      // Header row format: row 0 = headers, row 1 = values
      const headers = rows[0].map(h => String(h || '').trim());
      const values = rows[1] || [];
      headers.forEach((header, i) => {
        if (header) {
          metadata[header] = String(values[i] || '').trim();
        }
      });
    } else {
      // Key-value format: column A = key, column B = value
      for (const row of rows) {
        if (Array.isArray(row) && row.length >= 2 && row[0]) {
          const key = String(row[0]).trim();
          const value = String(row[1] || '').trim();
          metadata[key] = value;
        }
      }
    }

    return {
      presentationName: metadata['PresentationName'] || metadata['Name'] || 'Untitled',
      presentationType: metadata['PresentationType'] || metadata['Type'] || 'Custom',
      templateName: metadata['TemplateName'] || metadata['Template'],
      lang1Name: metadata['Lang1Name'] || metadata['Lang1'] || metadata['Language1'],
      lang2Name: metadata['Lang2Name'] || metadata['Lang2'] || metadata['Language2'],
      lang3Name: metadata['Lang3Name'] || metadata['Lang3'] || metadata['Language3'],
      lang4Name: metadata['Lang4Name'] || metadata['Lang4'] || metadata['Language4'],
    };
  }

  private getDefaultMetadata(): ImportMetadata {
    return {
      presentationName: 'Imported Presentation',
      presentationType: 'Custom',
    };
  }

  private parseSlides(rows: ImportedSlideRow[]): Omit<Slide, 'id'>[] {
    return rows.map((row, index) => {
      // Parse title
      const title: SlideTitle = {};
      if (row.Title_Lang1) title.Lang1 = row.Title_Lang1;
      if (row.Title_Lang2) title.Lang2 = row.Title_Lang2;
      if (row.Title_Lang3) title.Lang3 = row.Title_Lang3;
      if (row.Title_Lang4) title.Lang4 = row.Title_Lang4;

      // Parse text content - support multiple column naming conventions
      const block: SlideBlock = {};
      const lang1 = row.Text_Lang1 || row.Lang1Text || row.Lang1;
      const lang2 = row.Text_Lang2 || row.Lang2Text || row.Lang2;
      const lang3 = row.Text_Lang3 || row.Lang3Text || row.Lang3;
      const lang4 = row.Text_Lang4 || row.Lang4Text || row.Lang4;
      if (lang1) block.Lang1 = lang1;
      if (lang2) block.Lang2 = lang2;
      if (lang3) block.Lang3 = lang3;
      if (lang4) block.Lang4 = lang4;

      // Parse footer (optional)
      let footerJson: SlideFooter | undefined;
      const hasFooterTitle = row.FooterTitle_Lang1 || row.FooterTitle_Lang2 ||
                            row.FooterTitle_Lang3 || row.FooterTitle_Lang4;
      const hasFooterText = row.FooterText_Lang1 || row.FooterText_Lang2 ||
                           row.FooterText_Lang3 || row.FooterText_Lang4;

      if (hasFooterTitle || hasFooterText) {
        footerJson = {};

        if (hasFooterTitle) {
          footerJson.title = {};
          if (row.FooterTitle_Lang1) footerJson.title.Lang1 = row.FooterTitle_Lang1;
          if (row.FooterTitle_Lang2) footerJson.title.Lang2 = row.FooterTitle_Lang2;
          if (row.FooterTitle_Lang3) footerJson.title.Lang3 = row.FooterTitle_Lang3;
          if (row.FooterTitle_Lang4) footerJson.title.Lang4 = row.FooterTitle_Lang4;
        }

        if (hasFooterText) {
          footerJson.text = {};
          if (row.FooterText_Lang1) footerJson.text.Lang1 = row.FooterText_Lang1;
          if (row.FooterText_Lang2) footerJson.text.Lang2 = row.FooterText_Lang2;
          if (row.FooterText_Lang3) footerJson.text.Lang3 = row.FooterText_Lang3;
          if (row.FooterText_Lang4) footerJson.text.Lang4 = row.FooterText_Lang4;
        }
      }

      return {
        presentationId: '', // Will be set after presentation is created
        slideOrder: index + 1,
        lineId: row.LineID || row.LineId,
        titleJson: Object.keys(title).length > 0 ? title : undefined,
        blocksJson: [block],
        footerJson,
        notes: row.Notes,
        isDisabled: false,
      };
    });
  }

  private extractVariables(slides: Omit<Slide, 'id'>[]): Omit<Variable, 'id'>[] {
    const foundVariables = new Set<string>();

    for (const slide of slides) {
      const placeholders = placeholderService.findPlaceholdersInSlide({
        titleJson: slide.titleJson,
        blocksJson: slide.blocksJson,
      });

      for (const placeholder of placeholders) {
        foundVariables.add(placeholder);
      }
    }

    return Array.from(foundVariables).map(name => ({
      presentationId: '', // Will be set after presentation is created
      name,
      value: '',
    }));
  }

  /**
   * Generate a sample Excel template for users
   */
  generateTemplate(): ArrayBuffer {
    const workbook = XLSX.utils.book_new();

    // Metadata sheet
    const metadataData = [
      ['PresentationName', 'My Liturgy'],
      ['PresentationType', 'Kidase'],
      ['Lang1Name', "Ge'ez"],
      ['Lang2Name', 'Amharic'],
      ['Lang3Name', 'English'],
      ['Lang4Name', ''],
    ];
    const metadataSheet = XLSX.utils.aoa_to_sheet(metadataData);
    XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Metadata');

    // Content sheet
    const contentHeaders = [
      'LineID', 'Title_Lang1', 'Title_Lang2', 'Title_Lang3', 'Title_Lang4',
      'Lang1', 'Lang2', 'Lang3', 'Lang4', 'Notes'
    ];
    const contentData = [
      contentHeaders,
      ['1', 'ቅዳሴ', 'ቅዳሴ', 'Divine Liturgy', '', 'ብስመ አብ...', 'በአብ ስም...', 'In the name of...', '', 'Opening'],
      ['2', '', '', '', '', 'ቅዱስ ቅዱስ ቅዱስ', 'ቅዱስ ቅዱስ ቅዱስ', 'Holy Holy Holy', '', 'Trisagion'],
    ];
    const contentSheet = XLSX.utils.aoa_to_sheet(contentData);
    XLSX.utils.book_append_sheet(workbook, contentSheet, 'Content');

    return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  }
}

export const excelImportService = new ExcelImportService();
