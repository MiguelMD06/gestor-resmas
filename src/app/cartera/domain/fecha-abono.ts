import type { FechaHora } from '../../shared/domain';
import { ReglaNegocioError } from '../../shared/domain';

import type { FacturaAbierta } from './factura';

/**
 * Validates that a payment date is not in the future (R-13)
 * and not earlier than any invoice receiving money (D14).
 */
export function validarFechaAbono(
  fecha: FechaHora,
  ahora: FechaHora,
  facturasQueReciben: readonly FacturaAbierta[],
): void {
  if (fecha > ahora) {
    throw new ReglaNegocioError('FECHA_FUTURA', `Payment date ${fecha} cannot be after current time ${ahora}`);
  }

  for (const factura of facturasQueReciben) {
    if (fecha < factura.fecha) {
      throw new ReglaNegocioError(
        'ABONO_ANTERIOR_A_FACTURA',
        `Payment date ${fecha} cannot be before invoice ${factura.idVenta} date ${factura.fecha}`,
      );
    }
  }
}
