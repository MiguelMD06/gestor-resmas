import { describe, expect, it } from 'vitest';

import { fechaHora, pesos } from '../../shared/domain';

import { deudaTotal } from './deuda';
import type { FacturaAbierta } from './factura';

describe('deudaTotal domain calculation (S3)', () => {
  it('sums balances of all invoices with positive remaining balance', () => {
    const facturas: FacturaAbierta[] = [
      {
        idVenta: 1,
        fecha: fechaHora('2026-11-08 09:00:00'),
        total: pesos(45000),
        costoBase: pesos(36000),
        pagado: pesos(20000), // saldo: 25.000
      },
      {
        idVenta: 2,
        fecha: fechaHora('2026-11-08 10:00:00'),
        total: pesos(30000),
        costoBase: pesos(24000),
        pagado: pesos(10000), // saldo: 20.000
      },
    ];

    expect(deudaTotal(facturas)).toBe(45000);
  });

  it('ignores invoices with zero balance', () => {
    const facturas: FacturaAbierta[] = [
      {
        idVenta: 1,
        fecha: fechaHora('2026-11-08 09:00:00'),
        total: pesos(45000),
        costoBase: pesos(36000),
        pagado: pesos(45000), // saldo: 0
      },
      {
        idVenta: 2,
        fecha: fechaHora('2026-11-08 10:00:00'),
        total: pesos(30000),
        costoBase: pesos(24000),
        pagado: pesos(10000), // saldo: 20.000
      },
    ];

    expect(deudaTotal(facturas)).toBe(20000);
  });

  it('returns zero when there are no invoices or all invoices have zero balance', () => {
    expect(deudaTotal([])).toBe(0);

    const facturasPagadas: FacturaAbierta[] = [
      {
        idVenta: 1,
        fecha: fechaHora('2026-11-08 09:00:00'),
        total: pesos(45000),
        costoBase: pesos(36000),
        pagado: pesos(45000),
      },
    ];
    expect(deudaTotal(facturasPagadas)).toBe(0);
  });
});
