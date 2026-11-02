import React, { useMemo } from 'react';
import {
  Slide,
  Template,
  Variable,
  LanguageMap,
  LanguageSettings,
  getOrderedLanguages,
  templateLanguages,
  placeholderService,
  TITLE_SLIDE_ID,
  buildTitleSlideInfo,
} from '@kidase/shared';
import { SlideView } from '@kidase/shared/render/SlideView';
import { TitleSlideView } from '@kidase/shared/render/TitleSlideView';

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

  const enabledLanguages = useMemo(
    () => templateLanguages(def, getOrderedLanguages(languageSettings, languageMap)),
    [def, languageMap, languageSettings],
  );

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

  const titleInfo = useMemo(
    () => slide.id === TITLE_SLIDE_ID ? buildTitleSlideInfo(metaContext, slide.titleJson?.Lang1 ?? '') : null,
    [slide.id, slide.titleJson, metaContext],
  );
  if (titleInfo) return <TitleSlideView definition={def} info={titleInfo} scale={scale} />;

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
