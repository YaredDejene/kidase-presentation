import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/appStore';
import { useRules } from '../../hooks/useRules';
import { useTemplates } from '../../hooks/useTemplates';
import { useExport } from '../../hooks/useExport';
import { useSecondaryKidase } from '../../hooks/useSecondaryKidase';
import { useResizablePanel } from '../../hooks/useResizablePanel';
import { SlidePreview } from '../editor/SlidePreview';
import { PresentationSettingsDialog } from '../dialogs/PresentationSettingsDialog';
import { GitsaweInfoPanel } from './GitsaweInfoPanel';
import { getSlidePreviewText, getSlideTitle } from '../../domain/entities/Slide';
import { Variable } from '../../domain/entities/Variable';
import '../../styles/presentation-page.css';

export const PresentationPage: React.FC = () => {
  const { t } = useTranslation('presentation');
  const {
    currentPresentation,
    currentTemplate,
    currentSlides,
    currentVariables,
    secondaryPresentation,
    secondarySlides,
    verses,
    ruleFilteredSlideIds,
    ruleContextMeta,
    startPresentation,
    setCurrentPresentation,
    setCurrentTemplate,
    setCurrentVariables,
    getMergedEnabledSlides,
    getTemplateForSlide,
    getVariablesForSlide,
    getLanguageMapForSlide,
    getLanguageSettingsForSlide,
  } = useAppStore();

  const { evaluateRules } = useRules();
  const { templates, getTemplateById } = useTemplates();

  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { width: listWidth, handleResizeStart } = useResizablePanel(containerRef);

  // Evaluate rules when presentation changes (also builds gitsawe context)
  useEffect(() => {
    if (currentPresentation) {
      evaluateRules();
    }
  }, [evaluateRules, currentPresentation]);

  // Load secondary kidase based on gitsawe.kidaseType
  useSecondaryKidase(evaluateRules);

  // Get the filtered/expanded slides for display (merged primary + secondary)
  const displaySlides = useMemo(() => {
    return getMergedEnabledSlides();
  }, [currentSlides, secondarySlides, ruleFilteredSlideIds, ruleContextMeta, verses, getMergedEnabledSlides]);

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

  // Resolve per-slide properties for selected slide
  const resolvedTemplate = useMemo(() => {
    if (!selectedSlide || !currentTemplate) return currentTemplate;
    return getTemplateForSlide(selectedSlide) || currentTemplate;
  }, [selectedSlide, currentTemplate, getTemplateForSlide]);

  const resolvedVariables = useMemo(() => {
    if (!selectedSlide) return currentVariables;
    return getVariablesForSlide(selectedSlide);
  }, [selectedSlide, currentVariables, getVariablesForSlide]);

  const resolvedLanguageMap = useMemo(() => {
    if (!selectedSlide || !currentPresentation) return currentPresentation?.languageMap ?? {};
    return getLanguageMapForSlide(selectedSlide);
  }, [selectedSlide, currentPresentation, getLanguageMapForSlide]);

  const resolvedLanguageSettings = useMemo(() => {
    if (!selectedSlide || !currentPresentation) return currentPresentation?.languageSettings;
    return getLanguageSettingsForSlide(selectedSlide);
  }, [selectedSlide, currentPresentation, getLanguageSettingsForSlide]);

  const { handleExportPdf, handleExportPptx } = useExport(displaySlides);

  // Close export dropdown on outside click
  useEffect(() => {
    if (!showExportMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showExportMenu]);

  const handleSettingsClose = useCallback(() => {
    setShowSettings(false);
    if (currentPresentation) {
      const updatedTemplate = getTemplateById(currentPresentation.templateId);
      if (updatedTemplate) setCurrentTemplate(updatedTemplate);
    }
  }, [currentPresentation, getTemplateById, setCurrentTemplate]);

  const handleVariablesChange = useCallback(
    (vars: Variable[]) => setCurrentVariables(vars),
    [setCurrentVariables]
  );

  const handleTemplateChange = useCallback(
    (templateId: string) => {
      const newTemplate = getTemplateById(templateId);
      if (newTemplate) setCurrentTemplate(newTemplate);
    },
    [getTemplateById, setCurrentTemplate]
  );

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
        <h2>{t('noPresentationLoaded')}</h2>
        <p>{t('selectKidaseToStart')}</p>
      </div>
    );
  }

  return (
    <div className="pres-page" ref={containerRef}>
      {/* Toolbar */}
      <div className="pres-page-toolbar">
        <div className="pres-page-toolbar-left">
          <span className="pres-page-name">
            {currentPresentation.name}
            {secondaryPresentation && ` + ${secondaryPresentation.name}`}
          </span>
          <span className="pres-page-count">{displaySlides.length} {t('slides')}</span>
        </div>
        <div className="pres-page-toolbar-right">
          <button
            onClick={() => setShowSettings(true)}
            className="btn-icon"
            title={t('presentationSettings')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
          <div className="pres-page-export-dropdown" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(prev => !prev)}
              className="pres-page-btn pres-page-btn-export"
            >
              {t('exportPdf')}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 6 }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {showExportMenu && (
              <div className="pres-page-export-menu">
                <button onClick={() => { setShowExportMenu(false); handleExportPdf(); }}>
                  {t('exportPdf')}
                </button>
                <button onClick={() => { setShowExportMenu(false); handleExportPptx(); }}>
                  {t('exportPptx')}
                </button>
              </div>
            )}
          </div>
          <button
            onClick={startPresentation}
            disabled={displaySlides.length === 0}
            className="pres-page-btn pres-page-btn-present"
          >
            {t('presentF5')}
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
                  <span className={`slide-order-badge ${isVerse ? 'slide-order-badge-verse' : ''}`}>{index + 1}</span>
                  <div className="pres-page-slide-text">
                    {title && <div className="pres-page-slide-title">{title}</div>}
                    <div className="pres-page-slide-preview">{preview}</div>
                  </div>
                </div>
              );
            })}

            {displaySlides.length === 0 && (
              <div className="pres-page-no-slides">
                <p>{t('noSlidesToDisplay')}</p>
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
                variables={resolvedVariables}
                languageMap={resolvedLanguageMap}
                languageSettings={resolvedLanguageSettings}
                meta={ruleContextMeta}
              />
              <div className="pres-page-slide-details">
                <div className="pres-page-detail-row">
                  <span className="pres-page-detail-label">{t('order')}:</span>
                  <span>{selectedSlide.slideOrder}</span>
                </div>
                {selectedSlide.lineId && (
                  <div className="pres-page-detail-row">
                    <span className="pres-page-detail-label">{t('lineId')}:</span>
                    <span>{selectedSlide.lineId}</span>
                  </div>
                )}
                {selectedSlide.notes && (
                  <div className="pres-page-detail-row">
                    <span className="pres-page-detail-label">{t('notes')}:</span>
                    <span className="pres-page-detail-notes">{selectedSlide.notes}</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="pres-page-preview-empty">
              <p>{t('selectSlideToPreview')}</p>
            </div>
          )}

          {ruleContextMeta?.gitsawe != null && (
            <GitsaweInfoPanel gitsawe={ruleContextMeta.gitsawe as Record<string, unknown>} />
          )}
        </div>
      </div>

      {/* Presentation Settings Dialog */}
      <PresentationSettingsDialog
        isOpen={showSettings}
        onClose={handleSettingsClose}
        presentation={currentPresentation}
        variables={currentVariables}
        slides={currentSlides}
        template={currentTemplate}
        templates={templates}
        onPresentationChange={setCurrentPresentation}
        onVariablesChange={handleVariablesChange}
        onTemplateChange={handleTemplateChange}
      />
    </div>
  );
};
