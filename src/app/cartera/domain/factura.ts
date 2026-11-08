import type { FechaHora, Pesos } from '../../shared/domain';
import { restarPesos } from '../../shared/domain';

export interface FacturaAbierta {
  readonly idVenta: number;
  readonly fecha: FechaHora;
  readonly total: Pesos;
  readonly costoBase: Pesos;
  readonly pagado: Pesos;
}

/**
 * Calculates remaining unpaid balance of an open invoice.
 */
export function saldo(f: FacturaAbierta): Pesos {
  return restarPesos(f.total, f.pagado);
}
