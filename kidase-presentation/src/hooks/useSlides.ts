import { useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { slideRepository } from '../repositories';
import { Slide, SlideBlock, SlideTitle } from '../domain/entities/Slide';

export function useSlides() {
  const {
    currentSlides,
    currentPresentation,
    selectedSlideId,
    updateSlide,
    addSlide,
    removeSlide,
    reorderSlides,
    toggleSlideDisabled,
    selectSlide,
    setCurrentSlides,
  } = useAppStore();

  const selectedSlide = currentSlides.find(s => s.id === selectedSlideId) || null;
  const enabledSlides = currentSlides.filter(s => !s.isDisabled);

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
    try {
      await slideRepository.delete(id);
      removeSlide(id);

      // Update order in database
      const remainingSlides = currentSlides
        .filter(s => s.id !== id)
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
  }, [reorderSlides]);

  const toggleDisabled = useCallback(async (id: string): Promise<boolean> => {
    try {
      await slideRepository.toggleDisabled(id);
      toggleSlideDisabled(id);
      return true;
    } catch (err) {
      console.error('Failed to toggle slide:', err);
      return false;
    }
  }, [toggleSlideDisabled]);

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
    slides: currentSlides,
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
    refreshSlides,
  };
}
