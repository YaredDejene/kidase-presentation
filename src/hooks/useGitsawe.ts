import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Gitsawe } from '../domain/entities/Gitsawe';
import { gitsaweRepository, ruleRepository } from '../repositories';
import { excelImportService } from '../services/ExcelImportService';
import { createRuleDefinition } from '../domain/entities/RuleDefinition';
import { toast } from '../store/toastStore';

export function useGitsawe() {
  const { t } = useTranslation('manager');
  const [gitsawes, setGitsawes] = useState<Gitsawe[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadGitsawes = useCallback(async () => {
    try {
      const all = await gitsaweRepository.getAll();
      setGitsawes(all);
      return all;
    } catch (error) {
      console.error('Failed to load Gitsawe records:', error);
      toast.error(t('failedToLoadKidases'));
      return [];
    }
  }, [t]);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadGitsawes();
      setIsLoading(false);
    };
    init();
  }, [loadGitsawes]);

  const importFromExcel = useCallback(async (filePath: string): Promise<boolean> => {
    try {
      const result = await excelImportService.importGitsaweFromPath(filePath);

      if (result.gitsawes.length === 0) {
        toast.error(t('noGitsaweRecords'));
        return false;
      }

      // Clear existing gitsawe records + their rules
      const existing = await gitsaweRepository.getAll();
      for (const g of existing) {
        await ruleRepository.deleteByGitsaweId(g.id);
        await gitsaweRepository.delete(g.id);
      }

      // Create new records + selection rules
      for (const imported of result.gitsawes) {
        const created = await gitsaweRepository.create(imported.gitsawe);
        if (imported.selectionRule) {
          const ruleDef = createRuleDefinition(
            imported.selectionRule.name,
            'gitsawe',
            imported.selectionRule.ruleJson,
            {
              gitsaweId: created.id,
              isEnabled: true,
            }
          );
          await ruleRepository.create(ruleDef);
        }
      }

      await loadGitsawes();
      toast.success(t('importSuccess', { count: result.gitsawes.length }));
      return true;
    } catch (error) {
      console.error('Import failed:', error);
      toast.error(t('failedToImport', { message: (error as Error).message }));
      return false;
    }
  }, [loadGitsawes, t]);

  const deleteAll = useCallback(async (): Promise<boolean> => {
    try {
      for (const g of gitsawes) {
        await ruleRepository.deleteByGitsaweId(g.id);
        await gitsaweRepository.delete(g.id);
      }
      await loadGitsawes();
      toast.success(t('deleteAllSuccess'));
      return true;
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error(t('deleteAllFailed'));
      return false;
    }
  }, [gitsawes, loadGitsawes, t]);

  return {
    gitsawes,
    isLoading,
    loadGitsawes,
    importFromExcel,
    deleteAll,
  };
}
