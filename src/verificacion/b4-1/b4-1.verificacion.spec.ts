import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { ModalController, ToastController } from '@ionic/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConsultarCartera } from '../../app/cartera/application/consultar-cartera';
import { RegistrarAbono } from '../../app/cartera/application/registrar-abono';
import { AbonoRepository } from '../../app/cartera/infrastructure/abono.repository';
import { CarteraRepository } from '../../app/cartera/infrastructure/cartera.repository';
import { BuscarClientes } from '../../app/clientes/application/buscar-clientes';
import { ClienteRepository } from '../../app/clientes/infrastructure/cliente.repository';
import { ClientesPage } from '../../app/clientes/ui/clientes.page';
import { LibroRepository } from '../../app/finanzas/infrastructure/libro.repository';
import { fechaHora, pesos } from '../../app/shared/domain';
import { CLOCK } from '../../app/shared/infrastructure/clock/clock.token';
import { MIGRACIONES } from '../../app/shared/infrastructure/sqlite/migrations';
import { migrar } from '../../app/shared/infrastructure/sqlite/migrations/migration-runner';
import { SQL_DATABASE } from '../../app/shared/infrastructure/sqlite/sql-database.token';
import { ROL_GUARDADO } from '../../app/shared/ui/formulario';
import { MENSAJE_ERROR_GENERICO } from '../../app/shared/ui/mensajes-error';
import { SqlJsDatabase } from '../../testing/sqljs-sql-database.adapter';

