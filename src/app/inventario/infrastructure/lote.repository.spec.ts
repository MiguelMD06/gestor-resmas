import { beforeEach, describe, expect, it } from 'vitest';

import { SqlJsDatabase } from '../../../testing/sqljs-sql-database.adapter';
import { fechaHora, resmas } from '../../shared/domain';
import { MIGRACIONES } from '../../shared/infrastructure/sqlite/migrations';
import { migrar } from '../../shared/infrastructure/sqlite/migrations/migration-runner';
import { nuevoLote } from '../domain/lote';

import { LoteRepository } from './lote.repository';

describe('LoteRepository', () => {
  let db: SqlJsDatabase;
  let repo: LoteRepository;

  beforeEach(async () => {
    db = await SqlJsDatabase.create();
    await migrar(db, MIGRACIONES);
    repo = new LoteRepository();
  });

  it('insertar and porId persist and retrieve all lot fields accurately', async () => {
    const nuevo = nuevoLote('CARTA', 2, 120000);
    const fecha = fechaHora('2026-11-10 10:00:00');

    const idLote = await repo.insertar(db, nuevo, fecha, 'EFECTIVO');
    expect(idLote).toBeGreaterThan(0);

    const recuperado = await repo.porId(db, idLote);
    expect(recuperado).toEqual({
      idLote,
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
  });

  it('porId returns null when the lot does not exist', async () => {
    const inexistente = await repo.porId(db, 9999);
    expect(inexistente).toBeNull();
  });

  it('activos excludes exhausted lots and sorts two lots with the same date by id ascending', async () => {
    const fecha1 = fechaHora('2026-11-10 10:00:00');
    const fecha2 = fechaHora('2026-11-10 12:00:00');

    const nuevoCarta1 = nuevoLote('CARTA', 1, 120000);
    const nuevoCarta2 = nuevoLote('CARTA', 2, 120000);
    const nuevoOficio = nuevoLote('OFICIO', 1, 130000);
    const nuevoAgotado = nuevoLote('CARTA', 1, 100000);

    const id1 = await repo.insertar(db, nuevoCarta1, fecha1, 'EFECTIVO');
    const id2 = await repo.insertar(db, nuevoCarta2, fecha1, 'TRANSFERENCIA');
    const id3 = await repo.insertar(db, nuevoOficio, fecha2, 'TRANSFERENCIA');
    const idAgotar = await repo.insertar(db, nuevoAgotado, fecha1, 'EFECTIVO');

    // Deduct all 10 reams so idAgotar transitions to AGOTADO
    await repo.descontar(db, idAgotar, resmas(10));

    const listaActivos = await repo.activos(db);

    expect(listaActivos.some((l) => l.idLote === idAgotar)).toBe(false);
    expect(listaActivos.map((l) => l.idLote)).toEqual([id1, id2, id3]);
    expect(listaActivos[0].idLote).toBe(id1);
    expect(listaActivos[1].idLote).toBe(id2);
  });

  it('descontar sets reams to 0 and state to AGOTADO (E7), preserving the row in lotes_cajas', async () => {
    const nuevo = nuevoLote('CARTA', 1, 120000);
    const fecha = fechaHora('2026-11-10 10:00:00');
    const idLote = await repo.insertar(db, nuevo, fecha, 'EFECTIVO');

    // First deduct 7 so it has 3 left
    await repo.descontar(db, idLote, resmas(7));
    const intermedio = await repo.porId(db, idLote);
    expect(intermedio?.resmasDisponibles).toBe(3);
    expect(intermedio?.estado).toBe('ACTIVO');

    // Deduct remaining 3 reams (E7)
    const actualizado = await repo.descontar(db, idLote, resmas(3));
    expect(actualizado).toEqual({
      idLote,
      tipoPapel: 'CARTA',
      fechaCompra: fecha,
      cantidadCajas: 1,
      costoPorCaja: 120000,
      costoUnitarioResma: 12000,
      resmasIniciales: 10,
      resmasDisponibles: 0,
      medioPagoCompra: 'EFECTIVO',
      estado: 'AGOTADO',
    });

    // The row must still exist in lotes_cajas
    const rowInDb = await repo.porId(db, idLote);
    expect(rowInDb).not.toBeNull();
    expect(rowInDb?.estado).toBe('AGOTADO');
    expect(rowInDb?.resmasDisponibles).toBe(0);

    const rawRows = await db.query<{ id_lote: number; estado: string }>(
      'SELECT id_lote, estado FROM lotes_cajas WHERE id_lote = ?;',
      [idLote],
    );
    expect(rawRows).toHaveLength(1);
    expect(rawRows[0].estado).toBe('AGOTADO');
  });

  it('descontar throws an Error in English if the lot does not exist', async () => {
    await expect(repo.descontar(db, 9999, resmas(1))).rejects.toThrow('Lot not found with id: 9999');
  });
});
