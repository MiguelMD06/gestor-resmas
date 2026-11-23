import type { TipoAbono } from '../../cartera/infrastructure/abono.repository';
import type { AbonoExpediente, EstadoPago, FacturaExpediente } from '../../cartera/infrastructure/cartera.repository';

/**
 * Returns the Spanish display label for a payment type in the customer dossier.
 */
export function etiquetaTipoAbono(tipo: TipoAbono): string {
  switch (tipo) {
    case 'ABONO_INICIAL':
      return 'Abono inicial';
    case 'CASCADA_GLOBAL':
      return 'A la deuda';
    case 'FACTURA_INDIVIDUAL':
      return 'A una factura';
    case 'LIQUIDACION_TOTAL':
      return 'Pagar todo';
    case 'PAGO_CONTADO':
      return 'De contado';
  }
}

/**
 * Returns the Spanish display label for an invoice payment status.
 */
export function etiquetaEstadoFactura(estado: EstadoPago): string {
  switch (estado) {
    case 'PENDIENTE':
      return 'Pendiente';
    case 'PARCIAL':
      return 'Abonada parcialmente';
    case 'PAGADA':
      return 'Pagada';
  }
}

/**
 * Computes which (idAbono, idVenta) applications completed the invoice total.
 * Returns keys formatted as `${idAbono}:${idVenta}`.
 */
export function calcularAplicacionesQuePagaron(
  facturas: readonly FacturaExpediente[],
  abonos: readonly AbonoExpediente[],
): ReadonlySet<string> {
  const totalPorVenta = new Map<number, number>();
  for (const f of facturas) {
    totalPorVenta.set(f.idVenta, f.total);
  }

  const cronologicos = [...abonos].sort((a, b) => {
    if (a.fecha < b.fecha) return -1;
    if (a.fecha > b.fecha) return 1;
    return a.idAbono - b.idAbono;
  });

  const acumuladoPorVenta = new Map<number, number>();
  const pagadas = new Set<string>();

  for (const abono of cronologicos) {
    for (const app of abono.aplicaciones) {
      const antes = acumuladoPorVenta.get(app.idVenta) ?? 0;
      const despues = antes + app.monto;
      acumuladoPorVenta.set(app.idVenta, despues);
      const total = totalPorVenta.get(app.idVenta);
      if (total !== undefined && antes < total && despues >= total) {
        pagadas.add(`${abono.idAbono}:${app.idVenta}`);
      }
    }
  }

  return pagadas;
}
