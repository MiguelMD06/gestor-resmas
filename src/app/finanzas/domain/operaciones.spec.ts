import { describe, expect, it } from 'vitest';

import { fechaHora, pesos } from '../../shared/domain';

import { aporteCapital, cobro, compraLote, retiroGanancia, traspaso } from './operaciones';
import type { Saldos } from './saldos';

function expectReglaError(fn: () => unknown, expectedCodigo: string): void {
  expect(fn).toThrow(expect.objectContaining({ name: 'ReglaNegocioError', codigo: expectedCodigo }));
}

describe('operaciones domain functions', () => {
  const dummyFecha = fechaHora('2026-11-08 12:00:00');

  describe('E5, E6, E7 acceptance examples', () => {
    it('E5: retiroGanancia rejects cash withdrawal when pocket balance is insufficient with SALDO_INSUFICIENTE', () => {
      const saldos: Saldos = {
        efectivo: pesos(5000),
        transferencia: pesos(10000),
        capitalEnCaja: pesos(6000),
        gananciaLibre: pesos(9000),
      };

      expectReglaError(() => retiroGanancia(saldos, dummyFecha, 'EFECTIVO', pesos(8000)), 'SALDO_INSUFICIENTE');
    });

    it('E6: compraLote absorbs available capital and reinvests remaining profit with reinversion notice', () => {
      const saldos: Saldos = {
        efectivo: pesos(0),
        transferencia: pesos(130000),
        capitalEnCaja: pesos(100000),
        gananciaLibre: pesos(30000),
      };

      const resultado = compraLote(saldos, dummyFecha, 'TRANSFERENCIA', pesos(120000), 1);

      expect(resultado.movimiento.deltaCapital).toBe(-100000);
      expect(resultado.movimiento.deltaGanancia).toBe(-20000);
      expect(resultado.movimiento.deltaBolsillo).toBe(-120000);
      expect(resultado.movimiento.medio).toBe('TRANSFERENCIA');
      expect(resultado.movimiento.tipo).toBe('COMPRA_LOTE');
      expect(resultado.movimiento.idLote).toBe(1);
      expect(resultado.reinversion).toBe(20000);
    });

    it('E7: traspaso moves funds between pockets leaving capital and profit unchanged', () => {
      const saldos: Saldos = {
        efectivo: pesos(50000),
        transferencia: pesos(0),
        capitalEnCaja: pesos(30000),
        gananciaLibre: pesos(20000),
      };

      const [salida, entrada] = traspaso(saldos, dummyFecha, 'EFECTIVO', 'TRANSFERENCIA', pesos(50000));

      expect(salida.tipo).toBe('TRASPASO_SALIDA');
      expect(salida.medio).toBe('EFECTIVO');
      expect(salida.deltaBolsillo).toBe(-50000);
      expect(salida.deltaCapital).toBe(0);
      expect(salida.deltaGanancia).toBe(0);

      expect(entrada.tipo).toBe('TRASPASO_ENTRADA');
      expect(entrada.medio).toBe('TRANSFERENCIA');
      expect(entrada.deltaBolsillo).toBe(50000);
      expect(entrada.deltaCapital).toBe(0);
      expect(entrada.deltaGanancia).toBe(0);
      expect(entrada.idMovimientoOrigen).toBeNull();
    });
  });

  describe('aporteCapital', () => {
    it('creates APORTE_CAPITAL movement with matching pocket and capital deltas and zero profit delta', () => {
      const mov = aporteCapital(dummyFecha, 'EFECTIVO', pesos(150000));
      expect(mov).toEqual({
        fecha: dummyFecha,
        tipo: 'APORTE_CAPITAL',
        medio: 'EFECTIVO',
        deltaBolsillo: 150000,
        deltaCapital: 150000,
        deltaGanancia: 0,
        idLote: null,
        idAbono: null,
        idMovimientoOrigen: null,
        nota: null,
      });
    });

    it('rejects monto <= 0 with MONTO_INVALIDO', () => {
      expectReglaError(() => aporteCapital(dummyFecha, 'EFECTIVO', pesos(0)), 'MONTO_INVALIDO');
      expectReglaError(() => aporteCapital(dummyFecha, 'EFECTIVO', pesos(-100)), 'MONTO_INVALIDO');
    });
  });

  describe('compraLote', () => {
    it('covers purchase 100% with capital when capitalEnCaja is sufficient, setting reinversion = 0', () => {
      const saldos: Saldos = {
        efectivo: pesos(80000),
        transferencia: pesos(0),
        capitalEnCaja: pesos(80000),
        gananciaLibre: pesos(0),
      };

      const { movimiento, reinversion } = compraLote(saldos, dummyFecha, 'EFECTIVO', pesos(50000), 2);

      expect(reinversion).toBe(0);
      expect(movimiento.deltaCapital).toBe(-50000);
      expect(movimiento.deltaGanancia).toBe(0);
      expect(movimiento.deltaBolsillo).toBe(-50000);
      expect(movimiento.idLote).toBe(2);
    });

    it('rejects costoTotal <= 0 with MONTO_INVALIDO', () => {
      const saldos: Saldos = {
        efectivo: pesos(10000),
        transferencia: pesos(0),
        capitalEnCaja: pesos(10000),
        gananciaLibre: pesos(0),
      };

      expectReglaError(() => compraLote(saldos, dummyFecha, 'EFECTIVO', pesos(0), 1), 'MONTO_INVALIDO');
    });

    it('rejects purchase when pocket balance is insufficient with SALDO_INSUFICIENTE', () => {
      const saldos: Saldos = {
        efectivo: pesos(40000),
        transferencia: pesos(100000),
        capitalEnCaja: pesos(140000),
        gananciaLibre: pesos(0),
      };

      expectReglaError(() => compraLote(saldos, dummyFecha, 'EFECTIVO', pesos(50000), 1), 'SALDO_INSUFICIENTE');
    });
  });

  describe('cobro', () => {
    it('creates COBRO movement with sum of capital and ganancia in pocket delta', () => {
      const mov = cobro(dummyFecha, 'TRANSFERENCIA', pesos(20000), pesos(15000), 10);

      expect(mov).toEqual({
        fecha: dummyFecha,
        tipo: 'COBRO',
        medio: 'TRANSFERENCIA',
        deltaBolsillo: 35000,
        deltaCapital: 20000,
        deltaGanancia: 15000,
        idLote: null,
        idAbono: 10,
        idMovimientoOrigen: null,
        nota: null,
      });
    });

    it('accepts cobro with ganancia = 0 as long as capital > 0', () => {
      const mov = cobro(dummyFecha, 'EFECTIVO', pesos(25000), pesos(0), 11);
      expect(mov.deltaBolsillo).toBe(25000);
      expect(mov.deltaCapital).toBe(25000);
      expect(mov.deltaGanancia).toBe(0);
    });

    it('accepts cobro with capital = 0 as long as ganancia > 0', () => {
      const mov = cobro(dummyFecha, 'EFECTIVO', pesos(0), pesos(12000), 12);
      expect(mov.deltaBolsillo).toBe(12000);
      expect(mov.deltaCapital).toBe(0);
      expect(mov.deltaGanancia).toBe(12000);
    });

    it('rejects negative capital or ganancia or sum <= 0 with MONTO_INVALIDO', () => {
      expectReglaError(() => cobro(dummyFecha, 'EFECTIVO', pesos(-100), pesos(500), 1), 'MONTO_INVALIDO');

      expectReglaError(() => cobro(dummyFecha, 'EFECTIVO', pesos(500), pesos(-100), 1), 'MONTO_INVALIDO');

      expectReglaError(() => cobro(dummyFecha, 'EFECTIVO', pesos(0), pesos(0), 1), 'MONTO_INVALIDO');
    });
  });

  describe('retiroGanancia', () => {
    it('creates RETIRO_GANANCIA movement when both gananciaLibre and pocket have enough', () => {
      const saldos: Saldos = {
        efectivo: pesos(50000),
        transferencia: pesos(0),
        capitalEnCaja: pesos(20000),
        gananciaLibre: pesos(30000),
      };

      const mov = retiroGanancia(saldos, dummyFecha, 'EFECTIVO', pesos(15000));
      expect(mov).toEqual({
        fecha: dummyFecha,
        tipo: 'RETIRO_GANANCIA',
        medio: 'EFECTIVO',
        deltaBolsillo: -15000,
        deltaCapital: 0,
        deltaGanancia: -15000,
        idLote: null,
        idAbono: null,
        idMovimientoOrigen: null,
        nota: null,
      });
    });

    it('rejects monto <= 0 with MONTO_INVALIDO', () => {
      const saldos: Saldos = {
        efectivo: pesos(50000),
        transferencia: pesos(0),
        capitalEnCaja: pesos(20000),
        gananciaLibre: pesos(30000),
      };

      expectReglaError(() => retiroGanancia(saldos, dummyFecha, 'EFECTIVO', pesos(0)), 'MONTO_INVALIDO');
    });

    it('S7: rejects with GANANCIA_INSUFICIENTE when monto > gananciaLibre', () => {
      const saldos: Saldos = {
        efectivo: pesos(50000),
        transferencia: pesos(0),
        capitalEnCaja: pesos(40000),
        gananciaLibre: pesos(10000),
      };

      expectReglaError(() => retiroGanancia(saldos, dummyFecha, 'EFECTIVO', pesos(20000)), 'GANANCIA_INSUFICIENTE');
    });

    it('S7: prioritizes GANANCIA_INSUFICIENTE when both gananciaLibre and pocket balance are insufficient', () => {
      const saldos: Saldos = {
        efectivo: pesos(5000),
        transferencia: pesos(0),
        capitalEnCaja: pesos(0),
        gananciaLibre: pesos(5000),
      };

      // Monto 10000 exceeds both gananciaLibre (5000) and pocket (5000)
      expectReglaError(() => retiroGanancia(saldos, dummyFecha, 'EFECTIVO', pesos(10000)), 'GANANCIA_INSUFICIENTE');
    });
  });

  describe('traspaso', () => {
    it('rejects monto <= 0 with MONTO_INVALIDO', () => {
      const saldos: Saldos = {
        efectivo: pesos(50000),
        transferencia: pesos(0),
        capitalEnCaja: pesos(50000),
        gananciaLibre: pesos(0),
      };

      expectReglaError(() => traspaso(saldos, dummyFecha, 'EFECTIVO', 'TRANSFERENCIA', pesos(0)), 'MONTO_INVALIDO');
    });

    it('rejects same source and target medium with TRASPASO_MISMO_MEDIO', () => {
      const saldos: Saldos = {
        efectivo: pesos(50000),
        transferencia: pesos(0),
        capitalEnCaja: pesos(50000),
        gananciaLibre: pesos(0),
      };

      expectReglaError(
        () => traspaso(saldos, dummyFecha, 'EFECTIVO', 'EFECTIVO', pesos(10000)),
        'TRASPASO_MISMO_MEDIO',
      );
    });

    it('S9: rejects when source pocket has insufficient balance with SALDO_INSUFICIENTE', () => {
      const saldos: Saldos = {
        efectivo: pesos(15000),
        transferencia: pesos(50000),
        capitalEnCaja: pesos(65000),
        gananciaLibre: pesos(0),
      };

      expectReglaError(
        () => traspaso(saldos, dummyFecha, 'EFECTIVO', 'TRANSFERENCIA', pesos(20000)),
        'SALDO_INSUFICIENTE',
      );
    });
  });
});
