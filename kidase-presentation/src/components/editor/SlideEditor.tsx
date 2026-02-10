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
    ruleFilteredSlideIds,
    ruleContextMeta,
  } = useAppStore();

  const {
    slides,
    selectedSlide,
    selectedSlideId,
    selectSlide,
    moveSlide,
    toggleDisabled,
    deleteSlide,
    createSlide,
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
    return new Set(slides.filter(s => {
      // For expanded verse slides (id contains __verse_), check the parent slide ID
      const originalId = s.id.includes('__verse_') ? s.id.split('__verse_')[0] : s.id;
      return !visibleSet.has(originalId);
    }).map(s => s.id));
  }, [ruleFilteredSlideIds, slides]);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [listWidth, setListWidth] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

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
      // Constrain between 300px and container width - 350px (for preview)
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
        <div className="editor-empty-icon">📑</div>
        <h2>No Presentation Loaded</h2>
        <p>Open or create a presentation to start editing.</p>
      </div>
    );
  }

  return (
    <div className="editor-container" ref={containerRef}>
      {/* Slide list */}
      <div
        className="editor-slide-list"
        style={listWidth ? { width: `${listWidth}px`, flex: 'none' } : undefined}
      >
        <div className="editor-slide-list-header">
          <h3>Slides ({slides.length})</h3>
          <button
            onClick={handleAddSlide}
            className="editor-btn editor-btn-add"
            title="Add new slide"
          >
            + Add Slide
          </button>
        </div>

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
              {slides.map((slide, index) => {
                const isRuleHidden = ruleHiddenIds.has(slide.id);
                const isVerse = slide.id.includes('__verse_');
                return (
                  <SlideRow
                    key={slide.id}
                    slide={slide}
                    index={index}
                    isSelected={slide.id === selectedSlideId}
                    isRuleHidden={isRuleHidden}
                    isVerseSlide={isVerse}
                    languageMap={currentPresentation.languageMap}
                    onSelect={() => {
                      if (!isRuleHidden) selectSlide(slide.id);
                    }}
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

          {slides.length === 0 && (
            <div className="editor-no-slides">
              <p>No slides yet. Click "Add Slide" to create one.</p>
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
        <h3>Preview</h3>
        {selectedSlide ? (
          <SlidePreview
            slide={selectedSlide}
            template={currentTemplate}
            variables={currentVariables}
            languageMap={currentPresentation.languageMap}
            languageSettings={currentPresentation.languageSettings}
            isRuleHidden={ruleHiddenIds.has(selectedSlide.id)}
            meta={ruleContextMeta}
          />
        ) : (
          <div className="editor-preview-empty">
            <p>Select a slide to preview</p>
          </div>
        )}

        {selectedSlide && (
          <div className="editor-slide-details">
            <div className="editor-detail-row">
              <span className="editor-detail-label">Order:</span>
              <span>{selectedSlide.slideOrder}</span>
            </div>
            {selectedSlide.lineId && (
              <div className="editor-detail-row">
                <span className="editor-detail-label">Line ID:</span>
                <span>{selectedSlide.lineId}</span>
              </div>
            )}
            {selectedSlide.notes && (
              <div className="editor-detail-row">
                <span className="editor-detail-label">Notes:</span>
                <span className="editor-detail-notes">{selectedSlide.notes}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
