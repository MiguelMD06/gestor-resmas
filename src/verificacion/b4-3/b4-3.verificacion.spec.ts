import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { ModalController, ToastController } from '@ionic/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConsultarExpediente, type ExpedienteCliente } from '../../app/cartera/application/consultar-expediente';
import { RegistrarAbono } from '../../app/cartera/application/registrar-abono';
import type { FacturaAbierta } from '../../app/cartera/domain';
import { AbonoRepository } from '../../app/cartera/infrastructure/abono.repository';
import {
  CarteraRepository,
  type AbonoExpediente,
  type FacturaExpediente,
} from '../../app/cartera/infrastructure/cartera.repository';
import { AbonoModalComponent } from '../../app/cartera/ui/abono.modal';
import { ResumenAbonoModalComponent, type LineaResumenAbono } from '../../app/cartera/ui/resumen-abono.modal';
import type { Cliente } from '../../app/clientes/domain/cliente';
import { ClienteRepository } from '../../app/clientes/infrastructure/cliente.repository';
import { ClienteModalComponent } from '../../app/clientes/ui/cliente.modal';
import { calcularAplicacionesQuePagaron } from '../../app/clientes/ui/expediente-ui.helpers';
import { ExpedientePage } from '../../app/clientes/ui/expediente.page';
import { LibroRepository } from '../../app/finanzas/infrastructure/libro.repository';
import { fechaHora, pesos, resmas } from '../../app/shared/domain';
import { CLOCK } from '../../app/shared/infrastructure/clock/clock.token';
import { MIGRACIONES } from '../../app/shared/infrastructure/sqlite/migrations';
import { migrar } from '../../app/shared/infrastructure/sqlite/migrations/migration-runner';
import { SQL_DATABASE } from '../../app/shared/infrastructure/sqlite/sql-database.token';
import { ROL_CANCELAR, ROL_GUARDADO, soloCierreExplicito } from '../../app/shared/ui/formulario';
import { MENSAJE_ERROR_GENERICO, MENSAJES_ERROR } from '../../app/shared/ui/mensajes-error';
import { SqlJsDatabase } from '../../testing/sqljs-sql-database.adapter';

