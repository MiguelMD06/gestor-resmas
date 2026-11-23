import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { ModalController, ToastController } from '@ionic/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConsultarCartera, type ResumenCartera } from '../../cartera/application/consultar-cartera';
import { pesos } from '../../shared/domain';
import { ROL_CANCELAR, ROL_GUARDADO, soloCierreExplicito } from '../../shared/ui/formulario';
import { MENSAJE_ERROR_GENERICO } from '../../shared/ui/mensajes-error';
import { BuscarClientes } from '../application/buscar-clientes';
import type { Cliente } from '../domain/cliente';

import { ClienteModalComponent } from './cliente.modal';
import { ClientesPage } from './clientes.page';

describe('ClientesPage', () => {
  let fixture: ComponentFixture<ClientesPage>;
  let component: ClientesPage;
  let mockBuscarClientes: { buscar: ReturnType<typeof vi.fn> };
  let mockConsultarCartera: { consultar: ReturnType<typeof vi.fn> };
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };
  let mockModalCtrl: { create: ReturnType<typeof vi.fn> };
  let mockToastCtrl: { create: ReturnType<typeof vi.fn> };
  let mockToastPresent: ReturnType<typeof vi.fn>;

  const ana: Cliente = {
    idCliente: 1,
    nombre: 'Ana Pérez',
    telefono: '3001234567',
    esMostrador: false,
  };
  const beto: Cliente = {
    idCliente: 2,
    nombre: 'Beto',
    telefono: '3002223344',
    esMostrador: false,
  };
  const carla: Cliente = {
    idCliente: 3,
    nombre: 'Carla',
    telefono: '3003334455',
    esMostrador: false,
  };

  const carteraVacia: ResumenCartera = {
    total: pesos(0),
    porCliente: new Map(),
  };

  const carteraEjemplo: ResumenCartera = {
    total: pesos(62000),
    porCliente: new Map([
      [ana.idCliente, { deuda: pesos(40000), facturas: 2 }],
      [carla.idCliente, { deuda: pesos(22000), facturas: 1 }],
    ]),
  };

  beforeEach(async () => {
    mockBuscarClientes = {
      buscar: vi.fn().mockResolvedValue([ana]),
    };

    mockConsultarCartera = {
      consultar: vi.fn().mockResolvedValue(carteraVacia),
    };

    mockRouter = {
      navigate: vi.fn().mockResolvedValue(true),
    };

    mockModalCtrl = {
      create: vi.fn().mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
        onDidDismiss: vi.fn().mockResolvedValue({ data: ana, role: ROL_GUARDADO }),
      }),
    };

    mockToastPresent = vi.fn().mockResolvedValue(undefined);
    mockToastCtrl = {
      create: vi.fn().mockResolvedValue({ present: mockToastPresent }),
    };

    await TestBed.configureTestingModule({
      imports: [ClientesPage],
      providers: [
        { provide: BuscarClientes, useValue: mockBuscarClientes },
        { provide: ConsultarCartera, useValue: mockConsultarCartera },
        { provide: Router, useValue: mockRouter },
        { provide: ModalController, useValue: mockModalCtrl },
        { provide: ToastController, useValue: mockToastCtrl },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientesPage);
    component = fixture.componentInstance;
  });

  it('shows error state with Reintentar when load fails (not empty state), and recovers on retry (E18)', async () => {
    mockBuscarClientes.buscar.mockRejectedValueOnce(new Error('SQLite failure'));

    await component.cargarClientes();
    fixture.detectChanges();

    const estadoError = fixture.debugElement.query(By.css('[data-testid="estado-error"]'));
    expect(estadoError).toBeTruthy();
    expect(
      fixture.debugElement.query(By.css('[data-testid="mensaje-error-carga"]')).nativeElement.textContent,
    ).toContain(MENSAJE_ERROR_GENERICO);
    expect(fixture.debugElement.query(By.css('[data-testid="btn-reintentar"]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[data-testid="mensaje-vacio"]'))).toBeNull();

    // Retry succeeds
    mockBuscarClientes.buscar.mockResolvedValueOnce([ana]);
    await component.cargarClientes();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="estado-error"]'))).toBeNull();
    const items = fixture.debugElement.queryAll(By.css('[data-testid="item-cliente"]'));
    expect(items).toHaveLength(1);
    expect(items[0].nativeElement.textContent).toContain('Ana Pérez');
    expect(items[0].nativeElement.textContent).toContain('3001234567');
  });

  it('shows empty state message when there are no customers', async () => {
    mockBuscarClientes.buscar.mockResolvedValueOnce([]);

    await component.cargarClientes();
    fixture.detectChanges();

    const vacio = fixture.debugElement.query(By.css('[data-testid="mensaje-vacio"]'));
    expect(vacio).toBeTruthy();
    expect(vacio.nativeElement.textContent).toContain('Todavía no hay clientes');
  });

  it('opens ClienteModalComponent in create mode from FAB and reloads when saved', async () => {
    const spyCargar = vi.spyOn(component, 'cargarClientes');

    await component.abrirModalNuevo();

    expect(mockModalCtrl.create).toHaveBeenCalledWith({
      component: ClienteModalComponent,
      componentProps: undefined,
      canDismiss: soloCierreExplicito,
      cssClass: 'modal-sheet',
      breakpoints: [0, 0.65, 0.9],
      initialBreakpoint: 0.65,
    });
    expect(spyCargar).toHaveBeenCalled();
  });

  it('navigates to customer dossier when tapping a customer', async () => {
    await component.cargarClientes();
    fixture.detectChanges();

    const item = fixture.debugElement.query(By.css('[data-testid="item-cliente"]'));
    item.triggerEventHandler('click', null);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockModalCtrl.create).not.toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/clientes', ana.idCliente]);
  });

  it('discards stale load responses when a newer request completes first', async () => {
    let resolverPrimera: (c: Cliente[]) => void = () => undefined;
    let resolverSegunda: (c: Cliente[]) => void = () => undefined;

    mockBuscarClientes.buscar
      .mockReturnValueOnce(new Promise<Cliente[]>((r) => (resolverPrimera = r)))
      .mockReturnValueOnce(new Promise<Cliente[]>((r) => (resolverSegunda = r)));

    const p1 = component.cargarClientes();
    const p2 = component.cargarClientes();

    const juan: Cliente = { idCliente: 2, nombre: 'Juan Gómez', telefono: '3109876543', esMostrador: false };
    resolverSegunda([juan]);
    await p2;

    resolverPrimera([ana]);
    await p1;

    expect(component.clientes()).toEqual([juan]);
  });

  it('filters the customer list when typing in the searchbar (F16)', async () => {
    const juan: Cliente = { idCliente: 2, nombre: 'Juan Gómez', telefono: '3109876543', esMostrador: false };
    mockBuscarClientes.buscar.mockResolvedValueOnce([ana, juan]);

    await component.cargarClientes();
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('[data-testid="item-cliente"]'))).toHaveLength(2);

    mockBuscarClientes.buscar.mockResolvedValueOnce([ana]);
    const searchbar = fixture.debugElement.query(By.css('[data-testid="searchbar-clientes"]'));
    searchbar.nativeElement.value = 'ana';
    searchbar.triggerEventHandler('ionInput', { detail: { value: 'ana' }, target: searchbar.nativeElement });
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(mockBuscarClientes.buscar).toHaveBeenLastCalledWith('ana');
    const items = fixture.debugElement.queryAll(By.css('[data-testid="item-cliente"]'));
    expect(items).toHaveLength(1);
    expect(items[0].nativeElement.textContent).toContain('Ana Pérez');
  });

  it('prevents concurrent abrirModalNuevo modals, shows error toast on rejection, and releases guard', async () => {
    let resolverModal: (modal: {
      present: ReturnType<typeof vi.fn>;
      onDidDismiss: ReturnType<typeof vi.fn>;
    }) => void = () => undefined;
    mockModalCtrl.create.mockReturnValueOnce(
      new Promise((resolve) => {
        resolverModal = resolve;
      }),
    );

    const p1 = component.abrirModalNuevo();
    const p2 = component.abrirModalNuevo();

    expect(mockModalCtrl.create).toHaveBeenCalledTimes(1);

    resolverModal({
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ data: null, role: ROL_CANCELAR }),
    });
    await Promise.all([p1, p2]);

    mockModalCtrl.create.mockRejectedValueOnce(new Error('Modal create failed'));
    await expect(component.abrirModalNuevo()).resolves.toBeUndefined();

    expect(mockToastCtrl.create).toHaveBeenCalledWith(
      expect.objectContaining({
        message: MENSAJE_ERROR_GENERICO,
        duration: 3000,
        color: 'danger',
        position: 'bottom',
      }),
    );
    expect(mockToastPresent).toHaveBeenCalled();

    // Guard was released so a new attempt succeeds
    mockModalCtrl.create.mockResolvedValueOnce({
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ data: ana, role: ROL_GUARDADO }),
    });
    await component.abrirModalNuevo();
    expect(mockModalCtrl.create).toHaveBeenCalledTimes(3);
  });

  it('displays initials (first + last word, or single letter) and "Sin celular" when phone is missing', async () => {
    const anaMaria: Cliente = {
      idCliente: 10,
      nombre: 'Ana María Pérez',
      telefono: '3001234567',
      esMostrador: false,
    };
    const mononimo: Cliente = {
      idCliente: 11,
      nombre: 'Sofía',
      telefono: null,
      esMostrador: false,
    };
    mockBuscarClientes.buscar.mockResolvedValueOnce([anaMaria, mononimo]);

    await component.cargarClientes();
    fixture.detectChanges();

    const items = fixture.debugElement.queryAll(By.css('[data-testid="item-cliente"]'));
    expect(items).toHaveLength(2);

    const avatar0 = items[0].query(By.css('[data-testid="avatar-cliente"]'));
    expect(avatar0).toBeTruthy();
    expect(avatar0.nativeElement.textContent.trim()).toBe('AP');
    expect(items[0].nativeElement.textContent).toContain('3001234567');

    const avatar1 = items[1].query(By.css('[data-testid="avatar-cliente"]'));
    expect(avatar1).toBeTruthy();
    expect(avatar1.nativeElement.textContent.trim()).toBe('S');
    expect(items[1].nativeElement.textContent).toContain('Sin celular');
  });

  it('displays client count when search is empty and result count while searching', async () => {
    const juan: Cliente = { idCliente: 2, nombre: 'Juan Gómez', telefono: '3109876543', esMostrador: false };
    mockBuscarClientes.buscar.mockResolvedValueOnce([ana]);

    await component.cargarClientes();
    fixture.detectChanges();

    const obtenerSubtitulo = () => fixture.debugElement.query(By.css('.subtitulo-clientes'));
    expect(obtenerSubtitulo()).toBeTruthy();
    expect(obtenerSubtitulo().nativeElement.textContent.replace(/\s+/g, ' ').trim()).toBe('1 cliente');

    mockBuscarClientes.buscar.mockResolvedValueOnce([ana, juan]);
    await component.cargarClientes();
    fixture.detectChanges();
    expect(obtenerSubtitulo().nativeElement.textContent.replace(/\s+/g, ' ').trim()).toBe('2 clientes');

    const searchbar = fixture.debugElement.query(By.css('[data-testid="searchbar-clientes"]'));

    mockBuscarClientes.buscar.mockResolvedValueOnce([ana]);
    searchbar.nativeElement.value = 'ana';
    searchbar.triggerEventHandler('ionInput', { detail: { value: 'ana' }, target: searchbar.nativeElement });
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    expect(obtenerSubtitulo().nativeElement.textContent.replace(/\s+/g, ' ').trim()).toBe('1 resultado');

    mockBuscarClientes.buscar.mockResolvedValueOnce([ana, juan]);
    searchbar.nativeElement.value = 'a';
    searchbar.triggerEventHandler('ionInput', { detail: { value: 'a' }, target: searchbar.nativeElement });
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    expect(obtenerSubtitulo().nativeElement.textContent.replace(/\s+/g, ' ').trim()).toBe('2 resultados');
  });

  it('keeps searchbar enabled during consecutive searches and displays only the latest search result', async () => {
    const juan: Cliente = { idCliente: 2, nombre: 'Juan Gómez', telefono: '3109876543', esMostrador: false };
    mockBuscarClientes.buscar.mockResolvedValueOnce([ana, juan]);

    await component.cargarClientes();
    fixture.detectChanges();

    let resolverPrimera: (c: Cliente[]) => void = () => undefined;
    let resolverSegunda: (c: Cliente[]) => void = () => undefined;

    mockBuscarClientes.buscar
      .mockReturnValueOnce(new Promise<Cliente[]>((r) => (resolverPrimera = r)))
      .mockReturnValueOnce(new Promise<Cliente[]>((r) => (resolverSegunda = r)));

    const searchbar = fixture.debugElement.query(By.css('[data-testid="searchbar-clientes"]'));

    searchbar.nativeElement.value = 'a';
    searchbar.triggerEventHandler('ionInput', { detail: { value: 'a' }, target: searchbar.nativeElement });
    fixture.detectChanges();

    expect(Boolean(searchbar.nativeElement.disabled)).toBe(false);
    expect(searchbar.attributes['aria-disabled']).toBeUndefined();
    expect(fixture.debugElement.query(By.css('[data-testid="indicador-carga"]'))).toBeTruthy();

    searchbar.nativeElement.value = 'juan';
    searchbar.triggerEventHandler('ionInput', { detail: { value: 'juan' }, target: searchbar.nativeElement });
    fixture.detectChanges();

    expect(Boolean(searchbar.nativeElement.disabled)).toBe(false);
    expect(searchbar.attributes['aria-disabled']).toBeUndefined();
    expect(fixture.debugElement.query(By.css('[data-testid="indicador-carga"]'))).toBeTruthy();

    resolverSegunda([juan]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    resolverPrimera([ana]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="indicador-carga"]'))).toBeNull();
    const items = fixture.debugElement.queryAll(By.css('[data-testid="item-cliente"]'));
    expect(items).toHaveLength(1);
    expect(items[0].nativeElement.textContent).toContain('Juan Gómez');
  });

  it('sets exact aria-label on searchbar-clientes (C4)', async () => {
    await component.cargarClientes();
    fixture.detectChanges();

    const searchbar = fixture.debugElement.query(By.css('[data-testid="searchbar-clientes"]'));
    expect(searchbar).toBeTruthy();
    expect(searchbar.attributes['aria-label']).toBe('Buscar por nombre o celular');
  });

  it('displays header counts, total receivable, and singular/plural debtor labels (C2)', async () => {
    mockBuscarClientes.buscar.mockResolvedValueOnce([ana, beto, carla]);
    mockConsultarCartera.consultar.mockResolvedValueOnce(carteraEjemplo);

    await component.cargarClientes();
    fixture.detectChanges();

    expect(
      fixture.debugElement
        .query(By.css('[data-testid="cantidad-clientes"]'))
        .nativeElement.textContent.replace(/\s+/g, ' ')
        .trim(),
    ).toBe('3 clientes');
    expect(
      fixture.debugElement
        .query(By.css('[data-testid="total-por-cobrar"]'))
        .nativeElement.textContent.replace(/\s+/g, ' ')
        .trim(),
    ).toBe('$ 62.000');
    expect(
      fixture.debugElement
        .query(By.css('[data-testid="cantidad-con-deuda"]'))
        .nativeElement.textContent.replace(/\s+/g, ' ')
        .trim(),
    ).toBe('2 clientes con deuda');

    mockBuscarClientes.buscar.mockResolvedValueOnce([ana, beto, carla]);
    mockConsultarCartera.consultar.mockResolvedValueOnce({
      total: pesos(40000),
      porCliente: new Map([[ana.idCliente, { deuda: pesos(40000), facturas: 2 }]]),
    });

    await component.cargarClientes();
    fixture.detectChanges();

    expect(
      fixture.debugElement
        .query(By.css('[data-testid="cantidad-con-deuda"]'))
        .nativeElement.textContent.replace(/\s+/g, ' ')
        .trim(),
    ).toBe('1 cliente con deuda');
  });

  it('shows debt amount and invoice count or "Al día" per row with accessible labels (C3, C11)', async () => {
    mockBuscarClientes.buscar.mockResolvedValueOnce([ana, beto, carla]);
    mockConsultarCartera.consultar.mockResolvedValueOnce(carteraEjemplo);

    await component.cargarClientes();
    fixture.detectChanges();

    const items = fixture.debugElement.queryAll(By.css('[data-testid="item-cliente"]'));
    expect(items).toHaveLength(3);

    expect(
      items[0].query(By.css('[data-testid="deuda-cliente"]')).nativeElement.textContent.replace(/\s+/g, ' ').trim(),
    ).toBe('$ 40.000');
    expect(
      items[0].query(By.css('[data-testid="facturas-cliente"]')).nativeElement.textContent.replace(/\s+/g, ' ').trim(),
    ).toBe('2 facturas');
    expect(items[0].query(By.css('[data-testid="al-dia-cliente"]'))).toBeNull();
    expect(items[0].query(By.css('[aria-label="Debe $ 40.000 en 2 facturas"]'))).toBeTruthy();

    expect(items[1].query(By.css('[data-testid="deuda-cliente"]'))).toBeNull();
    expect(
      items[1].query(By.css('[data-testid="al-dia-cliente"]')).nativeElement.textContent.replace(/\s+/g, ' ').trim(),
    ).toBe('Al día');
    expect(items[1].query(By.css('[aria-label="Al día"]'))).toBeTruthy();

    expect(
      items[2].query(By.css('[data-testid="deuda-cliente"]')).nativeElement.textContent.replace(/\s+/g, ' ').trim(),
    ).toBe('$ 22.000');
    expect(
      items[2].query(By.css('[data-testid="facturas-cliente"]')).nativeElement.textContent.replace(/\s+/g, ' ').trim(),
    ).toBe('1 factura');
    expect(items[2].query(By.css('[aria-label="Debe $ 22.000 en 1 factura"]'))).toBeTruthy();
  });

  it('filters by "Todos" and "Con deuda" combined with search (C4, C11)', async () => {
    mockBuscarClientes.buscar.mockResolvedValueOnce([ana, beto, carla]);
    mockConsultarCartera.consultar.mockResolvedValueOnce(carteraEjemplo);

    await component.cargarClientes();
    fixture.detectChanges();

    const segment = fixture.debugElement.query(By.css('[data-testid="segment-filtro-clientes"]'));
    expect(segment.attributes['aria-label']).toBe('Filtrar clientes');
    expect(
      fixture.debugElement
        .query(By.css('[data-testid="segment-filtro-todos"]'))
        .nativeElement.textContent.replace(/\s+/g, ' ')
        .trim(),
    ).toBe('Todos · 3');
    expect(
      fixture.debugElement
        .query(By.css('[data-testid="segment-filtro-con-deuda"]'))
        .nativeElement.textContent.replace(/\s+/g, ' ')
        .trim(),
    ).toBe('Con deuda · 2');

    segment.nativeElement.value = 'con_deuda';
    segment.triggerEventHandler('ionChange', { detail: { value: 'con_deuda' }, target: segment.nativeElement });
    fixture.detectChanges();

    let items = fixture.debugElement.queryAll(By.css('[data-testid="item-cliente"]'));
    expect(items).toHaveLength(2);
    expect(items[0].nativeElement.textContent).toContain('Ana Pérez');
    expect(items[1].nativeElement.textContent).toContain('Carla');

    mockBuscarClientes.buscar.mockResolvedValueOnce([ana]);
    mockConsultarCartera.consultar.mockResolvedValueOnce(carteraEjemplo);
    const searchbar = fixture.debugElement.query(By.css('[data-testid="searchbar-clientes"]'));
    searchbar.nativeElement.value = 'an';
    searchbar.triggerEventHandler('ionInput', { detail: { value: 'an' }, target: searchbar.nativeElement });
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    items = fixture.debugElement.queryAll(By.css('[data-testid="item-cliente"]'));
    expect(items).toHaveLength(1);
    expect(items[0].nativeElement.textContent).toContain('Ana Pérez');

    mockBuscarClientes.buscar.mockResolvedValueOnce([ana, beto, carla]);
    mockConsultarCartera.consultar.mockResolvedValueOnce(carteraEjemplo);
    searchbar.nativeElement.value = '';
    searchbar.triggerEventHandler('ionInput', { detail: { value: '' }, target: searchbar.nativeElement });
    await new Promise((resolve) => setTimeout(resolve, 0));
    segment.nativeElement.value = 'todos';
    segment.triggerEventHandler('ionChange', { detail: { value: 'todos' }, target: segment.nativeElement });
    fixture.detectChanges();

    expect(fixture.debugElement.queryAll(By.css('[data-testid="item-cliente"]'))).toHaveLength(3);
  });

  it('shows exact empty state texts for no clients, no search results, and no debtors (C5)', async () => {
    mockBuscarClientes.buscar.mockResolvedValueOnce([]);
    mockConsultarCartera.consultar.mockResolvedValueOnce(carteraVacia);
    await component.cargarClientes();
    fixture.detectChanges();

    let vacio = fixture.debugElement.query(By.css('[data-testid="mensaje-vacio"]'));
    expect(vacio.nativeElement.textContent).toContain('Todavía no hay clientes');
    expect(vacio.nativeElement.textContent).toContain('Agrega el primero con el botón +.');

    mockBuscarClientes.buscar.mockResolvedValueOnce([]);
    mockConsultarCartera.consultar.mockResolvedValueOnce(carteraVacia);
    const searchbar = fixture.debugElement.query(By.css('[data-testid="searchbar-clientes"]'));
    searchbar.nativeElement.value = 'zzz';
    searchbar.triggerEventHandler('ionInput', { detail: { value: 'zzz' }, target: searchbar.nativeElement });
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    vacio = fixture.debugElement.query(By.css('[data-testid="mensaje-vacio"]'));
    expect(vacio.nativeElement.textContent).toContain('No se encontraron clientes');

    mockBuscarClientes.buscar.mockResolvedValueOnce([beto]);
    mockConsultarCartera.consultar.mockResolvedValueOnce(carteraVacia);
    searchbar.nativeElement.value = '';
    searchbar.triggerEventHandler('ionInput', { detail: { value: '' }, target: searchbar.nativeElement });
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    const segment = fixture.debugElement.query(By.css('[data-testid="segment-filtro-clientes"]'));
    segment.nativeElement.value = 'con_deuda';
    segment.triggerEventHandler('ionChange', { detail: { value: 'con_deuda' }, target: segment.nativeElement });
    fixture.detectChanges();

    vacio = fixture.debugElement.query(By.css('[data-testid="mensaje-vacio"]'));
    expect(vacio.nativeElement.textContent).toContain('Ningún cliente tiene deuda');
  });

  it('shows error state with Reintentar when ConsultarCartera fails even if BuscarClientes succeeds, and recovers on retry (C6)', async () => {
    mockBuscarClientes.buscar.mockResolvedValueOnce([ana, beto]);
    mockConsultarCartera.consultar.mockRejectedValueOnce(new Error('Cartera DB error'));

    await component.cargarClientes();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="estado-error"]'))).toBeTruthy();
    expect(
      fixture.debugElement.query(By.css('[data-testid="mensaje-error-carga"]')).nativeElement.textContent,
    ).toContain(MENSAJE_ERROR_GENERICO);
    expect(fixture.debugElement.query(By.css('[data-testid="btn-reintentar"]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[data-testid="lista-clientes"]'))).toBeNull();
    expect(fixture.debugElement.query(By.css('[data-testid="mensaje-vacio"]'))).toBeNull();

    mockBuscarClientes.buscar.mockResolvedValueOnce([ana, beto]);
    mockConsultarCartera.consultar.mockResolvedValueOnce(carteraEjemplo);
    await component.cargarClientes();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="estado-error"]'))).toBeNull();
    expect(fixture.debugElement.queryAll(By.css('[data-testid="item-cliente"]'))).toHaveLength(2);
  });

  it('disables filter segment (including aria-disabled) while loading but keeps searchbar enabled (C7)', async () => {
    let resolverClientes: (c: Cliente[]) => void = () => undefined;
    mockBuscarClientes.buscar.mockReturnValueOnce(new Promise<Cliente[]>((r) => (resolverClientes = r)));
    mockConsultarCartera.consultar.mockResolvedValueOnce(carteraVacia);

    const carga = component.cargarClientes();
    fixture.detectChanges();

    const segment = fixture.debugElement.query(By.css('[data-testid="segment-filtro-clientes"]'));
    const searchbar = fixture.debugElement.query(By.css('[data-testid="searchbar-clientes"]'));
    expect(fixture.debugElement.query(By.css('[data-testid="indicador-carga"]'))).toBeTruthy();
    expect(Boolean(segment.nativeElement.disabled)).toBe(true);
    expect(segment.attributes['aria-disabled']).toBe('true');
    expect(Boolean(searchbar.nativeElement.disabled)).toBe(false);
    expect(searchbar.attributes['aria-disabled']).toBeUndefined();

    resolverClientes([ana]);
    await carga;
    fixture.detectChanges();

    expect(Boolean(segment.nativeElement.disabled)).toBe(false);
    expect(segment.attributes['aria-disabled']).toBeUndefined();
  });

  it('reloads clients and portfolio on ionViewWillEnter so settled debts show "Al día" (C9)', async () => {
    mockBuscarClientes.buscar.mockResolvedValueOnce([ana, carla]);
    mockConsultarCartera.consultar.mockResolvedValueOnce(carteraEjemplo);

    await component.ionViewWillEnter();
    fixture.detectChanges();

    expect(
      fixture.debugElement
        .query(By.css('[data-testid="total-por-cobrar"]'))
        .nativeElement.textContent.replace(/\s+/g, ' ')
        .trim(),
    ).toBe('$ 62.000');

    mockBuscarClientes.buscar.mockResolvedValueOnce([ana, carla]);
    mockConsultarCartera.consultar.mockResolvedValueOnce({
      total: pesos(40000),
      porCliente: new Map([[ana.idCliente, { deuda: pesos(40000), facturas: 2 }]]),
    });

    await component.ionViewWillEnter();
    fixture.detectChanges();

    expect(
      fixture.debugElement
        .query(By.css('[data-testid="total-por-cobrar"]'))
        .nativeElement.textContent.replace(/\s+/g, ' ')
        .trim(),
    ).toBe('$ 40.000');
    const items = fixture.debugElement.queryAll(By.css('[data-testid="item-cliente"]'));
    expect(
      items[1].query(By.css('[data-testid="al-dia-cliente"]')).nativeElement.textContent.replace(/\s+/g, ' ').trim(),
    ).toBe('Al día');
  });
});
