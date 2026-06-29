import { describe, it, expect } from 'vitest';
import { normalizePostgresArray } from '../utils/arrayUtils';

describe('normalizePostgresArray', () => {
  it('should return the value directly if it is already an array', () => {
    const input = ['apple', 'banana'];
    expect(normalizePostgresArray(input)).toEqual(input);
  });

  it('should parse standard postgres string arrays correctly', () => {
    expect(normalizePostgresArray('{apple,banana}')).toEqual(['apple', 'banana']);
  });

  it('should parse quoted strings inside standard postgres arrays correctly', () => {
    expect(normalizePostgresArray('{"apple pie","banana split"}')).toEqual(['apple pie', 'banana split']);
  });

  it('should handle empty postgres arrays correctly', () => {
    expect(normalizePostgresArray('{}')).toEqual([]);
  });

  it('should return an empty array for non-postgres array types', () => {
    expect(normalizePostgresArray(null)).toEqual([]);
    expect(normalizePostgresArray(undefined)).toEqual([]);
    expect(normalizePostgresArray('not-an-array')).toEqual([]);
  });
});
