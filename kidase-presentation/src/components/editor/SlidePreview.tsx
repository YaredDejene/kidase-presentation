import React from 'react';
import { Slide } from '../../domain/entities/Slide';
import { Template } from '../../domain/entities/Template';
import { Variable } from '../../domain/entities/Variable';
import { LanguageMap } from '../../domain/entities/Presentation';
import { SlideRenderer } from '../presentation/SlideRenderer';

interface SlidePreviewProps {
  slide: Slide;
  template: Template;
  variables: Variable[];
  languageMap: LanguageMap;
}

export const SlidePreview: React.FC<SlidePreviewProps> = ({
  slide,
  template,
  variables,
  languageMap,
}) => {
  // Calculate scale based on preview container width
  // Preview container is typically around 350-400px
  // Full slide is 1920px, so scale is roughly 0.2
  const scale = 0.2;

  return (
    <div className="slide-preview-container">
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
