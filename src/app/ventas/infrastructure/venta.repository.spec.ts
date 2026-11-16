import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { SqlJsDatabase } from '../../../testing/sqljs-sql-database.adapter';
import { fechaHora, pesos, resmas } from '../../shared/domain';
import { MIGRACIONES } from '../../shared/infrastructure/sqlite/migrations';
import { migrar } from '../../shared/infrastructure/sqlite/migrations/migration-runner';
import { armarVenta } from '../domain/venta';

import { VentaRepository } from './venta.repository';

describe('VentaRepository', () => {
  let db: SqlJsDatabase;
  let repo: VentaRepository;

  beforeEach(async () => {
    db = await SqlJsDatabase.create();
    await migrar(db, MIGRACIONES);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [VentaRepository],
    });
    repo = TestBed.inject(VentaRepository);
  });

  it('esMostrador returns true for counter customer, false for regular customer and null when missing', async () => {
    const fecha = fechaHora('2026-11-15 10:00:00');
    const anaRes = await db.run(
      `INSERT INTO clientes (nombre, telefono, es_mostrador, fecha_registro) VALUES (?, ?, 0, ?);`,
      ['Ana Pérez', '3001234567', fecha],
    );

    expect(await repo.esMostrador(db, 1)).toBe(true);
    expect(await repo.esMostrador(db, anaRes.lastInsertId!)).toBe(false);
    expect(await repo.esMostrador(db, 9999)).toBeNull();
  });

  it('inserts a sale and its detail lines inside a transaction', async () => {
    const fecha = fechaHora('2026-11-15 10:00:00');
    const loteRes = await db.run(
      `INSERT INTO lotes_cajas (tipo_papel, fecha_compra, cantidad_cajas, costo_por_caja, costo_unitario_resma, resmas_iniciales, resmas_disponibles, medio_pago_compra, estado)
       VALUES ('CARTA', ?, 2, 120000, 12000, 20, 20, 'EFECTIVO', 'ACTIVO');`,
      [fecha],
    );
    const idLote = loteRes.lastInsertId!;

    const venta = armarVenta({
      idCliente: 1,
      esMostrador: true,
      fecha,
      ahora: fecha,
      lineas: [{ idLote, costoUnitario: pesos(12000), disponibles: resmas(20), cantidad: 5, precioUnitario: 15000 }],
      pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
    });

    const idVenta = await db.transaction((tx) => repo.insertar(tx, venta, 1, fecha));
    expect(idVenta).toBeGreaterThan(0);

    const ventas = await db.query<{
      id_venta: number;
      id_cliente: number;
      fecha_venta: string;
      total_venta: number;
      costo_total_base: number;
      monto_pagado: number;
      saldo_pendiente: number;
      estado_pago: string;
    }>('SELECT * FROM ventas WHERE id_venta = ?;', [idVenta]);
    expect(ventas).toEqual([
      {
        id_venta: idVenta,
        id_cliente: 1,
        fecha_venta: fecha,
        total_venta: 75000,
        costo_total_base: 60000,
        monto_pagado: 75000,
        saldo_pendiente: 0,
        estado_pago: 'PAGADA',
      },
    ]);

    const detalles = await db.query<{
      id_venta: number;
      id_lote: number;
      cantidad_resmas: number;
      costo_unitario_lote: number;
      precio_unitario_venta: number;
      subtotal_venta: number;
      subtotal_costo: number;
    }>(
      'SELECT id_venta, id_lote, cantidad_resmas, costo_unitario_lote, precio_unitario_venta, subtotal_venta, subtotal_costo FROM detalle_ventas WHERE id_venta = ?;',
      [idVenta],
    );
    expect(detalles).toEqual([
      {
        id_venta: idVenta,
        id_lote: idLote,
        cantidad_resmas: 5,
        costo_unitario_lote: 12000,
        precio_unitario_venta: 15000,
        subtotal_venta: 75000,
        subtotal_costo: 60000,
      },
    ]);
  });
});
