import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { ModalController, ToastController } from '@ionic/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fechaHora, pesos, ReglaNegocioError } from '../../shared/domain';
import { CLOCK } from '../../shared/infrastructure/clock/clock.token';
import { MENSAJES_ERROR } from '../../shared/ui/mensajes-error';
import { RegistrarAporte } from '../application/registrar-aporte';

import { AporteModalComponent } from './aporte.modal';

describe('AporteModalComponent', () => {
  let fixture: ComponentFixture<AporteModalComponent>;
  let component: AporteModalComponent;
  let mockRegistrarAporte: { registrar: ReturnType<typeof vi.fn> };
  let mockModalCtrl: { dismiss: ReturnType<typeof vi.fn> };
  let mockToastCtrl: { create: ReturnType<typeof vi.fn> };
  let horaSimulada = '2026-11-10 09:00:00';

  beforeEach(async () => {
    horaSimulada = '2026-11-10 09:00:00';
    mockRegistrarAporte = {
      registrar: vi.fn().mockResolvedValue(1),
    };

    mockModalCtrl = {
      dismiss: vi.fn().mockResolvedValue(true),
    };

    mockToastCtrl = {
      create: vi.fn().mockResolvedValue({ present: vi.fn() }),
    };

    await TestBed.configureTestingModule({
      imports: [AporteModalComponent, FormsModule],
      providers: [
        { provide: RegistrarAporte, useValue: mockRegistrarAporte },
        { provide: CLOCK, useValue: { ahora: () => fechaHora(horaSimulada) } },
        { provide: ModalController, useValue: mockModalCtrl },
        { provide: ToastController, useValue: mockToastCtrl },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AporteModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('initializes with default simulated date (YYYY-MM-DD) and cash payment method', () => {
    expect(component.fecha()).toBe('2026-11-10');
    expect(component.medio()).toBe('EFECTIVO');
  });

  it('calls registrar with form values and closes modal with guardado result (E1)', async () => {
    component.monto.set(300000);
    component.medio.set('EFECTIVO');
    fixture.detectChanges();

    await component.guardar();

    expect(mockRegistrarAporte.registrar).toHaveBeenCalledWith({
      fecha: '2026-11-10 09:00:00',
      medio: 'EFECTIVO',
      monto: pesos(300000),
    });

    expect(mockModalCtrl.dismiss).toHaveBeenCalledWith({ guardado: true }, 'guardado');
  });

  it('calls registrar with selected date 2026-11-05 and simulated CLOCK time 10:30:00 when saving', async () => {
    horaSimulada = '2026-11-11 10:30:00';
    component.fecha.set('2026-11-05');
    component.monto.set(300000);
    fixture.detectChanges();

    await component.guardar();

    expect(mockRegistrarAporte.registrar).toHaveBeenCalledWith({
      fecha: '2026-11-05 10:30:00',
      medio: 'EFECTIVO',
      monto: pesos(300000),
    });
    expect(mockModalCtrl.dismiss).toHaveBeenCalledWith({ guardado: true }, 'guardado');
  });

  it('records the contribution only once and disables Guardar aporte while a save is in flight', async () => {
    let resolverRegistro: (valor: number) => void = () => undefined;
    mockRegistrarAporte.registrar.mockReturnValueOnce(
      new Promise((resolve) => {
        resolverRegistro = resolve;
      }),
    );
    component.monto.set(300000);

    const primerGuardado = component.guardar();
    const segundoGuardado = component.guardar();
    fixture.detectChanges();

    const botonGuardar = fixture.debugElement.query(By.css('[data-testid="btn-guardar-aporte"]'));
    expect(botonGuardar.nativeElement.disabled || botonGuardar.attributes['disabled'] !== undefined).toBe(true);

    resolverRegistro(1);
    await Promise.all([primerGuardado, segundoGuardado]);

    expect(mockRegistrarAporte.registrar).toHaveBeenCalledTimes(1);
    expect(mockModalCtrl.dismiss).toHaveBeenCalledTimes(1);
  });

  it('enables Guardar aporte again after a failed save', async () => {
    mockRegistrarAporte.registrar.mockRejectedValueOnce(new Error('write failed'));
    component.monto.set(300000);

    await component.guardar();

    expect(mockToastCtrl.create).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Ocurrió un error inesperado',
      }),
    );
    expect(component.puedeGuardar()).toBe(true);
  });

  it('disables Guardar aporte when monto is empty, does not call registrar, and enables with 300000', async () => {
    expect(component.monto()).toBeNull();
    expect(component.puedeGuardar()).toBe(false);

    const botonGuardar = fixture.debugElement.query(By.css('[data-testid="btn-guardar-aporte"]'));
    expect(botonGuardar.nativeElement.disabled || botonGuardar.attributes['disabled'] !== undefined).toBe(true);

    await component.guardar();
    expect(mockRegistrarAporte.registrar).not.toHaveBeenCalled();

    component.monto.set(300000);
    fixture.detectChanges();

    expect(component.puedeGuardar()).toBe(true);
    expect(botonGuardar.nativeElement.disabled).toBe(false);
  });

  it('disables Cancelar button and form fields while save is in flight, blocks cancelar(), and re-enables all after error', async () => {
    let rejectRegistro!: (error: unknown) => void;
    mockRegistrarAporte.registrar.mockReturnValueOnce(
      new Promise((_, reject) => {
        rejectRegistro = reject;
      }),
    );

    component.monto.set(300000);
    fixture.detectChanges();

    const guardarPromise = component.guardar();
    fixture.detectChanges();

    // 1. Cancel button is disabled
    const btnCancelar = fixture.debugElement.query(By.css('[data-testid="btn-cancelar"]'));
    expect(btnCancelar.nativeElement.disabled || btnCancelar.attributes['disabled'] !== undefined).toBe(true);

    // 2. Form fields are disabled
    const inputFecha = fixture.debugElement.query(By.css('[data-testid="input-fecha"]'));
    expect(inputFecha.nativeElement.disabled || inputFecha.attributes['disabled'] !== undefined).toBe(true);

    const selectMedio = fixture.debugElement.query(By.css('[data-testid="select-medio"]'));
    expect(selectMedio.nativeElement.disabled || selectMedio.attributes['disabled'] !== undefined).toBe(true);

    const inputMonto = fixture.debugElement.query(By.css('[data-testid="input-monto"]'));
    expect(inputMonto.nativeElement.disabled || inputMonto.attributes['disabled'] !== undefined).toBe(true);

    // 3. Calling cancelar() does nothing
    await component.cancelar();
    expect(mockModalCtrl.dismiss).not.toHaveBeenCalled();

    // 4. Reject with error
    rejectRegistro(new Error('fail'));
    await guardarPromise;
    fixture.detectChanges();

    // 5. After error, everything is enabled again
    expect(btnCancelar.nativeElement.disabled || btnCancelar.attributes['disabled'] !== undefined).toBe(false);
    expect(inputFecha.nativeElement.disabled || inputFecha.attributes['disabled'] !== undefined).toBe(false);
    expect(selectMedio.nativeElement.disabled || selectMedio.attributes['disabled'] !== undefined).toBe(false);
    expect(inputMonto.nativeElement.disabled || inputMonto.attributes['disabled'] !== undefined).toBe(false);
    expect(component.puedeGuardar()).toBe(true);
  });

  it('shows Elige una fecha and disables Guardar aporte when date is empty', async () => {
    component.fecha.set('');
    fixture.detectChanges();

    const noteFecha = fixture.debugElement.query(By.css('[data-testid="error-fecha"]'));
    expect(noteFecha).toBeTruthy();
    expect(noteFecha.nativeElement.textContent).toContain('Elige una fecha');

    const botonGuardar = fixture.debugElement.query(By.css('[data-testid="btn-guardar-aporte"]'));
    expect(botonGuardar.nativeElement.disabled || botonGuardar.attributes['disabled'] !== undefined).toBe(true);
  });

  it('shows toast with translated error message when registrar throws ReglaNegocioError', async () => {
    mockRegistrarAporte.registrar.mockRejectedValueOnce(
      new ReglaNegocioError('MONTO_INVALIDO', 'Amount must be greater than zero'),
    );

    component.monto.set(100000);
    await component.guardar();

    expect(mockToastCtrl.create).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('El monto debe ser un número entero mayor a cero'),
      }),
    );
    expect(mockModalCtrl.dismiss).not.toHaveBeenCalled();
  });

  it('dismisses modal with cancel role when cancelar is called', async () => {
    await component.cancelar();
    expect(mockModalCtrl.dismiss).toHaveBeenCalledWith(null, 'cancel');
  });

  it('formats "120000" as "$ 120.000" in monto field, saves 120000, and keeps Guardar aporte disabled when empty (E21)', async () => {
    const campoPesos = fixture.debugElement.query(By.css('app-campo-pesos[data-testid="input-monto"]'));
    expect(campoPesos).toBeTruthy();

    const ionInput = campoPesos.query(By.css('ion-input'));
    ionInput.nativeElement.value = '120000';
    ionInput.triggerEventHandler('ionInput', {
      detail: { value: '120000' },
      target: ionInput.nativeElement,
    });
    fixture.detectChanges();

    expect(ionInput.nativeElement.value).toBe('$ 120.000');
    expect(component.monto()).toBe(120000);

    await component.guardar();
    expect(mockRegistrarAporte.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        monto: pesos(120000),
      }),
    );

    ionInput.nativeElement.value = '';
    ionInput.triggerEventHandler('ionInput', {
      detail: { value: '' },
      target: ionInput.nativeElement,
    });
    fixture.detectChanges();

    expect(component.monto()).toBeNull();
    const botonGuardar = fixture.debugElement.query(By.css('[data-testid="btn-guardar-aporte"]'));
    expect(botonGuardar.nativeElement.disabled || botonGuardar.attributes['disabled'] !== undefined).toBe(true);
  });

  it('disables Guardar aporte and does not call registrar when monto has "3800,50" (R1)', async () => {
    const campoPesos = fixture.debugElement.query(By.css('app-campo-pesos[data-testid="input-monto"]'));
    const ionInput = campoPesos.query(By.css('ion-input'));
    ionInput.nativeElement.value = '3800,50';
    ionInput.triggerEventHandler('ionInput', {
      detail: { value: '3800,50' },
      target: ionInput.nativeElement,
    });
    fixture.detectChanges();

    expect(component.monto()).toBeNull();
    const botonGuardar = fixture.debugElement.query(By.css('[data-testid="btn-guardar-aporte"]'));
    expect(botonGuardar.nativeElement.disabled || botonGuardar.attributes['disabled'] !== undefined).toBe(true);

    await component.guardar();
    expect(mockRegistrarAporte.registrar).not.toHaveBeenCalled();
  });

  it('shows FECHA_FUTURA message next to date and disables Guardar aporte when date is future, and enables with today (E4)', async () => {
    component.monto.set(100000);
    component.fecha.set('2026-11-11');
    fixture.detectChanges();

    const errorFecha = fixture.debugElement.query(By.css('[data-testid="error-fecha"]'));
    expect(errorFecha).toBeTruthy();
    expect(errorFecha.nativeElement.textContent).toContain('La fecha no puede ser futura');

    const botonGuardar = fixture.debugElement.query(By.css('[data-testid="btn-guardar-aporte"]'));
    expect(botonGuardar.nativeElement.disabled || botonGuardar.attributes['disabled'] !== undefined).toBe(true);

    await component.guardar();
    expect(mockRegistrarAporte.registrar).not.toHaveBeenCalled();

    component.fecha.set('2026-11-10');
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="error-fecha"]'))).toBeNull();
    expect(botonGuardar.nativeElement.disabled).toBe(false);
  });

  it('shows MONTO_INVALIDO message and disables Guardar aporte when monto is 0, and enables with positive integer (E5, R-17)', async () => {
    component.monto.set(0);
    fixture.detectChanges();

    const errorMonto = fixture.debugElement.query(By.css('[data-testid="error-monto"]'));
    expect(errorMonto).toBeTruthy();
    expect(errorMonto.nativeElement.textContent).toContain('El monto debe ser un número entero mayor a cero');

    const botonGuardar = fixture.debugElement.query(By.css('[data-testid="btn-guardar-aporte"]'));
    expect(botonGuardar.nativeElement.disabled || botonGuardar.attributes['disabled'] !== undefined).toBe(true);

    await component.guardar();
    expect(mockRegistrarAporte.registrar).not.toHaveBeenCalled();

    component.monto.set(1);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="error-monto"]'))).toBeNull();
    expect(botonGuardar.nativeElement.disabled).toBe(false);
  });

  it('opens date sheet with refreshed maxFecha from CLOCK, updates date and time on selection, and closes sheet (D5, E7)', () => {
    expect(component.selectorFechaAbierto()).toBe(false);
    expect(component.maxFecha()).toBe(fechaHora('2026-11-10 09:00:00'));

    horaSimulada = '2026-11-10 15:45:00';
    component.abrirSelectorFecha();
    fixture.detectChanges();

    expect(component.selectorFechaAbierto()).toBe(true);
    expect(component.maxFecha()).toBe(fechaHora('2026-11-10 15:45:00'));
    expect(fixture.debugElement.query(By.css('[data-testid="modal-fecha-aporte"]'))).toBeTruthy();

    component.onFechaSeleccionada(fechaHora('2026-11-08 14:25:00'));
    fixture.detectChanges();

    expect(component.fecha()).toBe('2026-11-08');
    expect(component.horaSeleccionada()).toBe('14:25:00');
    expect(component.fechaHoraParaHoja()).toBe(fechaHora('2026-11-08 14:25:00'));

    component.cerrarSelectorFecha();
    fixture.detectChanges();

    expect(component.selectorFechaAbierto()).toBe(false);
  });

  it('disables Guardar aporte with exact FECHA_FUTURA text when selecting a later time on the same day as CLOCK', async () => {
    component.monto.set(100000);
    component.onFechaSeleccionada(fechaHora('2026-11-10 09:00:01'));
    fixture.detectChanges();

    const errorFecha = fixture.debugElement.query(By.css('[data-testid="error-fecha"]'));
    expect(errorFecha).toBeTruthy();
    expect(errorFecha.nativeElement.textContent.trim()).toBe(MENSAJES_ERROR.FECHA_FUTURA);

    const botonGuardar = fixture.debugElement.query(By.css('[data-testid="btn-guardar-aporte"]'));
    expect(botonGuardar.nativeElement.disabled || botonGuardar.attributes['disabled'] !== undefined).toBe(true);
    expect(component.puedeGuardar()).toBe(false);

    await component.guardar();
    expect(mockRegistrarAporte.registrar).not.toHaveBeenCalled();
  });

  it('passes date and time selected via date sheet unchanged to registrar when saving', async () => {
    component.onFechaSeleccionada(fechaHora('2026-11-08 14:25:30'));
    component.monto.set(100000);
    fixture.detectChanges();

    await component.guardar();

    expect(mockRegistrarAporte.registrar).toHaveBeenCalledWith({
      fecha: fechaHora('2026-11-08 14:25:30'),
      medio: 'EFECTIVO',
      monto: pesos(100000),
    });
    expect(mockModalCtrl.dismiss).toHaveBeenCalledWith({ guardado: true }, 'guardado');
  });
});
