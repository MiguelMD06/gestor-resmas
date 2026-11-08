import { describe, expect, it } from 'vitest';

import { formatearPesos, pesos, pesosPositivos, restarPesos, sumarPesos } from './pesos';

describe('pesos domain value object', () => {
  it('accepts 0, negative integers, and Number.MAX_SAFE_INTEGER', () => {
    expect(pesos(0)).toBe(0);
    expect(pesos(-5000)).toBe(-5000);
    expect(pesos(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
    expect(pesos(Number.MIN_SAFE_INTEGER)).toBe(Number.MIN_SAFE_INTEGER);
  });

  it('rejects non-integers, NaN, Infinity, and unsafe integers', () => {
    expect(() => pesos(1.5)).toThrow(RangeError);
    expect(() => pesos(NaN)).toThrow(RangeError);
    expect(() => pesos(Infinity)).toThrow(RangeError);
    expect(() => pesos(-Infinity)).toThrow(RangeError);
    expect(() => pesos(Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError);
  });

  it('pesosPositivos accepts positive safe integers and rejects 0 or negatives', () => {
    expect(pesosPositivos(1)).toBe(1);
    expect(pesosPositivos(150000)).toBe(150000);
    expect(() => pesosPositivos(0)).toThrow(RangeError);
    expect(() => pesosPositivos(-1)).toThrow(RangeError);
    expect(() => pesosPositivos(1.5)).toThrow(RangeError);
  });

  it('performs exact addition and validates safe integer range', () => {
    const a = pesos(120000);
    const b = pesos(80000);
    expect(sumarPesos(a, b)).toBe(200000);

    const maxSafe = pesos(Number.MAX_SAFE_INTEGER);
    expect(() => sumarPesos(maxSafe, pesos(1))).toThrow(RangeError);
  });

  it('performs exact subtraction and validates safe integer range', () => {
    const a = pesos(120000);
    const b = pesos(80000);
    expect(restarPesos(a, b)).toBe(40000);

    const negativeResult = restarPesos(pesos(50), pesos(100));
    expect(negativeResult).toBe(-50);

    const minSafe = pesos(Number.MIN_SAFE_INTEGER);
    expect(() => restarPesos(minSafe, pesos(1))).toThrow(RangeError);
  });

  it('formats currency values correctly without Intl (5 spec cases)', () => {
    expect(formatearPesos(pesos(0))).toBe('$ 0');
    expect(formatearPesos(pesos(950))).toBe('$ 950');
    expect(formatearPesos(pesos(125000))).toBe('$ 125.000');
    expect(formatearPesos(pesos(1234567))).toBe('$ 1.234.567');
    expect(formatearPesos(pesos(-125000))).toBe('-$ 125.000');
  });
});
