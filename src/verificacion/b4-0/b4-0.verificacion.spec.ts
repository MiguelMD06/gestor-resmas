import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  abonarFactura,
  AbonoRepository,
  CarteraRepository,
  ConsultarCartera,
  ConsultarExpediente,
  distribuirCascada,
  liquidarTodo,
  porCobrar,
  RegistrarAbono,
  validarFechaAbono,
  type FacturaAbierta,
} from '../../app/cartera';
import { ClienteRepository } from '../../app/clientes/infrastructure/cliente.repository';
import { LibroRepository } from '../../app/finanzas/infrastructure/libro.repository';
import { fechaHora, pesos, type CodigoRegla, type FechaHora } from '../../app/shared/domain';
import { CLOCK } from '../../app/shared/infrastructure/clock/clock.token';
import { MIGRACIONES } from '../../app/shared/infrastructure/sqlite/migrations';
import { migrar } from '../../app/shared/infrastructure/sqlite/migrations/migration-runner';
import { SQL_DATABASE } from '../../app/shared/infrastructure/sqlite/sql-database.token';
import { MENSAJES_ERROR } from '../../app/shared/ui/mensajes-error';
import { SqlJsDatabase } from '../../testing/sqljs-sql-database.adapter';

describe('Verificacion independiente B4.0-cartera-abonos', () => {
  let db: SqlJsDatabase;
  let registrarAbono: RegistrarAbono;
  let consultarCartera: ConsultarCartera;
  let consultarExpediente: ConsultarExpediente;
  let carteraRepo: CarteraRepository;
  let libroRepo: LibroRepository;
  let clienteRepo: ClienteRepository;

  let idAna: number;
  let idBeto: number;
  let idMostrador: number;
  let idLoteCarta: number;
  let idLoteOficio: number;
  let idF1: number;
  let idF2: number;
  let idAbonoInicial: number;

  const ahora = fechaHora('2026-11-20 12:00:00');
  const fechaBase = fechaHora('2026-11-01 08:00:00');
  const fechaF1 = fechaHora('2026-11-01 10:00:00');
  const fechaF2 = fechaHora('2026-11-10 10:00:00');

  async function snapshot4Tablas() {
    const [ventas, abonos, abonosDetalle, movimientos] = await Promise.all([
      db.query('SELECT * FROM ventas ORDER BY id_venta;'),
      db.query('SELECT * FROM abonos ORDER BY id_abono;'),
      db.query('SELECT * FROM abonos_detalle_facturas ORDER BY id_abono_detalle;'),
      db.query('SELECT * FROM movimientos_dinero ORDER BY id_movimiento;'),
    ]);
    return { ventas, abonos, abonosDetalle, movimientos };
  }

  beforeEach(async () => {
    db = await SqlJsDatabase.create();
    await migrar(db, MIGRACIONES);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        RegistrarAbono,
        ConsultarCartera,
        ConsultarExpediente,
        CarteraRepository,
        AbonoRepository,
        ClienteRepository,
        LibroRepository,
        { provide: SQL_DATABASE, useValue: db },
        { provide: CLOCK, useValue: { ahora: () => ahora } },
      ],
    });

    registrarAbono = TestBed.inject(RegistrarAbono);
    consultarCartera = TestBed.inject(ConsultarCartera);
    consultarExpediente = TestBed.inject(ConsultarExpediente);
    carteraRepo = TestBed.inject(CarteraRepository);
    libroRepo = TestBed.inject(LibroRepository);
    clienteRepo = TestBed.inject(ClienteRepository);

    idMostrador = (await clienteRepo.mostrador(db)).idCliente;

    const loteCartaRes = await db.run(
      `INSERT INTO lotes_cajas (tipo_papel, fecha_compra, cantidad_cajas, costo_por_caja, costo_unitario_resma, resmas_iniciales, resmas_disponibles, medio_pago_compra, estado)
       VALUES ('CARTA', ?, 2, 100000, 10000, 20, 17, 'EFECTIVO', 'ACTIVO');`,
      [fechaBase],
    );
    idLoteCarta = loteCartaRes.lastInsertId!;

    const loteOficioRes = await db.run(
      `INSERT INTO lotes_cajas (tipo_papel, fecha_compra, cantidad_cajas, costo_por_caja, costo_unitario_resma, resmas_iniciales, resmas_disponibles, medio_pago_compra, estado)
       VALUES ('OFICIO', ?, 1, 120000, 12000, 10, 10, 'EFECTIVO', 'ACTIVO');`,
      [fechaBase],
    );
    idLoteOficio = loteOficioRes.lastInsertId!;

    idAna = await clienteRepo.insertar(db, { nombre: 'Ana', telefono: '3001112233' }, fechaBase);
    idBeto = await clienteRepo.insertar(db, { nombre: 'Beto', telefono: '3002223344' }, fechaBase);

    const f1Res = await db.run(
      `INSERT INTO ventas (id_cliente, fecha_venta, total_venta, costo_total_base, monto_pagado, saldo_pendiente, estado_pago)
       VALUES (?, ?, 30000, 20000, 0, 30000, 'PENDIENTE');`,
      [idAna, fechaF1],
    );
    idF1 = f1Res.lastInsertId!;
    await db.run(
      `INSERT INTO detalle_ventas (id_venta, id_lote, cantidad_resmas, costo_unitario_lote, precio_unitario_venta, subtotal_venta, subtotal_costo)
       VALUES (?, ?, 2, 10000, 15000, 30000, 20000);`,
      [idF1, idLoteCarta],
    );

    const f2Res = await db.run(
      `INSERT INTO ventas (id_cliente, fecha_venta, total_venta, costo_total_base, monto_pagado, saldo_pendiente, estado_pago)
       VALUES (?, ?, 15000, 10000, 5000, 10000, 'PARCIAL');`,
      [idAna, fechaF2],
    );
    idF2 = f2Res.lastInsertId!;
    await db.run(
      `INSERT INTO detalle_ventas (id_venta, id_lote, cantidad_resmas, costo_unitario_lote, precio_unitario_venta, subtotal_venta, subtotal_costo)
       VALUES (?, ?, 1, 10000, 15000, 15000, 10000);`,
      [idF2, idLoteCarta],
    );

    const abonoInitRes = await db.run(
      `INSERT INTO abonos (id_cliente, fecha_abono, monto_total_abonado, medio_pago, tipo_abono)
       VALUES (?, ?, 5000, 'EFECTIVO', 'ABONO_INICIAL');`,
      [idAna, fechaF2],
    );
    idAbonoInicial = abonoInitRes.lastInsertId!;
    await db.run(
      `INSERT INTO abonos_detalle_facturas (id_abono, id_venta, monto_aplicado, capital_aplicado, ganancia_aplicada)
       VALUES (?, ?, 5000, 5000, 0);`,
      [idAbonoInicial, idF2],
    );
  });

  it('C1: CASCADA_GLOBAL de $35.000 en EFECTIVO actualiza F1, F2, abonos, detalle y libro', async () => {
    const res = await registrarAbono.registrar({
      modo: 'CASCADA_GLOBAL',
      idCliente: idAna,
      fecha: ahora,
      medio: 'EFECTIVO',
      monto: pesos(35000),
    });

    expect(res.aplicaciones).toEqual([
      { idVenta: idF1, monto: 30000, capital: 20000, ganancia: 10000, quedaPagada: true },
      { idVenta: idF2, monto: 5000, capital: 5000, ganancia: 0, quedaPagada: false },
    ]);

    const { ventas, abonos, abonosDetalle, movimientos } = await snapshot4Tablas();
    expect(ventas).toEqual([
      expect.objectContaining({ id_venta: idF1, monto_pagado: 30000, saldo_pendiente: 0, estado_pago: 'PAGADA' }),
      expect.objectContaining({ id_venta: idF2, monto_pagado: 10000, saldo_pendiente: 5000, estado_pago: 'PARCIAL' }),
    ]);
    expect(abonos).toHaveLength(2);
    expect(abonos[1]).toEqual({
      id_abono: res.idAbono,
      id_cliente: idAna,
      fecha_abono: ahora,
      monto_total_abonado: 35000,
      medio_pago: 'EFECTIVO',
      tipo_abono: 'CASCADA_GLOBAL',
    });
    expect(abonosDetalle.slice(1)).toEqual([
      expect.objectContaining({
        id_abono: res.idAbono,
        id_venta: idF1,
        monto_aplicado: 30000,
        capital_aplicado: 20000,
        ganancia_aplicada: 10000,
      }),
      expect.objectContaining({
        id_abono: res.idAbono,
        id_venta: idF2,
        monto_aplicado: 5000,
        capital_aplicado: 5000,
        ganancia_aplicada: 0,
      }),
    ]);
    expect(movimientos).toEqual([
      expect.objectContaining({
        tipo: 'COBRO',
        medio: 'EFECTIVO',
        delta_bolsillo: 35000,
        delta_capital: 25000,
        delta_ganancia: 10000,
        id_abono: res.idAbono,
      }),
    ]);
  });

  it('C2: FACTURA_INDIVIDUAL a F2 con $3.000 en TRANSFERENCIA deja F1 intacta y registra 1 detalle y COBRO', async () => {
    const res = await registrarAbono.registrar({
      modo: 'FACTURA_INDIVIDUAL',
      idCliente: idAna,
      fecha: ahora,
      medio: 'TRANSFERENCIA',
      idVenta: idF2,
      monto: pesos(3000),
    });

    const { ventas, abonos, abonosDetalle, movimientos } = await snapshot4Tablas();
    expect(ventas).toEqual([
      expect.objectContaining({ id_venta: idF1, monto_pagado: 0, saldo_pendiente: 30000, estado_pago: 'PENDIENTE' }),
      expect.objectContaining({ id_venta: idF2, monto_pagado: 8000, saldo_pendiente: 7000, estado_pago: 'PARCIAL' }),
    ]);
    expect(abonos[1]).toMatchObject({
      id_abono: res.idAbono,
      tipo_abono: 'FACTURA_INDIVIDUAL',
      monto_total_abonado: 3000,
      medio_pago: 'TRANSFERENCIA',
    });
    expect(abonosDetalle.slice(1)).toEqual([
      expect.objectContaining({
        id_abono: res.idAbono,
        id_venta: idF2,
        monto_aplicado: 3000,
        capital_aplicado: 3000,
        ganancia_aplicada: 0,
      }),
    ]);
    expect(movimientos).toEqual([
      expect.objectContaining({
        tipo: 'COBRO',
        medio: 'TRANSFERENCIA',
        delta_bolsillo: 3000,
        delta_capital: 3000,
        delta_ganancia: 0,
        id_abono: res.idAbono,
      }),
    ]);
  });

  it('C3: LIQUIDACION_TOTAL salda toda la deuda, saca a Ana de cartera y rechaza segunda liquidacion con SIN_DEUDA', async () => {
    const res = await registrarAbono.registrar({
      modo: 'LIQUIDACION_TOTAL',
      idCliente: idAna,
      fecha: ahora,
      medio: 'TRANSFERENCIA',
    });

    const { ventas, abonos, abonosDetalle, movimientos } = await snapshot4Tablas();
    expect(ventas).toEqual([
      expect.objectContaining({ id_venta: idF1, saldo_pendiente: 0, estado_pago: 'PAGADA' }),
      expect.objectContaining({ id_venta: idF2, saldo_pendiente: 0, estado_pago: 'PAGADA' }),
    ]);
    expect(abonos[1]).toMatchObject({
      id_abono: res.idAbono,
      tipo_abono: 'LIQUIDACION_TOTAL',
      monto_total_abonado: 40000,
      medio_pago: 'TRANSFERENCIA',
    });
    expect(abonosDetalle.slice(1)).toEqual([
      expect.objectContaining({
        id_abono: res.idAbono,
        id_venta: idF1,
        monto_aplicado: 30000,
        capital_aplicado: 20000,
        ganancia_aplicada: 10000,
      }),
      expect.objectContaining({
        id_abono: res.idAbono,
        id_venta: idF2,
        monto_aplicado: 10000,
        capital_aplicado: 5000,
        ganancia_aplicada: 5000,
      }),
    ]);
    expect(movimientos).toEqual([
      expect.objectContaining({
        tipo: 'COBRO',
        medio: 'TRANSFERENCIA',
        delta_bolsillo: 40000,
        delta_capital: 25000,
        delta_ganancia: 15000,
        id_abono: res.idAbono,
      }),
    ]);

    const cartera = await consultarCartera.consultar();
    expect(cartera.total).toBe(0);
    expect(cartera.porCliente.has(idAna)).toBe(false);

    const antes = await snapshot4Tablas();
    await expect(
      registrarAbono.registrar({
        modo: 'LIQUIDACION_TOTAL',
        idCliente: idAna,
        fecha: ahora,
        medio: 'EFECTIVO',
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'SIN_DEUDA' }));
    expect(await snapshot4Tablas()).toEqual(antes);
  });

  it('C4-C8: limites exactos de cascada, factura individual, monto cero/negativo, fecha futura y D14', async () => {
    const antes = await snapshot4Tablas();

    // C4: $40.001 rechaza sin escribir
    await expect(
      registrarAbono.registrar({
        modo: 'CASCADA_GLOBAL',
        idCliente: idAna,
        fecha: ahora,
        medio: 'EFECTIVO',
        monto: pesos(40001),
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'MONTO_SUPERA_DEUDA' }));
    expect(await snapshot4Tablas()).toEqual(antes);

    // C5: $10.001 a F2 rechaza sin escribir
    await expect(
      registrarAbono.registrar({
        modo: 'FACTURA_INDIVIDUAL',
        idCliente: idAna,
        fecha: ahora,
        medio: 'EFECTIVO',
        idVenta: idF2,
        monto: pesos(10001),
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'MONTO_SUPERA_SALDO_FACTURA' }));
    expect(await snapshot4Tablas()).toEqual(antes);

    // C6: $0 y negativo en ambos modos
    for (const montoInvalido of [0, -1]) {
      await expect(
        registrarAbono.registrar({
          modo: 'CASCADA_GLOBAL',
          idCliente: idAna,
          fecha: ahora,
          medio: 'EFECTIVO',
          monto: pesos(montoInvalido),
        }),
      ).rejects.toThrow(expect.objectContaining({ codigo: 'MONTO_INVALIDO' }));
      await expect(
        registrarAbono.registrar({
          modo: 'FACTURA_INDIVIDUAL',
          idCliente: idAna,
          fecha: ahora,
          medio: 'EFECTIVO',
          idVenta: idF2,
          monto: pesos(montoInvalido),
        }),
      ).rejects.toThrow(expect.objectContaining({ codigo: 'MONTO_INVALIDO' }));
    }
    expect(await snapshot4Tablas()).toEqual(antes);

    // C7: 2026-11-20 12:00:01 -> FECHA_FUTURA (incluso en LIQUIDACION_TOTAL y FACTURA_INDIVIDUAL)
    await expect(
      registrarAbono.registrar({
        modo: 'LIQUIDACION_TOTAL',
        idCliente: idAna,
        fecha: fechaHora('2026-11-20 12:00:01'),
        medio: 'EFECTIVO',
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'FECHA_FUTURA' }));
    expect(await snapshot4Tablas()).toEqual(antes);

    // C8 (D14): $35.000 con 2026-11-05 10:00:00 toca F2 (11-10) -> ABONO_ANTERIOR_A_FACTURA
    await expect(
      registrarAbono.registrar({
        modo: 'CASCADA_GLOBAL',
        idCliente: idAna,
        fecha: fechaHora('2026-11-05 10:00:00'),
        medio: 'EFECTIVO',
        monto: pesos(35000),
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'ABONO_ANTERIOR_A_FACTURA' }));
    // C8 (D14) en FACTURA_INDIVIDUAL y LIQUIDACION_TOTAL tambien
    await expect(
      registrarAbono.registrar({
        modo: 'FACTURA_INDIVIDUAL',
        idCliente: idAna,
        fecha: fechaHora('2026-11-09 23:59:59'),
        medio: 'EFECTIVO',
        idVenta: idF2,
        monto: pesos(1),
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'ABONO_ANTERIOR_A_FACTURA' }));
    await expect(
      registrarAbono.registrar({
        modo: 'LIQUIDACION_TOTAL',
        idCliente: idAna,
        fecha: fechaHora('2026-11-05 10:00:00'),
        medio: 'EFECTIVO',
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'ABONO_ANTERIOR_A_FACTURA' }));
    expect(await snapshot4Tablas()).toEqual(antes);

    // C8: $30.000 con 2026-11-05 10:00:00 solo paga F1 -> acepta
    await registrarAbono.registrar({
      modo: 'CASCADA_GLOBAL',
      idCliente: idAna,
      fecha: fechaHora('2026-11-05 10:00:00'),
      medio: 'EFECTIVO',
      monto: pesos(30000),
    });
    // Y pagar el saldo exacto de F2 ($10.000) con fecha igual a F2 (2026-11-10 10:00:00) -> acepta
    await registrarAbono.registrar({
      modo: 'FACTURA_INDIVIDUAL',
      idCliente: idAna,
      fecha: fechaHora('2026-11-10 10:00:00'),
      medio: 'EFECTIVO',
      idVenta: idF2,
      monto: pesos(10000),
    });
    const carteraFinal = await consultarCartera.consultar();
    expect(carteraFinal.total).toBe(0);
  });

  it('C9: MENSAJES_ERROR.ABONO_ANTERIOR_A_FACTURA y CodigoRegla exactos', () => {
    const codigo: CodigoRegla = 'ABONO_ANTERIOR_A_FACTURA';
    expect(MENSAJES_ERROR[codigo]).toBe('La fecha del abono es anterior a una factura que paga');
  });

  it('C10: desempate en cascada por id_venta ASC dejando segundo y ultimo elementos correctos y Ana intacta', async () => {
    const idCarla = await clienteRepo.insertar(db, { nombre: 'Carla', telefono: '3003334455' }, fechaBase);
    const idG1 = (
      await db.run(
        `INSERT INTO ventas (id_cliente, fecha_venta, total_venta, costo_total_base, monto_pagado, saldo_pendiente, estado_pago)
         VALUES (?, '2026-11-02 10:00:00', 10000, 8000, 0, 10000, 'PENDIENTE');`,
        [idCarla],
      )
    ).lastInsertId!;
    const idG2 = (
      await db.run(
        `INSERT INTO ventas (id_cliente, fecha_venta, total_venta, costo_total_base, monto_pagado, saldo_pendiente, estado_pago)
         VALUES (?, '2026-11-03 10:00:00', 10000, 8000, 0, 10000, 'PENDIENTE');`,
        [idCarla],
      )
    ).lastInsertId!;
    const idG3 = (
      await db.run(
        `INSERT INTO ventas (id_cliente, fecha_venta, total_venta, costo_total_base, monto_pagado, saldo_pendiente, estado_pago)
         VALUES (?, '2026-11-03 10:00:00', 10000, 8000, 0, 10000, 'PENDIENTE');`,
        [idCarla],
      )
    ).lastInsertId!;

    const res = await registrarAbono.registrar({
      modo: 'CASCADA_GLOBAL',
      idCliente: idCarla,
      fecha: ahora,
      medio: 'EFECTIVO',
      monto: pesos(25000),
    });

    expect(res.aplicaciones).toEqual([
      { idVenta: idG1, monto: 10000, capital: 8000, ganancia: 2000, quedaPagada: true },
      { idVenta: idG2, monto: 10000, capital: 8000, ganancia: 2000, quedaPagada: true },
      { idVenta: idG3, monto: 5000, capital: 5000, ganancia: 0, quedaPagada: false },
    ]);

    const { ventas } = await snapshot4Tablas();
    expect(ventas).toEqual([
      expect.objectContaining({ id_venta: idF1, monto_pagado: 0, saldo_pendiente: 30000, estado_pago: 'PENDIENTE' }),
      expect.objectContaining({ id_venta: idF2, monto_pagado: 5000, saldo_pendiente: 10000, estado_pago: 'PARCIAL' }),
      expect.objectContaining({ id_venta: idG1, monto_pagado: 10000, saldo_pendiente: 0, estado_pago: 'PAGADA' }),
      expect.objectContaining({ id_venta: idG2, monto_pagado: 10000, saldo_pendiente: 0, estado_pago: 'PAGADA' }),
      expect.objectContaining({ id_venta: idG3, monto_pagado: 5000, saldo_pendiente: 5000, estado_pago: 'PARCIAL' }),
    ]);
  });

  it('C11-C12: otro cliente, cliente inexistente, Beto sin compras y Mostrador sin deuda', async () => {
    const idCarla = await clienteRepo.insertar(db, { nombre: 'Carla', telefono: '3003334455' }, fechaBase);
    const idG1 = (
      await db.run(
        `INSERT INTO ventas (id_cliente, fecha_venta, total_venta, costo_total_base, monto_pagado, saldo_pendiente, estado_pago)
         VALUES (?, '2026-11-02 10:00:00', 10000, 8000, 0, 10000, 'PENDIENTE');`,
        [idCarla],
      )
    ).lastInsertId!;
    const idAnaPagada = (
      await db.run(
        `INSERT INTO ventas (id_cliente, fecha_venta, total_venta, costo_total_base, monto_pagado, saldo_pendiente, estado_pago)
         VALUES (?, '2026-11-02 10:00:00', 10000, 8000, 10000, 0, 'PAGADA');`,
        [idAna],
      )
    ).lastInsertId!;

    const antes = await snapshot4Tablas();

    await expect(
      registrarAbono.registrar({
        modo: 'FACTURA_INDIVIDUAL',
        idCliente: idAna,
        fecha: ahora,
        medio: 'EFECTIVO',
        idVenta: idG1,
        monto: pesos(1000),
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'FACTURA_INVALIDA' }));

    await expect(
      registrarAbono.registrar({
        modo: 'FACTURA_INDIVIDUAL',
        idCliente: idAna,
        fecha: ahora,
        medio: 'EFECTIVO',
        idVenta: 888888,
        monto: pesos(1000),
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'FACTURA_INVALIDA' }));

    await expect(
      registrarAbono.registrar({
        modo: 'FACTURA_INDIVIDUAL',
        idCliente: idAna,
        fecha: ahora,
        medio: 'EFECTIVO',
        idVenta: idAnaPagada,
        monto: pesos(1000),
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'SIN_DEUDA' }));

    // Cliente inexistente en los tres modos
    await expect(
      registrarAbono.registrar({
        modo: 'CASCADA_GLOBAL',
        idCliente: 777777,
        fecha: ahora,
        medio: 'EFECTIVO',
        monto: pesos(1000),
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'CLIENTE_INEXISTENTE' }));
    await expect(
      registrarAbono.registrar({
        modo: 'FACTURA_INDIVIDUAL',
        idCliente: 777777,
        fecha: ahora,
        medio: 'EFECTIVO',
        idVenta: idF1,
        monto: pesos(1000),
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'CLIENTE_INEXISTENTE' }));
    await expect(
      registrarAbono.registrar({
        modo: 'LIQUIDACION_TOTAL',
        idCliente: 777777,
        fecha: ahora,
        medio: 'EFECTIVO',
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'CLIENTE_INEXISTENTE' }));

    // Beto y Mostrador sin deuda
    for (const idSinCompras of [idBeto, idMostrador]) {
      await expect(
        registrarAbono.registrar({
          modo: 'CASCADA_GLOBAL',
          idCliente: idSinCompras,
          fecha: ahora,
          medio: 'EFECTIVO',
          monto: pesos(1000),
        }),
      ).rejects.toThrow(expect.objectContaining({ codigo: 'SIN_DEUDA' }));
      await expect(
        registrarAbono.registrar({
          modo: 'LIQUIDACION_TOTAL',
          idCliente: idSinCompras,
          fecha: ahora,
          medio: 'EFECTIVO',
        }),
      ).rejects.toThrow(expect.objectContaining({ codigo: 'SIN_DEUDA' }));
    }

    expect(await snapshot4Tablas()).toEqual(antes);
  });

  it('C13: doble envio concurrente en CASCADA_GLOBAL, FACTURA_INDIVIDUAL y LIQUIDACION_TOTAL produce una sola escritura', async () => {
    const resCascada = await Promise.allSettled([
      registrarAbono.registrar({
        modo: 'CASCADA_GLOBAL',
        idCliente: idAna,
        fecha: ahora,
        medio: 'EFECTIVO',
        monto: pesos(35000),
      }),
      registrarAbono.registrar({
        modo: 'CASCADA_GLOBAL',
        idCliente: idAna,
        fecha: ahora,
        medio: 'EFECTIVO',
        monto: pesos(35000),
      }),
    ]);

    expect(resCascada.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rechazos = resCascada.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(rechazos).toHaveLength(1);
    expect(rechazos[0].reason).toEqual(expect.objectContaining({ codigo: 'MONTO_SUPERA_DEUDA' }));
    expect((await consultarCartera.consultar()).total).toBe(5000);

    // Segundo doble envio: dos LIQUIDACION_TOTAL concurrentes sobre los $5.000 restantes
    const resLiq = await Promise.allSettled([
      registrarAbono.registrar({ modo: 'LIQUIDACION_TOTAL', idCliente: idAna, fecha: ahora, medio: 'EFECTIVO' }),
      registrarAbono.registrar({ modo: 'LIQUIDACION_TOTAL', idCliente: idAna, fecha: ahora, medio: 'EFECTIVO' }),
    ]);
    expect(resLiq.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rechazosLiq = resLiq.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(rechazosLiq).toHaveLength(1);
    expect(rechazosLiq[0].reason).toEqual(expect.objectContaining({ codigo: 'SIN_DEUDA' }));
    expect((await consultarCartera.consultar()).total).toBe(0);
  });

  it('C14: rollback completo si falla LibroRepository.registrar O CarteraRepository.aplicarPago y reintento exitoso', async () => {
    const antes = await snapshot4Tablas();

    const spyLibro = vi.spyOn(libroRepo, 'registrar').mockRejectedValueOnce(new Error('DB write error'));
    await expect(
      registrarAbono.registrar({
        modo: 'CASCADA_GLOBAL',
        idCliente: idAna,
        fecha: ahora,
        medio: 'EFECTIVO',
        monto: pesos(35000),
      }),
    ).rejects.toThrow('DB write error');
    expect(await snapshot4Tablas()).toEqual(antes);
    spyLibro.mockRestore();

    const spyPago = vi.spyOn(carteraRepo, 'aplicarPago').mockRejectedValueOnce(new Error('Simulated update failure'));
    await expect(
      registrarAbono.registrar({
        modo: 'CASCADA_GLOBAL',
        idCliente: idAna,
        fecha: ahora,
        medio: 'EFECTIVO',
        monto: pesos(35000),
      }),
    ).rejects.toThrow('Simulated update failure');
    expect(await snapshot4Tablas()).toEqual(antes);
    spyPago.mockRestore();

    // Reintento limpio funciona
    const retry = await registrarAbono.registrar({
      modo: 'CASCADA_GLOBAL',
      idCliente: idAna,
      fecha: ahora,
      medio: 'EFECTIVO',
      monto: pesos(35000),
    });
    expect(retry.idAbono).toBeGreaterThan(0);
    expect((await consultarCartera.consultar()).total).toBe(5000);
  });

  it('C15: aplicarPago valida saldo, liquida en el limite y marca PARCIAL con $1', async () => {
    const antes = await snapshot4Tablas();
    await expect(db.transaction((tx) => carteraRepo.aplicarPago(tx, idF2, pesos(10001)))).rejects.toThrow(
      /Failed to apply payment/,
    );
    await expect(db.transaction((tx) => carteraRepo.aplicarPago(tx, idF2, pesos(0)))).rejects.toThrow(
      /greater than zero/,
    );
    expect(await snapshot4Tablas()).toEqual(antes);

    await db.transaction((tx) => carteraRepo.aplicarPago(tx, idF2, pesos(10000)));
    const f2 = await db.query<{ saldo_pendiente: number; estado_pago: string }>(
      'SELECT saldo_pendiente, estado_pago FROM ventas WHERE id_venta = ?;',
      [idF2],
    );
    expect(f2).toEqual([{ saldo_pendiente: 0, estado_pago: 'PAGADA' }]);

    await db.transaction((tx) => carteraRepo.aplicarPago(tx, idF1, pesos(1)));
    const f1 = await db.query<{ monto_pagado: number; saldo_pendiente: number; estado_pago: string }>(
      'SELECT monto_pagado, saldo_pendiente, estado_pago FROM ventas WHERE id_venta = ?;',
      [idF1],
    );
    expect(f1).toEqual([{ monto_pagado: 1, saldo_pendiente: 29999, estado_pago: 'PARCIAL' }]);
  });

  it('C16-C18: ConsultarCartera y ConsultarExpediente con multilinea, PAGO_CONTADO oculto y multiples abonos', async () => {
    const idCarla = await clienteRepo.insertar(db, { nombre: 'Carla', telefono: '3003334455' }, fechaBase);
    // Carla sin deuda, Beto sin compras, Mostrador con venta de contado
    const vMostrador = (
      await db.run(
        `INSERT INTO ventas (id_cliente, fecha_venta, total_venta, costo_total_base, monto_pagado, saldo_pendiente, estado_pago)
         VALUES (?, '2026-11-12 10:00:00', 15000, 10000, 15000, 0, 'PAGADA');`,
        [idMostrador],
      )
    ).lastInsertId!;
    await db.run(
      `INSERT INTO detalle_ventas (id_venta, id_lote, cantidad_resmas, costo_unitario_lote, precio_unitario_venta, subtotal_venta, subtotal_costo)
       VALUES (?, ?, 1, 10000, 15000, 15000, 10000);`,
      [vMostrador, idLoteCarta],
    );

    // C16 inicial: solo Ana
    const cInicial = await consultarCartera.consultar();
    expect(cInicial.total).toBe(40000);
    expect(Array.from(cInicial.porCliente.entries())).toEqual([[idAna, 40000]]);

    // Agrega segunda linea de OFICIO a F1 para probar multiples lineas en expediente
    await db.run(
      `INSERT INTO detalle_ventas (id_venta, id_lote, cantidad_resmas, costo_unitario_lote, precio_unitario_venta, subtotal_venta, subtotal_costo)
       VALUES (?, ?, 1, 12000, 16000, 16000, 12000);`,
      [idF1, idLoteOficio],
    );

    // Venta de contado a Ana (D15 / C18)
    const idVContado = (
      await db.run(
        `INSERT INTO ventas (id_cliente, fecha_venta, total_venta, costo_total_base, monto_pagado, saldo_pendiente, estado_pago)
         VALUES (?, '2026-11-15 10:00:00', 15000, 10000, 15000, 0, 'PAGADA');`,
        [idAna],
      )
    ).lastInsertId!;
    await db.run(
      `INSERT INTO detalle_ventas (id_venta, id_lote, cantidad_resmas, costo_unitario_lote, precio_unitario_venta, subtotal_venta, subtotal_costo)
       VALUES (?, ?, 1, 10000, 15000, 15000, 10000);`,
      [idVContado, idLoteCarta],
    );
    const idAbonoContado = (
      await db.run(
        `INSERT INTO abonos (id_cliente, fecha_abono, monto_total_abonado, medio_pago, tipo_abono)
         VALUES (?, '2026-11-15 10:00:00', 15000, 'EFECTIVO', 'PAGO_CONTADO');`,
        [idAna],
      )
    ).lastInsertId!;
    await db.run(
      `INSERT INTO abonos_detalle_facturas (id_abono, id_venta, monto_aplicado, capital_aplicado, ganancia_aplicada)
       VALUES (?, ?, 15000, 10000, 5000);`,
      [idAbonoContado, idVContado],
    );

    const expAntes = await consultarExpediente.consultar(idAna);
    expect(expAntes.deuda).toEqual({ total: 40000, capital: 25000, ganancia: 15000 });
    expect(expAntes.facturas.map((f) => [f.idVenta, f.estado, f.saldo])).toEqual([
      [idVContado, 'PAGADA', 0],
      [idF2, 'PARCIAL', 10000],
      [idF1, 'PENDIENTE', 30000],
    ]);
    expect(expAntes.facturas[2].lineas).toEqual([
      { cantidad: 2, tipoPapel: 'CARTA', precioUnitario: 15000, subtotal: 30000 },
      { cantidad: 1, tipoPapel: 'OFICIO', precioUnitario: 16000, subtotal: 16000 },
    ]);
    expect(expAntes.abonos).toHaveLength(1);
    expect(expAntes.abonos[0].tipo).toBe('ABONO_INICIAL');

    // Ejecuta C1 y verifica C16 + C17 despues
    await registrarAbono.registrar({
      modo: 'CASCADA_GLOBAL',
      idCliente: idAna,
      fecha: ahora,
      medio: 'EFECTIVO',
      monto: pesos(35000),
    });

    const cDespues = await consultarCartera.consultar();
    expect(cDespues.total).toBe(5000);
    expect(Array.from(cDespues.porCliente.entries())).toEqual([[idAna, 5000]]);

    const expDespues = await consultarExpediente.consultar(idAna);
    expect(expDespues.deuda).toEqual({ total: 5000, capital: 0, ganancia: 5000 });
    expect(expDespues.abonos).toHaveLength(2);
    expect(expDespues.abonos[0]).toMatchObject({
      monto: 35000,
      tipo: 'CASCADA_GLOBAL',
      aplicaciones: [
        { idVenta: idF1, monto: 30000 },
        { idVenta: idF2, monto: 5000 },
      ],
    });
    expect(expDespues.abonos[1]).toMatchObject({
      idAbono: idAbonoInicial,
      monto: 5000,
      tipo: 'ABONO_INICIAL',
      aplicaciones: [{ idVenta: idF2, monto: 5000 }],
    });

    // Carla tiene deuda 0
    const expCarla = await consultarExpediente.consultar(idCarla);
    expect(expCarla.deuda).toEqual({ total: 0, capital: 0, ganancia: 0 });
    expect(expCarla.facturas).toEqual([]);
    expect(expCarla.abonos).toEqual([]);

    // Cliente inexistente
    await expect(consultarExpediente.consultar(999999)).rejects.toThrow(
      expect.objectContaining({ codigo: 'CLIENTE_INEXISTENTE' }),
    );
  });

  it('C19 y dominio: porCobrar, validarFechaAbono, distribuirCascada, abonarFactura y liquidarTodo', () => {
    const f1: FacturaAbierta = {
      idVenta: 1,
      fecha: fechaF1,
      total: pesos(30000),
      costoBase: pesos(20000),
      pagado: pesos(0),
    };
    const f2: FacturaAbierta = {
      idVenta: 2,
      fecha: fechaF2,
      total: pesos(15000),
      costoBase: pesos(10000),
      pagado: pesos(5000),
    };
    const bajoCosto: FacturaAbierta = {
      idVenta: 3,
      fecha: fechaF1,
      total: pesos(8000),
      costoBase: pesos(10000),
      pagado: pesos(3000),
    };
    const pagada: FacturaAbierta = {
      idVenta: 4,
      fecha: fechaF1,
      total: pesos(15000),
      costoBase: pesos(10000),
      pagado: pesos(15000),
    };

    expect(porCobrar(f2)).toEqual({ capital: 5000, ganancia: 5000 });
    expect(porCobrar(f1)).toEqual({ capital: 20000, ganancia: 10000 });
    expect(porCobrar(bajoCosto)).toEqual({ capital: 5000, ganancia: 0 });
    expect(porCobrar(pagada)).toEqual({ capital: 0, ganancia: 0 });

    // Verifica que las funciones exportadas de dominio existen y operan correctamente
    expect(distribuirCascada([f2, f1], pesos(35000))).toHaveLength(2);
    expect(abonarFactura(f2, pesos(3000))).toEqual({
      idVenta: 2,
      monto: 3000,
      capital: 3000,
      ganancia: 0,
      quedaPagada: false,
    });
    expect(liquidarTodo([f1, f2])).toHaveLength(2);
    expect(() => validarFechaAbono(ahora, ahora, [f1, f2])).not.toThrow();
    expect(() => validarFechaAbono('2026-11-20 12:00:01' as FechaHora, ahora, [f1])).toThrow(
      expect.objectContaining({ codigo: 'FECHA_FUTURA' }),
    );
  });
});
