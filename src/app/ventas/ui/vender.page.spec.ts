import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ModalController, ToastController } from '@ionic/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BuscarClientes } from '../../clientes/application/buscar-clientes';
import type { Cliente } from '../../clientes/domain/cliente';
import { ClienteModalComponent } from '../../clientes/ui/cliente.modal';
import { ConsultarInventario } from '../../inventario/application/consultar-inventario';
import type { Lote } from '../../inventario/domain/lote';
import { cajas, fechaHora, pesos, resmas } from '../../shared/domain';
import { CLOCK } from '../../shared/infrastructure/clock/clock.token';
import { ROL_CANCELAR, ROL_GUARDADO, soloCierreExplicito } from '../../shared/ui/formulario';
import { MENSAJES_ERROR, MENSAJE_ERROR_GENERICO } from '../../shared/ui/mensajes-error';

import { ResumenVentaModalComponent, ROL_ERROR } from './resumen-venta.modal';
import { SelectorClienteContenidoComponent } from './selector-cliente-contenido.component';
import { VenderPage } from './vender.page';

describe('VenderPage', () => {
  let fixture: ComponentFixture<VenderPage>;
  let component: VenderPage;
  let mockConsultarInventario: { activos: ReturnType<typeof vi.fn> };
  let mockBuscarClientes: { buscar: ReturnType<typeof vi.fn> };
  let mockModalCtrl: { create: ReturnType<typeof vi.fn> };
  let mockToastCtrl: { create: ReturnType<typeof vi.fn> };
  let mockToastPresent: ReturnType<typeof vi.fn>;
  let mockClock: { ahora: ReturnType<typeof vi.fn> };

  const ahoraFija = fechaHora('2026-11-15 14:30:00');

  const mostrador: Cliente = {
    idCliente: 1,
    nombre: 'Mostrador',
    telefono: null,
    esMostrador: true,
  };

  const ana: Cliente = {
    idCliente: 2,
    nombre: 'Ana María Pérez',
    telefono: '3001234567',
    esMostrador: false,
  };

  const loteCartaA: Lote = {
    idLote: 10,
    tipoPapel: 'CARTA',
    fechaCompra: fechaHora('2026-11-10 09:00:00'),
    cantidadCajas: cajas(2),
    costoPorCaja: pesos(120000),
    costoUnitarioResma: pesos(12000),
    resmasIniciales: resmas(20),
    resmasDisponibles: resmas(20),
    medioPagoCompra: 'EFECTIVO',
    estado: 'ACTIVO',
  };

  const loteOficioC: Lote = {
    idLote: 11,
    tipoPapel: 'OFICIO',
    fechaCompra: fechaHora('2026-11-11 09:00:00'),
    cantidadCajas: cajas(1),
    costoPorCaja: pesos(140000),
    costoUnitarioResma: pesos(14000),
    resmasIniciales: resmas(10),
    resmasDisponibles: resmas(10),
    medioPagoCompra: 'EFECTIVO',
    estado: 'ACTIVO',
  };

  beforeEach(async () => {
    mockConsultarInventario = {
      activos: vi.fn().mockResolvedValue({
        CARTA: [loteCartaA],
        OFICIO: [loteOficioC],
      }),
    };
    mockBuscarClientes = {
      buscar: vi.fn().mockResolvedValue([mostrador, ana]),
    };
    mockModalCtrl = {
      create: vi.fn().mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
        onDidDismiss: vi.fn().mockResolvedValue({ data: ana, role: ROL_GUARDADO }),
      }),
    };
    mockToastPresent = vi.fn().mockResolvedValue(undefined);
    mockToastCtrl = {
      create: vi.fn().mockResolvedValue({ present: mockToastPresent }),
    };
    mockClock = {
      ahora: vi.fn().mockReturnValue(ahoraFija),
    };

    await TestBed.configureTestingModule({
      imports: [VenderPage],
      providers: [
        { provide: ConsultarInventario, useValue: mockConsultarInventario },
        { provide: BuscarClientes, useValue: mockBuscarClientes },
        { provide: ModalController, useValue: mockModalCtrl },
        { provide: ToastController, useValue: mockToastCtrl },
        { provide: CLOCK, useValue: mockClock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VenderPage);
    component = fixture.componentInstance;
  });

  function botonConfirmar() {
    return fixture.debugElement.query(By.css('[data-testid="btn-confirmar-venta"]'));
  }

  function estaDeshabilitado(el: ReturnType<typeof botonConfirmar>): boolean {
    return Boolean(el.nativeElement.disabled);
  }

  it('validates quantity and price (empty, invalid, valid) with exact error text and Confirmar venta state (E15)', async () => {
    await component.ionViewWillEnter();
    fixture.detectChanges();

    // Without lines, Confirmar venta is disabled
    expect(estaDeshabilitado(botonConfirmar())).toBe(true);

    // Add lot A -> quantity defaults to 1, price is null
    component.agregarLote(loteCartaA);
    fixture.detectChanges();

    expect(estaDeshabilitado(botonConfirmar())).toBe(true);
    expect(
      fixture.debugElement.query(By.css('[data-testid="error-precio-unitario"]')).nativeElement.textContent.trim(),
    ).toBe(MENSAJES_ERROR.PRECIO_INVALIDO);

    // Empty quantity -> CANTIDAD_RESMAS_INVALIDA
    component.actualizarCantidad(loteCartaA.idLote, '');
    fixture.detectChanges();
    expect(estaDeshabilitado(botonConfirmar())).toBe(true);
    expect(fixture.debugElement.query(By.css('[data-testid="error-cantidad"]')).nativeElement.textContent.trim()).toBe(
      MENSAJES_ERROR.CANTIDAD_RESMAS_INVALIDA,
    );

    // Quantity 0 -> CANTIDAD_RESMAS_INVALIDA
    component.actualizarCantidad(loteCartaA.idLote, '0');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="error-cantidad"]')).nativeElement.textContent.trim()).toBe(
      MENSAJES_ERROR.CANTIDAD_RESMAS_INVALIDA,
    );

    // Quantity > disponibles -> STOCK_INSUFICIENTE
    component.actualizarCantidad(loteCartaA.idLote, '21');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="error-cantidad"]')).nativeElement.textContent.trim()).toBe(
      MENSAJES_ERROR.STOCK_INSUFICIENTE,
    );

    // Valid quantity (5) and price 0 -> PRECIO_INVALIDO
    component.actualizarCantidad(loteCartaA.idLote, '5');
    component.actualizarPrecio(loteCartaA.idLote, 0);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="error-cantidad"]'))).toBeNull();
    expect(
      fixture.debugElement.query(By.css('[data-testid="error-precio-unitario"]')).nativeElement.textContent.trim(),
    ).toBe(MENSAJES_ERROR.PRECIO_INVALIDO);
    expect(estaDeshabilitado(botonConfirmar())).toBe(true);

    // Valid price (15000) -> no errors and Confirmar venta enabled
    component.actualizarPrecio(loteCartaA.idLote, 15000);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="error-precio-unitario"]'))).toBeNull();
    expect(estaDeshabilitado(botonConfirmar())).toBe(false);
  });

  it('shows exact below-cost warning when unit price is below lot cost (E14)', async () => {
    await component.ionViewWillEnter();
    component.agregarLote(loteCartaA);
    component.actualizarCantidad(loteCartaA.idLote, '1');
    component.actualizarPrecio(loteCartaA.idLote, 11000);
    fixture.detectChanges();

    const aviso = fixture.debugElement.query(By.css('[data-testid="aviso-bajo-costo"]'));
    expect(aviso).toBeTruthy();
    expect(aviso.nativeElement.textContent.trim()).toBe('Precio por debajo del costo: pierdes $ 1.000');
    expect(estaDeshabilitado(botonConfirmar())).toBe(false);
  });

  it('offers only Contado for Mostrador, all three modalities for Ana, and defaults to Efectivo (S11, D12)', async () => {
    await component.ionViewWillEnter();
    fixture.detectChanges();

    // Mostrador is default -> only Contado segment button, Efectivo default
    expect(component.clienteSeleccionado()?.esMostrador).toBe(true);
    expect(component.medio()).toBe('EFECTIVO');
    expect(fixture.debugElement.query(By.css('[data-testid="segment-contado"]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[data-testid="segment-fiado"]'))).toBeNull();
    expect(fixture.debugElement.query(By.css('[data-testid="segment-abono-inicial"]'))).toBeNull();

    // Select Ana -> all three modalities available
    component.seleccionarCliente(ana);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="segment-contado"]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[data-testid="segment-fiado"]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[data-testid="segment-abono-inicial"]'))).toBeTruthy();
  });

  it('shows payment method helper text only when Mostrador is selected (B3B.P)', async () => {
    await component.ionViewWillEnter();
    component.agregarLote(loteCartaA);
    fixture.detectChanges();

    expect(component.clienteSeleccionado()?.esMostrador).toBe(true);
    const ayuda = fixture.debugElement.query(By.css('[data-testid="ayuda-forma-pago"]'));
    expect(ayuda).toBeTruthy();
    expect(ayuda.nativeElement.textContent.trim()).toBe('Para vender fiado o con abono, elige un cliente.');

    component.seleccionarCliente(ana);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="ayuda-forma-pago"]'))).toBeNull();
  });

  it('validates abono inicial: $ 0 and total are invalid, $ 1 and total - 1 are valid (E10)', async () => {
    await component.ionViewWillEnter();
    component.seleccionarCliente(ana);
    component.agregarLote(loteCartaA);
    component.actualizarCantidad(loteCartaA.idLote, '4');
    component.actualizarPrecio(loteCartaA.idLote, 15000); // total = 60000
    component.modalidad.set('ABONO_INICIAL');
    fixture.detectChanges();

    // $0 -> invalid
    component.montoAbonoInicial.set(0);
    fixture.detectChanges();
    expect(
      fixture.debugElement.query(By.css('[data-testid="error-abono-inicial"]')).nativeElement.textContent.trim(),
    ).toBe(MENSAJES_ERROR.ABONO_INICIAL_INVALIDO);
    expect(estaDeshabilitado(botonConfirmar())).toBe(true);

    // Equal to total (60000) -> invalid
    component.montoAbonoInicial.set(60000);
    fixture.detectChanges();
    expect(
      fixture.debugElement.query(By.css('[data-testid="error-abono-inicial"]')).nativeElement.textContent.trim(),
    ).toBe(MENSAJES_ERROR.ABONO_INICIAL_INVALIDO);
    expect(estaDeshabilitado(botonConfirmar())).toBe(true);

    // $1 -> valid
    component.montoAbonoInicial.set(1);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="error-abono-inicial"]'))).toBeNull();
    expect(estaDeshabilitado(botonConfirmar())).toBe(false);

    // total - 1 (59999) -> valid
    component.montoAbonoInicial.set(59999);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="error-abono-inicial"]'))).toBeNull();
    expect(estaDeshabilitado(botonConfirmar())).toBe(false);
  });

  it('prevents adding the same lot twice and disables it in the lot list (D5)', async () => {
    await component.ionViewWillEnter();
    fixture.detectChanges();

    component.agregarLote(loteCartaA);
    component.agregarLote(loteCartaA);
    fixture.detectChanges();

    expect(component.lineas()).toHaveLength(1);
    const itemsLote = fixture.debugElement.queryAll(By.css('[data-testid="item-lote"]'));
    expect(Boolean(itemsLote[0].nativeElement.disabled)).toBe(true);
    expect(itemsLote[0].attributes['aria-disabled']).toBe('true');
  });

  it('opens ResumenVentaModalComponent with exact E19 props and keeps sale intact when dismissed with ROL_CANCELAR', async () => {
    mockModalCtrl.create.mockResolvedValueOnce({
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ data: null, role: ROL_CANCELAR }),
    });

    await component.ionViewWillEnter();
    component.seleccionarCliente(ana);
    component.agregarLote(loteCartaA);
    component.actualizarCantidad(loteCartaA.idLote, '5');
    component.actualizarPrecio(loteCartaA.idLote, 15000);
    fixture.detectChanges();

    await component.abrirResumen();

    expect(mockModalCtrl.create).toHaveBeenCalledWith({
      component: ResumenVentaModalComponent,
      breakpoints: [0, 0.85, 1],
      initialBreakpoint: 0.85,
      cssClass: 'modal-sheet',
      componentProps: {
        cliente: ana,
        lineas: [
          {
            idLote: loteCartaA.idLote,
            tipoPapel: 'CARTA',
            cantidad: 5,
            precioUnitario: pesos(15000),
            subtotalVenta: pesos(75000),
          },
        ],
        totalVenta: pesos(75000),
        pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
        fecha: ahoraFija,
        alCambiarGuardando: expect.any(Function),
        alGuardar: expect.any(Function),
      },
      canDismiss: soloCierreExplicito,
    });
    expect(component.clienteSeleccionado()).toEqual(ana);
    expect(component.lineas()).toHaveLength(1);
  });

  it('resets client to Mostrador and reloads lots after summary modal saves (D12, E13)', async () => {
    mockModalCtrl.create.mockResolvedValueOnce({
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ data: { guardado: true }, role: ROL_GUARDADO }),
    });

    await component.ionViewWillEnter();
    component.seleccionarCliente(ana);
    component.agregarLote(loteCartaA);
    component.actualizarCantidad(loteCartaA.idLote, '5');
    component.actualizarPrecio(loteCartaA.idLote, 15000);
    fixture.detectChanges();

    mockConsultarInventario.activos.mockResolvedValueOnce({
      CARTA: [],
      OFICIO: [loteOficioC],
    });

    await component.abrirResumen();
    fixture.detectChanges();

    expect(component.clienteSeleccionado()?.esMostrador).toBe(true);
    expect(component.lineas()).toHaveLength(0);
    expect(component.lotes()).toEqual([loteOficioC]);
  });

  it('shows error state with Reintentar when lot or customer load fails (not empty state) and recovers on retry (E18)', async () => {
    mockConsultarInventario.activos.mockRejectedValueOnce(new Error('DB error'));

    await component.ionViewWillEnter();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="estado-error"]'))).toBeTruthy();
    expect(
      fixture.debugElement.query(By.css('[data-testid="mensaje-error-carga"]')).nativeElement.textContent,
    ).toContain(MENSAJE_ERROR_GENERICO);
    expect(fixture.debugElement.query(By.css('[data-testid="btn-reintentar"]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[data-testid="mensaje-sin-lotes"]'))).toBeNull();

    // Retry succeeds
    await component.cargarDatos();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="estado-error"]'))).toBeNull();
    expect(fixture.debugElement.queryAll(By.css('[data-testid="item-lote"]'))).toHaveLength(2);
  });

  it('sets datetime max to CLOCK now and sends the chosen date to summary modal (D6, D13, E20)', async () => {
    await component.ionViewWillEnter();
    fixture.detectChanges();

    expect(component.maxFecha()).toBe('2026-11-15 14:30:00');

    component.agregarLote(loteCartaA);
    component.actualizarCantidad(loteCartaA.idLote, '5');
    component.actualizarPrecio(loteCartaA.idLote, 15000);
    component.onFechaSeleccionada('2026-11-14T18:00:00');
    fixture.detectChanges();

    await component.abrirResumen();

    expect(mockModalCtrl.create).toHaveBeenCalledWith(
      expect.objectContaining({
        componentProps: expect.objectContaining({
          fecha: '2026-11-14 18:00:00',
        }),
      }),
    );
  });

  it('shows exact error next to date and disables Confirmar venta when sale date precedes latest lot purchase, then recovers (G4, E22)', async () => {
    const loteB: Lote = {
      idLote: 12,
      tipoPapel: 'CARTA',
      fechaCompra: fechaHora('2026-11-14 10:00:00'),
      cantidadCajas: cajas(1),
      costoPorCaja: pesos(120000),
      costoUnitarioResma: pesos(12000),
      resmasIniciales: resmas(10),
      resmasDisponibles: resmas(10),
      medioPagoCompra: 'EFECTIVO',
      estado: 'ACTIVO',
    };
    mockConsultarInventario.activos.mockResolvedValue({
      CARTA: [loteCartaA, loteB],
      OFICIO: [],
    });

    await component.ionViewWillEnter();
    component.agregarLote(loteCartaA);
    component.actualizarCantidad(loteCartaA.idLote, '1');
    component.actualizarPrecio(loteCartaA.idLote, 15000);
    component.agregarLote(loteB);
    component.actualizarCantidad(loteB.idLote, '1');
    component.actualizarPrecio(loteB.idLote, 15000);

    // Date valid for loteCartaA (Nov 10) but before loteB (Nov 14 10:00)
    component.onFechaSeleccionada('2026-11-14T09:59:59');
    fixture.detectChanges();

    const errorEl = fixture.debugElement.query(By.css('[data-testid="error-fecha"]'));
    expect(errorEl).not.toBeNull();
    expect(errorEl.nativeElement.textContent.trim()).toBe(
      'La venta no puede ser anterior a la compra del lote (14/11/2026)',
    );
    expect(estaDeshabilitado(botonConfirmar())).toBe(true);

    // Removing loteB clears the error and enables Confirmar venta
    component.quitarLinea(loteB.idLote);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="error-fecha"]'))).toBeNull();
    expect(estaDeshabilitado(botonConfirmar())).toBe(false);

    // Adding loteB back brings the error back; fixing date to equal purchase clears it and enables button
    component.agregarLote(loteB);
    component.actualizarCantidad(loteB.idLote, '1');
    component.actualizarPrecio(loteB.idLote, 15000);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="error-fecha"]'))).not.toBeNull();
    expect(estaDeshabilitado(botonConfirmar())).toBe(true);

    component.onFechaSeleccionada('2026-11-14T10:00:00');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="error-fecha"]'))).toBeNull();
    expect(estaDeshabilitado(botonConfirmar())).toBe(false);
  });

  it('opens ClienteModalComponent from selector Nuevo cliente and selects the created customer', async () => {
    await component.ionViewWillEnter();
    component.abrirSelectorCliente();
    fixture.detectChanges();

    await component.crearNuevoCliente();
    fixture.detectChanges();

    expect(mockModalCtrl.create).toHaveBeenCalledWith({
      component: ClienteModalComponent,
      breakpoints: [0, 0.72, 1],
      initialBreakpoint: 0.72,
      cssClass: 'modal-sheet',
      canDismiss: soloCierreExplicito,
    });
    expect(component.clienteSeleccionado()).toEqual(ana);
    expect(component.selectorClienteAbierto()).toBe(false);
  });

  it('prevents double tap on Confirmar venta and re-enables even if modalCtrl.create fails (V1)', async () => {
    await component.ionViewWillEnter();
    component.agregarLote(loteCartaA);
    component.actualizarCantidad(loteCartaA.idLote, '2');
    component.actualizarPrecio(loteCartaA.idLote, 15000);
    fixture.detectChanges();

    let resolverModal: (modal: {
      present: ReturnType<typeof vi.fn>;
      onDidDismiss: ReturnType<typeof vi.fn>;
    }) => void = () => undefined;
    mockModalCtrl.create.mockReturnValueOnce(
      new Promise((resolve) => {
        resolverModal = resolve;
      }),
    );

    const p1 = component.abrirResumen();
    const p2 = component.abrirResumen();
    fixture.detectChanges();

    expect(mockModalCtrl.create).toHaveBeenCalledTimes(1);
    expect(estaDeshabilitado(botonConfirmar())).toBe(true);
    expect(botonConfirmar().attributes['aria-disabled']).toBe('true');

    resolverModal({
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ data: null, role: ROL_CANCELAR }),
    });
    await Promise.all([p1, p2]);
    fixture.detectChanges();

    expect(estaDeshabilitado(botonConfirmar())).toBe(false);

    // If modalCtrl.create fails, shows error toast and re-enables Confirmar venta (F10)
    mockModalCtrl.create.mockRejectedValueOnce(new Error('Modal create failed'));
    await expect(component.abrirResumen()).resolves.toBeUndefined();
    fixture.detectChanges();

    expect(mockToastCtrl.create).toHaveBeenCalledWith(
      expect.objectContaining({
        message: MENSAJE_ERROR_GENERICO,
        color: 'danger',
      }),
    );
    expect(mockToastPresent).toHaveBeenCalled();
    expect(estaDeshabilitado(botonConfirmar())).toBe(false);
  });

  it('locks the page while summary modal is saving (V2)', async () => {
    await component.ionViewWillEnter();
    component.seleccionarCliente(ana);
    component.agregarLote(loteCartaA);
    component.actualizarCantidad(loteCartaA.idLote, '2');
    component.actualizarPrecio(loteCartaA.idLote, 15000);
    fixture.detectChanges();

    let resolverDismiss: (res: { data: { guardado: boolean }; role: string }) => void = () => undefined;
    mockModalCtrl.create.mockResolvedValueOnce({
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockReturnValue(
        new Promise((resolve) => {
          resolverDismiss = resolve;
        }),
      ),
    });

    const p = component.abrirResumen();
    await Promise.resolve();

    const createArg = mockModalCtrl.create.mock.calls[0]?.[0] as {
      componentProps?: { alCambiarGuardando?: (estado: boolean) => void };
    };
    expect(createArg.componentProps?.alCambiarGuardando).toEqual(expect.any(Function));

    createArg.componentProps?.alCambiarGuardando?.(true);
    fixture.detectChanges();

    expect(component.guardando()).toBe(true);
    expect(fixture.debugElement.query(By.css('[data-testid="indicador-guardando"]'))).toBeTruthy();
    expect(estaDeshabilitado(botonConfirmar())).toBe(true);
    expect(Boolean(fixture.debugElement.query(By.css('[data-testid="btn-fecha-venta"]')).nativeElement.disabled)).toBe(
      true,
    );

    createArg.componentProps?.alCambiarGuardando?.(false);
    resolverDismiss({ data: { guardado: true }, role: ROL_GUARDADO });
    await p;
    fixture.detectChanges();

    expect(component.guardando()).toBe(false);
    expect(fixture.debugElement.query(By.css('[data-testid="indicador-guardando"]'))).toBeNull();
  });

  it('updates maxFecha with CLOCK each time the date picker is opened (V3)', async () => {
    await component.ionViewWillEnter();
    fixture.detectChanges();

    mockClock.ahora.mockReturnValue('2026-11-15 15:00:00');
    component.abrirSelectorFecha();
    fixture.detectChanges();
    expect(component.maxFecha()).toBe('2026-11-15 15:00:00');

    component.cerrarSelectorFecha();
    mockClock.ahora.mockReturnValue('2026-11-15 17:45:00');
    component.abrirSelectorFecha();
    fixture.detectChanges();
    expect(component.maxFecha()).toBe('2026-11-15 17:45:00');
  });

  it('shows error with Reintentar when customer search fails, keeps Reintentar disabled while retrying, recovers on retry, and discards stale search responses (V4, F11)', async () => {
    await component.ionViewWillEnter();
    fixture.detectChanges();

    const selectorFixture = TestBed.createComponent(SelectorClienteContenidoComponent);
    const sincronizarSelector = () => {
      selectorFixture.componentRef.setInput('busqueda', component.busquedaCliente());
      selectorFixture.componentRef.setInput('clientes', component.clientesSelector());
      selectorFixture.componentRef.setInput('buscando', component.buscandoClientes());
      selectorFixture.componentRef.setInput('errorBusqueda', component.errorBusquedaClientes());
      selectorFixture.detectChanges();
    };
    selectorFixture.componentInstance.reintentar.subscribe(() => component.reintentarBusquedaClientes());

    mockBuscarClientes.buscar.mockRejectedValueOnce(new Error('Search failed'));
    component.abrirSelectorCliente();
    await Promise.resolve();
    await Promise.resolve();
    sincronizarSelector();

    const bloqueError = selectorFixture.debugElement.query(By.css('[data-testid="estado-error-clientes"]'));
    expect(bloqueError).toBeTruthy();
    expect(
      selectorFixture.debugElement.query(By.css('[data-testid="mensaje-error-clientes"]')).nativeElement.textContent,
    ).toContain(MENSAJE_ERROR_GENERICO);
    const btnReintentar = selectorFixture.debugElement.query(By.css('[data-testid="btn-reintentar-clientes"]'));
    expect(btnReintentar).toBeTruthy();
    expect(Boolean(btnReintentar.nativeElement.disabled)).toBe(false);

    // Retry keeps error block visible with Reintentar disabled until result arrives
    let resolverReintento: (list: Cliente[]) => void = () => undefined;
    mockBuscarClientes.buscar.mockReturnValueOnce(
      new Promise<Cliente[]>((resolve) => {
        resolverReintento = resolve;
      }),
    );
    btnReintentar.triggerEventHandler('click', null);
    sincronizarSelector();

    expect(selectorFixture.debugElement.query(By.css('[data-testid="estado-error-clientes"]'))).toBeTruthy();
    const btnDurante = selectorFixture.debugElement.query(By.css('[data-testid="btn-reintentar-clientes"]'));
    expect(Boolean(btnDurante.nativeElement.disabled)).toBe(true);
    expect(btnDurante.attributes['aria-disabled']).toBe('true');

    resolverReintento([mostrador, ana]);
    await Promise.resolve();
    await Promise.resolve();
    sincronizarSelector();

    expect(selectorFixture.debugElement.query(By.css('[data-testid="estado-error-clientes"]'))).toBeNull();
    expect(selectorFixture.debugElement.queryAll(By.css('[data-testid="item-cliente-vender"]'))).toHaveLength(2);

    // Stale response does not overwrite newer search
    let resolveStale: (list: Cliente[]) => void = () => undefined;
    let resolveFresh: (list: Cliente[]) => void = () => undefined;
    mockBuscarClientes.buscar
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveStale = resolve;
        }),
      )
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFresh = resolve;
        }),
      );

    component.onBuscarClienteTexto('a');
    component.onBuscarClienteTexto('ana');

    resolveFresh([ana]);
    await Promise.resolve();
    await Promise.resolve();
    expect(component.clientesSelector()).toEqual([ana]);

    resolveStale([mostrador]);
    await Promise.resolve();
    await Promise.resolve();
    expect(component.clientesSelector()).toEqual([ana]);
  });

  it('disables date button and modality/payment segments while cargando() is true (V5)', () => {
    component.cargando.set(true);
    fixture.detectChanges();

    const btnFecha = fixture.debugElement.query(By.css('[data-testid="btn-fecha-venta"]'));
    const segModalidad = fixture.debugElement.query(By.css('[data-testid="segment-modalidad"]'));
    const segMedio = fixture.debugElement.query(By.css('[data-testid="segment-medio"]'));

    expect(Boolean(btnFecha.nativeElement.disabled)).toBe(true);
    expect(btnFecha.attributes['aria-disabled']).toBe('true');
    expect(Boolean(segModalidad.nativeElement.disabled)).toBe(true);
    expect(segModalidad.attributes['aria-disabled']).toBe('true');
    expect(Boolean(segMedio.nativeElement.disabled)).toBe(true);
    expect(segMedio.attributes['aria-disabled']).toBe('true');
  });

  it('reloads lots and preserves draft when summary modal closes with ROL_ERROR (F6)', async () => {
    mockModalCtrl.create.mockResolvedValueOnce({
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ data: { error: true }, role: ROL_ERROR }),
    });

    await component.ionViewWillEnter();
    component.seleccionarCliente(ana);
    component.agregarLote(loteCartaA);
    component.actualizarCantidad(loteCartaA.idLote, '5');
    component.actualizarPrecio(loteCartaA.idLote, 15000);
    fixture.detectChanges();

    const loteActualizado: Lote = { ...loteCartaA, resmasDisponibles: resmas(3) };
    mockConsultarInventario.activos.mockResolvedValueOnce({
      CARTA: [loteActualizado],
      OFICIO: [loteOficioC],
    });

    await component.abrirResumen();
    fixture.detectChanges();

    expect(component.lotes()).toEqual([loteActualizado, loteOficioC]);
    expect(component.clienteSeleccionado()).toEqual(ana);
    expect(component.lineas()).toHaveLength(1);
    expect(component.lineas()[0].cantidadTexto).toBe('5');
    expect(component.lineas()[0].precioUnitario).toBe(15000);
  });

  it('calculates totals only from valid lines and does not open summary when values are missing (F8)', async () => {
    await component.ionViewWillEnter();
    component.seleccionarCliente(ana);
    component.agregarLote(loteCartaA);
    component.actualizarCantidad(loteCartaA.idLote, '2');
    component.actualizarPrecio(loteCartaA.idLote, 15000);
    component.agregarLote(loteOficioC); // price is null -> invalid line
    fixture.detectChanges();

    expect(component.totalVenta()).toBe(pesos(30000));
    expect(component.costoTotal()).toBe(pesos(24000));
    expect(component.margenTotal()).toBe(pesos(6000));

    await component.abrirResumen();
    expect(mockModalCtrl.create).not.toHaveBeenCalled();
  });

  it('uses current CLOCK on ionViewWillEnter and abrirResumen unless user edited date manually, and resets after save (F9)', async () => {
    // CLOCK advances between construction and ionViewWillEnter
    mockClock.ahora.mockReturnValue('2026-11-15 16:00:00');
    await component.ionViewWillEnter();
    expect(component.fechaSeleccionada()).toBe('2026-11-15 16:00:00');

    // CLOCK advances before abrirResumen
    component.agregarLote(loteCartaA);
    component.actualizarCantidad(loteCartaA.idLote, '1');
    component.actualizarPrecio(loteCartaA.idLote, 15000);
    mockClock.ahora.mockReturnValue('2026-11-15 16:45:00');
    mockModalCtrl.create.mockResolvedValueOnce({
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ data: null, role: ROL_CANCELAR }),
    });
    await component.abrirResumen();
    expect(mockModalCtrl.create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        componentProps: expect.objectContaining({ fecha: '2026-11-15 16:45:00' }),
      }),
    );

    // User edits date manually -> respected even if CLOCK advances and on ionViewWillEnter
    component.onFechaSeleccionada('2026-11-14T10:30:00');
    mockClock.ahora.mockReturnValue('2026-11-15 18:00:00');
    await component.ionViewWillEnter();
    expect(component.fechaSeleccionada()).toBe('2026-11-14 10:30:00');

    // Saving resets manual flag so date returns to CLOCK.ahora()
    mockModalCtrl.create.mockResolvedValueOnce({
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ data: { guardado: true }, role: ROL_GUARDADO }),
    });
    await component.abrirResumen();
    expect(component.fechaSeleccionada()).toBe('2026-11-15 18:00:00');
  });

  it('shows error toast and releases guard when modal.present rejects in abrirResumen (F10)', async () => {
    await component.ionViewWillEnter();
    component.agregarLote(loteCartaA);
    component.actualizarCantidad(loteCartaA.idLote, '1');
    component.actualizarPrecio(loteCartaA.idLote, 15000);
    fixture.detectChanges();

    mockModalCtrl.create.mockResolvedValueOnce({
      present: vi.fn().mockRejectedValueOnce(new Error('Present failed')),
      onDidDismiss: vi.fn(),
    });

    await expect(component.abrirResumen()).resolves.toBeUndefined();
    fixture.detectChanges();

    expect(mockToastCtrl.create).toHaveBeenCalledWith(
      expect.objectContaining({
        message: MENSAJE_ERROR_GENERICO,
        color: 'danger',
      }),
    );
    expect(mockToastPresent).toHaveBeenCalled();
    expect(component.abriendoResumen()).toBe(false);
    expect(estaDeshabilitado(botonConfirmar())).toBe(false);
  });

  it('shows error state with Reintentar and never displays Mostrador when Mostrador is missing on load (F12)', async () => {
    mockBuscarClientes.buscar.mockResolvedValueOnce([ana]);

    await component.ionViewWillEnter();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="estado-error"]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[data-testid="btn-reintentar"]'))).toBeTruthy();
    expect(
      fixture.debugElement.query(By.css('[data-testid="selector-cliente"]')).nativeElement.textContent,
    ).not.toContain('Mostrador');
    expect(component.clienteSeleccionado()).toBeNull();
  });

  it('resets draft and reloads lots via alGuardar even when summary modal dismiss fails (H1)', async () => {
    await component.ionViewWillEnter();
    component.seleccionarCliente(ana);
    component.agregarLote(loteCartaA);
    component.actualizarCantidad(loteCartaA.idLote, '2');
    component.actualizarPrecio(loteCartaA.idLote, 15000);
    fixture.detectChanges();

    const loteActualizado: Lote = { ...loteCartaA, resmasDisponibles: resmas(18) };
    mockConsultarInventario.activos.mockResolvedValueOnce({
      CARTA: [loteActualizado],
      OFICIO: [loteOficioC],
    });

    mockModalCtrl.create.mockImplementationOnce(async (opts: { componentProps?: { alGuardar?: () => void } }) => ({
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockImplementation(async () => {
        opts.componentProps?.alGuardar?.();
        return { data: undefined, role: undefined };
      }),
    }));

    const genAntes = component.generacionReinicio();
    await component.abrirResumen();
    fixture.detectChanges();

    expect(component.lineas()).toEqual([]);
    expect(component.clienteSeleccionado()).toEqual(mostrador);
    expect(component.lotes()).toEqual([loteActualizado, loteOficioC]);
    expect(component.generacionReinicio()).toBe(genAntes + 1);
  });

  it('updates draft disponibles and fechaCompra on reload and marks STOCK_INSUFICIENTE when stock drops below draft quantity (H2)', async () => {
    await component.ionViewWillEnter();
    component.agregarLote(loteCartaA);
    component.actualizarCantidad(loteCartaA.idLote, '5');
    component.actualizarPrecio(loteCartaA.idLote, 15000);
    fixture.detectChanges();

    expect(estaDeshabilitado(botonConfirmar())).toBe(false);

    const nuevaFechaCompra = fechaHora('2026-11-12 10:00:00');
    const loteConMenosStock: Lote = {
      ...loteCartaA,
      resmasDisponibles: resmas(3),
      fechaCompra: nuevaFechaCompra,
    };
    mockConsultarInventario.activos.mockResolvedValueOnce({
      CARTA: [loteConMenosStock],
      OFICIO: [loteOficioC],
    });

    await component.cargarDatos();
    fixture.detectChanges();

    expect(component.lineas()[0].disponibles).toBe(3);
    expect(component.lineas()[0].fechaCompra).toBe(nuevaFechaCompra);
    expect(fixture.debugElement.query(By.css('[data-testid="error-cantidad"]')).nativeElement.textContent.trim()).toBe(
      MENSAJES_ERROR.STOCK_INSUFICIENTE,
    );
    expect(estaDeshabilitado(botonConfirmar())).toBe(true);
  });

  it('marks draft line with STOCK_INSUFICIENTE and disables Confirmar venta when lot disappears from active lots until removed (H2)', async () => {
    await component.ionViewWillEnter();
    component.agregarLote(loteCartaA);
    component.actualizarCantidad(loteCartaA.idLote, '5');
    component.actualizarPrecio(loteCartaA.idLote, 15000);
    fixture.detectChanges();

    mockConsultarInventario.activos.mockResolvedValueOnce({
      CARTA: [],
      OFICIO: [loteOficioC],
    });

    await component.cargarDatos();
    fixture.detectChanges();

    expect(component.lineas()[0].disponibles).toBe(0);
    expect(fixture.debugElement.query(By.css('[data-testid="error-cantidad"]')).nativeElement.textContent.trim()).toBe(
      MENSAJES_ERROR.STOCK_INSUFICIENTE,
    );
    expect(estaDeshabilitado(botonConfirmar())).toBe(true);

    component.quitarLinea(loteCartaA.idLote);
    fixture.detectChanges();
    expect(component.lineas()).toEqual([]);
  });

  it('prevents concurrent crearNuevoCliente modals, shows error toast on rejection, and releases guard', async () => {
    await component.ionViewWillEnter();
    fixture.detectChanges();

    let resolverModal: (modal: {
      present: ReturnType<typeof vi.fn>;
      onDidDismiss: ReturnType<typeof vi.fn>;
    }) => void = () => undefined;
    mockModalCtrl.create.mockReturnValueOnce(
      new Promise((resolve) => {
        resolverModal = resolve;
      }),
    );

    const p1 = component.crearNuevoCliente();
    const p2 = component.crearNuevoCliente();

    expect(mockModalCtrl.create).toHaveBeenCalledTimes(1);

    resolverModal({
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ data: null, role: ROL_CANCELAR }),
    });
    await Promise.all([p1, p2]);

    mockModalCtrl.create.mockRejectedValueOnce(new Error('Modal create failed'));
    await expect(component.crearNuevoCliente()).resolves.toBeUndefined();

    expect(mockToastCtrl.create).toHaveBeenCalledWith(
      expect.objectContaining({
        message: MENSAJE_ERROR_GENERICO,
        duration: 3000,
        color: 'danger',
        position: 'bottom',
      }),
    );
    expect(mockToastPresent).toHaveBeenCalled();

    // Guard was released so a new attempt succeeds
    mockModalCtrl.create.mockResolvedValueOnce({
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ data: ana, role: ROL_GUARDADO }),
    });
    await component.crearNuevoCliente();
    expect(mockModalCtrl.create).toHaveBeenCalledTimes(3);
    expect(component.clienteSeleccionado()).toEqual(ana);
  });

  it('renders SelectorClienteContenidoComponent with ion-page, Mostrador subtitle and customer initials (S9, E6)', () => {
    const selectorFixture = TestBed.createComponent(SelectorClienteContenidoComponent);
    selectorFixture.componentRef.setInput('busqueda', '');
    selectorFixture.componentRef.setInput('clientes', [mostrador, ana]);
    selectorFixture.componentRef.setInput('buscando', false);
    selectorFixture.componentRef.setInput('errorBusqueda', null);
    selectorFixture.componentRef.setInput('clienteSeleccionadoId', ana.idCliente);
    selectorFixture.detectChanges();

    expect(selectorFixture.nativeElement.classList.contains('ion-page')).toBe(true);

    const filas = selectorFixture.debugElement.queryAll(By.css('[data-testid="item-cliente-vender"]'));
    expect(filas).toHaveLength(2);
    expect(filas[0].nativeElement.textContent).toContain('Mostrador');
    expect(filas[0].nativeElement.textContent).toContain('Venta rápida · solo contado');
    expect(filas[1].nativeElement.textContent).toContain('AP');
    expect(filas[1].nativeElement.textContent).toContain('Ana María Pérez');
    expect(filas[1].nativeElement.textContent).toContain('3001234567');
  });

  it('shows skeleton only on initial load and keeps customer list visible with indicator while searching', () => {
    const selectorFixture = TestBed.createComponent(SelectorClienteContenidoComponent);
    selectorFixture.componentRef.setInput('busqueda', '');
    selectorFixture.componentRef.setInput('clientes', []);
    selectorFixture.componentRef.setInput('buscando', true);
    selectorFixture.componentRef.setInput('errorBusqueda', null);
    selectorFixture.detectChanges();

    expect(selectorFixture.debugElement.query(By.css('[data-testid="esqueleto-clientes"]'))).toBeTruthy();
    expect(selectorFixture.debugElement.queryAll(By.css('[data-testid="item-cliente-vender"]'))).toHaveLength(0);

    // Subsequent search with loaded customers keeps rows visible and shows loading indicator
    selectorFixture.componentRef.setInput('busqueda', 'ana');
    selectorFixture.componentRef.setInput('clientes', [mostrador, ana]);
    selectorFixture.componentRef.setInput('buscando', true);
    selectorFixture.detectChanges();

    expect(selectorFixture.debugElement.queryAll(By.css('[data-testid="item-cliente-vender"]'))).toHaveLength(2);
    expect(selectorFixture.debugElement.query(By.css('[data-testid="indicador-carga-clientes"]'))).toBeTruthy();
    expect(selectorFixture.debugElement.query(By.css('[data-testid="esqueleto-clientes"]'))).toBeNull();

    selectorFixture.componentRef.setInput('buscando', false);
    selectorFixture.detectChanges();

    expect(selectorFixture.debugElement.queryAll(By.css('[data-testid="item-cliente-vender"]'))).toHaveLength(2);
    expect(selectorFixture.debugElement.query(By.css('[data-testid="indicador-carga-clientes"]'))).toBeNull();
    expect(selectorFixture.debugElement.query(By.css('[data-testid="esqueleto-clientes"]'))).toBeNull();
  });

  it('shows Queda debiendo for Fiado and Abono inicial, and hides it for Contado', async () => {
    await component.ionViewWillEnter();
    component.seleccionarCliente(ana);
    component.agregarLote(loteCartaA);
    component.actualizarCantidad(loteCartaA.idLote, '5');
    component.actualizarPrecio(loteCartaA.idLote, 22000); // total = $ 110.000
    fixture.detectChanges();

    // Contado -> hidden
    expect(component.modalidad()).toBe('CONTADO');
    expect(fixture.debugElement.query(By.css('[data-testid="queda-debiendo"]'))).toBeNull();

    // Fiado -> shows full sale total ($ 110.000)
    component.modalidad.set('FIADO');
    fixture.detectChanges();

    const quedaFiado = fixture.debugElement.query(By.css('[data-testid="queda-debiendo"]'));
    expect(quedaFiado).toBeTruthy();
    expect(quedaFiado.nativeElement.textContent).toContain('Queda debiendo');
    expect(quedaFiado.nativeElement.textContent).toContain('$ 110.000');
    expect(component.quedaDebiendo()).toBe(pesos(110000));

    // Abono inicial ($ 50.000) -> shows remaining balance ($ 60.000)
    component.modalidad.set('ABONO_INICIAL');
    component.montoAbonoInicial.set(50000);
    fixture.detectChanges();

    const quedaAbono = fixture.debugElement.query(By.css('[data-testid="queda-debiendo"]'));
    expect(quedaAbono).toBeTruthy();
    expect(quedaAbono.nativeElement.textContent).toContain('Queda debiendo');
    expect(quedaAbono.nativeElement.textContent).toContain('$ 60.000');
    expect(component.quedaDebiendo()).toBe(pesos(60000));

    // Switching back to Contado hides it again
    component.modalidad.set('CONTADO');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="queda-debiendo"]'))).toBeNull();
  });

  it('returns 0 from quedaDebiendo when modalidad is CONTADO', async () => {
    await component.ionViewWillEnter();
    component.seleccionarCliente(ana);
    component.agregarLote(loteCartaA);
    component.actualizarCantidad(loteCartaA.idLote, '5');
    component.actualizarPrecio(loteCartaA.idLote, 22000); // total = $ 110.000
    fixture.detectChanges();

    expect(component.modalidad()).toBe('CONTADO');
    expect(component.totalVenta()).toBe(pesos(110000));
    expect(component.quedaDebiendo()).toBe(pesos(0));
    expect(fixture.debugElement.query(By.css('[data-testid="queda-debiendo"]'))).toBeNull();
  });

  it('links selector-cliente and btn-fecha-venta to their visible labels via aria-labelledby (C2)', async () => {
    await component.ionViewWillEnter();
    fixture.detectChanges();

    const lblCliente = fixture.debugElement.query(By.css('#lbl-cliente-venta'));
    const btnCliente = fixture.debugElement.query(By.css('[data-testid="selector-cliente"]'));
    expect(lblCliente).toBeTruthy();
    expect(lblCliente.nativeElement.classList.contains('campo-selector-etiqueta')).toBe(true);
    expect(lblCliente.nativeElement.textContent.trim()).toBe('Cliente');
    expect(btnCliente.attributes['aria-labelledby']).toBe('lbl-cliente-venta');

    const lblFecha = fixture.debugElement.query(By.css('#lbl-fecha-venta'));
    const btnFecha = fixture.debugElement.query(By.css('[data-testid="btn-fecha-venta"]'));
    expect(lblFecha).toBeTruthy();
    expect(lblFecha.nativeElement.classList.contains('campo-selector-etiqueta')).toBe(true);
    expect(lblFecha.nativeElement.textContent.trim()).toBe('Fecha de la venta');
    expect(btnFecha.attributes['aria-labelledby']).toBe('lbl-fecha-venta');
  });

  it('disables btn-fecha-venta and blocks abrirSelectorFecha when errorCarga() is non-null, and re-enables on recovery (C3)', async () => {
    mockConsultarInventario.activos.mockRejectedValueOnce(new Error('DB error'));
    await component.ionViewWillEnter();
    fixture.detectChanges();

    expect(component.errorCarga()).toBe(MENSAJE_ERROR_GENERICO);
    const btnFecha = fixture.debugElement.query(By.css('[data-testid="btn-fecha-venta"]'));
    const contenedorFecha = btnFecha.parent;
    expect(contenedorFecha?.nativeElement.classList.contains('campo-selector')).toBe(true);
    expect(contenedorFecha?.nativeElement.classList.contains('campo-inactivo')).toBe(true);
    expect(Boolean(btnFecha.nativeElement.disabled)).toBe(true);
    expect(btnFecha.attributes['aria-disabled']).toBe('true');

    component.abrirSelectorFecha();
    expect(component.selectorFechaAbierto()).toBe(false);

    // Recover on retry
    await component.cargarDatos();
    fixture.detectChanges();

    expect(component.errorCarga()).toBeNull();
    expect(contenedorFecha?.nativeElement.classList.contains('campo-inactivo')).toBe(false);
    expect(Boolean(btnFecha.nativeElement.disabled)).toBe(false);
    expect(btnFecha.attributes['aria-disabled']).toBeUndefined();

    component.abrirSelectorFecha();
    expect(component.selectorFechaAbierto()).toBe(true);
  });

  it('sets exact aria-label on SelectorClienteContenidoComponent searchbar (C4)', () => {
    const selectorFixture = TestBed.createComponent(SelectorClienteContenidoComponent);
    selectorFixture.componentRef.setInput('busqueda', '');
    selectorFixture.componentRef.setInput('clientes', []);
    selectorFixture.componentRef.setInput('buscando', false);
    selectorFixture.componentRef.setInput('errorBusqueda', null);
    selectorFixture.detectChanges();

    const searchbar = selectorFixture.debugElement.query(By.css('[data-testid="searchbar-clientes-vender"]'));
    expect(searchbar).toBeTruthy();
    expect(searchbar.attributes['aria-label']).toBe('Buscar por nombre o celular');
  });

  it('shows "Sin celular" for non-Mostrador customer without phone alongside Mostrador and customer with phone (C5)', () => {
    const sinTelefono: Cliente = {
      idCliente: 3,
      nombre: 'Carlos Ruiz',
      telefono: null,
      esMostrador: false,
    };

    const selectorFixture = TestBed.createComponent(SelectorClienteContenidoComponent);
    selectorFixture.componentRef.setInput('busqueda', '');
    selectorFixture.componentRef.setInput('clientes', [mostrador, ana, sinTelefono]);
    selectorFixture.componentRef.setInput('buscando', false);
    selectorFixture.componentRef.setInput('errorBusqueda', null);
    selectorFixture.detectChanges();

    const filas = selectorFixture.debugElement.queryAll(By.css('[data-testid="item-cliente-vender"]'));
    expect(filas).toHaveLength(3);

    const subtitulo0 = filas[0].query(By.css('p.cliente-subtitulo'));
    expect(subtitulo0).toBeTruthy();
    expect(subtitulo0.nativeElement.textContent.trim()).toBe('Venta rápida · solo contado');

    const subtitulo1 = filas[1].query(By.css('p.cliente-subtitulo'));
    expect(subtitulo1).toBeTruthy();
    expect(subtitulo1.nativeElement.textContent.trim()).toBe('3001234567');

    const subtitulo2 = filas[2].query(By.css('p.cliente-subtitulo'));
    expect(subtitulo2).toBeTruthy();
    expect(subtitulo2.nativeElement.textContent.trim()).toBe('Sin celular');
  });
});
