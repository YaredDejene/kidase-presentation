import { useCallback, useEffect, useState } from 'react';
import { useAppStore } from './store/appStore';
import { SlideEditor } from './components/editor/SlideEditor';
import { PresentationView } from './components/presentation/PresentationView';
import { PresentationSettingsDialog } from './components/dialogs/PresentationSettingsDialog';
import { SettingsDialog } from './components/dialogs/SettingsDialog';
import {
  templateRepository,
  presentationRepository,
  slideRepository,
  variableRepository,
  appSettingsRepository,
  ruleRepository,
  gitsaweRepository,
} from './repositories';
import { Template, createDefaultTemplate } from './domain/entities/Template';
import { Presentation } from './domain/entities/Presentation';
import { Variable } from './domain/entities/Variable';
import { createRuleDefinition } from './domain/entities/RuleDefinition';
import { excelImportService } from './services/ExcelImportService';
import { pdfExportService } from './services/PdfExportService';
import { open, save } from '@tauri-apps/plugin-dialog';
import { toast } from './store/toastStore';
import { ToastContainer } from './components/common/Toast';
import './styles/global.css';
import './styles/app.css';

function App() {
  const {
    currentPresentation,
    currentSlides,
    currentTemplate,
    currentVariables,
    isPresenting,
    ruleFilteredSlideIds,
    setCurrentPresentation,
    setCurrentSlides,
    setCurrentTemplate,
    setCurrentVariables,
    setAppSettings,
    startPresentation,
  } = useAppStore();

  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPresentationSettings, setShowPresentationSettings] = useState(false);
  const [showAppSettings, setShowAppSettings] = useState(false);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load app settings
        const settings = await appSettingsRepository.get();
        setAppSettings(settings);

        // Load all templates
        let loadedTemplates = await templateRepository.getAll();

        // Create or update default template
        const defaultDef = createDefaultTemplate();
        const existingDefault = loadedTemplates.find(t => t.name === 'Default Template');

        if (existingDefault) {
          // Update existing default template with latest definition
          const updated = await templateRepository.update(existingDefault.id, {
            definitionJson: defaultDef,
          });
          loadedTemplates = loadedTemplates.map(t =>
            t.id === updated.id ? updated : t
          );
        } else {
          // Create default template if none exist
          const defaultTemplate = await templateRepository.create({
            name: 'Default Template',
            maxLangCount: 4,
            definitionJson: defaultDef,
          });
          loadedTemplates = [...loadedTemplates, defaultTemplate];
        }
        setTemplates(loadedTemplates);

        // Load all presentations
        const loadedPresentations = await presentationRepository.getAll();
        setPresentations(loadedPresentations);

        // Load active presentation if exists
        const active = await presentationRepository.getActive();
        if (active) {
          await loadPresentation(active.id);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      }
      setIsLoading(false);
    };

    loadData();
  }, []);

  const loadPresentation = useCallback(async (id: string) => {
    const presentation = await presentationRepository.getById(id);
    if (!presentation) return;

    const slides = await slideRepository.getByPresentationId(id);
    const template = await templateRepository.getById(presentation.templateId);
    const variables = await variableRepository.getByPresentationId(id);

    setCurrentPresentation(presentation);
    setCurrentSlides(slides);
    setCurrentTemplate(template);
    setCurrentVariables(variables);

    await presentationRepository.setActive(id);
  }, [setCurrentPresentation, setCurrentSlides, setCurrentTemplate, setCurrentVariables]);

  const handleImportExcel = async () => {
    const filePath = await open({
      filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
    });

    if (!filePath || typeof filePath !== 'string') return;

    try {
      const result = await excelImportService.importFromPath(
        filePath,
        templates[0].id // Use first template as default
      );

      // Create presentation
      const presentation = await presentationRepository.create(result.presentation);

      // Create slides with presentation ID
      const slidesWithId = result.slides.map(s => ({
        ...s,
        presentationId: presentation.id,
      }));
      const createdSlides = await slideRepository.createMany(slidesWithId);

      // Create variables with presentation ID
      for (const variable of result.variables) {
        await variableRepository.create({
          ...variable,
          presentationId: presentation.id,
        });
      }

      // Create display rules linked to slides
      for (const displayRule of result.displayRules) {
        const slide = createdSlides[displayRule.slideIndex];
        if (!slide) continue;

        const ruleDef = createRuleDefinition(
          displayRule.name,
          'slide',
          displayRule.ruleJson,
          {
            presentationId: presentation.id,
            slideId: slide.id,
            isEnabled: true,
          }
        );
        await ruleRepository.create(ruleDef);
      }

      // Import Gitsawe records (reference data — clear and replace)
      if (result.gitsawes.length > 0) {
        const existingGitsawes = await gitsaweRepository.getAll();
        for (const existing of existingGitsawes) {
          await ruleRepository.deleteByGitsaweId(existing.id);
          await gitsaweRepository.delete(existing.id);
        }

        for (const imported of result.gitsawes) {
          const created = await gitsaweRepository.create(imported.gitsawe);
          if (imported.selectionRule) {
            const gitsaweRuleDef = createRuleDefinition(
              imported.selectionRule.name,
              'gitsawe',
              imported.selectionRule.ruleJson,
              {
                gitsaweId: created.id,
                isEnabled: true,
              }
            );
            await ruleRepository.create(gitsaweRuleDef);
          }
        }
      }

      // Refresh and load the new presentation
      setPresentations(await presentationRepository.getAll());
      await loadPresentation(presentation.id);
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('Failed to import Excel file: ' + (error as Error).message);
    }
  };

  const handleVariablesChange = useCallback((updatedVariables: Variable[]) => {
    setCurrentVariables(updatedVariables);
  }, [setCurrentVariables]);

  const handleSettingsClose = useCallback(async () => {
    setShowPresentationSettings(false);
    // Reload template to get any changes made in the dialog
    if (currentPresentation) {
      const updatedTemplate = await templateRepository.getById(currentPresentation.templateId);
      if (updatedTemplate) setCurrentTemplate(updatedTemplate);
    }
  }, [currentPresentation, setCurrentTemplate]);

  const handleTemplateChange = useCallback(async (templateId: string) => {
    const newTemplate = await templateRepository.getById(templateId);
    if (newTemplate) setCurrentTemplate(newTemplate);
  }, [setCurrentTemplate]);

  const handleDelete = useCallback(async () => {
    useAppStore.getState().clearPresentationData();
    setPresentations(await presentationRepository.getAll());
  }, []);

  const handleExportPdf = async () => {
    if (!currentPresentation || !currentTemplate) return;

    const filePath = await save({
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
      defaultPath: `${currentPresentation.name}.pdf`,
    });

    if (!filePath) return;

    // Filter slides: skip disabled and rule-hidden slides
    let exportSlides = currentSlides.filter(s => !s.isDisabled);
    if (ruleFilteredSlideIds !== null) {
      exportSlides = exportSlides.filter(s => ruleFilteredSlideIds.includes(s.id));
    }

    const progress = toast.progress(`Exporting PDF (0/${exportSlides.length})...`);

    try {
      const blob = await pdfExportService.exportToPdf(
        exportSlides,
        currentTemplate,
        currentVariables,
        currentPresentation.languageMap,
        {},
        (current, total) => {
          const pct = Math.round((current / total) * 100);
          progress.update(pct, `Exporting slide ${current}/${total}...`);
        }
      );

      // Convert blob to array buffer and write to file
      const { writeFile } = await import('@tauri-apps/plugin-fs');
      const arrayBuffer = await blob.arrayBuffer();
      await writeFile(filePath, new Uint8Array(arrayBuffer));

      progress.done('PDF exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      progress.fail('Failed to export PDF: ' + (error as Error).message);
    }
  };

  if (isLoading) {
    return (
      <div className="app-loading">
        Loading...
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        {/* Left side: App title and global settings */}
        <div className="app-header-left">
          <h1 className="app-header-title">
            Kidase Presentation
          </h1>
          <button
            onClick={() => setShowAppSettings(true)}
            className="app-settings-btn"
            title="Application Settings"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>

        {/* Right side: Presentation actions */}
        <div className="app-header-right">
          {/* Presentation selector */}
          <select
            value={currentPresentation?.id || ''}
            onChange={(e) => e.target.value && loadPresentation(e.target.value)}
            className="app-select"
          >
            <option value="">Select Presentation</option>
            {presentations.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Actions */}
          <button
            onClick={handleImportExcel}
            className="app-btn app-btn-import"
          >
            Import Excel
          </button>

          <button
            onClick={handleExportPdf}
            disabled={!currentPresentation}
            className="app-btn app-btn-export"
          >
            Export PDF
          </button>

          <button
            onClick={() => setShowPresentationSettings(true)}
            disabled={!currentPresentation}
            className="app-btn app-btn-settings"
            title="Presentation settings"
          >
            <span className="app-btn-settings-icon">⚙</span>
            Settings
          </button>

          <button
            onClick={startPresentation}
            disabled={!currentPresentation || currentSlides.length === 0}
            className="app-btn app-btn-present"
          >
            Present (F5)
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="app-main">
        <SlideEditor />
      </main>

      {/* Presentation overlay */}
      {isPresenting && <PresentationView />}

      {/* Dialogs */}
      {currentPresentation && currentTemplate && (
        <PresentationSettingsDialog
          isOpen={showPresentationSettings}
          onClose={handleSettingsClose}
          presentation={currentPresentation}
          variables={currentVariables}
          slides={currentSlides}
          template={currentTemplate}
          templates={templates}
          onPresentationChange={setCurrentPresentation}
          onVariablesChange={handleVariablesChange}
          onTemplateChange={handleTemplateChange}
          onDelete={handleDelete}
        />
      )}

      {/* Application Settings Dialog */}
      <SettingsDialog
        isOpen={showAppSettings}
        onClose={() => setShowAppSettings(false)}
      />

      <ToastContainer />
    </div>
  );
}

export default App;