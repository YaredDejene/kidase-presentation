import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useAppStore } from '../../store/appStore';
import { useSlides } from '../../hooks/useSlides';
import { useRules } from '../../hooks/useRules';
import { SlideRow } from './SlideRow';
import { SlidePreview } from './SlidePreview';
import '../../styles/editor.css';

export const SlideEditor: React.FC = () => {
  const {
    currentTemplate,
    currentPresentation,
    currentVariables,
    currentSlides,
    allTemplates,
    ruleFilteredSlideIds,
    ruleContextMeta,
    getTemplateForSlide,
  } = useAppStore();

  const {
    selectedSlideId,
    selectSlide,
    moveSlide,
    toggleDisabled,
    deleteSlide,
    createSlide,
    setTemplateOverride,
  } = useSlides();

  const { evaluateRules } = useRules();

  // Evaluate rules whenever deps change
  useEffect(() => {
    if (currentPresentation) {
      evaluateRules();
    }
  }, [evaluateRules, currentPresentation]);

  // Compute set of rule-hidden slide IDs for quick lookup
  const ruleHiddenIds = useMemo(() => {
    if (ruleFilteredSlideIds === null) return new Set<string>();
    const visibleSet = new Set(ruleFilteredSlideIds);
    return new Set(currentSlides.filter(s => !visibleSet.has(s.id)).map(s => s.id));
  }, [ruleFilteredSlideIds, currentSlides]);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [listWidth, setListWidth] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

  // Select first slide if none selected
  useEffect(() => {
    if (currentSlides.length > 0 && !selectedSlideId) {
      selectSlide(currentSlides[0].id);
    }
  }, [currentSlides, selectedSlideId, selectSlide]);

  // Find the selected slide from raw currentSlides (not expanded)
  const currentSelectedSlide = useMemo(() => {
    if (!selectedSlideId) return null;
    return currentSlides.find(s => s.id === selectedSlideId) || null;
  }, [selectedSlideId, currentSlides]);

  // Resolve template for the selected slide
  const resolvedTemplate = useMemo(() => {
    if (!currentSelectedSlide) return currentTemplate;
    return getTemplateForSlide(currentSelectedSlide) || currentTemplate;
  }, [currentSelectedSlide, currentTemplate, getTemplateForSlide]);

  const disabledCount = currentSlides.filter(s => s.isDisabled).length;

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

  const handleAddSlide = useCallback(async () => {
    await createSlide({
      blocksJson: [{ Lang1: '', Lang2: '', Lang3: '', Lang4: '' }],
    });
  }, [createSlide]);

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
            onClick={handleAddSlide}
            className="editor-toolbar-btn editor-toolbar-btn-add"
          >
            + Add Slide
          </button>
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
                {currentSlides.map((slide, index) => {
                  const isRuleHidden = ruleHiddenIds.has(slide.id);
                  return (
                    <SlideRow
                      key={slide.id}
                      slide={slide}
                      index={index}
                      isSelected={slide.id === selectedSlideId}
                      isRuleHidden={isRuleHidden}
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
                  );
                })}
              </tbody>
            </table>

            {currentSlides.length === 0 && (
              <div className="editor-no-slides">
                <p>No slides yet. Click "+ Add Slide" to create one.</p>
              </div>
            )}
          </div>
        </div>

        {/* Resize handle */}
        <div
          className="editor-resize-handle"
          onMouseDown={handleResizeStart}
        />

        {/* Preview panel */}
        <div className="editor-preview-panel">
          {currentSelectedSlide && resolvedTemplate ? (
            <>
              <SlidePreview
                slide={currentSelectedSlide}
                template={resolvedTemplate}
                variables={currentVariables}
                languageMap={currentPresentation.languageMap}
                languageSettings={currentPresentation.languageSettings}
                isRuleHidden={ruleHiddenIds.has(currentSelectedSlide.id)}
                meta={ruleContextMeta}
              />

              {/* Slide details */}
              <div className="editor-slide-details">
                <div className="editor-detail-row">
                  <span className="editor-detail-label">Order:</span>
                  <span>{currentSelectedSlide.slideOrder}</span>
                </div>
                {currentSelectedSlide.lineId && (
                  <div className="editor-detail-row">
                    <span className="editor-detail-label">Line ID:</span>
                    <span>{currentSelectedSlide.lineId}</span>
                  </div>
                )}
                {currentSelectedSlide.isDynamic && (
                  <div className="editor-detail-row">
                    <span className="editor-detail-label">Type:</span>
                    <span>Dynamic (verse-expanded)</span>
                  </div>
                )}
                {currentSelectedSlide.notes && (
                  <div className="editor-detail-row">
                    <span className="editor-detail-label">Notes:</span>
                    <span className="editor-detail-notes">{currentSelectedSlide.notes}</span>
                  </div>
                )}
              </div>

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
              <p>Select a slide to preview</p>
            </div>
          )}

          {ruleContextMeta?.gitsawe != null && (
            <GitsaweContext gitsawe={ruleContextMeta.gitsawe as Record<string, unknown>} />
          )}
        </div>
      </div>
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
    <div className="editor-slide-details editor-context-section">
      <div className="editor-context-header">Current Gitsawe</div>
      <div className="editor-context-grid">
        {entries.map(({ label, value }) => (
          <div className="editor-detail-row" key={label}>
            <span className="editor-detail-label">{label}:</span>
            <span>{String(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
