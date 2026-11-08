import { pesos, ReglaNegocioError, type FechaHora, type MedioPago, type Pesos } from '../../shared/domain';

import type { Movimiento } from './movimiento';
import type { Saldos } from './saldos';

export interface ResultadoCompraLote {
  readonly movimiento: Movimiento;
  readonly reinversion: Pesos;
}

export function aporteCapital(fecha: FechaHora, medio: MedioPago, monto: Pesos): Movimiento {
  if (monto <= 0) {
    throw new ReglaNegocioError('MONTO_INVALIDO', 'El monto debe ser mayor a cero');
  }

  return {
    fecha,
    tipo: 'APORTE_CAPITAL',
    medio,
    deltaBolsillo: monto,
    deltaCapital: monto,
    deltaGanancia: pesos(0),
    idLote: null,
    idAbono: null,
    idMovimientoOrigen: null,
    nota: null,
  };
}

export function compraLote(
  saldos: Saldos,
  fecha: FechaHora,
  medio: MedioPago,
  costoTotal: Pesos,
  idLote: number,
): ResultadoCompraLote {
  if (costoTotal <= 0) {
    throw new ReglaNegocioError('MONTO_INVALIDO', 'El costo total debe ser mayor a cero');
  }

  const saldoBolsillo = medio === 'EFECTIVO' ? saldos.efectivo : saldos.transferencia;
  if (costoTotal > saldoBolsillo) {
    throw new ReglaNegocioError(
      'SALDO_INSUFICIENTE',
      `Saldo insuficiente en ${medio}: disponible ${saldoBolsillo}, requerido ${costoTotal}`,
    );
  }

  const capitalDisponible = Math.max(0, saldos.capitalEnCaja);
  const parteCapital = Math.min(capitalDisponible, costoTotal);
  const parteGanancia = costoTotal - parteCapital;

  const deltaCapital = parteCapital === 0 ? 0 : -parteCapital;
  const deltaGanancia = parteGanancia === 0 ? 0 : -parteGanancia;

  return {
    movimiento: {
      fecha,
      tipo: 'COMPRA_LOTE',
      medio,
      deltaBolsillo: pesos(-costoTotal),
      deltaCapital: pesos(deltaCapital),
      deltaGanancia: pesos(deltaGanancia),
      idLote,
      idAbono: null,
      idMovimientoOrigen: null,
      nota: null,
    },
    reinversion: pesos(parteGanancia),
  };
}

export function cobro(
  fecha: FechaHora,
  medio: MedioPago,
  capital: Pesos,
  ganancia: Pesos,
  idAbono: number,
): Movimiento {
  if (capital < 0 || ganancia < 0 || capital + ganancia <= 0) {
    throw new ReglaNegocioError('MONTO_INVALIDO', 'El cobro requiere capital >= 0, ganancia >= 0 y suma mayor a cero');
  }

  const total = capital + ganancia;

  return {
    fecha,
    tipo: 'COBRO',
    medio,
    deltaBolsillo: pesos(total),
    deltaCapital: capital,
    deltaGanancia: ganancia,
    idLote: null,
    idAbono,
    idMovimientoOrigen: null,
    nota: null,
  };
}

export function retiroGanancia(saldos: Saldos, fecha: FechaHora, medio: MedioPago, monto: Pesos): Movimiento {
  if (monto <= 0) {
    throw new ReglaNegocioError('MONTO_INVALIDO', 'El monto debe ser mayor a cero');
  }

  if (monto > saldos.gananciaLibre) {
    throw new ReglaNegocioError(
      'GANANCIA_INSUFICIENTE',
      `Ganancia libre insuficiente: disponible ${saldos.gananciaLibre}, solicitado ${monto}`,
    );
  }

  const saldoBolsillo = medio === 'EFECTIVO' ? saldos.efectivo : saldos.transferencia;
  if (monto > saldoBolsillo) {
    throw new ReglaNegocioError(
      'SALDO_INSUFICIENTE',
      `Saldo insuficiente en ${medio}: disponible ${saldoBolsillo}, solicitado ${monto}`,
    );
  }

  return {
    fecha,
    tipo: 'RETIRO_GANANCIA',
    medio,
    deltaBolsillo: pesos(-monto),
    deltaCapital: pesos(0),
    deltaGanancia: pesos(-monto),
    idLote: null,
    idAbono: null,
    idMovimientoOrigen: null,
    nota: null,
  };
}

export function traspaso(
  saldos: Saldos,
  fecha: FechaHora,
  origen: MedioPago,
  destino: MedioPago,
  monto: Pesos,
): [salida: Movimiento, entrada: Movimiento] {
  if (monto <= 0) {
    throw new ReglaNegocioError('MONTO_INVALIDO', 'El monto debe ser mayor a cero');
  }

  if (origen === destino) {
    throw new ReglaNegocioError('TRASPASO_MISMO_MEDIO', 'El medio de origen y destino deben ser diferentes');
  }

  const saldoOrigen = origen === 'EFECTIVO' ? saldos.efectivo : saldos.transferencia;
  if (monto > saldoOrigen) {
    throw new ReglaNegocioError(
      'SALDO_INSUFICIENTE',
      `Saldo insuficiente en origen ${origen}: disponible ${saldoOrigen}, requerido ${monto}`,
    );
  }

  const salida: Movimiento = {
    fecha,
    tipo: 'TRASPASO_SALIDA',
    medio: origen,
    deltaBolsillo: pesos(-monto),
    deltaCapital: pesos(0),
    deltaGanancia: pesos(0),
    idLote: null,
    idAbono: null,
    idMovimientoOrigen: null,
    nota: null,
  };

  const entrada: Movimiento = {
    fecha,
    tipo: 'TRASPASO_ENTRADA',
    medio: destino,
    deltaBolsillo: monto,
    deltaCapital: pesos(0),
    deltaGanancia: pesos(0),
    idLote: null,
    idAbono: null,
    idMovimientoOrigen: null,
    nota: null,
  };

  return [salida, entrada];
}
