import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ModalController, ToastController } from '@ionic/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Cliente } from '../../clientes/domain/cliente';
import { fechaHora, pesos } from '../../shared/domain';
import { CLOCK } from '../../shared/infrastructure/clock/clock.token';
import { ROL_CANCELAR, ROL_GUARDADO } from '../../shared/ui/formulario';
import { MENSAJE_ERROR_GENERICO, MENSAJES_ERROR } from '../../shared/ui/mensajes-error';
import type { FacturaAbierta } from '../domain';

import { AbonoModalComponent } from './abono.modal';
import { ResumenAbonoModalComponent } from './resumen-abono.modal';

describe('AbonoModalComponent', () => {
  let fixture: ComponentFixture<AbonoModalComponent>;
  let component: AbonoModalComponent;
  let mockModalCtrl: {
    create: ReturnType<typeof vi.fn>;
    dismiss: ReturnType<typeof vi.fn>;
  };
  let mockResumenModal: {
    present: ReturnType<typeof vi.fn>;
    onDidDismiss: ReturnType<typeof vi.fn>;
  };
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

  function crearModal(
    facturas: readonly FacturaAbierta[] = [f1, f2],
    modoInicial?: 'CASCADA_GLOBAL' | 'FACTURA_INDIVIDUAL' | 'LIQUIDACION_TOTAL',
    idVentaInicial?: number,
  ): void {
    fixture = TestBed.createComponent(AbonoModalComponent);
    component = fixture.componentInstance;
    component.cliente = ana;
    component.facturas = facturas;
    if (modoInicial !== undefined) {
      component.modoInicial = modoInicial;
    }
    if (idVentaInicial !== undefined) {
      component.idVentaInicial = idVentaInicial;
    }
    fixture.detectChanges();
  }

  function botonRevisar(): HTMLButtonElement {
    return fixture.debugElement.query(By.css('[data-testid="btn-revisar-abono"]')).nativeElement;
  }

  beforeEach(async () => {
    horaSimulada = '2026-11-20 12:00:00';
    mockResumenModal = {
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ data: null, role: ROL_CANCELAR }),
    };
    mockModalCtrl = {
      create: vi.fn().mockResolvedValue(mockResumenModal),
      dismiss: vi.fn().mockResolvedValue(true),
    };
    mockToastCtrl = {
      create: vi.fn().mockResolvedValue({ present: vi.fn().mockResolvedValue(undefined) }),
    };

    await TestBed.configureTestingModule({
      imports: [AbonoModalComponent],
      providers: [
        { provide: CLOCK, useValue: { ahora: () => fechaHora(horaSimulada) } },
        { provide: ModalController, useValue: mockModalCtrl },
        { provide: ToastController, useValue: mockToastCtrl },
      ],
    }).compileComponents();

    crearModal();
  });

  it('C1: opens with default mode, shows Ana debt $ 40.000, Efectivo, clock date, help text and disabled button', () => {
    const headerText = fixture.debugElement.query(By.css('[data-testid="abono-cabecera"]')).nativeElement.textContent;
    expect(headerText).toContain('Registrar abono');
    expect(headerText).toContain('Ana');
    expect(headerText).toContain('debe $ 40.000');

    expect(component.modo()).toBe('CASCADA_GLOBAL');
    expect(component.medio()).toBe('EFECTIVO');
    expect(component.fechaSeleccionada()).toBe('2026-11-20 12:00:00');
    expect(fixture.debugElement.query(By.css('[data-testid="btn-fecha-abono"]')).nativeElement.textContent).toContain(
      '20 nov 2026 · 12:00 p. m.',
    );

    expect(fixture.debugElement.query(By.css('[data-testid="ayuda-monto"]')).nativeElement.textContent.trim()).toBe(
      'Hasta $ 40.000',
    );
    expect(botonRevisar().textContent?.trim()).toBe('Revisar abono');
    expect(Boolean(botonRevisar().disabled)).toBe(true);
    expect(botonRevisar().getAttribute('aria-disabled')).toBe('true');
  });

  it('C2: A la deuda with $35.000 previews F1 pagada ($30.000) then F2 debiendo $5.000 ($5.000) and enables button', () => {
    component.monto.set(35000);
    fixture.detectChanges();

    const previewTitulo = fixture.debugElement.query(By.css('[data-testid="preview-titulo"]')).nativeElement
      .textContent;
    expect(previewTitulo).toContain('Así se aplica · de la más antigua a la más nueva');

    const filas = fixture.debugElement.queryAll(By.css('[data-testid="preview-aplicacion"]'));
    expect(filas).toHaveLength(2);
    expect(filas[0].nativeElement.textContent).toContain('Factura #1');
    expect(filas[0].nativeElement.textContent).toContain('queda pagada');
    expect(filas[0].nativeElement.textContent).toContain('$ 30.000');

    expect(filas[1].nativeElement.textContent).toContain('Factura #2');
    expect(filas[1].nativeElement.textContent).toContain('queda debiendo $ 5.000');
    expect(filas[1].nativeElement.textContent).toContain('$ 5.000');

    expect(botonRevisar().textContent?.trim()).toBe('Revisar abono · $ 35.000');
    expect(Boolean(botonRevisar().disabled)).toBe(false);
  });

  it('C3: A la deuda limits ($40.000 valid, $40.001 exceeds debt, $0 invalid)', () => {
    component.monto.set(40000);
    fixture.detectChanges();
    const filas = fixture.debugElement.queryAll(By.css('[data-testid="preview-aplicacion"]'));
    expect(filas).toHaveLength(2);
    expect(filas[0].nativeElement.textContent).toContain('queda pagada');
    expect(filas[1].nativeElement.textContent).toContain('queda pagada');
    expect(Boolean(botonRevisar().disabled)).toBe(false);

    component.monto.set(40001);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="error-monto"]')).nativeElement.textContent.trim()).toBe(
      MENSAJES_ERROR.MONTO_SUPERA_DEUDA,
    );
    expect(Boolean(botonRevisar().disabled)).toBe(true);

    component.monto.set(0);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="error-monto"]')).nativeElement.textContent.trim()).toBe(
      MENSAJES_ERROR.MONTO_INVALIDO,
    );
    expect(Boolean(botonRevisar().disabled)).toBe(true);
  });

  it('C4: A una factura lists F1 before F2, validates selection and invoice balance, and auto-selects single invoice', () => {
    // Pass F2 before F1 to verify sorting
    crearModal([f2, f1], 'FACTURA_INDIVIDUAL');

    const opciones = fixture.debugElement.queryAll(By.css('[data-testid="opcion-factura"]'));
    expect(opciones).toHaveLength(2);
    expect(opciones[0].nativeElement.textContent).toContain('Factura #1');
    expect(opciones[0].nativeElement.textContent).toContain('$ 30.000');
    expect(opciones[1].nativeElement.textContent).toContain('Factura #2');
    expect(opciones[1].nativeElement.textContent).toContain('$ 10.000');
    expect(Boolean(botonRevisar().disabled)).toBe(true);

    component.seleccionarFactura(2);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="ayuda-monto"]')).nativeElement.textContent.trim()).toBe(
      'Hasta $ 10.000',
    );

    component.monto.set(3000);
    fixture.detectChanges();
    const filas = fixture.debugElement.queryAll(By.css('[data-testid="preview-aplicacion"]'));
    expect(filas).toHaveLength(1);
    expect(filas[0].nativeElement.textContent).toContain('Factura #2');
    expect(filas[0].nativeElement.textContent).toContain('$ 3.000');
    expect(filas[0].nativeElement.textContent).toContain('queda debiendo $ 7.000');
    expect(Boolean(botonRevisar().disabled)).toBe(false);

    component.monto.set(10001);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="error-monto"]')).nativeElement.textContent.trim()).toBe(
      MENSAJES_ERROR.MONTO_SUPERA_SALDO_FACTURA,
    );
    expect(Boolean(botonRevisar().disabled)).toBe(true);

    component.monto.set(10000);
    fixture.detectChanges();
    expect(
      fixture.debugElement.query(By.css('[data-testid="preview-aplicacion"]')).nativeElement.textContent,
    ).toContain('queda pagada');
    expect(Boolean(botonRevisar().disabled)).toBe(false);

    // Single invoice auto-selected
    crearModal([f2], 'FACTURA_INDIVIDUAL');
    expect(component.idVentaSeleccionada()).toBe(2);
  });

  it('C5: Pagar todo shows readonly $ 40.000, invoice count text and enabled Revisar pago button', () => {
    crearModal([f1, f2], 'LIQUIDACION_TOTAL');

    const inputFijo = fixture.debugElement.query(By.css('[data-testid="input-monto-pagar-todo"]'))
      .nativeElement as HTMLElement & { value?: string; readonly?: boolean };
    expect(inputFijo.value).toBe('$ 40.000');
    expect(inputFijo.readonly).toBe(true);
    expect(inputFijo.getAttribute('aria-readonly')).toBe('true');
    expect(
      fixture.debugElement.query(By.css('[data-testid="ayuda-pagar-todo"]')).nativeElement.textContent.trim(),
    ).toBe('Salda las 2 facturas con saldo');
    expect(botonRevisar().textContent?.trim()).toBe('Revisar pago · $ 40.000');
    expect(Boolean(botonRevisar().disabled)).toBe(false);

    crearModal([f1], 'LIQUIDACION_TOTAL');
    expect(
      fixture.debugElement.query(By.css('[data-testid="ayuda-pagar-todo"]')).nativeElement.textContent.trim(),
    ).toBe('Salda la factura con saldo');
  });

  it('C6: future date shows exact FECHA_FUTURA error, disables button and passes clock max to hoja-fecha', () => {
    component.monto.set(10000);
    component.onFechaSeleccionada('2026-11-20 12:01:00');
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="error-fecha"]')).nativeElement.textContent.trim()).toBe(
      MENSAJES_ERROR.FECHA_FUTURA,
    );
    expect(Boolean(botonRevisar().disabled)).toBe(true);
    expect(component.maxFecha()).toBe('2026-11-20 12:00:00');
  });

  it('C7: date before a paying invoice shows ABONO_ANTERIOR_A_FACTURA and clears when only older invoices receive money', () => {
    component.onFechaSeleccionada('2026-11-05 10:00:00');
    component.monto.set(35000);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="error-fecha"]')).nativeElement.textContent.trim()).toBe(
      MENSAJES_ERROR.ABONO_ANTERIOR_A_FACTURA,
    );
    expect(Boolean(botonRevisar().disabled)).toBe(true);

    component.monto.set(30000);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="error-fecha"]'))).toBeNull();
    expect(Boolean(botonRevisar().disabled)).toBe(false);
  });

  it('C8: switching modes recalculates preview, help and clears invoice-only error', () => {
    component.onModoChange({ detail: { value: 'FACTURA_INDIVIDUAL' } } as CustomEvent);
    component.seleccionarFactura(2);
    component.monto.set(15000);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="error-monto"]')).nativeElement.textContent.trim()).toBe(
      MENSAJES_ERROR.MONTO_SUPERA_SALDO_FACTURA,
    );

    component.onModoChange({ detail: { value: 'CASCADA_GLOBAL' } } as CustomEvent);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="error-monto"]'))).toBeNull();
    expect(fixture.debugElement.query(By.css('[data-testid="ayuda-monto"]')).nativeElement.textContent.trim()).toBe(
      'Hasta $ 40.000',
    );
    expect(Boolean(botonRevisar().disabled)).toBe(false);
  });

  it('C10, C12, C14: opens summary with exact solicitud, locks parent while saving, and dismisses with ROL_GUARDADO on save', async () => {
    component.monto.set(35000);
    fixture.detectChanges();

    let resolverDismiss: (val: { data: unknown; role: string }) => void = () => undefined;
    mockResumenModal.onDidDismiss.mockReturnValueOnce(
      new Promise((resolve) => {
        resolverDismiss = resolve;
      }),
    );

    const abrirPromesa = component.abrirResumen();
    await Promise.resolve();

    expect(mockModalCtrl.create).toHaveBeenCalledWith(
      expect.objectContaining({
        component: ResumenAbonoModalComponent,
        componentProps: expect.objectContaining({
          cliente: ana,
          solicitud: {
            modo: 'CASCADA_GLOBAL',
            idCliente: 7,
            fecha: '2026-11-20 12:00:00',
            medio: 'EFECTIVO',
            monto: 35000,
          },
          montoTotal: 35000,
          deudaAnterior: 40000,
        }),
      }),
    );

    const callArg = mockModalCtrl.create.mock.calls[0][0];
    callArg.componentProps.alCambiarGuardando(true);
    fixture.detectChanges();

    expect(component.guardando()).toBe(true);
    expect(Boolean(botonRevisar().disabled)).toBe(true);
    expect(
      Boolean(fixture.debugElement.query(By.css('[data-testid="btn-cancelar-abono"]')).nativeElement.disabled),
    ).toBe(true);

    // Parent cannot be cancelled while saving, and summary blocks all dismissals while saving
    await component.cancelar();
    expect(mockModalCtrl.dismiss).not.toHaveBeenCalled();
    await expect(callArg.canDismiss(undefined, undefined)).resolves.toBe(false);
    await expect(callArg.canDismiss(null, ROL_CANCELAR)).resolves.toBe(false);
    await expect(callArg.canDismiss({ guardado: true }, ROL_GUARDADO)).resolves.toBe(false);

    callArg.componentProps.alCambiarGuardando(false);
    await expect(callArg.canDismiss(null, ROL_CANCELAR)).resolves.toBe(true);
    await expect(callArg.canDismiss({ guardado: true }, ROL_GUARDADO)).resolves.toBe(true);
    callArg.componentProps.alGuardar();
    resolverDismiss({ data: { guardado: true }, role: ROL_GUARDADO });
    await abrirPromesa;

    expect(mockModalCtrl.dismiss).toHaveBeenCalledWith({ guardado: true }, ROL_GUARDADO);
  });

  it('C10 & C14: sends LIQUIDACION_TOTAL without monto, keeps data intact on Volver a editar, and cancels on Cancelar', async () => {
    crearModal([f1, f2], 'LIQUIDACION_TOTAL');
    component.onMedioChange({ detail: { value: 'TRANSFERENCIA' } } as CustomEvent);
    component.onFechaSeleccionada('2026-11-19 08:30:00');
    fixture.detectChanges();

    await component.abrirResumen();

    const callArg = mockModalCtrl.create.mock.calls[0][0];
    expect(callArg.componentProps.solicitud).toEqual({
      modo: 'LIQUIDACION_TOTAL',
      idCliente: 7,
      fecha: '2026-11-19 08:30:00',
      medio: 'TRANSFERENCIA',
    });
    expect('monto' in callArg.componentProps.solicitud).toBe(false);

    // Volver a editar kept AbonoModal open with data intact
    expect(mockModalCtrl.dismiss).not.toHaveBeenCalled();
    expect(component.modo()).toBe('LIQUIDACION_TOTAL');
    expect(component.medio()).toBe('TRANSFERENCIA');
    expect(component.fechaSeleccionada()).toBe('2026-11-19 08:30:00');

    await component.cancelar();
    expect(mockModalCtrl.dismiss).toHaveBeenCalledWith(null, ROL_CANCELAR);
  });

  it('C10: sends FACTURA_INDIVIDUAL with idVenta and monto when opening summary', async () => {
    crearModal([f1, f2], 'FACTURA_INDIVIDUAL');
    component.seleccionarFactura(2);
    component.monto.set(3000);
    fixture.detectChanges();

    await component.abrirResumen();

    const callArg = mockModalCtrl.create.mock.calls[0][0];
    expect(callArg.componentProps.solicitud).toEqual({
      modo: 'FACTURA_INDIVIDUAL',
      idCliente: 7,
      fecha: '2026-11-20 12:00:00',
      medio: 'EFECTIVO',
      idVenta: 2,
      monto: 3000,
    });
  });

  it('C16: exposes accessible labels and aria attributes on controls', () => {
    const segmentModo = fixture.debugElement.query(By.css('[data-testid="segment-modo"]')).nativeElement as HTMLElement;
    const segmentMedio = fixture.debugElement.query(By.css('[data-testid="segment-medio"]'))
      .nativeElement as HTMLElement;
    expect(segmentModo.getAttribute('aria-label')).toBeTruthy();
    expect(segmentMedio.getAttribute('aria-labelledby')).toBe('lbl-medio');
    expect(fixture.debugElement.nativeElement.textContent).toContain('Monto del abono');
    expect(fixture.debugElement.nativeElement.textContent).toContain('Medio de pago');
    expect(fixture.debugElement.nativeElement.textContent).toContain('Fecha del abono');
  });

  it('C10: selects invoice matching idVentaInicial and leaves none when not among open invoices', () => {
    crearModal([f1, f2], 'FACTURA_INDIVIDUAL', 2);

    expect(component.idVentaSeleccionada()).toBe(2);
    expect(fixture.debugElement.query(By.css('[data-testid="ayuda-monto"]')).nativeElement.textContent).toContain(
      'Hasta $ 10.000',
    );

    crearModal([f1, f2], 'FACTURA_INDIVIDUAL', 999);
    expect(component.idVentaSeleccionada()).toBeNull();
    const btnRevisar = fixture.debugElement.query(By.css('[data-testid="btn-revisar-abono"]')).nativeElement;
    expect(Boolean(btnRevisar.disabled)).toBe(true);
  });

  it('C21: disables Cancelar and blocks cancelar() while abriendoResumen is true', async () => {
    let resolverCreate: (val: unknown) => void = () => undefined;
    mockModalCtrl.create.mockReturnValueOnce(
      new Promise((resolve) => {
        resolverCreate = resolve;
      }),
    );

    component.monto.set(5000);
    fixture.detectChanges();

    const apertura = component.abrirResumen();
    fixture.detectChanges();

    const btnCancelar = fixture.debugElement.query(By.css('[data-testid="btn-cancelar-abono"]')).nativeElement;
    expect(Boolean(btnCancelar.disabled)).toBe(true);
    expect(btnCancelar.getAttribute('aria-disabled')).toBe('true');

    await component.cancelar();
    expect(mockModalCtrl.dismiss).not.toHaveBeenCalled();

    resolverCreate(mockResumenModal);
    await apertura;
  });

  it('C23: shows error toast if summary create/present fails before saving, but not if dismiss fails after saving', async () => {
    // Path 1: modalCtrl.create fails before saving -> toast shown and abriendoResumen reset
    mockModalCtrl.create.mockRejectedValueOnce(new Error('Modal failed'));
    component.monto.set(5000);
    fixture.detectChanges();

    await component.abrirResumen();
    fixture.detectChanges();

    expect(mockToastCtrl.create).toHaveBeenCalledWith(
      expect.objectContaining({ message: MENSAJE_ERROR_GENERICO, color: 'danger' }),
    );
    expect(component.abriendoResumen()).toBe(false);
    expect(component.puedeRevisar()).toBe(true);

    // Path 2: summary saved (ROL_GUARDADO), then parent dismiss rejects -> no error toast shown
    mockToastCtrl.create.mockClear();
    mockResumenModal.onDidDismiss.mockResolvedValueOnce({ data: { guardado: true }, role: ROL_GUARDADO });
    mockModalCtrl.dismiss.mockRejectedValueOnce(new Error('Dismiss failed'));

    await component.abrirResumen();
    expect(mockToastCtrl.create).not.toHaveBeenCalled();
    expect(component.abriendoResumen()).toBe(false);
  });
});
