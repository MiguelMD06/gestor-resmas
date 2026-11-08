import { describe, expect, it } from 'vitest';

import { fechaHora, pesos, ReglaNegocioError } from '../../shared/domain';

import { abonarFactura, distribuirCascada, liquidarTodo } from './abonos';
import type { FacturaAbierta } from './factura';

describe('abonos domain operations (S4, S5, S6)', () => {
  describe('distribuirCascada (S4)', () => {
    it('E3: applies cascade payment chronologically, paying older invoice in full and subsequent partially', () => {
      // Invoice A: older, total 10.000, cost 8.000, paid 0 (saldo 10.000)
      const facturaA: FacturaAbierta = {
        idVenta: 101,
        fecha: fechaHora('2026-11-01 10:00:00'),
        total: pesos(10000),
        costoBase: pesos(8000),
        pagado: pesos(0),
      };

      // Invoice B: newer, total 30.000, cost 24.000, paid 0 (saldo 30.000)
      const facturaB: FacturaAbierta = {
        idVenta: 102,
        fecha: fechaHora('2026-11-05 10:00:00'),
        total: pesos(30000),
        costoBase: pesos(24000),
        pagado: pesos(0),
      };

      // General payment of $25.000 across both invoices (total debt $40.000)
      const aplicaciones = distribuirCascada([facturaB, facturaA], pesos(25000));

      expect(aplicaciones).toHaveLength(2);

      // Invoice A receives 10.000 and is marked fully paid
      expect(aplicaciones[0]).toEqual({
        idVenta: 101,
        monto: 10000,
        capital: 8000,
        ganancia: 2000,
        quedaPagada: true,
      });

      // Invoice B receives remaining 15.000 and remains partial
      expect(aplicaciones[1]).toEqual({
        idVenta: 102,
        monto: 15000,
        capital: 15000,
        ganancia: 0,
        quedaPagada: false,
      });

      // In every AplicacionAbono, capital + ganancia === monto
      for (const app of aplicaciones) {
        expect(app.capital + app.ganancia).toBe(app.monto);
      }
    });

    it('E4: rejects general payment exceeding total customer debt with MONTO_SUPERA_DEUDA', () => {
      const facturas: FacturaAbierta[] = [
        {
          idVenta: 1,
          fecha: fechaHora('2026-11-01 10:00:00'),
          total: pesos(10000),
          costoBase: pesos(8000),
          pagado: pesos(0),
        },
        {
          idVenta: 2,
          fecha: fechaHora('2026-11-02 10:00:00'),
          total: pesos(30000),
          costoBase: pesos(24000),
          pagado: pesos(0),
        },
      ]; // total debt = 40.000

      expect(() => distribuirCascada(facturas, pesos(50000))).toThrowError(ReglaNegocioError);
      try {
        distribuirCascada(facturas, pesos(50000));
      } catch (e) {
        expect((e as ReglaNegocioError).codigo).toBe('MONTO_SUPERA_DEUDA');
      }
    });

    it('breaks ties using ascending idVenta when two invoices have the exact same date', () => {
      const f10: FacturaAbierta = {
        idVenta: 10,
        fecha: fechaHora('2026-11-05 10:00:00'),
        total: pesos(20000),
        costoBase: pesos(16000),
        pagado: pesos(0),
      };
      const f5: FacturaAbierta = {
        idVenta: 5,
        fecha: fechaHora('2026-11-05 10:00:00'),
        total: pesos(20000),
        costoBase: pesos(16000),
        pagado: pesos(0),
      };

      const aplicaciones = distribuirCascada([f10, f5], pesos(25000));

      expect(aplicaciones).toHaveLength(2);
      expect(aplicaciones[0].idVenta).toBe(5);
      expect(aplicaciones[0].monto).toBe(20000);
      expect(aplicaciones[0].quedaPagada).toBe(true);

      expect(aplicaciones[1].idVenta).toBe(10);
      expect(aplicaciones[1].monto).toBe(5000);
      expect(aplicaciones[1].quedaPagada).toBe(false);
    });

    it('only includes invoices that receive money', () => {
      const f1: FacturaAbierta = {
        idVenta: 1,
        fecha: fechaHora('2026-11-01 10:00:00'),
        total: pesos(10000),
        costoBase: pesos(8000),
        pagado: pesos(0),
      };
      const f2: FacturaAbierta = {
        idVenta: 2,
        fecha: fechaHora('2026-11-02 10:00:00'),
        total: pesos(20000),
        costoBase: pesos(16000),
        pagado: pesos(0),
      };
      const f3: FacturaAbierta = {
        idVenta: 3,
        fecha: fechaHora('2026-11-03 10:00:00'),
        total: pesos(30000),
        costoBase: pesos(24000),
        pagado: pesos(0),
      };

      const aplicaciones = distribuirCascada([f1, f2, f3], pesos(10000));

      expect(aplicaciones).toHaveLength(1);
      expect(aplicaciones[0].idVenta).toBe(1);
    });

    it('does not mutate input array or input invoice objects', () => {
      const f1: FacturaAbierta = {
        idVenta: 1,
        fecha: fechaHora('2026-11-01 10:00:00'),
        total: pesos(10000),
        costoBase: pesos(8000),
        pagado: pesos(0),
      };
      const f2: FacturaAbierta = {
        idVenta: 2,
        fecha: fechaHora('2026-11-02 10:00:00'),
        total: pesos(20000),
        costoBase: pesos(16000),
        pagado: pesos(0),
      };

      const list = [f2, f1];
      Object.freeze(list);
      Object.freeze(f1);
      Object.freeze(f2);

      expect(() => distribuirCascada(list, pesos(15000))).not.toThrow();
      expect(list[0].idVenta).toBe(2);
      expect(list[1].idVenta).toBe(1);
      expect(f1.pagado).toBe(0);
      expect(f2.pagado).toBe(0);
    });

    it('rejects zero or negative amounts with MONTO_INVALIDO', () => {
      const facturas: FacturaAbierta[] = [
        {
          idVenta: 1,
          fecha: fechaHora('2026-11-01 10:00:00'),
          total: pesos(10000),
          costoBase: pesos(8000),
          pagado: pesos(0),
        },
      ];

      expect(() => distribuirCascada(facturas, pesos(0))).toThrowError(ReglaNegocioError);
      try {
        distribuirCascada(facturas, pesos(0));
      } catch (e) {
        expect((e as ReglaNegocioError).codigo).toBe('MONTO_INVALIDO');
      }

      expect(() => distribuirCascada(facturas, pesos(-1000))).toThrowError(ReglaNegocioError);
      try {
        distribuirCascada(facturas, pesos(-1000));
      } catch (e) {
        expect((e as ReglaNegocioError).codigo).toBe('MONTO_INVALIDO');
      }
    });

    it('rejects with SIN_DEUDA when there is no outstanding debt', () => {
      const facturasPagadas: FacturaAbierta[] = [
        {
          idVenta: 1,
          fecha: fechaHora('2026-11-01 10:00:00'),
          total: pesos(10000),
          costoBase: pesos(8000),
          pagado: pesos(10000),
        },
      ];

      expect(() => distribuirCascada(facturasPagadas, pesos(5000))).toThrowError(ReglaNegocioError);
      try {
        distribuirCascada(facturasPagadas, pesos(5000));
      } catch (e) {
        expect((e as ReglaNegocioError).codigo).toBe('SIN_DEUDA');
      }

      expect(() => distribuirCascada([], pesos(5000))).toThrowError(ReglaNegocioError);
      try {
        distribuirCascada([], pesos(5000));
      } catch (e) {
        expect((e as ReglaNegocioError).codigo).toBe('SIN_DEUDA');
      }
    });
  });

  describe('abonarFactura (S5)', () => {
    it('applies payment to an isolated invoice without touching others and returns single application', () => {
      const targetInvoice: FacturaAbierta = {
        idVenta: 201,
        fecha: fechaHora('2026-11-02 10:00:00'),
        total: pesos(45000),
        costoBase: pesos(36000),
        pagado: pesos(10000), // saldo: 35.000
      };
      Object.freeze(targetInvoice);

      const app = abonarFactura(targetInvoice, pesos(20000));

      expect(app).toEqual({
        idVenta: 201,
        monto: 20000,
        capital: 20000,
        ganancia: 0,
        quedaPagada: false,
      });
      expect(app.capital + app.ganancia).toBe(app.monto);
      expect(targetInvoice.pagado).toBe(10000); // input is not mutated
    });

    it('marks quedaPagada as true when payment matches invoice remaining balance', () => {
      const invoice: FacturaAbierta = {
        idVenta: 202,
        fecha: fechaHora('2026-11-03 10:00:00'),
        total: pesos(45000),
        costoBase: pesos(36000),
        pagado: pesos(20000), // saldo: 25.000
      };

      const app = abonarFactura(invoice, pesos(25000));

      expect(app.quedaPagada).toBe(true);
      expect(app.monto).toBe(25000);
      expect(app.capital).toBe(16000);
      expect(app.ganancia).toBe(9000);
      expect(app.capital + app.ganancia).toBe(app.monto);
    });

    it('rejects zero or negative amounts with MONTO_INVALIDO', () => {
      const invoice: FacturaAbierta = {
        idVenta: 203,
        fecha: fechaHora('2026-11-03 10:00:00'),
        total: pesos(30000),
        costoBase: pesos(20000),
        pagado: pesos(0),
      };

      expect(() => abonarFactura(invoice, pesos(0))).toThrowError(ReglaNegocioError);
      try {
        abonarFactura(invoice, pesos(0));
      } catch (e) {
        expect((e as ReglaNegocioError).codigo).toBe('MONTO_INVALIDO');
      }

      expect(() => abonarFactura(invoice, pesos(-500))).toThrowError(ReglaNegocioError);
      try {
        abonarFactura(invoice, pesos(-500));
      } catch (e) {
        expect((e as ReglaNegocioError).codigo).toBe('MONTO_INVALIDO');
      }
    });

    it('rejects with SIN_DEUDA when invoice has zero balance', () => {
      const invoice: FacturaAbierta = {
        idVenta: 204,
        fecha: fechaHora('2026-11-03 10:00:00'),
        total: pesos(30000),
        costoBase: pesos(20000),
        pagado: pesos(30000), // saldo: 0
      };

      expect(() => abonarFactura(invoice, pesos(5000))).toThrowError(ReglaNegocioError);
      try {
        abonarFactura(invoice, pesos(5000));
      } catch (e) {
        expect((e as ReglaNegocioError).codigo).toBe('SIN_DEUDA');
      }
    });

    it('rejects when payment exceeds invoice balance with MONTO_SUPERA_SALDO_FACTURA', () => {
      const invoice: FacturaAbierta = {
        idVenta: 205,
        fecha: fechaHora('2026-11-03 10:00:00'),
        total: pesos(30000),
        costoBase: pesos(20000),
        pagado: pesos(10000), // saldo: 20.000
      };

      expect(() => abonarFactura(invoice, pesos(25000))).toThrowError(ReglaNegocioError);
      try {
        abonarFactura(invoice, pesos(25000));
      } catch (e) {
        expect((e as ReglaNegocioError).codigo).toBe('MONTO_SUPERA_SALDO_FACTURA');
      }
    });
  });

  describe('liquidarTodo (S6)', () => {
    it('settles 100% of debt across 3 invoices, each receiving exact balance, all marked paid, sum equals total debt', () => {
      const f1: FacturaAbierta = {
        idVenta: 1,
        fecha: fechaHora('2026-11-01 10:00:00'),
        total: pesos(15000),
        costoBase: pesos(12000),
        pagado: pesos(5000), // saldo: 10.000
      };
      const f2: FacturaAbierta = {
        idVenta: 2,
        fecha: fechaHora('2026-11-02 10:00:00'),
        total: pesos(45000),
        costoBase: pesos(36000),
        pagado: pesos(20000), // saldo: 25.000
      };
      const f3: FacturaAbierta = {
        idVenta: 3,
        fecha: fechaHora('2026-11-03 10:00:00'),
        total: pesos(60000),
        costoBase: pesos(48000),
        pagado: pesos(0), // saldo: 60.000
      };

      // Total debt: 10.000 + 25.000 + 60.000 = 95.000
      const aplicaciones = liquidarTodo([f3, f1, f2]);

      expect(aplicaciones).toHaveLength(3);
      expect(aplicaciones[0].idVenta).toBe(1);
      expect(aplicaciones[0].monto).toBe(10000);
      expect(aplicaciones[0].quedaPagada).toBe(true);

      expect(aplicaciones[1].idVenta).toBe(2);
      expect(aplicaciones[1].monto).toBe(25000);
      expect(aplicaciones[1].quedaPagada).toBe(true);

      expect(aplicaciones[2].idVenta).toBe(3);
      expect(aplicaciones[2].monto).toBe(60000);
      expect(aplicaciones[2].quedaPagada).toBe(true);

      const totalCapital = aplicaciones.reduce((sum: number, a) => sum + a.capital, 0);
      const totalGanancia = aplicaciones.reduce((sum: number, a) => sum + a.ganancia, 0);
      const totalMonto = aplicaciones.reduce((sum: number, a) => sum + a.monto, 0);

      expect(totalMonto).toBe(95000);
      expect(totalCapital + totalGanancia).toBe(95000);

      for (const app of aplicaciones) {
        expect(app.capital + app.ganancia).toBe(app.monto);
      }
    });

    it('rejects with SIN_DEUDA when there is no debt to settle', () => {
      expect(() => liquidarTodo([])).toThrowError(ReglaNegocioError);
      try {
        liquidarTodo([]);
      } catch (e) {
        expect((e as ReglaNegocioError).codigo).toBe('SIN_DEUDA');
      }

      const facturasPagadas: FacturaAbierta[] = [
        {
          idVenta: 1,
          fecha: fechaHora('2026-11-01 10:00:00'),
          total: pesos(10000),
          costoBase: pesos(8000),
          pagado: pesos(10000),
        },
      ];
      expect(() => liquidarTodo(facturasPagadas)).toThrowError(ReglaNegocioError);
      try {
        liquidarTodo(facturasPagadas);
      } catch (e) {
        expect((e as ReglaNegocioError).codigo).toBe('SIN_DEUDA');
      }
    });
  });
});
