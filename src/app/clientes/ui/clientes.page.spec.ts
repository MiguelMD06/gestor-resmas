import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ModalController, ToastController } from '@ionic/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  let mockModalCtrl: { create: ReturnType<typeof vi.fn> };
  let mockToastCtrl: { create: ReturnType<typeof vi.fn> };
  let mockToastPresent: ReturnType<typeof vi.fn>;

  const ana: Cliente = {
    idCliente: 1,
    nombre: 'Ana Pérez',
    telefono: '3001234567',
    esMostrador: false,
  };

  beforeEach(async () => {
    mockBuscarClientes = {
      buscar: vi.fn().mockResolvedValue([ana]),
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
    });
    expect(spyCargar).toHaveBeenCalled();
  });

  it('opens ClienteModalComponent in edit mode when tapping a customer and reloads when saved', async () => {
    await component.cargarClientes();
    fixture.detectChanges();

    const spyCargar = vi.spyOn(component, 'cargarClientes');
    const item = fixture.debugElement.query(By.css('[data-testid="item-cliente"]'));
    item.triggerEventHandler('click', null);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockModalCtrl.create).toHaveBeenCalledWith({
      component: ClienteModalComponent,
      componentProps: { cliente: ana },
      canDismiss: soloCierreExplicito,
    });
    expect(spyCargar).toHaveBeenCalled();
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
});
