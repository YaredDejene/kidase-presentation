import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

/**
 * Modal - Reusable modal dialog component
 * TODO: Implement accessible modal with overlay and focus management
 */
export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {title && <h2 className="modal-title">{title}</h2>}
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};