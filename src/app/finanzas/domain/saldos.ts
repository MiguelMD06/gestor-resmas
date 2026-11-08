import { pesos, type Pesos } from '../../shared/domain';

import type { Movimiento } from './movimiento';

export interface Saldos {
  readonly efectivo: Pesos;
  readonly transferencia: Pesos;
  readonly capitalEnCaja: Pesos;
  readonly gananciaLibre: Pesos;
}

export function calcularSaldos(movimientos: readonly Movimiento[]): Saldos {
  let efectivo = 0;
  let transferencia = 0;
  let capitalEnCaja = 0;
  let gananciaLibre = 0;

  for (const m of movimientos) {
    if (m.medio === 'EFECTIVO') {
      efectivo += m.deltaBolsillo;
    } else if (m.medio === 'TRANSFERENCIA') {
      transferencia += m.deltaBolsillo;
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
      `Invariante rota: efectivo + transferencia (${totalBolsillos}) != capitalEnCaja + gananciaLibre (${totalPatrimonio})`,
    );
  }
}
