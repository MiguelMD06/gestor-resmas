import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { SqlJsDatabase } from '../testing/sqljs-sql-database.adapter';

import { cobro, LibroRepository, verificarInvariante } from './finanzas';
import { ConsultarSaldos, RegistrarAporte } from './finanzas/application';
import { ConsultarInventario, LoteRepository, RegistrarCompra } from './inventario';
import { fechaHora, pesos, resmas } from './shared/domain';
import { MIGRACIONES } from './shared/infrastructure/sqlite/migrations';
import { migrar } from './shared/infrastructure/sqlite/migrations/migration-runner';
import { SQL_DATABASE } from './shared/infrastructure/sqlite/sql-database.token';

describe('Independent verification V2: Acceptance examples E1-E7 via public API', () => {
  let db: SqlJsDatabase;
  let registrarAporte: RegistrarAporte;
  let consultarSaldos: ConsultarSaldos;
  let registrarCompra: RegistrarCompra;
  let consultarInventario: ConsultarInventario;
  let loteRepo: LoteRepository;
  let libroRepo: LibroRepository;

  const fechaPrueba = fechaHora('2026-11-11 08:00:00');

  beforeEach(async () => {
    db = await SqlJsDatabase.create();
    await migrar(db, MIGRACIONES);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        RegistrarAporte,
        ConsultarSaldos,
        RegistrarCompra,
        ConsultarInventario,
        LoteRepository,
        LibroRepository,
        { provide: SQL_DATABASE, useValue: db },
      ],
    });

    registrarAporte = TestBed.inject(RegistrarAporte);
    consultarSaldos = TestBed.inject(ConsultarSaldos);
    registrarCompra = TestBed.inject(RegistrarCompra);
    consultarInventario = TestBed.inject(ConsultarInventario);
    loteRepo = TestBed.inject(LoteRepository);
    libroRepo = TestBed.inject(LibroRepository);
  });

  async function seedAbonoMostrador(monto: number, medio: 'EFECTIVO' | 'TRANSFERENCIA'): Promise<number> {
    const res = await db.run(
      `INSERT INTO abonos (id_cliente, fecha_abono, monto_total_abonado, medio_pago, tipo_abono)
       VALUES ((SELECT id_cliente FROM clientes WHERE es_mostrador = 1), ?, ?, ?, 'PAGO_CONTADO');`,
      [fechaPrueba, monto, medio],
    );
    return res.lastInsertId!;
  }

  it('E1 & E2: starts at zero, records $300.000 cash contribution (E1), and buys 2 Carta boxes at $120.000 each in cash without reinvestment (E2)', async () => {
    const saldosIniciales = await consultarSaldos.saldos();
    expect(saldosIniciales).toEqual({
      efectivo: 0,
      transferencia: 0,
      capitalEnCaja: 0,
      gananciaLibre: 0,
    });

    // E1: Aporte de capital de $300.000 en efectivo
    const idMovAporte = await registrarAporte.registrar({
      fecha: fechaPrueba,
      medio: 'EFECTIVO',
      monto: pesos(300000),
    });
    expect(idMovAporte).toBeGreaterThan(0);

    const saldosE1 = await consultarSaldos.saldos();
    expect(saldosE1).toEqual({
      efectivo: 300000,
      transferencia: 0,
      capitalEnCaja: 300000,
      gananciaLibre: 0,
    });
    expect(() => verificarInvariante(saldosE1)).not.toThrow();

    // Preview E2 before saving
    const previewE2 = await registrarCompra.previsualizar({
      tipoPapel: 'CARTA',
      cajas: 2,
      costoPorCaja: 120000,
      medio: 'EFECTIVO',
    });
    expect(previewE2).toEqual({
      costoTotal: 240000,
      costoUnitarioResma: 12000,
      reinversion: 0,
      saldoBolsillo: 300000,
      alcanza: true,
    });

    // E2: Compra de 2 cajas Carta a $120.000 cada una en efectivo
    const { idLote, reinversion } = await registrarCompra.registrar({
      tipoPapel: 'CARTA',
      cajas: 2,
      costoPorCaja: 120000,
      fecha: fechaPrueba,
      medio: 'EFECTIVO',
    });

    expect(idLote).toBeGreaterThan(0);
    expect(reinversion).toBe(0);

    const activos = await consultarInventario.activos();
    expect(activos.CARTA).toEqual([
      {
        idLote,
        tipoPapel: 'CARTA',
        fechaCompra: fechaPrueba,
        cantidadCajas: 2,
        costoPorCaja: 120000,
        costoUnitarioResma: 12000,
        resmasIniciales: 20,
        resmasDisponibles: 20,
        medioPagoCompra: 'EFECTIVO',
        estado: 'ACTIVO',
      },
    ]);
    expect(activos.OFICIO).toEqual([]);

    const saldosE2 = await consultarSaldos.saldos();
    expect(saldosE2).toEqual({
      efectivo: 60000,
      transferencia: 0,
      capitalEnCaja: 60000,
      gananciaLibre: 0,
    });
    expect(() => verificarInvariante(saldosE2)).not.toThrow();
  });

  it('E3: with $100.000 capital, $30.000 free profit and $130.000 in transfer, buying 1 Oficio box at $120.000 reinvests $20.000 from free profit', async () => {
    await registrarAporte.registrar({
      fecha: fechaPrueba,
      medio: 'TRANSFERENCIA',
      monto: pesos(100000),
    });

    const idAbono = await seedAbonoMostrador(30000, 'TRANSFERENCIA');
    await db.transaction(async (tx) => {
      await libroRepo.registrar(tx, cobro(fechaPrueba, 'TRANSFERENCIA', pesos(0), pesos(30000), idAbono));
    });

    const saldosPrevios = await consultarSaldos.saldos();
    expect(saldosPrevios).toEqual({
      efectivo: 0,
      transferencia: 130000,
      capitalEnCaja: 100000,
      gananciaLibre: 30000,
    });

    const previewE3 = await registrarCompra.previsualizar({
      tipoPapel: 'OFICIO',
      cajas: 1,
      costoPorCaja: 120000,
      medio: 'TRANSFERENCIA',
    });
    expect(previewE3).toEqual({
      costoTotal: 120000,
      costoUnitarioResma: 12000,
      reinversion: 20000,
      saldoBolsillo: 130000,
      alcanza: true,
    });

    const { idLote, reinversion } = await registrarCompra.registrar({
      tipoPapel: 'OFICIO',
      cajas: 1,
      costoPorCaja: 120000,
      fecha: fechaPrueba,
      medio: 'TRANSFERENCIA',
    });

    expect(reinversion).toBe(20000);

    const activos = await consultarInventario.activos();
    expect(activos.OFICIO).toEqual([
      {
        idLote,
        tipoPapel: 'OFICIO',
        fechaCompra: fechaPrueba,
        cantidadCajas: 1,
        costoPorCaja: 120000,
        costoUnitarioResma: 12000,
        resmasIniciales: 10,
        resmasDisponibles: 10,
        medioPagoCompra: 'TRANSFERENCIA',
        estado: 'ACTIVO',
      },
    ]);

    const saldosFinales = await consultarSaldos.saldos();
    expect(saldosFinales).toEqual({
      efectivo: 0,
      transferencia: 10000,
      capitalEnCaja: 0,
      gananciaLibre: 10000,
    });
    expect(() => verificarInvariante(saldosFinales)).not.toThrow();
  });

  it('E4: with $50.000 in cash, buying 1 box at $120.000 in cash rejects with SALDO_INSUFICIENTE and leaves lotes_cajas and movimientos_dinero unchanged', async () => {
    await registrarAporte.registrar({
      fecha: fechaPrueba,
      medio: 'EFECTIVO',
      monto: pesos(50000),
    });

    const lotesAntes = await db.query<Record<string, unknown>>('SELECT * FROM lotes_cajas ORDER BY id_lote;');
    const movsAntes = await db.query<Record<string, unknown>>(
      'SELECT * FROM movimientos_dinero ORDER BY id_movimiento;',
    );

    const previewE4 = await registrarCompra.previsualizar({
      tipoPapel: 'CARTA',
      cajas: 1,
      costoPorCaja: 120000,
      medio: 'EFECTIVO',
    });
    expect(previewE4).toEqual({
      costoTotal: 120000,
      costoUnitarioResma: 12000,
      reinversion: 0,
      saldoBolsillo: 50000,
      alcanza: false,
    });

    await expect(
      registrarCompra.registrar({
        tipoPapel: 'CARTA',
        cajas: 1,
        costoPorCaja: 120000,
        fecha: fechaPrueba,
        medio: 'EFECTIVO',
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'SALDO_INSUFICIENTE' }));

    const lotesDespues = await db.query<Record<string, unknown>>('SELECT * FROM lotes_cajas ORDER BY id_lote;');
    const movsDespues = await db.query<Record<string, unknown>>(
      'SELECT * FROM movimientos_dinero ORDER BY id_movimiento;',
    );

    expect(lotesDespues).toEqual(lotesAntes);
    expect(movsDespues).toEqual(movsAntes);
  });

  it('E5: buying with box cost $120.005 rejects with COSTO_CAJA_INVALIDO', async () => {
    await expect(
      registrarCompra.previsualizar({
        tipoPapel: 'CARTA',
        cajas: 1,
        costoPorCaja: 120005,
        medio: 'EFECTIVO',
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'COSTO_CAJA_INVALIDO' }));

    await expect(
      registrarCompra.registrar({
        tipoPapel: 'CARTA',
        cajas: 1,
        costoPorCaja: 120005,
        fecha: fechaPrueba,
        medio: 'EFECTIVO',
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'COSTO_CAJA_INVALIDO' }));
  });

  it('E6: buying 0 boxes rejects with CANTIDAD_INVALIDA', async () => {
    await expect(
      registrarCompra.previsualizar({
        tipoPapel: 'CARTA',
        cajas: 0,
        costoPorCaja: 120000,
        medio: 'EFECTIVO',
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'CANTIDAD_INVALIDA' }));

    await expect(
      registrarCompra.registrar({
        tipoPapel: 'CARTA',
        cajas: 0,
        costoPorCaja: 120000,
        fecha: fechaPrueba,
        medio: 'EFECTIVO',
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'CANTIDAD_INVALIDA' }));
  });

  it('E7: for a lot with 3 available reams, deducting 4 rejects with STOCK_INSUFICIENTE and deducting 3 sets state to AGOTADO with 0 reams while keeping the row in the table', async () => {
    await registrarAporte.registrar({
      fecha: fechaPrueba,
      medio: 'EFECTIVO',
      monto: pesos(120000),
    });

    const { idLote } = await registrarCompra.registrar({
      tipoPapel: 'CARTA',
      cajas: 1,
      costoPorCaja: 120000,
      fecha: fechaPrueba,
      medio: 'EFECTIVO',
    });

    // Leave the lot with 3 available reams
    await db.transaction(async (tx) => {
      await loteRepo.descontar(tx, idLote, resmas(7));
    });

    const loteConTres = await loteRepo.porId(db, idLote);
    expect(loteConTres?.resmasDisponibles).toBe(3);
    expect(loteConTres?.estado).toBe('ACTIVO');

    // Deducting 4 from the lot with 3 available rejects with STOCK_INSUFICIENTE
    await expect(
      db.transaction(async (tx) => {
        await loteRepo.descontar(tx, idLote, resmas(4));
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'STOCK_INSUFICIENTE' }));

    // Deducting 3 from the lot with 3 available transitions it to AGOTADO with 0 reams
    const loteAgotado = await db.transaction(async (tx) => {
      return loteRepo.descontar(tx, idLote, resmas(3));
    });

    expect(loteAgotado.resmasDisponibles).toBe(0);
    expect(loteAgotado.estado).toBe('AGOTADO');

    // No longer appears in active lots
    const activos = await consultarInventario.activos();
    expect(activos.CARTA).toEqual([]);

    // Still exists in the table
    const enTabla = await loteRepo.porId(db, idLote);
    expect(enTabla).toEqual({
      idLote,
      tipoPapel: 'CARTA',
      fechaCompra: fechaPrueba,
      cantidadCajas: 1,
      costoPorCaja: 120000,
      costoUnitarioResma: 12000,
      resmasIniciales: 10,
      resmasDisponibles: 0,
      medioPagoCompra: 'EFECTIVO',
      estado: 'AGOTADO',
    });
  });
});
