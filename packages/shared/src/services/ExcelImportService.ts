import type { WorkBook, WorkSheet } from 'xlsx';
import { Presentation, LanguageMap, LANG_SLOTS, langField, type LangSlot, type LangText } from '../domain/entities/Presentation';
import { Slide, SlideBlock, SlideTitle, SlideFooter } from '../domain/entities/Slide';
import { Variable } from '../domain/entities/Variable';
import { Gitsawe } from '../domain/entities/Gitsawe';
import { Verse } from '../domain/entities/Verse';
import { placeholderService } from './PlaceholderService';
import { Repositories } from '../domain/interfaces/Repositories';

interface ImportMetadata {
  presentationName: string;
  presentationType: string;
  templateName?: string;
  isPrimary: boolean;
  languageMap?: LanguageMap;
}

/** Sheet rows: language columns are named per slot, e.g. Title_Lang1, FooterText_Lang3. */
type SheetRow = Record<string, string | undefined>;

/** Reads `${prefix}${slot}` for every slot, e.g. langColumns(row, 'Title_') -> { Lang1: row.Title_Lang1, ... }. */
function langColumns(row: SheetRow, prefix: string): LangText {
  const rec: LangText = {};
  for (const slot of LANG_SLOTS) {
    const value = row[`${prefix}${slot}`];
    if (value) rec[slot] = value;
  }
  return rec;
}

const isEmpty = (rec: LangText) => Object.keys(rec).length === 0;

interface ImportedSlideRow extends SheetRow {
  // Line ID
  LineID?: string;
  LineId?: string;
  // Language columns per slot: Title_LangN, Text_LangN (legacy LangNText, original LangN),
  // FooterTitle_LangN, FooterText_LangN
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
  Name?: string;
  AdditionalInfo?: string;
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

interface ImportedVerseRow extends SheetRow {
  LineId?: string;
  SegmentId?: string;
  // Title_LangN, Text_LangN per slot
}

interface ImportedVariableRow extends SheetRow {
  VariableName?: string;
  // Variable_LangN per slot
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
  private xlsx!: typeof import('xlsx');
  /** The xlsx library is large and only needed for imports, so it loads on first use. */
  private async lib() {
    return (this.xlsx ??= await import('xlsx'));
  }

  constructor(private readonly repos: Repositories) {}

  async importFromArrayBuffer(
    buffer: ArrayBuffer,
    templateId: string,
    onProgress?: (current: number, total: number) => void,
  ): Promise<ImportResult> {
    const workbook = (await this.lib()).read(buffer, { type: 'array' });

    // Pre-fetch all templates for LayoutOverride name→ID resolution
    const allTemplates = await this.repos.template.getAll();
    const templateNameMap = new Map<string, string>();
    for (const tmpl of allTemplates) {
      templateNameMap.set(tmpl.name.toLowerCase(), tmpl.id);
    }

    return this.parseWorkbook(workbook, templateId, templateNameMap, onProgress);
  }

  async importFromFile(file: File, templateId: string, onProgress?: (current: number, total: number) => void): Promise<ImportResult> {
    const buffer = await file.arrayBuffer();
    return this.importFromArrayBuffer(buffer, templateId, onProgress);
  }

  async importGitsaweFromArrayBuffer(buffer: ArrayBuffer, onProgress?: (current: number, total: number) => void): Promise<{ gitsawes: ImportedGitsawe[]; warnings: string[] }> {
    onProgress?.(1, 3); // Reading file
    const workbook = (await this.lib()).read(buffer, { type: 'array' });
    onProgress?.(2, 3); // Parsing

    const warnings: string[] = [];
    const gitsaweSheet = workbook.Sheets['Gitsawe'] || workbook.Sheets['gitsawe'];
    if (!gitsaweSheet) {
      throw new Error('Gitsawe sheet not found in Excel file');
    }

    const gitsawes = this.parseGitsaweSheet(gitsaweSheet, warnings);
    onProgress?.(3, 3); // Done parsing
    return { gitsawes, warnings };
  }

  async importVersesFromArrayBuffer(buffer: ArrayBuffer, onProgress?: (current: number, total: number) => void): Promise<{ verses: Omit<Verse, 'id' | 'createdAt'>[]; warnings: string[] }> {
    onProgress?.(1, 3); // Reading file
    const workbook = (await this.lib()).read(buffer, { type: 'array' });
    onProgress?.(2, 3); // Parsing

    const warnings: string[] = [];
    const versesSheet = workbook.Sheets['Verses'] || workbook.Sheets['verses'];
    if (!versesSheet) {
      throw new Error('Verses sheet not found in Excel file');
    }

    const verses = this.parseVersesSheet(versesSheet);
    onProgress?.(3, 3); // Done parsing
    return { verses, warnings };
  }

