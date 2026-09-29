import React, { useMemo } from 'react';
import type { TemplateDefinition, SlideBlock, SlideTitle, LangSlot, EnabledLanguage } from '@kidase/shared';
import { SlideView } from '@kidase/shared/render/SlideView';

export interface ResolvedFooter {
  title: SlideTitle | null;
  text: SlideBlock | null;
}

interface WebSlideRendererProps {
  definition: TemplateDefinition;
  /** Active language slots, in display order (from the render payload). */
  activeSlots: LangSlot[];
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
  activeSlots,
  block,
  title,
  footer,
}) => {
  const enabledLanguages = useMemo<EnabledLanguage[]>(() => {
    return activeSlots
      .map(slot => def.languages.find(l => l.slot === slot))
      .filter((l): l is EnabledLanguage => !!l);
  }, [def.languages, activeSlots]);

  return <SlideView definition={def} enabledLanguages={enabledLanguages} block={block} title={title} footer={footer} />;
});
