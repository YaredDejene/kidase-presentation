import { useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { presentationService, LoadedPresentation } from '../services/PresentationService';
import { presentationRepository } from '../repositories';
import { Presentation } from '../domain/entities/Presentation';

export function usePresentation() {
  const {
    currentPresentation,
    currentSlides,
    currentTemplate,
    currentVariables,
    isLoading,
    error,
    loadPresentationData,
    clearPresentationData,
    setLoading,
    setError,
  } = useAppStore();

  const loadPresentation = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await presentationService.loadPresentation(id);
      if (data) {
        loadPresentationData(data);
        await presentationService.setActivePresentation(id);
      } else {
        setError('Presentation not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load presentation');
    } finally {
      setLoading(false);
    }
  }, [loadPresentationData, setLoading, setError]);

  const createPresentation = useCallback(async (
    name: string,
    type: string,
    templateId: string,
    languageMap: Presentation['languageMap']
  ): Promise<LoadedPresentation | null> => {
    setLoading(true);
    setError(null);

    try {
      const data = await presentationService.createPresentation(name, type, templateId, languageMap);
      loadPresentationData(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create presentation');
      return null;
    } finally {
      setLoading(false);
    }
  }, [loadPresentationData, setLoading, setError]);

  const importFromExcel = useCallback(async (file: File, templateId: string): Promise<LoadedPresentation | null> => {
    setLoading(true);
    setError(null);

    try {
      const data = await presentationService.importFromExcel(file, templateId);
      loadPresentationData(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import Excel file');
      return null;
    } finally {
      setLoading(false);
    }
  }, [loadPresentationData, setLoading, setError]);

  const deletePresentation = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      await presentationService.deletePresentation(id);
      if (currentPresentation?.id === id) {
        clearPresentationData();
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete presentation');
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentPresentation, clearPresentationData, setLoading, setError]);

  const duplicatePresentation = useCallback(async (id: string, newName: string): Promise<LoadedPresentation | null> => {
    setLoading(true);
    setError(null);

    try {
      const data = await presentationService.duplicatePresentation(id, newName);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate presentation');
      return null;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const loadActivePresentation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await presentationService.getActivePresentation();
      if (data) {
        loadPresentationData(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load active presentation');
    } finally {
      setLoading(false);
    }
  }, [loadPresentationData, setLoading, setError]);

  const listPresentations = useCallback(async (): Promise<Presentation[]> => {
    try {
      return await presentationRepository.getAll();
    } catch (err) {
      console.error('Failed to list presentations:', err);
      return [];
    }
  }, []);

  const updatePresentation = useCallback(async (
    id: string,
    updates: Partial<Pick<Presentation, 'isPrimary' | 'name' | 'type' | 'languageMap' | 'languageSettings' | 'templateId'>>
  ): Promise<Presentation | null> => {
    try {
      const updated = await presentationRepository.update(id, updates);
      return updated;
    } catch (err) {
      console.error('Failed to update presentation:', err);
      return null;
    }
  }, []);

  return {
    // State
    currentPresentation,
    currentSlides,
    currentTemplate,
    currentVariables,
    isLoading,
    error,

    // Actions
    loadPresentation,
    createPresentation,
    importFromExcel,
    deletePresentation,
    duplicatePresentation,
    loadActivePresentation,
    listPresentations,
    updatePresentation,
    clearPresentation: clearPresentationData,
  };
}
