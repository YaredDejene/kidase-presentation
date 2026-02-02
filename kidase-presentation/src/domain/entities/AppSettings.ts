export interface AppSettings {
  theme: 'dark' | 'light';
  defaultExportFormat: 'pdf' | 'pptx';
  showSlideNumbers: boolean;
  presentationDisplay: 'primary' | 'secondary' | 'auto';
}

export const defaultAppSettings: AppSettings = {
  theme: 'dark',
  defaultExportFormat: 'pdf',
  showSlideNumbers: true,
  presentationDisplay: 'auto',
};
