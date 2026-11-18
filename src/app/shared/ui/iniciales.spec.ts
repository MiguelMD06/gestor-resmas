import { describe, expect, it } from 'vitest';

import { iniciales } from './iniciales';

describe('iniciales', () => {
  it('returns first letter of first name and last surname in uppercase for multi-word names', () => {
    expect(iniciales('Ana María Pérez')).toBe('AP');
    expect(iniciales('Ana Pérez')).toBe('AP');
  });

  it('returns single uppercase letter for single-word names', () => {
    expect(iniciales('Sofía')).toBe('S');
    expect(iniciales('luis')).toBe('L');
  });

  it('ignores repeated, leading, and trailing spaces', () => {
    expect(iniciales('  juan   gómez ')).toBe('JG');
    expect(iniciales('  maría  ')).toBe('M');
  });

  it('returns empty string for empty or whitespace-only names', () => {
    expect(iniciales('')).toBe('');
    expect(iniciales('   ')).toBe('');
  });
});
