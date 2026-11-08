import { pesos, type MedioPago, type Pesos } from '../../shared/domain';

import type { Movimiento } from './movimiento';

export interface Saldos {
  readonly efectivo: Pesos;
  readonly transferencia: Pesos;
  readonly capitalEnCaja: Pesos;
  readonly gananciaLibre: Pesos;
}

export function saldoDeBolsillo(saldos: Saldos, medio: MedioPago): Pesos {
  switch (medio) {
    case 'EFECTIVO':
      return saldos.efectivo;
    case 'TRANSFERENCIA':
      return saldos.transferencia;
    default: {
      const exhaustiveCheck: never = medio;
      throw new Error(`Unsupported payment method: ${String(exhaustiveCheck)}`);
    }
  }
}

export function calcularSaldos(movimientos: readonly Movimiento[]): Saldos {
  let efectivo = 0;
  let transferencia = 0;
  let capitalEnCaja = 0;
  let gananciaLibre = 0;

  for (const m of movimientos) {
    switch (m.medio) {
      case 'EFECTIVO':
        efectivo += m.deltaBolsillo;
        break;
      case 'TRANSFERENCIA':
        transferencia += m.deltaBolsillo;
        break;
      default: {
        const exhaustiveCheck: never = m.medio;
        throw new Error(`Unsupported payment method: ${String(exhaustiveCheck)}`);
      }
    }
    capitalEnCaja += m.deltaCapital;
    gananciaLibre += m.deltaGanancia;
  }

  return {
    efectivo: pesos(efectivo),
    transferencia: pesos(transferencia),
    capitalEnCaja: pesos(capitalEnCaja),
    gananciaLibre: pesos(gananciaLibre),
  };
}

export function verificarInvariante(saldos: Saldos): void {
  const totalBolsillos = saldos.efectivo + saldos.transferencia;
  const totalPatrimonio = saldos.capitalEnCaja + saldos.gananciaLibre;

  if (totalBolsillos !== totalPatrimonio) {
    throw new Error(
      `Broken invariant: efectivo + transferencia (${totalBolsillos}) != capitalEnCaja + gananciaLibre (${totalPatrimonio})`,
    );
  }
}
