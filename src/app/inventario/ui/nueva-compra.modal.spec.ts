import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { ModalController, ToastController } from '@ionic/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AporteModalComponent } from '../../finanzas/ui/aporte.modal';
import { fechaHora, pesos, ReglaNegocioError, type Pesos } from '../../shared/domain';
import { CLOCK } from '../../shared/infrastructure/clock/clock.token';
import { MENSAJES_ERROR } from '../../shared/ui/mensajes-error';
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

  it('records the purchase only once and disables Guardar compra while a save is in flight', async () => {
    let resolverRegistro: (valor: { idLote: number; reinversion: Pesos }) => void = () => undefined;
    mockRegistrarCompra.registrar.mockReturnValueOnce(
      new Promise((resolve) => {
        resolverRegistro = resolve;
      }),
    );
    component.fecha.set('2026-11-05');
    component.cajas.set(2);
    component.costoPorCaja.set(120000);
    await component.actualizarPrevisualizacion();

    const primerGuardado = component.guardar();
    const segundoGuardado = component.guardar();
    fixture.detectChanges();

    const botonGuardar = fixture.debugElement.query(By.css('[data-testid="btn-guardar-compra"]'));
    expect(botonGuardar.nativeElement.disabled || botonGuardar.attributes['disabled'] !== undefined).toBe(true);

    resolverRegistro({ idLote: 1, reinversion: pesos(0) });
    await Promise.all([primerGuardado, segundoGuardado]);

    expect(mockRegistrarCompra.registrar).toHaveBeenCalledTimes(1);
    expect(mockModalCtrl.dismiss).toHaveBeenCalledTimes(1);
  });

  it('enables Guardar compra again after a failed save', async () => {
    mockRegistrarCompra.registrar.mockRejectedValueOnce(new Error('write failed'));
    component.fecha.set('2026-11-05');
    component.cajas.set(2);
    component.costoPorCaja.set(120000);
    await component.actualizarPrevisualizacion();

    await component.guardar();

    expect(mockToastCtrl.create).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Ocurrió un error inesperado',
      }),
    );
    expect(component.puedeGuardar()).toBe(true);
  });

  it('disables Guardar compra while previsualizar is in flight, and an old response arriving after vigente does not reactivate button or change preview', async () => {
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
    fixture.detectChanges();

    // While Call 2 is pending, calculando is true and Guardar compra is disabled
    expect(component.calculando()).toBe(true);
    expect(component.puedeGuardar()).toBe(false);

    // Resolve Call 2 with alcanza: false
    resolveCall2({
      costoTotal: pesos(240000),
      costoUnitarioResma: pesos(12000),
      reinversion: pesos(0),
      saldoBolsillo: pesos(100000),
      alcanza: false,
    });
    await peticion2;
    fixture.detectChanges();

    expect(component.calculando()).toBe(false);
    expect(component.puedeGuardar()).toBe(false);
    expect(component.vistaPrevia()?.costoTotal).toBe(pesos(240000));

    // Resolve Call 1 later with alcanza: true (old response arriving after vigente)
    resolveCall1({
      costoTotal: pesos(120000),
      costoUnitarioResma: pesos(12000),
      reinversion: pesos(0),
      saldoBolsillo: pesos(100000),
      alcanza: true,
    });
    await peticion1;
    fixture.detectChanges();

    // Button must NOT be reactivated and preview must NOT be replaced by old response
    expect(component.puedeGuardar()).toBe(false);
    expect(component.vistaPrevia()?.costoTotal).toBe(pesos(240000));
  });

  it('an old response arriving while a newer call is in flight does not turn off calculando', async () => {
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
    fixture.detectChanges();

    // Resolve Call 1 while Call 2 is still pending
    resolveCall1({
      costoTotal: pesos(120000),
      costoUnitarioResma: pesos(12000),
      reinversion: pesos(0),
      saldoBolsillo: pesos(200000),
      alcanza: true,
    });
    await peticion1;
    fixture.detectChanges();

    // calculando MUST still be true because Call 2 is still in flight
    expect(component.calculando()).toBe(true);
    expect(component.puedeGuardar()).toBe(false);

    // Now resolve Call 2
    resolveCall2({
      costoTotal: pesos(240000),
      costoUnitarioResma: pesos(12000),
      reinversion: pesos(0),
      saldoBolsillo: pesos(300000),
      alcanza: true,
    });
    await peticion2;
    fixture.detectChanges();

    expect(component.calculando()).toBe(false);
    expect(component.puedeGuardar()).toBe(true);
  });

  it('disables Cancelar button, form fields and Aportar capital button while save is in flight, blocks cancelar(), and re-enables all after error', async () => {
    let rejectRegistro!: (error: unknown) => void;
    mockRegistrarCompra.registrar.mockReturnValueOnce(
      new Promise((_, reject) => {
        rejectRegistro = reject;
      }),
    );

    component.fecha.set('2026-11-05');
    component.cajas.set(2);
    component.costoPorCaja.set(120000);
    await component.actualizarPrevisualizacion();
    fixture.detectChanges();

    const guardarPromise = component.guardar();
    fixture.detectChanges();

    // While save is in flight:
    // 1. Cancel button is disabled
    const btnCancelar = fixture.debugElement.query(By.css('[data-testid="btn-cancelar"]'));
    expect(btnCancelar.nativeElement.disabled || btnCancelar.attributes['disabled'] !== undefined).toBe(true);

    // 2. Form fields are disabled
    const selectTipo = fixture.debugElement.query(By.css('[data-testid="select-tipo-papel"]'));
    expect(selectTipo.nativeElement.disabled || selectTipo.attributes['disabled'] !== undefined).toBe(true);

    const inputFecha = fixture.debugElement.query(By.css('[data-testid="input-fecha"]'));
    expect(inputFecha.nativeElement.disabled || inputFecha.attributes['disabled'] !== undefined).toBe(true);

    const inputCajas = fixture.debugElement.query(By.css('[data-testid="input-cajas"]'));
    expect(inputCajas.nativeElement.disabled || inputCajas.attributes['disabled'] !== undefined).toBe(true);

    const inputCosto = fixture.debugElement.query(By.css('[data-testid="input-costo-caja"]'));
    expect(inputCosto.nativeElement.disabled || inputCosto.attributes['disabled'] !== undefined).toBe(true);

    const selectMedio = fixture.debugElement.query(By.css('[data-testid="select-medio"]'));
    expect(selectMedio.nativeElement.disabled || selectMedio.attributes['disabled'] !== undefined).toBe(true);

    // 3. Calling cancelar() does nothing (does not dismiss)
    await component.cancelar();
    expect(mockModalCtrl.dismiss).not.toHaveBeenCalled();

    // 4. Reject with error
    rejectRegistro(new Error('fail'));
    await guardarPromise;
    fixture.detectChanges();

    // 5. After error, everything is enabled again
    expect(btnCancelar.nativeElement.disabled || btnCancelar.attributes['disabled'] !== undefined).toBe(false);
    expect(selectTipo.nativeElement.disabled || selectTipo.attributes['disabled'] !== undefined).toBe(false);
    expect(inputFecha.nativeElement.disabled || inputFecha.attributes['disabled'] !== undefined).toBe(false);
    expect(inputCajas.nativeElement.disabled || inputCajas.attributes['disabled'] !== undefined).toBe(false);
    expect(inputCosto.nativeElement.disabled || inputCosto.attributes['disabled'] !== undefined).toBe(false);
    expect(selectMedio.nativeElement.disabled || selectMedio.attributes['disabled'] !== undefined).toBe(false);
    expect(component.puedeGuardar()).toBe(true);
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

  it('disables Aportar capital button while save is in flight and blocks abrirModalAporte()', async () => {
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

    component.guardando.set(true);
    fixture.detectChanges();

    const btnAporte = fixture.debugElement.query(By.css('[data-testid="btn-aportar-capital"]'));
    expect(btnAporte.nativeElement.disabled || btnAporte.attributes['disabled'] !== undefined).toBe(true);

    await component.abrirModalAporte();
    expect(mockModalCtrl.create).not.toHaveBeenCalled();

    component.guardando.set(false);
    fixture.detectChanges();
    expect(btnAporte.nativeElement.disabled || btnAporte.attributes['disabled'] !== undefined).toBe(false);
  });

  it('formats "120000" as "$ 120.000" in costoPorCaja field, saves 120000, and keeps Guardar compra disabled when empty (E21)', async () => {
    const campoPesos = fixture.debugElement.query(By.css('app-campo-pesos[data-testid="input-costo-caja"]'));
    expect(campoPesos).toBeTruthy();

    const ionInput = campoPesos.query(By.css('ion-input'));
    ionInput.nativeElement.value = '120000';
    ionInput.triggerEventHandler('ionInput', {
      detail: { value: '120000' },
      target: ionInput.nativeElement,
    });
    fixture.detectChanges();

    expect(ionInput.nativeElement.value).toBe('$ 120.000');
    expect(component.costoPorCaja()).toBe(120000);

    component.cajas.set(2);
    await component.actualizarPrevisualizacion();
    fixture.detectChanges();

    await component.guardar();
    expect(mockRegistrarCompra.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        costoPorCaja: 120000,
      }),
    );

    ionInput.nativeElement.value = '';
    ionInput.triggerEventHandler('ionInput', {
      detail: { value: '' },
      target: ionInput.nativeElement,
    });
    fixture.detectChanges();

    expect(component.costoPorCaja()).toBeNull();
    const botonGuardar = fixture.debugElement.query(By.css('[data-testid="btn-guardar-compra"]'));
    expect(botonGuardar.nativeElement.disabled || botonGuardar.attributes['disabled'] !== undefined).toBe(true);
  });

  it('disables Guardar compra and does not call registrar when costoPorCaja has "3800,50" (R1)', async () => {
    component.cajas.set(2);
    fixture.detectChanges();

    const campoPesos = fixture.debugElement.query(By.css('app-campo-pesos[data-testid="input-costo-caja"]'));
    const ionInput = campoPesos.query(By.css('ion-input'));
    ionInput.nativeElement.value = '3800,50';
    ionInput.triggerEventHandler('ionInput', {
      detail: { value: '3800,50' },
      target: ionInput.nativeElement,
    });
    fixture.detectChanges();

    expect(component.costoPorCaja()).toBeNull();
    const botonGuardar = fixture.debugElement.query(By.css('[data-testid="btn-guardar-compra"]'));
    expect(botonGuardar.nativeElement.disabled || botonGuardar.attributes['disabled'] !== undefined).toBe(true);

    await component.guardar();
    expect(mockRegistrarCompra.registrar).not.toHaveBeenCalled();
  });

  it('shows FECHA_FUTURA message next to date and disables Guardar compra when date is future, and enables with today (E3)', async () => {
    component.cajas.set(2);
    component.costoPorCaja.set(120000);
    await component.actualizarPrevisualizacion();
    component.fecha.set('2026-11-11');
    fixture.detectChanges();

    const errorFecha = fixture.debugElement.query(By.css('[data-testid="error-fecha"]'));
    expect(errorFecha).toBeTruthy();
    expect(errorFecha.nativeElement.textContent).toContain('La fecha no puede ser futura');

    const botonGuardar = fixture.debugElement.query(By.css('[data-testid="btn-guardar-compra"]'));
    expect(botonGuardar.nativeElement.disabled || botonGuardar.attributes['disabled'] !== undefined).toBe(true);

    await component.guardar();
    expect(mockRegistrarCompra.registrar).not.toHaveBeenCalled();

    component.fecha.set('2026-11-10');
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="error-fecha"]'))).toBeNull();
    expect(botonGuardar.nativeElement.disabled).toBe(false);
  });

  it('opens date sheet with refreshed maxFecha from CLOCK, updates date and time on selection, and closes sheet (D5, E7)', () => {
    expect(component.selectorFechaAbierto()).toBe(false);
    expect(component.maxFecha()).toBe(fechaHora('2026-11-10 10:00:00'));

    horaSimulada = '2026-11-10 15:45:00';
    component.abrirSelectorFecha();
    fixture.detectChanges();

    expect(component.selectorFechaAbierto()).toBe(true);
    expect(component.maxFecha()).toBe(fechaHora('2026-11-10 15:45:00'));
    expect(fixture.debugElement.query(By.css('[data-testid="modal-fecha-compra"]'))).toBeTruthy();

    component.onFechaSeleccionada(fechaHora('2026-11-08 14:25:00'));
    fixture.detectChanges();

    expect(component.fecha()).toBe('2026-11-08');
    expect(component.horaSeleccionada()).toBe('14:25:00');
    expect(component.fechaHoraParaHoja()).toBe(fechaHora('2026-11-08 14:25:00'));

    component.cerrarSelectorFecha();
    fixture.detectChanges();

    expect(component.selectorFechaAbierto()).toBe(false);
  });

  it('disables Guardar compra with exact FECHA_FUTURA text when selecting a later time on the same day as CLOCK', async () => {
    component.cajas.set(2);
    component.costoPorCaja.set(120000);
    await component.actualizarPrevisualizacion();
    component.onFechaSeleccionada(fechaHora('2026-11-10 10:00:01'));
    fixture.detectChanges();

    const errorFecha = fixture.debugElement.query(By.css('[data-testid="error-fecha"]'));
    expect(errorFecha).toBeTruthy();
    expect(errorFecha.nativeElement.textContent.trim()).toBe(MENSAJES_ERROR.FECHA_FUTURA);

    const botonGuardar = fixture.debugElement.query(By.css('[data-testid="btn-guardar-compra"]'));
    expect(botonGuardar.nativeElement.disabled || botonGuardar.attributes['disabled'] !== undefined).toBe(true);
    expect(component.puedeGuardar()).toBe(false);

    await component.guardar();
    expect(mockRegistrarCompra.registrar).not.toHaveBeenCalled();
  });

  it('passes date and time selected via date sheet unchanged to registrar when saving', async () => {
    component.onFechaSeleccionada(fechaHora('2026-11-08 14:25:30'));
    component.cajas.set(2);
    component.costoPorCaja.set(120000);
    await component.actualizarPrevisualizacion();
    fixture.detectChanges();

    await component.guardar();

    expect(mockRegistrarCompra.registrar).toHaveBeenCalledWith({
      tipoPapel: 'CARTA',
      cajas: 2,
      costoPorCaja: 120000,
      fecha: fechaHora('2026-11-08 14:25:30'),
      medio: 'EFECTIVO',
    });
    expect(mockModalCtrl.dismiss).toHaveBeenCalledWith({ idLote: 1, guardado: true }, 'guardado');
  });
});
