import { create } from 'zustand';

export type AppView = 'presentation' | 'editor' | 'kidases' | 'gitsawe' | 'verses' | 'templates' | 'settings';

interface NavigationState {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
}

export const useNavigationStore = create<NavigationState>()((set) => ({
  currentView: 'presentation',
  setCurrentView: (view) => set({ currentView: view }),
}));
