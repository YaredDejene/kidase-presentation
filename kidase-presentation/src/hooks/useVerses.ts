import { useState, useCallback, useEffect } from 'react';
import { Verse } from '../domain/entities/Verse';
import { verseRepository, templateRepository } from '../repositories';
import { excelImportService } from '../services/ExcelImportService';
import { useAppStore } from '../store/appStore';
import { toast } from '../store/toastStore';

export function useVerses() {
  const [records, setRecords] = useState<Verse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { setVerses: setStoreVerses } = useAppStore();

  const loadRecords = useCallback(async () => {
    try {
      const all = await verseRepository.getAll();
      setRecords(all);
      return all;
    } catch (error) {
      console.error('Failed to load Verse records:', error);
      toast.error('Failed to load Verse records');
      return [];
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadRecords();
      setIsLoading(false);
    };
    init();
  }, [loadRecords]);

  const importFromExcel = useCallback(async (filePath: string): Promise<boolean> => {
    const templates = await templateRepository.getAll();
    const dummyTemplateId = templates[0]?.id;
    if (!dummyTemplateId) {
      toast.error('No template available. Please create a template first.');
      return false;
    }

    try {
      const result = await excelImportService.importFromPath(filePath, dummyTemplateId);

      if (result.verses.length === 0) {
        toast.error('No Verses data found in the Excel file. Make sure there is a "Verses" sheet.');
        return false;
      }

      // Clear existing verses
      const existing = await verseRepository.getAll();
      for (const v of existing) {
        await verseRepository.delete(v.id);
      }

      // Create new records
      await verseRepository.createMany(result.verses);

      const loaded = await loadRecords();
      setStoreVerses(loaded);
      toast.success(`Imported ${result.verses.length} Verse records`);
      return true;
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('Failed to import: ' + (error as Error).message);
      return false;
    }
  }, [loadRecords, setStoreVerses]);

  const deleteAll = useCallback(async (): Promise<boolean> => {
    try {
      for (const v of records) {
        await verseRepository.delete(v.id);
      }
      await loadRecords();
      setStoreVerses([]);
      toast.success('All Verse records deleted');
      return true;
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete Verse records');
      return false;
    }
  }, [records, loadRecords, setStoreVerses]);

  return {
    records,
    isLoading,
    loadRecords,
    importFromExcel,
    deleteAll,
  };
}