describe('Verificacion independiente B4.3-expediente', () => {
  let db: SqlJsDatabase;
  let consultarExpediente: ConsultarExpediente;
  let registrarAbono: RegistrarAbono;

  let fixture: ComponentFixture<ExpedientePage>;
  let page: ExpedientePage;
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };
  let mockModalCtrl: { create: ReturnType<typeof vi.fn> };
  let mockModal: { present: ReturnType<typeof vi.fn>; onDidDismiss: ReturnType<typeof vi.fn> };
  let mockToastCtrl: { create: ReturnType<typeof vi.fn> };
  let mockToastPresent: ReturnType<typeof vi.fn>;
  let paramId: string | null;

  let idAna: number;
  let idBeto: number;
  let idLoteCarta: number;
  let idLoteOficio: number;
  let idF1: number;
  let idF2: number;

  const ahora = fechaHora('2026-11-20 12:00:00');
  const fechaF1 = fechaHora('2026-11-01 10:00:00');
  const fechaF2 = fechaHora('2026-11-10 10:00:00');

  async function seedEscenarioBase(): Promise<void> {
    const loteCarta = await db.run(
      `INSERT INTO lotes_cajas (tipo_papel, fecha_compra, cantidad_cajas, costo_por_caja, costo_unitario_resma, resmas_iniciales, resmas_disponibles, medio_pago_compra, estado)
       VALUES ('CARTA', ?, 2, 100000, 10000, 20, 18, 'EFECTIVO', 'ACTIVO');`,
      [fechaF1],
    );
    idLoteCarta = loteCarta.lastInsertId!;

    const loteOficio = await db.run(
      `INSERT INTO lotes_cajas (tipo_papel, fecha_compra, cantidad_cajas, costo_por_caja, costo_unitario_resma, resmas_iniciales, resmas_disponibles, medio_pago_compra, estado)
       VALUES ('OFICIO', ?, 1, 100000, 10000, 10, 9, 'EFECTIVO', 'ACTIVO');`,
      [fechaF1],
    );
    idLoteOficio = loteOficio.lastInsertId!;

    const anaRes = await db.run(
      `INSERT INTO clientes (nombre, telefono, es_mostrador, fecha_registro) VALUES ('Ana', '3104567890', 0, ?);`,
      [fechaF1],
    );
    idAna = anaRes.lastInsertId!;

    const betoRes = await db.run(
      `INSERT INTO clientes (nombre, telefono, es_mostrador, fecha_registro) VALUES ('Beto Gómez', NULL, 0, ?);`,
      [fechaF1],
    );
    idBeto = betoRes.lastInsertId!;

    // F1: 2 x Carta @ $15.000 = $30.000, costo $20.000, PENDIENTE
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

    // F2: 1 x Oficio @ $15.000 = $15.000, costo $10.000, abono inicial $5.000 Efectivo, PARCIAL
    const f2Res = await db.run(
      `INSERT INTO ventas (id_cliente, fecha_venta, total_venta, costo_total_base, monto_pagado, saldo_pendiente, estado_pago)
       VALUES (?, ?, 15000, 10000, 5000, 10000, 'PARCIAL');`,
      [idAna, fechaF2],
    );
    idF2 = f2Res.lastInsertId!;
    await db.run(
      `INSERT INTO detalle_ventas (id_venta, id_lote, cantidad_resmas, costo_unitario_lote, precio_unitario_venta, subtotal_venta, subtotal_costo)
       VALUES (?, ?, 1, 10000, 15000, 15000, 10000);`,
      [idF2, idLoteOficio],
    );

    const abonoInit = await db.run(
      `INSERT INTO abonos (id_cliente, fecha_abono, monto_total_abonado, medio_pago, tipo_abono)
       VALUES (?, ?, 5000, 'EFECTIVO', 'ABONO_INICIAL');`,
      [idAna, fechaF2],
    );
    await db.run(
      `INSERT INTO abonos_detalle_facturas (id_abono, id_venta, monto_aplicado, capital_aplicado, ganancia_aplicada)
       VALUES (?, ?, 5000, 5000, 0);`,
      [abonoInit.lastInsertId!, idF2],
    );
  }

  function textoDe(selector: string): string {
    return fixture.debugElement.query(By.css(selector)).nativeElement.textContent.replace(/\s+/g, ' ').trim();
  }

  beforeEach(async () => {
    db = await SqlJsDatabase.create();
    await migrar(db, MIGRACIONES);

    paramId = null;
    mockRouter = {
      navigate: vi.fn().mockResolvedValue(true),
    };
    mockModal = {
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ data: null, role: ROL_CANCELAR }),
    };
    mockModalCtrl = {
      create: vi.fn().mockResolvedValue(mockModal),
    };
    mockToastPresent = vi.fn().mockResolvedValue(undefined);
    mockToastCtrl = {
      create: vi.fn().mockResolvedValue({ present: mockToastPresent }),
    };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ExpedientePage],
      providers: [
        ConsultarExpediente,
        RegistrarAbono,
        CarteraRepository,
        AbonoRepository,
        ClienteRepository,
        LibroRepository,
        { provide: SQL_DATABASE, useValue: db },
        { provide: CLOCK, useValue: { ahora: () => ahora } },
        { provide: Router, useValue: mockRouter },
        { provide: ModalController, useValue: mockModalCtrl },
        { provide: ToastController, useValue: mockToastCtrl },
        {
          provide: ActivatedRoute,
          useValue: {
            get snapshot() {
              return { paramMap: convertToParamMap(paramId === null ? {} : { id: paramId }) };
            },
          },
        },
      ],
    }).compileComponents();

    consultarExpediente = TestBed.inject(ConsultarExpediente);
    registrarAbono = TestBed.inject(RegistrarAbono);
    fixture = TestBed.createComponent(ExpedientePage);
    page = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('C1-C8 integracion real SQLite: muestra cabecera, orden facturas/abonos, etiquetas, colores, y marca quedo pagada al completar', async () => {
    await seedEscenarioBase();
    paramId = String(idAna);

    await page.ionViewWillEnter();
    fixture.detectChanges();

    expect(textoDe('.exp-avatar')).toBe('A');
    expect(textoDe('[data-testid="expediente-nombre"]')).toBe('Ana');
    expect(textoDe('[data-testid="expediente-celular"]')).toBe('3104567890');
    expect(textoDe('[data-testid="expediente-deuda-total"]')).toBe('$ 40.000');
    expect(textoDe('[data-testid="expediente-facturas-con-saldo"]')).toBe('2 facturas con saldo');
    expect(textoDe('[data-testid="expediente-capital"]')).toBe('$ 25.000');
    expect(textoDe('[data-testid="expediente-ganancia"]')).toBe('$ 15.000');

    // Abono cascada $35.000 en Transferencia: paga F1 ($30.000 -> PAGADA) y abona $5.000 a F2 (saldo $5.000)
    await registrarAbono.registrar({
      modo: 'CASCADA_GLOBAL',
      idCliente: idAna,
      fecha: fechaHora('2026-11-12 14:00:00'),
      medio: 'TRANSFERENCIA',
      monto: pesos(35000),
    });

    await page.ionViewWillEnter();
    fixture.detectChanges();

    expect(textoDe('[data-testid="expediente-facturas-con-saldo"]')).toBe('1 factura con saldo');
    expect(textoDe('[data-testid="btn-pagar-todo"]')).toBe('Pagar todo · $ 5.000');

    // Pestana Abonos: primero $35.000 Transferencia, segundo $5.000 Efectivo
    page.onPestanaChange({ detail: { value: 'abonos' } } as CustomEvent);
    fixture.detectChanges();

    const tarjetasAbono = fixture.debugElement.queryAll(By.css('[data-testid="tarjeta-abono"]'));
    expect(tarjetasAbono).toHaveLength(2);
    expect(tarjetasAbono[0].nativeElement.textContent).toContain('$ 35.000');
    expect(tarjetasAbono[0].nativeElement.textContent).toContain('A la deuda');
    expect(tarjetasAbono[0].query(By.css('.app-chip-transferencia')).nativeElement.textContent).toContain(
      'Transferencia',
    );
    const apps0 = tarjetasAbono[0].queryAll(By.css('[data-testid="aplicacion-abono"]'));
    expect(apps0[0].nativeElement.textContent.replace(/\s+/g, ' ').trim()).toContain(`Factura #${idF1} · quedó pagada`);
    expect(apps0[1].nativeElement.textContent).not.toContain('quedó pagada');

    // Liquidar el resto con LIQUIDACION_TOTAL ("Pagar todo") -> completa F2 y solo este ultimo abono marca F2 como pagada
    await registrarAbono.registrar({
      modo: 'LIQUIDACION_TOTAL',
      idCliente: idAna,
      fecha: fechaHora('2026-11-15 16:00:00'),
      medio: 'EFECTIVO',
    });

    await page.ionViewWillEnter();
    fixture.detectChanges();

    expect(textoDe('[data-testid="expediente-deuda-total"]')).toBe('$ 0');
    expect(textoDe('[data-testid="expediente-facturas-con-saldo"]')).toBe('Al día');
    expect(
      Boolean(fixture.debugElement.query(By.css('[data-testid="btn-registrar-abono"]')).nativeElement.disabled),
    ).toBe(true);
    expect(
      fixture.debugElement
        .query(By.css('[data-testid="btn-registrar-abono"]'))
        .nativeElement.getAttribute('aria-disabled'),
    ).toBe('true');
    expect(Boolean(fixture.debugElement.query(By.css('[data-testid="btn-pagar-todo"]')).nativeElement.disabled)).toBe(
      true,
    );
    expect(
      fixture.debugElement.query(By.css('[data-testid="btn-pagar-todo"]')).nativeElement.getAttribute('aria-disabled'),
    ).toBe('true');

    const tarjetasAbonoFinal = fixture.debugElement.queryAll(By.css('[data-testid="tarjeta-abono"]'));
    expect(tarjetasAbonoFinal).toHaveLength(3);
    expect(tarjetasAbonoFinal[0].nativeElement.textContent).toContain('Pagar todo');
    expect(tarjetasAbonoFinal[0].nativeElement.textContent).toContain(`Factura #${idF2} · quedó pagada`);
    expect(tarjetasAbonoFinal[1].nativeElement.textContent).not.toContain(`Factura #${idF2} · quedó pagada`);
    expect(tarjetasAbonoFinal[2].nativeElement.textContent).not.toContain(`Factura #${idF2} · quedó pagada`);
  });

  it('C8 empate exacto de fecha entre dos abonos: solo el de mayor idAbono marca quedo pagada', () => {
    const f: FacturaExpediente = {
      idVenta: 10,
      fecha: fechaHora('2026-11-01 09:00:00'),
      total: pesos(20000),
      costoBase: pesos(12000),
      pagado: pesos(20000),
      saldo: pesos(0),
      estado: 'PAGADA',
      lineas: [{ cantidad: resmas(1), tipoPapel: 'CARTA', precioUnitario: pesos(20000), subtotal: pesos(20000) }],
    };
    const mismaFecha = fechaHora('2026-11-10 10:00:00');
    const a1: AbonoExpediente = {
      idAbono: 1,
      fecha: mismaFecha,
      monto: pesos(10000),
      medio: 'EFECTIVO',
      tipo: 'ABONO_INICIAL',
      aplicaciones: [{ idVenta: 10, monto: pesos(10000) }],
    };
    const a2: AbonoExpediente = {
      idAbono: 2,
      fecha: mismaFecha,
      monto: pesos(10000),
      medio: 'EFECTIVO',
      tipo: 'FACTURA_INDIVIDUAL',
      aplicaciones: [{ idVenta: 10, monto: pesos(10000) }],
    };

    const set = calcularAplicacionesQuePagaron([f], [a2, a1]);
    expect(set.has('1:10')).toBe(false);
    expect(set.has('2:10')).toBe(true);
  });

  it('C9 y C11: segundo boton Abonar a esta factura (F1) pasa idVentaInicial correcto y guarda contra doble toque', async () => {
    await seedEscenarioBase();
    paramId = String(idAna);
    await page.ionViewWillEnter();
    fixture.detectChanges();

    // Segundo boton "Abonar a esta factura" corresponde a F1 (mas antigua, aparece segunda)
    const btnsAbonar = fixture.debugElement.queryAll(By.css('[data-testid="btn-abonar-factura"]'));
    expect(btnsAbonar).toHaveLength(2);
    btnsAbonar[1].nativeElement.click();
    await new Promise((r) => setTimeout(r, 0));

    expect(mockModalCtrl.create).toHaveBeenCalledTimes(1);
    const callArg = mockModalCtrl.create.mock.calls[0][0];
    expect(callArg.canDismiss).toBe(soloCierreExplicito);
    const props = callArg.componentProps;
    expect(props.modoInicial).toBe('FACTURA_INDIVIDUAL');
    expect(props.idVentaInicial).toBe(idF1);
    // Facturas abiertas ordenadas de la mas antigua a la mas nueva: F1 primero, F2 segundo
    expect(props.facturas.map((f: FacturaAbierta) => f.idVenta)).toEqual([idF1, idF2]);

    // Doble toque concurrente en abrirAbono solo abre un modal
    let resolverCreate: (m: unknown) => void = () => undefined;
    mockModalCtrl.create.mockClear();
    mockModalCtrl.create.mockReturnValueOnce(new Promise((r) => (resolverCreate = r)));
    const p1 = page.abrirAbono('CASCADA_GLOBAL');
    const p2 = page.abrirAbono('CASCADA_GLOBAL');
    expect(mockModalCtrl.create).toHaveBeenCalledTimes(1);
    resolverCreate(mockModal);
    await Promise.all([p1, p2]);
  });

  it('C12: Editar con doble toque y error de creacion muestra toast y libera guarda; sin guardar no recarga', async () => {
    await seedEscenarioBase();
    paramId = String(idAna);
    await page.ionViewWillEnter();
    fixture.detectChanges();

    const spyConsultar = vi.spyOn(consultarExpediente, 'consultar');

    // Cierre sin guardar -> no recarga
    mockModal.onDidDismiss.mockResolvedValueOnce({ data: null, role: ROL_CANCELAR });
    await page.abrirEditar();
    expect(mockModalCtrl.create).toHaveBeenCalledWith(
      expect.objectContaining({
        component: ClienteModalComponent,
        componentProps: {
          cliente: { idCliente: idAna, nombre: 'Ana', telefono: '3104567890', esMostrador: false },
        },
      }),
    );
    expect(spyConsultar).not.toHaveBeenCalled();

    // Error al abrir modal -> toast y libera guarda
    mockModalCtrl.create.mockRejectedValueOnce(new Error('Modal boom'));
    await page.abrirEditar();
    expect(mockToastCtrl.create).toHaveBeenCalledWith(
      expect.objectContaining({ message: MENSAJE_ERROR_GENERICO, color: 'danger' }),
    );
    expect(mockToastPresent).toHaveBeenCalled();

    // Reintentar funciona despues del error
    mockModalCtrl.create.mockResolvedValueOnce(mockModal);
    await page.abrirEditar();
    expect(mockModalCtrl.create).toHaveBeenCalledTimes(3);
  });

  it('C13 y C14: IDs invalidos, cliente sin telefono/compras, error despues de carga previa y rechazo tardio viejo', async () => {
    await seedEscenarioBase();

    // Cliente sin telefono y sin compras (Beto)
    paramId = String(idBeto);
    await page.ionViewWillEnter();
    fixture.detectChanges();
    expect(textoDe('.exp-avatar')).toBe('BG');
    expect(textoDe('[data-testid="expediente-celular"]')).toBe('Sin celular');
    expect(textoDe('[data-testid="mensaje-sin-compras"]')).toBe('Este cliente todavía no tiene compras');
    expect(
      Boolean(fixture.debugElement.query(By.css('[data-testid="btn-registrar-abono"]')).nativeElement.disabled),
    ).toBe(true);

    // ID invalido en URL ('abc') -> "El cliente no existe" solo con Volver
    paramId = 'abc';
    await page.ionViewWillEnter();
    fixture.detectChanges();
    expect(textoDe('[data-testid="mensaje-error-carga"]')).toBe(MENSAJES_ERROR.CLIENTE_INEXISTENTE);
    expect(fixture.debugElement.query(By.css('[data-testid="btn-volver-error"]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[data-testid="btn-reintentar"]'))).toBeNull();

    // ID numerico inexistente en BD (9999) -> ConsultarExpediente lanza CLIENTE_INEXISTENTE -> "El cliente no existe" solo con Volver
    paramId = '9999';
    await page.ionViewWillEnter();
    fixture.detectChanges();
    expect(textoDe('[data-testid="mensaje-error-carga"]')).toBe(MENSAJES_ERROR.CLIENTE_INEXISTENTE);
    expect(fixture.debugElement.query(By.css('[data-testid="btn-volver-error"]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[data-testid="btn-reintentar"]'))).toBeNull();

    // Error inesperado despues de tener datos -> muestra error y NO "sin compras"
    paramId = String(idAna);
    await page.ionViewWillEnter();
    fixture.detectChanges();
    expect(textoDe('[data-testid="expediente-nombre"]')).toBe('Ana');

    const spyConsultar = vi.spyOn(consultarExpediente, 'consultar');
    spyConsultar.mockRejectedValueOnce(new Error('IO failure'));
    await page.ionViewWillEnter();
    fixture.detectChanges();
    expect(textoDe('[data-testid="mensaje-error-carga"]')).toBe(MENSAJE_ERROR_GENERICO);
    expect(fixture.debugElement.query(By.css('[data-testid="mensaje-sin-compras"]'))).toBeNull();
    expect(fixture.debugElement.query(By.css('[data-testid="btn-reintentar"]'))).toBeTruthy();

    // Rechazo tardio de peticion vieja no pisa una respuesta nueva exitosa
    let rechazarVieja: (err: Error) => void = () => undefined;
    let resolverNueva: (exp: ExpedienteCliente) => void = () => undefined;
    spyConsultar
      .mockReturnValueOnce(new Promise<ExpedienteCliente>((_res, rej) => (rechazarVieja = rej)))
      .mockReturnValueOnce(new Promise<ExpedienteCliente>((res) => (resolverNueva = res)));

    const pVieja = page.cargarExpediente(idAna);
    const pNueva = page.cargarExpediente(idAna);

    const expAna = await consultarExpediente.consultar.call(consultarExpediente, idAna);
    resolverNueva(expAna);
    await pNueva;
    rechazarVieja(new Error('Late stale error'));
    await pVieja;
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="estado-error"]'))).toBeNull();
    expect(textoDe('[data-testid="expediente-nombre"]')).toBe('Ana');
  });
});

