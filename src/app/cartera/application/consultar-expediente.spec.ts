import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

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

import { ConsultarExpediente } from './consultar-expediente';
import { RegistrarAbono } from './registrar-abono';

describe('ConsultarExpediente', () => {
  let db: SqlJsDatabase;
  let consultarExpediente: ConsultarExpediente;
  let registrarAbono: RegistrarAbono;

  let idAna: number;
  let idLoteCarta: number;
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
        ConsultarExpediente,
        RegistrarAbono,
        CarteraRepository,
        AbonoRepository,
        ClienteRepository,
        LibroRepository,
        { provide: SQL_DATABASE, useValue: db },
        { provide: CLOCK, useValue: { ahora: () => ahora } },
      ],
    });

    consultarExpediente = TestBed.inject(ConsultarExpediente);
    registrarAbono = TestBed.inject(RegistrarAbono);

    const loteRes = await db.run(
      `INSERT INTO lotes_cajas (tipo_papel, fecha_compra, cantidad_cajas, costo_por_caja, costo_unitario_resma, resmas_iniciales, resmas_disponibles, medio_pago_compra, estado)
       VALUES ('CARTA', ?, 2, 100000, 10000, 20, 17, 'EFECTIVO', 'ACTIVO');`,
      [fechaF1],
    );
    idLoteCarta = loteRes.lastInsertId!;

    const anaRes = await db.run(
      `INSERT INTO clientes (nombre, telefono, es_mostrador, fecha_registro) VALUES ('Ana', '3001112233', 0, ?);`,
      [fechaF1],
    );
    idAna = anaRes.lastInsertId!;

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

  it('returns debt breakdown, invoices newest-first with lines, and abonos newest-first (C17)', async () => {
    const expInicial = await consultarExpediente.consultar(idAna);

    expect(expInicial.cliente.idCliente).toBe(idAna);
    expect(expInicial.deuda).toEqual({ total: 40000, capital: 25000, ganancia: 15000 });
    expect(expInicial.facturas.map((f) => ({ id: f.idVenta, estado: f.estado, saldo: f.saldo }))).toEqual([
      { id: idF2, estado: 'PARCIAL', saldo: 10000 },
      { id: idF1, estado: 'PENDIENTE', saldo: 30000 },
    ]);
    expect(expInicial.facturas[1].lineas).toEqual([
      { cantidad: 2, tipoPapel: 'CARTA', precioUnitario: 15000, subtotal: 30000 },
    ]);

    await registrarAbono.registrar({
      modo: 'CASCADA_GLOBAL',
      idCliente: idAna,
      fecha: ahora,
      medio: 'EFECTIVO',
      monto: pesos(35000),
    });

    const expDespues = await consultarExpediente.consultar(idAna);
    expect(expDespues.abonos).toHaveLength(2);
    expect(expDespues.abonos[0]).toMatchObject({
      monto: 35000,
      tipo: 'CASCADA_GLOBAL',
      aplicaciones: [
        { idVenta: idF1, monto: 30000 },
        { idVenta: idF2, monto: 5000 },
      ],
    });
    expect(expDespues.abonos[1]).toMatchObject({
      monto: 5000,
      tipo: 'ABONO_INICIAL',
      aplicaciones: [{ idVenta: idF2, monto: 5000 }],
    });
  });

  it('rejects with CLIENTE_INEXISTENTE when customer does not exist (C17)', async () => {
    await expect(consultarExpediente.consultar(9999)).rejects.toThrow(
      expect.objectContaining({ codigo: 'CLIENTE_INEXISTENTE' }),
    );
  });

  it('excludes PAGO_CONTADO from abonos while keeping the paid invoice in facturas (D15, C18)', async () => {
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

    const exp = await consultarExpediente.consultar(idAna);

    expect(exp.facturas[0]).toMatchObject({ idVenta: idFContado, estado: 'PAGADA', saldo: 0 });
    expect(exp.abonos.map((a) => a.tipo)).not.toContain('PAGO_CONTADO');
  });
});
