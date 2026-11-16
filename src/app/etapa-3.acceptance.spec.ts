import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { SqlJsDatabase } from '../testing/sqljs-sql-database.adapter';

import { AbonoRepository } from './cartera';
import { BuscarClientes } from './clientes/application/buscar-clientes';
import { EditarCliente } from './clientes/application/editar-cliente';
import { RegistrarCliente } from './clientes/application/registrar-cliente';
import { LibroRepository, RegistrarAporte, verificarInvariante } from './finanzas';
import { ConsultarInventario, LoteRepository, RegistrarCompra } from './inventario';
import { fechaHora, pesos, resmas, type FechaHora } from './shared/domain';
import { CLOCK } from './shared/infrastructure/clock/clock.token';
import { MIGRACIONES } from './shared/infrastructure/sqlite/migrations';
import { migrar } from './shared/infrastructure/sqlite/migrations/migration-runner';
import { SQL_DATABASE } from './shared/infrastructure/sqlite/sql-database.token';
import { evaluarLinea, perdida, RegistrarVenta } from './ventas';

describe('Independent verification V3 — Public API acceptance suite (E1-E14, E16, E17, E20)', () => {
  let db: SqlJsDatabase;
  let ahoraActual: FechaHora;

  let registrarAporte: RegistrarAporte;
  let registrarCompra: RegistrarCompra;
  let consultarInventario: ConsultarInventario;
  let libroRepo: LibroRepository;
  let loteRepo: LoteRepository;
  let registrarCliente: RegistrarCliente;
  let editarCliente: EditarCliente;
  let buscarClientes: BuscarClientes;
  let registrarVenta: RegistrarVenta;

  let idLoteA: number;
  let idLoteB: number;

  const FECHA_BASE = fechaHora('2026-11-10 09:00:00');
  const AHORA = fechaHora('2026-11-15 12:00:00');

  beforeEach(async () => {
    ahoraActual = AHORA;
    db = await SqlJsDatabase.create();
    await migrar(db, MIGRACIONES);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        RegistrarAporte,
        RegistrarCompra,
        ConsultarInventario,
        LibroRepository,
        LoteRepository,
        AbonoRepository,
        RegistrarCliente,
        EditarCliente,
        BuscarClientes,
        RegistrarVenta,
        { provide: SQL_DATABASE, useValue: db },
        { provide: CLOCK, useValue: { ahora: () => ahoraActual } },
      ],
    });

    registrarAporte = TestBed.inject(RegistrarAporte);
    registrarCompra = TestBed.inject(RegistrarCompra);
    consultarInventario = TestBed.inject(ConsultarInventario);
    libroRepo = TestBed.inject(LibroRepository);
    loteRepo = TestBed.inject(LoteRepository);
    registrarCliente = TestBed.inject(RegistrarCliente);
    editarCliente = TestBed.inject(EditarCliente);
    buscarClientes = TestBed.inject(BuscarClientes);
    registrarVenta = TestBed.inject(RegistrarVenta);

    // Base state: $ 400.000 cash contribution + Lot A (2 boxes Carta @ $ 120.000) + Lot B (1 box Carta @ $ 130.000)
    await registrarAporte.registrar({
      fecha: FECHA_BASE,
      medio: 'EFECTIVO',
      monto: pesos(400000),
    });

    const compraA = await registrarCompra.registrar({
      tipoPapel: 'CARTA',
      cajas: 2,
      costoPorCaja: 120000,
      fecha: FECHA_BASE,
      medio: 'EFECTIVO',
    });
    idLoteA = compraA.idLote;

    const compraB = await registrarCompra.registrar({
      tipoPapel: 'CARTA',
      cajas: 1,
      costoPorCaja: 130000,
      fecha: FECHA_BASE,
      medio: 'EFECTIVO',
    });
    idLoteB = compraB.idLote;
  });

  async function snapshotTablas() {
    const [ventas, detalleVentas, lotesCajas, abonos, abonosDetalle, movimientos, clientes] = await Promise.all([
      db.query('SELECT * FROM ventas ORDER BY id_venta;'),
      db.query('SELECT * FROM detalle_ventas ORDER BY id_detalle;'),
      db.query('SELECT * FROM lotes_cajas ORDER BY id_lote;'),
      db.query('SELECT * FROM abonos ORDER BY id_abono;'),
      db.query('SELECT * FROM abonos_detalle_facturas ORDER BY id_abono_detalle;'),
      db.query('SELECT * FROM movimientos_dinero ORDER BY id_movimiento;'),
      db.query('SELECT * FROM clientes ORDER BY id_cliente;'),
    ]);
    return { ventas, detalleVentas, lotesCajas, abonos, abonosDetalle, movimientos, clientes };
  }

  async function crearAna(): Promise<number> {
    const { idCliente } = await registrarCliente.registrar({
      nombre: 'Ana Pérez',
      telefono: '3001234567',
    });
    return idCliente;
  }

  it('E1: registers "Ana Pérez" with phone "3001234567", sets es_mostrador=0, and lists her in BuscarClientes', async () => {
    const { idCliente } = await registrarCliente.registrar({
      nombre: 'Ana Pérez',
      telefono: '3001234567',
    });

    const rows = await db.query<{
      id_cliente: number;
      nombre: string;
      telefono: string | null;
      es_mostrador: number;
    }>('SELECT id_cliente, nombre, telefono, es_mostrador FROM clientes WHERE id_cliente = ?;', [idCliente]);

    expect(rows).toEqual([
      {
        id_cliente: idCliente,
        nombre: 'Ana Pérez',
        telefono: '3001234567',
        es_mostrador: 0,
      },
    ]);

    const lista = await buscarClientes.buscar('');
    expect(lista).toEqual([
      {
        idCliente,
        nombre: 'Ana Pérez',
        telefono: '3001234567',
        esMostrador: false,
      },
    ]);
  });

  it('E2: rejects empty or whitespace-only customer name with NOMBRE_INVALIDO and writes nothing', async () => {
    const antes = await snapshotTablas();

    await expect(registrarCliente.registrar({ nombre: '', telefono: '3001234567' })).rejects.toThrow(
      expect.objectContaining({ codigo: 'NOMBRE_INVALIDO' }),
    );
    await expect(registrarCliente.registrar({ nombre: '   ', telefono: '3001234567' })).rejects.toThrow(
      expect.objectContaining({ codigo: 'NOMBRE_INVALIDO' }),
    );

    expect(await snapshotTablas()).toEqual(antes);
  });

  it('E3: validates phone formats (rejects invalid, strips spaces, allows null/empty)', async () => {
    for (const badPhone of ['300-ABC', '2001234567', '300123456']) {
      await expect(registrarCliente.registrar({ nombre: 'Prueba', telefono: badPhone })).rejects.toThrow(
        expect.objectContaining({ codigo: 'TELEFONO_INVALIDO' }),
      );
    }

    const c1 = await registrarCliente.registrar({ nombre: 'Con Directo', telefono: '3001234567' });
    const c2 = await registrarCliente.registrar({ nombre: 'Con Espacios', telefono: '310 123 4567' });
    const c3 = await registrarCliente.registrar({ nombre: 'Sin Telefono', telefono: null });

    const rows = await db.query<{ id_cliente: number; telefono: string | null }>(
      'SELECT id_cliente, telefono FROM clientes WHERE id_cliente IN (?, ?, ?) ORDER BY id_cliente;',
      [c1.idCliente, c2.idCliente, c3.idCliente],
    );
    expect(rows).toEqual([
      { id_cliente: c1.idCliente, telefono: '3001234567' },
      { id_cliente: c2.idCliente, telefono: '3101234567' },
      { id_cliente: c3.idCliente, telefono: null },
    ]);
  });

  it('E3b: rejects duplicate phone, allows editing Ana keeping her phone, allows two null phones, and DB unique index blocks direct duplicate INSERT', async () => {
    const idAna = await crearAna();

    await expect(registrarCliente.registrar({ nombre: 'Laura Ruiz', telefono: '3001234567' })).rejects.toThrow(
      expect.objectContaining({ codigo: 'TELEFONO_REPETIDO' }),
    );
    expect(await buscarClientes.buscar('')).toHaveLength(1);

    await editarCliente.editar({
      idCliente: idAna,
      nombre: 'Ana María Pérez',
      telefono: '3001234567',
    });

    await registrarCliente.registrar({ nombre: 'Sin Tel 1', telefono: null });
    await registrarCliente.registrar({ nombre: 'Sin Tel 2', telefono: '' });
    expect(await buscarClientes.buscar('')).toHaveLength(3);

    await expect(
      db.run(
        "INSERT INTO clientes (nombre, telefono, es_mostrador, fecha_registro) VALUES ('Directo', '3001234567', 0, ?);",
        [AHORA],
      ),
    ).rejects.toThrow(/UNIQUE/);
  });

  it('E4: edits "Ana Pérez" to "Ana María Pérez" updating the same row', async () => {
    const idAna = await crearAna();

    await editarCliente.editar({
      idCliente: idAna,
      nombre: 'Ana María Pérez',
      telefono: '3001234567',
    });

    const rows = await db.query<{ id_cliente: number; nombre: string }>(
      'SELECT id_cliente, nombre FROM clientes WHERE es_mostrador = 0;',
    );
    expect(rows).toEqual([{ id_cliente: idAna, nombre: 'Ana María Pérez' }]);
    expect((await buscarClientes.buscar('')).map((c) => c.nombre)).toEqual(['Ana María Pérez']);
  });

  it('E5: searches case-insensitively and without accents by name and by phone', async () => {
    await registrarCliente.registrar({ nombre: 'Ana María Pérez', telefono: '3001234567' });
    await registrarCliente.registrar({ nombre: 'Juan Gómez', telefono: '3109876543' });

    expect((await buscarClientes.buscar('ana')).map((c) => c.nombre)).toEqual(['Ana María Pérez']);
    expect((await buscarClientes.buscar('ANA')).map((c) => c.nombre)).toEqual(['Ana María Pérez']);
    expect((await buscarClientes.buscar('perez')).map((c) => c.nombre)).toEqual(['Ana María Pérez']);
    expect((await buscarClientes.buscar('3109')).map((c) => c.nombre)).toEqual(['Juan Gómez']);
  });

  it('E6: sells 5 reams of Lot A at $15.000 cash to Ana with full accounting and invariant verification', async () => {
    const idAna = await crearAna();
    const { idVenta } = await registrarVenta.registrar({
      idCliente: idAna,
      fecha: AHORA,
      lineas: [{ idLote: idLoteA, cantidad: 5, precioUnitario: 15000 }],
      pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
    });

    const ventas = await db.query('SELECT * FROM ventas WHERE id_venta = ?;', [idVenta]);
    expect(ventas).toEqual([
      {
        id_venta: idVenta,
        id_cliente: idAna,
        fecha_venta: AHORA,
        total_venta: 75000,
        costo_total_base: 60000,
        monto_pagado: 75000,
        saldo_pendiente: 0,
        estado_pago: 'PAGADA',
      },
    ]);

    const detalles = await db.query(
      'SELECT id_venta, id_lote, cantidad_resmas, costo_unitario_lote, precio_unitario_venta, subtotal_venta, subtotal_costo FROM detalle_ventas WHERE id_venta = ?;',
      [idVenta],
    );
    expect(detalles).toEqual([
      {
        id_venta: idVenta,
        id_lote: idLoteA,
        cantidad_resmas: 5,
        costo_unitario_lote: 12000,
        precio_unitario_venta: 15000,
        subtotal_venta: 75000,
        subtotal_costo: 60000,
      },
    ]);

    const loteA = await loteRepo.porId(db, idLoteA);
    expect(loteA?.resmasDisponibles).toBe(15);
    expect(loteA?.estado).toBe('ACTIVO');

    const abonos = await db.query('SELECT * FROM abonos;');
    expect(abonos).toEqual([
      {
        id_abono: expect.any(Number),
        id_cliente: idAna,
        fecha_abono: AHORA,
        monto_total_abonado: 75000,
        medio_pago: 'EFECTIVO',
        tipo_abono: 'PAGO_CONTADO',
      },
    ]);
    const idAbono = (abonos[0] as { id_abono: number }).id_abono;

    const abonoDetalles = await db.query('SELECT * FROM abonos_detalle_facturas;');
    expect(abonoDetalles).toEqual([
      {
        id_abono_detalle: expect.any(Number),
        id_abono: idAbono,
        id_venta: idVenta,
        monto_aplicado: 75000,
        capital_aplicado: 60000,
        ganancia_aplicada: 15000,
      },
    ]);

    const cobros = await db.query("SELECT * FROM movimientos_dinero WHERE tipo = 'COBRO';");
    expect(cobros).toEqual([
      {
        id_movimiento: expect.any(Number),
        fecha_movimiento: AHORA,
        tipo: 'COBRO',
        medio: 'EFECTIVO',
        delta_bolsillo: 75000,
        delta_capital: 60000,
        delta_ganancia: 15000,
        id_lote: null,
        id_abono: idAbono,
        id_movimiento_origen: null,
        nota: null,
      },
    ]);

    const saldos = await libroRepo.saldos(db);
    expect(saldos).toEqual({
      efectivo: 105000,
      transferencia: 0,
      capitalEnCaja: 90000,
      gananciaLibre: 15000,
    });
    expect(() => verificarInvariante(saldos)).not.toThrow();
  });

  it('E7: multilote sale (3 from A @ $15.000, 2 from B @ $16.000) by Transferencia', async () => {
    const idAna = await crearAna();
    const { idVenta } = await registrarVenta.registrar({
      idCliente: idAna,
      fecha: AHORA,
      lineas: [
        { idLote: idLoteA, cantidad: 3, precioUnitario: 15000 },
        { idLote: idLoteB, cantidad: 2, precioUnitario: 16000 },
      ],
      pago: { modalidad: 'CONTADO', medio: 'TRANSFERENCIA' },
    });

    const ventas = await db.query('SELECT total_venta, costo_total_base, estado_pago FROM ventas WHERE id_venta = ?;', [
      idVenta,
    ]);
    expect(ventas).toEqual([{ total_venta: 77000, costo_total_base: 62000, estado_pago: 'PAGADA' }]);

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
    expect(detalles[0].subtotal_venta - detalles[0].subtotal_costo).toBe(9000);
    expect(detalles[1].subtotal_venta - detalles[1].subtotal_costo).toBe(6000);

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

  it('E8: credit sale (Fiado) of 4 reams of Lot A @ $15.000 leaves PENDIENTE with no abono or movement', async () => {
    const idAna = await crearAna();
    const movsAntes = await db.query('SELECT * FROM movimientos_dinero ORDER BY id_movimiento;');

    const { idVenta } = await registrarVenta.registrar({
      idCliente: idAna,
      fecha: AHORA,
      lineas: [{ idLote: idLoteA, cantidad: 4, precioUnitario: 15000 }],
      pago: { modalidad: 'FIADO' },
    });

    const ventas = await db.query(
      'SELECT total_venta, monto_pagado, saldo_pendiente, estado_pago FROM ventas WHERE id_venta = ?;',
      [idVenta],
    );
    expect(ventas).toEqual([{ total_venta: 60000, monto_pagado: 0, saldo_pendiente: 60000, estado_pago: 'PENDIENTE' }]);

    expect((await loteRepo.porId(db, idLoteA))?.resmasDisponibles).toBe(16);
    expect(await db.query('SELECT * FROM abonos;')).toEqual([]);
    expect(await db.query('SELECT * FROM abonos_detalle_facturas;')).toEqual([]);
    expect(await db.query('SELECT * FROM movimientos_dinero ORDER BY id_movimiento;')).toEqual(movsAntes);
    const saldos = await libroRepo.saldos(db);
    expect(() => verificarInvariante(saldos)).not.toThrow();
  });

  it('E9: sale with Abono inicial of $50.000 by Transferencia splits capital $48.000 and profit $2.000', async () => {
    const idAna = await crearAna();
    const { idVenta } = await registrarVenta.registrar({
      idCliente: idAna,
      fecha: AHORA,
      lineas: [{ idLote: idLoteA, cantidad: 4, precioUnitario: 15000 }],
      pago: { modalidad: 'ABONO_INICIAL', monto: 50000, medio: 'TRANSFERENCIA' },
    });

    expect(
      await db.query('SELECT monto_pagado, saldo_pendiente, estado_pago FROM ventas WHERE id_venta = ?;', [idVenta]),
    ).toEqual([{ monto_pagado: 50000, saldo_pendiente: 10000, estado_pago: 'PARCIAL' }]);

    expect(await db.query('SELECT tipo_abono, monto_total_abonado, medio_pago FROM abonos;')).toEqual([
      { tipo_abono: 'ABONO_INICIAL', monto_total_abonado: 50000, medio_pago: 'TRANSFERENCIA' },
    ]);

    expect(
      await db.query('SELECT monto_aplicado, capital_aplicado, ganancia_aplicada FROM abonos_detalle_facturas;'),
    ).toEqual([{ monto_aplicado: 50000, capital_aplicado: 48000, ganancia_aplicada: 2000 }]);

    const saldos = await libroRepo.saldos(db);
    expect(saldos).toEqual({
      efectivo: 30000,
      transferencia: 50000,
      capitalEnCaja: 78000,
      gananciaLibre: 2000,
    });
    expect(() => verificarInvariante(saldos)).not.toThrow();
  });

  it('E10: rejects Abono inicial of $0 or $60.000 (equal to total) with ABONO_INICIAL_INVALIDO', async () => {
    const idAna = await crearAna();
    const antes = await snapshotTablas();

    for (const monto of [0, 60000]) {
      await expect(
        registrarVenta.registrar({
          idCliente: idAna,
          fecha: AHORA,
          lineas: [{ idLote: idLoteA, cantidad: 4, precioUnitario: 15000 }],
          pago: { modalidad: 'ABONO_INICIAL', monto, medio: 'TRANSFERENCIA' },
        }),
      ).rejects.toThrow(expect.objectContaining({ codigo: 'ABONO_INICIAL_INVALIDO' }));
    }

    expect(await snapshotTablas()).toEqual(antes);
  });

  it('E11: rejects Fiado and Abono inicial for Mostrador with MOSTRADOR_SOLO_CONTADO', async () => {
    const clientesConMostrador = await buscarClientes.buscar('', { incluirMostrador: true });
    const mostrador = clientesConMostrador.find((c) => c.esMostrador)!;
    expect(mostrador).toBeDefined();

    const antes = await snapshotTablas();

    await expect(
      registrarVenta.registrar({
        idCliente: mostrador.idCliente,
        fecha: AHORA,
        lineas: [{ idLote: idLoteA, cantidad: 1, precioUnitario: 15000 }],
        pago: { modalidad: 'FIADO' },
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'MOSTRADOR_SOLO_CONTADO' }));

    await expect(
      registrarVenta.registrar({
        idCliente: mostrador.idCliente,
        fecha: AHORA,
        lineas: [{ idLote: idLoteA, cantidad: 1, precioUnitario: 15000 }],
        pago: { modalidad: 'ABONO_INICIAL', monto: 5000, medio: 'EFECTIVO' },
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'MOSTRADOR_SOLO_CONTADO' }));

    expect(await snapshotTablas()).toEqual(antes);
  });

  it('E12: rejects selling 21 reams from Lot A (20 available) with STOCK_INSUFICIENTE and leaves all 5 tables unchanged', async () => {
    const idAna = await crearAna();
    const antes = await snapshotTablas();

    await expect(
      registrarVenta.registrar({
        idCliente: idAna,
        fecha: AHORA,
        lineas: [{ idLote: idLoteA, cantidad: 21, precioUnitario: 15000 }],
        pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'STOCK_INSUFICIENTE' }));

    expect(await snapshotTablas()).toEqual(antes);
  });

  it('E13: selling all 10 reams of Lot B marks it AGOTADO and hides it from active inventory', async () => {
    const idAna = await crearAna();

    await registrarVenta.registrar({
      idCliente: idAna,
      fecha: AHORA,
      lineas: [{ idLote: idLoteB, cantidad: 10, precioUnitario: 15000 }],
      pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
    });

    const loteB = await loteRepo.porId(db, idLoteB);
    expect(loteB?.resmasDisponibles).toBe(0);
    expect(loteB?.estado).toBe('AGOTADO');

    const activos = await consultarInventario.activos();
    expect(activos.CARTA.map((l) => l.idLote)).toEqual([idLoteA]);
    expect(activos.OFICIO).toEqual([]);
  });

  it('E14: below-cost line (1 ream of Lot A @ $11.000) reports $1.000 loss, succeeds, and records capital $11.000 / profit $0', async () => {
    const evalLinea = evaluarLinea(resmas(1), pesos(12000), pesos(11000));
    expect(evalLinea.bajoCosto).toBe(true);
    expect(perdida(evalLinea.subtotalVenta, evalLinea.subtotalCosto)).toBe(1000);

    const idAna = await crearAna();
    await registrarVenta.registrar({
      idCliente: idAna,
      fecha: AHORA,
      lineas: [{ idLote: idLoteA, cantidad: 1, precioUnitario: 11000 }],
      pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
    });

    expect(await db.query('SELECT capital_aplicado, ganancia_aplicada FROM abonos_detalle_facturas;')).toEqual([
      { capital_aplicado: 11000, ganancia_aplicada: 0 },
    ]);
    expect(
      await db.query(
        "SELECT delta_bolsillo, delta_capital, delta_ganancia FROM movimientos_dinero WHERE tipo = 'COBRO';",
      ),
    ).toEqual([{ delta_bolsillo: 11000, delta_capital: 11000, delta_ganancia: 0 }]);
    const saldos = await libroRepo.saldos(db);
    expect(() => verificarInvariante(saldos)).not.toThrow();
  });

  it('E16: rejects sale without lines (VENTA_SIN_LINEAS) and sale with repeated lot (LOTE_REPETIDO)', async () => {
    const idAna = await crearAna();
    const antes = await snapshotTablas();

    await expect(
      registrarVenta.registrar({
        idCliente: idAna,
        fecha: AHORA,
        lineas: [],
        pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'VENTA_SIN_LINEAS' }));

    await expect(
      registrarVenta.registrar({
        idCliente: idAna,
        fecha: AHORA,
        lineas: [
          { idLote: idLoteA, cantidad: 1, precioUnitario: 15000 },
          { idLote: idLoteA, cantidad: 2, precioUnitario: 15000 },
        ],
        pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'LOTE_REPETIDO' }));

    expect(await snapshotTablas()).toEqual(antes);
  });

  it('E17: two concurrent registrar calls on Lot A (20 reams) produce one sale, one stock deduction and one movement', async () => {
    const idAna = await crearAna();
    const solicitud = {
      idCliente: idAna,
      fecha: AHORA,
      lineas: [{ idLote: idLoteA, cantidad: 20, precioUnitario: 15000 }],
      pago: { modalidad: 'CONTADO' as const, medio: 'EFECTIVO' as const },
    };

    const resultados = await Promise.allSettled([
      registrarVenta.registrar(solicitud),
      registrarVenta.registrar(solicitud),
    ]);

    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rechazados = resultados.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(rechazados).toHaveLength(1);
    expect(rechazados[0].reason).toMatchObject({ codigo: 'STOCK_INSUFICIENTE' });

    expect(await db.query('SELECT * FROM ventas;')).toHaveLength(1);
    expect(await db.query("SELECT * FROM movimientos_dinero WHERE tipo = 'COBRO';")).toHaveLength(1);
    const loteA = await loteRepo.porId(db, idLoteA);
    expect(loteA?.resmasDisponibles).toBe(0);
    expect(loteA?.estado).toBe('AGOTADO');
  });

  it('E20: records E6 sale with yesterday 18:00 across venta, abono and cobro, and rejects future dates with FECHA_FUTURA', async () => {
    const idAna = await crearAna();
    const ayer = fechaHora('2026-11-14 18:00:00');

    const { idVenta } = await registrarVenta.registrar({
      idCliente: idAna,
      fecha: ayer,
      lineas: [{ idLote: idLoteA, cantidad: 5, precioUnitario: 15000 }],
      pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
    });

    expect(await db.query('SELECT fecha_venta FROM ventas WHERE id_venta = ?;', [idVenta])).toEqual([
      { fecha_venta: ayer },
    ]);
    expect(await db.query('SELECT fecha_abono FROM abonos;')).toEqual([{ fecha_abono: ayer }]);
    expect(await db.query("SELECT fecha_movimiento FROM movimientos_dinero WHERE tipo = 'COBRO';")).toEqual([
      { fecha_movimiento: ayer },
    ]);

    await expect(
      registrarVenta.registrar({
        idCliente: idAna,
        fecha: fechaHora('2026-11-15 12:00:01'),
        lineas: [{ idLote: idLoteA, cantidad: 1, precioUnitario: 15000 }],
        pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'FECHA_FUTURA' }));
  });
});
