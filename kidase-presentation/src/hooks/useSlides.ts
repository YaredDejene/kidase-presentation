import { useState, useCallback, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { slideRepository } from '../repositories';
import { Slide, SlideBlock, SlideTitle } from '../domain/entities/Slide';

/** Check if a slide ID is a synthetic verse expansion */
function isVerseSlide(id: string): boolean {
  return id.includes('__verse_');
}

/** Extract the parent slide ID from a synthetic verse slide ID */
function getParentSlideId(id: string): string {
  return id.split('__verse_')[0];
}

export function useSlides() {
  const {
    currentSlides,
    currentPresentation,
    verses,
    ruleContextMeta,
    updateSlide,
    addSlide,
    removeSlide,
    reorderSlides,
    toggleSlideDisabled,
    setCurrentSlides,
    getExpandedSlides,
  } = useAppStore();

  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);
  const selectSlide = useCallback((id: string | null) => setSelectedSlideId(id), []);

  const expandedSlides = useMemo(
    () => getExpandedSlides(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentSlides, verses, ruleContextMeta]
  );
  const selectedSlide = expandedSlides.find(s => s.id === selectedSlideId) || null;
  const enabledSlides = expandedSlides.filter(s => !s.isDisabled);

  const createSlide = useCallback(async (
    data: Partial<Omit<Slide, 'id' | 'presentationId' | 'slideOrder'>>
  ): Promise<Slide | null> => {
    if (!currentPresentation) return null;

    try {
      const newSlide = await slideRepository.create({
        presentationId: currentPresentation.id,
        slideOrder: currentSlides.length + 1,
        blocksJson: data.blocksJson || [{}],
        titleJson: data.titleJson,
        lineId: data.lineId,
        notes: data.notes,
        isDisabled: data.isDisabled || false,
        isDynamic: data.isDynamic || false,
      });

      addSlide(newSlide);
      return newSlide;
    } catch (err) {
      console.error('Failed to create slide:', err);
      return null;
    }
  }, [currentPresentation, currentSlides.length, addSlide]);

  const updateSlideContent = useCallback(async (
    id: string,
    updates: {
      titleJson?: SlideTitle;
      blocksJson?: SlideBlock[];
      notes?: string;
    }
  ): Promise<boolean> => {
    try {
      await slideRepository.update(id, updates);
      updateSlide(id, updates);
      return true;
    } catch (err) {
      console.error('Failed to update slide:', err);
      return false;
    }
  }, [updateSlide]);

  const deleteSlide = useCallback(async (id: string): Promise<boolean> => {
    // Verse slides can't be deleted individually — delete the parent dynamic slide
    const baseId = isVerseSlide(id) ? getParentSlideId(id) : id;

    try {
      await slideRepository.delete(baseId);
      removeSlide(baseId);

      // Update order in database
      const remainingSlides = currentSlides
        .filter(s => s.id !== baseId)
        .map((s, i) => ({ id: s.id, slideOrder: i + 1 }));

      if (remainingSlides.length > 0) {
        await slideRepository.updateOrder(remainingSlides);
      }

      return true;
    } catch (err) {
      console.error('Failed to delete slide:', err);
      return false;
    }
  }, [currentSlides, removeSlide]);

  const moveSlide = useCallback(async (fromIndex: number, toIndex: number): Promise<boolean> => {
    // Indices refer to currentSlides (raw, unexpanded)
    const fromSlide = currentSlides[fromIndex];
    const toSlide = currentSlides[toIndex];
    if (!fromSlide || !toSlide) return false;

    try {
      reorderSlides(fromIndex, toIndex);

      // Get updated slides and persist order
      const updatedSlides = useAppStore.getState().currentSlides;
      const orderUpdates = updatedSlides.map(s => ({
        id: s.id,
        slideOrder: s.slideOrder,
      }));

      await slideRepository.updateOrder(orderUpdates);
      return true;
    } catch (err) {
      console.error('Failed to move slide:', err);
      return false;
    }
  }, [reorderSlides, currentSlides]);

  const toggleDisabled = useCallback(async (id: string): Promise<boolean> => {
    // Verse slides — toggle the parent dynamic slide
    const baseId = isVerseSlide(id) ? getParentSlideId(id) : id;

    try {
      await slideRepository.toggleDisabled(baseId);
      toggleSlideDisabled(baseId);
      return true;
    } catch (err) {
      console.error('Failed to toggle slide:', err);
      return false;
    }
  }, [toggleSlideDisabled]);

  const setTemplateOverride = useCallback(async (
    slideId: string,
    templateId: string | null
  ): Promise<boolean> => {
    const baseId = isVerseSlide(slideId) ? getParentSlideId(slideId) : slideId;
    try {
      await slideRepository.update(baseId, {
        templateOverrideId: templateId ?? undefined,
      });
      useAppStore.getState().setSlideTemplateOverride(baseId, templateId);
      return true;
    } catch (err) {
      console.error('Failed to set template override:', err);
      return false;
    }
  }, []);

  const refreshSlides = useCallback(async (): Promise<void> => {
    if (!currentPresentation) return;

    try {
      const slides = await slideRepository.getByPresentationId(currentPresentation.id);
      setCurrentSlides(slides);
    } catch (err) {
      console.error('Failed to refresh slides:', err);
    }
  }, [currentPresentation, setCurrentSlides]);

  return {
    // State
    slides: expandedSlides,
    enabledSlides,
    selectedSlide,
    selectedSlideId,
    slideCount: currentSlides.length,
    enabledSlideCount: enabledSlides.length,

    // Actions
    selectSlide,
    createSlide,
    updateSlideContent,
    deleteSlide,
    moveSlide,
    toggleDisabled,
    setTemplateOverride,
    refreshSlides,
  };
}
