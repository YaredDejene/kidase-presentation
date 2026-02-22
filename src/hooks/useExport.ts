import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/appStore';
import { pdfExportService } from '../services/PdfExportService';
import { pptxExportService } from '../services/PptxExportService';
import { save } from '@tauri-apps/plugin-dialog';
import { toast } from '../store/toastStore';
import { Template } from '../domain/entities/Template';
import { Variable } from '../domain/entities/Variable';
import { LanguageMap } from '../domain/entities/Presentation';
import { Slide } from '../domain/entities/Slide';

function buildPerSlideMaps(slides: Slide[]) {
  const store = useAppStore.getState();
  const templateMap = new Map<string, Template>();
  const variablesMap = new Map<string, Variable[]>();
  const languageMapMap = new Map<string, LanguageMap>();

  for (const slide of slides) {
    const tmpl = store.getTemplateForSlide(slide);
    if (tmpl) templateMap.set(slide.id, tmpl);
    variablesMap.set(slide.id, store.getVariablesForSlide(slide));
    languageMapMap.set(slide.id, store.getLanguageMapForSlide(slide));
  }

  return {
    templateMap: templateMap.size > 0 ? templateMap : undefined,
    variablesMap: variablesMap.size > 0 ? variablesMap : undefined,
    languageMapMap: languageMapMap.size > 0 ? languageMapMap : undefined,
  };
}

export function useExport(displaySlides: Slide[]) {
  const { t } = useTranslation('presentation');
  const {
    currentPresentation,
    currentTemplate,
    currentVariables,
    ruleContextMeta,
  } = useAppStore();

  const handleExportPdf = async () => {
    if (!currentPresentation || !currentTemplate) return;

    const filePath = await save({
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
      defaultPath: `${currentPresentation.name}.pdf`,
    });

    if (!filePath) return;

    const progress = toast.progress(t('exportingPdf', { total: displaySlides.length }));
    const { templateMap, variablesMap, languageMapMap } = buildPerSlideMaps(displaySlides);

    try {
      const blob = await pdfExportService.exportToPdf(
        displaySlides,
        currentTemplate,
        currentVariables,
        currentPresentation.languageMap,
        {},
        (current, total) => {
          const pct = Math.round((current / total) * 100);
          progress.update(pct, t('exportingSlide', { current, total }));
        },
        ruleContextMeta,
        templateMap,
        variablesMap,
        languageMapMap
      );

      const { writeFile } = await import('@tauri-apps/plugin-fs');
      const arrayBuffer = await blob.arrayBuffer();
      await writeFile(filePath, new Uint8Array(arrayBuffer));
      progress.done(t('pdfExportedSuccess'));
    } catch (error) {
      console.error('Export failed:', error);
      progress.fail(t('failedToExportPdf', { message: error instanceof Error ? error.message : String(error) }));
    }
  };

  const handleExportPptx = async () => {
    if (!currentPresentation || !currentTemplate) return;

    const filePath = await save({
      filters: [{ name: 'PPTX', extensions: ['pptx'] }],
      defaultPath: `${currentPresentation.name}.pptx`,
    });

    if (!filePath) return;

    const progress = toast.progress(t('exportingPptx', { total: displaySlides.length }));
    const { templateMap, variablesMap, languageMapMap } = buildPerSlideMaps(displaySlides);

    try {
      const blob = await pptxExportService.exportToPptx(
        displaySlides,
        currentTemplate,
        currentVariables,
        currentPresentation.languageMap,
        (current: number, total: number) => {
          const pct = Math.round((current / total) * 100);
          progress.update(pct, t('exportingSlide', { current, total }));
        },
        ruleContextMeta,
        templateMap,
        variablesMap,
        languageMapMap
      );

      const { writeFile } = await import('@tauri-apps/plugin-fs');
      const arrayBuffer = await blob.arrayBuffer();
      await writeFile(filePath, new Uint8Array(arrayBuffer));
      progress.done(t('pptxExportedSuccess'));
    } catch (error) {
      console.error('PPTX export failed:', error);
      progress.fail(t('failedToExportPptx', { message: error instanceof Error ? error.message : String(error) }));
    }
  };

  return { handleExportPdf, handleExportPptx };
}
