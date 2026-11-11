import type { Pesos } from '../../shared/domain';
import { pesos, ReglaNegocioError } from '../../shared/domain';

import type { FacturaAbierta } from './factura';
import { saldo, validarFactura } from './factura';

export interface RepartoPago {
  readonly capital: Pesos;
  readonly ganancia: Pesos;
}

/**
 * Distributes a payment amount on an invoice between recovered capital and free profit (R-01).
 *
 * Incoming money covers the cost base of the invoice first (Capital Recuperado).
 * Only when paid amount exceeds the acquisition cost base, the surplus becomes free profit.
 */
export function repartirPago(f: FacturaAbierta, monto: Pesos): RepartoPago {
  validarFactura(f);

  if (monto <= 0) {
    throw new ReglaNegocioError('MONTO_INVALIDO', `Payment amount must be greater than zero, got: ${monto}`);
  }

  const saldoFactura = saldo(f);
  if (monto > saldoFactura) {
    throw new ReglaNegocioError(
      'MONTO_SUPERA_SALDO_FACTURA',
      `Payment amount (${monto}) exceeds invoice balance (${saldoFactura})`,
    );
  }

  const pagado = f.pagado;
  const costo = f.costoBase;

  const capital = Math.min(pagado + monto, costo) - Math.min(pagado, costo);
  const ganancia = monto - capital;

  return {
    capital: pesos(capital),
    ganancia: pesos(ganancia),
  };
}
