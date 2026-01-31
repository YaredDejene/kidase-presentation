import React from 'react';
import { Slide } from '../../domain/entities/Slide';
import { LanguageMap } from '../../domain/entities/Presentation';

interface SlideRowProps {
  slide: Slide;
  index: number;
  isSelected: boolean;
  languageMap: LanguageMap;
  onSelect: () => void;
  onToggleDisable: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

export const SlideRow: React.FC<SlideRowProps> = ({
  slide,
  index,
  isSelected,
  languageMap,
  onSelect,
  onToggleDisable,
  onDelete,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
}) => {
  const block = slide.blocksJson[0] || {};

  // Get preview text from first available language
  const previewText = block.Lang1 || block.Lang2 || block.Lang3 || block.Lang4 || '';
  const truncatedText = previewText.length > 80
    ? previewText.substring(0, 80) + '...'
    : previewText;

  // Get title text
  const titleText = slide.titleJson?.Lang1 || slide.titleJson?.Lang2 ||
                   slide.titleJson?.Lang3 || slide.titleJson?.Lang4;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this slide?')) {
      onDelete();
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleDisable();
  };

  return (
    <tr
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      className={`
        slide-row
        ${isSelected ? 'slide-row-selected' : ''}
        ${slide.isDisabled ? 'slide-row-disabled' : ''}
        ${isDragging ? 'slide-row-dragging' : ''}
      `}
    >
      <td className="col-order">
        <span className="slide-order-badge">{index + 1}</span>
      </td>

      <td className="col-content">
        {titleText && (
          <div className="slide-title-preview">
            {titleText}
          </div>
        )}
        <div className="slide-content-preview">
          {truncatedText || <em className="slide-empty-text">Empty slide</em>}
        </div>
        {slide.notes && (
          <div className="slide-notes-preview">
            📝 {slide.notes}
          </div>
        )}
      </td>

      <td className="col-status">
        <span className={`slide-status-badge ${slide.isDisabled ? 'status-disabled' : 'status-active'}`}>
          {slide.isDisabled ? 'Disabled' : 'Active'}
        </span>
      </td>

      <td className="col-actions">
        <div className="slide-actions">
          <button
            onClick={handleToggle}
            className="slide-action-btn"
            title={slide.isDisabled ? 'Enable slide' : 'Disable slide'}
          >
            {slide.isDisabled ? '👁️' : '🚫'}
          </button>
          <button
            onClick={handleDelete}
            className="slide-action-btn slide-action-btn-danger"
            title="Delete slide"
          >
            🗑️
          </button>
        </div>
      </td>
    </tr>
  );
};

export default SlideRow;
