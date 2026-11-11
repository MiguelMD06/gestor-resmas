import type { FechaHora, Pesos } from '../../shared/domain';
import { ReglaNegocioError, restarPesos } from '../../shared/domain';

export interface FacturaAbierta {
  readonly idVenta: number;
  readonly fecha: FechaHora;
  readonly total: Pesos;
  readonly costoBase: Pesos;
  readonly pagado: Pesos;
}

/**
 * Validates invoice invariants: 0 <= pagado <= total and costoBase >= 0.
 */
export function validarFactura(f: FacturaAbierta): void {
  if (f.pagado < 0 || f.pagado > f.total || f.costoBase < 0) {
    throw new ReglaNegocioError(
      'FACTURA_INVALIDA',
      `Invalid invoice data: paid=${f.pagado}, total=${f.total}, costBase=${f.costoBase}`,
    );
  }
}

/**
 * Calculates remaining unpaid balance of an open invoice.
 */
export function saldo(f: FacturaAbierta): Pesos {
  validarFactura(f);
  return restarPesos(f.total, f.pagado);
}
