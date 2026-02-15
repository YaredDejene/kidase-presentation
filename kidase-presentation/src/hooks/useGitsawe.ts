import { useState, useCallback, useEffect } from 'react';
import { Gitsawe } from '../domain/entities/Gitsawe';
import { gitsaweRepository, ruleRepository, templateRepository } from '../repositories';
import { excelImportService } from '../services/ExcelImportService';
import { createRuleDefinition } from '../domain/entities/RuleDefinition';
import { toast } from '../store/toastStore';

export function useGitsawe() {
  const [gitsawes, setGitsawes] = useState<Gitsawe[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadGitsawes = useCallback(async () => {
    try {
      const all = await gitsaweRepository.getAll();
      setGitsawes(all);
      return all;
    } catch (error) {
      console.error('Failed to load Gitsawe records:', error);
      toast.error('Failed to load Gitsawe records');
      return [];
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadGitsawes();
      setIsLoading(false);
    };
    init();
  }, [loadGitsawes]);

  const importFromExcel = useCallback(async (filePath: string): Promise<boolean> => {
    const templates = await templateRepository.getAll();
    const defaultTemplateId = templates[0]?.id;
    if (!defaultTemplateId) {
      toast.error('No template available. Please create a template first.');
      return false;
    }

    try {
      const result = await excelImportService.importFromPath(filePath, defaultTemplateId);

      if (result.gitsawes.length === 0) {
        toast.error('No Gitsawe data found in the Excel file. Make sure there is a "Gitsawe" sheet.');
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
      toast.success(`Imported ${result.gitsawes.length} Gitsawe records`);
      return true;
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('Failed to import: ' + (error as Error).message);
      return false;
    }
  }, [loadGitsawes]);

  const deleteAll = useCallback(async (): Promise<boolean> => {
    try {
      for (const g of gitsawes) {
        await ruleRepository.deleteByGitsaweId(g.id);
        await gitsaweRepository.delete(g.id);
      }
      await loadGitsawes();
      toast.success('All Gitsawe records deleted');
      return true;
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete Gitsawe records');
      return false;
    }
  }, [gitsawes, loadGitsawes]);

  return {
    gitsawes,
    isLoading,
    loadGitsawes,
    importFromExcel,
    deleteAll,
  };
}
