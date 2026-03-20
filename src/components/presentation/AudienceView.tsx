import { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { usePresentationDataStore } from '../../store/presentationDataStore';
import { usePresentationModeStore } from '../../store/presentationModeStore';
import { useRuleStore } from '../../store/ruleStore';
import { SlideRenderer } from './SlideRenderer';
import '../../styles/presentation.css';

export const AudienceView: React.FC = () => {
  const [slideIndex, setSlideIndex] = useState(0);

  const {
    currentTemplate,
    currentPresentation,
    getTemplateForSlide,
    getVariablesForSlide,
    getLanguageMapForSlide,
    getLanguageSettingsForSlide,
  } = usePresentationDataStore();

  const { getMergedEnabledSlides } = usePresentationModeStore();
  const ruleContextMeta = useRuleStore(s => s.ruleContextMeta);

  const [scale, setScale] = useState(() =>
    Math.min(window.innerWidth / 1920, window.innerHeight / 1080)
  );

  useEffect(() => {
    const updateScale = () => {
      setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    };
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // Listen for slide-change events from the presenter window
  useEffect(() => {
    const unlistenSlide = listen<{ index: number }>('slide-change', (event) => {
      setSlideIndex(event.payload.index);
    });

    const unlistenStop = listen('presentation-stop', () => {
      getCurrentWindow().close().catch(() => {});
    });

    return () => {
      unlistenSlide.then(fn => fn());
      unlistenStop.then(fn => fn());
    };
  }, []);

  const enabledSlides = getMergedEnabledSlides();
  const currentSlide = enabledSlides[slideIndex];

  if (!currentSlide || !currentTemplate || !currentPresentation) {
    return <div className="presentation-view" />;
  }

  const resolvedTemplate = getTemplateForSlide(currentSlide) || currentTemplate;
  const resolvedVariables = getVariablesForSlide(currentSlide);
  const resolvedLanguageMap = getLanguageMapForSlide(currentSlide);
  const resolvedLanguageSettings = getLanguageSettingsForSlide(currentSlide);

  return (
    <div className="presentation-view" style={{ cursor: 'none' }}>
      <SlideRenderer
        slide={currentSlide}
        template={resolvedTemplate}
        variables={resolvedVariables}
        languageMap={resolvedLanguageMap}
        languageSettings={resolvedLanguageSettings}
        scale={scale}
        meta={ruleContextMeta}
      />
    </div>
  );
};
