import type { Pesos } from '../../shared/domain';
import { pesos, sumarPesos } from '../../shared/domain';

import type { FacturaAbierta } from './factura';
import { saldo } from './factura';

/**
 * Calculates total debt by summing remaining positive balances of open invoices (S3).
 * Invoices with zero or non-positive balances are ignored.
 */
export function deudaTotal(facturas: readonly FacturaAbierta[]): Pesos {
  return facturas.reduce<Pesos>((acc, f) => {
    const s = saldo(f);
    return s > 0 ? sumarPesos(acc, s) : acc;
  }, pesos(0));
}
