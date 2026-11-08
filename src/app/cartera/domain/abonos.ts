import type { Pesos } from '../../shared/domain';
import { pesos, ReglaNegocioError } from '../../shared/domain';

import { deudaTotal } from './deuda';
import type { FacturaAbierta } from './factura';
import { saldo } from './factura';
import { repartirPago } from './reparto-pago';

export interface AplicacionAbono {
  readonly idVenta: number;
  readonly monto: Pesos;
  readonly capital: Pesos;
  readonly ganancia: Pesos;
  readonly quedaPagada: boolean;
}

/**
 * Distributes a general payment across open invoices chronologically (S4).
 *
 * Invoices are sorted by sale date ascending, breaking ties by idVenta ascending.
 * Money covers invoices in order up to their outstanding balance.
 * Only invoices receiving money are included in the result.
 */
export function distribuirCascada(facturas: readonly FacturaAbierta[], monto: Pesos): AplicacionAbono[] {
  if (monto <= 0) {
    throw new ReglaNegocioError('MONTO_INVALIDO', `Payment amount must be greater than zero, got: ${monto}`);
  }

  const totalDeuda = deudaTotal(facturas);
  if (totalDeuda <= 0) {
    throw new ReglaNegocioError('SIN_DEUDA', 'There is no outstanding debt to pay');
  }

  if (monto > totalDeuda) {
    throw new ReglaNegocioError(
      'MONTO_SUPERA_DEUDA',
      `Payment amount (${monto}) exceeds total customer debt (${totalDeuda})`,
    );
  }

  const facturasConSaldo = facturas
    .filter((f) => saldo(f) > 0)
    .sort((a, b) => {
      if (a.fecha < b.fecha) return -1;
      if (a.fecha > b.fecha) return 1;
      return a.idVenta - b.idVenta;
    });

  let restante = monto;
  const aplicaciones: AplicacionAbono[] = [];

  for (const f of facturasConSaldo) {
    if (restante <= 0) break;

    const s = saldo(f);
    const aPagar = pesos(Math.min(restante, s));
    const reparto = repartirPago(f, aPagar);
    const quedaPagada = aPagar === s;

    aplicaciones.push({
      idVenta: f.idVenta,
      monto: aPagar,
      capital: reparto.capital,
      ganancia: reparto.ganancia,
      quedaPagada,
    });

    restante = pesos(restante - aPagar);
  }

  return aplicaciones;
}

/**
 * Applies a payment directly to a single selected invoice in isolation (S5).
 */
export function abonarFactura(f: FacturaAbierta, monto: Pesos): AplicacionAbono {
  if (monto <= 0) {
    throw new ReglaNegocioError('MONTO_INVALIDO', `Payment amount must be greater than zero, got: ${monto}`);
  }

  const s = saldo(f);
  if (s <= 0) {
    throw new ReglaNegocioError('SIN_DEUDA', `Invoice ${f.idVenta} has no outstanding balance`);
  }

  const reparto = repartirPago(f, monto);

  return {
    idVenta: f.idVenta,
    monto,
    capital: reparto.capital,
    ganancia: reparto.ganancia,
    quedaPagada: monto === s,
  };
}

/**
 * Settles 100% of accumulated customer debt across all open invoices (S6).
 */
export function liquidarTodo(facturas: readonly FacturaAbierta[]): AplicacionAbono[] {
  const deuda = deudaTotal(facturas);
  if (deuda <= 0) {
    throw new ReglaNegocioError('SIN_DEUDA', 'There is no outstanding debt to settle');
  }

  return distribuirCascada(facturas, deuda);
}
