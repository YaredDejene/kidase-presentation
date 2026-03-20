import { useState, useEffect, useCallback } from 'react';
import { usePresentationModeStore } from '../../store/presentationModeStore';
import { usePresentationDataStore } from '../../store/presentationDataStore';
import { useRuleStore } from '../../store/ruleStore';
import { SlideRenderer } from './SlideRenderer';
import '../../styles/presentation.css';

export const PresentationView: React.FC = () => {
  const {
    currentSlideIndex,
    isPresenting,
    nextSlide,
    previousSlide,
    stopPresentation,
    goToSlide,
    getMergedEnabledSlides,
  } = usePresentationModeStore();

  const {
    currentTemplate,
    currentPresentation,
    appSettings,
    getTemplateForSlide,
    getVariablesForSlide,
    getLanguageMapForSlide,
    getLanguageSettingsForSlide,
  } = usePresentationDataStore();

  const ruleContextMeta = useRuleStore(s => s.ruleContextMeta);

  // Scale fonts/margins proportionally to viewport vs 1920×1080 design size
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

  const enabledSlides = getMergedEnabledSlides();
  const currentSlide = enabledSlides[currentSlideIndex];

  // Resolve per-slide properties
  const resolvedTemplate = currentSlide
    ? (getTemplateForSlide(currentSlide) || currentTemplate)
    : currentTemplate;
  const resolvedVariables = currentSlide ? getVariablesForSlide(currentSlide) : [];
  const resolvedLanguageMap = currentSlide ? getLanguageMapForSlide(currentSlide) : {};
  const resolvedLanguageSettings = currentSlide ? getLanguageSettingsForSlide(currentSlide) : undefined;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case ' ':
      case 'PageDown':
      case 'Enter':
        event.preventDefault();
        nextSlide();
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
      case 'Backspace':
        event.preventDefault();
        previousSlide();
        break;
      case 'Escape':
        event.preventDefault();
        stopPresentation();
        break;
      case 'Home':
        event.preventDefault();
        goToSlide(0);
        break;
      case 'End':
        event.preventDefault();
        goToSlide(enabledSlides.length - 1);
        break;
    }

    // Number keys for quick navigation (1-9)
    if (event.key >= '1' && event.key <= '9') {
      const slideIndex = parseInt(event.key) - 1;
      if (slideIndex < enabledSlides.length) {
        goToSlide(slideIndex);
      }
    }
  }, [nextSlide, previousSlide, stopPresentation, goToSlide, enabledSlides.length]);

  const handleClick = useCallback((event: React.MouseEvent) => {
    // Left click = next, Right area or shift+click = previous
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const isLeftThird = clickX < rect.width / 3;

    if (isLeftThird || event.shiftKey) {
      previousSlide();
    } else {
      nextSlide();
    }
  }, [nextSlide, previousSlide]);

  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    previousSlide();
  }, [previousSlide]);

  useEffect(() => {
    if (isPresenting) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isPresenting, handleKeyDown]);

  // Handle fullscreen changes via Tauri window events
  useEffect(() => {
    if (!isPresenting) return;

    let cancelled = false;
    const checkFullscreen = async () => {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const unlisten = await getCurrentWindow().onResized(async () => {
        const isFs = await getCurrentWindow().isFullscreen();
        if (!isFs && !cancelled) {
          stopPresentation();
        }
      });
      if (cancelled) {
        unlisten();
      } else {
        return unlisten;
      }
    };

    let unlistenFn: (() => void) | undefined;
    checkFullscreen().then((fn) => { unlistenFn = fn; });

    return () => {
      cancelled = true;
      unlistenFn?.();
    };
  }, [isPresenting, stopPresentation]);

  if (!isPresenting || !currentSlide || !currentTemplate || !currentPresentation) {
    return null;
  }

  return (
    <div
      className="presentation-view"
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      <SlideRenderer
        slide={currentSlide}
        template={resolvedTemplate!}
        variables={resolvedVariables}
        languageMap={resolvedLanguageMap}
        languageSettings={resolvedLanguageSettings}
        scale={scale}
        meta={ruleContextMeta}
      />

      {/* Slide counter */}
      {appSettings.showSlideNumbers && (
        <div className="presentation-counter">
          {currentSlideIndex + 1} / {enabledSlides.length}
        </div>
      )}

      {/* Navigation hover zones */}
      <div className="presentation-nav-zone presentation-nav-zone-left">
        <div className="presentation-nav-hint">&#9664;</div>
      </div>
      <div className="presentation-nav-zone presentation-nav-zone-right">
        <div className="presentation-nav-hint">&#9654;</div>
      </div>
    </div>
  );
};
