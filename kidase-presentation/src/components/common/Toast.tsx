import React from 'react';
import { useToastStore } from '../../store/toastStore';
import '../../styles/toast.css';

export const ToastContainer: React.FC = () => {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <div className="toast-body">
            <span className="toast-message">{t.message}</span>
            {t.type === 'progress' && t.progress !== undefined && (
              <div className="toast-progress-track">
                <div
                  className="toast-progress-bar"
                  style={{ width: `${t.progress}%` }}
                />
              </div>
            )}
          </div>
          {t.type !== 'progress' && (
            <button className="toast-close" onClick={() => removeToast(t.id)}>
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
};
