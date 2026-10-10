import { Slide } from './entities/Slide';
import { Verse } from './entities/Verse';
import { firstText, langFieldsToText } from './entities/Presentation';
import { placeholderService } from '../services/PlaceholderService';

/**
 * Expand dynamic slides by replacing them with matching verse entries.
 * Pure function — no store dependency.
 */
/** The verse segment a dynamic slide shows: its lineId, or the @meta.X.Y placeholder resolved against the context. */
export function dynamicSegmentId(slide: Slide, ruleContextMeta: Record<string, unknown> | null): string | null {
  if (!slide.isDynamic || !slide.lineId) return null;
  const segmentId = slide.lineId;
  if (!segmentId.startsWith('@meta.')) return segmentId;
  if (!ruleContextMeta) {
    console.warn(`[Dynamic Slide] Cannot resolve "${segmentId}" — rule context meta not available yet`);
    return segmentId;
  }
  const resolved = placeholderService.resolveMetaPlaceholder(segmentId, ruleContextMeta);
  if (resolved === undefined) {
    console.warn(`[Dynamic Slide] Failed to resolve "${segmentId}" from meta context`);
    return segmentId;
  }
  return resolved;
}

export function expandDynamicSlides(
  slides: Slide[],
  verses: Verse[],
  ruleContextMeta: Record<string, unknown> | null,
): Slide[] {
  if (verses.length === 0) return slides;

  const expanded: Slide[] = [];
  for (const slide of slides) {
    const segmentId = dynamicSegmentId(slide, ruleContextMeta);
    if (segmentId) {

      // The verse sheet repeats a psalm once per date it is read, so the same
      // text often appears many times under one segment; show each text once.
      const seen = new Set<string>();
      const matchingVerses = verses
        .filter(v => v.segmentId === segmentId)
        .sort((a, b) => a.verseOrder - b.verseOrder)
        .filter(v => {
          const key = [...Object.values(langFieldsToText('title', v)), ...Object.values(langFieldsToText('text', v))]
            .map(t => (t ?? '').replace(/\s+/g, ' ').trim()).join('\u0000');
          return !seen.has(key) && !!seen.add(key);
        });

      for (const verse of matchingVerses) {
        const verseTitle = langFieldsToText('title', verse);
        expanded.push({
          ...slide,
          id: `${slide.id}__verse_${verse.id}`,
          titleJson: firstText(verseTitle) ? verseTitle : slide.titleJson,
          blocksJson: [langFieldsToText('text', verse)],
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
