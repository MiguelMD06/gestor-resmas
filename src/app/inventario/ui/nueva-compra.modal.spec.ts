import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { ModalController, ToastController } from '@ionic/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AporteModalComponent } from '../../finanzas/ui/aporte.modal';
import { fechaHora, pesos, ReglaNegocioError } from '../../shared/domain';
import { CLOCK } from '../../shared/infrastructure/clock/clock.token';
import { RegistrarCompra } from '../application/registrar-compra';

import { NuevaCompraModalComponent } from './nueva-compra.modal';

describe('NuevaCompraModalComponent', () => {
  let fixture: ComponentFixture<NuevaCompraModalComponent>;
  let component: NuevaCompraModalComponent;
  let mockRegistrarCompra: {
    registrar: ReturnType<typeof vi.fn>;
    previsualizar: ReturnType<typeof vi.fn>;
  };
  let mockModalCtrl: {
    dismiss: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  let mockToastCtrl: {
    create: ReturnType<typeof vi.fn>;
  };
  let horaSimulada = '2026-11-10 10:00:00';

  beforeEach(async () => {
    horaSimulada = '2026-11-10 10:00:00';
    mockRegistrarCompra = {
      registrar: vi.fn().mockResolvedValue({ idLote: 1, reinversion: pesos(0) }),
      previsualizar: vi.fn().mockResolvedValue({
        costoTotal: pesos(240000),
        costoUnitarioResma: pesos(12000),
        reinversion: pesos(0),
        saldoBolsillo: pesos(300000),
        alcanza: true,
      }),
    };

    mockModalCtrl = {
      dismiss: vi.fn().mockResolvedValue(true),
      create: vi.fn().mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
        onDidDismiss: vi.fn().mockResolvedValue({ data: { guardado: true }, role: 'guardado' }),
      }),
    };

    mockToastCtrl = {
      create: vi.fn().mockResolvedValue({ present: vi.fn() }),
    };

    await TestBed.configureTestingModule({
      imports: [NuevaCompraModalComponent, FormsModule],
      providers: [
        { provide: RegistrarCompra, useValue: mockRegistrarCompra },
        { provide: CLOCK, useValue: { ahora: () => fechaHora(horaSimulada) } },
        { provide: ModalController, useValue: mockModalCtrl },
        { provide: ToastController, useValue: mockToastCtrl },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NuevaCompraModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('initializes with empty cajas and costo, does not call previsualizar, and has Guardar compra disabled', () => {
    expect(component.cajas()).toBeNull();
    expect(component.costoPorCaja()).toBeNull();
    expect(component.fecha()).toBe('2026-11-10');
    expect(mockRegistrarCompra.previsualizar).not.toHaveBeenCalled();

    const botonGuardar = fixture.debugElement.query(By.css('[data-testid="btn-guardar-compra"]'));
    expect(botonGuardar.nativeElement.disabled || botonGuardar.attributes['disabled'] !== undefined).toBe(true);

    const card = fixture.debugElement.query(By.css('ion-card'));
    expect(card).toBeNull();
    expect(fixture.debugElement.query(By.css('[data-testid="error-cajas"]'))).toBeNull();
    expect(fixture.debugElement.query(By.css('[data-testid="error-costo-caja"]'))).toBeNull();
  });

  it('shows CANTIDAD_INVALIDA message when cajas is 0', async () => {
    mockRegistrarCompra.previsualizar.mockRejectedValueOnce(
      new ReglaNegocioError('CANTIDAD_INVALIDA', 'Box count must be greater than zero'),
    );

    component.cajas.set(0);
    component.costoPorCaja.set(120000);
    await component.actualizarPrevisualizacion();
    fixture.detectChanges();

    const errorMsg = fixture.debugElement.query(By.css('[data-testid="error-cajas"]'));
    expect(errorMsg).toBeTruthy();
    expect(errorMsg.nativeElement.textContent).toContain('mayor a cero');

    const botonGuardar = fixture.debugElement.query(By.css('[data-testid="btn-guardar-compra"]'));
    expect(botonGuardar.nativeElement.disabled || botonGuardar.attributes['disabled'] !== undefined).toBe(true);
  });

  it('displays preview of the second call when two previsualizar responses arrive out of order', async () => {
    let resolveCall1!: (value: unknown) => void;
    const promise1 = new Promise((resolve) => {
      resolveCall1 = resolve;
    });

    let resolveCall2!: (value: unknown) => void;
    const promise2 = new Promise((resolve) => {
      resolveCall2 = resolve;
    });

    mockRegistrarCompra.previsualizar.mockReturnValueOnce(promise1).mockReturnValueOnce(promise2);

    // Call 1
    component.cajas.set(1);
    component.costoPorCaja.set(120000);
    const peticion1 = component.actualizarPrevisualizacion();

    // Call 2
    component.cajas.set(2);
    component.costoPorCaja.set(120000);
    const peticion2 = component.actualizarPrevisualizacion();

    // Resolve Call 2 first
    resolveCall2({
      costoTotal: pesos(240000),
      costoUnitarioResma: pesos(12000),
      reinversion: pesos(0),
      saldoBolsillo: pesos(300000),
      alcanza: true,
    });
    await peticion2;
    fixture.detectChanges();

    expect(component.vistaPrevia()?.costoTotal).toBe(pesos(240000));

    // Resolve Call 1 later (out of order)
    resolveCall1({
      costoTotal: pesos(120000),
      costoUnitarioResma: pesos(12000),
      reinversion: pesos(0),
      saldoBolsillo: pesos(300000),
      alcanza: true,
    });
    await peticion1;
    fixture.detectChanges();

    // Still displays Call 2's data
    expect(component.vistaPrevia()?.costoTotal).toBe(pesos(240000));
    const card = fixture.debugElement.query(By.css('ion-card'));
    expect(card.nativeElement.textContent).toContain('240.000');
    expect(card.nativeElement.textContent).not.toContain('120.000');
  });

  it('shows unexpected error note and disables Guardar compra when previsualizar rejects with generic Error', async () => {
    mockRegistrarCompra.previsualizar.mockRejectedValueOnce(new Error('Unexpected database failure'));

    component.cajas.set(2);
    component.costoPorCaja.set(120000);
    await component.actualizarPrevisualizacion();
    fixture.detectChanges();

    const noteInesperado = fixture.debugElement.query(By.css('[data-testid="error-inesperado"]'));
    expect(noteInesperado).toBeTruthy();
    expect(noteInesperado.nativeElement.textContent).toContain('Ocurrió un error inesperado');

    const botonGuardar = fixture.debugElement.query(By.css('[data-testid="btn-guardar-compra"]'));
    expect(botonGuardar.nativeElement.disabled || botonGuardar.attributes['disabled'] !== undefined).toBe(true);
  });

  it('calls registrar with selected date 2026-11-05 and simulated CLOCK time 10:30:00 when saving', async () => {
    horaSimulada = '2026-11-11 10:30:00';
    component.fecha.set('2026-11-05');
    component.cajas.set(2);
    component.costoPorCaja.set(120000);
    await component.actualizarPrevisualizacion();
    fixture.detectChanges();

    await component.guardar();

    expect(mockRegistrarCompra.registrar).toHaveBeenCalledWith({
      tipoPapel: 'CARTA',
      cajas: 2,
      costoPorCaja: 120000,
      fecha: '2026-11-05 10:30:00',
      medio: 'EFECTIVO',
    });
    expect(mockModalCtrl.dismiss).toHaveBeenCalledWith({ idLote: 1, guardado: true }, 'guardado');
  });

  it('shows Elige una fecha and disables Guardar compra when date is empty', async () => {
    component.fecha.set('');
    component.cajas.set(2);
    component.costoPorCaja.set(120000);
    await component.actualizarPrevisualizacion();
    fixture.detectChanges();

    const noteFecha = fixture.debugElement.query(By.css('[data-testid="error-fecha"]'));
    expect(noteFecha).toBeTruthy();
    expect(noteFecha.nativeElement.textContent).toContain('Elige una fecha');

    const botonGuardar = fixture.debugElement.query(By.css('[data-testid="btn-guardar-compra"]'));
    expect(botonGuardar.nativeElement.disabled || botonGuardar.attributes['disabled'] !== undefined).toBe(true);
  });

  it('shows warning ion-note with formatted amount when reinversion > 0 (E3)', async () => {
    mockRegistrarCompra.previsualizar.mockResolvedValueOnce({
      costoTotal: pesos(120000),
      costoUnitarioResma: pesos(12000),
      reinversion: pesos(20000),
      saldoBolsillo: pesos(130000),
      alcanza: true,
    });

    component.tipoPapel.set('OFICIO');
    component.cajas.set(1);
    component.costoPorCaja.set(120000);
    component.medio.set('TRANSFERENCIA');
    await component.actualizarPrevisualizacion();
    fixture.detectChanges();

    const note = fixture.debugElement.query(By.css('[data-testid="aviso-reinversion"]'));
    expect(note).toBeTruthy();
    expect(note.nativeElement.textContent).toContain('20.000');
    expect(note.nativeElement.textContent).toContain('ganancia libre');
  });

  it('does NOT show warning ion-note when reinversion is 0 (E2)', async () => {
    mockRegistrarCompra.previsualizar.mockResolvedValueOnce({
      costoTotal: pesos(240000),
      costoUnitarioResma: pesos(12000),
      reinversion: pesos(0),
      saldoBolsillo: pesos(300000),
      alcanza: true,
    });

    component.tipoPapel.set('CARTA');
    component.cajas.set(2);
    component.costoPorCaja.set(120000);
    component.medio.set('EFECTIVO');
    await component.actualizarPrevisualizacion();
    fixture.detectChanges();

    const note = fixture.debugElement.query(By.css('[data-testid="aviso-reinversion"]'));
    expect(note).toBeNull();
  });

  it('disables Guardar compra button and shows Aportar capital button when alcanza is false (E4)', async () => {
    mockRegistrarCompra.previsualizar.mockResolvedValueOnce({
      costoTotal: pesos(120000),
      costoUnitarioResma: pesos(12000),
      reinversion: pesos(0),
      saldoBolsillo: pesos(50000),
      alcanza: false,
    });

    component.tipoPapel.set('CARTA');
    component.cajas.set(1);
    component.costoPorCaja.set(120000);
    component.medio.set('EFECTIVO');
    await component.actualizarPrevisualizacion();
    fixture.detectChanges();

    const botonGuardar = fixture.debugElement.query(By.css('[data-testid="btn-guardar-compra"]'));
    expect(botonGuardar.nativeElement.disabled || botonGuardar.attributes['disabled'] !== undefined).toBe(true);

    const botonAporte = fixture.debugElement.query(By.css('[data-testid="btn-aportar-capital"]'));
    expect(botonAporte).toBeTruthy();

    const avisoInsuficiente = fixture.debugElement.query(By.css('[data-testid="aviso-saldo-insuficiente"]'));
    expect(avisoInsuficiente).toBeTruthy();
  });

  it('displays validation error next to field when previsualizar throws COSTO_CAJA_INVALIDO without crashing', async () => {
    mockRegistrarCompra.previsualizar.mockRejectedValueOnce(
      new ReglaNegocioError('COSTO_CAJA_INVALIDO', 'Box cost not divisible by 10'),
    );

    component.cajas.set(1);
    component.costoPorCaja.set(120005);
    await component.actualizarPrevisualizacion();
    fixture.detectChanges();

    const errorMsg = fixture.debugElement.query(By.css('[data-testid="error-costo-caja"]'));
    expect(errorMsg).toBeTruthy();
    expect(errorMsg.nativeElement.textContent).toContain('divisible entre 10');

    const botonGuardar = fixture.debugElement.query(By.css('[data-testid="btn-guardar-compra"]'));
    expect(botonGuardar.nativeElement.disabled || botonGuardar.attributes['disabled'] !== undefined).toBe(true);
  });

  it('opens AporteModalComponent when Aportar capital button is clicked and recalculates preview if contribution saved', async () => {
    mockRegistrarCompra.previsualizar.mockResolvedValueOnce({
      costoTotal: pesos(120000),
      costoUnitarioResma: pesos(12000),
      reinversion: pesos(0),
      saldoBolsillo: pesos(0),
      alcanza: false,
    });
    component.cajas.set(1);
    component.costoPorCaja.set(120000);
    await component.actualizarPrevisualizacion();
    fixture.detectChanges();

    const spyPrevisualizar = vi.spyOn(component, 'actualizarPrevisualizacion');

    await component.abrirModalAporte();

    expect(mockModalCtrl.create).toHaveBeenCalledWith(
      expect.objectContaining({
        component: AporteModalComponent,
      }),
    );
    expect(spyPrevisualizar).toHaveBeenCalled();
  });
});
