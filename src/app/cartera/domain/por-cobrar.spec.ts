import { describe, expect, it } from 'vitest';

import { fechaHora, pesos } from '../../shared/domain';

import type { FacturaAbierta } from './factura';
import { porCobrar } from './por-cobrar';

function factura(overrides: Partial<FacturaAbierta>): FacturaAbierta {
  return {
    idVenta: 1,
    fecha: fechaHora('2026-11-01 10:00:00'),
    total: pesos(30000),
    costoBase: pesos(20000),
    pagado: pesos(0),
    ...overrides,
  };
}

describe('porCobrar', () => {
  it('returns remaining capital and profit for partially paid invoice (C19, F2)', () => {
    const f2 = factura({
      idVenta: 2,
      fecha: fechaHora('2026-11-10 10:00:00'),
      total: pesos(15000),
      costoBase: pesos(10000),
      pagado: pesos(5000),
    });

    expect(porCobrar(f2)).toEqual({ capital: pesos(5000), ganancia: pesos(5000) });
  });

  it('returns full cost and profit for unpaid invoice (C19, F1)', () => {
    const f1 = factura({
      idVenta: 1,
      total: pesos(30000),
      costoBase: pesos(20000),
      pagado: pesos(0),
    });

    expect(porCobrar(f1)).toEqual({ capital: pesos(20000), ganancia: pesos(10000) });
  });

  it('returns zero profit and never negative for a sale below cost (C19)', () => {
    const bajoCosto = factura({
      total: pesos(8000),
      costoBase: pesos(10000),
      pagado: pesos(3000),
    });

    expect(porCobrar(bajoCosto)).toEqual({ capital: pesos(5000), ganancia: pesos(0) });
  });

  it('returns zero capital and zero profit for a fully paid invoice (C19)', () => {
    const pagada = factura({
      total: pesos(15000),
      costoBase: pesos(10000),
      pagado: pesos(15000),
    });

    expect(porCobrar(pagada)).toEqual({ capital: pesos(0), ganancia: pesos(0) });
  });

  it('throws FACTURA_INVALIDA when invoice invariants are violated', () => {
    const invalida = factura({ pagado: pesos(35000) });

    expect(() => porCobrar(invalida)).toThrow(expect.objectContaining({ codigo: 'FACTURA_INVALIDA' }));
  });
});
