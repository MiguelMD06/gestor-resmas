import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SqlJsDatabase } from '../../../testing/sqljs-sql-database.adapter';
import { ClienteRepository } from '../../clientes/infrastructure/cliente.repository';
import { LibroRepository } from '../../finanzas/infrastructure/libro.repository';
import { fechaHora, pesos } from '../../shared/domain';
import { CLOCK } from '../../shared/infrastructure/clock/clock.token';
import { MIGRACIONES } from '../../shared/infrastructure/sqlite/migrations';
import { migrar } from '../../shared/infrastructure/sqlite/migrations/migration-runner';
import { SQL_DATABASE } from '../../shared/infrastructure/sqlite/sql-database.token';
import { AbonoRepository } from '../infrastructure/abono.repository';
import { CarteraRepository } from '../infrastructure/cartera.repository';

import { ConsultarCartera } from './consultar-cartera';
import { RegistrarAbono } from './registrar-abono';

describe('RegistrarAbono', () => {
  let db: SqlJsDatabase;
  let registrarAbono: RegistrarAbono;
  let consultarCartera: ConsultarCartera;
  let libroRepo: LibroRepository;

  let idAna: number;
  let idBeto: number;
  let idF1: number;
  let idF2: number;

  const ahora = fechaHora('2026-11-20 12:00:00');
  const fechaF1 = fechaHora('2026-11-01 10:00:00');
  const fechaF2 = fechaHora('2026-11-10 10:00:00');

  beforeEach(async () => {
    db = await SqlJsDatabase.create();
    await migrar(db, MIGRACIONES);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        RegistrarAbono,
        ConsultarCartera,
        CarteraRepository,
        AbonoRepository,
        ClienteRepository,
        LibroRepository,
        { provide: SQL_DATABASE, useValue: db },
        { provide: CLOCK, useValue: { ahora: () => ahora } },
      ],
    });

    registrarAbono = TestBed.inject(RegistrarAbono);
    consultarCartera = TestBed.inject(ConsultarCartera);
    libroRepo = TestBed.inject(LibroRepository);

    const anaRes = await db.run(
      `INSERT INTO clientes (nombre, telefono, es_mostrador, fecha_registro) VALUES ('Ana', '3001112233', 0, ?);`,
      [fechaF1],
    );
    idAna = anaRes.lastInsertId!;

    const betoRes = await db.run(
      `INSERT INTO clientes (nombre, telefono, es_mostrador, fecha_registro) VALUES ('Beto', '3002223344', 0, ?);`,
      [fechaF1],
    );
    idBeto = betoRes.lastInsertId!;

    const f1Res = await db.run(
      `INSERT INTO ventas (id_cliente, fecha_venta, total_venta, costo_total_base, monto_pagado, saldo_pendiente, estado_pago)
       VALUES (?, ?, 30000, 20000, 0, 30000, 'PENDIENTE');`,
      [idAna, fechaF1],
    );
    idF1 = f1Res.lastInsertId!;

    const f2Res = await db.run(
      `INSERT INTO ventas (id_cliente, fecha_venta, total_venta, costo_total_base, monto_pagado, saldo_pendiente, estado_pago)
       VALUES (?, ?, 15000, 10000, 5000, 10000, 'PARCIAL');`,
      [idAna, fechaF2],
    );
    idF2 = f2Res.lastInsertId!;

    const abonoInicialRes = await db.run(
      `INSERT INTO abonos (id_cliente, fecha_abono, monto_total_abonado, medio_pago, tipo_abono)
       VALUES (?, ?, 5000, 'EFECTIVO', 'ABONO_INICIAL');`,
      [idAna, fechaF2],
    );
    await db.run(
      `INSERT INTO abonos_detalle_facturas (id_abono, id_venta, monto_aplicado, capital_aplicado, ganancia_aplicada)
       VALUES (?, ?, 5000, 5000, 0);`,
      [abonoInicialRes.lastInsertId!, idF2],
    );
  });

  async function snapshotTablas() {
    const [ventas, abonos, abonosDetalle, movimientos] = await Promise.all([
      db.query('SELECT * FROM ventas ORDER BY id_venta;'),
      db.query('SELECT * FROM abonos ORDER BY id_abono;'),
      db.query('SELECT * FROM abonos_detalle_facturas ORDER BY id_abono_detalle;'),
      db.query('SELECT * FROM movimientos_dinero ORDER BY id_movimiento;'),
    ]);
    return { ventas, abonos, abonosDetalle, movimientos };
  }

  async function leerEfectosAbono(idAbono: number) {
    const [ventas, abonos, detalles, movimientos] = await Promise.all([
      db.query<{
        id_venta: number;
        monto_pagado: number;
        saldo_pendiente: number;
        estado_pago: string;
      }>('SELECT id_venta, monto_pagado, saldo_pendiente, estado_pago FROM ventas ORDER BY id_venta;'),
      db.query<{
        id_abono: number;
        tipo_abono: string;
        monto_total_abonado: number;
        medio_pago: string;
        fecha_abono: string;
      }>('SELECT id_abono, tipo_abono, monto_total_abonado, medio_pago, fecha_abono FROM abonos WHERE id_abono = ?;', [
        idAbono,
      ]),
      db.query<{
        id_venta: number;
        monto_aplicado: number;
        capital_aplicado: number;
        ganancia_aplicada: number;
      }>(
        'SELECT id_venta, monto_aplicado, capital_aplicado, ganancia_aplicada FROM abonos_detalle_facturas WHERE id_abono = ? ORDER BY id_venta;',
        [idAbono],
      ),
      db.query<{
        tipo: string;
        medio: string;
        delta_bolsillo: number;
        delta_capital: number;
        delta_ganancia: number;
        id_abono: number;
      }>(
        'SELECT tipo, medio, delta_bolsillo, delta_capital, delta_ganancia, id_abono FROM movimientos_dinero WHERE id_abono = ? ORDER BY id_movimiento;',
        [idAbono],
      ),
    ]);
    return { ventas, abonos, detalles, movimientos };
  }

  it('registers CASCADA_GLOBAL payment across invoices, updates ventas, writes abono, details and COBRO (C1)', async () => {
    const res = await registrarAbono.registrar({
      modo: 'CASCADA_GLOBAL',
      idCliente: idAna,
      fecha: ahora,
      medio: 'EFECTIVO',
      monto: pesos(35000),
    });

    expect(res.idAbono).toBeGreaterThan(0);
    expect(res.aplicaciones).toEqual([
      { idVenta: idF1, monto: 30000, capital: 20000, ganancia: 10000, quedaPagada: true },
      { idVenta: idF2, monto: 5000, capital: 5000, ganancia: 0, quedaPagada: false },
    ]);

    const ventas = await db.query<{
      id_venta: number;
      monto_pagado: number;
      saldo_pendiente: number;
      estado_pago: string;
    }>('SELECT id_venta, monto_pagado, saldo_pendiente, estado_pago FROM ventas ORDER BY id_venta;');
    expect(ventas).toEqual([
      { id_venta: idF1, monto_pagado: 30000, saldo_pendiente: 0, estado_pago: 'PAGADA' },
      { id_venta: idF2, monto_pagado: 10000, saldo_pendiente: 5000, estado_pago: 'PARCIAL' },
    ]);

    const abonos = await db.query<{
      id_abono: number;
      tipo_abono: string;
      monto_total_abonado: number;
      medio_pago: string;
      fecha_abono: string;
    }>('SELECT id_abono, tipo_abono, monto_total_abonado, medio_pago, fecha_abono FROM abonos WHERE id_abono = ?;', [
      res.idAbono,
    ]);
    expect(abonos).toEqual([
      {
        id_abono: res.idAbono,
        tipo_abono: 'CASCADA_GLOBAL',
        monto_total_abonado: 35000,
        medio_pago: 'EFECTIVO',
        fecha_abono: ahora,
      },
    ]);

    const detalles = await db.query<{
      id_venta: number;
      monto_aplicado: number;
      capital_aplicado: number;
      ganancia_aplicada: number;
    }>(
      'SELECT id_venta, monto_aplicado, capital_aplicado, ganancia_aplicada FROM abonos_detalle_facturas WHERE id_abono = ? ORDER BY id_venta;',
      [res.idAbono],
    );
    expect(detalles).toEqual([
      { id_venta: idF1, monto_aplicado: 30000, capital_aplicado: 20000, ganancia_aplicada: 10000 },
      { id_venta: idF2, monto_aplicado: 5000, capital_aplicado: 5000, ganancia_aplicada: 0 },
    ]);

    const movimientos = await db.query<{
      tipo: string;
      medio: string;
      delta_bolsillo: number;
      delta_capital: number;
      delta_ganancia: number;
      id_abono: number;
    }>('SELECT tipo, medio, delta_bolsillo, delta_capital, delta_ganancia, id_abono FROM movimientos_dinero;');
    expect(movimientos).toEqual([
      {
        tipo: 'COBRO',
        medio: 'EFECTIVO',
        delta_bolsillo: 35000,
        delta_capital: 25000,
        delta_ganancia: 10000,
        id_abono: res.idAbono,
      },
    ]);
  });

  it('registers FACTURA_INDIVIDUAL payment on F2 without changing F1 (C2)', async () => {
    const res = await registrarAbono.registrar({
      modo: 'FACTURA_INDIVIDUAL',
      idCliente: idAna,
      fecha: ahora,
      medio: 'TRANSFERENCIA',
      idVenta: idF2,
      monto: pesos(3000),
    });

    const ventas = await db.query<{
      id_venta: number;
      monto_pagado: number;
      saldo_pendiente: number;
      estado_pago: string;
    }>('SELECT id_venta, monto_pagado, saldo_pendiente, estado_pago FROM ventas ORDER BY id_venta;');
    expect(ventas).toEqual([
      { id_venta: idF1, monto_pagado: 0, saldo_pendiente: 30000, estado_pago: 'PENDIENTE' },
      { id_venta: idF2, monto_pagado: 8000, saldo_pendiente: 7000, estado_pago: 'PARCIAL' },
    ]);

    const abono = await db.query<{ tipo_abono: string; monto_total_abonado: number; medio_pago: string }>(
      'SELECT tipo_abono, monto_total_abonado, medio_pago FROM abonos WHERE id_abono = ?;',
      [res.idAbono],
    );
    expect(abono).toEqual([
      { tipo_abono: 'FACTURA_INDIVIDUAL', monto_total_abonado: 3000, medio_pago: 'TRANSFERENCIA' },
    ]);

    const detalles = await db.query<{
      id_venta: number;
      monto_aplicado: number;
      capital_aplicado: number;
      ganancia_aplicada: number;
    }>(
      'SELECT id_venta, monto_aplicado, capital_aplicado, ganancia_aplicada FROM abonos_detalle_facturas WHERE id_abono = ?;',
      [res.idAbono],
    );
    expect(detalles).toEqual([{ id_venta: idF2, monto_aplicado: 3000, capital_aplicado: 3000, ganancia_aplicada: 0 }]);

    const movimientos = await db.query<{
      tipo: string;
      medio: string;
      delta_bolsillo: number;
      delta_capital: number;
      delta_ganancia: number;
      id_abono: number;
    }>('SELECT tipo, medio, delta_bolsillo, delta_capital, delta_ganancia, id_abono FROM movimientos_dinero;');
    expect(movimientos).toEqual([
      {
        tipo: 'COBRO',
        medio: 'TRANSFERENCIA',
        delta_bolsillo: 3000,
        delta_capital: 3000,
        delta_ganancia: 0,
        id_abono: res.idAbono,
      },
    ]);
  });

  it('registers LIQUIDACION_TOTAL, clears debt from ConsultarCartera, and rejects a second settlement (C3)', async () => {
    const res = await registrarAbono.registrar({
      modo: 'LIQUIDACION_TOTAL',
      idCliente: idAna,
      fecha: ahora,
      medio: 'TRANSFERENCIA',
    });

    const ventas = await db.query<{ id_venta: number; saldo_pendiente: number; estado_pago: string }>(
      'SELECT id_venta, saldo_pendiente, estado_pago FROM ventas ORDER BY id_venta;',
    );
    expect(ventas).toEqual([
      { id_venta: idF1, saldo_pendiente: 0, estado_pago: 'PAGADA' },
      { id_venta: idF2, saldo_pendiente: 0, estado_pago: 'PAGADA' },
    ]);

    const abono = await db.query<{ tipo_abono: string; monto_total_abonado: number; medio_pago: string }>(
      'SELECT tipo_abono, monto_total_abonado, medio_pago FROM abonos WHERE id_abono = ?;',
      [res.idAbono],
    );
    expect(abono).toEqual([
      { tipo_abono: 'LIQUIDACION_TOTAL', monto_total_abonado: 40000, medio_pago: 'TRANSFERENCIA' },
    ]);

    const detalles = await db.query<{
      id_venta: number;
      monto_aplicado: number;
      capital_aplicado: number;
      ganancia_aplicada: number;
    }>(
      'SELECT id_venta, monto_aplicado, capital_aplicado, ganancia_aplicada FROM abonos_detalle_facturas WHERE id_abono = ? ORDER BY id_venta;',
      [res.idAbono],
    );
    expect(detalles).toEqual([
      { id_venta: idF1, monto_aplicado: 30000, capital_aplicado: 20000, ganancia_aplicada: 10000 },
      { id_venta: idF2, monto_aplicado: 10000, capital_aplicado: 5000, ganancia_aplicada: 5000 },
    ]);

    const movimientos = await db.query<{
      tipo: string;
      medio: string;
      delta_bolsillo: number;
      delta_capital: number;
      delta_ganancia: number;
      id_abono: number;
    }>('SELECT tipo, medio, delta_bolsillo, delta_capital, delta_ganancia, id_abono FROM movimientos_dinero;');
    expect(movimientos).toEqual([
      {
        tipo: 'COBRO',
        medio: 'TRANSFERENCIA',
        delta_bolsillo: 40000,
        delta_capital: 25000,
        delta_ganancia: 15000,
        id_abono: res.idAbono,
      },
    ]);

    const cartera = await consultarCartera.consultar();
    expect(cartera.porCliente.has(idAna)).toBe(false);
    expect(cartera.total).toBe(0);

    const antesSegundo = await snapshotTablas();
    await expect(
      registrarAbono.registrar({
        modo: 'LIQUIDACION_TOTAL',
        idCliente: idAna,
        fecha: ahora,
        medio: 'EFECTIVO',
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'SIN_DEUDA' }));
    expect(await snapshotTablas()).toEqual(antesSegundo);
  });

  it('enforces exact debt boundary in CASCADA_GLOBAL (C4)', async () => {
    const antes = await snapshotTablas();
    await expect(
      registrarAbono.registrar({
        modo: 'CASCADA_GLOBAL',
        idCliente: idAna,
        fecha: ahora,
        medio: 'EFECTIVO',
        monto: pesos(40001),
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'MONTO_SUPERA_DEUDA' }));
    expect(await snapshotTablas()).toEqual(antes);

    const res = await registrarAbono.registrar({
      modo: 'CASCADA_GLOBAL',
      idCliente: idAna,
      fecha: ahora,
      medio: 'EFECTIVO',
      monto: pesos(40000),
    });

    expect(await leerEfectosAbono(res.idAbono)).toEqual({
      ventas: [
        { id_venta: idF1, monto_pagado: 30000, saldo_pendiente: 0, estado_pago: 'PAGADA' },
        { id_venta: idF2, monto_pagado: 15000, saldo_pendiente: 0, estado_pago: 'PAGADA' },
      ],
      abonos: [
        {
          id_abono: res.idAbono,
          tipo_abono: 'CASCADA_GLOBAL',
          monto_total_abonado: 40000,
          medio_pago: 'EFECTIVO',
          fecha_abono: ahora,
        },
      ],
      detalles: [
        { id_venta: idF1, monto_aplicado: 30000, capital_aplicado: 20000, ganancia_aplicada: 10000 },
        { id_venta: idF2, monto_aplicado: 10000, capital_aplicado: 5000, ganancia_aplicada: 5000 },
      ],
      movimientos: [
        {
          tipo: 'COBRO',
          medio: 'EFECTIVO',
          delta_bolsillo: 40000,
          delta_capital: 25000,
          delta_ganancia: 15000,
          id_abono: res.idAbono,
        },
      ],
    });
  });

  it('enforces exact invoice balance boundary in FACTURA_INDIVIDUAL (C5)', async () => {
    const antes = await snapshotTablas();
    await expect(
      registrarAbono.registrar({
        modo: 'FACTURA_INDIVIDUAL',
        idCliente: idAna,
        fecha: ahora,
        medio: 'EFECTIVO',
        idVenta: idF2,
        monto: pesos(10001),
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'MONTO_SUPERA_SALDO_FACTURA' }));
    expect(await snapshotTablas()).toEqual(antes);

    const res = await registrarAbono.registrar({
      modo: 'FACTURA_INDIVIDUAL',
      idCliente: idAna,
      fecha: ahora,
      medio: 'EFECTIVO',
      idVenta: idF2,
      monto: pesos(10000),
    });

    expect(await leerEfectosAbono(res.idAbono)).toEqual({
      ventas: [
        { id_venta: idF1, monto_pagado: 0, saldo_pendiente: 30000, estado_pago: 'PENDIENTE' },
        { id_venta: idF2, monto_pagado: 15000, saldo_pendiente: 0, estado_pago: 'PAGADA' },
      ],
      abonos: [
        {
          id_abono: res.idAbono,
          tipo_abono: 'FACTURA_INDIVIDUAL',
          monto_total_abonado: 10000,
          medio_pago: 'EFECTIVO',
          fecha_abono: ahora,
        },
      ],
      detalles: [{ id_venta: idF2, monto_aplicado: 10000, capital_aplicado: 5000, ganancia_aplicada: 5000 }],
      movimientos: [
        {
          tipo: 'COBRO',
          medio: 'EFECTIVO',
          delta_bolsillo: 10000,
          delta_capital: 5000,
          delta_ganancia: 5000,
          id_abono: res.idAbono,
        },
      ],
    });
  });

  it('rejects zero amount in CASCADA_GLOBAL and FACTURA_INDIVIDUAL without writing (C6)', async () => {
    const antes = await snapshotTablas();

    await expect(
      registrarAbono.registrar({
        modo: 'CASCADA_GLOBAL',
        idCliente: idAna,
        fecha: ahora,
        medio: 'EFECTIVO',
        monto: pesos(0),
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'MONTO_INVALIDO' }));
    expect(await snapshotTablas()).toEqual(antes);

    await expect(
      registrarAbono.registrar({
        modo: 'FACTURA_INDIVIDUAL',
        idCliente: idAna,
        fecha: ahora,
        medio: 'EFECTIVO',
        idVenta: idF2,
        monto: pesos(0),
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'MONTO_INVALIDO' }));
    expect(await snapshotTablas()).toEqual(antes);
  });

  it('rejects future dates and accepts exact clock time (C7)', async () => {
    const antes = await snapshotTablas();

    await expect(
      registrarAbono.registrar({
        modo: 'CASCADA_GLOBAL',
        idCliente: idAna,
        fecha: fechaHora('2026-11-20 12:00:01'),
        medio: 'EFECTIVO',
        monto: pesos(5000),
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'FECHA_FUTURA' }));
    expect(await snapshotTablas()).toEqual(antes);

    const res = await registrarAbono.registrar({
      modo: 'CASCADA_GLOBAL',
      idCliente: idAna,
      fecha: ahora,
      medio: 'EFECTIVO',
      monto: pesos(5000),
    });
    expect(res.idAbono).toBeGreaterThan(0);
    expect(await leerEfectosAbono(res.idAbono)).toEqual({
      ventas: [
        { id_venta: idF1, monto_pagado: 5000, saldo_pendiente: 25000, estado_pago: 'PARCIAL' },
        { id_venta: idF2, monto_pagado: 5000, saldo_pendiente: 10000, estado_pago: 'PARCIAL' },
      ],
      abonos: [
        {
          id_abono: res.idAbono,
          tipo_abono: 'CASCADA_GLOBAL',
          monto_total_abonado: 5000,
          medio_pago: 'EFECTIVO',
          fecha_abono: ahora,
        },
      ],
      detalles: [{ id_venta: idF1, monto_aplicado: 5000, capital_aplicado: 5000, ganancia_aplicada: 0 }],
      movimientos: [
        {
          tipo: 'COBRO',
          medio: 'EFECTIVO',
          delta_bolsillo: 5000,
          delta_capital: 5000,
          delta_ganancia: 0,
          id_abono: res.idAbono,
        },
      ],
    });
  });

  it('rejects payment earlier than any receiving invoice and accepts when only earlier invoice receives money (C8, D14)', async () => {
    const antes = await snapshotTablas();

    await expect(
      registrarAbono.registrar({
        modo: 'CASCADA_GLOBAL',
        idCliente: idAna,
        fecha: fechaHora('2026-11-05 10:00:00'),
        medio: 'EFECTIVO',
        monto: pesos(35000),
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'ABONO_ANTERIOR_A_FACTURA' }));
    expect(await snapshotTablas()).toEqual(antes);

    const res1 = await registrarAbono.registrar({
      modo: 'CASCADA_GLOBAL',
      idCliente: idAna,
      fecha: fechaHora('2026-11-05 10:00:00'),
      medio: 'EFECTIVO',
      monto: pesos(30000),
    });

    expect(await leerEfectosAbono(res1.idAbono)).toEqual({
      ventas: [
        { id_venta: idF1, monto_pagado: 30000, saldo_pendiente: 0, estado_pago: 'PAGADA' },
        { id_venta: idF2, monto_pagado: 5000, saldo_pendiente: 10000, estado_pago: 'PARCIAL' },
      ],
      abonos: [
        {
          id_abono: res1.idAbono,
          tipo_abono: 'CASCADA_GLOBAL',
          monto_total_abonado: 30000,
          medio_pago: 'EFECTIVO',
          fecha_abono: '2026-11-05 10:00:00',
        },
      ],
      detalles: [{ id_venta: idF1, monto_aplicado: 30000, capital_aplicado: 20000, ganancia_aplicada: 10000 }],
      movimientos: [
        {
          tipo: 'COBRO',
          medio: 'EFECTIVO',
          delta_bolsillo: 30000,
          delta_capital: 20000,
          delta_ganancia: 10000,
          id_abono: res1.idAbono,
        },
      ],
    });

    const res2 = await registrarAbono.registrar({
      modo: 'CASCADA_GLOBAL',
      idCliente: idAna,
      fecha: fechaHora('2026-11-10 10:00:00'),
      medio: 'EFECTIVO',
      monto: pesos(10000),
    });

    expect(await leerEfectosAbono(res2.idAbono)).toEqual({
      ventas: [
        { id_venta: idF1, monto_pagado: 30000, saldo_pendiente: 0, estado_pago: 'PAGADA' },
        { id_venta: idF2, monto_pagado: 15000, saldo_pendiente: 0, estado_pago: 'PAGADA' },
      ],
      abonos: [
        {
          id_abono: res2.idAbono,
          tipo_abono: 'CASCADA_GLOBAL',
          monto_total_abonado: 10000,
          medio_pago: 'EFECTIVO',
          fecha_abono: '2026-11-10 10:00:00',
        },
      ],
      detalles: [{ id_venta: idF2, monto_aplicado: 10000, capital_aplicado: 5000, ganancia_aplicada: 5000 }],
      movimientos: [
        {
          tipo: 'COBRO',
          medio: 'EFECTIVO',
          delta_bolsillo: 10000,
          delta_capital: 5000,
          delta_ganancia: 5000,
          id_abono: res2.idAbono,
        },
      ],
    });
  });

  it('breaks date ties in cascade by id_venta ascending and leaves other customers untouched (C10)', async () => {
    const carlaRes = await db.run(
      `INSERT INTO clientes (nombre, telefono, es_mostrador, fecha_registro) VALUES ('Carla', '3003334455', 0, ?);`,
      [fechaF1],
    );
    const idCarla = carlaRes.lastInsertId!;

    const g1Res = await db.run(
      `INSERT INTO ventas (id_cliente, fecha_venta, total_venta, costo_total_base, monto_pagado, saldo_pendiente, estado_pago)
       VALUES (?, '2026-11-02 10:00:00', 10000, 8000, 0, 10000, 'PENDIENTE');`,
      [idCarla],
    );
    const idG1 = g1Res.lastInsertId!;

    const g2Res = await db.run(
      `INSERT INTO ventas (id_cliente, fecha_venta, total_venta, costo_total_base, monto_pagado, saldo_pendiente, estado_pago)
       VALUES (?, '2026-11-03 10:00:00', 10000, 8000, 0, 10000, 'PENDIENTE');`,
      [idCarla],
    );
    const idG2 = g2Res.lastInsertId!;

    const g3Res = await db.run(
      `INSERT INTO ventas (id_cliente, fecha_venta, total_venta, costo_total_base, monto_pagado, saldo_pendiente, estado_pago)
       VALUES (?, '2026-11-03 10:00:00', 10000, 8000, 0, 10000, 'PENDIENTE');`,
      [idCarla],
    );
    const idG3 = g3Res.lastInsertId!;

    const res = await registrarAbono.registrar({
      modo: 'CASCADA_GLOBAL',
      idCliente: idCarla,
      fecha: ahora,
      medio: 'EFECTIVO',
      monto: pesos(25000),
    });

    expect(res.aplicaciones).toEqual([
      { idVenta: idG1, monto: 10000, capital: 8000, ganancia: 2000, quedaPagada: true },
      { idVenta: idG2, monto: 10000, capital: 8000, ganancia: 2000, quedaPagada: true },
      { idVenta: idG3, monto: 5000, capital: 5000, ganancia: 0, quedaPagada: false },
    ]);

    expect(await leerEfectosAbono(res.idAbono)).toEqual({
      ventas: [
        { id_venta: idF1, monto_pagado: 0, saldo_pendiente: 30000, estado_pago: 'PENDIENTE' },
        { id_venta: idF2, monto_pagado: 5000, saldo_pendiente: 10000, estado_pago: 'PARCIAL' },
        { id_venta: idG1, monto_pagado: 10000, saldo_pendiente: 0, estado_pago: 'PAGADA' },
        { id_venta: idG2, monto_pagado: 10000, saldo_pendiente: 0, estado_pago: 'PAGADA' },
        { id_venta: idG3, monto_pagado: 5000, saldo_pendiente: 5000, estado_pago: 'PARCIAL' },
      ],
      abonos: [
        {
          id_abono: res.idAbono,
          tipo_abono: 'CASCADA_GLOBAL',
          monto_total_abonado: 25000,
          medio_pago: 'EFECTIVO',
          fecha_abono: ahora,
        },
      ],
      detalles: [
        { id_venta: idG1, monto_aplicado: 10000, capital_aplicado: 8000, ganancia_aplicada: 2000 },
        { id_venta: idG2, monto_aplicado: 10000, capital_aplicado: 8000, ganancia_aplicada: 2000 },
        { id_venta: idG3, monto_aplicado: 5000, capital_aplicado: 5000, ganancia_aplicada: 0 },
      ],
      movimientos: [
        {
          tipo: 'COBRO',
          medio: 'EFECTIVO',
          delta_bolsillo: 25000,
          delta_capital: 21000,
          delta_ganancia: 4000,
          id_abono: res.idAbono,
        },
      ],
    });
  });

  it('rejects FACTURA_INDIVIDUAL for another customer invoice, nonexistent invoice, or already paid invoice without writing (C11)', async () => {
    const carlaRes = await db.run(
      `INSERT INTO clientes (nombre, telefono, es_mostrador, fecha_registro) VALUES ('Carla', '3003334455', 0, ?);`,
      [fechaF1],
    );
    const idCarla = carlaRes.lastInsertId!;
    const g1Res = await db.run(
      `INSERT INTO ventas (id_cliente, fecha_venta, total_venta, costo_total_base, monto_pagado, saldo_pendiente, estado_pago)
       VALUES (?, '2026-11-02 10:00:00', 10000, 8000, 0, 10000, 'PENDIENTE');`,
      [idCarla],
    );
    const idCarlaVenta = g1Res.lastInsertId!;

    const anaPagadaRes = await db.run(
      `INSERT INTO ventas (id_cliente, fecha_venta, total_venta, costo_total_base, monto_pagado, saldo_pendiente, estado_pago)
       VALUES (?, '2026-11-02 10:00:00', 10000, 8000, 10000, 0, 'PAGADA');`,
      [idAna],
    );
    const idAnaPagada = anaPagadaRes.lastInsertId!;

    const antes = await snapshotTablas();

    await expect(
      registrarAbono.registrar({
        modo: 'FACTURA_INDIVIDUAL',
        idCliente: idAna,
        fecha: ahora,
        medio: 'EFECTIVO',
        idVenta: idCarlaVenta,
        monto: pesos(5000),
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'FACTURA_INVALIDA' }));
    expect(await snapshotTablas()).toEqual(antes);

    await expect(
      registrarAbono.registrar({
        modo: 'FACTURA_INDIVIDUAL',
        idCliente: idAna,
        fecha: ahora,
        medio: 'EFECTIVO',
        idVenta: 99999,
        monto: pesos(5000),
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'FACTURA_INVALIDA' }));
    expect(await snapshotTablas()).toEqual(antes);

    await expect(
      registrarAbono.registrar({
        modo: 'FACTURA_INDIVIDUAL',
        idCliente: idAna,
        fecha: ahora,
        medio: 'EFECTIVO',
        idVenta: idAnaPagada,
        monto: pesos(5000),
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'SIN_DEUDA' }));
    expect(await snapshotTablas()).toEqual(antes);
  });

  it('rejects nonexistent customer with CLIENTE_INEXISTENTE and debtless customer with SIN_DEUDA without writing (C12)', async () => {
    const antes = await snapshotTablas();

    await expect(
      registrarAbono.registrar({
        modo: 'CASCADA_GLOBAL',
        idCliente: 9999,
        fecha: ahora,
        medio: 'EFECTIVO',
        monto: pesos(1000),
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'CLIENTE_INEXISTENTE' }));

    await expect(
      registrarAbono.registrar({
        modo: 'FACTURA_INDIVIDUAL',
        idCliente: 9999,
        fecha: ahora,
        medio: 'EFECTIVO',
        idVenta: idF1,
        monto: pesos(1000),
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'CLIENTE_INEXISTENTE' }));

    await expect(
      registrarAbono.registrar({
        modo: 'LIQUIDACION_TOTAL',
        idCliente: 9999,
        fecha: ahora,
        medio: 'EFECTIVO',
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'CLIENTE_INEXISTENTE' }));

    await expect(
      registrarAbono.registrar({
        modo: 'CASCADA_GLOBAL',
        idCliente: idBeto,
        fecha: ahora,
        medio: 'EFECTIVO',
        monto: pesos(1000),
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'SIN_DEUDA' }));

    await expect(
      registrarAbono.registrar({
        modo: 'LIQUIDACION_TOTAL',
        idCliente: idBeto,
        fecha: ahora,
        medio: 'EFECTIVO',
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'SIN_DEUDA' }));

    expect(await snapshotTablas()).toEqual(antes);
  });

  it('prevents double payment on concurrent calls by reading open invoices inside the transaction (C13)', async () => {
    const results = await Promise.allSettled([
      registrarAbono.registrar({
        modo: 'CASCADA_GLOBAL',
        idCliente: idAna,
        fecha: ahora,
        medio: 'EFECTIVO',
        monto: pesos(35000),
      }),
      registrarAbono.registrar({
        modo: 'CASCADA_GLOBAL',
        idCliente: idAna,
        fecha: ahora,
        medio: 'EFECTIVO',
        monto: pesos(35000),
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toEqual(expect.objectContaining({ codigo: 'MONTO_SUPERA_DEUDA' }));

    const idAbono = fulfilled[0].value.idAbono;
    expect(await leerEfectosAbono(idAbono)).toEqual({
      ventas: [
        { id_venta: idF1, monto_pagado: 30000, saldo_pendiente: 0, estado_pago: 'PAGADA' },
        { id_venta: idF2, monto_pagado: 10000, saldo_pendiente: 5000, estado_pago: 'PARCIAL' },
      ],
      abonos: [
        {
          id_abono: idAbono,
          tipo_abono: 'CASCADA_GLOBAL',
          monto_total_abonado: 35000,
          medio_pago: 'EFECTIVO',
          fecha_abono: ahora,
        },
      ],
      detalles: [
        { id_venta: idF1, monto_aplicado: 30000, capital_aplicado: 20000, ganancia_aplicada: 10000 },
        { id_venta: idF2, monto_aplicado: 5000, capital_aplicado: 5000, ganancia_aplicada: 0 },
      ],
      movimientos: [
        {
          tipo: 'COBRO',
          medio: 'EFECTIVO',
          delta_bolsillo: 35000,
          delta_capital: 25000,
          delta_ganancia: 10000,
          id_abono: idAbono,
        },
      ],
    });

    const abonosNuevos = await db.query<{ total: number }>(
      "SELECT COUNT(*) AS total FROM abonos WHERE tipo_abono = 'CASCADA_GLOBAL';",
    );
    expect(abonosNuevos[0].total).toBe(1);

    const cobros = await db.query<{ total: number }>(
      "SELECT COUNT(*) AS total FROM movimientos_dinero WHERE tipo = 'COBRO';",
    );
    expect(cobros[0].total).toBe(1);

    const cartera = await consultarCartera.consultar();
    expect(cartera.porCliente.get(idAna)).toEqual({ deuda: 5000, facturas: 1 });
  });

  it('rolls back everything when LibroRepository.registrar fails and allows safe retry afterwards (C14)', async () => {
    const antes = await snapshotTablas();
    const spy = vi.spyOn(libroRepo, 'registrar').mockRejectedValueOnce(new Error('Disk I/O failure'));

    await expect(
      registrarAbono.registrar({
        modo: 'CASCADA_GLOBAL',
        idCliente: idAna,
        fecha: ahora,
        medio: 'EFECTIVO',
        monto: pesos(35000),
      }),
    ).rejects.toThrow('Disk I/O failure');

    expect(await snapshotTablas()).toEqual(antes);

    spy.mockRestore();

    const retry = await registrarAbono.registrar({
      modo: 'CASCADA_GLOBAL',
      idCliente: idAna,
      fecha: ahora,
      medio: 'EFECTIVO',
      monto: pesos(35000),
    });
    expect(retry.idAbono).toBeGreaterThan(0);

    expect(await leerEfectosAbono(retry.idAbono)).toEqual({
      ventas: [
        { id_venta: idF1, monto_pagado: 30000, saldo_pendiente: 0, estado_pago: 'PAGADA' },
        { id_venta: idF2, monto_pagado: 10000, saldo_pendiente: 5000, estado_pago: 'PARCIAL' },
      ],
      abonos: [
        {
          id_abono: retry.idAbono,
          tipo_abono: 'CASCADA_GLOBAL',
          monto_total_abonado: 35000,
          medio_pago: 'EFECTIVO',
          fecha_abono: ahora,
        },
      ],
      detalles: [
        { id_venta: idF1, monto_aplicado: 30000, capital_aplicado: 20000, ganancia_aplicada: 10000 },
        { id_venta: idF2, monto_aplicado: 5000, capital_aplicado: 5000, ganancia_aplicada: 0 },
      ],
      movimientos: [
        {
          tipo: 'COBRO',
          medio: 'EFECTIVO',
          delta_bolsillo: 35000,
          delta_capital: 25000,
          delta_ganancia: 10000,
          id_abono: retry.idAbono,
        },
      ],
    });

    const cartera = await consultarCartera.consultar();
    expect(cartera.porCliente.get(idAna)).toEqual({ deuda: 5000, facturas: 1 });
  });
});
