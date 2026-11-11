import { describe, expect, it } from 'vitest';

import { fechaHora, pesos } from '../../shared/domain';

import type { FacturaAbierta } from './factura';
import { saldo } from './factura';

describe('factura domain logic', () => {
  it('saldo calculates invoice balance as total minus paid amount', () => {
    const factura: FacturaAbierta = {
      idVenta: 1,
      fecha: fechaHora('2026-11-08 10:00:00'),
      total: pesos(45000),
      costoBase: pesos(36000),
      pagado: pesos(20000),
    };

    expect(saldo(factura)).toBe(25000);
  });

  it('saldo returns zero balance when invoice is fully paid', () => {
    const factura: FacturaAbierta = {
      idVenta: 2,
      fecha: fechaHora('2026-11-08 11:00:00'),
      total: pesos(30000),
      costoBase: pesos(24000),
      pagado: pesos(30000),
    };

    expect(saldo(factura)).toBe(0);
  });

  it('saldo returns total when pagado is 0', () => {
    const factura: FacturaAbierta = {
      idVenta: 3,
      fecha: fechaHora('2026-11-08 12:00:00'),
      total: pesos(30000),
      costoBase: pesos(24000),
      pagado: pesos(0),
    };

    expect(saldo(factura)).toBe(30000);
  });

  it('saldo returns 0 when pagado equals total', () => {
    const factura: FacturaAbierta = {
      idVenta: 4,
      fecha: fechaHora('2026-11-08 12:00:00'),
      total: pesos(30000),
      costoBase: pesos(24000),
      pagado: pesos(30000),
    };

    expect(saldo(factura)).toBe(0);
  });

  it('saldo works when costoBase is 0', () => {
    const factura: FacturaAbierta = {
      idVenta: 5,
      fecha: fechaHora('2026-11-08 12:00:00'),
      total: pesos(30000),
      costoBase: pesos(0),
      pagado: pesos(10000),
    };

    expect(saldo(factura)).toBe(20000);
  });

  it('saldo rejects invoice when pagado is -1 with FACTURA_INVALIDA', () => {
    const factura: FacturaAbierta = {
      idVenta: 6,
      fecha: fechaHora('2026-11-08 12:00:00'),
      total: pesos(30000),
      costoBase: pesos(24000),
      pagado: pesos(-1),
    };

    expect(() => saldo(factura)).toThrow(expect.objectContaining({ codigo: 'FACTURA_INVALIDA' }));
  });

  it('saldo rejects invoice when pagado is total + 1 with FACTURA_INVALIDA', () => {
    const factura: FacturaAbierta = {
      idVenta: 7,
      fecha: fechaHora('2026-11-08 12:00:00'),
      total: pesos(30000),
      costoBase: pesos(24000),
      pagado: pesos(30001),
    };

    expect(() => saldo(factura)).toThrow(expect.objectContaining({ codigo: 'FACTURA_INVALIDA' }));
  });

  it('saldo rejects invoice when costoBase is -1 with FACTURA_INVALIDA', () => {
    const factura: FacturaAbierta = {
      idVenta: 8,
      fecha: fechaHora('2026-11-08 12:00:00'),
      total: pesos(30000),
      costoBase: pesos(-1),
      pagado: pesos(10000),
    };

    expect(() => saldo(factura)).toThrow(expect.objectContaining({ codigo: 'FACTURA_INVALIDA' }));
  });
});
