import React, { useRef, useState, useEffect } from 'react';
import { Slide } from '../../domain/entities/Slide';
import { Template } from '../../domain/entities/Template';
import { Variable } from '../../domain/entities/Variable';
import { LanguageMap, LanguageSettings } from '../../domain/entities/Presentation';
import { SlideRenderer } from '../presentation/SlideRenderer';

interface SlidePreviewProps {
  slide: Slide;
  template: Template;
  variables: Variable[];
  languageMap: LanguageMap;
  languageSettings?: LanguageSettings;
}

export const SlidePreview: React.FC<SlidePreviewProps> = ({
  slide,
  template,
  variables,
  languageMap,
  languageSettings,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);

  // Dynamically calculate scale based on container width
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        // Leave some padding (subtract 4 for border)
        const availableWidth = containerWidth - 4;
        const newScale = availableWidth / 1920;
        setScale(Math.min(newScale, 0.5)); // Cap at 0.5 max scale
      }
    };

    updateScale();

    // Use ResizeObserver for responsive updates
    const resizeObserver = new ResizeObserver(updateScale);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div className="slide-preview-container" ref={containerRef}>
      <div
        className="slide-preview-wrapper"
        style={{
          width: `${1920 * scale}px`,
          height: `${1080 * scale}px`,
        }}
      >
        <SlideRenderer
          slide={slide}
          template={template}
          variables={variables}
          languageMap={languageMap}
          languageSettings={languageSettings}
          scale={scale}
        />
      </div>

      {slide.isDisabled && (
        <div className="slide-preview-disabled-overlay">
          <span>DISABLED</span>
        </div>
      )}
    </div>
  );
};

export default SlidePreview;
