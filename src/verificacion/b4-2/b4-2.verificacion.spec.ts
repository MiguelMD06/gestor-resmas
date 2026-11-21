import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ModalController, ToastController } from '@ionic/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RegistrarAbono } from '../../app/cartera/application/registrar-abono';
import type { FacturaAbierta } from '../../app/cartera/domain';
import { AbonoModalComponent } from '../../app/cartera/ui/abono.modal';
import { ResumenAbonoModalComponent, type LineaResumenAbono } from '../../app/cartera/ui/resumen-abono.modal';
import type { Cliente } from '../../app/clientes/domain/cliente';
import { fechaHora, pesos, ReglaNegocioError } from '../../app/shared/domain';
import { CLOCK } from '../../app/shared/infrastructure/clock/clock.token';
import { ROL_CANCELAR, ROL_GUARDADO } from '../../app/shared/ui/formulario';
import { MENSAJE_ERROR_GENERICO, MENSAJES_ERROR } from '../../app/shared/ui/mensajes-error';

describe('Verificacion independiente B4.2-modal-abono', () => {
  let mockRegistrarAbono: { registrar: ReturnType<typeof vi.fn> };
  let mockToastCtrl: { create: ReturnType<typeof vi.fn> };
  let horaSimulada = '2026-11-20 12:00:00';

  const ana: Cliente = {
    idCliente: 7,
    nombre: 'Ana',
    telefono: '3001234567',
    esMostrador: false,
  };

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

  const fPagada: FacturaAbierta = {
    idVenta: 3,
    fecha: fechaHora('2026-10-25 10:00:00'),
    total: pesos(20000),
    costoBase: pesos(14000),
    pagado: pesos(20000),
  };

  interface ModalCreateOpts {
    component: unknown;
    componentProps?: Record<string, unknown>;
    canDismiss?: (data?: unknown, role?: string) => Promise<boolean> | boolean;
  }

  let modalCtrlMock: {
    create: ReturnType<typeof vi.fn>;
    dismiss: ReturnType<typeof vi.fn>;
  };
  let ultimoModalResumenMock: {
    present: ReturnType<typeof vi.fn>;
    onDidDismiss: ReturnType<typeof vi.fn>;
    opts?: ModalCreateOpts;
  };

  function crearModalAbono(
    facturas: readonly FacturaAbierta[] = [f1, f2],
    modoInicial?: 'CASCADA_GLOBAL' | 'FACTURA_INDIVIDUAL' | 'LIQUIDACION_TOTAL',
  ): { fixture: ComponentFixture<AbonoModalComponent>; component: AbonoModalComponent } {
    const fixture = TestBed.createComponent(AbonoModalComponent);
    const component = fixture.componentInstance;
    component.cliente = ana;
    component.facturas = facturas;
    if (modoInicial !== undefined) {
      component.modoInicial = modoInicial;
    }
    fixture.detectChanges();
    return { fixture, component };
  }

  function simularEntradaPesos(fixture: ComponentFixture<AbonoModalComponent>, texto: string): void {
    const ionInput = fixture.debugElement.query(By.css('app-campo-pesos ion-input')).nativeElement as HTMLElement & {
      value?: string;
    };
    ionInput.value = texto;
    ionInput.dispatchEvent(new CustomEvent('ionInput', { detail: { value: texto } }));
    fixture.detectChanges();
  }

  function cambiarSegmento(fixture: ComponentFixture<AbonoModalComponent>, testId: string, value: string): void {
    const seg = fixture.debugElement.query(By.css(`[data-testid="${testId}"]`)).nativeElement as HTMLElement;
    seg.dispatchEvent(new CustomEvent('ionChange', { detail: { value } }));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    horaSimulada = '2026-11-20 12:00:00';
    mockRegistrarAbono = {
      registrar: vi.fn().mockResolvedValue({ idAbono: 101, aplicaciones: [] }),
    };
    mockToastCtrl = {
      create: vi.fn().mockResolvedValue({ present: vi.fn().mockResolvedValue(undefined) }),
    };
    ultimoModalResumenMock = {
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ data: null, role: ROL_CANCELAR }),
    };
    modalCtrlMock = {
      create: vi.fn().mockImplementation(async (opts: ModalCreateOpts) => {
        ultimoModalResumenMock.opts = opts;
        return ultimoModalResumenMock;
      }),
      dismiss: vi.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [AbonoModalComponent, ResumenAbonoModalComponent],
      providers: [
        { provide: CLOCK, useValue: { ahora: () => fechaHora(horaSimulada) } },
        { provide: RegistrarAbono, useValue: mockRegistrarAbono },
        { provide: ModalController, useValue: modalCtrlMock },
        { provide: ToastController, useValue: mockToastCtrl },
      ],
    }).compileComponents();
  });

  it('C1: default state renders header, Ana, $ 40.000, Efectivo, clock date, help text, disabled Revisar abono', () => {
    const { fixture, component } = crearModalAbono();
    const header = fixture.debugElement.query(By.css('[data-testid="abono-cabecera"]')).nativeElement.textContent;
    expect(header).toContain('Registrar abono');
    expect(header).toContain('Ana');
    expect(header).toContain('debe $ 40.000');
    expect(
      fixture.debugElement.query(By.css('[data-testid="btn-cancelar-abono"]')).nativeElement.textContent.trim(),
    ).toBe('Cancelar');
    expect(component.modo()).toBe('CASCADA_GLOBAL');
    expect(component.medio()).toBe('EFECTIVO');
    expect(fixture.debugElement.query(By.css('[data-testid="btn-fecha-abono"]')).nativeElement.textContent).toContain(
      '20 nov 2026 · 12:00 p. m.',
    );
    expect(fixture.debugElement.query(By.css('[data-testid="ayuda-monto"]')).nativeElement.textContent.trim()).toBe(
      'Hasta $ 40.000',
    );
    const btn = fixture.debugElement.query(By.css('[data-testid="btn-revisar-abono"]'))
      .nativeElement as HTMLButtonElement;
    expect(btn.textContent?.trim()).toBe('Revisar abono');
    expect(Boolean(btn.disabled)).toBe(true);
    expect(btn.getAttribute('aria-disabled')).toBe('true');
  });

  it('C2: typing $35.000 via campo-pesos in A la deuda shows cascade preview and enables button', () => {
    const { fixture } = crearModalAbono();
    simularEntradaPesos(fixture, '35000');

    expect(fixture.debugElement.query(By.css('[data-testid="preview-titulo"]')).nativeElement.textContent.trim()).toBe(
      'Así se aplica · de la más antigua a la más nueva',
    );
    const filas = fixture.debugElement.queryAll(By.css('[data-testid="preview-aplicacion"]'));
    expect(filas).toHaveLength(2);
    expect(filas[0].nativeElement.textContent).toContain('Factura #1');
    expect(filas[0].nativeElement.textContent).toContain('$ 30.000');
    expect(filas[0].nativeElement.textContent).toContain('queda pagada');
    expect(filas[1].nativeElement.textContent).toContain('Factura #2');
    expect(filas[1].nativeElement.textContent).toContain('$ 5.000');
    expect(filas[1].nativeElement.textContent).toContain('queda debiendo $ 5.000');

    const btn = fixture.debugElement.query(By.css('[data-testid="btn-revisar-abono"]'))
      .nativeElement as HTMLButtonElement;
    expect(btn.textContent?.trim()).toBe('Revisar abono · $ 35.000');
    expect(Boolean(btn.disabled)).toBe(false);
    expect(btn.getAttribute('aria-disabled')).toBeNull();
  });

  it('C3: exact limits in A la deuda ($40.000, $40.001, $0, $1, decimals, cleared)', () => {
    const { fixture } = crearModalAbono();
    const btn = (): HTMLButtonElement =>
      fixture.debugElement.query(By.css('[data-testid="btn-revisar-abono"]')).nativeElement;

    simularEntradaPesos(fixture, '40000');
    const filas = fixture.debugElement.queryAll(By.css('[data-testid="preview-aplicacion"]'));
    expect(filas).toHaveLength(2);
    expect(filas[0].nativeElement.textContent).toContain('queda pagada');
    expect(filas[1].nativeElement.textContent).toContain('queda pagada');
    expect(Boolean(btn().disabled)).toBe(false);

    simularEntradaPesos(fixture, '40001');
    expect(fixture.debugElement.query(By.css('[data-testid="error-monto"]')).nativeElement.textContent.trim()).toBe(
      MENSAJES_ERROR.MONTO_SUPERA_DEUDA,
    );
    expect(Boolean(btn().disabled)).toBe(true);

    simularEntradaPesos(fixture, '0');
    expect(fixture.debugElement.query(By.css('[data-testid="error-monto"]')).nativeElement.textContent.trim()).toBe(
      MENSAJES_ERROR.MONTO_INVALIDO,
    );
    expect(Boolean(btn().disabled)).toBe(true);

    simularEntradaPesos(fixture, '20.000,50');
    expect(fixture.debugElement.query(By.css('[data-testid="error-monto"]')).nativeElement.textContent.trim()).toBe(
      'Escribe el monto en pesos, sin decimales',
    );
    expect(Boolean(btn().disabled)).toBe(true);

    simularEntradaPesos(fixture, '');
    expect(fixture.debugElement.query(By.css('[data-testid="error-monto"]'))).toBeNull();
    expect(Boolean(btn().disabled)).toBe(true);

    simularEntradaPesos(fixture, '1');
    expect(Boolean(btn().disabled)).toBe(false);
    expect(
      fixture.debugElement.query(By.css('[data-testid="preview-aplicacion"]')).nativeElement.textContent,
    ).toContain('queda debiendo $ 29.999');
  });

  it('C4: A una factura sorts oldest first, disables input/button until selected, validates F2 via DOM radio, auto-selects single open invoice', () => {
    const f1MismaFecha: FacturaAbierta = { ...f2, idVenta: 9, fecha: f1.fecha };
    const { fixture, component } = crearModalAbono([f2, f1MismaFecha, f1, fPagada], 'FACTURA_INDIVIDUAL');

    const opciones = fixture.debugElement.queryAll(By.css('[data-testid="opcion-factura"]'));
    expect(opciones).toHaveLength(3);
    expect(opciones[0].nativeElement.textContent).toContain('Factura #1');
    expect(opciones[0].nativeElement.textContent).toContain('$ 30.000');
    expect(opciones[1].nativeElement.textContent).toContain('Factura #9');
    expect(opciones[2].nativeElement.textContent).toContain('Factura #2');
    expect(opciones[2].nativeElement.textContent).toContain('$ 10.000');

    const campoPesosHost = fixture.debugElement.query(By.css('app-campo-pesos')).nativeElement as HTMLElement;
    expect(campoPesosHost.getAttribute('aria-disabled')).toBe('true');
    expect(
      Boolean(fixture.debugElement.query(By.css('[data-testid="btn-revisar-abono"]')).nativeElement.disabled),
    ).toBe(true);

    // Select F2 (last item in list) via radio change event
    const radios = fixture.debugElement.queryAll(By.css('input[type="radio"]'));
    radios[2].nativeElement.checked = true;
    radios[2].nativeElement.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(component.idVentaSeleccionada()).toBe(2);
    expect(fixture.debugElement.query(By.css('[data-testid="ayuda-monto"]')).nativeElement.textContent.trim()).toBe(
      'Hasta $ 10.000',
    );

    simularEntradaPesos(fixture, '3000');
    const filas = fixture.debugElement.queryAll(By.css('[data-testid="preview-aplicacion"]'));
    expect(filas).toHaveLength(1);
    expect(filas[0].nativeElement.textContent).toContain('Factura #2');
    expect(filas[0].nativeElement.textContent).toContain('$ 3.000');
    expect(filas[0].nativeElement.textContent).toContain('queda debiendo $ 7.000');
    expect(
      Boolean(fixture.debugElement.query(By.css('[data-testid="btn-revisar-abono"]')).nativeElement.disabled),
    ).toBe(false);

    simularEntradaPesos(fixture, '10001');
    expect(fixture.debugElement.query(By.css('[data-testid="error-monto"]')).nativeElement.textContent.trim()).toBe(
      MENSAJES_ERROR.MONTO_SUPERA_SALDO_FACTURA,
    );
    expect(
      Boolean(fixture.debugElement.query(By.css('[data-testid="btn-revisar-abono"]')).nativeElement.disabled),
    ).toBe(true);

    simularEntradaPesos(fixture, '10000');
    expect(
      fixture.debugElement.query(By.css('[data-testid="preview-aplicacion"]')).nativeElement.textContent,
    ).toContain('queda pagada');
    expect(
      Boolean(fixture.debugElement.query(By.css('[data-testid="btn-revisar-abono"]')).nativeElement.disabled),
    ).toBe(false);

    // Single open invoice auto-selected when entering FACTURA_INDIVIDUAL
    const single = crearModalAbono([fPagada, f2], 'CASCADA_GLOBAL');
    cambiarSegmento(single.fixture, 'segment-modo', 'FACTURA_INDIVIDUAL');
    expect(single.component.idVentaSeleccionada()).toBe(2);
    expect(
      single.fixture.debugElement.query(By.css('[data-testid="ayuda-monto"]')).nativeElement.textContent.trim(),
    ).toBe('Hasta $ 10.000');
  });

  it('C5: Pagar todo shows uneditable $ 40.000, invoice count text, and handles zero debt', () => {
    const { fixture } = crearModalAbono([f1, f2], 'LIQUIDACION_TOTAL');
    const inputFijo = fixture.debugElement.query(By.css('[data-testid="input-monto-pagar-todo"]'))
      .nativeElement as HTMLElement & { value?: string; readonly?: boolean };
    expect(inputFijo.value).toBe('$ 40.000');
    expect(inputFijo.readonly).toBe(true);
    expect(inputFijo.getAttribute('aria-readonly')).toBe('true');
    expect(
      fixture.debugElement.query(By.css('[data-testid="ayuda-pagar-todo"]')).nativeElement.textContent.trim(),
    ).toBe('Salda las 2 facturas con saldo');
    const btn = fixture.debugElement.query(By.css('[data-testid="btn-revisar-abono"]'))
      .nativeElement as HTMLButtonElement;
    expect(btn.textContent?.trim()).toBe('Revisar pago · $ 40.000');
    expect(Boolean(btn.disabled)).toBe(false);

    const unaFactura = crearModalAbono([f1], 'LIQUIDACION_TOTAL');
    expect(
      unaFactura.fixture.debugElement
        .query(By.css('[data-testid="ayuda-pagar-todo"]'))
        .nativeElement.textContent.trim(),
    ).toBe('Salda la factura con saldo');

    const sinDeuda = crearModalAbono([fPagada], 'LIQUIDACION_TOTAL');
    expect(
      Boolean(sinDeuda.fixture.debugElement.query(By.css('[data-testid="btn-revisar-abono"]')).nativeElement.disabled),
    ).toBe(true);
  });

  it('C6: future date shows exact error, disables button, and updates maxFecha from clock when opening date sheet', () => {
    const { fixture, component } = crearModalAbono();
    simularEntradaPesos(fixture, '10000');

    horaSimulada = '2026-11-20 12:00:00';
    fixture.debugElement.query(By.css('[data-testid="btn-fecha-abono"]')).nativeElement.click();
    fixture.detectChanges();
    expect(component.selectorFechaAbierto()).toBe(true);
    expect(component.maxFecha()).toBe('2026-11-20 12:00:00');

    component.onFechaSeleccionada('2026-11-20 12:01:00');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="error-fecha"]')).nativeElement.textContent.trim()).toBe(
      MENSAJES_ERROR.FECHA_FUTURA,
    );
    expect(
      Boolean(fixture.debugElement.query(By.css('[data-testid="btn-revisar-abono"]')).nativeElement.disabled),
    ).toBe(true);

    component.onFechaSeleccionada('2026-11-20 12:00:00');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="error-fecha"]'))).toBeNull();
    expect(
      Boolean(fixture.debugElement.query(By.css('[data-testid="btn-revisar-abono"]')).nativeElement.disabled),
    ).toBe(false);
  });

  it('C7: date earlier than a receiving invoice shows ABONO_ANTERIOR_A_FACTURA across modes and exact boundary', () => {
    const { fixture, component } = crearModalAbono();
    component.onFechaSeleccionada('2026-11-05 10:00:00');
    simularEntradaPesos(fixture, '35000');

    expect(fixture.debugElement.query(By.css('[data-testid="error-fecha"]')).nativeElement.textContent.trim()).toBe(
      MENSAJES_ERROR.ABONO_ANTERIOR_A_FACTURA,
    );
    expect(
      Boolean(fixture.debugElement.query(By.css('[data-testid="btn-revisar-abono"]')).nativeElement.disabled),
    ).toBe(true);

    simularEntradaPesos(fixture, '30000');
    expect(fixture.debugElement.query(By.css('[data-testid="error-fecha"]'))).toBeNull();
    expect(
      Boolean(fixture.debugElement.query(By.css('[data-testid="btn-revisar-abono"]')).nativeElement.disabled),
    ).toBe(false);

    // Exact boundary with F2 (2026-11-10 09:59:59 vs 2026-11-10 10:00:00)
    simularEntradaPesos(fixture, '35000');
    component.onFechaSeleccionada('2026-11-10 09:59:59');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="error-fecha"]')).nativeElement.textContent.trim()).toBe(
      MENSAJES_ERROR.ABONO_ANTERIOR_A_FACTURA,
    );
    component.onFechaSeleccionada('2026-11-10 10:00:00');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="error-fecha"]'))).toBeNull();

    // Also blocks LIQUIDACION_TOTAL when date < F2
    component.onFechaSeleccionada('2026-11-05 10:00:00');
    cambiarSegmento(fixture, 'segment-modo', 'LIQUIDACION_TOTAL');
    expect(fixture.debugElement.query(By.css('[data-testid="error-fecha"]')).nativeElement.textContent.trim()).toBe(
      MENSAJES_ERROR.ABONO_ANTERIOR_A_FACTURA,
    );
    expect(
      Boolean(fixture.debugElement.query(By.css('[data-testid="btn-revisar-abono"]')).nativeElement.disabled),
    ).toBe(true);
  });

  it('C8: switching modes recalculates preview, help and clears mode-specific error', () => {
    const { fixture, component } = crearModalAbono();
    cambiarSegmento(fixture, 'segment-modo', 'FACTURA_INDIVIDUAL');
    component.seleccionarFactura(2);
    fixture.detectChanges();
    simularEntradaPesos(fixture, '15000');
    expect(fixture.debugElement.query(By.css('[data-testid="error-monto"]')).nativeElement.textContent.trim()).toBe(
      MENSAJES_ERROR.MONTO_SUPERA_SALDO_FACTURA,
    );

    cambiarSegmento(fixture, 'segment-modo', 'CASCADA_GLOBAL');
    expect(fixture.debugElement.query(By.css('[data-testid="error-monto"]'))).toBeNull();
    expect(fixture.debugElement.query(By.css('[data-testid="ayuda-monto"]')).nativeElement.textContent.trim()).toBe(
      'Hasta $ 40.000',
    );
    const filas = fixture.debugElement.queryAll(By.css('[data-testid="preview-aplicacion"]'));
    expect(filas).toHaveLength(1);
    expect(filas[0].nativeElement.textContent).toContain('Factura #1');
    expect(filas[0].nativeElement.textContent).toContain('$ 15.000');
    expect(filas[0].nativeElement.textContent).toContain('queda debiendo $ 15.000');
  });

  it('C9 & C10: ResumenAbonoModal renders exact totals and calls RegistrarAbono.registrar with exact payloads for all 3 modes', async () => {
    const lineas35k: readonly LineaResumenAbono[] = [
      {
        idVenta: 1,
        monto: pesos(30000),
        capital: pesos(20000),
        ganancia: pesos(10000),
        quedaPagada: true,
        saldoRestante: pesos(0),
      },
      {
        idVenta: 2,
        monto: pesos(5000),
        capital: pesos(5000),
        ganancia: pesos(0),
        quedaPagada: false,
        saldoRestante: pesos(5000),
      },
    ];

    const f1Res = TestBed.createComponent(ResumenAbonoModalComponent);
    const c1 = f1Res.componentInstance;
    c1.cliente = ana;
    c1.solicitud = {
      modo: 'CASCADA_GLOBAL',
      idCliente: 7,
      fecha: fechaHora('2026-11-20 12:00:00'),
      medio: 'EFECTIVO',
      monto: pesos(35000),
    };
    c1.montoTotal = pesos(35000);
    c1.deudaAnterior = pesos(40000);
    c1.lineas = lineas35k;
    f1Res.detectChanges();

    expect(f1Res.debugElement.nativeElement.textContent).toContain('Resumen del abono');
    expect(f1Res.debugElement.query(By.css('[data-testid="resumen-cliente"]')).nativeElement.textContent).toContain(
      'Ana',
    );
    expect(f1Res.debugElement.query(By.css('[data-testid="resumen-medio"]')).nativeElement.textContent).toContain(
      'Efectivo',
    );
    expect(f1Res.debugElement.query(By.css('[data-testid="resumen-modo"]')).nativeElement.textContent).toContain(
      'Abono a la deuda',
    );
    expect(f1Res.debugElement.query(By.css('[data-testid="resumen-monto"]')).nativeElement.textContent).toContain(
      '$ 35.000',
    );
    expect(f1Res.debugElement.query(By.css('[data-testid="resumen-capital"]')).nativeElement.textContent).toContain(
      '$ 25.000',
    );
    expect(f1Res.debugElement.query(By.css('[data-testid="resumen-ganancia"]')).nativeElement.textContent).toContain(
      '$ 10.000',
    );
    expect(
      f1Res.debugElement.query(By.css('[data-testid="resumen-deuda-despues"]')).nativeElement.textContent,
    ).toContain('$ 5.000');

    await c1.aceptar();
    expect(mockRegistrarAbono.registrar).toHaveBeenCalledWith({
      modo: 'CASCADA_GLOBAL',
      idCliente: 7,
      fecha: '2026-11-20 12:00:00',
      medio: 'EFECTIVO',
      monto: 35000,
    });

    // FACTURA_INDIVIDUAL exact payload
    const f2Res = TestBed.createComponent(ResumenAbonoModalComponent);
    const c2 = f2Res.componentInstance;
    c2.cliente = ana;
    c2.solicitud = {
      modo: 'FACTURA_INDIVIDUAL',
      idCliente: 7,
      fecha: fechaHora('2026-11-20 12:00:00'),
      medio: 'TRANSFERENCIA',
      idVenta: 2,
      monto: pesos(3000),
    };
    c2.montoTotal = pesos(3000);
    c2.deudaAnterior = pesos(40000);
    c2.lineas = [
      {
        idVenta: 2,
        monto: pesos(3000),
        capital: pesos(3000),
        ganancia: pesos(0),
        quedaPagada: false,
        saldoRestante: pesos(7000),
      },
    ];
    f2Res.detectChanges();
    await c2.aceptar();
    expect(mockRegistrarAbono.registrar).toHaveBeenLastCalledWith({
      modo: 'FACTURA_INDIVIDUAL',
      idCliente: 7,
      fecha: '2026-11-20 12:00:00',
      medio: 'TRANSFERENCIA',
      idVenta: 2,
      monto: 3000,
    });

    // LIQUIDACION_TOTAL exact payload without monto
    const f3Res = TestBed.createComponent(ResumenAbonoModalComponent);
    const c3 = f3Res.componentInstance;
    c3.cliente = ana;
    c3.solicitud = {
      modo: 'LIQUIDACION_TOTAL',
      idCliente: 7,
      fecha: fechaHora('2026-11-20 12:00:00'),
      medio: 'EFECTIVO',
    };
    c3.montoTotal = pesos(40000);
    c3.deudaAnterior = pesos(40000);
    c3.lineas = [
      {
        idVenta: 1,
        monto: pesos(30000),
        capital: pesos(20000),
        ganancia: pesos(10000),
        quedaPagada: true,
        saldoRestante: pesos(0),
      },
      {
        idVenta: 2,
        monto: pesos(10000),
        capital: pesos(5000),
        ganancia: pesos(5000),
        quedaPagada: true,
        saldoRestante: pesos(0),
      },
    ];
    f3Res.detectChanges();
    expect(f3Res.debugElement.query(By.css('[data-testid="resumen-capital"]')).nativeElement.textContent).toContain(
      '$ 25.000',
    );
    expect(f3Res.debugElement.query(By.css('[data-testid="resumen-ganancia"]')).nativeElement.textContent).toContain(
      '$ 15.000',
    );
    expect(
      f3Res.debugElement.query(By.css('[data-testid="resumen-deuda-despues"]')).nativeElement.textContent,
    ).toContain('$ 0');
    await c3.aceptar();
    const lastCall = mockRegistrarAbono.registrar.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(lastCall).toEqual({
      modo: 'LIQUIDACION_TOTAL',
      idCliente: 7,
      fecha: '2026-11-20 12:00:00',
      medio: 'EFECTIVO',
    });
    expect('monto' in lastCall).toBe(false);
  });

  it('C10 & C12 REAL IONIC DISMISS CHECK: ResumenAbonoModal.aceptar() dismisses cleanly when canDismiss from AbonoModal is enforced', async () => {
    let resumenFixture: ComponentFixture<ResumenAbonoModalComponent> | null = null;
    let resolveDidDismiss!: (res: { data: unknown; role: string }) => void;
    let canDismissBlockedCount = 0;

    modalCtrlMock.create.mockImplementationOnce(async (opts: ModalCreateOpts) => {
      resumenFixture = TestBed.createComponent(ResumenAbonoModalComponent);
      const props = opts.componentProps ?? {};
      Object.assign(resumenFixture.componentInstance, props);
      resumenFixture.detectChanges();

      return {
        present: vi.fn().mockResolvedValue(undefined),
        onDidDismiss: () =>
          new Promise<{ data: unknown; role: string }>((resolve) => {
            resolveDidDismiss = resolve;
          }),
      };
    });

    modalCtrlMock.dismiss.mockImplementation(async (data?: unknown, role?: string) => {
      const opts = modalCtrlMock.create.mock.calls[0][0] as ModalCreateOpts;
      if (opts.canDismiss && !(await opts.canDismiss(data, role))) {
        canDismissBlockedCount++;
        return false;
      }
      resolveDidDismiss({ data, role: role ?? '' });
      return true;
    });

    const { fixture } = crearModalAbono();
    simularEntradaPesos(fixture, '35000');

    const abrirPromesa = fixture.componentInstance.abrirResumen();
    await Promise.resolve();
    await Promise.resolve();

    expect(resumenFixture).not.toBeNull();
    await resumenFixture!.componentInstance.aceptar();
    await Promise.race([abrirPromesa, new Promise((r) => setTimeout(r, 50))]);

    expect(canDismissBlockedCount).toBe(0);
    expect(modalCtrlMock.dismiss).toHaveBeenCalledWith({ guardado: true }, ROL_GUARDADO);
  });

  it('C11, C12, C13, C14, C16: double tap, guardando locks + aria-disabled across modes, errors + retry, volver a editar', async () => {
    const fRes = TestBed.createComponent(ResumenAbonoModalComponent);
    const cRes = fRes.componentInstance;
    cRes.cliente = ana;
    cRes.solicitud = {
      modo: 'CASCADA_GLOBAL',
      idCliente: 7,
      fecha: fechaHora('2026-11-20 12:00:00'),
      medio: 'EFECTIVO',
      monto: pesos(35000),
    };
    cRes.montoTotal = pesos(35000);
    cRes.deudaAnterior = pesos(40000);
    cRes.lineas = [
      {
        idVenta: 1,
        monto: pesos(30000),
        capital: pesos(20000),
        ganancia: pesos(10000),
        quedaPagada: true,
        saldoRestante: pesos(0),
      },
      {
        idVenta: 2,
        monto: pesos(5000),
        capital: pesos(5000),
        ganancia: pesos(0),
        quedaPagada: false,
        saldoRestante: pesos(5000),
      },
    ];
    fRes.detectChanges();

    let resolveReg!: (v: unknown) => void;
    mockRegistrarAbono.registrar.mockReturnValueOnce(
      new Promise((r) => {
        resolveReg = r;
      }),
    );

    const btnAceptar = fRes.debugElement.query(By.css('[data-testid="btn-aceptar-abono"]'))
      .nativeElement as HTMLButtonElement;
    const btnVolver = fRes.debugElement.query(By.css('[data-testid="btn-volver-editar"]'))
      .nativeElement as HTMLButtonElement;

    btnAceptar.click();
    btnAceptar.click();
    fRes.detectChanges();

    expect(mockRegistrarAbono.registrar).toHaveBeenCalledTimes(1);
    expect(btnAceptar.textContent).toContain('Guardando…');
    expect(Boolean(btnAceptar.disabled)).toBe(true);
    expect(btnAceptar.getAttribute('aria-disabled')).toBe('true');
    expect(Boolean(btnVolver.disabled)).toBe(true);
    expect(btnVolver.getAttribute('aria-disabled')).toBe('true');

    resolveReg({ idAbono: 1, aplicaciones: [] });
    await Promise.resolve();
    await Promise.resolve();

    // Error recovery on fresh ResumenAbonoModalComponent
    const fErr = TestBed.createComponent(ResumenAbonoModalComponent);
    const cErr = fErr.componentInstance;
    cErr.cliente = ana;
    cErr.solicitud = cRes.solicitud;
    cErr.montoTotal = pesos(35000);
    cErr.deudaAnterior = pesos(40000);
    cErr.lineas = cRes.lineas;
    fErr.detectChanges();

    mockRegistrarAbono.registrar.mockRejectedValueOnce(new ReglaNegocioError('MONTO_SUPERA_DEUDA', 'exceeds'));
    await cErr.aceptar();
    fErr.detectChanges();
    expect(fErr.debugElement.query(By.css('[data-testid="error-guardar-abono"]')).nativeElement.textContent).toContain(
      MENSAJES_ERROR.MONTO_SUPERA_DEUDA,
    );
    expect(Boolean(fErr.debugElement.query(By.css('[data-testid="btn-aceptar-abono"]')).nativeElement.disabled)).toBe(
      false,
    );

    mockRegistrarAbono.registrar.mockRejectedValueOnce(new Error('disk error'));
    await cErr.aceptar();
    fErr.detectChanges();
    expect(fErr.debugElement.query(By.css('[data-testid="error-guardar-abono"]')).nativeElement.textContent).toContain(
      MENSAJE_ERROR_GENERICO,
    );

    mockRegistrarAbono.registrar.mockResolvedValueOnce({ idAbono: 102, aplicaciones: [] });
    await cErr.aceptar();
    fErr.detectChanges();
    expect(fErr.debugElement.query(By.css('[data-testid="error-guardar-abono"]'))).toBeNull();

    // Volver a editar preserves state in AbonoModalComponent + aria-disabled checks while guardando=true
    const { fixture, component } = crearModalAbono([f1, f2], 'LIQUIDACION_TOTAL');
    cambiarSegmento(fixture, 'segment-medio', 'TRANSFERENCIA');
    component.onFechaSeleccionada('2026-11-18 09:00:00');
    fixture.detectChanges();

    let resolverDismiss!: (v: { data: unknown; role: string }) => void;
    ultimoModalResumenMock.onDidDismiss.mockReturnValueOnce(
      new Promise((r) => {
        resolverDismiss = r;
      }),
    );

    const openP = component.abrirResumen();
    await Promise.resolve();

    const opts = ultimoModalResumenMock.opts!;
    (opts.componentProps!['alCambiarGuardando'] as (g: boolean) => void)(true);
    fixture.detectChanges();

    expect(await opts.canDismiss!(undefined, 'backdrop')).toBe(false);
    expect(await opts.canDismiss!(undefined, 'gesture')).toBe(false);
    expect(await opts.canDismiss!(undefined, ROL_CANCELAR)).toBe(false);
    expect(await opts.canDismiss!(undefined, ROL_GUARDADO)).toBe(false);

    expect(
      fixture.debugElement
        .query(By.css('[data-testid="btn-cancelar-abono"]'))
        .nativeElement.getAttribute('aria-disabled'),
    ).toBe('true');
    expect(
      fixture.debugElement.query(By.css('[data-testid="segment-modo"]')).nativeElement.getAttribute('aria-disabled'),
    ).toBe('true');
    expect(
      fixture.debugElement.query(By.css('[data-testid="segment-medio"]')).nativeElement.getAttribute('aria-disabled'),
    ).toBe('true');
    expect(
      fixture.debugElement.query(By.css('[data-testid="btn-fecha-abono"]')).nativeElement.getAttribute('aria-disabled'),
    ).toBe('true');
    expect(
      fixture.debugElement
        .query(By.css('[data-testid="btn-revisar-abono"]'))
        .nativeElement.getAttribute('aria-disabled'),
    ).toBe('true');
    const inputPagarTodoEl = fixture.debugElement.query(By.css('[data-testid="input-monto-pagar-todo"]'))
      .nativeElement as HTMLElement;
    const ariaDisabledInput =
      inputPagarTodoEl.getAttribute('aria-disabled') ??
      inputPagarTodoEl.querySelector('input')?.getAttribute('aria-disabled');
    expect(ariaDisabledInput).toBe('true');

    (opts.componentProps!['alCambiarGuardando'] as (g: boolean) => void)(false);
    resolverDismiss({ data: null, role: ROL_CANCELAR });
    await openP;

    expect(component.modo()).toBe('LIQUIDACION_TOTAL');
    expect(component.medio()).toBe('TRANSFERENCIA');
    expect(component.fechaSeleccionada()).toBe('2026-11-18 09:00:00');

    // Cancelar dismisses without saving
    await component.cancelar();
    expect(modalCtrlMock.dismiss).toHaveBeenCalledWith(null, ROL_CANCELAR);
  });
});
