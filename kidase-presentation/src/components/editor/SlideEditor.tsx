import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/appStore';
import { useSlides } from '../../hooks/useSlides';
import { usePresentation } from '../../hooks/usePresentation';
import { useResizablePanel } from '../../hooks/useResizablePanel';
import { SlideRow } from './SlideRow';
import { SlideContentPanel } from './SlideContentPanel';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Presentation } from '../../domain/entities/Presentation';
import '../../styles/editor.css';

export const SlideEditor: React.FC = () => {
  const { t } = useTranslation('editor');
  const {
    currentTemplate,
    currentPresentation,
    currentSlides,
    allTemplates,
    setCurrentPresentation,
  } = useAppStore();

  const {
    selectedSlideId,
    selectSlide,
    moveSlide,
    toggleDisabled,
    deleteSlide,
    setTemplateOverride,
  } = useSlides();

  const {
    listPresentations,
    loadPresentation: loadPresentationById,
    updatePresentation,
  } = usePresentation();

  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [confirmDeleteSlideId, setConfirmDeleteSlideId] = useState<string | null>(null);
  const [isPrimary, setIsPrimary] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const { width: listWidth, handleResizeStart } = useResizablePanel(containerRef);

  // Load all presentations
  useEffect(() => {
    listPresentations().then(setPresentations);
  }, [listPresentations]);

  // Sync isPrimary when presentation changes
  useEffect(() => {
    if (currentPresentation) {
      setIsPrimary(currentPresentation.isPrimary);
    }
  }, [currentPresentation?.isPrimary]);

  // Select first slide if none selected
  useEffect(() => {
    if (currentSlides.length > 0 && !selectedSlideId) {
      selectSlide(currentSlides[0].id);
    }
  }, [currentSlides, selectedSlideId, selectSlide]);

  const currentSelectedSlide = useMemo(() => {
    if (!selectedSlideId) return null;
    return currentSlides.find(s => s.id === selectedSlideId) || null;
  }, [selectedSlideId, currentSlides]);

  const activeCount = currentSlides.filter(s => !s.isDisabled).length;

  const handleKidaseChange = useCallback(async (id: string) => {
    if (!id || id === currentPresentation?.id) return;
    await loadPresentationById(id);
  }, [currentPresentation, loadPresentationById]);

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      moveSlide(draggedIndex, index);
      setDraggedIndex(index);
    }
  }, [draggedIndex, moveSlide]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  const handleTemplateOverrideChange = useCallback(async (value: string) => {
    if (!selectedSlideId) return;
    await setTemplateOverride(selectedSlideId, value || null);
  }, [selectedSlideId, setTemplateOverride]);

  if (!currentPresentation || !currentTemplate) {
    return (
      <div className="editor-empty">
        <div className="editor-empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </div>
        <h2>{t('noPresentationLoaded')}</h2>
        <p>{t('selectKidaseToEdit')}</p>
      </div>
    );
  }

  return (
    <div className="editor-page" ref={containerRef}>
      {/* Toolbar */}
      <div className="editor-toolbar">
        <div className="editor-toolbar-left">
          <span className="editor-title">{currentPresentation.name}</span>
          <span className="editor-count">
            {activeCount} {t('slides')}
          </span>
        </div>
        <div className="editor-toolbar-right">
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
          <select
            className="editor-kidase-select"
            value={currentPresentation.id}
            onChange={(e) => handleKidaseChange(e.target.value)}
          >
            {presentations.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main content */}
      <div className="editor-content">
        {/* Slide list */}
        <div
          className="editor-slide-list"
          style={listWidth ? { width: `${listWidth}px`, flex: 'none' } : undefined}
        >
          <div className="editor-slide-table-container">
            <table className="editor-slide-table">
              <thead>
                <tr>
                  <th className="col-order">#</th>
                  <th className="col-content">{t('content')}</th>
                  <th className="col-actions"></th>
                </tr>
              </thead>
              <tbody>
                {currentSlides.map((slide, index) => (
                  <SlideRow
                    key={slide.id}
                    slide={slide}
                    index={index}
                    isSelected={slide.id === selectedSlideId}
                    isDynamic={slide.isDynamic}
                    hasTemplateOverride={!!slide.templateOverrideId}
                    languageMap={currentPresentation.languageMap}
                    onSelect={() => selectSlide(slide.id)}
                    onToggleDisable={() => toggleDisabled(slide.id)}
                    onDelete={() => setConfirmDeleteSlideId(slide.id)}
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    isDragging={draggedIndex === index}
                  />
                ))}
              </tbody>
            </table>

            {currentSlides.length === 0 && (
              <div className="editor-no-slides">
                <p>{t('noSlides')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Resize handle */}
        <div
          className="editor-resize-handle"
          onMouseDown={handleResizeStart}
        />

        {/* Content panel */}
        <div className="editor-preview-panel">
          {currentSelectedSlide ? (
            <>
              <SlideContentPanel
                slide={currentSelectedSlide}
                languageMap={currentPresentation.languageMap}
                languageSettings={currentPresentation.languageSettings}
                template={currentTemplate}
              />

              {/* Template override */}
              <div className="editor-template-override">
                <label className="editor-template-override-label">{t('templateOverride')}</label>
                <select
                  value={currentSelectedSlide.templateOverrideId || ''}
                  onChange={(e) => handleTemplateOverrideChange(e.target.value)}
                  className="editor-template-override-select"
                >
                  <option value="">{t('defaultTemplate', { name: currentTemplate.name })}</option>
                  {allTemplates
                    .filter(tmpl => tmpl.id !== currentPresentation.templateId)
                    .map(tmpl => (
                      <option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>
                    ))}
                </select>
              </div>
            </>
          ) : (
            <div className="editor-preview-empty">
              <p>{t('selectSlideToView')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete slide confirmation */}
      <ConfirmDialog
        isOpen={!!confirmDeleteSlideId}
        title={t('deleteSlide')}
        message={t('deleteSlideConfirm')}
        onConfirm={() => {
          if (confirmDeleteSlideId) deleteSlide(confirmDeleteSlideId);
          setConfirmDeleteSlideId(null);
        }}
        onCancel={() => setConfirmDeleteSlideId(null)}
      />

      {/* Kidase Settings Dialog */}
      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title={t('kidaseSettings')}>
        <div className="dialog-content">
          <div className="form-group">
            <div className="setting-row">
              <div className="setting-label">
                <span>{t('primaryKidase')}</span>
                <span className="setting-hint">{t('primaryKidaseHint')}</span>
              </div>
              <button
                className={`toggle-switch ${isPrimary ? 'active' : ''}`}
                onClick={() => setIsPrimary(!isPrimary)}
              >
                <span className="toggle-knob" />
              </button>
            </div>
          </div>
          <div className="dialog-actions">
            <button onClick={() => setShowSettings(false)} className="btn-cancel">
              {t('common:cancel')}
            </button>
            <button
              onClick={async () => {
                if (currentPresentation) {
                  const updated = await updatePresentation(currentPresentation.id, { isPrimary });
                  if (updated) setCurrentPresentation(updated);
                }
                setShowSettings(false);
              }}
              className="btn-save"
            >
              {t('common:save')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
