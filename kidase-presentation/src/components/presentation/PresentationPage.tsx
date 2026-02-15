import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAppStore } from '../../store/appStore';
import { useRules } from '../../hooks/useRules';
import { SlidePreview } from '../editor/SlidePreview';
import { PresentationSettingsDialog } from '../dialogs/PresentationSettingsDialog';
import { Slide } from '../../domain/entities/Slide';
import { Template } from '../../domain/entities/Template';
import { Variable } from '../../domain/entities/Variable';
import { templateRepository } from '../../repositories';
import { pdfExportService } from '../../services/PdfExportService';
import { save } from '@tauri-apps/plugin-dialog';
import { toast } from '../../store/toastStore';
import '../../styles/presentation-page.css';

export const PresentationPage: React.FC = () => {
  const {
    currentPresentation,
    currentTemplate,
    currentSlides,
    currentVariables,
    verses,
    ruleFilteredSlideIds,
    ruleContextMeta,
    startPresentation,
    setCurrentPresentation,
    setCurrentTemplate,
    setCurrentVariables,
    getEnabledSlides,
  } = useAppStore();

  const { evaluateRules } = useRules();

  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);
  const [listWidth, setListWidth] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

  // Load templates for the settings dialog
  useEffect(() => {
    templateRepository.getAll().then(setTemplates);
  }, []);

  // Evaluate rules when presentation changes (also builds gitsawe context)
  useEffect(() => {
    if (currentPresentation) {
      evaluateRules();
    }
  }, [evaluateRules, currentPresentation]);

  // Get the filtered/expanded slides for display
  const displaySlides = useMemo(() => {
    return getEnabledSlides();
  }, [currentSlides, ruleFilteredSlideIds, ruleContextMeta, verses, getEnabledSlides]);

  // Auto-select first slide when slides change
  useEffect(() => {
    if (displaySlides.length > 0 && !selectedSlideId) {
      setSelectedSlideId(displaySlides[0].id);
    } else if (displaySlides.length > 0 && selectedSlideId) {
      // Check if current selection is still valid
      if (!displaySlides.find(s => s.id === selectedSlideId)) {
        setSelectedSlideId(displaySlides[0].id);
      }
    } else if (displaySlides.length === 0) {
      setSelectedSlideId(null);
    }
  }, [displaySlides]);

  const selectedSlide = useMemo(() => {
    if (!selectedSlideId) return null;
    return displaySlides.find(s => s.id === selectedSlideId) || null;
  }, [selectedSlideId, displaySlides]);

  // Resolve template for selected slide (respects template overrides)
  const resolvedTemplate = useMemo(() => {
    if (!selectedSlide || !currentTemplate) return currentTemplate;
    return useAppStore.getState().getTemplateForSlide(selectedSlide) || currentTemplate;
  }, [selectedSlide, currentTemplate]);

  // Resizable panel
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - containerRect.left;
      const minWidth = 300;
      const maxWidth = containerRect.width - 350;
      setListWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)));
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  const handleExportPdf = async () => {
    if (!currentPresentation || !currentTemplate) return;

    const filePath = await save({
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
      defaultPath: `${currentPresentation.name}.pdf`,
    });

    if (!filePath) return;

    const exportSlides = displaySlides;
    const progress = toast.progress(`Exporting PDF (0/${exportSlides.length})...`);

    // Build template override map for per-slide templates
    const { allTemplates } = useAppStore.getState();
    const templateMap = new Map<string, Template>();
    for (const slide of exportSlides) {
      if (slide.templateOverrideId) {
        const override = allTemplates.find(t => t.id === slide.templateOverrideId);
        if (override) templateMap.set(slide.id, override);
      }
    }

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
        ruleContextMeta,
        templateMap.size > 0 ? templateMap : undefined
      );

      const { writeFile } = await import('@tauri-apps/plugin-fs');
      const arrayBuffer = await blob.arrayBuffer();
      await writeFile(filePath, new Uint8Array(arrayBuffer));
      progress.done('PDF exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      progress.fail('Failed to export PDF: ' + (error as Error).message);
    }
  };

  // Get preview text for a slide
  const getSlidePreviewText = (slide: Slide): string => {
    const blocks = slide.blocksJson || [];
    for (const block of blocks) {
      for (const key of ['Lang1', 'Lang2', 'Lang3', 'Lang4'] as const) {
        const val = block[key];
        if (val && typeof val === 'string' && val.trim()) {
          return val.trim().substring(0, 80);
        }
      }
    }
    return '(empty)';
  };

  const getSlideTitle = (slide: Slide): string | null => {
    if (!slide.titleJson) return null;
    for (const key of ['Lang1', 'Lang2', 'Lang3', 'Lang4'] as const) {
      const val = slide.titleJson[key];
      if (val && typeof val === 'string' && val.trim()) {
        return val.trim();
      }
    }
    return null;
  };

  if (!currentPresentation || !currentTemplate) {
    return (
      <div className="pres-page-empty">
        <div className="pres-page-empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        </div>
        <h2>No Presentation Loaded</h2>
        <p>Select a Kidase from the Kidases page to get started.</p>
      </div>
    );
  }

  return (
    <div className="pres-page" ref={containerRef}>
      {/* Toolbar */}
      <div className="pres-page-toolbar">
        <div className="pres-page-toolbar-left">
          <span className="pres-page-name">{currentPresentation.name}</span>
          <span className="pres-page-count">{displaySlides.length} slides</span>
        </div>
        <div className="pres-page-toolbar-right">
          <button
            onClick={() => setShowSettings(true)}
            className="pres-page-btn pres-page-btn-settings"
            title="Presentation settings"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            Settings
          </button>
          <button
            onClick={handleExportPdf}
            className="pres-page-btn pres-page-btn-export"
          >
            Export PDF
          </button>
          <button
            onClick={startPresentation}
            disabled={displaySlides.length === 0}
            className="pres-page-btn pres-page-btn-present"
          >
            Present (F5)
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="pres-page-content">
        {/* Slide list */}
        <div
          className="pres-page-list"
          style={listWidth ? { width: `${listWidth}px`, flex: 'none' } : undefined}
        >
          <div className="pres-page-list-scroll">
            {displaySlides.map((slide, index) => {
              const title = getSlideTitle(slide);
              const preview = getSlidePreviewText(slide);
              const isVerse = slide.id.includes('__verse_');
              return (
                <div
                  key={slide.id}
                  className={`pres-page-slide-row ${slide.id === selectedSlideId ? 'pres-page-slide-row--selected' : ''} ${isVerse ? 'pres-page-slide-row--verse' : ''}`}
                  onClick={() => setSelectedSlideId(slide.id)}
                >
                  <span className="pres-page-slide-num">{index + 1}</span>
                  <div className="pres-page-slide-text">
                    {title && <div className="pres-page-slide-title">{title}</div>}
                    <div className="pres-page-slide-preview">{preview}</div>
                  </div>
                </div>
              );
            })}

            {displaySlides.length === 0 && (
              <div className="pres-page-no-slides">
                <p>No slides to display.</p>
              </div>
            )}
          </div>
        </div>

        {/* Resize handle */}
        <div
          className="pres-page-resize-handle"
          onMouseDown={handleResizeStart}
        />

        {/* Preview panel */}
        <div className="pres-page-preview">
          {selectedSlide ? (
            <>
              <SlidePreview
                slide={selectedSlide}
                template={resolvedTemplate!}
                variables={currentVariables}
                languageMap={currentPresentation.languageMap}
                languageSettings={currentPresentation.languageSettings}
                meta={ruleContextMeta}
              />
              <div className="pres-page-slide-details">
                <div className="pres-page-detail-row">
                  <span className="pres-page-detail-label">Order:</span>
                  <span>{selectedSlide.slideOrder}</span>
                </div>
                {selectedSlide.lineId && (
                  <div className="pres-page-detail-row">
                    <span className="pres-page-detail-label">Line ID:</span>
                    <span>{selectedSlide.lineId}</span>
                  </div>
                )}
                {selectedSlide.notes && (
                  <div className="pres-page-detail-row">
                    <span className="pres-page-detail-label">Notes:</span>
                    <span className="pres-page-detail-notes">{selectedSlide.notes}</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="pres-page-preview-empty">
              <p>Select a slide to preview</p>
            </div>
          )}

          {ruleContextMeta?.gitsawe != null && (
            <GitsaweContext gitsawe={ruleContextMeta.gitsawe as Record<string, unknown>} />
          )}
        </div>
      </div>

      {/* Presentation Settings Dialog */}
      <PresentationSettingsDialog
        isOpen={showSettings}
        onClose={async () => {
          setShowSettings(false);
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
        onPresentationChange={setCurrentPresentation}
        onVariablesChange={(vars: Variable[]) => setCurrentVariables(vars)}
        onTemplateChange={async (templateId: string) => {
          const newTemplate = await templateRepository.getById(templateId);
          if (newTemplate) setCurrentTemplate(newTemplate);
        }}
      />
    </div>
  );
};

const gitsaweLabels: Record<string, string> = {
  lineId: 'Line ID',
  kidaseType: 'Kidase Type',
  gitsaweType: 'Gitsawe Type',
  messageStPaul: 'St. Paul',
  messageApostle: 'Apostle',
  messageBookOfActs: 'Book of Acts',
  messageApostleEvangelist: 'Apostle Evangelist',
  misbak: 'Misbak',
  wengel: 'Wengel',
  evangelist: 'Evangelist',
};

function GitsaweContext({ gitsawe }: { gitsawe: Record<string, unknown> }) {
  const entries = Object.entries(gitsaweLabels)
    .map(([key, label]) => ({ label, value: gitsawe[key] }))
    .filter((e): e is { label: string; value: string | number } => e.value != null && e.value !== '');

  if (entries.length === 0) return null;

  return (
    <div className="pres-page-gitsawe">
      <div className="pres-page-gitsawe-header">Current Gitsawe</div>
      <div className="pres-page-gitsawe-grid">
        {entries.map(({ label, value }) => (
          <div className="pres-page-gitsawe-row" key={label}>
            <span className="pres-page-gitsawe-label">{label}:</span>
            <span>{String(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
