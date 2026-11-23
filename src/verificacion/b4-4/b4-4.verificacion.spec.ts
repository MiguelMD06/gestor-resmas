import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { ModalController, ToastController } from '@ionic/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ExpedienteCliente } from '../../app/cartera/application/consultar-expediente';
import { ConsultarExpediente } from '../../app/cartera/application/consultar-expediente';
import { RegistrarAbono } from '../../app/cartera/application/registrar-abono';
import type { FacturaAbierta } from '../../app/cartera/domain';
import { AbonoModalComponent } from '../../app/cartera/ui/abono.modal';
import { type LineaResumenAbono, ResumenAbonoModalComponent } from '../../app/cartera/ui/resumen-abono.modal';
import type { Cliente } from '../../app/clientes/domain/cliente';
import { ExpedientePage } from '../../app/clientes/ui/expediente.page';
import { fechaHora, pesos, resmas } from '../../app/shared/domain';
import { CLOCK } from '../../app/shared/infrastructure/clock/clock.token';
import { ROL_CANCELAR, ROL_GUARDADO } from '../../app/shared/ui/formulario';
import { MENSAJE_ERROR_GENERICO, MENSAJES_ERROR } from '../../app/shared/ui/mensajes-error';

const clienteAna: Cliente = {
  idCliente: 7,
  nombre: 'Ana',
  telefono: '3001234567',
  esMostrador: false,
};

