import React, { useMemo } from 'react';
import { templateLanguages, type TemplateDefinition, type SlideBlock, type SlideTitle, type OrderedLanguage } from '@kidase/shared';
import { SlideView, SLIDE_FONT } from '@kidase/shared/render/SlideView';

export interface ResolvedFooter {
  title: SlideTitle | null;
  text: SlideBlock | null;
}

interface WebSlideRendererProps {
  definition: TemplateDefinition;
  /** Active languages, in display order (from the render payload). */
  languages: OrderedLanguage[];
  block: SlideBlock;
  title: SlideTitle | null;
  footer: ResolvedFooter | null;
  /** Slide counter drawn in the bottom-right corner (viewer, projection and exports; not thumbnails). */
  pageLabel?: string;
}

/**
 * Thin adapter for the public viewer: maps the already-resolved render payload
 * onto the shared SlideView. Renders at the fixed 1920x1080 design stage; the
 * parent scales it to fit.
 */
export const WebSlideRenderer: React.FC<WebSlideRendererProps> = React.memo(({
  definition: def,
  languages,
  block,
  title,
  footer,
  pageLabel,
}) => {
  const enabledLanguages = useMemo(() => templateLanguages(def, languages), [def, languages]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <SlideView definition={def} enabledLanguages={enabledLanguages} block={block} title={title} footer={footer} />
      {pageLabel && (
        <div style={{ position: 'absolute', bottom: 20, right: 40, fontSize: 28, lineHeight: 1, color: '#888888', fontFamily: `${SLIDE_FONT}, serif` }}>{pageLabel}</div>
      )}
    </div>
  );
});
