import { useState, useEffect, useCallback, useRef } from 'react';
import { usePresentationModeStore } from '../../store/presentationModeStore';
import { usePresentationDataStore } from '../../store/presentationDataStore';
import { useRuleStore } from '../../store/ruleStore';
import { audienceWindowService } from '../../services/AudienceWindowService';
import { SlideRenderer } from './SlideRenderer';
import '../../styles/presenter.css';

export const PresenterView: React.FC = () => {
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
    getTemplateForSlide,
    getVariablesForSlide,
    getLanguageMapForSlide,
    getLanguageSettingsForSlide,
  } = usePresentationDataStore();

  const ruleContextMeta = useRuleStore(s => s.ruleContextMeta);

  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef(Date.now());

  // Timer
  useEffect(() => {
    if (!isPresenting) return;
    startTimeRef.current = Date.now();
    setElapsed(0);
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isPresenting]);

  // Sync slide changes to audience window
  useEffect(() => {
    if (isPresenting) {
      audienceWindowService.emitSlideChange(currentSlideIndex);
    }
  }, [currentSlideIndex, isPresenting]);

  const handleNext = useCallback(() => { nextSlide(); }, [nextSlide]);
  const handlePrev = useCallback(() => { previousSlide(); }, [previousSlide]);
  const handleStop = useCallback(() => { stopPresentation(); }, [stopPresentation]);

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
      case 'End': {
        event.preventDefault();
        const slides = getMergedEnabledSlides();
        goToSlide(slides.length - 1);
        break;
      }
    }

    if (event.key >= '1' && event.key <= '9') {
      const slideIdx = parseInt(event.key) - 1;
      const slides = getMergedEnabledSlides();
      if (slideIdx < slides.length) {
        goToSlide(slideIdx);
      }
    }
  }, [nextSlide, previousSlide, stopPresentation, goToSlide, getMergedEnabledSlides]);

  useEffect(() => {
    if (isPresenting) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isPresenting, handleKeyDown]);

  // Stop presentation if user manually exits fullscreen
  useEffect(() => {
    if (!isPresenting) return;

    let cancelled = false;
    const setup = async () => {
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
    setup().then((fn) => { unlistenFn = fn; });

    return () => {
      cancelled = true;
      unlistenFn?.();
    };
  }, [isPresenting, stopPresentation]);

  const enabledSlides = getMergedEnabledSlides();
  const currentSlide = enabledSlides[currentSlideIndex];
  const nextSlideData = enabledSlides[currentSlideIndex + 1] ?? null;

  if (!isPresenting || !currentSlide || !currentTemplate || !currentPresentation) {
    return null;
  }

  const resolveSlideProps = (slide: typeof currentSlide) => ({
    template: getTemplateForSlide(slide) || currentTemplate!,
    variables: getVariablesForSlide(slide),
    languageMap: getLanguageMapForSlide(slide),
    languageSettings: getLanguageSettingsForSlide(slide),
  });

  const currentProps = resolveSlideProps(currentSlide);
  const nextProps = nextSlideData ? resolveSlideProps(nextSlideData) : null;

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="presenter-view">
      {/* Top row: current slide + right panel */}
      <div className="presenter-top">
        {/* Current slide preview */}
        <div className="presenter-current-slide">
          <div className="presenter-slide-container">
            <SlideRenderer
              slide={currentSlide}
              template={currentProps.template}
              variables={currentProps.variables}
              languageMap={currentProps.languageMap}
              languageSettings={currentProps.languageSettings}
              scale={0.5}
              meta={ruleContextMeta}
            />
          </div>
        </div>

        {/* Right panel: next slide + notes */}
        <div className="presenter-right-panel">
          {/* Next slide preview */}
          <div className="presenter-next-slide">
            <div className="presenter-section-label">Next</div>
            {nextSlideData && nextProps ? (
              <div className="presenter-slide-container presenter-slide-container-small">
                <SlideRenderer
                  slide={nextSlideData}
                  template={nextProps.template}
                  variables={nextProps.variables}
                  languageMap={nextProps.languageMap}
                  languageSettings={nextProps.languageSettings}
                  scale={0.3}
                  meta={ruleContextMeta}
                />
              </div>
            ) : (
              <div className="presenter-slide-container presenter-slide-container-small presenter-end-marker">
                End of Presentation
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="presenter-notes">
            <div className="presenter-section-label">Notes</div>
            <div className="presenter-notes-content">
              {currentSlide.notes || ''}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="presenter-bottom-bar">
        <div className="presenter-controls">
          <button className="presenter-btn" onClick={handlePrev} title="Previous">
            &#9664;
          </button>
          <button className="presenter-btn" onClick={handleNext} title="Next">
            &#9654;
          </button>
        </div>

        <div className="presenter-info">
          <span className="presenter-slide-counter">
            {currentSlideIndex + 1} / {enabledSlides.length}
          </span>
          <span className="presenter-timer">{timeStr}</span>
        </div>

        <button className="presenter-btn presenter-btn-stop" onClick={handleStop}>
          End (Esc)
        </button>
      </div>
    </div>
  );
};
