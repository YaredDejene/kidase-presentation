import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'progress';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  progress?: number; // 0-100
}

interface ToastStore {
  toasts: Toast[];
  addToast: (type: ToastType, message: string) => void;
  removeToast: (id: string) => void;
  updateToast: (id: string, updates: Partial<Pick<Toast, 'message' | 'type' | 'progress'>>) => void;
}

let nextId = 0;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (type, message) => {
    const id = String(++nextId);
    set((state) => ({
      toasts: [...state.toasts, { id, type, message }],
    }));
    // Auto-dismiss after 4 seconds (except progress toasts)
    if (type !== 'progress') {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, 4000);
    }
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
  updateToast: (id, updates) =>
    set((state) => ({
      toasts: state.toasts.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    })),
}));

// Convenience functions for use outside React components
export const toast = {
  success: (message: string) => useToastStore.getState().addToast('success', message),
  error: (message: string) => useToastStore.getState().addToast('error', message),
  info: (message: string) => useToastStore.getState().addToast('info', message),
  /** Show a progress toast. Returns controls to update/dismiss it. */
  progress: (message: string) => {
    const id = String(++nextId);
    useToastStore.setState((state) => ({
      toasts: [...state.toasts, { id, type: 'progress' as ToastType, message, progress: 0 }],
    }));
    return {
      update: (pct: number, msg?: string) => {
        useToastStore.getState().updateToast(id, {
          progress: Math.min(100, Math.max(0, pct)),
          ...(msg ? { message: msg } : {}),
        });
      },
      done: (msg?: string) => {
        // Switch to success and auto-dismiss
        useToastStore.getState().updateToast(id, {
          type: 'success',
          message: msg || message,
          progress: 100,
        });
        setTimeout(() => {
          useToastStore.getState().removeToast(id);
        }, 3000);
      },
      fail: (msg: string) => {
        useToastStore.getState().updateToast(id, {
          type: 'error',
          message: msg,
        });
        setTimeout(() => {
          useToastStore.getState().removeToast(id);
        }, 5000);
      },
    };
  },
};
