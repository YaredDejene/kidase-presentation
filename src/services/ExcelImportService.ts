import * as XLSX from 'xlsx';
import { readFile } from '@tauri-apps/plugin-fs';
import { Presentation, LanguageMap } from '../domain/entities/Presentation';
import { Slide, SlideBlock, SlideTitle, SlideFooter } from '../domain/entities/Slide';
import { Variable } from '../domain/entities/Variable';
import { Gitsawe } from '../domain/entities/Gitsawe';
import { Verse } from '../domain/entities/Verse';
import { placeholderService } from './PlaceholderService';

interface ImportMetadata {
  presentationName: string;
  presentationType: string;
  templateName?: string;
  isPrimary: boolean;
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
  // Layout override
  LayoutOverride?: string;
  // Display rule (JSON when clause for conditional visibility)
  DisplayRule?: string;
  // Dynamic slide flag
  // "IsDymanic" is an intentional misspelling preserved for backward compatibility
  // with Excel files that may have the typo as a column header.
  IsDymanic?: string;
  IsDynamic?: string;
}

interface ImportedGitsaweRow {
  LineId?: string;
  Message_StPaul?: string;
  Message_Apostle?: string;
  Message_BookOfActs?: string;
  Misbak?: string;
  Wengel?: string;
  KidaseType?: string;
  Evangelist?: string;
  Message_Apostle_Evangelist?: string;
  GitsaweType?: string;
  Priority?: number;
  SelectionRule?: string;
}

interface ImportedVerseRow {
  LineId?: string;
  SegmentId?: string;
  Title_Lang1?: string;
  Title_Lang2?: string;
  Title_Lang3?: string;
  Title_Lang4?: string;
  Text_Lang1?: string;
  Text_Lang2?: string;
  Text_Lang3?: string;
  Text_Lang4?: string;
}

interface ImportedVariableRow {
  VariableName?: string;
  Variable_Lang1?: string;
  Variable_Lang2?: string;
  Variable_Lang3?: string;
  Variable_Lang4?: string;
}

export interface ImportedDisplayRule {
  slideIndex: number;
  ruleJson: string;
  name: string;
}

export interface ImportedGitsawe {
  gitsawe: Omit<Gitsawe, 'id' | 'createdAt'>;
  selectionRule?: { ruleJson: string; name: string };
}

export interface ImportResult {
  presentation: Omit<Presentation, 'id' | 'createdAt'>;
  slides: Omit<Slide, 'id'>[];
  variables: Omit<Variable, 'id'>[];
  displayRules: ImportedDisplayRule[];
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

  async importGitsaweFromPath(filePath: string): Promise<{ gitsawes: ImportedGitsawe[]; warnings: string[] }> {
    const data = await readFile(filePath);
    const workbook = XLSX.read(data.buffer, { type: 'array' });
    const warnings: string[] = [];

    const gitsaweSheet = workbook.Sheets['Gitsawe'] || workbook.Sheets['gitsawe'];
    if (!gitsaweSheet) {
      throw new Error('Gitsawe sheet not found in Excel file');
    }

    const gitsawes = this.parseGitsaweSheet(gitsaweSheet, warnings);
    return { gitsawes, warnings };
  }

  async importVersesFromPath(filePath: string): Promise<{ verses: Omit<Verse, 'id' | 'createdAt'>[]; warnings: string[] }> {
    const data = await readFile(filePath);
    const workbook = XLSX.read(data.buffer, { type: 'array' });
    const warnings: string[] = [];

    const versesSheet = workbook.Sheets['Verses'] || workbook.Sheets['verses'];
    if (!versesSheet) {
      throw new Error('Verses sheet not found in Excel file');
    }

    const verses = this.parseVersesSheet(versesSheet);
    return { verses, warnings };
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
        !['metadata', 'variables', 'gitsawe', 'verses'].includes(name.toLowerCase())
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
      isPrimary: metadata.isPrimary,
      isActive: false,
    };

    // Build slides
    const slides = this.parseSlides(rows);

    // Read variables sheet (optional)
    const variablesSheet =
      workbook.Sheets['Variables'] || workbook.Sheets['variables'];

    let excelVariables: Omit<Variable, 'id'>[] = [];
    if (variablesSheet) {
      excelVariables = this.parseVariablesSheet(variablesSheet);
    }

    // Extract auto-detected variables from content
    const detectedVariables = this.extractVariables(slides);

    // Merge: Excel-defined variables take precedence, then add any auto-detected ones not in Excel
    const excelVarNames = new Set(excelVariables.map(v => v.name));
    const variables = [
      ...excelVariables,
      ...detectedVariables.filter(v => !excelVarNames.has(v.name)),
    ];

    // Parse display rules
    const displayRules = this.parseDisplayRules(rows, warnings);

    return { presentation, slides, variables, displayRules, warnings };
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

    const isPrimaryRaw = metadata['IsPrimary'] || metadata['isPrimary'] || '';
    const isPrimary = isPrimaryRaw
      ? ['yes', 'true', '1'].includes(isPrimaryRaw.trim().toLowerCase())
      : false;

