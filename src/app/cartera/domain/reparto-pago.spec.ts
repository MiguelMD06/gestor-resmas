import { describe, expect, it } from 'vitest';

import { fechaHora, pesos, ReglaNegocioError } from '../../shared/domain';

import type { FacturaAbierta } from './factura';
import { repartirPago } from './reparto-pago';

describe('repartirPago domain rule (R-01)', () => {
  it('E1: allocates payment first to cost base as recovered capital when cost is not yet covered', () => {
    // 3 reams sold for $45.000, cost base $36.000, initial payment of $20.000
    const factura: FacturaAbierta = {
      idVenta: 1,
      fecha: fechaHora('2026-11-08 09:00:00'),
      total: pesos(45000),
      costoBase: pesos(36000),
      pagado: pesos(0),
    };

    const resultado = repartirPago(factura, pesos(20000));

    expect(resultado.capital).toBe(20000);
    expect(resultado.ganancia).toBe(0);
    expect(resultado.capital + resultado.ganancia).toBe(20000);
  });

  it('E2: covers remaining cost base and assigns the surplus to profit, completing payment', () => {
    // Same invoice after paying $20.000, now receives next payment of $25.000
    const factura: FacturaAbierta = {
      idVenta: 1,
      fecha: fechaHora('2026-11-08 09:00:00'),
      total: pesos(45000),
      costoBase: pesos(36000),
      pagado: pesos(20000),
    };

    const resultado = repartirPago(factura, pesos(25000));

    expect(resultado.capital).toBe(16000);
    expect(resultado.ganancia).toBe(9000);
    expect(resultado.capital + resultado.ganancia).toBe(25000);
  });

  it('allocates entire payment to capital and zero to profit for a below-cost sale (total < costoBase)', () => {
    // Below-cost sale: 2 reams at $10.000 = $20.000 total, cost base is $24.000
    const factura: FacturaAbierta = {
      idVenta: 2,
      fecha: fechaHora('2026-11-08 10:00:00'),
      total: pesos(20000),
      costoBase: pesos(24000),
      pagado: pesos(0),
    };

    const resultado = repartirPago(factura, pesos(20000));

    expect(resultado.capital).toBe(20000);
    expect(resultado.ganancia).toBe(0);
    expect(resultado.capital + resultado.ganancia).toBe(20000);
  });

  it('rejects zero or negative payment amounts with MONTO_INVALIDO', () => {
    const factura: FacturaAbierta = {
      idVenta: 3,
      fecha: fechaHora('2026-11-08 11:00:00'),
      total: pesos(30000),
      costoBase: pesos(20000),
      pagado: pesos(0),
    };

    expect(() => repartirPago(factura, pesos(0))).toThrowError(ReglaNegocioError);
    try {
      repartirPago(factura, pesos(0));
    } catch (e) {
      expect((e as ReglaNegocioError).codigo).toBe('MONTO_INVALIDO');
    }

    expect(() => repartirPago(factura, pesos(-5000))).toThrowError(ReglaNegocioError);
    try {
      repartirPago(factura, pesos(-5000));
    } catch (e) {
      expect((e as ReglaNegocioError).codigo).toBe('MONTO_INVALIDO');
    }
  });

  it('rejects payment exceeding remaining invoice balance with MONTO_SUPERA_SALDO_FACTURA', () => {
    const factura: FacturaAbierta = {
      idVenta: 4,
      fecha: fechaHora('2026-11-08 12:00:00'),
      total: pesos(30000),
      costoBase: pesos(20000),
      pagado: pesos(10000), // remaining balance is $20.000
    };

    expect(() => repartirPago(factura, pesos(20001))).toThrow(
      expect.objectContaining({ codigo: 'MONTO_SUPERA_SALDO_FACTURA' }),
    );
  });
});
