import { useCallback, useEffect, useState } from 'react';
import { useAppStore } from './store/appStore';
import { SlideEditor } from './components/editor/SlideEditor';
import { KidaseManager } from './components/manager/KidaseManager';
import { PresentationView } from './components/presentation/PresentationView';
import { PresentationSettingsDialog } from './components/dialogs/PresentationSettingsDialog';
import { SettingsDialog } from './components/dialogs/SettingsDialog';
import {
  templateRepository,
  appSettingsRepository,
  verseRepository,
} from './repositories';
import { createDefaultTemplate, Template } from './domain/entities/Template';
import { Variable } from './domain/entities/Variable';
import { pdfExportService } from './services/PdfExportService';
import { save } from '@tauri-apps/plugin-dialog';
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
    currentView,
    isPresenting,
    ruleFilteredSlideIds,
    ruleContextMeta,
    setCurrentPresentation,
    setCurrentTemplate,
    setCurrentVariables,
    setCurrentView,
    setAppSettings,
    setVerses,
    startPresentation,
  } = useAppStore();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPresentationSettings, setShowPresentationSettings] = useState(false);
  const [showAppSettings, setShowAppSettings] = useState(false);

  // Load initial data (settings, templates, verses)
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
          const updated = await templateRepository.update(existingDefault.id, {
            definitionJson: defaultDef,
          });
          loadedTemplates = loadedTemplates.map(t =>
            t.id === updated.id ? updated : t
          );
        } else {
          const defaultTemplate = await templateRepository.create({
            name: 'Default Template',
            maxLangCount: 4,
            definitionJson: defaultDef,
          });
          loadedTemplates = [...loadedTemplates, defaultTemplate];
        }
        setTemplates(loadedTemplates);

        // Load reference data (verses)
        const loadedVerses = await verseRepository.getAll();
        setVerses(loadedVerses);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
      setIsLoading(false);
    };

    loadData();
  }, []);


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
    setCurrentView('manager');
  }, [setCurrentView]);

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
        },
        ruleContextMeta
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

  const isEditorView = currentView === 'editor';

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        {/* Left side: App title, settings, and nav */}
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

          {/* Navigation tabs */}
          <nav className="app-nav-tabs">
            <button
              className={`app-nav-tab ${!isEditorView ? 'app-nav-tab--active' : ''}`}
              onClick={() => setCurrentView('manager')}
            >
              Kidase
            </button>
            <button
              className={`app-nav-tab ${isEditorView ? 'app-nav-tab--active' : ''}`}
              onClick={() => setCurrentView('editor')}
              disabled={!currentPresentation}
            >
              Editor
            </button>
          </nav>
        </div>

        {/* Right side: Editor-specific actions (only visible in editor view) */}
        {isEditorView && (
          <div className="app-header-right">
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
        )}
      </header>

      {/* Main content */}
      <main className="app-main">
        {isEditorView ? <SlideEditor /> : <KidaseManager />}
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