describe('Verificacion independiente B4.1-directorio-deuda', () => {
  let db: SqlJsDatabase;
  let carteraRepo: CarteraRepository;
  let consultarCartera: ConsultarCartera;
  let registrarAbono: RegistrarAbono;
  let buscarClientes: BuscarClientes;

  let fixture: ComponentFixture<ClientesPage>;
  let page: ClientesPage;
  let mockModalCtrl: { create: ReturnType<typeof vi.fn> };
  let mockToastCtrl: { create: ReturnType<typeof vi.fn> };
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };

  let idAna: number;
  let idBeto: number;
  let idCarla: number;
  let idMostrador: number;

  const ahora = fechaHora('2026-11-20 12:00:00');
  const fechaSetup = fechaHora('2026-11-01 09:00:00');
  const fechaF1 = fechaHora('2026-11-01 10:00:00');
  const fechaF2 = fechaHora('2026-11-10 10:00:00');

  function textOf(selector: string): string {
    const el = fixture.debugElement.query(By.css(selector));
    expect(el, `Missing element ${selector}`).toBeTruthy();
    return el.nativeElement.textContent.replace(/\s+/g, ' ').trim();
  }

  async function seedBaseScenario(): Promise<void> {
    const anaRes = await db.run(
      `INSERT INTO clientes (nombre, telefono, es_mostrador, fecha_registro) VALUES ('Ana', '3001112233', 0, ?);`,
      [fechaSetup],
    );
    idAna = anaRes.lastInsertId!;

    const betoRes = await db.run(
      `INSERT INTO clientes (nombre, telefono, es_mostrador, fecha_registro) VALUES ('Beto', '3002223344', 0, ?);`,
      [fechaSetup],
    );
    idBeto = betoRes.lastInsertId!;

    const carlaRes = await db.run(
      `INSERT INTO clientes (nombre, telefono, es_mostrador, fecha_registro) VALUES ('Carla', '3003334455', 0, ?);`,
      [fechaSetup],
    );
    idCarla = carlaRes.lastInsertId!;

    const mostradorRows = await db.query<{ id_cliente: number }>(
      `SELECT id_cliente FROM clientes WHERE es_mostrador = 1;`,
    );
    idMostrador = mostradorRows[0].id_cliente;

    // Ana: F1 ($30.000 pending) + F2 ($15.000 total, $5.000 paid, $10.000 pending) + F3 ($15.000 paid in full)
    await db.run(
      `INSERT INTO ventas (id_cliente, fecha_venta, total_venta, costo_total_base, monto_pagado, saldo_pendiente, estado_pago)
       VALUES (?, ?, 30000, 20000, 0, 30000, 'PENDIENTE');`,
      [idAna, fechaF1],
    );
    await db.run(
      `INSERT INTO ventas (id_cliente, fecha_venta, total_venta, costo_total_base, monto_pagado, saldo_pendiente, estado_pago)
       VALUES (?, ?, 15000, 10000, 5000, 10000, 'PARCIAL');`,
      [idAna, fechaF2],
    );
    await db.run(
      `INSERT INTO ventas (id_cliente, fecha_venta, total_venta, costo_total_base, monto_pagado, saldo_pendiente, estado_pago)
       VALUES (?, ?, 15000, 10000, 15000, 0, 'PAGADA');`,
      [idAna, fechaF2],
    );

    // Carla: 1 invoice ($22.000 pending)
    await db.run(
      `INSERT INTO ventas (id_cliente, fecha_venta, total_venta, costo_total_base, monto_pagado, saldo_pendiente, estado_pago)
       VALUES (?, ?, 22000, 15000, 0, 22000, 'PENDIENTE');`,
      [idCarla, fechaF2],
    );

    // Mostrador: paid sale
    await db.run(
      `INSERT INTO ventas (id_cliente, fecha_venta, total_venta, costo_total_base, monto_pagado, saldo_pendiente, estado_pago)
       VALUES (?, ?, 15000, 10000, 15000, 0, 'PAGADA');`,
      [idMostrador, fechaF2],
    );
  }

  beforeEach(async () => {
    db = await SqlJsDatabase.create();
    await migrar(db, MIGRACIONES);

    mockModalCtrl = {
      create: vi.fn().mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
        onDidDismiss: vi.fn().mockResolvedValue({ data: null, role: 'cancel' }),
      }),
    };
    mockToastCtrl = {
      create: vi.fn().mockResolvedValue({ present: vi.fn().mockResolvedValue(undefined) }),
    };
    mockRouter = {
      navigate: vi.fn().mockResolvedValue(true),
    };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ClientesPage],
      providers: [
        CarteraRepository,
        ConsultarCartera,
        RegistrarAbono,
        AbonoRepository,
        ClienteRepository,
        BuscarClientes,
        LibroRepository,
        { provide: SQL_DATABASE, useValue: db },
        { provide: CLOCK, useValue: { ahora: () => ahora } },
        { provide: Router, useValue: mockRouter },
        { provide: ModalController, useValue: mockModalCtrl },
        { provide: ToastController, useValue: mockToastCtrl },
      ],
    }).compileComponents();

    carteraRepo = TestBed.inject(CarteraRepository);
    consultarCartera = TestBed.inject(ConsultarCartera);
    registrarAbono = TestBed.inject(RegistrarAbono);
    buscarClientes = TestBed.inject(BuscarClientes);

    fixture = TestBed.createComponent(ClientesPage);
    page = fixture.componentInstance;
  });

  it('C1: deudasPorCliente ejecuta una sola consulta y excluye pagadas, sin compras y Mostrador; ConsultarCartera suma 62000', async () => {
    await seedBaseScenario();

    // Cliente adicional con todas sus facturas pagadas y otro con saldo limite 1 peso
    const dianaRes = await db.run(
      `INSERT INTO clientes (nombre, telefono, es_mostrador, fecha_registro) VALUES ('Diana', '3004445566', 0, ?);`,
      [fechaSetup],
    );
    const idDiana = dianaRes.lastInsertId!;
    await db.run(
      `INSERT INTO ventas (id_cliente, fecha_venta, total_venta, costo_total_base, monto_pagado, saldo_pendiente, estado_pago)
       VALUES (?, ?, 15000, 10000, 15000, 0, 'PAGADA');`,
      [idDiana, fechaF2],
    );

    const querySpy = vi.spyOn(db, 'query');
    const deudas = await carteraRepo.deudasPorCliente(db);

    expect(querySpy).toHaveBeenCalledTimes(1);
    expect(deudas.size).toBe(2);
    expect(deudas.get(idAna)).toEqual({ deuda: pesos(40000), facturas: 2 });
    expect(deudas.get(idCarla)).toEqual({ deuda: pesos(22000), facturas: 1 });
    expect(deudas.has(idBeto)).toBe(false);
    expect(deudas.has(idDiana)).toBe(false);
    expect(deudas.has(idMostrador)).toBe(false);

    const resumen = await consultarCartera.consultar();
    expect(resumen.total).toBe(62000);
    expect(resumen.porCliente.get(idAna)).toEqual({ deuda: pesos(40000), facturas: 2 });
    expect(resumen.porCliente.get(idCarla)).toEqual({ deuda: pesos(22000), facturas: 1 });

    // Valor limite exacto: saldo_pendiente = 1 peso si cuenta como deuda
    const evaRes = await db.run(
      `INSERT INTO clientes (nombre, telefono, es_mostrador, fecha_registro) VALUES ('Eva', '3005556677', 0, ?);`,
      [fechaSetup],
    );
    const idEva = evaRes.lastInsertId!;
    await db.run(
      `INSERT INTO ventas (id_cliente, fecha_venta, total_venta, costo_total_base, monto_pagado, saldo_pendiente, estado_pago)
       VALUES (?, ?, 1000, 500, 999, 1, 'PARCIAL');`,
      [idEva, fechaF2],
    );
    const resumenConLimite = await consultarCartera.consultar();
    expect(resumenConLimite.porCliente.get(idEva)).toEqual({ deuda: pesos(1), facturas: 1 });
    expect(resumenConLimite.total).toBe(62001);
  });

  it('C2, C3, C9, C11: cabecera, filas (segundo y ultimo elemento), accesibilidad y recarga en ionViewWillEnter tras liquidar Carla', async () => {
    await seedBaseScenario();

    await page.ionViewWillEnter();
    fixture.detectChanges();

    // C2 cabecera
    expect(textOf('[data-testid="cantidad-clientes"]')).toBe('3 clientes');
    expect(textOf('.resumen-cartera .resumen-etiqueta')).toBe('Por cobrar');
    const totalEl = fixture.debugElement.query(By.css('[data-testid="total-por-cobrar"]'));
    expect(totalEl.nativeElement.textContent.replace(/\s+/g, ' ').trim()).toBe('$ 62.000');
    expect(totalEl.nativeElement.classList.contains('tiene-deuda')).toBe(true);
    expect(textOf('[data-testid="cantidad-con-deuda"]')).toBe('2 clientes con deuda');

    // C3 y C11: Ana, Beto (segundo), Carla (ultimo), Mostrador excluido
    const items = fixture.debugElement.queryAll(By.css('[data-testid="item-cliente"]'));
    expect(items).toHaveLength(3);
    const textosFilas = items.map((item) => item.nativeElement.textContent.replace(/\s+/g, ' ').trim());
    expect(textosFilas.some((t) => t.includes('Mostrador'))).toBe(false);

    // Ana (primero)
    expect(items[0].nativeElement.textContent).toContain('Ana');
    expect(items[0].query(By.css('[data-testid="deuda-cliente"]')).nativeElement.textContent.trim()).toBe('$ 40.000');
    expect(items[0].query(By.css('[data-testid="facturas-cliente"]')).nativeElement.textContent.trim()).toBe(
      '2 facturas',
    );
    expect(items[0].query(By.css('[data-testid="al-dia-cliente"]'))).toBeNull();
    expect(items[0].query(By.css('[aria-label="Debe $ 40.000 en 2 facturas"]'))).toBeTruthy();

    // Beto (segundo)
    expect(items[1].nativeElement.textContent).toContain('Beto');
    expect(items[1].query(By.css('[data-testid="deuda-cliente"]'))).toBeNull();
    expect(items[1].query(By.css('[data-testid="facturas-cliente"]'))).toBeNull();
    expect(items[1].query(By.css('[data-testid="al-dia-cliente"]')).nativeElement.textContent.trim()).toBe('Al día');
    expect(items[1].query(By.css('[aria-label="Al día"]'))).toBeTruthy();

    // Carla (ultimo)
    expect(items[2].nativeElement.textContent).toContain('Carla');
    expect(items[2].query(By.css('[data-testid="deuda-cliente"]')).nativeElement.textContent.trim()).toBe('$ 22.000');
    expect(items[2].query(By.css('[data-testid="facturas-cliente"]')).nativeElement.textContent.trim()).toBe(
      '1 factura',
    );
    expect(items[2].query(By.css('[aria-label="Debe $ 22.000 en 1 factura"]'))).toBeTruthy();

    // C9: registrar abono real que deja a Carla en $0 y volver a entrar
    await registrarAbono.registrar({
      modo: 'LIQUIDACION_TOTAL',
      idCliente: idCarla,
      fecha: ahora,
      medio: 'EFECTIVO',
    });

    await page.ionViewWillEnter();
    fixture.detectChanges();

    expect(textOf('[data-testid="total-por-cobrar"]')).toBe('$ 40.000');
    expect(textOf('[data-testid="cantidad-con-deuda"]')).toBe('1 cliente con deuda');

    const itemsDespues = fixture.debugElement.queryAll(By.css('[data-testid="item-cliente"]'));
    expect(itemsDespues[2].query(By.css('[data-testid="deuda-cliente"]'))).toBeNull();
    expect(itemsDespues[2].query(By.css('[data-testid="al-dia-cliente"]')).nativeElement.textContent.trim()).toBe(
      'Al día',
    );
  });

  it('C4: filtro Todos / Con deuda combinado con busqueda y vuelta a Todos', async () => {
    await seedBaseScenario();

    await page.ionViewWillEnter();
    fixture.detectChanges();

    const segment = fixture.debugElement.query(By.css('[data-testid="segment-filtro-clientes"]'));
    expect(segment.attributes['aria-label']).toBe('Filtrar clientes');
    expect(textOf('[data-testid="segment-filtro-todos"]')).toBe('Todos · 3');
    expect(textOf('[data-testid="segment-filtro-con-deuda"]')).toBe('Con deuda · 2');

    // Cambiar a Con deuda
    segment.nativeElement.value = 'con_deuda';
    segment.triggerEventHandler('ionChange', { detail: { value: 'con_deuda' }, target: segment.nativeElement });
    fixture.detectChanges();

    let items = fixture.debugElement.queryAll(By.css('[data-testid="item-cliente"]'));
    expect(items).toHaveLength(2);
    expect(items[0].nativeElement.textContent).toContain('Ana');
    expect(items[1].nativeElement.textContent).toContain('Carla');

    // Combinar con busqueda "an" -> solo Ana
    const searchbar = fixture.debugElement.query(By.css('[data-testid="searchbar-clientes"]'));
    searchbar.nativeElement.value = 'an';
    searchbar.triggerEventHandler('ionInput', { detail: { value: 'an' }, target: searchbar.nativeElement });
    await new Promise((r) => setTimeout(r, 20));
    fixture.detectChanges();

    items = fixture.debugElement.queryAll(By.css('[data-testid="item-cliente"]'));
    expect(items).toHaveLength(1);
    expect(items[0].nativeElement.textContent).toContain('Ana');
    expect(textOf('[data-testid="cantidad-clientes"]')).toBe('1 resultado');
    expect(textOf('[data-testid="segment-filtro-todos"]')).toBe('Todos · 1');
    expect(textOf('[data-testid="segment-filtro-con-deuda"]')).toBe('Con deuda · 1');

    // Limpiar busqueda manteniendo "Con deuda" -> vuelven Ana y Carla
    searchbar.nativeElement.value = '';
    searchbar.triggerEventHandler('ionClear', {});
    await new Promise((r) => setTimeout(r, 20));
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('[data-testid="item-cliente"]'))).toHaveLength(2);

    // Volver a "Todos" -> vuelven los 3
    segment.nativeElement.value = 'todos';
    segment.triggerEventHandler('ionChange', { detail: { value: 'todos' }, target: segment.nativeElement });
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('[data-testid="item-cliente"]'))).toHaveLength(3);
  });

  it('C5: textos exactos de estados vacios (sin clientes, busqueda sin resultados, Con deuda sin deudores)', async () => {
    // 1. Sin clientes (solo Mostrador en BD)
    await page.ionViewWillEnter();
    fixture.detectChanges();

    expect(textOf('[data-testid="cantidad-clientes"]')).toBe('0 clientes');
    expect(textOf('[data-testid="total-por-cobrar"]')).toBe('$ 0');
    expect(
      fixture.debugElement
        .query(By.css('[data-testid="total-por-cobrar"]'))
        .nativeElement.classList.contains('tiene-deuda'),
    ).toBe(false);
    expect(textOf('[data-testid="cantidad-con-deuda"]')).toBe('0 clientes con deuda');
    expect(textOf('[data-testid="mensaje-vacio"] .estado-mensaje')).toBe('Todavía no hay clientes');
    expect(textOf('[data-testid="mensaje-vacio"] .estado-submensaje')).toBe('Agrega el primero con el botón +.');

    // 2. Solo Beto (sin deudores)
    await db.run(
      `INSERT INTO clientes (nombre, telefono, es_mostrador, fecha_registro) VALUES ('Beto', '3002223344', 0, ?);`,
      [fechaSetup],
    );
    await page.ionViewWillEnter();
    fixture.detectChanges();

    // Busqueda sin resultados
    const searchbar = fixture.debugElement.query(By.css('[data-testid="searchbar-clientes"]'));
    searchbar.nativeElement.value = 'zzz';
    searchbar.triggerEventHandler('ionInput', { detail: { value: 'zzz' }, target: searchbar.nativeElement });
    await new Promise((r) => setTimeout(r, 20));
    fixture.detectChanges();
    expect(textOf('[data-testid="mensaje-vacio"]')).toBe('No se encontraron clientes');

    // Limpiar y cambiar a "Con deuda"
    searchbar.nativeElement.value = '';
    searchbar.triggerEventHandler('ionClear', {});
    await new Promise((r) => setTimeout(r, 20));
    fixture.detectChanges();

    const segment = fixture.debugElement.query(By.css('[data-testid="segment-filtro-clientes"]'));
    segment.nativeElement.value = 'con_deuda';
    segment.triggerEventHandler('ionChange', { detail: { value: 'con_deuda' }, target: segment.nativeElement });
    fixture.detectChanges();
    expect(textOf('[data-testid="mensaje-vacio"]')).toBe('Ningún cliente tiene deuda');
  });

  it('C6: si falla BuscarClientes o ConsultarCartera muestra estado-error y nunca Al dia ni vacio; Reintentar recupera', async () => {
    await seedBaseScenario();

    // Caso A: falla ConsultarCartera mientras BuscarClientes funciona (inclusive despues de una carga previa exitosa)
    await page.ionViewWillEnter();
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('[data-testid="item-cliente"]'))).toHaveLength(3);

    const carteraSpy = vi.spyOn(consultarCartera, 'consultar').mockRejectedValueOnce(new Error('DB cartera error'));
    await page.cargarClientes();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="estado-error"]'))).toBeTruthy();
    expect(textOf('[data-testid="mensaje-error-carga"]')).toBe(MENSAJE_ERROR_GENERICO);
    expect(textOf('[data-testid="btn-reintentar"]')).toBe('Reintentar');
    expect(fixture.debugElement.query(By.css('[data-testid="lista-clientes"]'))).toBeNull();
    expect(fixture.debugElement.query(By.css('[data-testid="al-dia-cliente"]'))).toBeNull();
    expect(fixture.debugElement.query(By.css('[data-testid="mensaje-vacio"]'))).toBeNull();

    // Caso B: Reintentar con click real en el boton
    carteraSpy.mockRestore();
    fixture.debugElement.query(By.css('[data-testid="btn-reintentar"]')).triggerEventHandler('click', null);
    await new Promise((r) => setTimeout(r, 20));
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="estado-error"]'))).toBeNull();
    expect(textOf('[data-testid="total-por-cobrar"]')).toBe('$ 62.000');
    expect(fixture.debugElement.queryAll(By.css('[data-testid="item-cliente"]'))).toHaveLength(3);

    // Caso C: falla BuscarClientes
    const buscarSpy = vi.spyOn(buscarClientes, 'buscar').mockRejectedValueOnce(new Error('DB clientes error'));
    await page.cargarClientes();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="estado-error"]'))).toBeTruthy();
    expect(textOf('[data-testid="mensaje-error-carga"]')).toBe(MENSAJE_ERROR_GENERICO);
    expect(fixture.debugElement.query(By.css('[data-testid="lista-clientes"]'))).toBeNull();
    buscarSpy.mockRestore();
  });

  it('C7 y C8: durante carga deshabilita filtro pero buscador sigue habilitado, y respuesta vieja (resuelta o rechazada) no pisa la nueva', async () => {
    await seedBaseScenario();

    let resA: (c: Awaited<ReturnType<BuscarClientes['buscar']>>) => void = () => undefined;
    let resAn: (c: Awaited<ReturnType<BuscarClientes['buscar']>>) => void = () => undefined;

    const spy = vi
      .spyOn(buscarClientes, 'buscar')
      .mockReturnValueOnce(new Promise((r) => (resA = r)))
      .mockReturnValueOnce(new Promise((r) => (resAn = r)));

    const searchbar = fixture.debugElement.query(By.css('[data-testid="searchbar-clientes"]'));
    const segment = fixture.debugElement.query(By.css('[data-testid="segment-filtro-clientes"]'));

    searchbar.nativeElement.value = 'a';
    searchbar.triggerEventHandler('ionInput', { detail: { value: 'a' }, target: searchbar.nativeElement });
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="indicador-carga"]'))).toBeTruthy();
    expect(Boolean(segment.nativeElement.disabled)).toBe(true);
    expect(segment.attributes['aria-disabled']).toBe('true');
    expect(Boolean(searchbar.nativeElement.disabled)).toBe(false);
    expect(searchbar.attributes['aria-disabled']).toBeUndefined();

    // Escribir segunda letra durante la carga
    searchbar.nativeElement.value = 'an';
    searchbar.triggerEventHandler('ionInput', { detail: { value: 'an' }, target: searchbar.nativeElement });
    fixture.detectChanges();

    expect(page.busqueda()).toBe('an');
    expect(spy).toHaveBeenNthCalledWith(1, 'a');
    expect(spy).toHaveBeenNthCalledWith(2, 'an');

    // Llega primero "an"
    resAn([{ idCliente: idAna, nombre: 'Ana', telefono: '3001112233', esMostrador: false }]);
    await new Promise((r) => setTimeout(r, 20));
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="indicador-carga"]'))).toBeNull();
    expect(Boolean(segment.nativeElement.disabled)).toBe(false);
    expect(segment.attributes['aria-disabled']).toBeUndefined();

    // Llega despues "a" (con Ana, Beto, Carla) -> NO debe pisar "an"
    resA([
      { idCliente: idAna, nombre: 'Ana', telefono: '3001112233', esMostrador: false },
      { idCliente: idBeto, nombre: 'Beto', telefono: '3002223344', esMostrador: false },
      { idCliente: idCarla, nombre: 'Carla', telefono: '3003334455', esMostrador: false },
    ]);
    await new Promise((r) => setTimeout(r, 20));
    fixture.detectChanges();

    const items = fixture.debugElement.queryAll(By.css('[data-testid="item-cliente"]'));
    expect(items).toHaveLength(1);
    expect(items[0].nativeElement.textContent).toContain('Ana');

    // Adicional: si falla la peticion vieja despues de que la nueva tuvo exito, tampoco pisa con error
    let rejVieja: (err: unknown) => void = () => undefined;
    let resNueva: (c: Awaited<ReturnType<BuscarClientes['buscar']>>) => void = () => undefined;
    spy
      .mockReturnValueOnce(new Promise((_, rej) => (rejVieja = rej)))
      .mockReturnValueOnce(new Promise((r) => (resNueva = r)));

    searchbar.nativeElement.value = 'b';
    searchbar.triggerEventHandler('ionInput', { detail: { value: 'b' }, target: searchbar.nativeElement });
    searchbar.nativeElement.value = 'be';
    searchbar.triggerEventHandler('ionInput', { detail: { value: 'be' }, target: searchbar.nativeElement });

    resNueva([{ idCliente: idBeto, nombre: 'Beto', telefono: '3002223344', esMostrador: false }]);
    await new Promise((r) => setTimeout(r, 20));
    fixture.detectChanges();

    rejVieja(new Error('Stale network timeout'));
    await new Promise((r) => setTimeout(r, 20));
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="estado-error"]'))).toBeNull();
    const itemsFinal = fixture.debugElement.queryAll(By.css('[data-testid="item-cliente"]'));
    expect(itemsFinal).toHaveLength(1);
    expect(itemsFinal[0].nativeElement.textContent).toContain('Beto');
  });

  it('C10: tocar cliente navega a su expediente y crear desde FAB recarga como Al dia', async () => {
    await seedBaseScenario();
    await page.ionViewWillEnter();
    fixture.detectChanges();

    // Tocar a Beto (segundo item) navega a su expediente
    const items = fixture.debugElement.queryAll(By.css('[data-testid="item-cliente"]'));
    items[1].triggerEventHandler('click', null);
    await new Promise((r) => setTimeout(r, 10));

    expect(mockModalCtrl.create).not.toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/clientes', idBeto]);

    // Crear cliente desde FAB insertandolo en BD antes de resolver ROL_GUARDADO
    mockModalCtrl.create.mockImplementationOnce(async () => ({
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: async () => {
        await db.run(
          `INSERT INTO clientes (nombre, telefono, es_mostrador, fecha_registro) VALUES ('Zoe', '3009998877', 0, ?);`,
          [fechaSetup],
        );
        return { data: null, role: ROL_GUARDADO };
      },
    }));

    fixture.debugElement.query(By.css('[data-testid="fab-nuevo-cliente"]')).triggerEventHandler('click', null);
    await new Promise((r) => setTimeout(r, 20));
    fixture.detectChanges();

    expect(textOf('[data-testid="cantidad-clientes"]')).toBe('4 clientes');
    const itemsDespues = fixture.debugElement.queryAll(By.css('[data-testid="item-cliente"]'));
    expect(itemsDespues).toHaveLength(4);
    expect(itemsDespues[3].nativeElement.textContent).toContain('Zoe');
    expect(itemsDespues[3].query(By.css('[data-testid="al-dia-cliente"]')).nativeElement.textContent.trim()).toBe(
      'Al día',
    );
  });

  it('C2 detalle: cantidadConDeuda excluye entradas del mapa con deuda <= 0', async () => {
    await seedBaseScenario();
    const spy = vi.spyOn(consultarCartera, 'consultar').mockResolvedValueOnce({
      total: pesos(40000),
      porCliente: new Map([
        [idAna, { deuda: pesos(40000), facturas: 2 }],
        [idBeto, { deuda: pesos(0), facturas: 0 }],
      ]),
    });

    await page.cargarClientes();
    fixture.detectChanges();

    expect(textOf('[data-testid="cantidad-con-deuda"]')).toBe('1 cliente con deuda');
    expect(textOf('[data-testid="segment-filtro-con-deuda"]')).toBe('Con deuda · 1');
    spy.mockRestore();
  });
});
