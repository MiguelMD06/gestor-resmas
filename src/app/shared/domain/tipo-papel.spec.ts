import { describe, expect, it } from 'vitest';

import { esTipoPapel, TIPOS_PAPEL } from './tipo-papel';

describe('tipo-papel domain type', () => {
  it('defines valid paper types list', () => {
    expect(TIPOS_PAPEL).toEqual(['CARTA', 'OFICIO']);
  });

  it('accepts valid paper types', () => {
    expect(esTipoPapel('CARTA')).toBe(true);
    expect(esTipoPapel('OFICIO')).toBe(true);
  });

  it('rejects invalid strings and non-string values', () => {
    expect(esTipoPapel('carta')).toBe(false);
    expect(esTipoPapel('oficio')).toBe(false);
    expect(esTipoPapel('AMBOS')).toBe(false);
    expect(esTipoPapel('')).toBe(false);
    expect(esTipoPapel(null)).toBe(false);
    expect(esTipoPapel(1)).toBe(false);
    expect(esTipoPapel(undefined)).toBe(false);
    expect(esTipoPapel({})).toBe(false);
  });
});
