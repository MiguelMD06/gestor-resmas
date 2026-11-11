import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { SqlJsDatabase } from '../../../testing/sqljs-sql-database.adapter';
import { aporteCapital, cobro, verificarInvariante } from '../../finanzas/domain';
import { LibroRepository } from '../../finanzas/infrastructure/libro.repository';
import { fechaHora, pesos } from '../../shared/domain';
import { MIGRACIONES } from '../../shared/infrastructure/sqlite/migrations';
import { migrar } from '../../shared/infrastructure/sqlite/migrations/migration-runner';
import { SQL_DATABASE } from '../../shared/infrastructure/sqlite/sql-database.token';
import { LoteRepository } from '../infrastructure/lote.repository';

import { RegistrarCompra } from './registrar-compra';

describe('RegistrarCompra', () => {
  let db: SqlJsDatabase;
  let lotesRepo: LoteRepository;
  let libroRepo: LibroRepository;
  let casoDeUso: RegistrarCompra;

  const fechaDummy = fechaHora('2026-11-10 10:00:00');

  beforeEach(async () => {
    db = await SqlJsDatabase.create();
    await migrar(db, MIGRACIONES);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [RegistrarCompra, LoteRepository, LibroRepository, { provide: SQL_DATABASE, useValue: db }],
    });

    casoDeUso = TestBed.inject(RegistrarCompra);
    lotesRepo = TestBed.inject(LoteRepository);
    libroRepo = TestBed.inject(LibroRepository);
  });

  async function seedAbonoMostrador(monto: number, medio: 'EFECTIVO' | 'TRANSFERENCIA'): Promise<number> {
    const res = await db.run(
      `INSERT INTO abonos (id_cliente, fecha_abono, monto_total_abonado, medio_pago, tipo_abono)
       VALUES ((SELECT id_cliente FROM clientes WHERE es_mostrador = 1), ?, ?, ?, 'PAGO_CONTADO');`,
      [fechaDummy, monto, medio],
    );
    return res.lastInsertId!;
  }

  it('records a purchase of 2 Carta boxes in cash without reinvestment after an initial contribution (E2)', async () => {
    // E1: Aporte de $300.000 en efectivo
    await db.transaction(async (tx) => {
      const movAporte = aporteCapital(fechaDummy, 'EFECTIVO', pesos(300000));
      await libroRepo.registrar(tx, movAporte);
    });

    const saldosE1 = await libroRepo.saldos(db);
    expect(saldosE1).toEqual({
      efectivo: 300000,
      transferencia: 0,
      capitalEnCaja: 300000,
      gananciaLibre: 0,
    });

    // E2: Compra de 2 cajas Carta a $120.000 cada una en efectivo
    const { idLote, reinversion } = await casoDeUso.registrar({
      tipoPapel: 'CARTA',
      cajas: 2,
      costoPorCaja: 120000,
      fecha: fechaDummy,
      medio: 'EFECTIVO',
    });

    expect(idLote).toBeGreaterThan(0);
    expect(reinversion).toBe(0);

    const lote = await lotesRepo.porId(db, idLote);
    expect(lote).toEqual({
      idLote,
      tipoPapel: 'CARTA',
      fechaCompra: fechaDummy,
      cantidadCajas: 2,
      costoPorCaja: 120000,
      costoUnitarioResma: 12000,
      resmasIniciales: 20,
      resmasDisponibles: 20,
      medioPagoCompra: 'EFECTIVO',
      estado: 'ACTIVO',
    });

    const saldosE2 = await libroRepo.saldos(db);
    expect(saldosE2).toEqual({
      efectivo: 60000,
      transferencia: 0,
      capitalEnCaja: 60000,
      gananciaLibre: 0,
    });

    // Invariant check
    expect(() => verificarInvariante(saldosE2)).not.toThrow();
  });

  it('records purchase with reinvestment from free profit when capital is insufficient (E3)', async () => {
    // Prepare E3 balances:
    // 1. Aporte $100.000 in transferencia
    await db.transaction(async (tx) => {
      const movAporte = aporteCapital(fechaDummy, 'TRANSFERENCIA', pesos(100000));
      await libroRepo.registrar(tx, movAporte);
    });

    // 2. Cobro in transferencia: capital $0, ganancia $30.000
    const idAbono = await seedAbonoMostrador(30000, 'TRANSFERENCIA');
    await db.transaction(async (tx) => {
      const movCobro = cobro(fechaDummy, 'TRANSFERENCIA', pesos(0), pesos(30000), idAbono);
      await libroRepo.registrar(tx, movCobro);
    });

    const saldosPrevios = await libroRepo.saldos(db);
    expect(saldosPrevios).toEqual({
      efectivo: 0,
      transferencia: 130000,
      capitalEnCaja: 100000,
      gananciaLibre: 30000,
    });

    // E3: Compra 1 caja Oficio a $120.000 por transferencia
    const { idLote, reinversion } = await casoDeUso.registrar({
      tipoPapel: 'OFICIO',
      cajas: 1,
      costoPorCaja: 120000,
      fecha: fechaDummy,
      medio: 'TRANSFERENCIA',
    });

    expect(idLote).toBeGreaterThan(0);
    expect(reinversion).toBe(20000);

    const lote = await lotesRepo.porId(db, idLote);
    expect(lote).toEqual({
      idLote,
      tipoPapel: 'OFICIO',
      fechaCompra: fechaDummy,
      cantidadCajas: 1,
      costoPorCaja: 120000,
      costoUnitarioResma: 12000,
      resmasIniciales: 10,
      resmasDisponibles: 10,
      medioPagoCompra: 'TRANSFERENCIA',
      estado: 'ACTIVO',
    });

    const saldosFinales = await libroRepo.saldos(db);
    expect(saldosFinales).toEqual({
      efectivo: 0,
      transferencia: 10000,
      capitalEnCaja: 0,
      gananciaLibre: 10000,
    });

    expect(() => verificarInvariante(saldosFinales)).not.toThrow();
  });

  it('rejects purchase when pocket balance is insufficient (E4) and leaves lotes_cajas and movimientos_dinero intact', async () => {
    // Setup cash $50.000
    await db.transaction(async (tx) => {
      const movAporte = aporteCapital(fechaDummy, 'EFECTIVO', pesos(50000));
      await libroRepo.registrar(tx, movAporte);
    });

    const lotesAntes = await db.query<{ count: number }>('SELECT COUNT(*) AS count FROM lotes_cajas;');
    const movsAntes = await db.query<{ count: number }>('SELECT COUNT(*) AS count FROM movimientos_dinero;');

    await expect(
      casoDeUso.registrar({
        tipoPapel: 'CARTA',
        cajas: 1,
        costoPorCaja: 120000,
        fecha: fechaDummy,
        medio: 'EFECTIVO',
      }),
    ).rejects.toMatchObject({ codigo: 'SALDO_INSUFICIENTE' });

    const lotesDespues = await db.query<{ count: number }>('SELECT COUNT(*) AS count FROM lotes_cajas;');
    const movsDespues = await db.query<{ count: number }>('SELECT COUNT(*) AS count FROM movimientos_dinero;');

    expect(lotesDespues[0].count).toBe(lotesAntes[0].count);
    expect(movsDespues[0].count).toBe(movsAntes[0].count);
  });

  it('registrar rejects invalid box cost (E5) and invalid quantity (E6) without leaving rows in lotes_cajas or movimientos_dinero', async () => {
    const lotesAntes = await db.query<{ count: number }>('SELECT COUNT(*) AS count FROM lotes_cajas;');
    const movsAntes = await db.query<{ count: number }>('SELECT COUNT(*) AS count FROM movimientos_dinero;');

    // E5: COSTO_CAJA_INVALIDO ($120.005)
    await expect(
      casoDeUso.registrar({
        tipoPapel: 'CARTA',
        cajas: 1,
        costoPorCaja: 120005,
        fecha: fechaDummy,
        medio: 'EFECTIVO',
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'COSTO_CAJA_INVALIDO' }));

    // E6: CANTIDAD_INVALIDA (0 cajas)
    await expect(
      casoDeUso.registrar({
        tipoPapel: 'CARTA',
        cajas: 0,
        costoPorCaja: 120000,
        fecha: fechaDummy,
        medio: 'EFECTIVO',
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'CANTIDAD_INVALIDA' }));

    const lotesDespues = await db.query<{ count: number }>('SELECT COUNT(*) AS count FROM lotes_cajas;');
    const movsDespues = await db.query<{ count: number }>('SELECT COUNT(*) AS count FROM movimientos_dinero;');

    expect(lotesDespues[0].count).toBe(lotesAntes[0].count);
    expect(movsDespues[0].count).toBe(movsAntes[0].count);
  });

  it('previsualizar calculates values without modifying the database, reports reinversion in E3 and false alcanza in E4', async () => {
    // 1. In E3 conditions:
    await db.transaction(async (tx) => {
      const movAporte = aporteCapital(fechaDummy, 'TRANSFERENCIA', pesos(100000));
      await libroRepo.registrar(tx, movAporte);
    });
    const idAbono = await seedAbonoMostrador(30000, 'TRANSFERENCIA');
    await db.transaction(async (tx) => {
      const movCobro = cobro(fechaDummy, 'TRANSFERENCIA', pesos(0), pesos(30000), idAbono);
      await libroRepo.registrar(tx, movCobro);
    });

    const movsAntesPrevisualizar = await db.query<{ count: number }>(
      'SELECT COUNT(*) AS count FROM movimientos_dinero;',
    );

    const prevE3 = await casoDeUso.previsualizar({
      tipoPapel: 'OFICIO',
      cajas: 1,
      costoPorCaja: 120000,
      medio: 'TRANSFERENCIA',
    });

    expect(prevE3).toEqual({
      costoTotal: 120000,
      costoUnitarioResma: 12000,
      reinversion: 20000,
      saldoBolsillo: 130000,
      alcanza: true,
    });

    // 2. In E4 conditions (cash is 0):
    const prevE4 = await casoDeUso.previsualizar({
      tipoPapel: 'CARTA',
      cajas: 1,
      costoPorCaja: 120000,
      medio: 'EFECTIVO',
    });

    expect(prevE4).toEqual({
      costoTotal: 120000,
      costoUnitarioResma: 12000,
      reinversion: 0,
      saldoBolsillo: 0,
      alcanza: false,
    });

    // 3. Verify no rows were created by previsualizar
    const lotesCount = await db.query<{ count: number }>('SELECT COUNT(*) AS count FROM lotes_cajas;');
    expect(lotesCount[0].count).toBe(0);

    const movsCount = await db.query<{ count: number }>('SELECT COUNT(*) AS count FROM movimientos_dinero;');
    expect(movsCount[0].count).toBe(movsAntesPrevisualizar[0].count);

    // 4. Input validations still throw in previsualizar
    await expect(
      casoDeUso.previsualizar({
        tipoPapel: 'CARTA',
        cajas: 0,
        costoPorCaja: 120000,
        medio: 'EFECTIVO',
      }),
    ).rejects.toMatchObject({ codigo: 'CANTIDAD_INVALIDA' });

    await expect(
      casoDeUso.previsualizar({
        tipoPapel: 'CARTA',
        cajas: 1,
        costoPorCaja: 120005,
        medio: 'EFECTIVO',
      }),
    ).rejects.toMatchObject({ codigo: 'COSTO_CAJA_INVALIDO' });
  });
});
