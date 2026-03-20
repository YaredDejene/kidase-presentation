import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Verse } from '../domain/entities/Verse';
import { verseRepository } from '../repositories';
import { excelImportService } from '../services/ExcelImportService';
import { useAppStore } from '../store/appStore';
import { toast } from '../store/toastStore';

export function useVerses() {
  const { t } = useTranslation('manager');
  const [verses, setLocalVerses] = useState<Verse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { setVerses: setStoreVerses } = useAppStore();

  const loadVerses = useCallback(async () => {
    try {
      const all = await verseRepository.getAll();
      setLocalVerses(all);
      return all;
    } catch (error) {
      console.error('Failed to load Verse records:', error);
      toast.error(t('failedToLoadKidases'));
      return [];
    }
  }, [t]);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadVerses();
      setIsLoading(false);
    };
    init();
  }, [loadVerses]);

  const importFromExcel = useCallback(async (filePath: string): Promise<boolean> => {
    const progress = toast.progress(t('importingVerses'));
    try {
      const result = await excelImportService.importVersesFromPath(filePath, (current, total) => {
        const pct = Math.round((current / total) * 100);
        progress.update(pct, t('importingData', { current, total }));
      });

      if (result.verses.length === 0) {
        progress.fail(t('noVerseRecords'));
        return false;
      }

      progress.update(60, t('savingRecords'));

      // Clear existing verses
      const existing = await verseRepository.getAll();
      for (const v of existing) {
        await verseRepository.delete(v.id);
      }

      progress.update(80, t('savingRecords'));

      // Create new records
      await verseRepository.createMany(result.verses);

      const loaded = await loadVerses();
      setStoreVerses(loaded);
      progress.done(t('importSuccess', { count: result.verses.length }));
      return true;
    } catch (error) {
      console.error('Import failed:', error);
      progress.fail(t('failedToImport', { message: error instanceof Error ? error.message : String(error) }));
      return false;
    }
  }, [loadVerses, setStoreVerses, t]);

  const deleteAll = useCallback(async (): Promise<boolean> => {
    try {
      for (const v of verses) {
        await verseRepository.delete(v.id);
      }
      await loadVerses();
      setStoreVerses([]);
      toast.success(t('deleteAllSuccess'));
      return true;
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error(t('deleteAllFailed'));
      return false;
    }
  }, [verses, loadVerses, setStoreVerses, t]);

  return {
    verses,
    isLoading,
    loadVerses,
    importFromExcel,
    deleteAll,
  };
}
