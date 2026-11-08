import { describe, expect, it } from 'vitest';

import { pesos, resmas } from '../../shared/domain';

import { evaluarLinea, perdida } from './margen';

describe('margen domain calculations (S12)', () => {
  it('E8: identifies sale below cost and calculates loss accurately', () => {
    // 2 reams sold at $10.000 each when unit cost is $12.000
    const evaluacion = evaluarLinea(resmas(2), pesos(12000), pesos(10000));

    expect(evaluacion.subtotalVenta).toBe(20000);
    expect(evaluacion.subtotalCosto).toBe(24000);
    expect(evaluacion.margen).toBe(-4000);
    expect(evaluacion.bajoCosto).toBe(true);

    const perdidaMonto = perdida(evaluacion.subtotalVenta, evaluacion.subtotalCosto);
    expect(perdidaMonto).toBe(4000);
  });

  it('evaluates normal profitable line correctly', () => {
    // 5 reams sold at $15.000 each when unit cost is $12.000
    const evaluacion = evaluarLinea(resmas(5), pesos(12000), pesos(15000));

    expect(evaluacion.subtotalVenta).toBe(75000);
    expect(evaluacion.subtotalCosto).toBe(60000);
    expect(evaluacion.margen).toBe(15000);
    expect(evaluacion.bajoCosto).toBe(false);

    expect(perdida(evaluacion.subtotalVenta, evaluacion.subtotalCosto)).toBe(0);
  });

  it('evaluates sale at exact cost correctly', () => {
    // 1 ream sold at $12.000 when unit cost is $12.000
    const evaluacion = evaluarLinea(resmas(1), pesos(12000), pesos(12000));

    expect(evaluacion.subtotalVenta).toBe(12000);
    expect(evaluacion.subtotalCosto).toBe(12000);
    expect(evaluacion.margen).toBe(0);
    expect(evaluacion.bajoCosto).toBe(false);

    expect(perdida(evaluacion.subtotalVenta, evaluacion.subtotalCosto)).toBe(0);
  });
});
