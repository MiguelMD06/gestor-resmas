import { pesos, ReglaNegocioError, type FechaHora, type MedioPago, type Pesos } from '../../shared/domain';

import type { Movimiento } from './movimiento';
import { type Saldos, saldoDeBolsillo } from './saldos';

export interface ResultadoCompraLote {
  readonly movimiento: Movimiento;
  readonly reinversion: Pesos;
}

export function aporteCapital(fecha: FechaHora, medio: MedioPago, monto: Pesos): Movimiento {
  if (monto <= 0) {
    throw new ReglaNegocioError('MONTO_INVALIDO', `Contribution amount must be greater than zero, got: ${monto}`);
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
    throw new ReglaNegocioError('MONTO_INVALIDO', `Total cost must be greater than zero, got: ${costoTotal}`);
  }

  const saldoBolsillo = saldoDeBolsillo(saldos, medio);
  if (costoTotal > saldoBolsillo) {
    throw new ReglaNegocioError(
      'SALDO_INSUFICIENTE',
      `Insufficient balance in ${medio}: available ${saldoBolsillo}, required ${costoTotal}`,
    );
  }

  // Guards against a negative capital balance so the purchase never "adds" capital.
  const capitalDisponible = Math.max(0, saldos.capitalEnCaja);
  const parteCapital = Math.min(capitalDisponible, costoTotal);
  const parteGanancia = costoTotal - parteCapital;

  // Avoids producing -0 so tests comparing with toBe / Object.is pass without discrepancy.
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
    throw new ReglaNegocioError(
      'MONTO_INVALIDO',
      `Collection requires capital >= 0, ganancia >= 0 and sum greater than zero, got: capital ${capital}, ganancia ${ganancia}`,
    );
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
    throw new ReglaNegocioError('MONTO_INVALIDO', `Withdrawal amount must be greater than zero, got: ${monto}`);
  }

  if (monto > saldos.gananciaLibre) {
    throw new ReglaNegocioError(
      'GANANCIA_INSUFICIENTE',
      `Insufficient free profit: available ${saldos.gananciaLibre}, requested ${monto}`,
    );
  }

  const saldoBolsillo = saldoDeBolsillo(saldos, medio);
  if (monto > saldoBolsillo) {
    throw new ReglaNegocioError(
      'SALDO_INSUFICIENTE',
      `Insufficient balance in ${medio}: available ${saldoBolsillo}, requested ${monto}`,
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
    throw new ReglaNegocioError('MONTO_INVALIDO', `Transfer amount must be greater than zero, got: ${monto}`);
  }

  if (origen === destino) {
    throw new ReglaNegocioError(
      'TRASPASO_MISMO_MEDIO',
      `Source and destination payment methods must be different, got: ${origen}`,
    );
  }

  const saldoOrigen = saldoDeBolsillo(saldos, origen);
  if (monto > saldoOrigen) {
    throw new ReglaNegocioError(
      'SALDO_INSUFICIENTE',
      `Insufficient balance in source ${origen}: available ${saldoOrigen}, required ${monto}`,
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
