import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useAppStore } from '../../store/appStore';
import { useSlides } from '../../hooks/useSlides';
import { SlideRow } from './SlideRow';
import { SlideContentPanel } from './SlideContentPanel';
import { Modal } from '../common/Modal';
import { Presentation } from '../../domain/entities/Presentation';
import { presentationRepository } from '../../repositories';
import { presentationService } from '../../services/PresentationService';
import '../../styles/editor.css';

export const SlideEditor: React.FC = () => {
  const {
    currentTemplate,
    currentPresentation,
    currentSlides,
    allTemplates,
    setCurrentPresentation,
    setCurrentSlides,
    setCurrentTemplate,
    setCurrentVariables,
  } = useAppStore();

  const {
    selectedSlideId,
    selectSlide,
    moveSlide,
    toggleDisabled,
    deleteSlide,
    setTemplateOverride,
  } = useSlides();

  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [listWidth, setListWidth] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isPrimary, setIsPrimary] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

  // Load all presentations
  useEffect(() => {
    presentationRepository.getAll().then(setPresentations);
  }, []);

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

  const disabledCount = currentSlides.filter(s => s.isDisabled).length;

  const handleKidaseChange = useCallback(async (id: string) => {
    if (!id || id === currentPresentation?.id) return;
    try {
      const loaded = await presentationService.loadPresentation(id);
      if (!loaded) return;
      setCurrentPresentation(loaded.presentation);
      setCurrentSlides(loaded.slides);
      setCurrentTemplate(loaded.template);
      setCurrentVariables(loaded.variables);
      await presentationRepository.setActive(id);
    } catch (error) {
      console.error('Failed to load kidase:', error);
    }
  }, [currentPresentation, setCurrentPresentation, setCurrentSlides, setCurrentTemplate, setCurrentVariables]);

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

  // Resizable panel handlers
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

  if (!currentPresentation || !currentTemplate) {
    return (
      <div className="editor-empty">
        <div className="editor-empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </div>
        <h2>No Presentation Loaded</h2>
        <p>Select a Kidase from the Kidases page to start editing.</p>
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
            {currentSlides.length} slides{disabledCount > 0 ? ` (${disabledCount} disabled)` : ''}
          </span>
        </div>
        <div className="editor-toolbar-right">
          <button
            onClick={() => setShowSettings(true)}
            className="editor-btn-icon"
            title="Presentation settings"
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
                  <th className="col-content">Content</th>
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
                    onDelete={() => deleteSlide(slide.id)}
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
                <p>No slides in this kidase.</p>
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
                <label className="editor-template-override-label">Template Override</label>
                <select
                  value={currentSelectedSlide.templateOverrideId || ''}
                  onChange={(e) => handleTemplateOverrideChange(e.target.value)}
                  className="editor-template-override-select"
                >
                  <option value="">Default ({currentTemplate.name})</option>
                  {allTemplates
                    .filter(t => t.id !== currentPresentation.templateId)
                    .map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
              </div>
            </>
          ) : (
            <div className="editor-preview-empty">
              <p>Select a slide to view its content</p>
            </div>
          )}
        </div>
      </div>

      {/* Kidase Settings Dialog */}
      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="Kidase Settings">
        <div className="dialog-content">
          <div className="form-group">
            <div className="setting-row">
              <div className="setting-label">
                <span>Primary Kidase</span>
                <span className="setting-hint">Primary kidase is the main service; secondary is supplementary</span>
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
              Cancel
            </button>
            <button
              onClick={async () => {
                if (currentPresentation) {
                  const updated = await presentationRepository.update(currentPresentation.id, { isPrimary });
                  setCurrentPresentation(updated);
                }
                setShowSettings(false);
              }}
              className="btn-save"
            >
              Save
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
