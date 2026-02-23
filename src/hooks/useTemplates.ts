import { useState, useCallback, useEffect } from 'react';
import { templateRepository } from '../repositories';
import { Template, TemplateDefinition } from '../domain/entities/Template';
import templateSeeds from '../data/template-seeds.json';

/** Cast seed definitionJson (untyped JSON) to TemplateDefinition */
function seedDefinition(index: number): TemplateDefinition {
  return templateSeeds[index].definitionJson as TemplateDefinition;
}

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const loaded = await templateRepository.getAll();
      setTemplates(loaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createTemplate = useCallback(async (
    name: string,
    definition?: TemplateDefinition,
    maxLangCount: number = 4
  ): Promise<Template | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const template = await templateRepository.create({
        name,
        maxLangCount,
        definitionJson: definition || seedDefinition(0),
      });

      setTemplates(prev => [...prev, template]);
      return template;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateTemplate = useCallback(async (
    id: string,
    updates: Partial<Omit<Template, 'id' | 'createdAt'>>
  ): Promise<Template | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const updated = await templateRepository.update(id, updates);
      setTemplates(prev => prev.map(t => t.id === id ? updated : t));
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update template');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteTemplate = useCallback(async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      await templateRepository.delete(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const duplicateTemplate = useCallback(async (id: string, newName: string): Promise<Template | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const original = await templateRepository.getById(id);
      if (!original) {
        throw new Error('Template not found');
      }

      const duplicate = await templateRepository.create({
        name: newName,
        maxLangCount: original.maxLangCount,
        definitionJson: original.definitionJson,
      });

      setTemplates(prev => [...prev, duplicate]);
      return duplicate;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate template');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const ensureDefaultTemplate = useCallback(async (): Promise<Template> => {
    const existing = await templateRepository.getAll();

    if (existing.length === 0) {
      const seed = templateSeeds[0];
      const defaultTemplate = await templateRepository.create({
        name: seed.name,
        maxLangCount: seed.maxLangCount,
        definitionJson: seed.definitionJson as unknown as TemplateDefinition,
      });
      setTemplates([defaultTemplate]);
      return defaultTemplate;
    }

    setTemplates(existing);
    return existing[0];
  }, []);

  const getTemplateById = useCallback((id: string): Template | undefined => {
    return templates.find(t => t.id === id);
  }, [templates]);

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return {
    // State
    templates,
    isLoading,
    error,

    // Actions
    loadTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    ensureDefaultTemplate,
    getTemplateById,
  };
}
