import {
  cajas,
  cajasAResmas,
  pesos,
  ReglaNegocioError,
  resmas,
  RESMAS_POR_CAJA,
  type Cajas,
  type FechaHora,
  type MedioPago,
  type Pesos,
  type Resmas,
  type TipoPapel,
} from '../../shared/domain';

export type EstadoLote = 'ACTIVO' | 'AGOTADO';

export interface Lote {
  readonly idLote: number;
  readonly tipoPapel: TipoPapel;
  readonly fechaCompra: FechaHora;
  readonly cantidadCajas: Cajas;
  readonly costoPorCaja: Pesos;
  readonly costoUnitarioResma: Pesos;
  readonly resmasIniciales: Resmas;
  readonly resmasDisponibles: Resmas;
  readonly medioPagoCompra: MedioPago;
  readonly estado: EstadoLote;
}

export interface NuevoLote {
  readonly tipoPapel: TipoPapel;
  readonly cantidadCajas: Cajas;
  readonly costoPorCaja: Pesos;
  readonly costoUnitarioResma: Pesos;
  readonly resmasIniciales: Resmas;
  readonly costoTotal: Pesos;
}

export function nuevoLote(tipoPapel: TipoPapel, cantidadCajasInput: number, costoPorCajaInput: number): NuevoLote {
  if (!Number.isSafeInteger(cantidadCajasInput) || cantidadCajasInput <= 0) {
    throw new ReglaNegocioError(
      'CANTIDAD_INVALIDA',
      `Number of boxes must be a positive integer, got: ${cantidadCajasInput}`,
    );
  }

  if (!Number.isSafeInteger(costoPorCajaInput) || costoPorCajaInput <= 0 || costoPorCajaInput % RESMAS_POR_CAJA !== 0) {
    throw new ReglaNegocioError(
      'COSTO_CAJA_INVALIDO',
      `Box cost must be a positive integer divisible by ${RESMAS_POR_CAJA}, got: ${costoPorCajaInput}`,
    );
  }

  const cantidadCajas = cajas(cantidadCajasInput);
  const costoPorCaja = pesos(costoPorCajaInput);
  const costoUnitarioResma = pesos(costoPorCajaInput / RESMAS_POR_CAJA);
  const resmasIniciales = cajasAResmas(cantidadCajas);
  const costoTotal = pesos(cantidadCajasInput * costoPorCajaInput);

  return {
    tipoPapel,
    cantidadCajas,
    costoPorCaja,
    costoUnitarioResma,
    resmasIniciales,
    costoTotal,
  };
}

export function descontarResmas(
  lote: Pick<Lote, 'resmasDisponibles'>,
  cantidad: number,
): { resmasDisponibles: Resmas; estado: EstadoLote } {
  if (!Number.isSafeInteger(cantidad) || cantidad <= 0) {
    throw new ReglaNegocioError(
      'CANTIDAD_INVALIDA',
      `Quantity of reams to deduct must be a positive integer, got: ${cantidad}`,
    );
  }

  if (cantidad > lote.resmasDisponibles) {
    throw new ReglaNegocioError(
      'STOCK_INSUFICIENTE',
      `Cannot deduct ${cantidad} reams: only ${lote.resmasDisponibles} available in lot`,
    );
  }

  const resmasRestantes = resmas(lote.resmasDisponibles - cantidad);
  const estado: EstadoLote = resmasRestantes === 0 ? 'AGOTADO' : 'ACTIVO';

  return {
    resmasDisponibles: resmasRestantes,
    estado,
  };
}

export function progreso(lote: Pick<Lote, 'resmasDisponibles' | 'resmasIniciales'>): number {
  return lote.resmasDisponibles / lote.resmasIniciales;
}

export function agruparPorTipo(lotes: readonly Lote[]): {
  CARTA: Lote[];
  OFICIO: Lote[];
} {
  const activos = lotes.filter((l) => l.estado === 'ACTIVO');

  const ordenar = (a: Lote, b: Lote): number => {
    if (a.fechaCompra < b.fechaCompra) return -1;
    if (a.fechaCompra > b.fechaCompra) return 1;
    return a.idLote - b.idLote;
  };

  const carta = activos.filter((l) => l.tipoPapel === 'CARTA').sort(ordenar);
  const oficio = activos.filter((l) => l.tipoPapel === 'OFICIO').sort(ordenar);

  return {
    CARTA: carta,
    OFICIO: oficio,
  };
}
