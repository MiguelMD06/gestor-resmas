import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { ModalController, ToastController } from '@ionic/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConsultarCartera, type ResumenCartera } from '../../app/cartera/application/consultar-cartera';
import type { FacturaAbierta } from '../../app/cartera/domain';
import { AbonoModalComponent } from '../../app/cartera/ui/abono.modal';
import { BuscarClientes } from '../../app/clientes/application/buscar-clientes';
import type { Cliente } from '../../app/clientes/domain/cliente';
import { ClientesPage } from '../../app/clientes/ui/clientes.page';
import { fechaHora, pesos } from '../../app/shared/domain';
import { CLOCK } from '../../app/shared/infrastructure/clock/clock.token';
import { ROL_CANCELAR } from '../../app/shared/ui/formulario';
import { MENSAJES_ERROR } from '../../app/shared/ui/mensajes-error';
import { SelectorClienteContenidoComponent } from '../../app/ventas/ui/selector-cliente-contenido.component';

describe('Verificacion independiente B4.5-detalles-cierre', () => {
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

  describe('AbonoModalComponent (C1-C4)', () => {
    let mockModalCtrl: {
      create: ReturnType<typeof vi.fn>;
      dismiss: ReturnType<typeof vi.fn>;
    };
    let mockToastCtrl: { create: ReturnType<typeof vi.fn> };

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

    function botonRevisar(fixture: ComponentFixture<AbonoModalComponent>): HTMLButtonElement {
      return fixture.debugElement.query(By.css('[data-testid="btn-revisar-abono"]')).nativeElement;
    }

    function simularEntradaPesos(fixture: ComponentFixture<AbonoModalComponent>, texto: string): void {
      const ionInput = fixture.debugElement.query(By.css('app-campo-pesos ion-input')).nativeElement as HTMLElement & {
        value?: string;
      };
      ionInput.value = texto;
      ionInput.dispatchEvent(new CustomEvent('ionInput', { detail: { value: texto } }));
      fixture.detectChanges();
    }

    function cambiarModo(
      fixture: ComponentFixture<AbonoModalComponent>,
      modo: 'CASCADA_GLOBAL' | 'FACTURA_INDIVIDUAL' | 'LIQUIDACION_TOTAL',
    ): void {
      const seg = fixture.debugElement.query(By.css('[data-testid="segment-modo"]')).nativeElement as HTMLElement;
      seg.dispatchEvent(new CustomEvent('ionChange', { detail: { value: modo } }));
      fixture.detectChanges();
    }

    function elegirFacturaEnDom(fixture: ComponentFixture<AbonoModalComponent>, index: number): void {
      const radios = fixture.debugElement.queryAll(By.css('[data-testid="opcion-factura"] input[type="radio"]'));
      const radio = radios[index].nativeElement as HTMLInputElement;
      radio.checked = true;
      radio.dispatchEvent(new Event('change'));
      fixture.detectChanges();
    }

    beforeEach(async () => {
      mockModalCtrl = {
        create: vi.fn().mockResolvedValue({
          present: vi.fn().mockResolvedValue(undefined),
          onDidDismiss: vi.fn().mockResolvedValue({ data: null, role: ROL_CANCELAR }),
        }),
        dismiss: vi.fn().mockResolvedValue(true),
      };
      mockToastCtrl = {
        create: vi.fn().mockResolvedValue({ present: vi.fn().mockResolvedValue(undefined) }),
      };

      await TestBed.configureTestingModule({
        imports: [AbonoModalComponent],
        providers: [
          { provide: CLOCK, useValue: { ahora: () => fechaHora('2026-11-20 12:00:00') } },
          { provide: ModalController, useValue: mockModalCtrl },
          { provide: ToastController, useValue: mockToastCtrl },
        ],
      }).compileComponents();
    });

    it('C1: in FACTURA_INDIVIDUAL without selected invoice, button stays "Revisar abono" and disabled for $40.001, $5.000, and when switching modes', () => {
      const { fixture, component } = crearModalAbono([f1, f2], 'CASCADA_GLOBAL');

      // Type $40.001 in CASCADA_GLOBAL, then switch to FACTURA_INDIVIDUAL (no invoice selected)
      simularEntradaPesos(fixture, '40001');
      cambiarModo(fixture, 'FACTURA_INDIVIDUAL');

      expect(component.idVentaSeleccionada()).toBeNull();
      expect(botonRevisar(fixture).textContent?.trim()).toBe('Revisar abono');
      expect(Boolean(botonRevisar(fixture).disabled)).toBe(true);
      expect(botonRevisar(fixture).getAttribute('aria-disabled')).toBe('true');

      // Now $5.000 without invoice selected
      component.monto.set(5000);
      fixture.detectChanges();
      expect(botonRevisar(fixture).textContent?.trim()).toBe('Revisar abono');
      expect(Boolean(botonRevisar(fixture).disabled)).toBe(true);
      expect(botonRevisar(fixture).getAttribute('aria-disabled')).toBe('true');

      // Amount input should also be disabled while no invoice is selected
      const campoPesos = fixture.debugElement.query(By.css('[data-testid="input-monto-abono"]'));
      expect(campoPesos.componentInstance.disabled()).toBe(true);
    });

    it('C2: with F2 ($10.000) selected via DOM radio, handles exact limit $10.000 and limit+1 $10.001', () => {
      const { fixture } = crearModalAbono([f1, f2], 'FACTURA_INDIVIDUAL');

      // Select second/last invoice F2 (index 1)
      elegirFacturaEnDom(fixture, 1);

      simularEntradaPesos(fixture, '10000');
      expect(botonRevisar(fixture).textContent?.trim()).toBe('Revisar abono · $ 10.000');
      expect(Boolean(botonRevisar(fixture).disabled)).toBe(false);
      expect(botonRevisar(fixture).getAttribute('aria-disabled')).toBeNull();
      expect(fixture.debugElement.query(By.css('[data-testid="error-monto"]'))).toBeNull();

      simularEntradaPesos(fixture, '10001');
      expect(botonRevisar(fixture).textContent?.trim()).toBe('Revisar abono');
      expect(Boolean(botonRevisar(fixture).disabled)).toBe(true);
      expect(botonRevisar(fixture).getAttribute('aria-disabled')).toBe('true');
      expect(fixture.debugElement.query(By.css('[data-testid="error-monto"]')).nativeElement.textContent.trim()).toBe(
        MENSAJES_ERROR.MONTO_SUPERA_SALDO_FACTURA,
      );
    });

    it('C3: with $15.000 entered, selecting F2 disables button as "Revisar abono", switching to F1 enables "Revisar abono · $ 15.000", and switching back to F2 disables again', () => {
      const { fixture } = crearModalAbono([f1, f2], 'CASCADA_GLOBAL');

      simularEntradaPesos(fixture, '15000');
      cambiarModo(fixture, 'FACTURA_INDIVIDUAL');

      // Choose F2 (saldo $10.000 < $15.000)
      elegirFacturaEnDom(fixture, 1);
      expect(botonRevisar(fixture).textContent?.trim()).toBe('Revisar abono');
      expect(Boolean(botonRevisar(fixture).disabled)).toBe(true);
      expect(botonRevisar(fixture).getAttribute('aria-disabled')).toBe('true');

      // Switch to F1 (saldo $30.000 >= $15.000)
      elegirFacturaEnDom(fixture, 0);
      expect(botonRevisar(fixture).textContent?.trim()).toBe('Revisar abono · $ 15.000');
      expect(Boolean(botonRevisar(fixture).disabled)).toBe(false);
      expect(botonRevisar(fixture).getAttribute('aria-disabled')).toBeNull();

      // Repeat: switch back to F2
      elegirFacturaEnDom(fixture, 1);
      expect(botonRevisar(fixture).textContent?.trim()).toBe('Revisar abono');
      expect(Boolean(botonRevisar(fixture).disabled)).toBe(true);
    });

    it('C4: CASCADA_GLOBAL and LIQUIDACION_TOTAL keep their exact button texts across valid, exceeding, and empty amounts', () => {
      const { fixture } = crearModalAbono([f1, f2], 'CASCADA_GLOBAL');

      // Empty
      expect(botonRevisar(fixture).textContent?.trim()).toBe('Revisar abono');
      expect(Boolean(botonRevisar(fixture).disabled)).toBe(true);

      // $35.000
      simularEntradaPesos(fixture, '35000');
      expect(botonRevisar(fixture).textContent?.trim()).toBe('Revisar abono · $ 35.000');
      expect(Boolean(botonRevisar(fixture).disabled)).toBe(false);

      // $40.000 exact total debt
      simularEntradaPesos(fixture, '40000');
      expect(botonRevisar(fixture).textContent?.trim()).toBe('Revisar abono · $ 40.000');
      expect(Boolean(botonRevisar(fixture).disabled)).toBe(false);

      // $40.001 exceeds total debt
      simularEntradaPesos(fixture, '40001');
      expect(botonRevisar(fixture).textContent?.trim()).toBe('Revisar abono');
      expect(Boolean(botonRevisar(fixture).disabled)).toBe(true);

      // Empty again
      simularEntradaPesos(fixture, '');
      expect(botonRevisar(fixture).textContent?.trim()).toBe('Revisar abono');
      expect(Boolean(botonRevisar(fixture).disabled)).toBe(true);

      // Pagar todo
      cambiarModo(fixture, 'LIQUIDACION_TOTAL');
      expect(botonRevisar(fixture).textContent?.trim()).toBe('Revisar pago · $ 40.000');
      expect(Boolean(botonRevisar(fixture).disabled)).toBe(false);
    });
  });

  describe('ClientesPage & SelectorClienteContenidoComponent (C5-C7)', () => {
    const beto: Cliente = { idCliente: 2, nombre: 'Beto Silva', telefono: '3115550000', esMostrador: false };
    const carla: Cliente = { idCliente: 3, nombre: 'Carla Ruiz', telefono: '3209998877', esMostrador: false };
    const carteraVacia: ResumenCartera = { total: pesos(0), porCliente: new Map() };

    let mockBuscarClientes: { buscar: ReturnType<typeof vi.fn> };
    let mockConsultarCartera: { consultar: ReturnType<typeof vi.fn> };

    beforeEach(async () => {
      mockBuscarClientes = { buscar: vi.fn().mockResolvedValue([ana, beto, carla]) };
      mockConsultarCartera = { consultar: vi.fn().mockResolvedValue(carteraVacia) };

      await TestBed.configureTestingModule({
        imports: [ClientesPage, SelectorClienteContenidoComponent],
        providers: [
          { provide: BuscarClientes, useValue: mockBuscarClientes },
          { provide: ConsultarCartera, useValue: mockConsultarCartera },
          { provide: Router, useValue: { navigate: vi.fn().mockResolvedValue(true) } },
          { provide: ModalController, useValue: { create: vi.fn() } },
          { provide: ToastController, useValue: { create: vi.fn() } },
        ],
      }).compileComponents();
    });

    it('C5 & C6: ClientesPage renders "Buscar cliente" label before ion-searchbar with relative container, while Vender selector stays unchanged', async () => {
      const fixture = TestBed.createComponent(ClientesPage);
      await fixture.componentInstance.cargarClientes();
      fixture.detectChanges();

      const contenedor = fixture.debugElement.query(By.css('.buscador-contenedor'));
      expect(contenedor).toBeTruthy();
      expect(getComputedStyle(contenedor.nativeElement).position).toBe('relative');

      const hijos = Array.from(contenedor.nativeElement.children) as HTMLElement[];
      expect(hijos.length).toBeGreaterThanOrEqual(2);
      expect(hijos[0].textContent?.trim()).toBe('Buscar cliente');
      expect(hijos[0].classList.contains('campo-selector-etiqueta')).toBe(true);
      expect(hijos[0].getAttribute('aria-hidden')).toBe('true');

      const searchbar = fixture.debugElement.query(By.css('[data-testid="searchbar-clientes"]'));
      expect(hijos[1]).toBe(searchbar.nativeElement);
      expect(searchbar.attributes['aria-label']).toBe('Buscar cliente por nombre o celular');
      expect(searchbar.attributes['placeholder']).toBe('Buscar por nombre o celular');

      // Vender client selector unchanged
      const venderFixture = TestBed.createComponent(SelectorClienteContenidoComponent);
      venderFixture.componentRef.setInput('busqueda', '');
      venderFixture.componentRef.setInput('clientes', [ana]);
      venderFixture.componentRef.setInput('buscando', false);
      venderFixture.componentRef.setInput('errorBusqueda', null);
      venderFixture.detectChanges();
      const searchbarVender = venderFixture.debugElement.query(By.css('[data-testid="searchbar-clientes-vender"]'));
      expect(searchbarVender).toBeTruthy();
      expect(searchbarVender.attributes['aria-label']).toBe('Buscar por nombre o celular');
      expect(searchbarVender.attributes['placeholder']).toBe('Buscar por nombre o celular');
      expect(venderFixture.debugElement.query(By.css('.campo-selector-etiqueta'))).toBeNull();
    });

    it('C7: ClientesPage searchbar remains enabled while loading and filters by name, phone, and clear', async () => {
      const fixture = TestBed.createComponent(ClientesPage);
      const component = fixture.componentInstance;

      let resolverCarga: (c: Cliente[]) => void = () => undefined;
      mockBuscarClientes.buscar.mockReturnValueOnce(new Promise<Cliente[]>((r) => (resolverCarga = r)));

      const carga = component.cargarClientes();
      fixture.detectChanges();

      const searchbar = fixture.debugElement.query(By.css('[data-testid="searchbar-clientes"]'));
      expect(Boolean(searchbar.nativeElement.disabled)).toBe(false);
      expect(searchbar.attributes['aria-disabled']).toBeUndefined();

      resolverCarga([ana, beto, carla]);
      await carga;
      fixture.detectChanges();

      // Filter by phone (last item: Carla)
      mockBuscarClientes.buscar.mockResolvedValueOnce([carla]);
      searchbar.nativeElement.value = '320999';
      searchbar.triggerEventHandler('ionInput', { detail: { value: '320999' }, target: searchbar.nativeElement });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();

      expect(mockBuscarClientes.buscar).toHaveBeenLastCalledWith('320999');
      let items = fixture.debugElement.queryAll(By.css('[data-testid="item-cliente"]'));
      expect(items).toHaveLength(1);
      expect(items[0].nativeElement.textContent).toContain('Carla Ruiz');

      // Filter by name (second item: Beto)
      mockBuscarClientes.buscar.mockResolvedValueOnce([beto]);
      searchbar.nativeElement.value = 'Beto';
      searchbar.triggerEventHandler('ionInput', { detail: { value: 'Beto' }, target: searchbar.nativeElement });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();

      expect(mockBuscarClientes.buscar).toHaveBeenLastCalledWith('Beto');
      items = fixture.debugElement.queryAll(By.css('[data-testid="item-cliente"]'));
      expect(items).toHaveLength(1);
      expect(items[0].nativeElement.textContent).toContain('Beto Silva');

      // Clear search
      mockBuscarClientes.buscar.mockResolvedValueOnce([ana, beto, carla]);
      searchbar.triggerEventHandler('ionClear', null);
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();

      expect(mockBuscarClientes.buscar).toHaveBeenLastCalledWith('');
      expect(fixture.debugElement.queryAll(By.css('[data-testid="item-cliente"]'))).toHaveLength(3);
    });
  });
});
