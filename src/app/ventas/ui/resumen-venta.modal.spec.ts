import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ModalController, ToastController } from '@ionic/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Cliente } from '../../clientes/domain/cliente';
import { fechaHora, pesos, ReglaNegocioError } from '../../shared/domain';
import { ROL_CANCELAR, ROL_GUARDADO } from '../../shared/ui/formulario';
import { MENSAJES_ERROR } from '../../shared/ui/mensajes-error';
import { RegistrarVenta } from '../application/registrar-venta';

import { ResumenVentaModalComponent, ROL_ERROR } from './resumen-venta.modal';

describe('ResumenVentaModalComponent', () => {
  let fixture: ComponentFixture<ResumenVentaModalComponent>;
  let component: ResumenVentaModalComponent;
  let mockRegistrarVenta: { registrar: ReturnType<typeof vi.fn> };
  let mockModalCtrl: { dismiss: ReturnType<typeof vi.fn> };
  let mockToastCtrl: { create: ReturnType<typeof vi.fn> };
  let mockToastPresent: ReturnType<typeof vi.fn>;

  const ana: Cliente = {
    idCliente: 2,
    nombre: 'Ana María Pérez',
    telefono: '3001234567',
    esMostrador: false,
  };

  beforeEach(async () => {
    mockRegistrarVenta = {
      registrar: vi.fn().mockResolvedValue({ idVenta: 99 }),
    };
    mockModalCtrl = {
      dismiss: vi.fn().mockResolvedValue(true),
    };
    mockToastPresent = vi.fn().mockResolvedValue(undefined);
    mockToastCtrl = {
      create: vi.fn().mockResolvedValue({ present: mockToastPresent }),
    };

    await TestBed.configureTestingModule({
      imports: [ResumenVentaModalComponent],
      providers: [
        { provide: RegistrarVenta, useValue: mockRegistrarVenta },
        { provide: ModalController, useValue: mockModalCtrl },
        { provide: ToastController, useValue: mockToastCtrl },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ResumenVentaModalComponent);
    component = fixture.componentInstance;
    component.cliente = ana;
    component.lineas = [
      {
        idLote: 10,
        tipoPapel: 'CARTA',
        cantidad: 5,
        precioUnitario: pesos(15000),
        subtotalVenta: pesos(75000),
      },
    ];
    component.totalVenta = pesos(75000);
    component.pago = { modalidad: 'CONTADO', medio: 'EFECTIVO' };
    component.fecha = fechaHora('2026-11-15 14:30:00');
    fixture.detectChanges();
  });

  it('displays exact summary texts for E19 and Volver a editar dismisses without calling registrar', async () => {
    expect(fixture.debugElement.query(By.css('[data-testid="resumen-cliente"]')).nativeElement.textContent).toContain(
      'Ana María Pérez',
    );
    expect(fixture.debugElement.query(By.css('[data-testid="resumen-linea"]')).nativeElement.textContent.trim()).toBe(
      '5 × Carta a $ 15.000 = $ 75.000',
    );
    expect(fixture.debugElement.query(By.css('[data-testid="resumen-total"]')).nativeElement.textContent.trim()).toBe(
      'Total: $ 75.000',
    );
    expect(fixture.debugElement.query(By.css('[data-testid="resumen-pago"]')).nativeElement.textContent.trim()).toBe(
      'Contado · Efectivo',
    );

    const btnVolver = fixture.debugElement.query(By.css('[data-testid="btn-volver-editar"]'));
    btnVolver.triggerEventHandler('click', null);
    await Promise.resolve();

    expect(mockModalCtrl.dismiss).toHaveBeenCalledWith(null, ROL_CANCELAR);
    expect(mockRegistrarVenta.registrar).not.toHaveBeenCalled();
  });

  it('prevents double submission on Aceptar, disables buttons while saving, and shows exact error toast on failure (E17)', async () => {
    let rechazar: (err: unknown) => void = () => undefined;
    mockRegistrarVenta.registrar.mockReturnValueOnce(
      new Promise<{ idVenta: number }>((_resolve, reject) => {
        rechazar = reject;
      }),
    );

    const p1 = component.aceptar();
    const p2 = component.aceptar();
    fixture.detectChanges();

    expect(mockRegistrarVenta.registrar).toHaveBeenCalledTimes(1);
    expect(component.guardando()).toBe(true);
    expect(
      Boolean(fixture.debugElement.query(By.css('[data-testid="btn-aceptar-venta"]')).nativeElement.disabled),
    ).toBe(true);
    expect(
      Boolean(fixture.debugElement.query(By.css('[data-testid="btn-volver-editar"]')).nativeElement.disabled),
    ).toBe(true);
    expect(fixture.debugElement.query(By.css('[data-testid="indicador-guardando"]'))).toBeTruthy();

    // Volver a editar does nothing while saving
    await component.volverAEditar();
    expect(mockModalCtrl.dismiss).not.toHaveBeenCalled();

    // Fail the request
    rechazar(new ReglaNegocioError('STOCK_INSUFICIENTE', 'Not enough stock'));
    await Promise.all([p1, p2]);
    fixture.detectChanges();

    expect(component.guardando()).toBe(false);
    expect(mockToastCtrl.create).toHaveBeenCalledWith(
      expect.objectContaining({
        message: MENSAJES_ERROR.STOCK_INSUFICIENTE,
        color: 'danger',
      }),
    );
    expect(mockToastPresent).toHaveBeenCalled();
    expect(mockModalCtrl.dismiss).toHaveBeenCalledWith({ error: true }, ROL_ERROR);
    expect(ROL_ERROR).not.toBe(ROL_CANCELAR);
    expect(
      Boolean(fixture.debugElement.query(By.css('[data-testid="btn-aceptar-venta"]')).nativeElement.disabled),
    ).toBe(false);
  });

  it('shows Venta registrada toast and dismisses with ROL_GUARDADO on success', async () => {
    await component.aceptar();

    expect(mockRegistrarVenta.registrar).toHaveBeenCalledWith({
      idCliente: ana.idCliente,
      fecha: '2026-11-15 14:30:00',
      lineas: [{ idLote: 10, cantidad: 5, precioUnitario: 15000 }],
      pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
    });
    expect(mockToastCtrl.create).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Venta registrada',
        color: 'success',
      }),
    );
    expect(mockToastPresent).toHaveBeenCalled();
    expect(mockModalCtrl.dismiss).toHaveBeenCalledWith({ guardado: true }, ROL_GUARDADO);
  });

  it('notifies alCambiarGuardando(true) before saving and alCambiarGuardando(false) in finally (V2)', async () => {
    let resolver: (val: { idVenta: number }) => void = () => undefined;
    mockRegistrarVenta.registrar.mockReturnValueOnce(
      new Promise((resolve) => {
        resolver = resolve;
      }),
    );

    const alCambiarGuardando = vi.fn();
    component.alCambiarGuardando = alCambiarGuardando;

    const p = component.aceptar();
    expect(alCambiarGuardando).toHaveBeenCalledTimes(1);
    expect(alCambiarGuardando).toHaveBeenLastCalledWith(true);

    resolver({ idVenta: 99 });
    await p;

    expect(alCambiarGuardando).toHaveBeenCalledTimes(2);
    expect(alCambiarGuardando).toHaveBeenLastCalledWith(false);
  });

  it('dismisses with ROL_GUARDADO and never shows save error if toast.present fails after registrar resolves (F5)', async () => {
    mockToastPresent.mockRejectedValueOnce(new Error('Toast failed'));

    await expect(component.aceptar()).resolves.toBeUndefined();

    expect(mockRegistrarVenta.registrar).toHaveBeenCalledTimes(1);
    expect(mockToastCtrl.create).toHaveBeenCalledTimes(1);
    expect(mockToastCtrl.create).toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }));
    expect(mockModalCtrl.dismiss).toHaveBeenCalledWith({ guardado: true }, ROL_GUARDADO);
    expect(component.guardando()).toBe(false);
  });

  it('releases guardando without unhandled rejection if dismiss fails after registrar resolves (F5)', async () => {
    mockModalCtrl.dismiss.mockRejectedValueOnce(new Error('Dismiss failed'));

    await expect(component.aceptar()).resolves.toBeUndefined();

    expect(mockRegistrarVenta.registrar).toHaveBeenCalledTimes(1);
    expect(mockToastCtrl.create).toHaveBeenCalledTimes(1);
    expect(mockModalCtrl.dismiss).toHaveBeenCalledWith({ guardado: true }, ROL_GUARDADO);
    expect(component.guardando()).toBe(false);
  });

  it('still dismisses with ROL_ERROR if error toast fails when registrar rejects (F5)', async () => {
    mockRegistrarVenta.registrar.mockRejectedValueOnce(new ReglaNegocioError('STOCK_INSUFICIENTE', 'No stock'));
    mockToastPresent.mockRejectedValueOnce(new Error('Toast failed'));

    await expect(component.aceptar()).resolves.toBeUndefined();

    expect(mockModalCtrl.dismiss).toHaveBeenCalledWith({ error: true }, ROL_ERROR);
    expect(component.guardando()).toBe(false);
  });

  it('derives payment summary text directly from pago for Contado, Fiado and Abono inicial (F7)', () => {
    const f1 = TestBed.createComponent(ResumenVentaModalComponent);
    const c1 = f1.componentInstance;
    c1.cliente = ana;
    c1.lineas = component.lineas;
    c1.totalVenta = pesos(75000);
    c1.pago = { modalidad: 'FIADO' };
    c1.fecha = fechaHora('2026-11-15 14:30:00');
    f1.detectChanges();
    expect(f1.debugElement.query(By.css('[data-testid="resumen-pago"]')).nativeElement.textContent.trim()).toBe(
      'Fiado',
    );

    const f2 = TestBed.createComponent(ResumenVentaModalComponent);
    const c2 = f2.componentInstance;
    c2.cliente = ana;
    c2.lineas = component.lineas;
    c2.totalVenta = pesos(75000);
    c2.pago = { modalidad: 'ABONO_INICIAL', monto: 25000, medio: 'TRANSFERENCIA' };
    c2.fecha = fechaHora('2026-11-15 14:30:00');
    f2.detectChanges();
    expect(f2.debugElement.query(By.css('[data-testid="resumen-pago"]')).nativeElement.textContent.trim()).toBe(
      'Abono inicial de $ 25.000 · Transferencia',
    );
  });

  it('locks Aceptar and Volver a editar permanently, shows Venta registrada, notifies alGuardar and ignores second aceptar() if dismiss rejects after registrar resolves (H1)', async () => {
    mockModalCtrl.dismiss.mockRejectedValueOnce(new Error('Dismiss failed'));
    const alGuardar = vi.fn();
    component.alGuardar = alGuardar;

    await component.aceptar();
    fixture.detectChanges();

    expect(mockRegistrarVenta.registrar).toHaveBeenCalledTimes(1);
    expect(alGuardar).toHaveBeenCalledTimes(1);
    expect(
      Boolean(fixture.debugElement.query(By.css('[data-testid="btn-aceptar-venta"]')).nativeElement.disabled),
    ).toBe(true);
    expect(
      Boolean(fixture.debugElement.query(By.css('[data-testid="btn-volver-editar"]')).nativeElement.disabled),
    ).toBe(true);
    expect(
      fixture.debugElement.query(By.css('[data-testid="mensaje-venta-registrada"]')).nativeElement.textContent.trim(),
    ).toBe('Venta registrada');

    await component.aceptar();
    await component.volverAEditar();

    expect(mockRegistrarVenta.registrar).toHaveBeenCalledTimes(1);
    expect(mockModalCtrl.dismiss).toHaveBeenCalledTimes(1);
  });
});
