import { describe, expect, it } from 'vitest';
import { anyOf, clause, escapeQueryValue, recordIdsClause } from '../../src/quickbase/query.js';

describe('query helpers', () => {
  it('escapes quotes and backslashes', () => {
    expect(escapeQueryValue("O'Brien")).toBe("O\\'Brien");
    expect(escapeQueryValue('a\\b')).toBe('a\\\\b');
  });

  it('cannot be broken out of by user text', () => {
    expect(clause(6, 'CT', "x'}OR{3.GT.0}OR{6.EX.'")).toBe("{6.CT.'x\\'}OR{3.GT.0}OR{6.EX.\\''}");
  });

  it('keeps numbers unquoted and validates field ids', () => {
    expect(clause(3, 'EX', 42)).toBe('{3.EX.42}');
    expect(() => clause(-1, 'EX', 1)).toThrow();
    expect(() => clause(1.5, 'EX', 1)).toThrow();
  });

  it('combines clauses', () => {
    expect(anyOf(['{1.EX.1}', '{2.EX.2}'])).toBe('({1.EX.1})OR({2.EX.2})');
    expect(recordIdsClause([1, 2])).toBe('({3.EX.1})OR({3.EX.2})');
  });
});
