// Export all services
export { PlaceholderService, placeholderService } from './PlaceholderService';
export { ExcelImportService, excelImportService } from './ExcelImportService';
export type { ImportResult } from './ExcelImportService';
export { PdfExportService, pdfExportService } from './PdfExportService';
export type { PdfExportOptions } from './PdfExportService';
export { PresentationService, presentationService } from './PresentationService';
export type { LoadedPresentation } from './PresentationService';

// Re-export rule engine for convenience
export { RuleEngine, ruleEngine } from '../engine';