describe('Verificacion B4.4 - ResumenAbonoModalComponent (C1-C3)', () => {
  let fixture: ComponentFixture<ResumenAbonoModalComponent>;
  let component: ResumenAbonoModalComponent;
  let mockRegistrarAbono: { registrar: ReturnType<typeof vi.fn> };
  let mockModalCtrl: { dismiss: ReturnType<typeof vi.fn> };
  let mockToastCtrl: { create: ReturnType<typeof vi.fn> };

  const lineas: readonly LineaResumenAbono[] = [
    {
      idVenta: 1,
      monto: pesos(30000),
      capital: pesos(20000),
      ganancia: pesos(10000),
      quedaPagada: true,
      saldoRestante: pesos(0),
    },
  ];

  beforeEach(async () => {
    mockRegistrarAbono = {
      registrar: vi.fn().mockResolvedValue({ idAbono: 1, aplicaciones: [] }),
    };
    mockModalCtrl = {
      dismiss: vi.fn().mockResolvedValue(true),
    };
    mockToastCtrl = {
      create: vi.fn().mockResolvedValue({ present: vi.fn().mockResolvedValue(undefined) }),
    };

    await TestBed.configureTestingModule({
      imports: [ResumenAbonoModalComponent],
      providers: [
        { provide: RegistrarAbono, useValue: mockRegistrarAbono },
        { provide: ModalController, useValue: mockModalCtrl },
        { provide: ToastController, useValue: mockToastCtrl },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ResumenAbonoModalComponent);
    component = fixture.componentInstance;
    component.cliente = clienteAna;
    component.solicitud = {
      modo: 'CASCADA_GLOBAL',
      idCliente: 7,
      fecha: fechaHora('2026-11-20 12:00:00'),
      medio: 'EFECTIVO',
      monto: pesos(30000),
    };
    component.montoTotal = pesos(30000);
    component.deudaAnterior = pesos(30000);
    component.lineas = lineas;
    fixture.detectChanges();
  });

  function btnAceptar(): HTMLButtonElement {
    return fixture.debugElement.query(By.css('[data-testid="btn-aceptar-abono"]')).nativeElement;
  }

  function btnVolver(): HTMLButtonElement {
    return fixture.debugElement.query(By.css('[data-testid="btn-volver-editar"]')).nativeElement;
  }

  it('C1 & C2: blocks aceptar() (direct and DOM click), disables both buttons with aria-disabled="true" while volverAEditar() dismiss is pending', async () => {
    let resolverDismiss: (ok: boolean) => void = () => undefined;
    mockModalCtrl.dismiss.mockReturnValueOnce(
      new Promise<boolean>((resolve) => {
        resolverDismiss = resolve;
      }),
    );

    const pVolver = component.volverAEditar();
    fixture.detectChanges();

    expect(Boolean(btnAceptar().disabled)).toBe(true);
    expect(btnAceptar().getAttribute('aria-disabled')).toBe('true');
    expect(Boolean(btnVolver().disabled)).toBe(true);
    expect(btnVolver().getAttribute('aria-disabled')).toBe('true');

    // Second tap on volverAEditar() and aceptar() while dismiss is pending
    const pVolver2 = component.volverAEditar();
    await component.aceptar();
    btnAceptar().click();
    await Promise.resolve();

    expect(mockModalCtrl.dismiss).toHaveBeenCalledTimes(1);
    expect(mockRegistrarAbono.registrar).not.toHaveBeenCalled();

    resolverDismiss(true);
    await Promise.all([pVolver, pVolver2]);
    fixture.detectChanges();

    expect(Boolean(btnAceptar().disabled)).toBe(false);
    expect(btnAceptar().getAttribute('aria-disabled')).toBeNull();
    expect(Boolean(btnVolver().disabled)).toBe(false);
    expect(btnVolver().getAttribute('aria-disabled')).toBeNull();
  });

  it('C3: recovers cleanly on volverAEditar() dismiss rejection, re-enables buttons, and allows subsequent aceptar() once', async () => {
    let rechazarDismiss: (err: Error) => void = () => undefined;
    mockModalCtrl.dismiss.mockReturnValueOnce(
      new Promise<boolean>((_, reject) => {
        rechazarDismiss = reject;
      }),
    );

    const pVolver = component.volverAEditar();
    fixture.detectChanges();
    expect(Boolean(btnAceptar().disabled)).toBe(true);
    expect(Boolean(btnVolver().disabled)).toBe(true);

    rechazarDismiss(new Error('Dismiss rejected'));
    await pVolver;
    fixture.detectChanges();

    expect(Boolean(btnAceptar().disabled)).toBe(false);
    expect(btnAceptar().getAttribute('aria-disabled')).toBeNull();
    expect(Boolean(btnVolver().disabled)).toBe(false);
    expect(btnVolver().getAttribute('aria-disabled')).toBeNull();
    expect(mockRegistrarAbono.registrar).not.toHaveBeenCalled();

    await component.aceptar();
    expect(mockRegistrarAbono.registrar).toHaveBeenCalledTimes(1);
  });
});

describe('Verificacion B4.4 - AbonoModalComponent (C4-C6)', () => {
  let fixture: ComponentFixture<AbonoModalComponent>;
  let component: AbonoModalComponent;
  let mockModalCtrl: {
    create: ReturnType<typeof vi.fn>;
    dismiss: ReturnType<typeof vi.fn>;
  };
  let mockResumenModal: {
    present: ReturnType<typeof vi.fn>;
    onDidDismiss: ReturnType<typeof vi.fn>;
  };
  let mockToastCtrl: { create: ReturnType<typeof vi.fn> };

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

  beforeEach(async () => {
    mockResumenModal = {
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ data: null, role: ROL_CANCELAR }),
    };
    mockModalCtrl = {
      create: vi.fn().mockResolvedValue(mockResumenModal),
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

    fixture = TestBed.createComponent(AbonoModalComponent);
    component = fixture.componentInstance;
    component.cliente = clienteAna;
    component.facturas = [f1, f2];
    fixture.detectChanges();
  });

  function btnRevisar(): HTMLButtonElement {
    return fixture.debugElement.query(By.css('[data-testid="btn-revisar-abono"]')).nativeElement;
  }

  it('C4 & C5: after saved + dismiss failure, stays locked across mode/amount edits, retries dismiss in cancelar(), and never shows error toast', async () => {
    component.monto.set(10000);
    fixture.detectChanges();

    mockResumenModal.onDidDismiss.mockResolvedValueOnce({ data: { guardado: true }, role: ROL_GUARDADO });
    mockModalCtrl.dismiss.mockRejectedValueOnce(new Error('Parent dismiss failed'));

    await component.abrirResumen();
    fixture.detectChanges();

    expect(component.puedeRevisar()).toBe(false);
    expect(Boolean(btnRevisar().disabled)).toBe(true);
    expect(btnRevisar().getAttribute('aria-disabled')).toBe('true');

    // Attempt to bypass by changing mode and amount
    component.onModoChange({ detail: { value: 'LIQUIDACION_TOTAL' } } as CustomEvent);
    fixture.detectChanges();
    expect(component.puedeRevisar()).toBe(false);
    expect(Boolean(btnRevisar().disabled)).toBe(true);

    component.onModoChange({ detail: { value: 'FACTURA_INDIVIDUAL' } } as CustomEvent);
    component.seleccionarFactura(2);
    component.monto.set(5000);
    fixture.detectChanges();
    expect(component.puedeRevisar()).toBe(false);

    mockModalCtrl.create.mockClear();
    await component.abrirResumen();
    expect(mockModalCtrl.create).not.toHaveBeenCalled();

    // Even if cancelar()'s first dismiss also fails, no error toast and next cancelar() still uses ROL_GUARDADO
    mockModalCtrl.dismiss.mockRejectedValueOnce(new Error('Second dismiss failed'));
    await component.cancelar();
    expect(mockToastCtrl.create).not.toHaveBeenCalled();
    expect(component.puedeRevisar()).toBe(false);

    mockModalCtrl.dismiss.mockResolvedValueOnce(true);
    await component.cancelar();
    expect(mockModalCtrl.dismiss).toHaveBeenLastCalledWith({ guardado: true }, ROL_GUARDADO);
    expect(mockToastCtrl.create).not.toHaveBeenCalled();
  });

  it('C4 & C5 edge: if alGuardar fires and summary onDidDismiss rejects, locks review and cancelar() dismisses with ROL_GUARDADO', async () => {
    component.monto.set(10000);
    fixture.detectChanges();

    mockResumenModal.onDidDismiss.mockImplementationOnce(async () => {
      const callArg = mockModalCtrl.create.mock.calls[0][0];
      callArg.componentProps.alGuardar();
      throw new Error('onDidDismiss crashed');
    });

    await component.abrirResumen();
    fixture.detectChanges();

    expect(component.puedeRevisar()).toBe(false);
    expect(Boolean(btnRevisar().disabled)).toBe(true);
    expect(mockToastCtrl.create).not.toHaveBeenCalled();

    mockModalCtrl.create.mockClear();
    await component.abrirResumen();
    expect(mockModalCtrl.create).not.toHaveBeenCalled();

    await component.cancelar();
    expect(mockModalCtrl.dismiss).toHaveBeenLastCalledWith({ guardado: true }, ROL_GUARDADO);
  });

  it('C6: normal flow without dismiss failure dismisses once with ROL_GUARDADO on save and ROL_CANCELAR on cancel without save', async () => {
    component.monto.set(10000);
    fixture.detectChanges();

    await component.cancelar();
    expect(mockModalCtrl.dismiss).toHaveBeenCalledTimes(1);
    expect(mockModalCtrl.dismiss).toHaveBeenLastCalledWith(null, ROL_CANCELAR);

    mockModalCtrl.dismiss.mockClear();
    mockResumenModal.onDidDismiss.mockResolvedValueOnce({ data: { guardado: true }, role: ROL_GUARDADO });
    await component.abrirResumen();
    expect(mockModalCtrl.dismiss).toHaveBeenCalledTimes(1);
    expect(mockModalCtrl.dismiss).toHaveBeenLastCalledWith({ guardado: true }, ROL_GUARDADO);
  });
});

describe('Verificacion B4.4 - ExpedientePage (C7-C8)', () => {
  let fixture: ComponentFixture<ExpedientePage>;
  let component: ExpedientePage;
  let mockConsultarExpediente: { consultar: ReturnType<typeof vi.fn> };
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };
  let paramId = '1';

  const expedienteValido: ExpedienteCliente = {
    cliente: { idCliente: 1, nombre: 'Carlos', telefono: null, esMostrador: false },
    deuda: { total: pesos(15000), capital: pesos(10000), ganancia: pesos(5000) },
    facturas: [
      {
        idVenta: 1,
        fecha: fechaHora('2026-11-10 10:00:00'),
        total: pesos(15000),
        costoBase: pesos(10000),
        pagado: pesos(0),
        saldo: pesos(15000),
        estado: 'PENDIENTE',
        lineas: [{ cantidad: resmas(1), tipoPapel: 'CARTA', precioUnitario: pesos(15000), subtotal: pesos(15000) }],
      },
    ],
    abonos: [],
  };

  beforeEach(async () => {
    paramId = '1';
    mockConsultarExpediente = {
      consultar: vi.fn().mockResolvedValue(expedienteValido),
    };
    mockRouter = {
      navigate: vi.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [ExpedientePage],
      providers: [
        { provide: ConsultarExpediente, useValue: mockConsultarExpediente },
        { provide: Router, useValue: mockRouter },
        {
          provide: ModalController,
          useValue: {
            create: vi.fn().mockResolvedValue({
              present: vi.fn().mockResolvedValue(undefined),
              onDidDismiss: vi.fn().mockResolvedValue({ data: null, role: ROL_CANCELAR }),
            }),
          },
        },
        {
          provide: ToastController,
          useValue: { create: vi.fn().mockResolvedValue({ present: vi.fn().mockResolvedValue(undefined) }) },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            get snapshot() {
              return { paramMap: convertToParamMap({ id: paramId }) };
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpedientePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function textoError(): string {
    return fixture.debugElement.query(By.css('[data-testid="mensaje-error-carga"]')).nativeElement.textContent.trim();
  }

  it('C7: invalid route ids (including abc, 0, -3, empty, whitespace, float) cancel in-flight load (both resolve and reject)', async () => {
    for (const invalidId of ['abc', '0', '-3', '', '   ', '1.5']) {
      paramId = '1';
      let resolver: (e: ExpedienteCliente) => void = () => undefined;
      mockConsultarExpediente.consultar.mockReturnValueOnce(
        new Promise<ExpedienteCliente>((resolve) => {
          resolver = resolve;
        }),
      );

      const carga = component.ionViewWillEnter();
      fixture.detectChanges();
      expect(component.cargando()).toBe(true);

      paramId = invalidId;
      await component.ionViewWillEnter();
      fixture.detectChanges();

      expect(component.cargando()).toBe(false);
      expect(component.expediente()).toBeNull();
      expect(textoError()).toBe(MENSAJES_ERROR.CLIENTE_INEXISTENTE);

      resolver(expedienteValido);
      await carga;
      fixture.detectChanges();

      expect(component.cargando()).toBe(false);
      expect(component.expediente()).toBeNull();
      expect(textoError()).toBe(MENSAJES_ERROR.CLIENTE_INEXISTENTE);
    }

    // Also when the stale in-flight load rejects instead of resolving
    paramId = '1';
    let rechazar: (err: Error) => void = () => undefined;
    mockConsultarExpediente.consultar.mockReturnValueOnce(
      new Promise<ExpedienteCliente>((_, reject) => {
        rechazar = reject;
      }),
    );

    const cargaFallida = component.ionViewWillEnter();
    paramId = '0';
    await component.ionViewWillEnter();
    fixture.detectChanges();

    rechazar(new Error('DB failure'));
    await cargaFallida;
    fixture.detectChanges();

    expect(component.cargando()).toBe(false);
    expect(component.expediente()).toBeNull();
    expect(textoError()).toBe(MENSAJES_ERROR.CLIENTE_INEXISTENTE);
    expect(fixture.debugElement.query(By.css('[data-testid="btn-reintentar"]'))).toBeNull();
  });

  it('C8: valid id loads, retries after failure, and discards stale responses', async () => {
    paramId = '1';
    mockConsultarExpediente.consultar.mockRejectedValueOnce(new Error('Transient failure'));
    await component.ionViewWillEnter();
    fixture.detectChanges();

    expect(textoError()).toBe(MENSAJE_ERROR_GENERICO);
    expect(fixture.debugElement.query(By.css('[data-testid="btn-reintentar"]'))).toBeTruthy();

    mockConsultarExpediente.consultar.mockResolvedValueOnce(expedienteValido);
    await component.reintentar();
    fixture.detectChanges();
    expect(component.expediente()?.cliente.nombre).toBe('Carlos');

    let resolver1: (e: ExpedienteCliente) => void = () => undefined;
    let resolver2: (e: ExpedienteCliente) => void = () => undefined;
    mockConsultarExpediente.consultar
      .mockReturnValueOnce(new Promise((r) => (resolver1 = r)))
      .mockReturnValueOnce(new Promise((r) => (resolver2 = r)));

    const p1 = component.ionViewWillEnter();
    const p2 = component.ionViewWillEnter();

    resolver2({ ...expedienteValido, cliente: { ...expedienteValido.cliente, nombre: 'Carlos Dos' } });
    await p2;
    resolver1({ ...expedienteValido, cliente: { ...expedienteValido.cliente, nombre: 'Carlos Uno' } });
    await p1;
    fixture.detectChanges();

    expect(component.expediente()?.cliente.nombre).toBe('Carlos Dos');
  });
});
