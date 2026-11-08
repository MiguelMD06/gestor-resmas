import { describe, expect, it } from 'vitest';

import { fechaHora, pesos } from '../../shared/domain';

import type { Movimiento } from './movimiento';
import { calcularSaldos, verificarInvariante } from './saldos';

describe('saldos domain service', () => {
  const dummyFecha = fechaHora('2026-11-08 10:00:00');

  it('calculates zero balances for empty movement list', () => {
    const saldos = calcularSaldos([]);
    expect(saldos).toEqual({
      efectivo: 0,
      transferencia: 0,
      capitalEnCaja: 0,
      gananciaLibre: 0,
    });
  });

  it('S8: correctly calculates separate pocket balances, capitalEnCaja and gananciaLibre', () => {
    const movimientos: Movimiento[] = [
      {
        fecha: dummyFecha,
        tipo: 'APORTE_CAPITAL',
        medio: 'EFECTIVO',
        deltaBolsillo: pesos(100000),
        deltaCapital: pesos(100000),
        deltaGanancia: pesos(0),
        idLote: null,
        idAbono: null,
        idMovimientoOrigen: null,
        nota: null,
      },
      {
        fecha: dummyFecha,
        tipo: 'APORTE_CAPITAL',
        medio: 'TRANSFERENCIA',
        deltaBolsillo: pesos(50000),
        deltaCapital: pesos(50000),
        deltaGanancia: pesos(0),
        idLote: null,
        idAbono: null,
        idMovimientoOrigen: null,
        nota: null,
      },
      {
        fecha: dummyFecha,
        tipo: 'COBRO',
        medio: 'TRANSFERENCIA',
        deltaBolsillo: pesos(30000),
        deltaCapital: pesos(10000),
        deltaGanancia: pesos(20000),
        idLote: null,
        idAbono: 1,
        idMovimientoOrigen: null,
        nota: null,
      },
      {
        fecha: dummyFecha,
        tipo: 'RETIRO_GANANCIA',
        medio: 'EFECTIVO',
        deltaBolsillo: pesos(-15000),
        deltaCapital: pesos(0),
        deltaGanancia: pesos(-15000),
        idLote: null,
        idAbono: null,
        idMovimientoOrigen: null,
        nota: null,
      },
    ];

    const saldos = calcularSaldos(movimientos);
    expect(saldos.efectivo).toBe(85000);
    expect(saldos.transferencia).toBe(80000);
    expect(saldos.capitalEnCaja).toBe(160000);
    expect(saldos.gananciaLibre).toBe(5000);
  });

  it('S10: passes invariant check when efectivo + transferencia = capitalEnCaja + gananciaLibre', () => {
    const saldosValidos = {
      efectivo: pesos(85000),
      transferencia: pesos(80000),
      capitalEnCaja: pesos(160000),
      gananciaLibre: pesos(5000),
    };

    expect(() => verificarInvariante(saldosValidos)).not.toThrow();
  });

  it('S10: throws an Error when invariant is broken', () => {
    const saldosDescuadrados = {
      efectivo: pesos(50000),
      transferencia: pesos(50000),
      capitalEnCaja: pesos(60000),
      gananciaLibre: pesos(30000), // sum is 90000 != 100000
    };

    expect(() => verificarInvariante(saldosDescuadrados)).toThrowError();
  });
});
