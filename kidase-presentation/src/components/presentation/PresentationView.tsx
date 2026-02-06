import { useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import { SlideRenderer } from './SlideRenderer';
import '../../styles/presentation.css';

export const PresentationView: React.FC = () => {
  const {
    currentTemplate,
    currentPresentation,
    currentVariables,
    currentSlideIndex,
    isPresenting,
    appSettings,
    nextSlide,
    previousSlide,
    stopPresentation,
    goToSlide,
    getEnabledSlides,
  } = useAppStore();

  const enabledSlides = getEnabledSlides();
  const currentSlide = enabledSlides[currentSlideIndex];

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

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isPresenting) {
        stopPresentation();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
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
        template={currentTemplate}
        variables={currentVariables}
        languageMap={currentPresentation.languageMap}
        languageSettings={currentPresentation.languageSettings}
      />

      {/* Slide counter */}
      {appSettings.showSlideNumbers && (
        <div className="presentation-counter">
          {currentSlideIndex + 1} / {enabledSlides.length}
        </div>
      )}

      {/* Navigation hints (visible on hover) */}
      <div className="presentation-nav-hint presentation-nav-hint-left">
        &#9664;
      </div>
      <div className="presentation-nav-hint presentation-nav-hint-right">
        &#9654;
      </div>
    </div>
  );
};
