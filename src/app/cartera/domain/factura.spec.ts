import { describe, expect, it } from 'vitest';

import { fechaHora, pesos } from '../../shared/domain';

import type { FacturaAbierta } from './factura';
import { saldo } from './factura';

describe('factura domain logic', () => {
  it('calculates invoice balance as total minus paid amount', () => {
    const factura: FacturaAbierta = {
      idVenta: 1,
      fecha: fechaHora('2026-11-08 10:00:00'),
      total: pesos(45000),
      costoBase: pesos(36000),
      pagado: pesos(20000),
    };

    expect(saldo(factura)).toBe(25000);
  });

  it('returns zero balance when invoice is fully paid', () => {
    const factura: FacturaAbierta = {
      idVenta: 2,
      fecha: fechaHora('2026-11-08 11:00:00'),
      total: pesos(30000),
      costoBase: pesos(24000),
      pagado: pesos(30000),
    };

    expect(saldo(factura)).toBe(0);
  });
});
