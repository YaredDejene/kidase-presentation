import React, { useState, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import { useSlides } from '../../hooks/useSlides';
import { SlideRow } from './SlideRow';
import { SlidePreview } from './SlidePreview';
import '../../styles/editor.css';

export const SlideEditor: React.FC = () => {
  const {
    currentTemplate,
    currentPresentation,
    currentVariables,
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

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

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
    <div className="editor-container">
      {/* Slide list */}
      <div className="editor-slide-list">
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
                <th className="col-status">Status</th>
                <th className="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {slides.map((slide, index) => (
                <SlideRow
                  key={slide.id}
                  slide={slide}
                  index={index}
                  isSelected={slide.id === selectedSlideId}
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

          {slides.length === 0 && (
            <div className="editor-no-slides">
              <p>No slides yet. Click "Add Slide" to create one.</p>
            </div>
          )}
        </div>
      </div>

      {/* Preview panel */}
      <div className="editor-preview-panel">
        <h3>Preview</h3>
        {selectedSlide ? (
          <SlidePreview
            slide={selectedSlide}
            template={currentTemplate}
            variables={currentVariables}
            languageMap={currentPresentation.languageMap}
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
