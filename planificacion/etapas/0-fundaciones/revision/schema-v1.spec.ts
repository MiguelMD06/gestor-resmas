import initSqlJs, { type Database } from 'sql.js';
import { SCHEMA_V1 } from './schema-v1';

const NOW = '2026-11-08 10:00:00';

async function openDb(): Promise<Database> {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA_V1);
  return db;
}

function scalar(db: Database, sql: string): unknown {
  return db.exec(sql)[0].values[0][0];
}

describe('schema v1 prototype (sql.js under ng test)', () => {
  let db: Database;

  beforeEach(async () => {
    db = await openDb();
    db.run(`INSERT INTO clientes (nombre, es_mostrador, fecha_registro) VALUES ('Mostrador', 1, '${NOW}')`);
    db.run(`INSERT INTO clientes (nombre, telefono, fecha_registro) VALUES ('Ana', '300', '${NOW}')`);
  });

  it('creates the 7 tables with foreign keys enabled', () => {
    expect(scalar(db, "SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")).toBe(7);
    expect(scalar(db, 'PRAGMA foreign_keys')).toBe(1);
  });

  it('accepts a valid lot and rejects invalid ones', () => {
    const lote = (costo: number | string, disp: number, estado = 'ACTIVO') =>
      db.run(
        `INSERT INTO lotes_cajas (tipo_papel, fecha_compra, cantidad_cajas, costo_por_caja, costo_unitario_resma,
          resmas_iniciales, resmas_disponibles, medio_pago_compra, estado)
         VALUES ('CARTA', '${NOW}', 2, ${costo}, ${Number(costo) / 10}, 20, ${disp}, 'EFECTIVO', '${estado}')`,
      );
    expect(() => lote(125000, 20)).not.toThrow();
    expect(() => lote(125005, 20)).toThrow(/CHECK/); // A: box cost not divisible by 10
    expect(() => lote(125000, 21)).toThrow(/CHECK/); // more available than initial
    expect(() => lote(125000, 0)).toThrow(/CHECK/); // stock 0 must be AGOTADO
    expect(() => lote(125000, 0, 'AGOTADO')).not.toThrow();
    expect(() => lote('125000.5', 20)).toThrow(/CHECK/); // RNF-04: no fractional money
  });

  it('rejects an invoice whose balance or state is inconsistent', () => {
    const venta = (pagado: number, saldo: number, estado: string) =>
      db.run(
        `INSERT INTO ventas (id_cliente, fecha_venta, total_venta, costo_total_base, monto_pagado, saldo_pendiente, estado_pago)
         VALUES (2, '${NOW}', 30000, 25000, ${pagado}, ${saldo}, '${estado}')`,
      );
    expect(() => venta(10000, 20000, 'PARCIAL')).not.toThrow();
    expect(() => venta(10000, 25000, 'PARCIAL')).toThrow(/CHECK/);
    expect(() => venta(40000, -10000, 'PAGADA')).toThrow(/CHECK/); // overpayment
    expect(() => venta(0, 30000, 'PARCIAL')).toThrow(/CHECK/);
    expect(() => venta(30000, 0, 'PARCIAL')).toThrow(/CHECK/);
  });

  it('enforces the money ledger split rules per movement type', () => {
    const mov = (tipo: string, bolsillo: number, capital: number, ganancia: number) =>
      db.run(
        `INSERT INTO movimientos_dinero (fecha_movimiento, tipo, medio, delta_bolsillo, delta_capital, delta_ganancia)
         VALUES ('${NOW}', '${tipo}', 'EFECTIVO', ${bolsillo}, ${capital}, ${ganancia})`,
      );
    expect(() => mov('APORTE_CAPITAL', 500000, 500000, 0)).not.toThrow(); // A2
    expect(() => mov('APORTE_CAPITAL', 500000, 0, 500000)).toThrow(/CHECK/);
    expect(() => mov('RETIRO_GANANCIA', -1000, 0, -1000)).not.toThrow();
    expect(() => mov('RETIRO_GANANCIA', -1000, -1000, 0)).toThrow(/CHECK/); // never withdraw capital
    expect(() => mov('COBRO', 1000, 600, 400)).toThrow(/CHECK/); // COBRO needs id_abono
  });

  it('rolls back every statement of a failed transaction (RNF-03)', () => {
    db.run('BEGIN');
    db.run(
      `INSERT INTO movimientos_dinero (fecha_movimiento, tipo, medio, delta_bolsillo, delta_capital, delta_ganancia)
       VALUES ('${NOW}', 'APORTE_CAPITAL', 'EFECTIVO', 100, 100, 0)`,
    );
    expect(() =>
      db.run(
        `INSERT INTO ventas (id_cliente, fecha_venta, total_venta, costo_total_base, monto_pagado, saldo_pendiente, estado_pago)
         VALUES (99, '${NOW}', 1, 1, 0, 1, 'PENDIENTE')`,
      ),
    ).toThrow(/FOREIGN KEY/);
    db.run('ROLLBACK');
    expect(scalar(db, 'SELECT count(*) FROM movimientos_dinero')).toBe(0);
  });

  it('keeps the A1 invariant: pockets = capital in cash + free profit', () => {
    db.exec(`
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
    const [bolsillos, capital, ganancia] = db.exec(
      'SELECT sum(delta_bolsillo), sum(delta_capital), sum(delta_ganancia) FROM movimientos_dinero',
    )[0].values[0] as number[];
    expect(bolsillos).toBe(capital + ganancia);
    expect(scalar(db, "SELECT sum(delta_bolsillo) FROM movimientos_dinero WHERE medio = 'TRANSFERENCIA'")).toBe(50000);
  });
});