    return {
      presentationName: metadata['PresentationName'] || metadata['Name'] || 'Untitled',
      presentationType: metadata['PresentationType'] || metadata['Type'] || 'Custom',
      templateName: metadata['TemplateName'] || metadata['Template'],
      isPrimary,
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
      isPrimary: false,
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

      const isDynamicRaw = row.IsDymanic || row.IsDynamic;
      const isDynamic = isDynamicRaw
        ? ['yes', 'true', '1'].includes(isDynamicRaw.trim().toLowerCase())
        : false;

      return {
        presentationId: '', // Will be set after presentation is created
        slideOrder: index + 1,
        lineId: row.LineID || row.LineId,
        titleJson: Object.keys(title).length > 0 ? title : undefined,
        blocksJson: [block],
        footerJson,
        notes: row.Notes,
        isDisabled: false,
        isDynamic,
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

  private parseVariablesSheet(sheet: XLSX.WorkSheet): Omit<Variable, 'id'>[] {
    const rows = XLSX.utils.sheet_to_json<ImportedVariableRow>(sheet);
    const variables: Omit<Variable, 'id'>[] = [];

    for (const row of rows) {
      let name = row.VariableName?.trim();
      if (!name) continue;

      // Ensure @-prefix for at-variables (not {{VAR}} format)
      if (!name.startsWith('@') && !name.startsWith('{{')) {
        name = `@${name}`;
      }

      variables.push({
        presentationId: '', // Set after presentation creation
        name,
        value: row.Variable_Lang1 || '', // Default single value to Lang1
        valueLang1: row.Variable_Lang1 || '',
        valueLang2: row.Variable_Lang2 || '',
        valueLang3: row.Variable_Lang3 || '',
        valueLang4: row.Variable_Lang4 || '',
      });
    }

    return variables;
  }

  private parseGitsaweSheet(sheet: XLSX.WorkSheet, warnings: string[]): ImportedGitsawe[] {
    const rows = XLSX.utils.sheet_to_json<ImportedGitsaweRow>(sheet);
    const results: ImportedGitsawe[] = [];

    rows.forEach((row, index) => {
      const lineId = row.LineId?.trim();
      if (!lineId) return;

      const gitsawe: Omit<Gitsawe, 'id' | 'createdAt'> = {
        lineId,
        messageStPaul: row.Message_StPaul?.trim() || undefined,
        messageApostle: row.Message_Apostle?.trim() || undefined,
        messageBookOfActs: row.Message_BookOfActs?.trim() || undefined,
        misbak: row.Misbak?.trim() || undefined,
        wengel: row.Wengel?.trim() || undefined,
        kidaseType: row.KidaseType?.trim() || undefined,
        evangelist: row.Evangelist?.trim() || undefined,
        messageApostleEvangelist: row.Message_Apostle_Evangelist?.trim() || undefined,
        gitsaweType: row.GitsaweType?.trim() || undefined,
        priority: row.Priority ?? 3,
      };

      let selectionRule: ImportedGitsawe['selectionRule'];
      const rawRule = row.SelectionRule?.trim();
      if (rawRule) {
        try {
          const whenClause = JSON.parse(rawRule);
          const ruleEntry = {
            id: `selection-rule-${lineId}`,
            when: whenClause,
            then: { selected: true },
            otherwise: { selected: false },
          };
          selectionRule = {
            ruleJson: JSON.stringify(ruleEntry),
            name: `SelectionRule: ${lineId}`,
          };
        } catch (err) {
          warnings.push(
            `Gitsawe row ${index + 2}: Invalid SelectionRule JSON, skipping rule. Error: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }

      results.push({ gitsawe, selectionRule });
    });

    return results;
  }

  private parseVersesSheet(sheet: XLSX.WorkSheet): Omit<Verse, 'id' | 'createdAt'>[] {
    const rows = XLSX.utils.sheet_to_json<ImportedVerseRow>(sheet);
    const results: Omit<Verse, 'id' | 'createdAt'>[] = [];

    let orderCounter = 0;

    for (const row of rows) {
      const segmentId = row.SegmentId?.trim();
      if (!segmentId) continue;

      orderCounter++;

      results.push({
        segmentId,
        verseOrder: orderCounter,
        titleLang1: row.Title_Lang1?.trim() || undefined,
        titleLang2: row.Title_Lang2?.trim() || undefined,
        titleLang3: row.Title_Lang3?.trim() || undefined,
        titleLang4: row.Title_Lang4?.trim() || undefined,
        textLang1: row.Text_Lang1?.trim() || undefined,
        textLang2: row.Text_Lang2?.trim() || undefined,
        textLang3: row.Text_Lang3?.trim() || undefined,
        textLang4: row.Text_Lang4?.trim() || undefined,
      });
    }

    return results;
  }

  private parseDisplayRules(rows: ImportedSlideRow[], warnings: string[]): ImportedDisplayRule[] {
    const rules: ImportedDisplayRule[] = [];

    rows.forEach((row, index) => {
      const raw = row.DisplayRule?.trim();
      if (!raw) return;

      try {
        const whenClause = JSON.parse(raw);

        const ruleEntry = {
          id: `display-rule-slide-${index + 1}`,
          when: whenClause,
          then: { visible: true },
          otherwise: { visible: false },
        };

        rules.push({
          slideIndex: index,
          ruleJson: JSON.stringify(ruleEntry),
          name: `DisplayRule: slide ${index + 1}`,
        });
      } catch (err) {
        warnings.push(
          `Row ${index + 2}: Invalid DisplayRule JSON, skipping rule. Error: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    });

    return rules;
  }

}

export const excelImportService = new ExcelImportService();
