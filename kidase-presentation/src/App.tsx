import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from './i18n';
import { useNavigationStore } from './store/navigationStore';
import { usePresentationModeStore } from './store/presentationModeStore';
import { usePresentationDataStore } from './store/presentationDataStore';
import { Sidebar } from './components/layout/Sidebar';
import { PresentationPage } from './components/presentation/PresentationPage';
import { SlideEditor } from './components/editor/SlideEditor';
import { KidaseManager } from './components/manager/KidaseManager';
import { GitsaweManager } from './components/manager/GitsaweManager';
import { VersesManager } from './components/manager/VersesManager';
import { TemplatesManager } from './components/manager/TemplatesManager';
import { SettingsPage } from './components/settings/SettingsPage';
import { PresentationView } from './components/presentation/PresentationView';
import { appBootstrapService } from './services/AppBootstrapService';
import { ToastContainer } from './components/common/Toast';
import './styles/global.css';
import './styles/app.css';

function App() {
  const { t } = useTranslation();
  const { currentView, setCurrentView } = useNavigationStore();
  const isPresenting = usePresentationModeStore(s => s.isPresenting);
  const { setAppSettings, setAllTemplates, setVerses, loadPresentationData } = usePresentationDataStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const { settings, templates, verses, presentation } = await appBootstrapService.initialize();
        setAppSettings(settings);
        setAllTemplates(templates);
        setVerses(verses);
        if (presentation) loadPresentationData(presentation);
        if (settings.locale) await i18n.changeLanguage(settings.locale);
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
      setIsLoading(false);
    };

    loadData();
  }, []);


  if (isLoading) {
    return (
      <div className="app-loading">
        {t('loading')}
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Sidebar navigation */}
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
      />

      {/* Main content */}
      <main className="app-main">
        {currentView === 'presentation' && <PresentationPage />}
        {currentView === 'editor' && <SlideEditor />}
        {currentView === 'kidases' && <KidaseManager />}
        {currentView === 'gitsawe' && <GitsaweManager />}
        {currentView === 'verses' && <VersesManager />}
        {currentView === 'templates' && <TemplatesManager />}
        {currentView === 'settings' && <SettingsPage />}
      </main>

      {/* Presentation overlay */}
      {isPresenting && <PresentationView />}

      <ToastContainer />
    </div>
  );
}

export default App;
