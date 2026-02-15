import { Slide } from './entities/Slide';
import { Verse } from './entities/Verse';
import { placeholderService } from '../services/PlaceholderService';

/**
 * Expand dynamic slides by replacing them with matching verse entries.
 * Pure function — no store dependency.
 */
export function expandDynamicSlides(
  slides: Slide[],
  verses: Verse[],
  ruleContextMeta: Record<string, unknown> | null,
): Slide[] {
  if (verses.length === 0) return slides;

  const expanded: Slide[] = [];
  for (const slide of slides) {
    if (slide.isDynamic && slide.lineId) {
      // Resolve @meta.X.Y placeholder to get the actual segmentId
      let segmentId = slide.lineId;
      if (segmentId.startsWith('@meta.')) {
        if (!ruleContextMeta) {
          console.warn(`[Dynamic Slide] Cannot resolve "${segmentId}" — rule context meta not available yet`);
        } else {
          const resolved = placeholderService.resolveMetaPlaceholder(segmentId, ruleContextMeta);
          if (resolved === undefined) {
            console.warn(`[Dynamic Slide] Failed to resolve "${segmentId}" from meta context`);
          } else {
            segmentId = resolved;
          }
        }
      }

      const matchingVerses = verses
        .filter(v => v.segmentId === segmentId)
        .sort((a, b) => a.verseOrder - b.verseOrder);

      for (const verse of matchingVerses) {
        expanded.push({
          ...slide,
          id: `${slide.id}__verse_${verse.id}`,
          titleJson: (verse.titleLang1 || verse.titleLang2 || verse.titleLang3 || verse.titleLang4)
            ? {
                Lang1: verse.titleLang1,
                Lang2: verse.titleLang2,
                Lang3: verse.titleLang3,
                Lang4: verse.titleLang4,
              }
            : slide.titleJson,
          blocksJson: [{
            Lang1: verse.textLang1,
            Lang2: verse.textLang2,
            Lang3: verse.textLang3,
            Lang4: verse.textLang4,
          }],
        });
      }

      // If no verses matched, keep the original slide as fallback
      if (matchingVerses.length === 0) {
        console.warn(`[Dynamic Slide] No verses found for segmentId="${segmentId}" (lineId="${slide.lineId}")`);
        expanded.push(slide);
      }
    } else {
      expanded.push(slide);
    }
  }
  return expanded;
}

/**
 * Get enabled (non-disabled, not rule-filtered-out) slides from a single slide set,
 * with dynamic expansion applied.
 */
export function getEnabledSlides(
  slides: Slide[],
  ruleFilteredSlideIds: string[] | null,
  verses: Verse[],
  ruleContextMeta: Record<string, unknown> | null,
): Slide[] {
  let filtered = slides.filter(s => !s.isDisabled);
  if (ruleFilteredSlideIds !== null) {
    filtered = filtered.filter(s => ruleFilteredSlideIds.includes(s.id));
  }
  return expandDynamicSlides(filtered, verses, ruleContextMeta);
}

/**
 * Get merged enabled slides from primary + secondary, with filtering and expansion.
 */
export function getMergedEnabledSlides(
  primarySlides: Slide[],
  secondarySlides: Slide[],
  ruleFilteredSlideIds: string[] | null,
  verses: Verse[],
  ruleContextMeta: Record<string, unknown> | null,
): Slide[] {
  const primaryEnabled = getEnabledSlides(primarySlides, ruleFilteredSlideIds, verses, ruleContextMeta);

  if (secondarySlides.length === 0) {
    return primaryEnabled;
  }

  const secondaryEnabled = getEnabledSlides(secondarySlides, ruleFilteredSlideIds, verses, ruleContextMeta);
  return [...primaryEnabled, ...secondaryEnabled];
}