describe('Verificacion independiente B4.3 — C10, C21, C22, C23 en modales', () => {
  const ana: Cliente = { idCliente: 7, nombre: 'Ana', telefono: '3104567890', esMostrador: false };
  const f1: FacturaAbierta = {
    idVenta: 1,
    fecha: fechaHora('2026-11-01 10:00:00'),
    total: pesos(30000),
    costoBase: pesos(20000),
    pagado: pesos(0),
  };
  const f2: FacturaAbierta = {
    idVenta: 2,
    fecha: fechaHora('2026-11-10 10:00:00'),
    total: pesos(15000),
    costoBase: pesos(10000),
    pagado: pesos(5000),
  };

  it('C10 borde: con una sola factura abierta e idVentaInicial inexistente, NO autoselecciona esa factura y deshabilita Revisar', async () => {
    const mockModalCtrl = { create: vi.fn(), dismiss: vi.fn().mockResolvedValue(true) };
    const mockToastCtrl = { create: vi.fn().mockResolvedValue({ present: vi.fn().mockResolvedValue(undefined) }) };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [AbonoModalComponent],
      providers: [
        { provide: CLOCK, useValue: { ahora: () => fechaHora('2026-11-20 12:00:00') } },
        { provide: ModalController, useValue: mockModalCtrl },
        { provide: ToastController, useValue: mockToastCtrl },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AbonoModalComponent);
    const comp = fixture.componentInstance;
    comp.cliente = ana;
    comp.facturas = [f2];
    comp.modoInicial = 'FACTURA_INDIVIDUAL';
    comp.idVentaInicial = 999;
    fixture.detectChanges();

    expect(comp.idVentaSeleccionada()).toBeNull();
    comp.monto.set(5000);
    fixture.detectChanges();

    const btnRevisar = fixture.debugElement.query(By.css('[data-testid="btn-revisar-abono"]')).nativeElement;
    expect(Boolean(btnRevisar.disabled)).toBe(true);
    expect(btnRevisar.getAttribute('aria-disabled')).toBe('true');
  });

  it('C21 y C23: present() falla antes de guardar muestra toast y libera UI; si ya guardo y dismiss falla no muestra toast', async () => {
    const mockResumen = {
      present: vi.fn().mockRejectedValueOnce(new Error('Present boom')),
      onDidDismiss: vi.fn(),
    };
    const mockModalCtrl = {
      create: vi.fn().mockResolvedValue(mockResumen),
      dismiss: vi.fn().mockRejectedValueOnce(new Error('Dismiss boom')),
    };
    const mockToastPresent = vi.fn().mockResolvedValue(undefined);
    const mockToastCtrl = {
      create: vi.fn().mockResolvedValue({ present: mockToastPresent }),
    };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [AbonoModalComponent],
      providers: [
        { provide: CLOCK, useValue: { ahora: () => fechaHora('2026-11-20 12:00:00') } },
        { provide: ModalController, useValue: mockModalCtrl },
        { provide: ToastController, useValue: mockToastCtrl },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AbonoModalComponent);
    const comp = fixture.componentInstance;
    comp.cliente = ana;
    comp.facturas = [f1, f2];
    comp.monto.set(5000);
    fixture.detectChanges();

    // Falla present() antes de guardar -> toast con mensajeDeError y abriendoResumen vuelve a false
    await comp.abrirResumen();
    fixture.detectChanges();

    expect(mockToastCtrl.create).toHaveBeenCalledWith(
      expect.objectContaining({ message: MENSAJE_ERROR_GENERICO, color: 'danger' }),
    );
    expect(mockToastPresent).toHaveBeenCalledTimes(1);
    expect(comp.abriendoResumen()).toBe(false);
    expect(
      Boolean(fixture.debugElement.query(By.css('[data-testid="btn-cancelar-abono"]')).nativeElement.disabled),
    ).toBe(false);

    // Ahora alGuardar() se dispara, luego dismiss del padre falla -> NO toast
    mockToastCtrl.create.mockClear();
    mockResumen.present.mockResolvedValueOnce(undefined);
    mockResumen.onDidDismiss.mockImplementationOnce(async () => {
      const props = mockModalCtrl.create.mock.calls[1][0].componentProps;
      props.alGuardar();
      return { data: { guardado: true }, role: ROL_GUARDADO };
    });

    await comp.abrirResumen();
    expect(mockToastCtrl.create).not.toHaveBeenCalled();
    expect(comp.abriendoResumen()).toBe(false);
  });

  it('C22: volverAEditar tras dismiss fallido permite reintentar y ejecutar una sola llamada concurrente', async () => {
    const mockRegistrar = { registrar: vi.fn().mockResolvedValue({ idAbono: 1, aplicaciones: [] }) };
    const mockModalCtrl = { dismiss: vi.fn().mockRejectedValueOnce(new Error('Dismiss error')) };
    const mockToastCtrl = { create: vi.fn().mockResolvedValue({ present: vi.fn() }) };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ResumenAbonoModalComponent],
      providers: [
        { provide: RegistrarAbono, useValue: mockRegistrar },
        { provide: ModalController, useValue: mockModalCtrl },
        { provide: ToastController, useValue: mockToastCtrl },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ResumenAbonoModalComponent);
    const comp = fixture.componentInstance;
    comp.cliente = ana;
    comp.solicitud = {
      modo: 'CASCADA_GLOBAL',
      idCliente: 7,
      fecha: fechaHora('2026-11-20 12:00:00'),
      medio: 'EFECTIVO',
      monto: pesos(5000),
    };
    comp.montoTotal = pesos(5000);
    comp.deudaAnterior = pesos(40000);
    const lineas: readonly LineaResumenAbono[] = [
      {
        idVenta: 1,
        monto: pesos(5000),
        capital: pesos(5000),
        ganancia: pesos(0),
        quedaPagada: false,
        saldoRestante: pesos(25000),
      },
    ];
    comp.lineas = lineas;
    fixture.detectChanges();

    await expect(comp.volverAEditar()).resolves.toBeUndefined();

    // Segundo intento exitoso tras fallo previo, con doble toque
    let resolver: (ok: boolean) => void = () => undefined;
    mockModalCtrl.dismiss.mockReturnValueOnce(new Promise<boolean>((r) => (resolver = r)));
    const p1 = comp.volverAEditar();
    const p2 = comp.volverAEditar();
    expect(mockModalCtrl.dismiss).toHaveBeenCalledTimes(2);
    resolver(true);
    await Promise.all([p1, p2]);
  });
});
