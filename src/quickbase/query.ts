/**
 * Helpers for building Quickbase query-language clauses safely.
 * Values are always escaped so user text cannot change the structure of a query.
 */

/** Escapes a value for use inside single quotes in a Quickbase `where` clause. */
export function escapeQueryValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export type Operator = 'EX' | 'XEX' | 'CT' | 'XCT' | 'SW' | 'XSW' | 'BF' | 'OBF' | 'AF' | 'OAF' | 'IR' | 'XIR' | 'TV' | 'XTV' | 'LT' | 'LTE' | 'GT' | 'GTE';

export function clause(fieldId: number, op: Operator, value: string | number | boolean): string {
  if (!Number.isInteger(fieldId) || fieldId <= 0) throw new TypeError(`Invalid field id: ${fieldId}`);
  if (typeof value === 'number') return `{${fieldId}.${op}.${value}}`;
  return `{${fieldId}.${op}.'${escapeQueryValue(String(value))}'}`;
}

export function anyOf(clauses: string[]): string {
  return clauses.length === 1 ? (clauses[0] as string) : clauses.map((c) => `(${c})`).join('OR');
}

export function allOf(clauses: string[]): string {
  return clauses.length === 1 ? (clauses[0] as string) : clauses.map((c) => `(${c})`).join('AND');
}

/** `{3.EX.1}OR{3.EX.2}...` for a list of record IDs. */
export function recordIdsClause(ids: number[]): string {
  return anyOf(ids.map((id) => clause(3, 'EX', id)));
}
