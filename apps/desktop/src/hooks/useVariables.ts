import { useCallback } from 'react';
import { Variable } from '@kidase/shared/domain/entities/Variable';
import { LANG_VALUE_FIELD_MAP } from '@kidase/shared/domain/entities/Presentation';
import { variableRepository } from '../repositories';

const langValuesOf = (v: Variable) =>
  Object.fromEntries(Object.values(LANG_VALUE_FIELD_MAP).map(field => [field, v[field]]));

export function useVariables() {
  const createVariable = useCallback(
    async (data: Omit<Variable, 'id'>): Promise<Variable> => {
      return variableRepository.create(data);
    },
    []
  );

  const updateVariable = useCallback(
    async (
      id: string,
      data: Partial<Omit<Variable, 'id' | 'presentationId'>>
    ): Promise<Variable> => {
      return variableRepository.update(id, data);
    },
    []
  );

  const deleteVariable = useCallback(async (id: string): Promise<void> => {
    return variableRepository.delete(id);
  }, []);

  /**
   * Saves a batch of variables. Handles temp-ID entries (creates them)
   * and existing entries (updates them). Returns the saved variables.
   */
  const saveAll = useCallback(
    async (
      presentationId: string,
      variables: Variable[]
    ): Promise<Variable[]> => {
      const saved: Variable[] = [];
      for (const variable of variables) {
        if (variable.id.startsWith('temp-')) {
          const created = await variableRepository.create({
            presentationId,
            name: variable.name,
            value: variable.value,
            ...langValuesOf(variable),
          });
          saved.push(created);
        } else {
          const updated = await variableRepository.update(variable.id, {
            value: variable.value,
            ...langValuesOf(variable),
          });
          saved.push(updated);
        }
      }
      return saved;
    },
    []
  );

  return { createVariable, updateVariable, deleteVariable, saveAll };
}
