import React, { useState, useRef, useEffect } from 'react';
import { Slide } from '../../domain/entities/Slide';
import { LanguageMap } from '../../domain/entities/Presentation';

interface SlideRowProps {
  slide: Slide;
  index: number;
  isSelected: boolean;
  isDynamic?: boolean;
  hasTemplateOverride?: boolean;
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
  isDynamic,
  hasTemplateOverride,
  languageMap: _languageMap,
  onSelect,
  onToggleDisable,
  onDelete,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const block = slide.blocksJson[0] || {};

  // Get preview text from first available language
  const previewText = block.Lang1 || block.Lang2 || block.Lang3 || block.Lang4 || '';
  const truncatedText = previewText.length > 100
    ? previewText.substring(0, 100) + '...'
    : previewText;

  // Get title text
  const titleText = slide.titleJson?.Lang1 || slide.titleJson?.Lang2 ||
                   slide.titleJson?.Lang3 || slide.titleJson?.Lang4;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleDisable();
    setShowMenu(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
    setShowMenu(false);
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
        <span className="slide-order-badge">
          {index + 1}
        </span>
      </td>

      <td className="col-content">
        <div className="slide-badges">
          {isDynamic && <span className="slide-badge slide-badge-dynamic">Dynamic</span>}
          {hasTemplateOverride && <span className="slide-badge slide-badge-override">T</span>}
        </div>
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
            {slide.notes}
          </div>
        )}
      </td>

      <td className="col-actions">
        <div className="slide-actions-menu" ref={menuRef}>
          <button
            onClick={handleMenuClick}
            className="slide-menu-btn"
            title="Actions"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="3" r="1.5" />
              <circle cx="8" cy="8" r="1.5" />
              <circle cx="8" cy="13" r="1.5" />
            </svg>
          </button>

          {showMenu && (
            <div className="slide-dropdown-menu">
              <button onClick={handleToggle} className="slide-dropdown-item">
                {slide.isDisabled ? 'Enable Slide' : 'Disable Slide'}
              </button>
              <button onClick={handleDelete} className="slide-dropdown-item slide-dropdown-item-danger">
                Delete Slide
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
};