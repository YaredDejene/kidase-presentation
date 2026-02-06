/**
 * Variable Entity
 * Represents a variable that can be used in slides
 */

export interface Variable {
  id: string;
  presentationId: string;
  name: string;
  value: string;
  valueLang1?: string;
  valueLang2?: string;
  valueLang3?: string;
  valueLang4?: string;
}

// Common liturgical variables (legacy {{VAR}} format)
export const COMMON_VARIABLES = [
  '{{PRIEST_NAME}}',
  '{{DEACON_NAME}}',
  '{{DATE_ETHIOPIAN}}',
  '{{DATE_GREGORIAN}}',
  '{{SAINT_NAME}}',
  '{{FEAST_NAME}}',
  '{{CHURCH_NAME}}',
  '{{BISHOP_NAME}}',
];

export function createVariable(
  presentationId: string,
  name: string,
  value: string = '',
  valueLang1: string = '',
  valueLang2: string = '',
  valueLang3: string = '',
  valueLang4: string = '',
): Omit<Variable, 'id'> {
  return {
    presentationId,
    name,
    value,
    valueLang1: valueLang1 || undefined,
    valueLang2: valueLang2 || undefined,
    valueLang3: valueLang3 || undefined,
    valueLang4: valueLang4 || undefined,
  };
}

export function isValidVariableName(name: string): boolean {
  return /^\{\{[A-Z_]+\}\}$/.test(name);
}

export function isAtVariable(name: string): boolean {
  return /^@[A-Z_]+$/.test(name);
}
