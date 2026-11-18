import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { ModalController } from '@ionic/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AporteModalComponent } from '../../finanzas/ui/aporte.modal';
import { cajas, fechaHora, pesos, resmas } from '../../shared/domain';
import { soloCierreExplicito } from '../../shared/ui/formulario';
import { ConsultarInventario } from '../application/consultar-inventario';
import type { Lote } from '../domain/lote';

import { InventarioPage } from './inventario.page';
import { NuevaCompraModalComponent } from './nueva-compra.modal';

describe('InventarioPage', () => {
  let fixture: ComponentFixture<InventarioPage>;
  let component: InventarioPage;
  let mockConsultarInventario: { activos: ReturnType<typeof vi.fn> };
  let mockModalCtrl: { create: ReturnType<typeof vi.fn> };

  const loteCartaE8: Lote = {
    idLote: 1,
    tipoPapel: 'CARTA',
    fechaCompra: fechaHora('2026-11-10 10:00:00'),
    cantidadCajas: cajas(2),
    costoPorCaja: pesos(120000),
    costoUnitarioResma: pesos(12000),
    resmasIniciales: resmas(20),
    resmasDisponibles: resmas(20),
    medioPagoCompra: 'EFECTIVO',
    estado: 'ACTIVO',
  };

  const loteOficioE8: Lote = {
    idLote: 2,
    tipoPapel: 'OFICIO',
    fechaCompra: fechaHora('2026-11-10 11:00:00'),
    cantidadCajas: cajas(1),
    costoPorCaja: pesos(130000),
    costoUnitarioResma: pesos(13000),
    resmasIniciales: resmas(10),
    resmasDisponibles: resmas(7),
    medioPagoCompra: 'TRANSFERENCIA',
    estado: 'ACTIVO',
  };

  beforeEach(async () => {
    mockConsultarInventario = {
      activos: vi.fn().mockResolvedValue({
        CARTA: [loteCartaE8],
        OFICIO: [loteOficioE8],
      }),
    };

    mockModalCtrl = {
      create: vi.fn().mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
        onDidDismiss: vi.fn().mockResolvedValue({ data: { guardado: true }, role: 'guardado' }),
      }),
    };

    await TestBed.configureTestingModule({
      imports: [InventarioPage, FormsModule],
      providers: [
        { provide: ConsultarInventario, useValue: mockConsultarInventario },
        { provide: ModalController, useValue: mockModalCtrl },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InventarioPage);
    component = fixture.componentInstance;
  });

  it('displays 1 card in Carta and 1 card in Oficio with correct details and 0.7 progress bar (E8)', async () => {
    await component.cargarLotes();
    fixture.detectChanges();

    // Default segment is CARTA
    expect(component.tipoSeleccionado()).toBe('CARTA');
    let tarjetas = fixture.debugElement.queryAll(By.css('[data-testid="tarjeta-lote"]'));
    expect(tarjetas).toHaveLength(1);
    expect(tarjetas[0].nativeElement.textContent).toContain('20 de 20 resmas');
    expect(tarjetas[0].nativeElement.textContent).toContain('$ 12.000');

    // Switch to OFICIO
    component.tipoSeleccionado.set('OFICIO');
    fixture.detectChanges();

    tarjetas = fixture.debugElement.queryAll(By.css('[data-testid="tarjeta-lote"]'));
    expect(tarjetas).toHaveLength(1);
    expect(tarjetas[0].nativeElement.textContent).toContain('7 de 10 resmas');
    expect(tarjetas[0].nativeElement.textContent).toContain('$ 13.000');

    const progressBar = tarjetas[0].query(By.css('ion-progress-bar'));
    expect(progressBar).toBeTruthy();
    expect(Number(progressBar.nativeElement.value ?? progressBar.attributes['ng-reflect-value'])).toBeCloseTo(0.7, 5);
  });

  it('displays empty state message when there are no active lots for the selected paper type', async () => {
    mockConsultarInventario.activos.mockResolvedValueOnce({
      CARTA: [],
      OFICIO: [],
    });

    await component.cargarLotes();
    fixture.detectChanges();

    const emptyMessage = fixture.debugElement.query(By.css('[data-testid="mensaje-vacio"]'));
    expect(emptyMessage).toBeTruthy();
    expect(emptyMessage.nativeElement.textContent).toContain('primera compra');

    const tarjetas = fixture.debugElement.queryAll(By.css('[data-testid="tarjeta-lote"]'));
    expect(tarjetas).toHaveLength(0);
  });

  it('opens NuevaCompraModal from fab action and reloads lots when saved', async () => {
    const spyCargar = vi.spyOn(component, 'cargarLotes');

    await component.abrirModalNuevaCompra();

    expect(mockModalCtrl.create).toHaveBeenCalledWith(
      expect.objectContaining({
        component: NuevaCompraModalComponent,
      }),
    );
    expect(spyCargar).toHaveBeenCalled();
  });

  it('opens AporteModal from fab action and reloads lots when saved', async () => {
    const spyCargar = vi.spyOn(component, 'cargarLotes');

    await component.abrirModalAporte();

    expect(mockModalCtrl.create).toHaveBeenCalledWith(
      expect.objectContaining({
        component: AporteModalComponent,
      }),
    );
    expect(spyCargar).toHaveBeenCalled();
  });

  it('displays error message and Reintentar button without empty state when activos rejects, and shows lots on retry', async () => {
    mockConsultarInventario.activos.mockRejectedValueOnce(new Error('Network failure'));

    await component.cargarLotes();
    fixture.detectChanges();

    expect(component.errorCarga()).toBe('Ocurrió un error inesperado');

    const mensajeError = fixture.debugElement.query(By.css('[data-testid="mensaje-error-carga"]'));
    expect(mensajeError).toBeTruthy();
    expect(mensajeError.nativeElement.textContent).toContain('Ocurrió un error inesperado');

    const btnReintentar = fixture.debugElement.query(By.css('[data-testid="btn-reintentar"]'));
    expect(btnReintentar).toBeTruthy();

    const emptyState = fixture.debugElement.query(By.css('[data-testid="mensaje-vacio"]'));
    expect(emptyState).toBeNull();

    // Retry with successful resolution
    mockConsultarInventario.activos.mockResolvedValueOnce({
      CARTA: [loteCartaE8],
      OFICIO: [],
    });

    btnReintentar.nativeElement.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.errorCarga()).toBeNull();
    const tarjetas = fixture.debugElement.queryAll(By.css('[data-testid="tarjeta-lote"]'));
    expect(tarjetas).toHaveLength(1);
    expect(fixture.debugElement.query(By.css('[data-testid="mensaje-error-carga"]'))).toBeNull();
  });

  it('calls activos exactly once on first entry via ionViewWillEnter and does not implement ngOnInit', async () => {
    expect((component as unknown as { ngOnInit?: unknown }).ngOnInit).toBeUndefined();

    await component.ionViewWillEnter();

    expect(mockConsultarInventario.activos).toHaveBeenCalledTimes(1);
  });

  it('displays lots from the second call when two overlapping calls have the first resolving last, and cargando stays true until second resolves', async () => {
    let resolveCall1!: (value: { CARTA: Lote[]; OFICIO: Lote[] }) => void;
    const promise1 = new Promise<{ CARTA: Lote[]; OFICIO: Lote[] }>((resolve) => {
      resolveCall1 = resolve;
    });

    let resolveCall2!: (value: { CARTA: Lote[]; OFICIO: Lote[] }) => void;
    const promise2 = new Promise<{ CARTA: Lote[]; OFICIO: Lote[] }>((resolve) => {
      resolveCall2 = resolve;
    });

    mockConsultarInventario.activos.mockReturnValueOnce(promise1).mockReturnValueOnce(promise2);

    const call1 = component.cargarLotes();
    const call2 = component.cargarLotes();

    expect(component.cargando()).toBe(true);

    const lotesCall2 = {
      CARTA: [loteCartaE8],
      OFICIO: [],
    };
    resolveCall2(lotesCall2);
    await call2;
    fixture.detectChanges();

    expect(component.cargando()).toBe(false);
    expect(component.lotes()).toEqual(lotesCall2);

    const lotesCall1 = {
      CARTA: [],
      OFICIO: [loteOficioE8],
    };
    resolveCall1(lotesCall1);
    await call1;
    fixture.detectChanges();

    // First call resolving last must not overwrite the second call's data or flip cargando
    expect(component.cargando()).toBe(false);
    expect(component.lotes()).toEqual(lotesCall2);
  });

  it('does not turn off cargando when a stale call resolves while a newer call is still pending', async () => {
    let resolveCall1!: (value: { CARTA: Lote[]; OFICIO: Lote[] }) => void;
    const promise1 = new Promise<{ CARTA: Lote[]; OFICIO: Lote[] }>((resolve) => {
      resolveCall1 = resolve;
    });

    let resolveCall2!: (value: { CARTA: Lote[]; OFICIO: Lote[] }) => void;
    const promise2 = new Promise<{ CARTA: Lote[]; OFICIO: Lote[] }>((resolve) => {
      resolveCall2 = resolve;
    });

    mockConsultarInventario.activos.mockReturnValueOnce(promise1).mockReturnValueOnce(promise2);

    const call1 = component.cargarLotes();
    const call2 = component.cargarLotes();

    resolveCall1({ CARTA: [], OFICIO: [loteOficioE8] });
    await call1;

    expect(component.cargando()).toBe(true);

    const lotesCall2 = { CARTA: [loteCartaE8], OFICIO: [] };
    resolveCall2(lotesCall2);
    await call2;

    expect(component.cargando()).toBe(false);
    expect(component.lotes()).toEqual(lotesCall2);
  });

  it('does not show error state when an older call rejects after a newer successful call has resolved', async () => {
    let rejectCall1!: (reason: unknown) => void;
    const promise1 = new Promise<{ CARTA: Lote[]; OFICIO: Lote[] }>((_, reject) => {
      rejectCall1 = reject;
    });

    let resolveCall2!: (value: { CARTA: Lote[]; OFICIO: Lote[] }) => void;
    const promise2 = new Promise<{ CARTA: Lote[]; OFICIO: Lote[] }>((resolve) => {
      resolveCall2 = resolve;
    });

    mockConsultarInventario.activos.mockReturnValueOnce(promise1).mockReturnValueOnce(promise2);

    const call1 = component.cargarLotes();
    const call2 = component.cargarLotes();

    const lotesCall2 = {
      CARTA: [loteCartaE8],
      OFICIO: [],
    };
    resolveCall2(lotesCall2);
    await call2;
    fixture.detectChanges();

    expect(component.errorCarga()).toBeNull();
    expect(component.lotes()).toEqual(lotesCall2);

    rejectCall1(new Error('Stale network failure'));
    await call1;
    fixture.detectChanges();

    expect(component.errorCarga()).toBeNull();
    expect(component.lotes()).toEqual(lotesCall2);
    expect(fixture.debugElement.query(By.css('[data-testid="mensaje-error-carga"]'))).toBeNull();
  });

  it('shows progress bar and disables Reintentar while loading, and after an error cargando is false and Reintentar is enabled', async () => {
    mockConsultarInventario.activos.mockRejectedValueOnce(new Error('Initial failure'));

    await component.cargarLotes();
    fixture.detectChanges();

    expect(component.errorCarga()).toBe('Ocurrió un error inesperado');
    expect(component.cargando()).toBe(false);

    let btnReintentar = fixture.debugElement.query(By.css('[data-testid="btn-reintentar"]'));
    expect(btnReintentar).toBeTruthy();
    expect(btnReintentar.nativeElement.disabled).toBe(false);

    let rejectRetry!: (reason: unknown) => void;
    const promiseRetry = new Promise<{ CARTA: Lote[]; OFICIO: Lote[] }>((_, reject) => {
      rejectRetry = reject;
    });
    mockConsultarInventario.activos.mockReturnValueOnce(promiseRetry);

    const pRetry = component.cargarLotes();
    fixture.detectChanges();

    expect(component.cargando()).toBe(true);
    const indicadorCarga = fixture.debugElement.query(By.css('[data-testid="indicador-carga"]'));
    expect(indicadorCarga).toBeTruthy();

    btnReintentar = fixture.debugElement.query(By.css('[data-testid="btn-reintentar"]'));
    expect(btnReintentar).toBeTruthy();
    expect(btnReintentar.nativeElement.disabled || btnReintentar.attributes['disabled'] !== undefined).toBe(true);

    rejectRetry(new Error('Second failure'));
    await pRetry;
    fixture.detectChanges();

    expect(component.cargando()).toBe(false);
    btnReintentar = fixture.debugElement.query(By.css('[data-testid="btn-reintentar"]'));
    expect(btnReintentar).toBeTruthy();
    // Check disabled property
    expect(btnReintentar.nativeElement.disabled).toBe(false);
  });

  it('configures soloCierreExplicito as canDismiss when opening modals', async () => {
    await component.abrirModalNuevaCompra();
    expect(mockModalCtrl.create).toHaveBeenCalledWith(
      expect.objectContaining({
        component: NuevaCompraModalComponent,
        canDismiss: soloCierreExplicito,
      }),
    );

    await component.abrirModalAporte();
    expect(mockModalCtrl.create).toHaveBeenCalledWith(
      expect.objectContaining({
        component: AporteModalComponent,
        canDismiss: soloCierreExplicito,
      }),
    );
  });

  it('calculates and renders segment badges, summary totals, integer stock values, and progress percentages across multiple Carta and Oficio lots including a depleted lot and zero initial reams edge case', async () => {
    const carta1: Lote = {
      idLote: 10,
      tipoPapel: 'CARTA',
      fechaCompra: fechaHora('2026-11-08 09:00:00'),
      cantidadCajas: cajas(2),
      costoPorCaja: pesos(120000),
      costoUnitarioResma: pesos(12000),
      resmasIniciales: resmas(20),
      resmasDisponibles: resmas(20),
      medioPagoCompra: 'EFECTIVO',
      estado: 'ACTIVO',
    };
    const carta2: Lote = {
      idLote: 11,
      tipoPapel: 'CARTA',
      fechaCompra: fechaHora('2026-11-09 10:00:00'),
      cantidadCajas: cajas(2),
      costoPorCaja: pesos(150000),
      costoUnitarioResma: pesos(15000),
      resmasIniciales: resmas(20),
      resmasDisponibles: resmas(7),
      medioPagoCompra: 'TRANSFERENCIA',
      estado: 'ACTIVO',
    };
    const cartaAgotado: Lote = {
      idLote: 12,
      tipoPapel: 'CARTA',
      fechaCompra: fechaHora('2026-11-07 08:00:00'),
      cantidadCajas: cajas(1),
      costoPorCaja: pesos(110000),
      costoUnitarioResma: pesos(11000),
      resmasIniciales: resmas(10),
      resmasDisponibles: resmas(0),
      medioPagoCompra: 'EFECTIVO',
      estado: 'AGOTADO',
    };
    const oficio1: Lote = {
      idLote: 20,
      tipoPapel: 'OFICIO',
      fechaCompra: fechaHora('2026-11-10 11:00:00'),
      cantidadCajas: cajas(1),
      costoPorCaja: pesos(130000),
      costoUnitarioResma: pesos(13000),
      resmasIniciales: resmas(10),
      resmasDisponibles: resmas(7),
      medioPagoCompra: 'TRANSFERENCIA',
      estado: 'ACTIVO',
    };
    const oficio2: Lote = {
      idLote: 21,
      tipoPapel: 'OFICIO',
      fechaCompra: fechaHora('2026-11-11 12:00:00'),
      cantidadCajas: cajas(3),
      costoPorCaja: pesos(140000),
      costoUnitarioResma: pesos(14000),
      resmasIniciales: resmas(30),
      resmasDisponibles: resmas(10),
      medioPagoCompra: 'EFECTIVO',
      estado: 'ACTIVO',
    };

    mockConsultarInventario.activos.mockResolvedValueOnce({
      CARTA: [carta1, carta2, cartaAgotado],
      OFICIO: [oficio1, oficio2],
    });

    await component.cargarLotes();
    fixture.detectChanges();

    // Segment badges (both tabs always visible)
    expect(component.totalResmasCarta()).toBe(27);
    expect(component.totalResmasOficio()).toBe(17);
    expect(
      fixture.debugElement
        .query(By.css('[data-testid="segment-carta"] .conteo-badge'))
        .nativeElement.textContent.trim(),
    ).toBe('27');
    expect(
      fixture.debugElement
        .query(By.css('[data-testid="segment-oficio"] .conteo-badge'))
        .nativeElement.textContent.trim(),
    ).toBe('17');

    // Carta tab signals and summary DOM
    expect(component.tipoSeleccionado()).toBe('CARTA');
    expect(component.totalResmasVisibles()).toBe(27);
    expect(component.valorCostoVisible()).toBe(pesos(345000));
    expect(Number.isInteger(component.valorCostoVisible())).toBe(true);

    let resumen = fixture.debugElement.query(By.css('.resumen-papel'));
    expect(resumen.nativeElement.textContent).toContain('Papel Carta disponible');
    expect(resumen.query(By.css('.resumen-numero')).nativeElement.textContent.trim()).toBe('27');
    let resumenCeldas = resumen.queryAll(By.css('.resumen-grid .total-celda .seccion-titulo'));
    expect(resumenCeldas).toHaveLength(2);
    expect(resumenCeldas[0].nativeElement.textContent.trim()).toBe('$ 345.000');
    expect(resumenCeldas[1].nativeElement.textContent.trim()).toBe('3');

    // Carta lot calculations and cards (first, second, depleted last)
    expect(component.porcentajeDisponible(carta1)).toBe(100);
    expect(component.porcentajeDisponible(carta2)).toBe(35);
    expect(component.porcentajeDisponible(cartaAgotado)).toBe(0);
    expect(component.valorEnStock(carta1)).toBe(pesos(240000));
    expect(component.valorEnStock(carta2)).toBe(pesos(105000));
    expect(component.valorEnStock(cartaAgotado)).toBe(pesos(0));
    expect(Number.isInteger(component.valorEnStock(carta1))).toBe(true);
    expect(Number.isInteger(component.valorEnStock(carta2))).toBe(true);
    expect(Number.isInteger(component.valorEnStock(cartaAgotado))).toBe(true);

    let tarjetas = fixture.debugElement.queryAll(By.css('[data-testid="tarjeta-lote"]'));
    expect(tarjetas).toHaveLength(3);

    const esperadosCarta = [
      { porcentaje: '100 % disponible', valor: 'Valor en stock $ 240.000', progreso: 1 },
      { porcentaje: '35 % disponible', valor: 'Valor en stock $ 105.000', progreso: 0.35 },
      { porcentaje: '0 % disponible', valor: 'Valor en stock $ 0', progreso: 0 },
    ];
    tarjetas.forEach((tarjeta, index) => {
      const esperado = esperadosCarta[index];
      expect(tarjeta.nativeElement.textContent).toContain(esperado.porcentaje);
      expect(tarjeta.query(By.css('.linea-total-dato')).nativeElement.textContent.trim()).toBe(esperado.valor);
      const barra = tarjeta.query(By.css('[data-testid="progreso-lote"]'));
      expect(Number(barra.nativeElement.value ?? barra.attributes['ng-reflect-value'])).toBeCloseTo(
        esperado.progreso,
        5,
      );
    });

    // Edge case: 0 initial reams must return 0 instead of NaN
    const loteSinIniciales: Lote = {
      ...cartaAgotado,
      idLote: 99,
      resmasIniciales: resmas(0),
      resmasDisponibles: resmas(0),
    };
    expect(component.porcentajeDisponible(loteSinIniciales)).toBe(0);
    expect(Number.isInteger(component.porcentajeDisponible(loteSinIniciales))).toBe(true);

    // Switch to Oficio tab and verify totals + both cards
    component.onSegmentChange(new CustomEvent('ionChange', { detail: { value: 'OFICIO' } }));
    fixture.detectChanges();

    expect(component.tipoSeleccionado()).toBe('OFICIO');
    expect(component.totalResmasVisibles()).toBe(17);
    expect(component.valorCostoVisible()).toBe(pesos(231000));
    expect(Number.isInteger(component.valorCostoVisible())).toBe(true);

    resumen = fixture.debugElement.query(By.css('.resumen-papel'));
    expect(resumen.nativeElement.textContent).toContain('Papel Oficio disponible');
    expect(resumen.query(By.css('.resumen-numero')).nativeElement.textContent.trim()).toBe('17');
    resumenCeldas = resumen.queryAll(By.css('.resumen-grid .total-celda .seccion-titulo'));
    expect(resumenCeldas[0].nativeElement.textContent.trim()).toBe('$ 231.000');
    expect(resumenCeldas[1].nativeElement.textContent.trim()).toBe('2');

    expect(component.porcentajeDisponible(oficio1)).toBe(70);
    expect(component.porcentajeDisponible(oficio2)).toBe(33);
    expect(component.valorEnStock(oficio1)).toBe(pesos(91000));
    expect(component.valorEnStock(oficio2)).toBe(pesos(140000));
    expect(Number.isInteger(component.valorEnStock(oficio1))).toBe(true);
    expect(Number.isInteger(component.valorEnStock(oficio2))).toBe(true);

    tarjetas = fixture.debugElement.queryAll(By.css('[data-testid="tarjeta-lote"]'));
    expect(tarjetas).toHaveLength(2);

    const esperadosOficio = [
      { porcentaje: '70 % disponible', valor: 'Valor en stock $ 91.000', progreso: 0.7 },
      { porcentaje: '33 % disponible', valor: 'Valor en stock $ 140.000', progreso: 1 / 3 },
    ];
    tarjetas.forEach((tarjeta, index) => {
      const esperado = esperadosOficio[index];
      expect(tarjeta.nativeElement.textContent).toContain(esperado.porcentaje);
      expect(tarjeta.query(By.css('.linea-total-dato')).nativeElement.textContent.trim()).toBe(esperado.valor);
      const barra = tarjeta.query(By.css('[data-testid="progreso-lote"]'));
      expect(Number(barra.nativeElement.value ?? barra.attributes['ng-reflect-value'])).toBeCloseTo(
        esperado.progreso,
        5,
      );
    });
  });

  it('renders 0 badges, 0 resmas, $ 0 cost, 0 active lots, and empty message when there are zero lots', async () => {
    mockConsultarInventario.activos.mockResolvedValueOnce({
      CARTA: [],
      OFICIO: [],
    });

    await component.cargarLotes();
    fixture.detectChanges();

    expect(component.totalResmasCarta()).toBe(0);
    expect(component.totalResmasOficio()).toBe(0);
    expect(component.totalResmasVisibles()).toBe(0);
    expect(component.valorCostoVisible()).toBe(pesos(0));

    expect(
      fixture.debugElement
        .query(By.css('[data-testid="segment-carta"] .conteo-badge'))
        .nativeElement.textContent.trim(),
    ).toBe('0');
    expect(
      fixture.debugElement
        .query(By.css('[data-testid="segment-oficio"] .conteo-badge'))
        .nativeElement.textContent.trim(),
    ).toBe('0');

    let resumen = fixture.debugElement.query(By.css('.resumen-papel'));
    expect(resumen.query(By.css('.resumen-numero')).nativeElement.textContent.trim()).toBe('0');
    expect(resumen.query(By.css('.resumen-unidad')).nativeElement.textContent.trim()).toBe('resmas');
    let resumenCeldas = resumen.queryAll(By.css('.resumen-grid .total-celda .seccion-titulo'));
    expect(resumenCeldas[0].nativeElement.textContent.trim()).toBe('$ 0');
    expect(resumenCeldas[1].nativeElement.textContent.trim()).toBe('0');

    expect(fixture.debugElement.query(By.css('[data-testid="mensaje-vacio"]'))).toBeTruthy();
    expect(fixture.debugElement.queryAll(By.css('[data-testid="tarjeta-lote"]'))).toHaveLength(0);

    component.onSegmentChange(new CustomEvent('ionChange', { detail: { value: 'OFICIO' } }));
    fixture.detectChanges();

    resumen = fixture.debugElement.query(By.css('.resumen-papel'));
    expect(resumen.query(By.css('.resumen-numero')).nativeElement.textContent.trim()).toBe('0');
    resumenCeldas = resumen.queryAll(By.css('.resumen-grid .total-celda .seccion-titulo'));
    expect(resumenCeldas[0].nativeElement.textContent.trim()).toBe('$ 0');
    expect(resumenCeldas[1].nativeElement.textContent.trim()).toBe('0');
    const mensajeVacio = fixture.debugElement.query(By.css('[data-testid="mensaje-vacio"]'));
    expect(mensajeVacio).toBeTruthy();
    expect(mensajeVacio.nativeElement.textContent).toContain('Oficio');
  });
});
