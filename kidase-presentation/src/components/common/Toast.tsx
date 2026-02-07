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
          <span className="toast-message">{t.message}</span>
          <button className="toast-close" onClick={() => removeToast(t.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
};
