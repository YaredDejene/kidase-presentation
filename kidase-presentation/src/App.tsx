import { useEffect, useState } from 'react';
import { useAppStore } from './store/appStore';
import { Sidebar } from './components/layout/Sidebar';
import { PresentationPage } from './components/presentation/PresentationPage';
import { KidaseManager } from './components/manager/KidaseManager';
import { GitsaweManager } from './components/manager/GitsaweManager';
import { VersesManager } from './components/manager/VersesManager';
import { TemplatesManager } from './components/manager/TemplatesManager';
import { SettingsPage } from './components/settings/SettingsPage';
import { PresentationView } from './components/presentation/PresentationView';
import {
  templateRepository,
  appSettingsRepository,
  verseRepository,
  presentationRepository,
} from './repositories';
import { presentationService } from './services/PresentationService';
import { createDefaultTemplate } from './domain/entities/Template';
import { ToastContainer } from './components/common/Toast';
import './styles/global.css';
import './styles/app.css';

function App() {
  const {
    currentView,
    isPresenting,
    setCurrentView,
    setAppSettings,
    setVerses,
    loadPresentationData,
  } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data (settings, templates, verses, active presentation)
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load app settings
        const settings = await appSettingsRepository.get();
        setAppSettings(settings);

        // Ensure default template exists
        const loadedTemplates = await templateRepository.getAll();
        const defaultDef = createDefaultTemplate();
        const existingDefault = loadedTemplates.find(t => t.name === 'Default Template');

        if (existingDefault) {
          await templateRepository.update(existingDefault.id, {
            definitionJson: defaultDef,
          });
        } else {
          await templateRepository.create({
            name: 'Default Template',
            maxLangCount: 4,
            definitionJson: defaultDef,
          });
        }

        // Load reference data (verses)
        const loadedVerses = await verseRepository.getAll();
        setVerses(loadedVerses);

        // Auto-load active presentation
        const active = await presentationRepository.getActive();
        if (active) {
          try {
            const loaded = await presentationService.loadPresentation(active.id);
            if (loaded) loadPresentationData(loaded);
          } catch (error) {
            console.error('Failed to load active presentation:', error);
          }
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      }
      setIsLoading(false);
    };

    loadData();
  }, []);


  if (isLoading) {
    return (
      <div className="app-loading">
        Loading...
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
