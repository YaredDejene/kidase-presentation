import React, { useMemo } from 'react';
import {
  Slide,
  Template,
  Variable,
  LanguageMap,
  LanguageSettings,
  LANG_SLOTS,
  placeholderService,
} from '@kidase/shared';
import { SlideView } from '@kidase/shared/render/SlideView';

interface SlideRendererProps {
  slide: Slide;
  template: Template;
  variables: Variable[];
  languageMap: LanguageMap;
  languageSettings?: LanguageSettings;
  scale?: number;
  meta?: Record<string, unknown> | null;
}

/**
 * Desktop adapter: picks the enabled languages and resolves placeholders,
 * then hands the result to the shared SlideView for layout.
 */
export const SlideRenderer: React.FC<SlideRendererProps> = React.memo(({
  slide,
  template,
  variables,
  languageMap,
  languageSettings,
  scale = 1,
  meta,
}) => {
  const def = template.definitionJson;
  const metaContext = meta ?? undefined;

  const enabledLanguages = useMemo(() => {
    if (languageSettings) {
      return LANG_SLOTS
        .filter(slot => languageSettings[slot]?.enabled && def.languages.some(l => l.slot === slot))
        .map(slot => ({
          ...def.languages.find(l => l.slot === slot)!,
          order: languageSettings[slot]?.order ?? 0,
        }))
        .sort((a, b) => a.order - b.order);
    }
    return def.languages.filter(lang => languageMap[lang.slot] !== undefined);
  }, [def.languages, languageMap, languageSettings]);

  const block = useMemo(
    () => placeholderService.replaceInBlock(slide.blocksJson[0] || {}, variables, metaContext),
    [slide.blocksJson, variables, metaContext],
  );

  const title = useMemo(
    () => slide.titleJson ? placeholderService.replaceInTitle(slide.titleJson, variables, metaContext) : null,
    [slide.titleJson, variables, metaContext],
  );

  const footer = useMemo(() => {
    if (!slide.footerJson) return null;
    const { title: footerTitle, text: footerText } = slide.footerJson;
    return {
      title: footerTitle ? placeholderService.replaceInTitle(footerTitle, variables, metaContext) : null,
      text: footerText ? placeholderService.replaceInBlock(footerText, variables, metaContext) : null,
    };
  }, [slide.footerJson, variables, metaContext]);

  return (
    <SlideView
      definition={def}
      enabledLanguages={enabledLanguages}
      block={block}
      title={title}
      footer={footer}
      scale={scale}
    />
  );
});
