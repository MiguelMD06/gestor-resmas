import { describe, expect, it } from 'vitest';

import { SqlJsDatabase } from '../testing/sqljs-sql-database.adapter';

import { abonarFactura, deudaTotal, distribuirCascada, liquidarTodo, repartirPago, saldo } from './cartera/domain';
import type { FacturaAbierta } from './cartera/domain';
import {
  aporteCapital,
  calcularSaldos,
  cobro,
  compraLote,
  LibroRepository,
  retiroGanancia,
  traspaso,
  verificarInvariante,
} from './finanzas';
import type { Movimiento, Saldos } from './finanzas';
import { fechaHora, pesos, ReglaNegocioError, resmas } from './shared/domain';
import type { CodigoRegla } from './shared/domain';
import { MIGRACIONES } from './shared/infrastructure/sqlite/migrations';
import { migrar } from './shared/infrastructure/sqlite/migrations/migration-runner';
import { evaluarLinea, perdida } from './ventas/domain';

function expectCodigoRegla(fn: () => unknown, codigoEsperado: CodigoRegla): void {
  try {
    fn();
    expect.unreachable(`Expected ReglaNegocioError with code ${codigoEsperado}`);
  } catch (err) {
    expect(err).toBeInstanceOf(ReglaNegocioError);
    expect((err as ReglaNegocioError).codigo).toBe(codigoEsperado);
  }
}

