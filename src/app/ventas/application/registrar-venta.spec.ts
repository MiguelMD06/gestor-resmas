import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { SqlJsDatabase } from '../../../testing/sqljs-sql-database.adapter';
import { AbonoRepository } from '../../cartera';
import { RegistrarAporte, verificarInvariante } from '../../finanzas';
import { LibroRepository } from '../../finanzas/infrastructure/libro.repository';
import { RegistrarCompra } from '../../inventario/application/registrar-compra';
import { LoteRepository } from '../../inventario/infrastructure/lote.repository';
import { fechaHora, pesos, type FechaHora } from '../../shared/domain';
import { CLOCK } from '../../shared/infrastructure/clock/clock.token';
import { MIGRACIONES } from '../../shared/infrastructure/sqlite/migrations';
import { migrar } from '../../shared/infrastructure/sqlite/migrations/migration-runner';
import { SQL_DATABASE } from '../../shared/infrastructure/sqlite/sql-database.token';
import { VentaRepository } from '../infrastructure/venta.repository';

import { RegistrarVenta } from './registrar-venta';

describe('RegistrarVenta', () => {
  let db: SqlJsDatabase;
  let registrarVenta: RegistrarVenta;
  let loteRepo: LoteRepository;
  let libroRepo: LibroRepository;
  let ahoraActual: FechaHora;

  let idAna: number;
  let idLoteA: number;
  let idLoteB: number;

  const fechaSetup = fechaHora('2026-11-10 09:00:00');
  const fechaAhora = fechaHora('2026-11-15 12:00:00');

  beforeEach(async () => {
    ahoraActual = fechaAhora;
    db = await SqlJsDatabase.create();
    await migrar(db, MIGRACIONES);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        RegistrarAporte,
        RegistrarCompra,
        RegistrarVenta,
        LoteRepository,
        LibroRepository,
        VentaRepository,
        AbonoRepository,
        { provide: SQL_DATABASE, useValue: db },
        { provide: CLOCK, useValue: { ahora: () => ahoraActual } },
      ],
    });

    const registrarAporte = TestBed.inject(RegistrarAporte);
    const registrarCompra = TestBed.inject(RegistrarCompra);
    registrarVenta = TestBed.inject(RegistrarVenta);
    loteRepo = TestBed.inject(LoteRepository);
    libroRepo = TestBed.inject(LibroRepository);

    // Base state: $400.000 contribution + Lot A (2 boxes Carta @ $120.000) + Lot B (1 box Carta @ $130.000)
    await registrarAporte.registrar({
      fecha: fechaSetup,
      medio: 'EFECTIVO',
      monto: pesos(400000),
    });

    const compraA = await registrarCompra.registrar({
      tipoPapel: 'CARTA',
      cajas: 2,
      costoPorCaja: 120000,
      fecha: fechaSetup,
      medio: 'EFECTIVO',
    });
    idLoteA = compraA.idLote;

    const compraB = await registrarCompra.registrar({
      tipoPapel: 'CARTA',
      cajas: 1,
      costoPorCaja: 130000,
      fecha: fechaSetup,
      medio: 'EFECTIVO',
    });
    idLoteB = compraB.idLote;

    // Seed Ana directly (B3.1 develops ClienteRepository in parallel)
    const anaRes = await db.run(
      `INSERT INTO clientes (nombre, telefono, es_mostrador, fecha_registro) VALUES (?, ?, 0, ?);`,
      ['Ana Pérez', '3001234567', fechaSetup],
    );
    idAna = anaRes.lastInsertId!;
  });

  async function snapshotTablas() {
    const [ventas, detalleVentas, lotesCajas, abonos, abonosDetalle, movimientos] = await Promise.all([
      db.query('SELECT * FROM ventas ORDER BY id_venta;'),
      db.query('SELECT * FROM detalle_ventas ORDER BY id_detalle;'),
      db.query('SELECT * FROM lotes_cajas ORDER BY id_lote;'),
      db.query('SELECT * FROM abonos ORDER BY id_abono;'),
      db.query('SELECT * FROM abonos_detalle_facturas ORDER BY id_abono_detalle;'),
      db.query('SELECT * FROM movimientos_dinero ORDER BY id_movimiento;'),
    ]);
    return { ventas, detalleVentas, lotesCajas, abonos, abonosDetalle, movimientos };
  }

  it('registers a cash sale to Ana, updates stock, abono and libro, and preserves invariant (E6, S2, S3, S8, S10)', async () => {
    const { idVenta } = await registrarVenta.registrar({
      idCliente: idAna,
      fecha: fechaAhora,
      lineas: [{ idLote: idLoteA, cantidad: 5, precioUnitario: 15000 }],
      pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
    });

    expect(idVenta).toBeGreaterThan(0);

    const ventas = await db.query<{
      id_venta: number;
      id_cliente: number;
      total_venta: number;
      costo_total_base: number;
      monto_pagado: number;
      saldo_pendiente: number;
      estado_pago: string;
    }>('SELECT * FROM ventas WHERE id_venta = ?;', [idVenta]);
    expect(ventas[0]).toMatchObject({
      id_venta: idVenta,
      id_cliente: idAna,
      total_venta: 75000,
      costo_total_base: 60000,
      monto_pagado: 75000,
      saldo_pendiente: 0,
      estado_pago: 'PAGADA',
    });

    const detalles = await db.query<{
      id_lote: number;
      cantidad_resmas: number;
      costo_unitario_lote: number;
      precio_unitario_venta: number;
      subtotal_venta: number;
      subtotal_costo: number;
    }>('SELECT * FROM detalle_ventas WHERE id_venta = ?;', [idVenta]);
    expect(detalles).toHaveLength(1);
    expect(detalles[0]).toMatchObject({
      id_lote: idLoteA,
      cantidad_resmas: 5,
      costo_unitario_lote: 12000,
      precio_unitario_venta: 15000,
      subtotal_venta: 75000,
      subtotal_costo: 60000,
    });

    const loteA = await loteRepo.porId(db, idLoteA);
    expect(loteA?.resmasDisponibles).toBe(15);
    expect(loteA?.estado).toBe('ACTIVO');

    const abonos = await db.query<{
      id_abono: number;
      monto_total_abonado: number;
      medio_pago: string;
      tipo_abono: string;
    }>('SELECT * FROM abonos;');
    expect(abonos).toHaveLength(1);
    expect(abonos[0]).toMatchObject({
      monto_total_abonado: 75000,
      medio_pago: 'EFECTIVO',
      tipo_abono: 'PAGO_CONTADO',
    });

    const abonoDetalles = await db.query<{
      id_abono: number;
      id_venta: number;
      monto_aplicado: number;
      capital_aplicado: number;
      ganancia_aplicada: number;
    }>('SELECT * FROM abonos_detalle_facturas;');
    expect(abonoDetalles).toHaveLength(1);
    expect(abonoDetalles[0]).toMatchObject({
      id_abono: abonos[0].id_abono,
      id_venta: idVenta,
      monto_aplicado: 75000,
      capital_aplicado: 60000,
      ganancia_aplicada: 15000,
    });

    const movs = await db.query<{
      tipo: string;
      medio: string;
      delta_bolsillo: number;
      delta_capital: number;
      delta_ganancia: number;
      id_abono: number;
    }>("SELECT * FROM movimientos_dinero WHERE tipo = 'COBRO';");
    expect(movs).toHaveLength(1);
    expect(movs[0]).toMatchObject({
      tipo: 'COBRO',
      medio: 'EFECTIVO',
      delta_bolsillo: 75000,
      delta_capital: 60000,
      delta_ganancia: 15000,
      id_abono: abonos[0].id_abono,
    });

    const saldos = await libroRepo.saldos(db);
    expect(saldos).toEqual({
      efectivo: 105000,
      transferencia: 0,
      capitalEnCaja: 90000,
      gananciaLibre: 15000,
    });
    expect(() => verificarInvariante(saldos)).not.toThrow();
  });

  it('registers a multilote sale by transfer and updates both lots (E7, S4)', async () => {
    const { idVenta } = await registrarVenta.registrar({
      idCliente: idAna,
      fecha: fechaAhora,
      lineas: [
        { idLote: idLoteA, cantidad: 3, precioUnitario: 15000 },
        { idLote: idLoteB, cantidad: 2, precioUnitario: 16000 },
      ],
      pago: { modalidad: 'CONTADO', medio: 'TRANSFERENCIA' },
    });

    const ventas = await db.query<{
      total_venta: number;
      costo_total_base: number;
      estado_pago: string;
    }>('SELECT total_venta, costo_total_base, estado_pago FROM ventas WHERE id_venta = ?;', [idVenta]);
    expect(ventas[0]).toEqual({
      total_venta: 77000,
      costo_total_base: 62000,
      estado_pago: 'PAGADA',
    });

    const detalles = await db.query<{
      id_lote: number;
      subtotal_venta: number;
      subtotal_costo: number;
    }>('SELECT id_lote, subtotal_venta, subtotal_costo FROM detalle_ventas WHERE id_venta = ? ORDER BY id_detalle;', [
      idVenta,
    ]);
    expect(detalles).toEqual([
      { id_lote: idLoteA, subtotal_venta: 45000, subtotal_costo: 36000 },
      { id_lote: idLoteB, subtotal_venta: 32000, subtotal_costo: 26000 },
    ]);

    expect((await loteRepo.porId(db, idLoteA))?.resmasDisponibles).toBe(17);
    expect((await loteRepo.porId(db, idLoteB))?.resmasDisponibles).toBe(8);

    const saldos = await libroRepo.saldos(db);
    expect(saldos).toEqual({
      efectivo: 30000,
      transferencia: 77000,
      capitalEnCaja: 92000,
      gananciaLibre: 15000,
    });
    expect(() => verificarInvariante(saldos)).not.toThrow();
  });

  it('registers a credit sale (FIADO) without creating abonos or money movements (E8, S5)', async () => {
    const movsAntes = await db.query('SELECT * FROM movimientos_dinero;');

    const { idVenta } = await registrarVenta.registrar({
      idCliente: idAna,
      fecha: fechaAhora,
      lineas: [{ idLote: idLoteA, cantidad: 4, precioUnitario: 15000 }],
      pago: { modalidad: 'FIADO' },
    });

    const ventas = await db.query<{
      total_venta: number;
      monto_pagado: number;
      saldo_pendiente: number;
      estado_pago: string;
    }>('SELECT total_venta, monto_pagado, saldo_pendiente, estado_pago FROM ventas WHERE id_venta = ?;', [idVenta]);
    expect(ventas[0]).toEqual({
      total_venta: 60000,
      monto_pagado: 0,
      saldo_pendiente: 60000,
      estado_pago: 'PENDIENTE',
    });

    expect((await loteRepo.porId(db, idLoteA))?.resmasDisponibles).toBe(16);
    expect(await db.query('SELECT * FROM abonos;')).toHaveLength(0);
    expect(await db.query('SELECT * FROM movimientos_dinero;')).toEqual(movsAntes);
  });

  it('registers a sale with initial payment (ABONO_INICIAL) and splits capital and profit (E9, S5, S10)', async () => {
    const { idVenta } = await registrarVenta.registrar({
      idCliente: idAna,
      fecha: fechaAhora,
      lineas: [{ idLote: idLoteA, cantidad: 4, precioUnitario: 15000 }],
      pago: { modalidad: 'ABONO_INICIAL', monto: 50000, medio: 'TRANSFERENCIA' },
    });

    const ventas = await db.query<{
      monto_pagado: number;
      saldo_pendiente: number;
      estado_pago: string;
    }>('SELECT monto_pagado, saldo_pendiente, estado_pago FROM ventas WHERE id_venta = ?;', [idVenta]);
    expect(ventas[0]).toEqual({
      monto_pagado: 50000,
      saldo_pendiente: 10000,
      estado_pago: 'PARCIAL',
    });

    const abonos = await db.query<{ tipo_abono: string; monto_total_abonado: number; medio_pago: string }>(
      'SELECT tipo_abono, monto_total_abonado, medio_pago FROM abonos;',
    );
    expect(abonos).toEqual([{ tipo_abono: 'ABONO_INICIAL', monto_total_abonado: 50000, medio_pago: 'TRANSFERENCIA' }]);

    const detallesAbono = await db.query<{ capital_aplicado: number; ganancia_aplicada: number }>(
      'SELECT capital_aplicado, ganancia_aplicada FROM abonos_detalle_facturas;',
    );
    expect(detallesAbono).toEqual([{ capital_aplicado: 48000, ganancia_aplicada: 2000 }]);

    const saldos = await libroRepo.saldos(db);
    expect(saldos).toEqual({
      efectivo: 30000,
      transferencia: 50000,
      capitalEnCaja: 78000,
      gananciaLibre: 2000,
    });
    expect(() => verificarInvariante(saldos)).not.toThrow();
  });

  it('rejects initial payment of 0 or equal to total with ABONO_INICIAL_INVALIDO (E10)', async () => {
    const antes = await snapshotTablas();

    for (const monto of [0, 60000]) {
      await expect(
        registrarVenta.registrar({
          idCliente: idAna,
          fecha: fechaAhora,
          lineas: [{ idLote: idLoteA, cantidad: 4, precioUnitario: 15000 }],
          pago: { modalidad: 'ABONO_INICIAL', monto, medio: 'TRANSFERENCIA' },
        }),
      ).rejects.toThrow(expect.objectContaining({ codigo: 'ABONO_INICIAL_INVALIDO' }));
    }

    expect(await snapshotTablas()).toEqual(antes);
  });

  it('rejects FIADO and ABONO_INICIAL for Mostrador with MOSTRADOR_SOLO_CONTADO and accepts CONTADO (E11, S11)', async () => {
    const antes = await snapshotTablas();

    await expect(
      registrarVenta.registrar({
        idCliente: 1,
        fecha: fechaAhora,
        lineas: [{ idLote: idLoteA, cantidad: 1, precioUnitario: 15000 }],
        pago: { modalidad: 'FIADO' },
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'MOSTRADOR_SOLO_CONTADO' }));

    await expect(
      registrarVenta.registrar({
        idCliente: 1,
        fecha: fechaAhora,
        lineas: [{ idLote: idLoteA, cantidad: 1, precioUnitario: 15000 }],
        pago: { modalidad: 'ABONO_INICIAL', monto: 5000, medio: 'EFECTIVO' },
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'MOSTRADOR_SOLO_CONTADO' }));

    expect(await snapshotTablas()).toEqual(antes);

    const { idVenta } = await registrarVenta.registrar({
      idCliente: 1,
      fecha: fechaAhora,
      lineas: [{ idLote: idLoteA, cantidad: 1, precioUnitario: 15000 }],
      pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
    });
    expect(idVenta).toBeGreaterThan(0);
  });

  it('rejects insufficient stock (21 of 20) and leaves all 5 tables completely unchanged (E12, S12, D4)', async () => {
    const antes = await snapshotTablas();

    await expect(
      registrarVenta.registrar({
        idCliente: idAna,
        fecha: fechaAhora,
        lineas: [{ idLote: idLoteA, cantidad: 21, precioUnitario: 15000 }],
        pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'STOCK_INSUFICIENTE' }));

    expect(await snapshotTablas()).toEqual(antes);
  });

  it('marks lot B as AGOTADO when selling all 10 reams and hides it from active lots (E13, S9)', async () => {
    await registrarVenta.registrar({
      idCliente: idAna,
      fecha: fechaAhora,
      lineas: [{ idLote: idLoteB, cantidad: 10, precioUnitario: 16000 }],
      pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
    });

    const loteB = await loteRepo.porId(db, idLoteB);
    expect(loteB?.resmasDisponibles).toBe(0);
    expect(loteB?.estado).toBe('AGOTADO');

    const activos = await loteRepo.activos(db);
    expect(activos.map((l) => l.idLote)).toEqual([idLoteA]);
  });

  it('allows below-cost sale (1 ream @ $11.000) with capital $11.000 and profit $0 (E14)', async () => {
    await registrarVenta.registrar({
      idCliente: idAna,
      fecha: fechaAhora,
      lineas: [{ idLote: idLoteA, cantidad: 1, precioUnitario: 11000 }],
      pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
    });

    const movs = await db.query<{ delta_capital: number; delta_ganancia: number }>(
      "SELECT delta_capital, delta_ganancia FROM movimientos_dinero WHERE tipo = 'COBRO';",
    );
    expect(movs).toEqual([{ delta_capital: 11000, delta_ganancia: 0 }]);
  });

  it('rejects sale without lines and sale with repeated lot (E16, D5)', async () => {
    const antes = await snapshotTablas();

    await expect(
      registrarVenta.registrar({
        idCliente: idAna,
        fecha: fechaAhora,
        lineas: [],
        pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'VENTA_SIN_LINEAS' }));

    await expect(
      registrarVenta.registrar({
        idCliente: idAna,
        fecha: fechaAhora,
        lineas: [
          { idLote: idLoteA, cantidad: 1, precioUnitario: 15000 },
          { idLote: idLoteA, cantidad: 2, precioUnitario: 15000 },
        ],
        pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'LOTE_REPETIDO' }));

    expect(await snapshotTablas()).toEqual(antes);
  });

  it('handles two concurrent registrations of the same 20-ream sale on lot A: one succeeds, one fails with STOCK_INSUFICIENTE (E17)', async () => {
    const payload = {
      idCliente: idAna,
      fecha: fechaAhora,
      lineas: [{ idLote: idLoteA, cantidad: 20, precioUnitario: 15000 }],
      pago: { modalidad: 'CONTADO' as const, medio: 'EFECTIVO' as const },
    };

    const resultados = await Promise.allSettled([registrarVenta.registrar(payload), registrarVenta.registrar(payload)]);

    const cumplidas = resultados.filter((r) => r.status === 'fulfilled');
    const rechazadas = resultados.filter((r): r is PromiseRejectedResult => r.status === 'rejected');

    expect(cumplidas).toHaveLength(1);
    expect(rechazadas).toHaveLength(1);
    expect(rechazadas[0].reason).toMatchObject({ codigo: 'STOCK_INSUFICIENTE' });

    expect(await db.query('SELECT * FROM ventas;')).toHaveLength(1);
    expect(await db.query("SELECT * FROM movimientos_dinero WHERE tipo = 'COBRO';")).toHaveLength(1);
  });

  it('uses the provided past date for venta, abono and cobro, and rejects future dates with FECHA_FUTURA (E20, D6)', async () => {
    const ayer = fechaHora('2026-11-14 18:00:00');
    const { idVenta } = await registrarVenta.registrar({
      idCliente: idAna,
      fecha: ayer,
      lineas: [{ idLote: idLoteA, cantidad: 5, precioUnitario: 15000 }],
      pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
    });

    const ventas = await db.query<{ fecha_venta: string }>('SELECT fecha_venta FROM ventas WHERE id_venta = ?;', [
      idVenta,
    ]);
    const abonos = await db.query<{ fecha_abono: string }>('SELECT fecha_abono FROM abonos;');
    const movs = await db.query<{ fecha_movimiento: string }>(
      "SELECT fecha_movimiento FROM movimientos_dinero WHERE tipo = 'COBRO';",
    );

    expect(ventas[0].fecha_venta).toBe(ayer);
    expect(abonos[0].fecha_abono).toBe(ayer);
    expect(movs[0].fecha_movimiento).toBe(ayer);

    const futuro = fechaHora('2026-11-15 12:00:01');
    await expect(
      registrarVenta.registrar({
        idCliente: idAna,
        fecha: futuro,
        lineas: [{ idLote: idLoteA, cantidad: 1, precioUnitario: 15000 }],
        pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'FECHA_FUTURA' }));
  });

  it('rejects non-existent customer with CLIENTE_INEXISTENTE and non-existent or exhausted lot with STOCK_INSUFICIENTE', async () => {
    await expect(
      registrarVenta.registrar({
        idCliente: 9999,
        fecha: fechaAhora,
        lineas: [{ idLote: idLoteA, cantidad: 1, precioUnitario: 15000 }],
        pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'CLIENTE_INEXISTENTE' }));

    await expect(
      registrarVenta.registrar({
        idCliente: idAna,
        fecha: fechaAhora,
        lineas: [{ idLote: 9999, cantidad: 1, precioUnitario: 15000 }],
        pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'STOCK_INSUFICIENTE' }));

    // Exhaust lot B then try to sell from it
    await registrarVenta.registrar({
      idCliente: idAna,
      fecha: fechaAhora,
      lineas: [{ idLote: idLoteB, cantidad: 10, precioUnitario: 15000 }],
      pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
    });

    await expect(
      registrarVenta.registrar({
        idCliente: idAna,
        fecha: fechaAhora,
        lineas: [{ idLote: idLoteB, cantidad: 1, precioUnitario: 15000 }],
        pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'STOCK_INSUFICIENTE' }));
  });

  it('rolls back everything if a failure occurs after deducting the first lot in a multilote sale (S12, D4)', async () => {
    const antes = await snapshotTablas();

    // Lot A has 20, Lot B has 10; requesting 15 from B will fail after validating/deducting A
    await expect(
      registrarVenta.registrar({
        idCliente: idAna,
        fecha: fechaAhora,
        lineas: [
          { idLote: idLoteA, cantidad: 5, precioUnitario: 15000 },
          { idLote: idLoteB, cantidad: 15, precioUnitario: 16000 },
        ],
        pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'STOCK_INSUFICIENTE' }));

    // Also test a forced DB failure after descontar inside the transaction
    const ventaRepo = TestBed.inject(VentaRepository);
    const originalInsertar = ventaRepo.insertar.bind(ventaRepo);
    ventaRepo.insertar = async () => {
      throw new Error('Forced failure after lot deduction');
    };

    await expect(
      registrarVenta.registrar({
        idCliente: idAna,
        fecha: fechaAhora,
        lineas: [
          { idLote: idLoteA, cantidad: 5, precioUnitario: 15000 },
          { idLote: idLoteB, cantidad: 2, precioUnitario: 16000 },
        ],
        pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
      }),
    ).rejects.toThrow('Forced failure after lot deduction');

    ventaRepo.insertar = originalInsertar;

    expect(await snapshotTablas()).toEqual(antes);
  });

  it('rejects a sale dated before the latest lot purchase without modifying any table and accepts exact purchase date (G3, E22)', async () => {
    const registrarAporte = TestBed.inject(RegistrarAporte);
    const registrarCompra = TestBed.inject(RegistrarCompra);
    const fechaCompraLoteC = fechaHora('2026-11-14 10:00:00');
    await registrarAporte.registrar({
      fecha: fechaCompraLoteC,
      medio: 'EFECTIVO',
      monto: pesos(120000),
    });
    const compraC = await registrarCompra.registrar({
      tipoPapel: 'CARTA',
      cajas: 1,
      costoPorCaja: 120000,
      fecha: fechaCompraLoteC,
      medio: 'EFECTIVO',
    });
    const idLoteC = compraC.idLote;

    const antes = await snapshotTablas();

    await expect(
      registrarVenta.registrar({
        idCliente: idAna,
        fecha: fechaHora('2026-11-10 18:00:00'),
        lineas: [{ idLote: idLoteC, cantidad: 1, precioUnitario: 15000 }],
        pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'VENTA_ANTERIOR_A_COMPRA' }));

    await expect(
      registrarVenta.registrar({
        idCliente: idAna,
        fecha: fechaHora('2026-11-14 09:59:59'),
        lineas: [{ idLote: idLoteC, cantidad: 1, precioUnitario: 15000 }],
        pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'VENTA_ANTERIOR_A_COMPRA' }));

    await expect(
      registrarVenta.registrar({
        idCliente: idAna,
        fecha: fechaHora('2026-11-14 09:59:59'),
        lineas: [
          { idLote: idLoteA, cantidad: 1, precioUnitario: 15000 },
          { idLote: idLoteC, cantidad: 1, precioUnitario: 15000 },
        ],
        pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'VENTA_ANTERIOR_A_COMPRA' }));

    expect(await snapshotTablas()).toEqual(antes);

    const { idVenta } = await registrarVenta.registrar({
      idCliente: idAna,
      fecha: fechaCompraLoteC,
      lineas: [
        { idLote: idLoteA, cantidad: 1, precioUnitario: 15000 },
        { idLote: idLoteC, cantidad: 1, precioUnitario: 15000 },
      ],
      pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
    });
    expect(idVenta).toBeGreaterThan(0);
  });
});
