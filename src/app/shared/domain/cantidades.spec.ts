import { describe, expect, it } from 'vitest';

import { cajas, cajasAResmas, resmas, resmasPositivas, RESMAS_POR_CAJA } from './cantidades';

describe('cantidades domain value objects', () => {
  it('exposes RESMAS_POR_CAJA constant as 10', () => {
    expect(RESMAS_POR_CAJA).toBe(10);
  });

  it('resmas accepts 0 and positive safe integers, rejecting negatives or decimals', () => {
    expect(resmas(0)).toBe(0);
    expect(resmas(10)).toBe(10);
    expect(resmas(500)).toBe(500);

    expect(() => resmas(-1)).toThrow(RangeError);
    expect(() => resmas(1.5)).toThrow(RangeError);
    expect(() => resmas(NaN)).toThrow(RangeError);
    expect(() => resmas(Infinity)).toThrow(RangeError);
  });

  it('resmasPositivas accepts positive integers and throws RangeError for 0 or invalid inputs', () => {
    expect(resmasPositivas(1)).toBe(1);
    expect(resmasPositivas(50)).toBe(50);

    expect(() => resmasPositivas(0)).toThrow(RangeError);
    expect(() => resmasPositivas(-1)).toThrow(RangeError);
    expect(() => resmasPositivas(2.5)).toThrow(RangeError);
  });

  it('cajas throws RangeError for 0, negative values, decimals, and non-integers', () => {
    expect(() => cajas(0)).toThrow(RangeError);
    expect(() => cajas(-1)).toThrow(RangeError);
    expect(() => cajas(2.5)).toThrow(RangeError);
    expect(() => cajas(NaN)).toThrow(RangeError);
    expect(() => cajas(Infinity)).toThrow(RangeError);

    expect(cajas(1)).toBe(1);
    expect(cajas(5)).toBe(5);
  });

  it('cajasAResmas converts boxes to reams using RESMAS_POR_CAJA (cajas(3) -> 30)', () => {
    const numCajas = cajas(3);
    const numResmas = cajasAResmas(numCajas);
    expect(numResmas).toBe(30);
  });
});
