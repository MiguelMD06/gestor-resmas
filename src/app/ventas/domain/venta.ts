import { repartirPago } from '../../cartera/domain';
import {
  pesos,
  pesosPositivos,
  ReglaNegocioError,
  resmasPositivas,
  restarPesos,
  sumarPesos,
  type FechaHora,
  type MedioPago,
  type Pesos,
  type Resmas,
} from '../../shared/domain';

import { evaluarLinea, type EvaluacionLinea } from './margen';

export type EstadoPagoVenta = 'PAGADA' | 'PARCIAL' | 'PENDIENTE';
export type TipoAbonoVenta = 'PAGO_CONTADO' | 'ABONO_INICIAL';

export interface LineaEntradaVenta {
  readonly idLote: number;
  readonly fechaCompra: FechaHora;
  readonly costoUnitario: Pesos;
  readonly disponibles: Resmas;
  readonly cantidad: number;
  readonly precioUnitario: number;
}

export type PagoVenta =
  | { readonly modalidad: 'CONTADO'; readonly medio: MedioPago }
  | { readonly modalidad: 'FIADO' }
  | { readonly modalidad: 'ABONO_INICIAL'; readonly monto: number; readonly medio: MedioPago };

export interface ArmarVentaInput {
  readonly idCliente: number;
  readonly esMostrador: boolean;
  readonly fecha: FechaHora;
  readonly ahora: FechaHora;
  readonly lineas: readonly LineaEntradaVenta[];
  readonly pago: PagoVenta;
}

export interface LineaVenta extends EvaluacionLinea {
  readonly idLote: number;
  readonly costoUnitario: Pesos;
  readonly cantidad: Resmas;
  readonly precioUnitario: Pesos;
}

export interface CobroVenta {
  readonly tipoAbono: TipoAbonoVenta;
  readonly monto: Pesos;
  readonly medio: MedioPago;
  readonly capital: Pesos;
  readonly ganancia: Pesos;
}

export interface VentaArmada {
  readonly totalVenta: Pesos;
  readonly costoTotalBase: Pesos;
  readonly montoPagado: Pesos;
  readonly saldoPendiente: Pesos;
  readonly estadoPago: EstadoPagoVenta;
  readonly lineas: readonly LineaVenta[];
  readonly cobro: CobroVenta | null;
}

/**
 * Returns the latest purchase date among the given lines, or null when there are no lines.
 */
export function ultimaFechaCompra(lineas: readonly { readonly fechaCompra: FechaHora }[]): FechaHora | null {
  let ultima: FechaHora | null = null;
  for (const linea of lineas) {
    if (ultima === null || linea.fechaCompra > ultima) {
      ultima = linea.fechaCompra;
    }
  }
  return ultima;
}

/**
 * Builds and validates a sale from its lines, date and payment terms (D2, D5, D6, D14).
 */
export function armarVenta(input: ArmarVentaInput): VentaArmada {
  const { esMostrador, fecha, ahora, lineas, pago } = input;

  if (lineas.length === 0) {
    throw new ReglaNegocioError('VENTA_SIN_LINEAS', 'Sale must contain at least one line');
  }

  const lotesVistos = new Set<number>();
  for (const linea of lineas) {
    if (lotesVistos.has(linea.idLote)) {
      throw new ReglaNegocioError('LOTE_REPETIDO', `Lot ${linea.idLote} appears more than once in the sale`);
    }
    lotesVistos.add(linea.idLote);
  }

  const lineasEvaluadas: LineaVenta[] = [];
  let totalVenta = pesos(0);
  let costoTotalBase = pesos(0);

  for (const linea of lineas) {
    if (!Number.isSafeInteger(linea.cantidad) || linea.cantidad <= 0) {
      throw new ReglaNegocioError(
        'CANTIDAD_RESMAS_INVALIDA',
        `Ream quantity must be a positive integer, got: ${linea.cantidad}`,
      );
    }

    if (!Number.isSafeInteger(linea.precioUnitario) || linea.precioUnitario <= 0) {
      throw new ReglaNegocioError(
        'PRECIO_INVALIDO',
        `Unit sale price must be a positive integer, got: ${linea.precioUnitario}`,
      );
    }

    if (linea.cantidad > linea.disponibles) {
      throw new ReglaNegocioError(
        'STOCK_INSUFICIENTE',
        `Requested ${linea.cantidad} reams from lot ${linea.idLote}, but only ${linea.disponibles} available`,
      );
    }

    const cantidad = resmasPositivas(linea.cantidad);
    const precioUnitario = pesosPositivos(linea.precioUnitario);
    const evaluacion = evaluarLinea(cantidad, linea.costoUnitario, precioUnitario);

    totalVenta = sumarPesos(totalVenta, evaluacion.subtotalVenta);
    costoTotalBase = sumarPesos(costoTotalBase, evaluacion.subtotalCosto);

    lineasEvaluadas.push({
      idLote: linea.idLote,
      costoUnitario: linea.costoUnitario,
      cantidad,
      precioUnitario,
      ...evaluacion,
    });
  }

  if (fecha > ahora) {
    throw new ReglaNegocioError('FECHA_FUTURA', `Sale date ${fecha} cannot be after current time ${ahora}`);
  }

  const ultimaCompra = ultimaFechaCompra(lineas);
  if (ultimaCompra !== null && fecha < ultimaCompra) {
    throw new ReglaNegocioError(
      'VENTA_ANTERIOR_A_COMPRA',
      `Sale date ${fecha} cannot be before latest lot purchase date ${ultimaCompra}`,
    );
  }

  if (esMostrador && pago.modalidad !== 'CONTADO') {
    throw new ReglaNegocioError('MOSTRADOR_SOLO_CONTADO', 'Counter customer sales must be paid in full (CONTADO)');
  }

  if (pago.modalidad === 'FIADO') {
    return {
      totalVenta,
      costoTotalBase,
      montoPagado: pesos(0),
      saldoPendiente: totalVenta,
      estadoPago: 'PENDIENTE',
      lineas: lineasEvaluadas,
      cobro: null,
    };
  }

  let montoPagado: Pesos;
  let estadoPago: EstadoPagoVenta;
  let tipoAbono: TipoAbonoVenta;

  if (pago.modalidad === 'CONTADO') {
    montoPagado = totalVenta;
    estadoPago = 'PAGADA';
    tipoAbono = 'PAGO_CONTADO';
  } else {
    if (!Number.isSafeInteger(pago.monto) || pago.monto < 1 || pago.monto > totalVenta - 1) {
      throw new ReglaNegocioError(
        'ABONO_INICIAL_INVALIDO',
        `Initial payment must be an integer between 1 and ${totalVenta - 1}, got: ${pago.monto}`,
      );
    }
    montoPagado = pesos(pago.monto);
    estadoPago = 'PARCIAL';
    tipoAbono = 'ABONO_INICIAL';
  }

  const saldoPendiente = restarPesos(totalVenta, montoPagado);
  const { capital, ganancia } = repartirPago(
    {
      idVenta: 0,
      fecha,
      total: totalVenta,
      costoBase: costoTotalBase,
      pagado: pesos(0),
    },
    montoPagado,
  );

  return {
    totalVenta,
    costoTotalBase,
    montoPagado,
    saldoPendiente,
    estadoPago,
    lineas: lineasEvaluadas,
    cobro: {
      tipoAbono,
      monto: montoPagado,
      medio: pago.medio,
      capital,
      ganancia,
    },
  };
}
