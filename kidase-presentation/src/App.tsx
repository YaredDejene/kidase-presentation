import { useEffect, useState } from 'react';
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
} from './repositories';
import { Template, createDefaultTemplate } from './domain/entities/Template';
import { Presentation } from './domain/entities/Presentation';
import { Variable } from './domain/entities/Variable';
import { createRuleDefinition } from './domain/entities/RuleDefinition';
import { excelImportService } from './services/ExcelImportService';
import { pdfExportService } from './services/PdfExportService';
import { open, save } from '@tauri-apps/plugin-dialog';
import './styles/global.css';

function App() {
  const {
    currentPresentation,
    currentSlides,
    currentTemplate,
    currentVariables,
    isPresenting,
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

  const loadPresentation = async (id: string) => {
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
  };

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

      // Refresh and load the new presentation
      setPresentations(await presentationRepository.getAll());
      await loadPresentation(presentation.id);
    } catch (error) {
      console.error('Import failed:', error);
      alert('Failed to import Excel file: ' + (error as Error).message);
    }
  };

  const handleVariablesChange = (updatedVariables: Variable[]) => {
    setCurrentVariables(updatedVariables);
  };

  const handleExportPdf = async () => {
    if (!currentPresentation || !currentTemplate) return;

    const filePath = await save({
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
      defaultPath: `${currentPresentation.name}.pdf`,
    });

    if (!filePath) return;

    try {
      const blob = await pdfExportService.exportToPdf(
        currentSlides,
        currentTemplate,
        currentVariables,
        currentPresentation.languageMap
      );

      // Convert blob to array buffer and write to file
      const { writeFile } = await import('@tauri-apps/plugin-fs');
      const arrayBuffer = await blob.arrayBuffer();
      await writeFile(filePath, new Uint8Array(arrayBuffer));

      alert('PDF exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export PDF: ' + (error as Error).message);
    }
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#0a0a0a',
        color: '#fff',
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: '#0a0a0a',
      color: '#fff',
    }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 20px',
        borderBottom: '1px solid #333',
        backgroundColor: '#1a1a1a',
      }}>
        {/* Left side: App title and global settings */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontSize: '18px', margin: 0 }}>
            Kidase Presentation
          </h1>
          <button
            onClick={() => setShowAppSettings(true)}
            style={{
              height: '32px',
              width: '32px',
              padding: '0',
              backgroundColor: 'transparent',
              border: '1px solid #444',
              borderRadius: '4px',
              color: '#888',
              cursor: 'pointer',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#333';
              e.currentTarget.style.color = '#fff';
              e.currentTarget.style.borderColor = '#555';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#888';
              e.currentTarget.style.borderColor = '#444';
            }}
            title="Application Settings"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>

        {/* Right side: Presentation actions */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Presentation selector */}
          <select
            value={currentPresentation?.id || ''}
            onChange={(e) => e.target.value && loadPresentation(e.target.value)}
            style={{
              height: '36px',
              padding: '0 12px',
              backgroundColor: '#333',
              border: '1px solid #555',
              borderRadius: '4px',
              color: 'white',
              minWidth: '200px',
              fontSize: '14px',
            }}
          >
            <option value="">Select Presentation</option>
            {presentations.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Actions */}
          <button
            onClick={handleImportExcel}
            style={{
              height: '36px',
              padding: '0 16px',
              backgroundColor: '#2a4a2a',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Import Excel
          </button>

          <button
            onClick={handleExportPdf}
            disabled={!currentPresentation}
            style={{
              height: '36px',
              padding: '0 16px',
              backgroundColor: currentPresentation ? '#4a2a4a' : '#333',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: currentPresentation ? 'pointer' : 'not-allowed',
              fontSize: '14px',
            }}
          >
            Export PDF
          </button>

          <button
            onClick={() => setShowPresentationSettings(true)}
            disabled={!currentPresentation}
            style={{
              height: '36px',
              padding: '0 14px',
              backgroundColor: currentPresentation ? '#2a3a4a' : '#333',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: currentPresentation ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="Presentation settings"
          >
            <span style={{ fontSize: '16px' }}>⚙</span>
            Settings
          </button>

          <button
            onClick={startPresentation}
            disabled={!currentPresentation || currentSlides.length === 0}
            style={{
              height: '36px',
              padding: '0 16px',
              backgroundColor: currentPresentation && currentSlides.length > 0
                ? '#4a4a2a'
                : '#333',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: currentPresentation && currentSlides.length > 0
                ? 'pointer'
                : 'not-allowed',
              fontWeight: 'bold',
              fontSize: '14px',
            }}
          >
            Present (F5)
          </button>
        </div>
      </header>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <SlideEditor />
      </main>

      {/* Presentation overlay */}
      {isPresenting && <PresentationView />}

      {/* Dialogs */}
      {currentPresentation && currentTemplate && (
        <PresentationSettingsDialog
          isOpen={showPresentationSettings}
          onClose={async () => {
            setShowPresentationSettings(false);
            // Reload template to get any changes made in the dialog
            if (currentPresentation) {
              const updatedTemplate = await templateRepository.getById(currentPresentation.templateId);
              if (updatedTemplate) setCurrentTemplate(updatedTemplate);
            }
          }}
          presentation={currentPresentation}
          variables={currentVariables}
          slides={currentSlides}
          template={currentTemplate}
          templates={templates}
          onPresentationChange={(p) => setCurrentPresentation(p)}
          onVariablesChange={handleVariablesChange}
          onTemplateChange={async (templateId) => {
            const newTemplate = await templateRepository.getById(templateId);
            if (newTemplate) setCurrentTemplate(newTemplate);
          }}
          onDelete={async () => {
            useAppStore.getState().clearPresentationData();
            setPresentations(await presentationRepository.getAll());
          }}
        />
      )}

      {/* Application Settings Dialog */}
      <SettingsDialog
        isOpen={showAppSettings}
        onClose={() => setShowAppSettings(false)}
      />
    </div>
  );
}

export default App;