export interface AppSettings {
  theme: 'dark' | 'light';
  showSlideNumbers: boolean;
  presentationDisplay: 'primary' | 'secondary' | 'auto';
  locale: 'en' | 'am';
}

export const defaultAppSettings: AppSettings = {
  theme: 'dark',
  showSlideNumbers: true,
  presentationDisplay: 'auto',
  locale: 'en',
};
