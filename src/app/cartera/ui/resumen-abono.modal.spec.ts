import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ModalController, ToastController } from '@ionic/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Cliente } from '../../clientes/domain/cliente';
import { fechaHora, pesos, ReglaNegocioError } from '../../shared/domain';
import { ROL_CANCELAR, ROL_GUARDADO } from '../../shared/ui/formulario';
import { MENSAJE_ERROR_GENERICO, MENSAJES_ERROR } from '../../shared/ui/mensajes-error';
import { RegistrarAbono } from '../application/registrar-abono';

import { ResumenAbonoModalComponent, type LineaResumenAbono } from './resumen-abono.modal';

describe('ResumenAbonoModalComponent', () => {
  let fixture: ComponentFixture<ResumenAbonoModalComponent>;
  let component: ResumenAbonoModalComponent;
  let mockRegistrarAbono: { registrar: ReturnType<typeof vi.fn> };
  let mockModalCtrl: { dismiss: ReturnType<typeof vi.fn> };
  let mockToastCtrl: { create: ReturnType<typeof vi.fn> };
  let mockToastPresent: ReturnType<typeof vi.fn>;

  const ana: Cliente = {
    idCliente: 7,
    nombre: 'Ana',
    telefono: '3001234567',
    esMostrador: false,
  };

  const lineasCascada35k: readonly LineaResumenAbono[] = [
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

  beforeEach(async () => {
    mockRegistrarAbono = {
      registrar: vi.fn().mockResolvedValue({ idAbono: 101, aplicaciones: [] }),
    };
    mockModalCtrl = {
      dismiss: vi.fn().mockResolvedValue(true),
    };
    mockToastPresent = vi.fn().mockResolvedValue(undefined);
    mockToastCtrl = {
      create: vi.fn().mockResolvedValue({ present: mockToastPresent }),
    };

    await TestBed.configureTestingModule({
      imports: [ResumenAbonoModalComponent],
      providers: [
        { provide: RegistrarAbono, useValue: mockRegistrarAbono },
        { provide: ModalController, useValue: mockModalCtrl },
        { provide: ToastController, useValue: mockToastCtrl },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ResumenAbonoModalComponent);
    component = fixture.componentInstance;
    component.cliente = ana;
    component.solicitud = {
      modo: 'CASCADA_GLOBAL',
      idCliente: 7,
      fecha: fechaHora('2026-11-20 12:00:00'),
      medio: 'EFECTIVO',
      monto: pesos(35000),
    };
    component.montoTotal = pesos(35000);
    component.deudaAnterior = pesos(40000);
    component.lineas = lineasCascada35k;
    fixture.detectChanges();
  });

  it('C9: displays exact summary for A la deuda ($35.000 Efectivo) and Pagar todo ($40.000)', () => {
    const el = fixture.debugElement.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Resumen del abono');
    expect(fixture.debugElement.query(By.css('[data-testid="resumen-cliente"]')).nativeElement.textContent).toContain(
      'Ana',
    );
    expect(fixture.debugElement.query(By.css('[data-testid="resumen-fecha"]')).nativeElement.textContent).toContain(
      '20 nov 2026 · 12:00 p. m.',
    );
    expect(fixture.debugElement.query(By.css('[data-testid="resumen-medio"]')).nativeElement.textContent).toContain(
      'Efectivo',
    );
    expect(fixture.debugElement.query(By.css('[data-testid="resumen-modo"]')).nativeElement.textContent).toContain(
      'Abono a la deuda',
    );
    expect(fixture.debugElement.query(By.css('[data-testid="resumen-monto"]')).nativeElement.textContent).toContain(
      '$ 35.000',
    );

    const filas = fixture.debugElement.queryAll(By.css('[data-testid="resumen-linea-factura"]'));
    expect(filas).toHaveLength(2);
    expect(filas[0].nativeElement.textContent).toContain('Factura #1');
    expect(filas[0].nativeElement.textContent).toContain('Queda pagada');
    expect(filas[0].nativeElement.textContent).toContain('$ 30.000');
    expect(filas[1].nativeElement.textContent).toContain('Factura #2');
    expect(filas[1].nativeElement.textContent).toContain('Queda debiendo $ 5.000');
    expect(filas[1].nativeElement.textContent).toContain('$ 5.000');

    expect(fixture.debugElement.query(By.css('[data-testid="resumen-capital"]')).nativeElement.textContent).toContain(
      '$ 25.000',
    );
    expect(fixture.debugElement.query(By.css('[data-testid="resumen-ganancia"]')).nativeElement.textContent).toContain(
      '$ 10.000',
    );
    expect(
      fixture.debugElement.query(By.css('[data-testid="resumen-deuda-despues"]')).nativeElement.textContent,
    ).toContain('$ 5.000');

    // Pagar todo
    const fTodo = TestBed.createComponent(ResumenAbonoModalComponent);
    const cTodo = fTodo.componentInstance;
    cTodo.cliente = ana;
    cTodo.solicitud = {
      modo: 'LIQUIDACION_TOTAL',
      idCliente: 7,
      fecha: fechaHora('2026-11-20 12:00:00'),
      medio: 'EFECTIVO',
    };
    cTodo.montoTotal = pesos(40000);
    cTodo.deudaAnterior = pesos(40000);
    cTodo.lineas = [
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
    fTodo.detectChanges();

    expect(fTodo.debugElement.query(By.css('[data-testid="resumen-modo"]')).nativeElement.textContent).toContain(
      'Pago total',
    );
    expect(fTodo.debugElement.query(By.css('[data-testid="resumen-capital"]')).nativeElement.textContent).toContain(
      '$ 25.000',
    );
    expect(fTodo.debugElement.query(By.css('[data-testid="resumen-ganancia"]')).nativeElement.textContent).toContain(
      '$ 15.000',
    );
    expect(
      fTodo.debugElement.query(By.css('[data-testid="resumen-deuda-despues"]')).nativeElement.textContent,
    ).toContain('$ 0');
  });

  it('C10 & C14: Aceptar calls RegistrarAbono.registrar once and dismisses with ROL_GUARDADO; Volver a editar cancels', async () => {
    const alGuardar = vi.fn();
    component.alGuardar = alGuardar;

    await component.aceptar();

    expect(mockRegistrarAbono.registrar).toHaveBeenCalledTimes(1);
    expect(mockRegistrarAbono.registrar).toHaveBeenCalledWith({
      modo: 'CASCADA_GLOBAL',
      idCliente: 7,
      fecha: '2026-11-20 12:00:00',
      medio: 'EFECTIVO',
      monto: 35000,
    });
    expect(alGuardar).toHaveBeenCalledTimes(1);
    expect(mockModalCtrl.dismiss).toHaveBeenCalledWith({ guardado: true }, ROL_GUARDADO);

    // Volver a editar
    const f2 = TestBed.createComponent(ResumenAbonoModalComponent);
    const c2 = f2.componentInstance;
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
    f2.detectChanges();

    expect(f2.debugElement.query(By.css('[data-testid="resumen-modo"]')).nativeElement.textContent).toContain(
      'Abono a la factura #2',
    );
    expect(f2.debugElement.query(By.css('[data-testid="resumen-medio"]')).nativeElement.textContent).toContain(
      'Transferencia',
    );

    await c2.volverAEditar();
    expect(mockModalCtrl.dismiss).toHaveBeenCalledWith(null, ROL_CANCELAR);
    expect(mockRegistrarAbono.registrar).toHaveBeenCalledTimes(1);
  });

  it('C11 & C12: double tap on Aceptar calls registrar once; disables buttons with aria-disabled and shows Guardando…', async () => {
    let resolver: (val: { idAbono: number; aplicaciones: [] }) => void = () => undefined;
    mockRegistrarAbono.registrar.mockReturnValueOnce(
      new Promise((resolve) => {
        resolver = resolve;
      }),
    );
    const alCambiarGuardando = vi.fn();
    component.alCambiarGuardando = alCambiarGuardando;

    const p1 = component.aceptar();
    const p2 = component.aceptar();
    fixture.detectChanges();

    expect(alCambiarGuardando).toHaveBeenCalledWith(true);
    expect(mockRegistrarAbono.registrar).toHaveBeenCalledTimes(1);

    const btnAceptar = fixture.debugElement.query(By.css('[data-testid="btn-aceptar-abono"]')).nativeElement;
    const btnVolver = fixture.debugElement.query(By.css('[data-testid="btn-volver-editar"]')).nativeElement;
    expect(btnAceptar.textContent).toContain('Guardando…');
    expect(Boolean(btnAceptar.disabled)).toBe(true);
    expect(btnAceptar.getAttribute('aria-disabled')).toBe('true');
    expect(Boolean(btnVolver.disabled)).toBe(true);
    expect(btnVolver.getAttribute('aria-disabled')).toBe('true');

    await component.volverAEditar();
    expect(mockModalCtrl.dismiss).not.toHaveBeenCalled();

    resolver({ idAbono: 101, aplicaciones: [] });
    await Promise.all([p1, p2]);
    fixture.detectChanges();

    expect(alCambiarGuardando).toHaveBeenLastCalledWith(false);
  });

  it('C13: on error shows exact error text, re-enables buttons without dismissing and allows retry', async () => {
    mockRegistrarAbono.registrar.mockRejectedValueOnce(
      new ReglaNegocioError('MONTO_SUPERA_DEUDA', 'Payment exceeds debt'),
    );

    await component.aceptar();
    fixture.detectChanges();

    expect(mockModalCtrl.dismiss).not.toHaveBeenCalled();
    expect(
      fixture.debugElement.query(By.css('[data-testid="error-guardar-abono"]')).nativeElement.textContent,
    ).toContain(MENSAJES_ERROR.MONTO_SUPERA_DEUDA);

    const btnAceptar = fixture.debugElement.query(By.css('[data-testid="btn-aceptar-abono"]')).nativeElement;
    const btnVolver = fixture.debugElement.query(By.css('[data-testid="btn-volver-editar"]')).nativeElement;
    expect(Boolean(btnAceptar.disabled)).toBe(false);
    expect(Boolean(btnVolver.disabled)).toBe(false);

    // Unexpected error
    mockRegistrarAbono.registrar.mockRejectedValueOnce(new Error('SQLite disk full'));
    await component.aceptar();
    fixture.detectChanges();
    expect(
      fixture.debugElement.query(By.css('[data-testid="error-guardar-abono"]')).nativeElement.textContent,
    ).toContain(MENSAJE_ERROR_GENERICO);

    // Retry succeeds
    await component.aceptar();
    expect(mockRegistrarAbono.registrar).toHaveBeenCalledTimes(3);
    expect(mockModalCtrl.dismiss).toHaveBeenCalledWith({ guardado: true }, ROL_GUARDADO);
  });

  it('C22: guards volverAEditar against double tap and handles dismiss failure without leaving buttons stuck', async () => {
    let resolverDismiss: (val: boolean) => void = () => undefined;
    mockModalCtrl.dismiss.mockReturnValueOnce(
      new Promise((resolve) => {
        resolverDismiss = resolve;
      }),
    );

    const p1 = component.volverAEditar();
    const p2 = component.volverAEditar();
    expect(mockModalCtrl.dismiss).toHaveBeenCalledTimes(1);

    resolverDismiss(true);
    await Promise.all([p1, p2]);

    // If dismiss rejects, no unhandled rejection and buttons remain usable
    mockModalCtrl.dismiss.mockRejectedValueOnce(new Error('Dismiss error'));
    await component.volverAEditar();
    fixture.detectChanges();

    const btnAceptar = fixture.debugElement.query(By.css('[data-testid="btn-aceptar-abono"]')).nativeElement;
    const btnVolver = fixture.debugElement.query(By.css('[data-testid="btn-volver-editar"]')).nativeElement;
    expect(Boolean(btnAceptar.disabled)).toBe(false);
    expect(Boolean(btnVolver.disabled)).toBe(false);
  });

  it('B4.4 C1-C3: blocks aceptar() and disables both buttons while volverAEditar() dismiss is in flight, and recovers on dismiss error', async () => {
    let resolverDismiss: (val: boolean) => void = () => undefined;
    mockModalCtrl.dismiss.mockReturnValueOnce(
      new Promise((resolve) => {
        resolverDismiss = resolve;
      }),
    );

    const pVolver = component.volverAEditar();
    fixture.detectChanges();

    const btnAceptar = fixture.debugElement.query(By.css('[data-testid="btn-aceptar-abono"]')).nativeElement;
    const btnVolver = fixture.debugElement.query(By.css('[data-testid="btn-volver-editar"]')).nativeElement;
    expect(Boolean(btnAceptar.disabled)).toBe(true);
    expect(btnAceptar.getAttribute('aria-disabled')).toBe('true');
    expect(Boolean(btnVolver.disabled)).toBe(true);
    expect(btnVolver.getAttribute('aria-disabled')).toBe('true');

    await component.aceptar();
    expect(mockRegistrarAbono.registrar).not.toHaveBeenCalled();

    resolverDismiss(true);
    await pVolver;
    fixture.detectChanges();

    expect(Boolean(btnAceptar.disabled)).toBe(false);
    expect(Boolean(btnVolver.disabled)).toBe(false);

    // If dismiss rejects, no unhandled rejection, buttons re-enabled, and aceptar() works once
    let rechazarDismiss: (err: Error) => void = () => undefined;
    mockModalCtrl.dismiss.mockReturnValueOnce(
      new Promise((_, reject) => {
        rechazarDismiss = reject;
      }),
    );

    const pVolverError = component.volverAEditar();
    fixture.detectChanges();
    expect(Boolean(btnAceptar.disabled)).toBe(true);
    expect(Boolean(btnVolver.disabled)).toBe(true);

    rechazarDismiss(new Error('Dismiss failed'));
    await pVolverError;
    fixture.detectChanges();

    expect(Boolean(btnAceptar.disabled)).toBe(false);
    expect(Boolean(btnVolver.disabled)).toBe(false);

    await component.aceptar();
    expect(mockRegistrarAbono.registrar).toHaveBeenCalledTimes(1);
  });
});
