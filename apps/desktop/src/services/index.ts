import { readFile } from '@tauri-apps/plugin-fs';
import { ExcelImportService, PresentationService } from '@kidase/shared';
import type { ImportResult, LoadedPresentation, ImportOutcome } from '@kidase/shared';
import { repositories } from '../repositories';
import { AppBootstrapService } from './AppBootstrapService';

/** Desktop ExcelImportService: adds Tauri filesystem path-based imports. */
class DesktopExcelImportService extends ExcelImportService {
  async importFromPath(filePath: string, templateId: string, onProgress?: (current: number, total: number) => void): Promise<ImportResult> {
    const data = await readFile(filePath);
    return this.importFromArrayBuffer(data.buffer, templateId, onProgress);
  }

  async importGitsaweFromPath(filePath: string, onProgress?: (current: number, total: number) => void) {
    const data = await readFile(filePath);
    return this.importGitsaweFromArrayBuffer(data.buffer, onProgress);
  }

  async importVersesFromPath(filePath: string, onProgress?: (current: number, total: number) => void) {
    const data = await readFile(filePath);
    return this.importVersesFromArrayBuffer(data.buffer, onProgress);
  }
}

/** Desktop PresentationService: adds Tauri filesystem path-based imports. */
class DesktopPresentationService extends PresentationService {
  async importFromPath(filePath: string, templateId: string): Promise<LoadedPresentation> {
    const data = await readFile(filePath);
    return this.importFromArrayBuffer(data.buffer, templateId);
  }

  async prepareImportFromPath(filePath: string, templateId: string, onProgress?: (current: number, total: number) => void): Promise<ImportOutcome> {
    const data = await readFile(filePath);
    return this.prepareImportFromArrayBuffer(data.buffer, templateId, onProgress);
  }
}

// Wired singletons (backed by the SQLite repositories)
export const excelImportService = new DesktopExcelImportService(repositories);
export const presentationService = new DesktopPresentationService(repositories, excelImportService);
export const appBootstrapService = new AppBootstrapService(presentationService);

// Re-export shared services + rule engine so existing call sites keep importing from '../services'
export {
  PlaceholderService,
  placeholderService,
  ExcelImportService,
  PresentationService,
  RuleEngine,
  ruleEngine,
} from '@kidase/shared';
export type {
  ImportResult,
  LoadedPresentation,
  ImportOutcome,
  ImportConflict,
} from '@kidase/shared';

// Desktop-only services
export { PdfExportService, pdfExportService } from './PdfExportService';
export { PptxExportService, pptxExportService } from './PptxExportService';
export { BackupService, backupService } from './BackupService';
export type { BackupData } from './BackupService';
export { AppBootstrapService } from './AppBootstrapService';
