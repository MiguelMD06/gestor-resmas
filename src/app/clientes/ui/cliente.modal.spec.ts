import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ModalController, ToastController } from '@ionic/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReglaNegocioError } from '../../shared/domain';
import { ROL_CANCELAR, ROL_GUARDADO } from '../../shared/ui/formulario';
import { MENSAJES_ERROR, MENSAJE_ERROR_GENERICO } from '../../shared/ui/mensajes-error';
import { EditarCliente } from '../application/editar-cliente';
import { RegistrarCliente } from '../application/registrar-cliente';
import type { Cliente } from '../domain/cliente';

import { ClienteModalComponent } from './cliente.modal';

describe('ClienteModalComponent', () => {
  let fixture: ComponentFixture<ClienteModalComponent>;
  let component: ClienteModalComponent;
  let mockRegistrar: { registrar: ReturnType<typeof vi.fn> };
  let mockEditar: { editar: ReturnType<typeof vi.fn> };
  let mockModalCtrl: { dismiss: ReturnType<typeof vi.fn> };
  let mockToastCtrl: { create: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockRegistrar = {
      registrar: vi.fn().mockResolvedValue({ idCliente: 1 }),
    };
    mockEditar = {
      editar: vi.fn().mockResolvedValue(undefined),
    };
    mockModalCtrl = {
      dismiss: vi.fn().mockResolvedValue(true),
    };
    mockToastCtrl = {
      create: vi.fn().mockResolvedValue({ present: vi.fn().mockResolvedValue(undefined) }),
    };

    await TestBed.configureTestingModule({
      imports: [ClienteModalComponent],
      providers: [
        { provide: RegistrarCliente, useValue: mockRegistrar },
        { provide: EditarCliente, useValue: mockEditar },
        { provide: ModalController, useValue: mockModalCtrl },
        { provide: ToastController, useValue: mockToastCtrl },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClienteModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function botonGuardar() {
    return fixture.debugElement.query(By.css('[data-testid="btn-guardar-cliente"]'));
  }

  function estaDeshabilitado(el: ReturnType<typeof botonGuardar>): boolean {
    return Boolean(el.nativeElement.disabled);
  }

  it('validates nombre and telefono fields and updates Guardar cliente button state', () => {
    // Initially nombre is empty -> disabled and error shown
    expect(estaDeshabilitado(botonGuardar())).toBe(true);
    expect(fixture.debugElement.query(By.css('[data-testid="error-nombre"]')).nativeElement.textContent.trim()).toBe(
      MENSAJES_ERROR.NOMBRE_INVALIDO,
    );

    // Whitespace-only nombre -> disabled and error shown
    component.nombre.set('   ');
    fixture.detectChanges();
    expect(estaDeshabilitado(botonGuardar())).toBe(true);
    expect(fixture.debugElement.query(By.css('[data-testid="error-nombre"]')).nativeElement.textContent.trim()).toBe(
      MENSAJES_ERROR.NOMBRE_INVALIDO,
    );

    // Name > 80 chars -> disabled and error shown
    component.nombre.set('A'.repeat(81));
    fixture.detectChanges();
    expect(estaDeshabilitado(botonGuardar())).toBe(true);
    expect(fixture.debugElement.query(By.css('[data-testid="error-nombre"]')).nativeElement.textContent.trim()).toBe(
      MENSAJES_ERROR.NOMBRE_INVALIDO,
    );

    // Valid name, empty phone -> enabled, no errors
    component.nombre.set('Ana Pérez');
    component.telefono.set('');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="error-nombre"]'))).toBeNull();
    expect(fixture.debugElement.query(By.css('[data-testid="error-telefono"]'))).toBeNull();
    expect(estaDeshabilitado(botonGuardar())).toBe(false);

    // Invalid phone -> disabled and error shown
    component.telefono.set('300-ABC');
    fixture.detectChanges();
    expect(estaDeshabilitado(botonGuardar())).toBe(true);
    expect(fixture.debugElement.query(By.css('[data-testid="error-telefono"]')).nativeElement.textContent.trim()).toBe(
      MENSAJES_ERROR.TELEFONO_INVALIDO,
    );

    // Valid phone with spaces -> enabled, no error
    component.telefono.set('300 123 4567');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="error-telefono"]'))).toBeNull();
    expect(estaDeshabilitado(botonGuardar())).toBe(false);
  });

  it('prevents double submission and disables buttons while saving', async () => {
    let resolver: (val: { idCliente: number }) => void = () => undefined;
    mockRegistrar.registrar.mockReturnValueOnce(
      new Promise((resolve) => {
        resolver = resolve;
      }),
    );

    component.nombre.set('Ana Pérez');
    component.telefono.set('3001234567');
    fixture.detectChanges();

    const p1 = component.guardar();
    const p2 = component.guardar();
    fixture.detectChanges();

    expect(component.guardando()).toBe(true);
    expect(estaDeshabilitado(botonGuardar())).toBe(true);
    const btnCancelar = fixture.debugElement.query(By.css('[data-testid="btn-cancelar"]'));
    expect(estaDeshabilitado(btnCancelar)).toBe(true);

    // cancelar() must not dismiss while saving
    await component.cancelar();
    expect(mockModalCtrl.dismiss).not.toHaveBeenCalled();

    resolver({ idCliente: 7 });
    await Promise.all([p1, p2]);

    expect(mockRegistrar.registrar).toHaveBeenCalledTimes(1);
    expect(mockModalCtrl.dismiss).toHaveBeenCalledWith(
      { idCliente: 7, nombre: 'Ana Pérez', telefono: '3001234567', esMostrador: false },
      ROL_GUARDADO,
    );
  });

  it('shows TELEFONO_REPETIDO next to phone field and re-enables Guardar cliente after error (E3b)', async () => {
    mockRegistrar.registrar.mockRejectedValueOnce(new ReglaNegocioError('TELEFONO_REPETIDO', 'Duplicate phone'));
    component.nombre.set('Laura Ruiz');
    component.telefono.set('3001234567');
    fixture.detectChanges();

    await component.guardar();
    fixture.detectChanges();

    expect(component.guardando()).toBe(false);
    expect(estaDeshabilitado(botonGuardar())).toBe(false);
    expect(mockModalCtrl.dismiss).not.toHaveBeenCalled();

    const errorTel = fixture.debugElement.query(By.css('[data-testid="error-telefono"]'));
    expect(errorTel).toBeTruthy();
    expect(errorTel.nativeElement.textContent.trim()).toBe(MENSAJES_ERROR.TELEFONO_REPETIDO);
  });

  it('shows toast with generic message on unexpected error and re-enables Guardar cliente', async () => {
    mockRegistrar.registrar.mockRejectedValueOnce(new Error('DB failure'));
    component.nombre.set('Ana Pérez');
    fixture.detectChanges();

    await component.guardar();
    fixture.detectChanges();

    expect(component.guardando()).toBe(false);
    expect(estaDeshabilitado(botonGuardar())).toBe(false);
    expect(mockToastCtrl.create).toHaveBeenCalledWith(
      expect.objectContaining({
        message: MENSAJE_ERROR_GENERICO,
      }),
    );
  });

  it('edits an existing customer and dismisses with updated Cliente (E4)', async () => {
    const existente: Cliente = {
      idCliente: 5,
      nombre: 'Ana Pérez',
      telefono: '3001234567',
      esMostrador: false,
    };
    const editFixture = TestBed.createComponent(ClienteModalComponent);
    const editComp = editFixture.componentInstance;
    editComp.cliente = existente;
    editFixture.detectChanges();

    expect(editComp.nombre()).toBe('Ana Pérez');
    expect(editComp.telefono()).toBe('3001234567');

    editComp.nombre.set('Ana María Pérez');
    editComp.telefono.set('');
    await editComp.guardar();

    expect(mockEditar.editar).toHaveBeenCalledWith({
      idCliente: 5,
      nombre: 'Ana María Pérez',
      telefono: null,
    });
    expect(mockModalCtrl.dismiss).toHaveBeenCalledWith(
      { idCliente: 5, nombre: 'Ana María Pérez', telefono: null, esMostrador: false },
      ROL_GUARDADO,
    );
  });

  it('dismisses with ROL_CANCELAR when cancelar is called while idle', async () => {
    await component.cancelar();
    expect(mockModalCtrl.dismiss).toHaveBeenCalledWith(null, ROL_CANCELAR);
  });

  it('sets aria-disabled="true" on Nombre completo and Celular inputs while saving (V5)', async () => {
    let resolver: (val: { idCliente: number }) => void = () => undefined;
    mockRegistrar.registrar.mockReturnValueOnce(
      new Promise((resolve) => {
        resolver = resolve;
      }),
    );

    component.nombre.set('Ana Pérez');
    component.telefono.set('3001234567');
    fixture.detectChanges();

    const p = component.guardar();
    fixture.detectChanges();

    const inputNombre = fixture.debugElement.query(By.css('[data-testid="input-nombre"]'));
    const inputTelefono = fixture.debugElement.query(By.css('[data-testid="input-telefono"]'));
    expect(inputNombre.attributes['aria-disabled']).toBe('true');
    expect(inputTelefono.attributes['aria-disabled']).toBe('true');

    resolver({ idCliente: 9 });
    await p;
    fixture.detectChanges();

    expect(inputNombre.attributes['aria-disabled']).toBeUndefined();
    expect(inputTelefono.attributes['aria-disabled']).toBeUndefined();
  });

  it('does not show save error or re-enable Guardar cliente if dismiss fails after registrar or editar resolves (F14)', async () => {
    mockModalCtrl.dismiss.mockRejectedValueOnce(new Error('Dismiss failed'));
    component.nombre.set('Ana Pérez');
    component.telefono.set('3001234567');
    fixture.detectChanges();

    await expect(component.guardar()).resolves.toBeUndefined();
    fixture.detectChanges();

    expect(mockRegistrar.registrar).toHaveBeenCalledTimes(1);
    expect(mockToastCtrl.create).not.toHaveBeenCalled();
    expect(estaDeshabilitado(botonGuardar())).toBe(true);

    // Same for editar
    const editFixture = TestBed.createComponent(ClienteModalComponent);
    const editComp = editFixture.componentInstance;
    editComp.cliente = { idCliente: 5, nombre: 'Ana Pérez', telefono: '3001234567', esMostrador: false };
    editFixture.detectChanges();
    mockModalCtrl.dismiss.mockRejectedValueOnce(new Error('Dismiss failed'));

    await expect(editComp.guardar()).resolves.toBeUndefined();
    editFixture.detectChanges();

    expect(mockEditar.editar).toHaveBeenCalledTimes(1);
    expect(mockToastCtrl.create).not.toHaveBeenCalled();
    expect(
      Boolean(editFixture.debugElement.query(By.css('[data-testid="btn-guardar-cliente"]')).nativeElement.disabled),
    ).toBe(true);
  });
});
