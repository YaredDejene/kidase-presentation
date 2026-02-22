import React, { useEffect, useState } from 'react';
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
import { UpdateBanner } from './components/common/UpdateBanner';
import { useUpdater } from './hooks/useUpdater';
import './styles/global.css';
import './styles/app.css';

// Error Boundary
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Application error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh', color: '#ccc',
          backgroundColor: '#0a0a0a', gap: '16px', padding: '40px',
          textAlign: 'center',
        }}>
          <h1 style={{ color: '#ef4444', fontSize: '24px' }}>Something went wrong</h1>
          <p style={{ maxWidth: '500px', color: '#888' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px', backgroundColor: '#4a4a8a', border: 'none',
              borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '14px',
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const { t } = useTranslation();
  const { currentView, setCurrentView } = useNavigationStore();
  const isPresenting = usePresentationModeStore(s => s.isPresenting);
  const { setAppSettings, setAllTemplates, setVerses, loadPresentationData } = usePresentationDataStore();
  const [isLoading, setIsLoading] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const { updateAvailable, updateVersion, installing, installUpdate, dismissUpdate } = useUpdater();

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
        setBootstrapError(error instanceof Error ? error.message : String(error));
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

  if (bootstrapError) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100vh', color: '#ccc',
        backgroundColor: '#0a0a0a', gap: '16px', padding: '40px',
        textAlign: 'center',
      }}>
        <h1 style={{ color: '#ef4444', fontSize: '24px' }}>Failed to start</h1>
        <p style={{ maxWidth: '500px', color: '#888' }}>{bootstrapError}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 24px', backgroundColor: '#4a4a8a', border: 'none',
            borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '14px',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {updateAvailable && (
        <UpdateBanner
          version={updateVersion}
          installing={installing}
          onInstall={installUpdate}
          onDismiss={dismissUpdate}
        />
      )}

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

function AppWithBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

export default AppWithBoundary;
