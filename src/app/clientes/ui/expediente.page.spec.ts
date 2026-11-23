import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { ModalController, ToastController } from '@ionic/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ExpedienteCliente } from '../../cartera/application/consultar-expediente';
import { ConsultarExpediente } from '../../cartera/application/consultar-expediente';
import type { AbonoExpediente, FacturaExpediente } from '../../cartera/infrastructure/cartera.repository';
import { AbonoModalComponent } from '../../cartera/ui/abono.modal';
import { fechaHora, pesos, ReglaNegocioError, resmas } from '../../shared/domain';
import { ROL_CANCELAR, ROL_GUARDADO, soloCierreExplicito } from '../../shared/ui/formulario';
import { MENSAJE_ERROR_GENERICO, MENSAJES_ERROR } from '../../shared/ui/mensajes-error';

import { ClienteModalComponent } from './cliente.modal';
import { ExpedientePage } from './expediente.page';

describe('ExpedientePage', () => {
  let fixture: ComponentFixture<ExpedientePage>;
  let component: ExpedientePage;
  let mockConsultarExpediente: { consultar: ReturnType<typeof vi.fn> };
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };
  let mockModalCtrl: { create: ReturnType<typeof vi.fn> };
  let mockModal: { present: ReturnType<typeof vi.fn>; onDidDismiss: ReturnType<typeof vi.fn> };
  let mockToastCtrl: { create: ReturnType<typeof vi.fn> };
  let paramId = '7';

  const ana = {
    idCliente: 7,
    nombre: 'Ana',
    telefono: '3104567890',
    esMostrador: false,
  };

  const factura2: FacturaExpediente = {
    idVenta: 2,
    fecha: fechaHora('2026-11-10 10:00:00'),
    total: pesos(15000),
    costoBase: pesos(10000),
    pagado: pesos(5000),
    saldo: pesos(10000),
    estado: 'PARCIAL',
    lineas: [{ cantidad: resmas(1), tipoPapel: 'OFICIO', precioUnitario: pesos(15000), subtotal: pesos(15000) }],
  };

  const factura1: FacturaExpediente = {
    idVenta: 1,
    fecha: fechaHora('2026-11-01 10:00:00'),
    total: pesos(30000),
    costoBase: pesos(20000),
    pagado: pesos(0),
    saldo: pesos(30000),
    estado: 'PENDIENTE',
    lineas: [{ cantidad: resmas(2), tipoPapel: 'CARTA', precioUnitario: pesos(15000), subtotal: pesos(30000) }],
  };

  const abonoInicial: AbonoExpediente = {
    idAbono: 1,
    fecha: fechaHora('2026-11-10 10:00:00'),
    monto: pesos(5000),
    medio: 'EFECTIVO',
    tipo: 'ABONO_INICIAL',
    aplicaciones: [{ idVenta: 2, monto: pesos(5000) }],
  };

  const expedienteBase: ExpedienteCliente = {
    cliente: ana,
    deuda: { total: pesos(40000), capital: pesos(25000), ganancia: pesos(15000) },
    facturas: [factura2, factura1],
    abonos: [abonoInicial],
  };

  beforeEach(async () => {
    paramId = '7';
    mockConsultarExpediente = {
      consultar: vi.fn().mockResolvedValue(expedienteBase),
    };
    mockRouter = {
      navigate: vi.fn().mockResolvedValue(true),
    };
    mockModal = {
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ data: null, role: ROL_CANCELAR }),
    };
    mockModalCtrl = {
      create: vi.fn().mockResolvedValue(mockModal),
    };
    mockToastCtrl = {
      create: vi.fn().mockResolvedValue({ present: vi.fn().mockResolvedValue(undefined) }),
    };

    await TestBed.configureTestingModule({
      imports: [ExpedientePage],
      providers: [
        { provide: ConsultarExpediente, useValue: mockConsultarExpediente },
        { provide: Router, useValue: mockRouter },
        { provide: ModalController, useValue: mockModalCtrl },
        { provide: ToastController, useValue: mockToastCtrl },
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

  function textoDe(selector: string): string {
    return fixture.debugElement.query(By.css(selector)).nativeElement.textContent.replace(/\s+/g, ' ').trim();
  }

  it('C1, C2, C18: displays header, debt breakdown, enabled buttons and accessible Back/Edit controls', async () => {
    await component.ionViewWillEnter();
    fixture.detectChanges();

    const btnVolver = fixture.debugElement.query(By.css('[data-testid="btn-volver"]')).nativeElement as HTMLElement;
    expect(btnVolver.getAttribute('aria-label')).toBe('Volver');
    btnVolver.click();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/clientes']);

    const btnEditar = fixture.debugElement.query(By.css('[data-testid="btn-editar-cliente"]'))
      .nativeElement as HTMLElement;
    expect(btnEditar.getAttribute('aria-label')).toBe('Editar cliente');

    expect(textoDe('.exp-avatar')).toBe('A');
    expect(textoDe('[data-testid="expediente-nombre"]')).toBe('Ana');
    expect(textoDe('[data-testid="expediente-celular"]')).toBe('3104567890');
    expect(textoDe('[data-testid="expediente-deuda-total"]')).toBe('$ 40.000');
    expect(textoDe('[data-testid="expediente-facturas-con-saldo"]')).toBe('2 facturas con saldo');
    expect(textoDe('[data-testid="expediente-capital"]')).toBe('$ 25.000');
    expect(textoDe('[data-testid="expediente-ganancia"]')).toBe('$ 15.000');

    const btnAbono = fixture.debugElement.query(By.css('[data-testid="btn-registrar-abono"]')).nativeElement;
    const btnPagarTodo = fixture.debugElement.query(By.css('[data-testid="btn-pagar-todo"]')).nativeElement;
    expect(Boolean(btnAbono.disabled)).toBe(false);
    expect(Boolean(btnPagarTodo.disabled)).toBe(false);
    expect(btnPagarTodo.textContent.replace(/\s+/g, ' ').trim()).toBe('Pagar todo · $ 40.000');

    const segment = fixture.debugElement.query(By.css('[data-testid="segment-expediente"]'))
      .nativeElement as HTMLElement;
    expect(segment.getAttribute('aria-label')).toBeTruthy();
  });

  it('C2 & C3: shows "Sin celular", singular "1 factura con saldo", and "Al día" with disabled buttons at $0 debt', async () => {
    mockConsultarExpediente.consultar.mockResolvedValueOnce({
      cliente: { idCliente: 8, nombre: 'Luis', telefono: null, esMostrador: false },
      deuda: { total: pesos(10000), capital: pesos(6000), ganancia: pesos(4000) },
      facturas: [factura2],
      abonos: [],
    });

    await component.ionViewWillEnter();
    fixture.detectChanges();

    expect(textoDe('[data-testid="expediente-celular"]')).toBe('Sin celular');
    expect(textoDe('[data-testid="expediente-facturas-con-saldo"]')).toBe('1 factura con saldo');

    mockConsultarExpediente.consultar.mockResolvedValueOnce({
      cliente: ana,
      deuda: { total: pesos(0), capital: pesos(0), ganancia: pesos(0) },
      facturas: [{ ...factura2, pagado: pesos(15000), saldo: pesos(0), estado: 'PAGADA' }],
      abonos: [abonoInicial],
    });

    await component.ionViewWillEnter();
    fixture.detectChanges();

    expect(textoDe('[data-testid="expediente-deuda-total"]')).toBe('$ 0');
    expect(textoDe('[data-testid="expediente-facturas-con-saldo"]')).toBe('Al día');

    const btnAbono = fixture.debugElement.query(By.css('[data-testid="btn-registrar-abono"]')).nativeElement;
    const btnPagarTodo = fixture.debugElement.query(By.css('[data-testid="btn-pagar-todo"]')).nativeElement;
    expect(Boolean(btnAbono.disabled)).toBe(true);
    expect(btnAbono.getAttribute('aria-disabled')).toBe('true');
    expect(Boolean(btnPagarTodo.disabled)).toBe(true);
    expect(btnPagarTodo.getAttribute('aria-disabled')).toBe('true');
  });

  it('C4, C5, C6: renders invoices newest first with exact status colors, lines, paid/balance and paid invoice hiding', async () => {
    const facturaPagada: FacturaExpediente = {
      idVenta: 3,
      fecha: fechaHora('2026-11-12 09:05:00'),
      total: pesos(50000),
      costoBase: pesos(30000),
      pagado: pesos(50000),
      saldo: pesos(0),
      estado: 'PAGADA',
      lineas: [
        { cantidad: resmas(1), tipoPapel: 'OFICIO', precioUnitario: pesos(25000), subtotal: pesos(25000) },
        { cantidad: resmas(1), tipoPapel: 'CARTA', precioUnitario: pesos(25000), subtotal: pesos(25000) },
      ],
    };

    mockConsultarExpediente.consultar.mockResolvedValueOnce({
      ...expedienteBase,
      facturas: [facturaPagada, factura2, factura1],
    });

    await component.ionViewWillEnter();
    fixture.detectChanges();

    expect(textoDe('[data-testid="segment-facturas"]')).toBe('Facturas · 3');
    expect(textoDe('[data-testid="segment-abonos"]')).toBe('Abonos · 1');

    const tarjetas = fixture.debugElement.queryAll(By.css('[data-testid="tarjeta-factura"]'));
    expect(tarjetas).toHaveLength(3);

    // F3 (PAGADA) with two lines in order and no Pagado/Saldo/Abonar button
    expect(tarjetas[0].nativeElement.textContent).toContain('Factura #3');
    const chip0 = tarjetas[0].query(By.css('[data-testid="estado-factura"]')).nativeElement as HTMLElement;
    expect(chip0.textContent?.trim()).toBe('Pagada');
    expect(chip0.classList.contains('app-chip-pagada')).toBe(true);
    const lineasF3 = tarjetas[0].queryAll(By.css('.linea-factura'));
    expect(lineasF3).toHaveLength(2);
    expect(lineasF3[0].nativeElement.textContent.replace(/\s+/g, ' ').trim()).toContain('1 × Oficio · $ 25.000 c/u');
    expect(lineasF3[0].nativeElement.textContent.replace(/\s+/g, ' ').trim()).toContain('$ 25.000');
    expect(lineasF3[1].nativeElement.textContent.replace(/\s+/g, ' ').trim()).toContain('1 × Carta · $ 25.000 c/u');
    expect(lineasF3[1].nativeElement.textContent.replace(/\s+/g, ' ').trim()).toContain('$ 25.000');
    expect(tarjetas[0].nativeElement.textContent).not.toContain('Pagado');
    expect(tarjetas[0].nativeElement.textContent).not.toContain('Saldo');
    expect(tarjetas[0].query(By.css('[data-testid="btn-abonar-factura"]'))).toBeNull();

    // F2 (PARCIAL)
    expect(tarjetas[1].nativeElement.textContent).toContain('Factura #2');
    expect(tarjetas[1].nativeElement.textContent).toContain('10 nov 2026 · 10:00 a. m.');
    const chip1 = tarjetas[1].query(By.css('[data-testid="estado-factura"]')).nativeElement as HTMLElement;
    expect(chip1.textContent?.trim()).toBe('Abonada parcialmente');
    expect(chip1.classList.contains('app-chip-parcial')).toBe(true);
    expect(tarjetas[1].nativeElement.textContent.replace(/\s+/g, ' ')).toContain('1 × Oficio · $ 15.000 c/u');
    expect(tarjetas[1].nativeElement.textContent.replace(/\s+/g, ' ')).toContain('Pagado $ 5.000 de $ 15.000');
    expect(tarjetas[1].nativeElement.textContent.replace(/\s+/g, ' ')).toContain('Saldo');
    expect(tarjetas[1].nativeElement.textContent.replace(/\s+/g, ' ')).toContain('$ 10.000');
    expect(tarjetas[1].query(By.css('[data-testid="btn-abonar-factura"]'))).toBeTruthy();

    // F1 (PENDIENTE)
    expect(tarjetas[2].nativeElement.textContent).toContain('Factura #1');
    const chip2 = tarjetas[2].query(By.css('[data-testid="estado-factura"]')).nativeElement as HTMLElement;
    expect(chip2.textContent?.trim()).toBe('Pendiente');
    expect(chip2.classList.contains('app-chip-pendiente')).toBe(true);
    expect(tarjetas[2].nativeElement.textContent.replace(/\s+/g, ' ')).toContain('2 × Carta · $ 15.000 c/u');
    expect(tarjetas[2].nativeElement.textContent.replace(/\s+/g, ' ')).toContain('Pagado');
    expect(tarjetas[2].nativeElement.textContent.replace(/\s+/g, ' ')).toContain('$ 0 de $ 30.000');
    expect(tarjetas[2].nativeElement.textContent.replace(/\s+/g, ' ')).toContain('Saldo');
    expect(tarjetas[2].nativeElement.textContent.replace(/\s+/g, ' ')).toContain('$ 30.000');
  });

  it('C7 & C8: renders Abonos tab with payment types, medium chips, and "quedó pagada" only where completed', async () => {
    const abonoCascada: AbonoExpediente = {
      idAbono: 2,
      fecha: fechaHora('2026-11-12 14:00:00'),
      monto: pesos(35000),
      medio: 'TRANSFERENCIA',
      tipo: 'CASCADA_GLOBAL',
      aplicaciones: [
        { idVenta: 1, monto: pesos(30000) },
        { idVenta: 2, monto: pesos(5000) },
      ],
    };

    mockConsultarExpediente.consultar.mockResolvedValueOnce({
      ...expedienteBase,
      abonos: [abonoCascada, abonoInicial],
    });

    await component.ionViewWillEnter();
    component.onPestanaChange({ detail: { value: 'abonos' } } as CustomEvent);
    fixture.detectChanges();

    const tarjetas = fixture.debugElement.queryAll(By.css('[data-testid="tarjeta-abono"]'));
    expect(tarjetas).toHaveLength(2);

    // Newest first: abonoCascada
    expect(tarjetas[0].nativeElement.textContent).toContain('$ 35.000');
    expect(tarjetas[0].nativeElement.textContent).toContain('12 nov 2026 · 2:00 p. m. · A la deuda');
    expect(tarjetas[0].query(By.css('.app-chip-transferencia')).nativeElement.textContent).toContain('Transferencia');
    const apps0 = tarjetas[0].queryAll(By.css('[data-testid="aplicacion-abono"]'));
    expect(apps0[0].nativeElement.textContent.replace(/\s+/g, ' ').trim()).toContain('Factura #1 · quedó pagada');
    expect(apps0[0].nativeElement.textContent.replace(/\s+/g, ' ').trim()).toContain('$ 30.000');
    expect(apps0[1].nativeElement.textContent.replace(/\s+/g, ' ').trim()).toContain('Factura #2');
    expect(apps0[1].nativeElement.textContent.replace(/\s+/g, ' ').trim()).toContain('$ 5.000');
    expect(apps0[1].nativeElement.textContent).not.toContain('quedó pagada');

    // Older: abonoInicial
    expect(tarjetas[1].nativeElement.textContent).toContain('$ 5.000');
    expect(tarjetas[1].nativeElement.textContent).toContain('10 nov 2026 · 10:00 a. m. · Abono inicial');
    expect(tarjetas[1].query(By.css('.app-chip-efectivo')).nativeElement.textContent).toContain('Efectivo');
    const apps1 = tarjetas[1].queryAll(By.css('[data-testid="aplicacion-abono"]'));
    expect(apps1[0].nativeElement.textContent.replace(/\s+/g, ' ').trim()).toBe('Factura #2 $ 5.000');
  });

  it('C9 & C11: opens AbonoModalComponent with open invoices oldest-first and reloads only on ROL_GUARDADO', async () => {
    const facturaPagada: FacturaExpediente = {
      idVenta: 3,
      fecha: fechaHora('2026-11-12 09:00:00'),
      total: pesos(10000),
      costoBase: pesos(6000),
      pagado: pesos(10000),
      saldo: pesos(0),
      estado: 'PAGADA',
      lineas: [],
    };
    mockConsultarExpediente.consultar.mockResolvedValueOnce({
      ...expedienteBase,
      facturas: [facturaPagada, factura2, factura1],
    });

    await component.ionViewWillEnter();
    fixture.detectChanges();

    const esperadasAbiertas = [
      {
        idVenta: 1,
        fecha: factura1.fecha,
        total: factura1.total,
        costoBase: factura1.costoBase,
        pagado: factura1.pagado,
      },
      {
        idVenta: 2,
        fecha: factura2.fecha,
        total: factura2.total,
        costoBase: factura2.costoBase,
        pagado: factura2.pagado,
      },
    ];

    // Registrar abono -> CASCADA_GLOBAL, ROL_CANCELAR does not reload
    fixture.debugElement.query(By.css('[data-testid="btn-registrar-abono"]')).triggerEventHandler('click', null);
    await new Promise((r) => setTimeout(r, 0));

    expect(mockModalCtrl.create).toHaveBeenCalledWith({
      component: AbonoModalComponent,
      componentProps: {
        cliente: ana,
        facturas: esperadasAbiertas,
        modoInicial: 'CASCADA_GLOBAL',
      },
      canDismiss: soloCierreExplicito,
      cssClass: 'modal-sheet',
      breakpoints: [0, 1],
      initialBreakpoint: 1,
    });
    expect(mockConsultarExpediente.consultar).toHaveBeenCalledTimes(1);

    // Pagar todo -> LIQUIDACION_TOTAL
    fixture.debugElement.query(By.css('[data-testid="btn-pagar-todo"]')).triggerEventHandler('click', null);
    await new Promise((r) => setTimeout(r, 0));
    expect(mockModalCtrl.create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        componentProps: {
          cliente: ana,
          facturas: esperadasAbiertas,
          modoInicial: 'LIQUIDACION_TOTAL',
        },
      }),
    );

    // Abonar a esta factura on F2 -> FACTURA_INDIVIDUAL + idVentaInicial: 2, ROL_GUARDADO reloads
    mockModal.onDidDismiss.mockResolvedValueOnce({ data: { guardado: true }, role: ROL_GUARDADO });
    const btnsAbonarFactura = fixture.debugElement.queryAll(By.css('[data-testid="btn-abonar-factura"]'));
    btnsAbonarFactura[0].nativeElement.click();
    await new Promise((r) => setTimeout(r, 0));

    expect(mockModalCtrl.create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        componentProps: {
          cliente: ana,
          facturas: esperadasAbiertas,
          modoInicial: 'FACTURA_INDIVIDUAL',
          idVentaInicial: 2,
        },
      }),
    );
    expect(mockConsultarExpediente.consultar).toHaveBeenCalledTimes(2);
  });

  it('C12: Editar opens ClienteModalComponent and reloads dossier when saved', async () => {
    await component.ionViewWillEnter();
    fixture.detectChanges();

    mockModal.onDidDismiss.mockResolvedValueOnce({ data: null, role: ROL_GUARDADO });
    mockConsultarExpediente.consultar.mockResolvedValueOnce({
      ...expedienteBase,
      cliente: { ...ana, nombre: 'Ana María' },
    });

    fixture.debugElement.query(By.css('[data-testid="btn-editar-cliente"]')).triggerEventHandler('click', null);
    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();

    expect(mockModalCtrl.create).toHaveBeenCalledWith({
      component: ClienteModalComponent,
      componentProps: { cliente: ana },
      canDismiss: soloCierreExplicito,
      cssClass: 'modal-sheet',
      breakpoints: [0, 0.65, 0.9],
      initialBreakpoint: 0.65,
    });
    expect(textoDe('[data-testid="expediente-nombre"]')).toBe('Ana María');
  });

  it('C13: handles loading, empty invoices, empty payments, generic error with Retry, and CLIENTE_INEXISTENTE', async () => {
    // 1. Loading state disables buttons
    let resolverCarga: (e: ExpedienteCliente) => void = () => undefined;
    mockConsultarExpediente.consultar.mockReturnValueOnce(
      new Promise<ExpedienteCliente>((resolve) => {
        resolverCarga = resolve;
      }),
    );
    const cargaPromise = component.ionViewWillEnter();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="indicador-carga"]'))).toBeTruthy();
    expect(
      Boolean(fixture.debugElement.query(By.css('[data-testid="btn-registrar-abono"]')).nativeElement.disabled),
    ).toBe(true);
    expect(Boolean(fixture.debugElement.query(By.css('[data-testid="btn-pagar-todo"]')).nativeElement.disabled)).toBe(
      true,
    );

    resolverCarga({
      cliente: ana,
      deuda: { total: pesos(0), capital: pesos(0), ganancia: pesos(0) },
      facturas: [],
      abonos: [],
    });
    await cargaPromise;
    fixture.detectChanges();

    // 2. Empty invoices and empty payments
    expect(textoDe('[data-testid="mensaje-sin-compras"]')).toBe('Este cliente todavía no tiene compras');
    component.onPestanaChange({ detail: { value: 'abonos' } } as CustomEvent);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="mensaje-sin-abonos"]'))).toBeTruthy();

    // 3. Generic error shows error message (never "sin compras") with Volver & Reintentar; Retry recovers
    mockConsultarExpediente.consultar.mockRejectedValueOnce(new Error('SQLite failure'));
    await component.ionViewWillEnter();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="mensaje-sin-compras"]'))).toBeNull();
    expect(textoDe('[data-testid="mensaje-error-carga"]')).toBe(MENSAJE_ERROR_GENERICO);
    expect(fixture.debugElement.query(By.css('[data-testid="btn-volver-error"]'))).toBeTruthy();

    mockConsultarExpediente.consultar.mockResolvedValueOnce(expedienteBase);
    fixture.debugElement.query(By.css('[data-testid="btn-reintentar"]')).triggerEventHandler('click', null);
    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();

    expect(textoDe('[data-testid="expediente-nombre"]')).toBe('Ana');

    // 4. CLIENTE_INEXISTENTE shows "El cliente no existe" with Volver only
    mockConsultarExpediente.consultar.mockRejectedValueOnce(
      new ReglaNegocioError('CLIENTE_INEXISTENTE', 'Customer not found'),
    );
    await component.ionViewWillEnter();
    fixture.detectChanges();

    expect(textoDe('[data-testid="mensaje-error-carga"]')).toBe(MENSAJES_ERROR.CLIENTE_INEXISTENTE);
    expect(fixture.debugElement.query(By.css('[data-testid="btn-volver-error"]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[data-testid="btn-reintentar"]'))).toBeNull();
  });

  it('C14: discards stale load responses when a newer request completes first', async () => {
    let resolverPrimera: (e: ExpedienteCliente) => void = () => undefined;
    let resolverSegunda: (e: ExpedienteCliente) => void = () => undefined;

    mockConsultarExpediente.consultar
      .mockReturnValueOnce(new Promise<ExpedienteCliente>((r) => (resolverPrimera = r)))
      .mockReturnValueOnce(new Promise<ExpedienteCliente>((r) => (resolverSegunda = r)));

    const p1 = component.ionViewWillEnter();
    const p2 = component.ionViewWillEnter();

    resolverSegunda({ ...expedienteBase, cliente: { ...ana, nombre: 'Ana Nueva' } });
    await p2;
    resolverPrimera({ ...expedienteBase, cliente: { ...ana, nombre: 'Ana Vieja' } });
    await p1;
    fixture.detectChanges();

    expect(textoDe('[data-testid="expediente-nombre"]')).toBe('Ana Nueva');
  });
});
