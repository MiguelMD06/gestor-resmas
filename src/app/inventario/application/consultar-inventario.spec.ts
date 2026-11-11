import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { SqlJsDatabase } from '../../../testing/sqljs-sql-database.adapter';
import { fechaHora, resmas } from '../../shared/domain';
import { MIGRACIONES } from '../../shared/infrastructure/sqlite/migrations';
import { migrar } from '../../shared/infrastructure/sqlite/migrations/migration-runner';
import { SQL_DATABASE } from '../../shared/infrastructure/sqlite/sql-database.token';
import { nuevoLote } from '../domain/lote';
import { LoteRepository } from '../infrastructure/lote.repository';

import { ConsultarInventario } from './consultar-inventario';

describe('ConsultarInventario', () => {
  let db: SqlJsDatabase;
  let lotesRepo: LoteRepository;
  let consultarInventario: ConsultarInventario;

  beforeEach(async () => {
    db = await SqlJsDatabase.create();
    await migrar(db, MIGRACIONES);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ConsultarInventario,
        LoteRepository,
        {
          provide: SQL_DATABASE,
          useValue: db,
        },
      ],
    });

    lotesRepo = TestBed.inject(LoteRepository);
    consultarInventario = TestBed.inject(ConsultarInventario);
  });

  it('returns active lots grouped by paper type excluding exhausted lots (E8)', async () => {
    const fecha = fechaHora('2026-11-10 10:00:00');

    // 1. Carta lot: 2 boxes at $120.000 -> 20 of 20 resmas, $12.000/resma
    const nuevoCarta = nuevoLote('CARTA', 2, 120000);
    const idCarta = await lotesRepo.insertar(db, nuevoCarta, fecha, 'EFECTIVO');

    // 2. Oficio lot: 1 box at $130.000 -> 10 resmas initially, deduct 3 -> 7 of 10 resmas, $13.000/resma
    const nuevoOficio = nuevoLote('OFICIO', 1, 130000);
    const idOficio = await lotesRepo.insertar(db, nuevoOficio, fecha, 'TRANSFERENCIA');
    await lotesRepo.descontar(db, idOficio, resmas(3));

    // 3. Carta lot exhausted: 1 box at $100.000 -> deduct all 10 resmas -> AGOTADO
    const nuevoAgotado = nuevoLote('CARTA', 1, 100000);
    const idAgotado = await lotesRepo.insertar(db, nuevoAgotado, fecha, 'EFECTIVO');
    await lotesRepo.descontar(db, idAgotado, resmas(10));

    // Execute use case
    const activos = await consultarInventario.activos();

    // Verify groups and counts
    expect(activos.CARTA).toHaveLength(1);
    expect(activos.OFICIO).toHaveLength(1);

    // Verify Carta lot
    expect(activos.CARTA[0]).toEqual({
      idLote: idCarta,
      tipoPapel: 'CARTA',
      fechaCompra: fecha,
      cantidadCajas: 2,
      costoPorCaja: 120000,
      costoUnitarioResma: 12000,
      resmasIniciales: 20,
      resmasDisponibles: 20,
      medioPagoCompra: 'EFECTIVO',
      estado: 'ACTIVO',
    });

    // Verify Oficio lot
    expect(activos.OFICIO[0]).toEqual({
      idLote: idOficio,
      tipoPapel: 'OFICIO',
      fechaCompra: fecha,
      cantidadCajas: 1,
      costoPorCaja: 130000,
      costoUnitarioResma: 13000,
      resmasIniciales: 10,
      resmasDisponibles: 7,
      medioPagoCompra: 'TRANSFERENCIA',
      estado: 'ACTIVO',
    });

    // Verify exhausted lot is not returned anywhere
    expect(activos.CARTA.some((l) => l.idLote === idAgotado)).toBe(false);
    expect(activos.OFICIO.some((l) => l.idLote === idAgotado)).toBe(false);
  });
});
