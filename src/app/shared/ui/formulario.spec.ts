import { describe, expect, it } from 'vitest';

import { esVacio } from './formulario';

describe('formulario helpers', () => {
  describe('esVacio', () => {
    it('returns true for null, undefined, empty string, whitespace-only string, and NaN', () => {
      expect(esVacio(null)).toBe(true);
      expect(esVacio(undefined)).toBe(true);
      expect(esVacio('')).toBe(true);
      expect(esVacio('  ')).toBe(true);
      expect(esVacio(Number.NaN)).toBe(true);
    });

    it('returns false for 0, "0", and 300000', () => {
      expect(esVacio(0)).toBe(false);
      expect(esVacio('0')).toBe(false);
      expect(esVacio(300000)).toBe(false);
    });
  });
});
