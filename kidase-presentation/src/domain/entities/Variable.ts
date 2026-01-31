/**
 * Variable Entity
 * Represents a variable that can be used in slides
 */

export interface Variable {
  id: string;
  presentationId: string;
  name: string;
  value: string;
}

// Common liturgical variables
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
  value: string = ''
): Omit<Variable, 'id'> {
  return {
    presentationId,
    name,
    value,
  };
}

export function isValidVariableName(name: string): boolean {
  return /^\{\{[A-Z_]+\}\}$/.test(name);
}
