import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { SqlJsDatabase } from '../../../testing/sqljs-sql-database.adapter';
import { fechaHora, pesos } from '../../shared/domain';
import { MIGRACIONES } from '../../shared/infrastructure/sqlite/migrations';
import { migrar } from '../../shared/infrastructure/sqlite/migrations/migration-runner';

import { AbonoRepository } from './abono.repository';

describe('AbonoRepository', () => {
  let db: SqlJsDatabase;
  let repo: AbonoRepository;

  beforeEach(async () => {
    db = await SqlJsDatabase.create();
    await migrar(db, MIGRACIONES);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [AbonoRepository],
    });
    repo = TestBed.inject(AbonoRepository);
  });

  it('inserts an abono with its invoice applications inside a transaction', async () => {
    const fecha = fechaHora('2026-11-15 10:00:00');
    const clienteRes = await db.run(
      `INSERT INTO clientes (nombre, telefono, es_mostrador, fecha_registro) VALUES (?, ?, 0, ?);`,
      ['Ana Pérez', '3001234567', fecha],
    );
    const idCliente = clienteRes.lastInsertId!;

    const ventaRes = await db.run(
      `INSERT INTO ventas (id_cliente, fecha_venta, total_venta, costo_total_base, monto_pagado, saldo_pendiente, estado_pago)
       VALUES (?, ?, 60000, 48000, 50000, 10000, 'PARCIAL');`,
      [idCliente, fecha],
    );
    const idVenta = ventaRes.lastInsertId!;

    const idAbono = await db.transaction((tx) =>
      repo.insertar(tx, {
        idCliente,
        fecha,
        monto: pesos(50000),
        medio: 'TRANSFERENCIA',
        tipo: 'ABONO_INICIAL',
        aplicaciones: [
          {
            idVenta,
            monto: pesos(50000),
            capital: pesos(48000),
            ganancia: pesos(2000),
          },
        ],
      }),
    );

    expect(idAbono).toBeGreaterThan(0);

    const abonos = await db.query<{
      id_abono: number;
      id_cliente: number;
      fecha_abono: string;
      monto_total_abonado: number;
      medio_pago: string;
      tipo_abono: string;
    }>('SELECT * FROM abonos WHERE id_abono = ?;', [idAbono]);
    expect(abonos).toEqual([
      {
        id_abono: idAbono,
        id_cliente: idCliente,
        fecha_abono: fecha,
        monto_total_abonado: 50000,
        medio_pago: 'TRANSFERENCIA',
        tipo_abono: 'ABONO_INICIAL',
      },
    ]);

    const detalles = await db.query<{
      id_abono: number;
      id_venta: number;
      monto_aplicado: number;
      capital_aplicado: number;
      ganancia_aplicada: number;
    }>(
      'SELECT id_abono, id_venta, monto_aplicado, capital_aplicado, ganancia_aplicada FROM abonos_detalle_facturas WHERE id_abono = ?;',
      [idAbono],
    );
    expect(detalles).toEqual([
      {
        id_abono: idAbono,
        id_venta: idVenta,
        monto_aplicado: 50000,
        capital_aplicado: 48000,
        ganancia_aplicada: 2000,
      },
    ]);
  });
});
