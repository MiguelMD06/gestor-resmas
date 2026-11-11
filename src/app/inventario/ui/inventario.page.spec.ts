import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { ModalController } from '@ionic/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AporteModalComponent } from '../../finanzas/ui/aporte.modal';
import { cajas, fechaHora, pesos, resmas } from '../../shared/domain';
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
});
