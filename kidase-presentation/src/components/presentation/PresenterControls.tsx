import React from 'react';
import { useAppStore } from '../../store/appStore';

interface PresenterControlsProps {
  onStartPresentation?: () => void;
}

export const PresenterControls: React.FC<PresenterControlsProps> = ({
  onStartPresentation,
}) => {
  const {
    currentPresentation,
    currentSlideIndex,
    isPresenting,
    startPresentation,
    stopPresentation,
    nextSlide,
    previousSlide,
    getEnabledSlides,
  } = useAppStore();

  const enabledSlides = getEnabledSlides();
  const hasSlides = enabledSlides.length > 0;
  const canPresent = currentPresentation && hasSlides;

  const handleStart = () => {
    startPresentation();
    onStartPresentation?.();
  };

  if (isPresenting) {
    return (
      <div className="presenter-controls presenter-controls-presenting">
        <button
          onClick={previousSlide}
          disabled={currentSlideIndex === 0}
          className="presenter-btn"
          title="Previous slide (←)"
        >
          ◀ Prev
        </button>

        <span className="presenter-slide-info">
          {currentSlideIndex + 1} / {enabledSlides.length}
        </span>

        <button
          onClick={nextSlide}
          disabled={currentSlideIndex >= enabledSlides.length - 1}
          className="presenter-btn"
          title="Next slide (→)"
        >
          Next ▶
        </button>

        <button
          onClick={stopPresentation}
          className="presenter-btn presenter-btn-stop"
          title="Exit presentation (Esc)"
        >
          Exit
        </button>
      </div>
    );
  }

  return (
    <div className="presenter-controls">
      <button
        onClick={handleStart}
        disabled={!canPresent}
        className="presenter-btn presenter-btn-start"
        title={canPresent ? 'Start presentation (F5)' : 'No slides to present'}
      >
        ▶ Present
      </button>

      {hasSlides && (
        <span className="presenter-slide-count">
          {enabledSlides.length} slide{enabledSlides.length !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
};