describe('V1 — Independent verification of Stage 1 (Accounting Engine)', () => {
  const fechaBase = fechaHora('2026-11-08 10:00:00');

  describe('Acceptance examples E1–E8 via public API', () => {
    it('E1: Box of $120,000 -> unit cost $12,000; sale to Ana of 3 reams at $15,000 (total $45,000, cost $36,000); payment of $20,000 -> capital $20,000, profit $0', () => {
      const linea = evaluarLinea(resmas(3), pesos(12000), pesos(15000));
      expect(linea.subtotalVenta).toBe(45000);
      expect(linea.subtotalCosto).toBe(36000);
      expect(linea.bajoCosto).toBe(false);

      const facturaAna: FacturaAbierta = {
        idVenta: 1,
        fecha: fechaBase,
        total: linea.subtotalVenta,
        costoBase: linea.subtotalCosto,
        pagado: pesos(0),
      };

      const reparto = repartirPago(facturaAna, pesos(20000));
      expect(reparto).toEqual({
        capital: 20000,
        ganancia: 0,
      });

      const aplicacion = abonarFactura(facturaAna, pesos(20000));
      expect(aplicacion).toEqual({
        idVenta: 1,
        monto: 20000,
        capital: 20000,
        ganancia: 0,
        quedaPagada: false,
      });
    });

    it('E2: Same invoice after $20,000 paid, next payment of $25,000 -> capital $16,000, profit $9,000, invoice marked paid', () => {
      const facturaAnaTrasE1: FacturaAbierta = {
        idVenta: 1,
        fecha: fechaBase,
        total: pesos(45000),
        costoBase: pesos(36000),
        pagado: pesos(20000),
      };

      const reparto = repartirPago(facturaAnaTrasE1, pesos(25000));
      expect(reparto).toEqual({
        capital: 16000,
        ganancia: 9000,
      });

      const aplicacion = abonarFactura(facturaAnaTrasE1, pesos(25000));
      expect(aplicacion).toEqual({
        idVenta: 1,
        monto: 25000,
        capital: 16000,
        ganancia: 9000,
        quedaPagada: true,
      });
    });

    it('E3: Ana owes invoice A (older, balance $10,000) and B (balance $30,000); general payment of $25,000 -> A gets $10,000 (paid) and B gets $15,000 (partial)', () => {
      const facturaA: FacturaAbierta = {
        idVenta: 10,
        fecha: fechaHora('2026-11-01 09:00:00'),
        total: pesos(10000),
        costoBase: pesos(8000),
        pagado: pesos(0),
      };
      const facturaB: FacturaAbierta = {
        idVenta: 11,
        fecha: fechaHora('2026-11-05 09:00:00'),
        total: pesos(30000),
        costoBase: pesos(24000),
        pagado: pesos(0),
      };

      const aplicaciones = distribuirCascada([facturaA, facturaB], pesos(25000));
      expect(aplicaciones).toHaveLength(2);
      expect(aplicaciones[0]).toEqual({
        idVenta: 10,
        monto: 10000,
        capital: 8000,
        ganancia: 2000,
        quedaPagada: true,
      });
      expect(aplicaciones[1]).toEqual({
        idVenta: 11,
        monto: 15000,
        capital: 15000,
        ganancia: 0,
        quedaPagada: false,
      });
    });

    it('E4: General payment of $50,000 with total debt of $40,000 -> rejected with MONTO_SUPERA_DEUDA', () => {
      const facturas: FacturaAbierta[] = [
        {
          idVenta: 10,
          fecha: fechaHora('2026-11-01 09:00:00'),
          total: pesos(10000),
          costoBase: pesos(8000),
          pagado: pesos(0),
        },
        {
          idVenta: 11,
          fecha: fechaHora('2026-11-05 09:00:00'),
          total: pesos(30000),
          costoBase: pesos(24000),
          pagado: pesos(0),
        },
      ];

      expect(deudaTotal(facturas)).toBe(40000);
      expectCodigoRegla(() => distribuirCascada(facturas, pesos(50000)), 'MONTO_SUPERA_DEUDA');
    });

    it('E5: Free profit $9,000, cash $5,000; withdrawal of $8,000 in cash -> rejected with SALDO_INSUFICIENTE', () => {
      const saldosActuales: Saldos = {
        efectivo: pesos(5000),
        transferencia: pesos(40000),
        capitalEnCaja: pesos(36000),
        gananciaLibre: pesos(9000),
      };
      verificarInvariante(saldosActuales);

      expectCodigoRegla(() => retiroGanancia(saldosActuales, fechaBase, 'EFECTIVO', pesos(8000)), 'SALDO_INSUFICIENTE');
    });

    it('E6: Cash capital $100,000, free profit $30,000, transfer $130,000; purchase of $120,000 by transfer -> capital -$100,000, profit -$20,000, reinvestment $20,000', () => {
      const saldosActuales: Saldos = {
        efectivo: pesos(0),
        transferencia: pesos(130000),
        capitalEnCaja: pesos(100000),
        gananciaLibre: pesos(30000),
      };
      verificarInvariante(saldosActuales);

      const { movimiento, reinversion } = compraLote(saldosActuales, fechaBase, 'TRANSFERENCIA', pesos(120000), 1);
      expect(movimiento.deltaBolsillo).toBe(-120000);
      expect(movimiento.deltaCapital).toBe(-100000);
      expect(movimiento.deltaGanancia).toBe(-20000);
      expect(reinversion).toBe(20000);
    });

    it('E7: Transfer of $50,000 from cash to transfer -> cash -$50,000, transfer +$50,000; capital and profit unchanged', () => {
      const movInicial = aporteCapital(fechaBase, 'EFECTIVO', pesos(50000));
      const saldosAntes = calcularSaldos([movInicial]);

      const [salida, entrada] = traspaso(saldosAntes, fechaBase, 'EFECTIVO', 'TRANSFERENCIA', pesos(50000));
      expect(salida.medio).toBe('EFECTIVO');
      expect(salida.deltaBolsillo).toBe(-50000);
      expect(salida.deltaCapital).toBe(0);
      expect(salida.deltaGanancia).toBe(0);

      expect(entrada.medio).toBe('TRANSFERENCIA');
      expect(entrada.deltaBolsillo).toBe(50000);
      expect(entrada.deltaCapital).toBe(0);
      expect(entrada.deltaGanancia).toBe(0);

      const saldosDespues = calcularSaldos([movInicial, salida, entrada]);
      expect(saldosDespues.efectivo - saldosAntes.efectivo).toBe(-50000);
      expect(saldosDespues.transferencia - saldosAntes.transferencia).toBe(50000);
      expect(saldosDespues.capitalEnCaja).toBe(saldosAntes.capitalEnCaja);
      expect(saldosDespues.gananciaLibre).toBe(saldosAntes.gananciaLibre);
      verificarInvariante(saldosDespues);
    });

    it('E8: Sale of 2 reams at $10,000 when unit cost is $12,000 -> bajoCosto: true, loss $4,000', () => {
      const evaluacion = evaluarLinea(resmas(2), pesos(12000), pesos(10000));
      expect(evaluacion.bajoCosto).toBe(true);
      expect(evaluacion.subtotalVenta).toBe(20000);
      expect(evaluacion.subtotalCosto).toBe(24000);
      expect(evaluacion.margen).toBe(-4000);
      expect(perdida(evaluacion.subtotalVenta, evaluacion.subtotalCosto)).toBe(4000);
    });
  });

  describe('Adversarial tests', () => {
    it('1. S10 invariant holds across an independent multi-stage accounting sequence (distinct from D4 simulation)', () => {
      const movimientos: Movimiento[] = [];
      const aplicar = (...nuevos: Movimiento[]) => {
        movimientos.push(...nuevos);
        const s = calcularSaldos(movimientos);
        verificarInvariante(s);
        expect(s.efectivo).toBeGreaterThanOrEqual(0);
        expect(s.transferencia).toBeGreaterThanOrEqual(0);
        expect(s.capitalEnCaja).toBeGreaterThanOrEqual(0);
        expect(s.gananciaLibre).toBeGreaterThanOrEqual(0);
        return s;
      };

      // Step 1: Capital contributions in both pockets
      let saldos = aplicar(
        aporteCapital(fechaBase, 'EFECTIVO', pesos(90000)),
        aporteCapital(fechaBase, 'TRANSFERENCIA', pesos(30000)),
      );
      expect(saldos).toEqual({
        efectivo: 90000,
        transferencia: 30000,
        capitalEnCaja: 120000,
        gananciaLibre: 0,
      });

      // Step 2: Internal transfer to consolidate $120,000 in EFECTIVO and buy a box of 10 reams
      saldos = aplicar(...traspaso(saldos, fechaBase, 'TRANSFERENCIA', 'EFECTIVO', pesos(30000)));
      const compra1 = compraLote(saldos, fechaBase, 'EFECTIVO', pesos(120000), 1);
      expect(compra1.reinversion).toBe(0);
      saldos = aplicar(compra1.movimiento);
      expect(saldos).toEqual({
        efectivo: 0,
        transferencia: 0,
        capitalEnCaja: 0,
        gananciaLibre: 0,
      });

      // Step 3: Collect payments from E1 ($20,000 cash) and E2 ($25,000 transfer), plus another sale ($96,000 cost, $120,000 total)
      const factura1: FacturaAbierta = {
        idVenta: 1,
        fecha: fechaBase,
        total: pesos(45000),
        costoBase: pesos(36000),
        pagado: pesos(0),
      };
      const ab1 = abonarFactura(factura1, pesos(20000));
      aplicar(cobro(fechaBase, 'EFECTIVO', ab1.capital, ab1.ganancia, 1));

      const ab2 = abonarFactura({ ...factura1, pagado: pesos(20000) }, pesos(25000));
      aplicar(cobro(fechaBase, 'TRANSFERENCIA', ab2.capital, ab2.ganancia, 2));

      const factura2: FacturaAbierta = {
        idVenta: 2,
        fecha: fechaBase,
        total: pesos(120000),
        costoBase: pesos(84000),
        pagado: pesos(0),
      };
      const ab3 = abonarFactura(factura2, pesos(120000));
      saldos = aplicar(cobro(fechaBase, 'TRANSFERENCIA', ab3.capital, ab3.ganancia, 3));

      // Now capitalEnCaja = 36,000 + 84,000 = 120,000; gananciaLibre = 9,000 + 36,000 = 45,000
      expect(saldos).toEqual({
        efectivo: 20000,
        transferencia: 145000,
        capitalEnCaja: 120000,
        gananciaLibre: 45000,
      });

      // Step 4: Purchase a more expensive lot ($140,000 by transfer) consuming all $120,000 capital + $20,000 profit reinvestment
      const compra2 = compraLote(saldos, fechaBase, 'TRANSFERENCIA', pesos(140000), 2);
      expect(compra2.reinversion).toBe(20000);
      saldos = aplicar(compra2.movimiento);
      expect(saldos).toEqual({
        efectivo: 20000,
        transferencia: 5000,
        capitalEnCaja: 0,
        gananciaLibre: 25000,
      });

      // Step 5: Withdraw $20,000 profit from cash and $5,000 from transfer, leaving everything at 0
      saldos = aplicar(retiroGanancia(saldos, fechaBase, 'EFECTIVO', pesos(20000)));
      saldos = aplicar(retiroGanancia(saldos, fechaBase, 'TRANSFERENCIA', pesos(5000)));
      expect(saldos).toEqual({
        efectivo: 0,
        transferencia: 0,
        capitalEnCaja: 0,
        gananciaLibre: 0,
      });
    });

    it('2. distribuirCascada sorts unordered invoices with date ties and skips an already paid invoice in the middle', () => {
      const facturasDesordenadas: FacturaAbierta[] = [
        {
          idVenta: 40,
          fecha: fechaHora('2026-11-04 12:00:00'),
          total: pesos(25000),
          costoBase: pesos(20000),
          pagado: pesos(0), // saldo 25,000 (4th in order)
        },
        {
          idVenta: 25,
          fecha: fechaHora('2026-11-02 08:00:00'),
          total: pesos(18000),
          costoBase: pesos(14000),
          pagado: pesos(0), // saldo 18,000 (3rd in order, tie on 2026-11-02 with idVenta 12)
        },
        {
          idVenta: 99,
          fecha: fechaHora('2026-10-15 08:00:00'),
          total: pesos(50000),
          costoBase: pesos(40000),
          pagado: pesos(50000), // ALREADY PAID (saldo 0) right in the middle, even with oldest date
        },
        {
          idVenta: 12,
          fecha: fechaHora('2026-11-02 08:00:00'),
          total: pesos(15000),
          costoBase: pesos(12000),
          pagado: pesos(5000), // saldo 10,000 (2nd in order, tie on 2026-11-02 with idVenta 25)
        },
        {
          idVenta: 30,
          fecha: fechaHora('2026-11-01 15:00:00'),
          total: pesos(12000),
          costoBase: pesos(10000),
          pagado: pesos(0), // saldo 12,000 (1st in order)
        },
      ];

      // Total debt = 12,000 + 10,000 + 18,000 + 25,000 = 65,000
      expect(deudaTotal(facturasDesordenadas)).toBe(65000);

      // Pay 30,000: covers idVenta 30 (12,000), idVenta 12 (10,000), and 8,000 of idVenta 25; idVenta 99 and 40 untouched
      const aplicaciones = distribuirCascada(facturasDesordenadas, pesos(30000));

      expect(aplicaciones).toEqual([
        {
          idVenta: 30,
          monto: 12000,
          capital: 10000,
          ganancia: 2000,
          quedaPagada: true,
        },
        {
          idVenta: 12,
          monto: 10000,
          capital: 7000,
          ganancia: 3000,
          quedaPagada: true,
        },
        {
          idVenta: 25,
          monto: 8000,
          capital: 8000,
          ganancia: 0,
          quedaPagada: false,
        },
      ]);
    });

    it('3. liquidarTodo followed by distribuirCascada on the resulting invoices throws SIN_DEUDA', () => {
      const facturasIniciales: FacturaAbierta[] = [
        {
          idVenta: 1,
          fecha: fechaHora('2026-11-01 10:00:00'),
          total: pesos(30000),
          costoBase: pesos(24000),
          pagado: pesos(10000),
        },
        {
          idVenta: 2,
          fecha: fechaHora('2026-11-03 10:00:00'),
          total: pesos(45000),
          costoBase: pesos(36000),
          pagado: pesos(0),
        },
      ];

      const liquidacion = liquidarTodo(facturasIniciales);
      expect(liquidacion).toHaveLength(2);
      expect(liquidacion.every((a) => a.quedaPagada)).toBe(true);

      const pagosPorVenta = new Map(liquidacion.map((a) => [a.idVenta, a.monto]));
      const facturasResultantes: FacturaAbierta[] = facturasIniciales.map((f) => ({
        ...f,
        pagado: pesos(f.pagado + (pagosPorVenta.get(f.idVenta) ?? 0)),
      }));

      expect(facturasResultantes.every((f) => saldo(f) === 0)).toBe(true);
      expect(deudaTotal(facturasResultantes)).toBe(0);

      expectCodigoRegla(() => distribuirCascada(facturasResultantes, pesos(1000)), 'SIN_DEUDA');
      expectCodigoRegla(() => liquidarTodo(facturasResultantes), 'SIN_DEUDA');
    });

    it('4. LibroRepository with SqlJsDatabase and real migration rolls back failed transfer and matches calcularSaldos', async () => {
      const db = await SqlJsDatabase.create();
      await migrar(db, MIGRACIONES);
      const repo = new LibroRepository();

      // Seed FK rows for lote and abono
      const loteInsert = await db.run(
        `INSERT INTO lotes_cajas (
          tipo_papel, fecha_compra, cantidad_cajas, costo_por_caja, costo_unitario_resma,
          resmas_iniciales, resmas_disponibles, medio_pago_compra, estado
        ) VALUES ('CARTA', '2026-11-08 08:00:00', 2, 120000, 12000, 20, 20, 'EFECTIVO', 'ACTIVO');`,
      );
      const idLote = loteInsert.lastInsertId!;

      await db.run(
        `INSERT INTO ventas (
          id_cliente, fecha_venta, total_venta, costo_total_base, monto_pagado, saldo_pendiente, estado_pago
        ) VALUES (1, '2026-11-08 09:00:00', 45000, 36000, 45000, 0, 'PAGADA');`,
      );
      const abonoInsert = await db.run(
        `INSERT INTO abonos (
          id_cliente, fecha_abono, monto_total_abonado, medio_pago, tipo_abono
        ) VALUES (1, '2026-11-08 09:00:00', 45000, 'TRANSFERENCIA', 'PAGO_CONTADO');`,
      );
      const idAbono = abonoInsert.lastInsertId!;

      // Part A: A transfer that fails inside the transaction (invalid entrada violating SQLite CHECK) leaves 0 rows
      const movInicial = aporteCapital(fechaBase, 'EFECTIVO', pesos(100000));
      const [salidaValida, entradaValida] = traspaso(
        calcularSaldos([movInicial]),
        fechaBase,
        'EFECTIVO',
        'TRANSFERENCIA',
        pesos(40000),
      );
      const entradaInvalida: Movimiento = {
        ...entradaValida,
        deltaCapital: pesos(1000), // violates SQLite CHECK for TRASPASO_ENTRADA (delta_capital = 0)
      };

      await expect(
        db.transaction(async (tx) => {
          await repo.registrarTraspaso(tx, [salidaValida, entradaInvalida]);
        }),
      ).rejects.toThrow();

      const conteoTrasFallo = await db.query<{ total: number }>('SELECT COUNT(*) AS total FROM movimientos_dinero;');
      expect(conteoTrasFallo[0]?.total).toBe(0);

      // Part B: Valid sequence persisted in DB matches calcularSaldos(movimientos)
      const m1 = aporteCapital(fechaBase, 'EFECTIVO', pesos(250000));
      let s = calcularSaldos([m1]);
      const { movimiento: m2 } = compraLote(s, fechaBase, 'EFECTIVO', pesos(240000), idLote);
      const m3 = cobro(fechaBase, 'TRANSFERENCIA', pesos(36000), pesos(9000), idAbono);
      s = calcularSaldos([m1, m2, m3]);
      const [m4Salida, m5Entrada] = traspaso(s, fechaBase, 'TRANSFERENCIA', 'EFECTIVO', pesos(15000));
      s = calcularSaldos([m1, m2, m3, m4Salida, m5Entrada]);
      const m6 = retiroGanancia(s, fechaBase, 'EFECTIVO', pesos(5000));

      const secuencia = [m1, m2, m3, m4Salida, m5Entrada, m6];
      const saldosDominio = calcularSaldos(secuencia);
      verificarInvariante(saldosDominio);

      await db.transaction(async (tx) => {
        await repo.registrar(tx, m1);
        await repo.registrar(tx, m2);
        await repo.registrar(tx, m3);
        await repo.registrarTraspaso(tx, [m4Salida, m5Entrada]);
        await repo.registrar(tx, m6);
      });

      const saldosSql = await repo.saldos(db);
      expect(saldosSql).toEqual(saldosDominio);
      expect(saldosSql).toEqual({
        efectivo: 20000,
        transferencia: 30000,
        capitalEnCaja: 46000,
        gananciaLibre: 4000,
      });
    });
  });
});
