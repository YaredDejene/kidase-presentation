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

/**
 * Normalize a user-entered variable name into the canonical format.
 * Returns `@NAME` for at-variables, `{{NAME}}` for legacy brace variables.
 */
export function formatVariableName(input: string): string {
  let name = input.trim().toUpperCase();
  const isAtFormat = name.startsWith('@') || (!name.startsWith('{{') && !name.includes('{'));
  if (isAtFormat) {
    name = name.replace(/^@/, '');
    return `@${name}`;
  }
  if (!name.startsWith('{{')) name = `{{${name}`;
  if (!name.endsWith('}}')) name = `${name}}}`;
  return name;
}

