import React, { useEffect, useState } from 'react';
import { useAppStore } from './store/appStore';
import { SlideEditor } from './components/editor/SlideEditor';
import { PresentationView } from './components/presentation/PresentationView';
import {
  templateRepository,
  presentationRepository,
  slideRepository,
  variableRepository
} from './repositories';
import { Template, createDefaultTemplate } from './domain/entities/Template';
import { Presentation } from './domain/entities/Presentation';
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
    startPresentation,
  } = useAppStore();

  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
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
      await slideRepository.createMany(slidesWithId);

      // Create variables with presentation ID
      for (const variable of result.variables) {
        await variableRepository.create({
          ...variable,
          presentationId: presentation.id,
        });
      }

      // Refresh and load the new presentation
      setPresentations(await presentationRepository.getAll());
      await loadPresentation(presentation.id);
    } catch (error) {
      console.error('Import failed:', error);
      alert('Failed to import Excel file: ' + (error as Error).message);
    }
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
        <h1 style={{ fontSize: '18px', margin: 0 }}>
          Kidase Presentation
        </h1>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Presentation selector */}
          <select
            value={currentPresentation?.id || ''}
            onChange={(e) => e.target.value && loadPresentation(e.target.value)}
            style={{
              padding: '8px 12px',
              backgroundColor: '#333',
              border: '1px solid #555',
              borderRadius: '4px',
              color: 'white',
              minWidth: '200px',
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
              padding: '8px 16px',
              backgroundColor: '#2a4a2a',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Import Excel
          </button>

          <button
            onClick={handleExportPdf}
            disabled={!currentPresentation}
            style={{
              padding: '8px 16px',
              backgroundColor: currentPresentation ? '#4a2a4a' : '#333',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: currentPresentation ? 'pointer' : 'not-allowed',
            }}
          >
            Export PDF
          </button>

          <button
            onClick={startPresentation}
            disabled={!currentPresentation || currentSlides.length === 0}
            style={{
              padding: '8px 16px',
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
    </div>
  );
}

export default App;