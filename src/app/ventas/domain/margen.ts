import type { Pesos, Resmas } from '../../shared/domain';
import { pesos, restarPesos } from '../../shared/domain';

export interface EvaluacionLinea {
  readonly subtotalVenta: Pesos;
  readonly subtotalCosto: Pesos;
  readonly margen: Pesos;
  readonly bajoCosto: boolean;
}

/**
 * Evaluates sale line pricing against acquisition cost (S12).
 *
 * margen = subtotalVenta - subtotalCosto
 * bajoCosto = precioUnitario < costoUnitario
 */
export function evaluarLinea(cantidad: Resmas, costoUnitario: Pesos, precioUnitario: Pesos): EvaluacionLinea {
  const subtotalVenta = pesos(cantidad * precioUnitario);
  const subtotalCosto = pesos(cantidad * costoUnitario);
  const margen = restarPesos(subtotalVenta, subtotalCosto);
  const bajoCosto = precioUnitario < costoUnitario;

  return {
    subtotalVenta,
    subtotalCosto,
    margen,
    bajoCosto,
  };
}

/**
 * Calculates absolute financial loss if total sale price is below acquisition cost base (S12).
 *
 * Returns max(0, costoBase - totalVenta).
 */
export function perdida(totalVenta: Pesos, costoBase: Pesos): Pesos {
  return pesos(Math.max(0, costoBase - totalVenta));
}
