import { beforeEach, describe, expect, it } from 'vitest';

import { SqlJsDatabase } from '../../../../../testing/sqljs-sql-database.adapter';

import { migracion001 } from './001-esquema-inicial';
import { migrar } from './migration-runner';

const NOW = '2026-11-08 10:00:00';

describe('001-esquema-inicial migration', () => {
  let db: SqlJsDatabase;

  beforeEach(async () => {
    db = await SqlJsDatabase.create();
    await migrar(db, [migracion001]);
    await db.run("INSERT INTO clientes (nombre, telefono, fecha_registro) VALUES ('Ana', '300', ?);", [NOW]);
  });

  async function scalar(sql: string, params?: readonly (string | number | null)[]): Promise<unknown> {
    const rows = await db.query<Record<string, unknown>>(sql, params);
    if (!rows.length) return null;
    const firstKey = Object.keys(rows[0])[0];
    return rows[0][firstKey];
  }

  it('sets user_version = 1, seeds exactly one Mostrador client, and rejects duplicate Mostrador', async () => {
    expect(await scalar('PRAGMA user_version;')).toBe(1);

    const mostradores = await db.query<{ id_cliente: number; nombre: string; es_mostrador: number }>(
      'SELECT id_cliente, nombre, es_mostrador FROM clientes WHERE es_mostrador = 1;',
    );
    expect(mostradores).toHaveLength(1);
    expect(mostradores[0].nombre).toBe('Mostrador');

    await expect(
      db.run("INSERT INTO clientes (nombre, es_mostrador, fecha_registro) VALUES ('Segundo Mostrador', 1, ?);", [NOW]),
    ).rejects.toThrow(/UNIQUE/);
  });

  it('creates the 7 tables with foreign keys enabled', async () => {
    expect(await scalar("SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")).toBe(
      7,
    );
    expect(await scalar('PRAGMA foreign_keys')).toBe(1);
  });

  it('accepts a valid lot and rejects invalid ones', async () => {
    const lote = (costo: number | string, disp: number, estado = 'ACTIVO') =>
      db.run(
        `INSERT INTO lotes_cajas (tipo_papel, fecha_compra, cantidad_cajas, costo_por_caja, costo_unitario_resma,
          resmas_iniciales, resmas_disponibles, medio_pago_compra, estado)
         VALUES ('CARTA', '${NOW}', 2, ${costo}, ${Number(costo) / 10}, 20, ${disp}, 'EFECTIVO', '${estado}')`,
      );

    await expect(lote(125000, 20)).resolves.toBeDefined();
    await expect(lote(125005, 20)).rejects.toThrow(/CHECK/); // box cost not divisible by 10
    await expect(lote(125000, 21)).rejects.toThrow(/CHECK/); // more available than initial
    await expect(lote(125000, 0)).rejects.toThrow(/CHECK/); // stock 0 must be AGOTADO
    await expect(lote(125000, 0, 'AGOTADO')).resolves.toBeDefined();
    await expect(lote('125000.5', 20)).rejects.toThrow(/CHECK/); // RNF-04: no fractional money
  });

  it('rejects an invoice whose balance or state is inconsistent', async () => {
    const venta = (pagado: number, saldo: number, estado: string) =>
      db.run(
        `INSERT INTO ventas (id_cliente, fecha_venta, total_venta, costo_total_base, monto_pagado, saldo_pendiente, estado_pago)
         VALUES (2, '${NOW}', 30000, 25000, ${pagado}, ${saldo}, '${estado}')`,
      );

    await expect(venta(10000, 20000, 'PARCIAL')).resolves.toBeDefined();
    await expect(venta(10000, 25000, 'PARCIAL')).rejects.toThrow(/CHECK/);
    await expect(venta(40000, -10000, 'PAGADA')).rejects.toThrow(/CHECK/); // overpayment
    await expect(venta(0, 30000, 'PARCIAL')).rejects.toThrow(/CHECK/);
    await expect(venta(30000, 0, 'PARCIAL')).rejects.toThrow(/CHECK/);
  });

  it('enforces the money ledger split rules per movement type', async () => {
    const mov = (tipo: string, bolsillo: number, capital: number, ganancia: number) =>
      db.run(
        `INSERT INTO movimientos_dinero (fecha_movimiento, tipo, medio, delta_bolsillo, delta_capital, delta_ganancia)
         VALUES ('${NOW}', '${tipo}', 'EFECTIVO', ${bolsillo}, ${capital}, ${ganancia})`,
      );

    await expect(mov('APORTE_CAPITAL', 500000, 500000, 0)).resolves.toBeDefined();
    await expect(mov('APORTE_CAPITAL', 500000, 0, 500000)).rejects.toThrow(/CHECK/);
    await expect(mov('RETIRO_GANANCIA', -1000, 0, -1000)).resolves.toBeDefined();
    await expect(mov('RETIRO_GANANCIA', -1000, -1000, 0)).rejects.toThrow(/CHECK/); // never withdraw capital
    await expect(mov('COBRO', 1000, 600, 400)).rejects.toThrow(/CHECK/); // COBRO needs id_abono
  });

  it('rolls back every statement of a failed transaction (RNF-03)', async () => {
    await expect(
      db.transaction(async (tx) => {
        await tx.run(
          `INSERT INTO movimientos_dinero (fecha_movimiento, tipo, medio, delta_bolsillo, delta_capital, delta_ganancia)
           VALUES ('${NOW}', 'APORTE_CAPITAL', 'EFECTIVO', 100, 100, 0)`,
        );
        await tx.run(
          `INSERT INTO ventas (id_cliente, fecha_venta, total_venta, costo_total_base, monto_pagado, saldo_pendiente, estado_pago)
           VALUES (99, '${NOW}', 1, 1, 0, 1, 'PENDIENTE')`,
        );
      }),
    ).rejects.toThrow(/FOREIGN KEY/);

    expect(await scalar('SELECT count(*) FROM movimientos_dinero')).toBe(0);
  });

  it('keeps the A1 invariant: pockets = capital in cash + free profit', async () => {
    await db.exec(`
      INSERT INTO movimientos_dinero (fecha_movimiento, tipo, medio, delta_bolsillo, delta_capital, delta_ganancia)
        VALUES ('${NOW}', 'APORTE_CAPITAL', 'EFECTIVO', 300000, 300000, 0);
      INSERT INTO lotes_cajas (tipo_papel, fecha_compra, cantidad_cajas, costo_por_caja, costo_unitario_resma,
        resmas_iniciales, resmas_disponibles, medio_pago_compra)
        VALUES ('OFICIO', '${NOW}', 1, 120000, 12000, 10, 10, 'EFECTIVO');
      INSERT INTO movimientos_dinero (fecha_movimiento, tipo, medio, delta_bolsillo, delta_capital, delta_ganancia, id_lote)
        VALUES ('${NOW}', 'COMPRA_LOTE', 'EFECTIVO', -120000, -120000, 0, 1);
      INSERT INTO movimientos_dinero (fecha_movimiento, tipo, medio, delta_bolsillo, delta_capital, delta_ganancia)
        VALUES ('${NOW}', 'TRASPASO_SALIDA', 'EFECTIVO', -50000, 0, 0);
      INSERT INTO movimientos_dinero (fecha_movimiento, tipo, medio, delta_bolsillo, delta_capital, delta_ganancia, id_movimiento_origen)
        VALUES ('${NOW}', 'TRASPASO_ENTRADA', 'TRANSFERENCIA', 50000, 0, 0, 3);
    `);

    const rows = await db.query<{ bolsillos: number; capital: number; ganancia: number }>(
      'SELECT sum(delta_bolsillo) as bolsillos, sum(delta_capital) as capital, sum(delta_ganancia) as ganancia FROM movimientos_dinero;',
    );
    const { bolsillos, capital, ganancia } = rows[0];
    expect(bolsillos).toBe(capital + ganancia);
    expect(await scalar("SELECT sum(delta_bolsillo) FROM movimientos_dinero WHERE medio = 'TRANSFERENCIA'")).toBe(
      50000,
    );
  });
});
