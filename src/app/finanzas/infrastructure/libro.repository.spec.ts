import { beforeEach, describe, expect, it } from 'vitest';

import { SqlJsDatabase } from '../../../testing/sqljs-sql-database.adapter';
import { fechaHora, pesos } from '../../shared/domain';
import { MIGRACIONES } from '../../shared/infrastructure/sqlite/migrations';
import { migrar } from '../../shared/infrastructure/sqlite/migrations/migration-runner';
import type { Movimiento } from '../domain/movimiento';
import { calcularSaldos } from '../domain/saldos';

import { LibroRepository } from './libro.repository';

describe('LibroRepository', () => {
  let db: SqlJsDatabase;
  let repo: LibroRepository;
  const dummyFecha = fechaHora('2026-11-08 12:00:00');

  beforeEach(async () => {
    db = await SqlJsDatabase.create();
    await migrar(db, MIGRACIONES);
    repo = new LibroRepository();
  });

  async function seedForeignKeys(): Promise<{ idLote: number; idAbono: number }> {
    // clientes(1) is created by migration001 ('Mostrador')
    const loteRes = await db.run(
      `INSERT INTO lotes_cajas (
        tipo_papel, fecha_compra, cantidad_cajas, costo_por_caja, costo_unitario_resma,
        resmas_iniciales, resmas_disponibles, medio_pago_compra, estado
      ) VALUES ('CARTA', '2026-11-08 10:00:00', 5, 100000, 10000, 50, 50, 'EFECTIVO', 'ACTIVO');`,
    );

    await db.run(
      `INSERT INTO ventas (
        id_cliente, fecha_venta, total_venta, costo_total_base, monto_pagado, saldo_pendiente, estado_pago
      ) VALUES (1, '2026-11-08 10:00:00', 60000, 50000, 60000, 0, 'PAGADA');`,
    );

    const abonoRes = await db.run(
      `INSERT INTO abonos (
        id_cliente, fecha_abono, monto_total_abonado, medio_pago, tipo_abono
      ) VALUES (1, '2026-11-08 10:00:00', 60000, 'TRANSFERENCIA', 'PAGO_CONTADO');`,
    );

    return {
      idLote: loteRes.lastInsertId!,
      idAbono: abonoRes.lastInsertId!,
    };
  }

  it('saldos returns all zeros on an empty movements table', async () => {
    const saldos = await repo.saldos(db);
    expect(saldos).toEqual({
      efectivo: 0,
      transferencia: 0,
      capitalEnCaja: 0,
      gananciaLibre: 0,
    });
  });

  it('records a sequence of operations and saldos(db) equals calcularSaldos', async () => {
    const { idLote, idAbono } = await seedForeignKeys();

    const aporte: Movimiento = {
      fecha: dummyFecha,
      tipo: 'APORTE_CAPITAL',
      medio: 'EFECTIVO',
      deltaBolsillo: pesos(200000),
      deltaCapital: pesos(200000),
      deltaGanancia: pesos(0),
      idLote: null,
      idAbono: null,
      idMovimientoOrigen: null,
      nota: 'Initial capital',
    };

    const compra: Movimiento = {
      fecha: dummyFecha,
      tipo: 'COMPRA_LOTE',
      medio: 'EFECTIVO',
      deltaBolsillo: pesos(-50000),
      deltaCapital: pesos(-50000),
      deltaGanancia: pesos(0),
      idLote,
      idAbono: null,
      idMovimientoOrigen: null,
      nota: 'Lot purchase',
    };

    const cobroMov: Movimiento = {
      fecha: dummyFecha,
      tipo: 'COBRO',
      medio: 'TRANSFERENCIA',
      deltaBolsillo: pesos(60000),
      deltaCapital: pesos(50000),
      deltaGanancia: pesos(10000),
      idLote: null,
      idAbono,
      idMovimientoOrigen: null,
      nota: 'Collection payment',
    };

    const retiro: Movimiento = {
      fecha: dummyFecha,
      tipo: 'RETIRO_GANANCIA',
      medio: 'TRANSFERENCIA',
      deltaBolsillo: pesos(-5000),
      deltaCapital: pesos(0),
      deltaGanancia: pesos(-5000),
      idLote: null,
      idAbono: null,
      idMovimientoOrigen: null,
      nota: 'Profit withdrawal',
    };

    const salidaTraspaso: Movimiento = {
      fecha: dummyFecha,
      tipo: 'TRASPASO_SALIDA',
      medio: 'EFECTIVO',
      deltaBolsillo: pesos(-30000),
      deltaCapital: pesos(0),
      deltaGanancia: pesos(0),
      idLote: null,
      idAbono: null,
      idMovimientoOrigen: null,
      nota: 'Transfer out',
    };

    const entradaTraspaso: Movimiento = {
      fecha: dummyFecha,
      tipo: 'TRASPASO_ENTRADA',
      medio: 'TRANSFERENCIA',
      deltaBolsillo: pesos(30000),
      deltaCapital: pesos(0),
      deltaGanancia: pesos(0),
      idLote: null,
      idAbono: null,
      idMovimientoOrigen: null,
      nota: 'Transfer in',
    };

    await db.transaction(async (tx) => {
      await repo.registrar(tx, aporte);
      await repo.registrar(tx, compra);
      await repo.registrar(tx, cobroMov);
      await repo.registrar(tx, retiro);
      await repo.registrarTraspaso(tx, [salidaTraspaso, entradaTraspaso]);
    });

    const movimientosSecuencia = [aporte, compra, cobroMov, retiro, salidaTraspaso, entradaTraspaso];

    const saldosEsperados = calcularSaldos(movimientosSecuencia);
    const saldosBd = await repo.saldos(db);

    expect(saldosBd).toEqual(saldosEsperados);
    expect(saldosBd.efectivo).toBe(120000);
    expect(saldosBd.transferencia).toBe(85000);
    expect(saldosBd.capitalEnCaja).toBe(200000);
    expect(saldosBd.gananciaLibre).toBe(5000);
  });

  it('sets id_movimiento_origen of TRASPASO_ENTRADA pointing to the TRASPASO_SALIDA id', async () => {
    const salida: Movimiento = {
      fecha: dummyFecha,
      tipo: 'TRASPASO_SALIDA',
      medio: 'EFECTIVO',
      deltaBolsillo: pesos(-20000),
      deltaCapital: pesos(0),
      deltaGanancia: pesos(0),
      idLote: null,
      idAbono: null,
      idMovimientoOrigen: null,
      nota: null,
    };

    const entrada: Movimiento = {
      fecha: dummyFecha,
      tipo: 'TRASPASO_ENTRADA',
      medio: 'TRANSFERENCIA',
      deltaBolsillo: pesos(20000),
      deltaCapital: pesos(0),
      deltaGanancia: pesos(0),
      idLote: null,
      idAbono: null,
      idMovimientoOrigen: null,
      nota: null,
    };

    const [idSalida, idEntrada] = await db.transaction(async (tx) => {
      return repo.registrarTraspaso(tx, [salida, entrada]);
    });

    expect(idSalida).toBeGreaterThan(0);
    expect(idEntrada).toBeGreaterThan(idSalida);

    const rows = await db.query<{ id_movimiento: number; id_movimiento_origen: number | null }>(
      `SELECT id_movimiento, id_movimiento_origen FROM movimientos_dinero WHERE id_movimiento = ?;`,
      [idEntrada],
    );

    expect(rows[0].id_movimiento_origen).toBe(idSalida);
  });

  it('leaves zero rows if transaction fails halfway through a transfer', async () => {
    const salida: Movimiento = {
      fecha: dummyFecha,
      tipo: 'TRASPASO_SALIDA',
      medio: 'EFECTIVO',
      deltaBolsillo: pesos(-10000),
      deltaCapital: pesos(0),
      deltaGanancia: pesos(0),
      idLote: null,
      idAbono: null,
      idMovimientoOrigen: null,
      nota: null,
    };

    await expect(
      db.transaction(async (tx) => {
        await repo.registrar(tx, salida);
        throw new Error('Simulated failure before inserting entrada');
      }),
    ).rejects.toThrow('Simulated failure before inserting entrada');

    const rows = await db.query<{ count: number }>('SELECT count(*) AS count FROM movimientos_dinero;');
    expect(rows[0].count).toBe(0);
  });
});
