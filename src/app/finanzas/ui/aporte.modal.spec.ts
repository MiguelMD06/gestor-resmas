import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { ModalController, ToastController } from '@ionic/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fechaHora, pesos, ReglaNegocioError } from '../../shared/domain';
import { CLOCK } from '../../shared/infrastructure/clock/clock.token';
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

    expect(mockToastCtrl.create).toHaveBeenCalled();
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

    component.monto.set(0);
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
});
