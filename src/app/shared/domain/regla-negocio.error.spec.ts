import { describe, expect, it } from 'vitest';

import { ReglaNegocioError } from './regla-negocio.error';

describe('ReglaNegocioError', () => {
  it('stores codigo and message, sets name to ReglaNegocioError, and satisfies instanceof checks', () => {
    const error = new ReglaNegocioError('MONTO_SUPERA_DEUDA', 'Payment exceeds total debt');

    expect(error.codigo).toBe('MONTO_SUPERA_DEUDA');
    expect(error.message).toBe('Payment exceeds total debt');
    expect(error.name).toBe('ReglaNegocioError');
    expect(error).toBeInstanceOf(ReglaNegocioError);
    expect(error).toBeInstanceOf(Error);
  });

  it('accepts new domain error codes: CANTIDAD_INVALIDA, COSTO_CAJA_INVALIDO, and STOCK_INSUFICIENTE', () => {
    const errCantidad = new ReglaNegocioError('CANTIDAD_INVALIDA', 'Invalid quantity');
    const errCosto = new ReglaNegocioError('COSTO_CAJA_INVALIDO', 'Invalid box cost');
    const errStock = new ReglaNegocioError('STOCK_INSUFICIENTE', 'Insufficient stock');

    expect(errCantidad.codigo).toBe('CANTIDAD_INVALIDA');
    expect(errCosto.codigo).toBe('COSTO_CAJA_INVALIDO');
    expect(errStock.codigo).toBe('STOCK_INSUFICIENTE');
  });
});
