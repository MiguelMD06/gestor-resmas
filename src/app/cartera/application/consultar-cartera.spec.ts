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

import { ConsultarCartera } from './consultar-cartera';
import { RegistrarAbono } from './registrar-abono';

describe('ConsultarCartera', () => {
  let db: SqlJsDatabase;
  let consultarCartera: ConsultarCartera;
  let registrarAbono: RegistrarAbono;

  let idAna: number;
  let idBeto: number;
  let idCarla: number;

  const ahora = fechaHora('2026-11-20 12:00:00');
  const fechaF1 = fechaHora('2026-11-01 10:00:00');
  const fechaF2 = fechaHora('2026-11-10 10:00:00');

  beforeEach(async () => {
    db = await SqlJsDatabase.create();
    await migrar(db, MIGRACIONES);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ConsultarCartera,
        RegistrarAbono,
        CarteraRepository,
        AbonoRepository,
        ClienteRepository,
        LibroRepository,
        { provide: SQL_DATABASE, useValue: db },
        { provide: CLOCK, useValue: { ahora: () => ahora } },
      ],
    });

    consultarCartera = TestBed.inject(ConsultarCartera);
    registrarAbono = TestBed.inject(RegistrarAbono);

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
    const carlaRes = await db.run(
      `INSERT INTO clientes (nombre, telefono, es_mostrador, fecha_registro) VALUES ('Carla', '3003334455', 0, ?);`,
      [fechaF1],
    );
    idCarla = carlaRes.lastInsertId!;

    await db.run(
      `INSERT INTO ventas (id_cliente, fecha_venta, total_venta, costo_total_base, monto_pagado, saldo_pendiente, estado_pago)
       VALUES (?, ?, 30000, 20000, 0, 30000, 'PENDIENTE');`,
      [idAna, fechaF1],
    );
    await db.run(
      `INSERT INTO ventas (id_cliente, fecha_venta, total_venta, costo_total_base, monto_pagado, saldo_pendiente, estado_pago)
       VALUES (?, ?, 15000, 10000, 5000, 10000, 'PARCIAL');`,
      [idAna, fechaF2],
    );
    await db.run(
      `INSERT INTO ventas (id_cliente, fecha_venta, total_venta, costo_total_base, monto_pagado, saldo_pendiente, estado_pago)
       VALUES (?, ?, 22000, 15000, 0, 22000, 'PENDIENTE');`,
      [idCarla, fechaF2],
    );
  });

  it('returns total debt and map with debt and invoice count per customer, updating after a payment (S2, C1)', async () => {
    const inicial = await consultarCartera.consultar();

    expect(inicial.total).toBe(62000);
    expect(inicial.porCliente.size).toBe(2);
    expect(inicial.porCliente.get(idAna)).toEqual({ deuda: pesos(40000), facturas: 2 });
    expect(inicial.porCliente.get(idCarla)).toEqual({ deuda: pesos(22000), facturas: 1 });
    expect(inicial.porCliente.has(idBeto)).toBe(false);

    await registrarAbono.registrar({
      modo: 'CASCADA_GLOBAL',
      idCliente: idAna,
      fecha: ahora,
      medio: 'EFECTIVO',
      monto: pesos(35000),
    });

    const despues = await consultarCartera.consultar();
    expect(despues.total).toBe(27000);
    expect(despues.porCliente.get(idAna)).toEqual({ deuda: pesos(5000), facturas: 1 });
    expect(despues.porCliente.get(idCarla)).toEqual({ deuda: pesos(22000), facturas: 1 });
  });
});
