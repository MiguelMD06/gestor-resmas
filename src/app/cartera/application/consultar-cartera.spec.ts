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

    await db.run(
      `INSERT INTO clientes (nombre, telefono, es_mostrador, fecha_registro) VALUES ('Beto', '3002223344', 0, ?);`,
      [fechaF1],
    );
    await db.run(
      `INSERT INTO clientes (nombre, telefono, es_mostrador, fecha_registro) VALUES ('Carla', '3003334455', 0, ?);`,
      [fechaF1],
    );

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
  });

  it('returns total debt and map with only customers who owe money, updating after a payment (S2, C16)', async () => {
    const inicial = await consultarCartera.consultar();

    expect(inicial.total).toBe(40000);
    expect(inicial.porCliente.size).toBe(1);
    expect(inicial.porCliente.get(idAna)).toBe(40000);

    await registrarAbono.registrar({
      modo: 'CASCADA_GLOBAL',
      idCliente: idAna,
      fecha: ahora,
      medio: 'EFECTIVO',
      monto: pesos(35000),
    });

    const despues = await consultarCartera.consultar();
    expect(despues.total).toBe(5000);
    expect(despues.porCliente.get(idAna)).toBe(5000);
  });
});
