import { describe, expect, it } from 'vitest';

import { esMedioPago, MEDIOS_PAGO } from './medio-pago';

describe('medio-pago domain type', () => {
  it('defines valid payment methods list', () => {
    expect(MEDIOS_PAGO).toEqual(['EFECTIVO', 'TRANSFERENCIA']);
  });

  it('accepts valid payment methods', () => {
    expect(esMedioPago('EFECTIVO')).toBe(true);
    expect(esMedioPago('TRANSFERENCIA')).toBe(true);
  });

  it('rejects invalid strings and non-string values', () => {
    expect(esMedioPago('efectivo')).toBe(false);
    expect(esMedioPago('transferencia')).toBe(false);
    expect(esMedioPago('AMBOS')).toBe(false);
    expect(esMedioPago('')).toBe(false);
    expect(esMedioPago(null)).toBe(false);
    expect(esMedioPago(1)).toBe(false);
    expect(esMedioPago(undefined)).toBe(false);
    expect(esMedioPago({})).toBe(false);
  });
});
