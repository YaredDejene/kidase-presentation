import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// English namespaces
import enCommon from './locales/en/common.json';
import enSidebar from './locales/en/sidebar.json';
import enSettings from './locales/en/settings.json';
import enEditor from './locales/en/editor.json';
import enManager from './locales/en/manager.json';
import enDialogs from './locales/en/dialogs.json';
import enPresentation from './locales/en/presentation.json';

// Amharic namespaces
import amCommon from './locales/am/common.json';
import amSidebar from './locales/am/sidebar.json';
import amSettings from './locales/am/settings.json';
import amEditor from './locales/am/editor.json';
import amManager from './locales/am/manager.json';
import amDialogs from './locales/am/dialogs.json';
import amPresentation from './locales/am/presentation.json';

i18n.use(initReactI18next).init({
  resources: {
    en: {
      common: enCommon,
      sidebar: enSidebar,
      settings: enSettings,
      editor: enEditor,
      manager: enManager,
      dialogs: enDialogs,
      presentation: enPresentation,
    },
    am: {
      common: amCommon,
      sidebar: amSidebar,
      settings: amSettings,
      editor: amEditor,
      manager: amManager,
      dialogs: amDialogs,
      presentation: amPresentation,
    },
  },
  lng: 'en',
  fallbackLng: 'en',
  ns: ['common', 'sidebar', 'settings', 'editor', 'manager', 'dialogs', 'presentation'],
  defaultNS: 'common',
  interpolation: {
    escapeValue: false, // React already escapes
  },
});

export default i18n;