  private parseWorkbook(workbook: WorkBook, templateId: string, templateNameMap: Map<string, string>, onProgress?: (current: number, total: number) => void): ImportResult {
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

    const rows = this.xlsx.utils.sheet_to_json<ImportedSlideRow>(contentSheet);

    if (rows.length === 0) {
      throw new Error('No content rows found in Excel file');
    }

    // Total steps: rows + 2 (for metadata + variables/rules)
    const totalSteps = rows.length + 2;
    onProgress?.(1, totalSteps); // Metadata parsed

    // Build language map
    const languageMap: LanguageMap = metadata.languageMap ?? {};

    // Resolve metadata template name to ID if provided
    let resolvedTemplateId = templateId;
    if (metadata.templateName) {
      const metaTemplateId = templateNameMap.get(metadata.templateName.toLowerCase());
      if (metaTemplateId) {
        resolvedTemplateId = metaTemplateId;
      } else {
        warnings.push(`Metadata TemplateName "${metadata.templateName}" not found, using selected template`);
      }
    }

    // Build presentation
    const presentation: Omit<Presentation, 'id' | 'createdAt'> = {
      name: metadata.presentationName,
      type: metadata.presentationType,
      templateId: resolvedTemplateId,
      languageMap: languageMap,
      isPrimary: metadata.isPrimary,
      isActive: false,
    };

    // Build slides (with progress)
    const slides = this.parseSlides(rows, templateNameMap, warnings, (i) => {
      onProgress?.(i + 2, totalSteps); // +2 for metadata step
    });

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

    onProgress?.(totalSteps, totalSteps); // All done
    return { presentation, slides, variables, displayRules, warnings };
  }

  private parseMetadata(sheet: WorkSheet): ImportMetadata {
    const data = this.xlsx.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
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
      languageMap: Object.fromEntries(
        LANG_SLOTS
          .map((slot: LangSlot) => [slot, metadata[`${slot}Name`] || metadata[slot] || metadata[slot.replace('Lang', 'Language')]])
          .filter(([, name]) => name),
      ),
    };
  }

  private getDefaultMetadata(): ImportMetadata {
    return {
      presentationName: 'Imported Presentation',
      presentationType: 'Custom',
      isPrimary: false,
    };
  }

  private parseSlides(rows: ImportedSlideRow[], templateNameMap: Map<string, string>, warnings: string[], onSlide?: (index: number) => void): Omit<Slide, 'id'>[] {
    return rows.map((row, index) => {
      onSlide?.(index);
      const title: SlideTitle = langColumns(row, 'Title_');

      // Text supports several column namings: Text_LangN, legacy LangNText, original LangN
      const block: SlideBlock = {};
      for (const slot of LANG_SLOTS) {
        const text = row[`Text_${slot}`] || row[`${slot}Text`] || row[slot];
        if (text) block[slot] = text;
      }

      // Parse footer (optional)
      let footerJson: SlideFooter | undefined;
      const footerTitle = langColumns(row, 'FooterTitle_');
      const footerText = langColumns(row, 'FooterText_');
      if (!isEmpty(footerTitle) || !isEmpty(footerText)) {
        footerJson = {};
        if (!isEmpty(footerTitle)) footerJson.title = footerTitle;
        if (!isEmpty(footerText)) footerJson.text = footerText;
      }

      const isDynamicRaw = row.IsDymanic || row.IsDynamic;
      const isDynamic = isDynamicRaw
        ? ['yes', 'true', '1'].includes(isDynamicRaw.trim().toLowerCase())
        : false;

      // Resolve LayoutOverride name to template ID
      let templateOverrideId: string | undefined;
      if (row.LayoutOverride) {
        const overrideName = row.LayoutOverride.trim();
        const resolvedId = templateNameMap.get(overrideName.toLowerCase());
        if (resolvedId) {
          templateOverrideId = resolvedId;
        } else {
          warnings.push(`Row ${index + 2}: LayoutOverride "${overrideName}" not found, ignoring`);
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
        isDynamic,
        templateOverrideId,
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

  private parseVariablesSheet(sheet: WorkSheet): Omit<Variable, 'id'>[] {
    const rows = this.xlsx.utils.sheet_to_json<ImportedVariableRow>(sheet);
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
        ...Object.fromEntries(LANG_SLOTS.map(slot => [langField('value', slot), row[`Variable_${slot}`] || ''])),
      });
    }

    return variables;
  }

  private parseGitsaweSheet(sheet: WorkSheet, warnings: string[]): ImportedGitsawe[] {
    const rows = this.xlsx.utils.sheet_to_json<ImportedGitsaweRow>(sheet);
    const results: ImportedGitsawe[] = [];

    rows.forEach((row, index) => {
      const lineId = row.LineId?.trim();
      if (!lineId) return;

      const gitsawe: Omit<Gitsawe, 'id' | 'createdAt'> = {
        lineId,
        name: row.Name?.trim() || undefined,
        additionalInfo: row.AdditionalInfo?.trim() || undefined,
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

  private parseVersesSheet(sheet: WorkSheet): Omit<Verse, 'id' | 'createdAt'>[] {
    const rows = this.xlsx.utils.sheet_to_json<ImportedVerseRow>(sheet);
    const results: Omit<Verse, 'id' | 'createdAt'>[] = [];

    // Order is per segment so (segmentId, verseOrder) is a stable key across imports.
    const orderBySegment = new Map<string, number>();

    for (const row of rows) {
      const segmentId = row.SegmentId?.trim();
      if (!segmentId) continue;

      const verseOrder = (orderBySegment.get(segmentId) ?? 0) + 1;
      orderBySegment.set(segmentId, verseOrder);

      results.push({
        segmentId,
        verseOrder,
        ...Object.fromEntries(LANG_SLOTS.flatMap(slot => [
          [langField('title', slot), row[`Title_${slot}`]?.trim() || undefined],
          [langField('text', slot), row[`Text_${slot}`]?.trim() || undefined],
        ])),
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
