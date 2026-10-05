import React, { useMemo } from 'react';
import { templateLanguages, type TemplateDefinition, type SlideBlock, type SlideTitle, type OrderedLanguage } from '@kidase/shared';
import { SlideView } from '@kidase/shared/render/SlideView';

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
}) => {
  const enabledLanguages = useMemo(() => templateLanguages(def, languages), [def, languages]);

  return <SlideView definition={def} enabledLanguages={enabledLanguages} block={block} title={title} footer={footer} />;
});
