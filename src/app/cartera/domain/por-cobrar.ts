import type { Pesos } from '../../shared/domain';
import { pesos } from '../../shared/domain';

import type { FacturaAbierta } from './factura';
import { saldo } from './factura';

export interface PorCobrar {
  readonly capital: Pesos;
  readonly ganancia: Pesos;
}

/**
 * Calculates remaining capital to recover and future profit on an invoice (S16).
 * For sales below cost (total < costoBase), future profit is 0, never negative.
 */
export function porCobrar(f: FacturaAbierta): PorCobrar {
  const s = saldo(f);
  const capital = Math.min(f.costoBase, f.total) - Math.min(f.pagado, f.costoBase);
  const ganancia = s - capital;

  return {
    capital: pesos(capital),
    ganancia: pesos(ganancia),
  };
}
