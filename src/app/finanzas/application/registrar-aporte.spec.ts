import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { SqlJsDatabase } from '../../../testing/sqljs-sql-database.adapter';
import { fechaHora, pesos } from '../../shared/domain';
import { MIGRACIONES } from '../../shared/infrastructure/sqlite/migrations';
import { migrar } from '../../shared/infrastructure/sqlite/migrations/migration-runner';
import { SQL_DATABASE } from '../../shared/infrastructure/sqlite/sql-database.token';
import { LibroRepository } from '../infrastructure/libro.repository';

import { ConsultarSaldos } from './consultar-saldos';
import { RegistrarAporte } from './registrar-aporte';

describe('RegistrarAporte and ConsultarSaldos', () => {
  let db: SqlJsDatabase;
  let libroRepo: LibroRepository;
  let registrarAporte: RegistrarAporte;
  let consultarSaldos: ConsultarSaldos;

  beforeEach(async () => {
    db = await SqlJsDatabase.create();
    await migrar(db, MIGRACIONES);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [RegistrarAporte, ConsultarSaldos, LibroRepository, { provide: SQL_DATABASE, useValue: db }],
    });

    registrarAporte = TestBed.inject(RegistrarAporte);
    consultarSaldos = TestBed.inject(ConsultarSaldos);
    libroRepo = TestBed.inject(LibroRepository);
  });

  it('records initial capital contribution of $300.000 in cash resulting in $300.000 cash and capital, and $0 profit (E1)', async () => {
    const fecha = fechaHora('2026-11-10 09:00:00');
    const idMovimiento = await registrarAporte.registrar({
      fecha,
      medio: 'EFECTIVO',
      monto: pesos(300000),
    });

    expect(idMovimiento).toBeGreaterThan(0);

    const saldos = await consultarSaldos.saldos();
    expect(saldos).toEqual({
      efectivo: 300000,
      transferencia: 0,
      capitalEnCaja: 300000,
      gananciaLibre: 0,
    });
  });

  it('rejects an amount of 0 with MONTO_INVALIDO and leaves movements table empty', async () => {
    const fecha = fechaHora('2026-11-10 09:00:00');

    await expect(
      registrarAporte.registrar({
        fecha,
        medio: 'EFECTIVO',
        monto: pesos(0),
      }),
    ).rejects.toMatchObject({ codigo: 'MONTO_INVALIDO' });

    const rows = await db.query<{ count: number }>('SELECT COUNT(*) AS count FROM movimientos_dinero;');
    expect(rows[0].count).toBe(0);
  });

  it('consultarSaldos returns identical result to libro.saldos(db)', async () => {
    const saldosDirecto = await libroRepo.saldos(db);
    const saldosCasoUso = await consultarSaldos.saldos();

    expect(saldosCasoUso).toEqual(saldosDirecto);
  });
});
