import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ModalController } from '@ionic/angular';
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

import { ResumenVentaModalComponent } from './resumen-venta.modal';
import { VenderPage } from './vender.page';

describe('VenderPage', () => {
  let fixture: ComponentFixture<VenderPage>;
  let component: VenderPage;
  let mockConsultarInventario: { activos: ReturnType<typeof vi.fn> };
  let mockBuscarClientes: { buscar: ReturnType<typeof vi.fn> };
  let mockModalCtrl: { create: ReturnType<typeof vi.fn> };
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
    mockClock = {
      ahora: vi.fn().mockReturnValue(ahoraFija),
    };

    await TestBed.configureTestingModule({
      imports: [VenderPage],
      providers: [
        { provide: ConsultarInventario, useValue: mockConsultarInventario },
        { provide: BuscarClientes, useValue: mockBuscarClientes },
        { provide: ModalController, useValue: mockModalCtrl },
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
        textoPago: 'Contado · Efectivo',
        pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
        fecha: ahoraFija,
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

    expect(component.maxFechaIso()).toBe('2026-11-15T14:30:00');

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

  it('opens ClienteModalComponent from selector Nuevo cliente and selects the created customer', async () => {
    await component.ionViewWillEnter();
    component.abrirSelectorCliente();
    fixture.detectChanges();

    await component.crearNuevoCliente();
    fixture.detectChanges();

    expect(mockModalCtrl.create).toHaveBeenCalledWith({
      component: ClienteModalComponent,
      canDismiss: soloCierreExplicito,
    });
    expect(component.clienteSeleccionado()).toEqual(ana);
    expect(component.selectorClienteAbierto()).toBe(false);
  });
});
