export interface AppSettings {
  theme: 'dark' | 'light';
  showSlideNumbers: boolean;
  showSidebarLabels: boolean;
  presentationDisplay: 'currentWindow' | 'presenterView';
  locale: 'en' | 'am';
}

export const defaultAppSettings: AppSettings = {
  theme: 'dark',
  showSlideNumbers: true,
  showSidebarLabels: true,
  presentationDisplay: 'currentWindow',
  locale: 'en',
};
