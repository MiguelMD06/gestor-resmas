import { describe, expect, it } from 'vitest';

import { fechaHora, pesos, ReglaNegocioError, type MedioPago } from '../../shared/domain';

import type { Movimiento } from './movimiento';
import { aporteCapital, cobro, compraLote, retiroGanancia, traspaso } from './operaciones';
import { calcularSaldos, verificarInvariante } from './saldos';

function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('simulacion de la invariante (D4)', () => {
  it('runs 200 random operations preserving invariants and non-negative balances', () => {
    const rng = mulberry32(123456789);
    const dummyFecha = fechaHora('2026-11-08 15:00:00');

    const randomInt = (min: number, max: number): number => {
      return Math.floor(rng() * (max - min + 1)) + min;
    };

    const randomMedio = (): MedioPago => {
      return rng() < 0.5 ? 'EFECTIVO' : 'TRANSFERENCIA';
    };

    const movimientos: Movimiento[] = [];
    let saldosActuales = calcularSaldos(movimientos);

    const conteos = {
      APORTE: 0,
      COMPRA: 0,
      COBRO: 0,
      RETIRO: 0,
      TRASPASO: 0,
    };

    let fakeIdLote = 1;
    let fakeIdAbono = 1;

    for (let i = 0; i < 200; i++) {
      const opChoice = rng();
      const medio = randomMedio();

      try {
        if (opChoice < 0.25) {
          // Aporte
          const monto = pesos(randomInt(10, 100) * 1000);
          const mov = aporteCapital(dummyFecha, medio, monto);
          movimientos.push(mov);
          conteos.APORTE++;
        } else if (opChoice < 0.5) {
          // Cobro
          const cap = pesos(randomInt(5, 50) * 1000);
          const gan = pesos(randomInt(5, 30) * 1000);
          const mov = cobro(dummyFecha, medio, cap, gan, fakeIdAbono++);
          movimientos.push(mov);
          conteos.COBRO++;
        } else if (opChoice < 0.7) {
          // Compra lote
          const costo = pesos(randomInt(10, 60) * 1000);
          const { movimiento } = compraLote(saldosActuales, dummyFecha, medio, costo, fakeIdLote++);
          movimientos.push(movimiento);
          conteos.COMPRA++;
        } else if (opChoice < 0.85) {
          // Retiro ganancia
          const monto = pesos(randomInt(5, 25) * 1000);
          const mov = retiroGanancia(saldosActuales, dummyFecha, medio, monto);
          movimientos.push(mov);
          conteos.RETIRO++;
        } else {
          // Traspaso
          const destino: MedioPago = medio === 'EFECTIVO' ? 'TRANSFERENCIA' : 'EFECTIVO';
          const monto = pesos(randomInt(5, 30) * 1000);
          const [salida, entrada] = traspaso(saldosActuales, dummyFecha, medio, destino, monto);
          movimientos.push(salida, entrada);
          conteos.TRASPASO++;
        }

        saldosActuales = calcularSaldos(movimientos);
        verificarInvariante(saldosActuales);

        expect(saldosActuales.efectivo).toBeGreaterThanOrEqual(0);
        expect(saldosActuales.transferencia).toBeGreaterThanOrEqual(0);
        expect(saldosActuales.capitalEnCaja).toBeGreaterThanOrEqual(0);
        expect(saldosActuales.gananciaLibre).toBeGreaterThanOrEqual(0);
      } catch (err) {
        if (err instanceof ReglaNegocioError) {
          // Valid rejected business attempt, ignored
          continue;
        }
        throw err;
      }
    }

    // Verify reasonable distribution (at least one of each type)
    expect(conteos.APORTE).toBeGreaterThanOrEqual(1);
    expect(conteos.COBRO).toBeGreaterThanOrEqual(1);
    expect(conteos.COMPRA).toBeGreaterThanOrEqual(1);
    expect(conteos.RETIRO).toBeGreaterThanOrEqual(1);
    expect(conteos.TRASPASO).toBeGreaterThanOrEqual(1);
  });
});
