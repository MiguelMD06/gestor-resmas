import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { SqlJsDatabase } from '../../../testing/sqljs-sql-database.adapter';
import { fechaHora, pesos } from '../../shared/domain';
import { MIGRACIONES } from '../../shared/infrastructure/sqlite/migrations';
import { migrar } from '../../shared/infrastructure/sqlite/migrations/migration-runner';

import { CarteraRepository } from './cartera.repository';

describe('CarteraRepository', () => {
  let db: SqlJsDatabase;
  let repo: CarteraRepository;

  let idAna: number;
  let idBeto: number;
  let idLoteCarta: number;
  let idF1: number;
  let idF2: number;

  const fechaSetup = fechaHora('2026-11-01 09:00:00');
  const fechaF1 = fechaHora('2026-11-01 10:00:00');
  const fechaF2 = fechaHora('2026-11-10 10:00:00');

  beforeEach(async () => {
    db = await SqlJsDatabase.create();
    await migrar(db, MIGRACIONES);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [CarteraRepository],
    });
    repo = TestBed.inject(CarteraRepository);

    const loteRes = await db.run(
      `INSERT INTO lotes_cajas (tipo_papel, fecha_compra, cantidad_cajas, costo_por_caja, costo_unitario_resma, resmas_iniciales, resmas_disponibles, medio_pago_compra, estado)
       VALUES ('CARTA', ?, 2, 100000, 10000, 20, 17, 'EFECTIVO', 'ACTIVO');`,
      [fechaSetup],
    );
    idLoteCarta = loteRes.lastInsertId!;

    const anaRes = await db.run(
      `INSERT INTO clientes (nombre, telefono, es_mostrador, fecha_registro) VALUES ('Ana', '3001112233', 0, ?);`,
      [fechaSetup],
    );
    idAna = anaRes.lastInsertId!;

    const betoRes = await db.run(
      `INSERT INTO clientes (nombre, telefono, es_mostrador, fecha_registro) VALUES ('Beto', '3002223344', 0, ?);`,
      [fechaSetup],
    );
    idBeto = betoRes.lastInsertId!;

    const f1Res = await db.run(
      `INSERT INTO ventas (id_cliente, fecha_venta, total_venta, costo_total_base, monto_pagado, saldo_pendiente, estado_pago)
       VALUES (?, ?, 30000, 20000, 0, 30000, 'PENDIENTE');`,
      [idAna, fechaF1],
    );
    idF1 = f1Res.lastInsertId!;
    await db.run(
      `INSERT INTO detalle_ventas (id_venta, id_lote, cantidad_resmas, costo_unitario_lote, precio_unitario_venta, subtotal_venta, subtotal_costo)
       VALUES (?, ?, 2, 10000, 15000, 30000, 20000);`,
      [idF1, idLoteCarta],
    );

    const f2Res = await db.run(
      `INSERT INTO ventas (id_cliente, fecha_venta, total_venta, costo_total_base, monto_pagado, saldo_pendiente, estado_pago)
       VALUES (?, ?, 15000, 10000, 5000, 10000, 'PARCIAL');`,
      [idAna, fechaF2],
    );
    idF2 = f2Res.lastInsertId!;
    await db.run(
      `INSERT INTO detalle_ventas (id_venta, id_lote, cantidad_resmas, costo_unitario_lote, precio_unitario_venta, subtotal_venta, subtotal_costo)
       VALUES (?, ?, 1, 10000, 15000, 15000, 10000);`,
      [idF2, idLoteCarta],
    );

    const abonoRes = await db.run(
      `INSERT INTO abonos (id_cliente, fecha_abono, monto_total_abonado, medio_pago, tipo_abono)
       VALUES (?, ?, 5000, 'EFECTIVO', 'ABONO_INICIAL');`,
      [idAna, fechaF2],
    );
    await db.run(
      `INSERT INTO abonos_detalle_facturas (id_abono, id_venta, monto_aplicado, capital_aplicado, ganancia_aplicada)
       VALUES (?, ?, 5000, 5000, 0);`,
      [abonoRes.lastInsertId!, idF2],
    );
  });

  it('lists open invoices for a customer ordered chronologically ascending', async () => {
    const abiertas = await repo.facturasAbiertas(db, idAna);

    expect(abiertas).toEqual([
      { idVenta: idF1, fecha: fechaF1, total: pesos(30000), costoBase: pesos(20000), pagado: pesos(0) },
      { idVenta: idF2, fecha: fechaF2, total: pesos(15000), costoBase: pesos(10000), pagado: pesos(5000) },
    ]);
    expect(await repo.facturasAbiertas(db, idBeto)).toEqual([]);
  });

  it('aggregates debts and open invoice counts per customer excluding customers without debt, paid-only customers, and Mostrador (C1)', async () => {
    const carlaRes = await db.run(
      `INSERT INTO clientes (nombre, telefono, es_mostrador, fecha_registro) VALUES ('Carla', '3003334455', 0, ?);`,
      [fechaSetup],
    );
    const idCarla = carlaRes.lastInsertId!;

    const pagadoRes = await db.run(
      `INSERT INTO clientes (nombre, telefono, es_mostrador, fecha_registro) VALUES ('Diana', '3004445566', 0, ?);`,
      [fechaSetup],
    );
    const idDiana = pagadoRes.lastInsertId!;

    const mostradorRows = await db.query<{ id_cliente: number }>(
      `SELECT id_cliente FROM clientes WHERE es_mostrador = 1;`,
    );
    const idMostrador = mostradorRows[0].id_cliente;

    await db.run(
      `INSERT INTO ventas (id_cliente, fecha_venta, total_venta, costo_total_base, monto_pagado, saldo_pendiente, estado_pago)
       VALUES (?, ?, 22000, 15000, 0, 22000, 'PENDIENTE');`,
      [idCarla, fechaF2],
    );
    await db.run(
      `INSERT INTO ventas (id_cliente, fecha_venta, total_venta, costo_total_base, monto_pagado, saldo_pendiente, estado_pago)
       VALUES (?, ?, 15000, 10000, 15000, 0, 'PAGADA');`,
      [idDiana, fechaF2],
    );
    await db.run(
      `INSERT INTO ventas (id_cliente, fecha_venta, total_venta, costo_total_base, monto_pagado, saldo_pendiente, estado_pago)
       VALUES (?, ?, 15000, 10000, 15000, 0, 'PAGADA');`,
      [idMostrador, fechaF2],
    );

    const deudas = await repo.deudasPorCliente(db);

    expect(deudas.size).toBe(2);
    expect(deudas.get(idAna)).toEqual({ deuda: pesos(40000), facturas: 2 });
    expect(deudas.get(idCarla)).toEqual({ deuda: pesos(22000), facturas: 1 });
    expect(deudas.has(idBeto)).toBe(false);
    expect(deudas.has(idDiana)).toBe(false);
    expect(deudas.has(idMostrador)).toBe(false);
  });

  it('applies payment atomically: rejects exceeding balance, settles at exact balance, marks PARCIAL otherwise (C15)', async () => {
    await expect(db.transaction((tx) => repo.aplicarPago(tx, idF2, pesos(10001)))).rejects.toThrow(
      /Failed to apply payment/,
    );

    const f2AfterFail = await db.query<{ saldo_pendiente: number; estado_pago: string }>(
      'SELECT saldo_pendiente, estado_pago FROM ventas WHERE id_venta = ?;',
      [idF2],
    );
    expect(f2AfterFail).toEqual([{ saldo_pendiente: 10000, estado_pago: 'PARCIAL' }]);

    await db.transaction((tx) => repo.aplicarPago(tx, idF2, pesos(10000)));
    const f2AfterSettle = await db.query<{ saldo_pendiente: number; estado_pago: string }>(
      'SELECT saldo_pendiente, estado_pago FROM ventas WHERE id_venta = ?;',
      [idF2],
    );
    expect(f2AfterSettle).toEqual([{ saldo_pendiente: 0, estado_pago: 'PAGADA' }]);

    await db.transaction((tx) => repo.aplicarPago(tx, idF1, pesos(1)));
    const f1AfterPartial = await db.query<{ monto_pagado: number; saldo_pendiente: number; estado_pago: string }>(
      'SELECT monto_pagado, saldo_pendiente, estado_pago FROM ventas WHERE id_venta = ?;',
      [idF1],
    );
    expect(f1AfterPartial).toEqual([{ monto_pagado: 1, saldo_pendiente: 29999, estado_pago: 'PARCIAL' }]);
  });

  it('loads customer dossier with invoices descending, lines ascending, and abonos excluding PAGO_CONTADO (D15, C17, C18)', async () => {
    const fechaContado = fechaHora('2026-11-15 10:00:00');
    const fContadoRes = await db.run(
      `INSERT INTO ventas (id_cliente, fecha_venta, total_venta, costo_total_base, monto_pagado, saldo_pendiente, estado_pago)
       VALUES (?, ?, 15000, 10000, 15000, 0, 'PAGADA');`,
      [idAna, fechaContado],
    );
    const idFContado = fContadoRes.lastInsertId!;
    await db.run(
      `INSERT INTO detalle_ventas (id_venta, id_lote, cantidad_resmas, costo_unitario_lote, precio_unitario_venta, subtotal_venta, subtotal_costo)
       VALUES (?, ?, 1, 10000, 15000, 15000, 10000);`,
      [idFContado, idLoteCarta],
    );
    const abonoContadoRes = await db.run(
      `INSERT INTO abonos (id_cliente, fecha_abono, monto_total_abonado, medio_pago, tipo_abono)
       VALUES (?, ?, 15000, 'EFECTIVO', 'PAGO_CONTADO');`,
      [idAna, fechaContado],
    );
    await db.run(
      `INSERT INTO abonos_detalle_facturas (id_abono, id_venta, monto_aplicado, capital_aplicado, ganancia_aplicada)
       VALUES (?, ?, 15000, 10000, 5000);`,
      [abonoContadoRes.lastInsertId!, idFContado],
    );

    const exp = await repo.expediente(db, idAna);

    expect(exp.facturas.map((f) => f.idVenta)).toEqual([idFContado, idF2, idF1]);
    expect(exp.facturas[0]).toMatchObject({
      idVenta: idFContado,
      estado: 'PAGADA',
      saldo: 0,
      lineas: [{ cantidad: 1, tipoPapel: 'CARTA', precioUnitario: 15000, subtotal: 15000 }],
    });
    expect(exp.abonos).toHaveLength(1);
    expect(exp.abonos[0]).toMatchObject({
      tipo: 'ABONO_INICIAL',
      monto: 5000,
      medio: 'EFECTIVO',
      aplicaciones: [{ idVenta: idF2, monto: 5000 }],
    });
  });
});
