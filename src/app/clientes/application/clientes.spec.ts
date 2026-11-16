import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { SqlJsDatabase } from '../../../testing/sqljs-sql-database.adapter';
import { fechaHora } from '../../shared/domain';
import { CLOCK } from '../../shared/infrastructure/clock/clock.token';
import { MIGRACIONES } from '../../shared/infrastructure/sqlite/migrations';
import { migrar } from '../../shared/infrastructure/sqlite/migrations/migration-runner';
import { SQL_DATABASE } from '../../shared/infrastructure/sqlite/sql-database.token';
import { ClienteRepository } from '../infrastructure/cliente.repository';

import { BuscarClientes } from './buscar-clientes';
import { EditarCliente } from './editar-cliente';
import { RegistrarCliente } from './registrar-cliente';

describe('Clientes use cases and repository', () => {
  let db: SqlJsDatabase;
  let repo: ClienteRepository;
  let registrarCliente: RegistrarCliente;
  let editarCliente: EditarCliente;
  let buscarClientes: BuscarClientes;

  const NOW = fechaHora('2026-11-15 10:00:00');

  beforeEach(async () => {
    db = await SqlJsDatabase.create();
    await migrar(db, MIGRACIONES);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ClienteRepository,
        RegistrarCliente,
        EditarCliente,
        BuscarClientes,
        { provide: SQL_DATABASE, useValue: db },
        { provide: CLOCK, useValue: { ahora: () => NOW } },
      ],
    });

    repo = TestBed.inject(ClienteRepository);
    registrarCliente = TestBed.inject(RegistrarCliente);
    editarCliente = TestBed.inject(EditarCliente);
    buscarClientes = TestBed.inject(BuscarClientes);
  });

  it('registers Ana Pérez with phone and lists her without Mostrador (E1)', async () => {
    const { idCliente } = await registrarCliente.registrar({
      nombre: 'Ana Pérez',
      telefono: '3001234567',
    });

    expect(idCliente).toBeGreaterThan(0);

    const guardado = await repo.porId(db, idCliente);
    expect(guardado).toEqual({
      idCliente,
      nombre: 'Ana Pérez',
      telefono: '3001234567',
      esMostrador: false,
    });

    const lista = await buscarClientes.buscar('');
    expect(lista).toEqual([guardado]);
  });

  it('rejects empty or whitespace-only name without writing to the database (E2)', async () => {
    await expect(registrarCliente.registrar({ nombre: '', telefono: '3001234567' })).rejects.toThrow(
      expect.objectContaining({ codigo: 'NOMBRE_INVALIDO' }),
    );
    await expect(registrarCliente.registrar({ nombre: '   ', telefono: '3001234567' })).rejects.toThrow(
      expect.objectContaining({ codigo: 'NOMBRE_INVALIDO' }),
    );

    const todos = await repo.todos(db);
    expect(todos).toHaveLength(0);
  });

  it('normalizes phone spaces and rejects invalid phone numbers without writing (E3)', async () => {
    await expect(registrarCliente.registrar({ nombre: 'Ana', telefono: '300-ABC' })).rejects.toThrow(
      expect.objectContaining({ codigo: 'TELEFONO_INVALIDO' }),
    );
    await expect(registrarCliente.registrar({ nombre: 'Ana', telefono: '2001234567' })).rejects.toThrow(
      expect.objectContaining({ codigo: 'TELEFONO_INVALIDO' }),
    );
    await expect(registrarCliente.registrar({ nombre: 'Ana', telefono: '300123456' })).rejects.toThrow(
      expect.objectContaining({ codigo: 'TELEFONO_INVALIDO' }),
    );

    const conEspacios = await registrarCliente.registrar({
      nombre: 'Ana Espacios',
      telefono: '300 123 4567',
    });
    expect((await repo.porId(db, conEspacios.idCliente))?.telefono).toBe('3001234567');

    const sinTelefono = await registrarCliente.registrar({
      nombre: 'Sin Tel',
      telefono: null,
    });
    expect((await repo.porId(db, sinTelefono.idCliente))?.telefono).toBeNull();
  });

  it('rejects duplicate phone on register, allows editing Ana with her own phone, and allows two customers without phone (E3b)', async () => {
    const { idCliente: idAna } = await registrarCliente.registrar({
      nombre: 'Ana Pérez',
      telefono: '3001234567',
    });

    await expect(
      registrarCliente.registrar({
        nombre: 'Laura Ruiz',
        telefono: '3001234567',
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'TELEFONO_REPETIDO' }));

    // Rejected registration must not write Laura Ruiz
    expect(await repo.todos(db)).toHaveLength(1);

    // Editing Ana keeping her same phone succeeds
    await expect(
      editarCliente.editar({
        idCliente: idAna,
        nombre: 'Ana María Pérez',
        telefono: '3001234567',
      }),
    ).resolves.toBeUndefined();

    const anaEditada = await repo.porId(db, idAna);
    expect(anaEditada?.nombre).toBe('Ana María Pérez');
    expect(anaEditada?.telefono).toBe('3001234567');

    // Two customers without phone succeed
    await expect(registrarCliente.registrar({ nombre: 'Sin Tel 1', telefono: '' })).resolves.toBeDefined();
    await expect(registrarCliente.registrar({ nombre: 'Sin Tel 2', telefono: null })).resolves.toBeDefined();
  });

  it('rejects editing a customer to use another customer phone with TELEFONO_REPETIDO (E3b)', async () => {
    const { idCliente: idAna } = await registrarCliente.registrar({
      nombre: 'Ana Pérez',
      telefono: '3001234567',
    });
    const { idCliente: idJuan } = await registrarCliente.registrar({
      nombre: 'Juan Gómez',
      telefono: '3109876543',
    });

    await expect(
      editarCliente.editar({
        idCliente: idJuan,
        nombre: 'Juan Gómez',
        telefono: '3001234567',
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'TELEFONO_REPETIDO' }));

    const juanActual = await repo.porId(db, idJuan);
    expect(juanActual?.telefono).toBe('3109876543');
    expect((await repo.porId(db, idAna))?.telefono).toBe('3001234567');
  });

  it('updates the same customer row on edit and allows clearing the phone (E4, D10)', async () => {
    const { idCliente } = await registrarCliente.registrar({
      nombre: 'Ana Pérez',
      telefono: '3001234567',
    });

    await editarCliente.editar({
      idCliente,
      nombre: 'Ana María Pérez',
      telefono: '',
    });

    const actualizado = await repo.porId(db, idCliente);
    expect(actualizado).toEqual({
      idCliente,
      nombre: 'Ana María Pérez',
      telefono: null,
      esMostrador: false,
    });
    expect(await repo.todos(db)).toHaveLength(1);
  });

  it('rejects editing Mostrador or a nonexistent customer with CLIENTE_INEXISTENTE', async () => {
    const mostrador = await repo.mostrador(db);

    await expect(
      editarCliente.editar({
        idCliente: mostrador.idCliente,
        nombre: 'Otro',
        telefono: null,
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'CLIENTE_INEXISTENTE' }));

    await expect(
      editarCliente.editar({
        idCliente: 9999,
        nombre: 'Fantasma',
        telefono: null,
      }),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'CLIENTE_INEXISTENTE' }));
  });

  it('searches case-insensitively and without diacritics by name or phone (E5)', async () => {
    await registrarCliente.registrar({ nombre: 'Ana María Pérez', telefono: '3001234567' });
    await registrarCliente.registrar({ nombre: 'Juan Gómez', telefono: '3109876543' });

    const r1 = await buscarClientes.buscar('ana');
    const r2 = await buscarClientes.buscar('ANA');
    const r3 = await buscarClientes.buscar('perez');
    const r4 = await buscarClientes.buscar('3109');

    expect(r1.map((c) => c.nombre)).toEqual(['Ana María Pérez']);
    expect(r2.map((c) => c.nombre)).toEqual(['Ana María Pérez']);
    expect(r3.map((c) => c.nombre)).toEqual(['Ana María Pérez']);
    expect(r4.map((c) => c.nombre)).toEqual(['Juan Gómez']);
  });

  it('returns todos() without Mostrador in Spanish alphabetical order ignoring case and accents, and incluirMostrador puts Mostrador first (D10)', async () => {
    await registrarCliente.registrar({ nombre: 'Zoe Díaz', telefono: null });
    await registrarCliente.registrar({ nombre: 'ángela Ruiz', telefono: null });
    await registrarCliente.registrar({ nombre: 'Ana María Pérez', telefono: null });
    await registrarCliente.registrar({ nombre: 'Beatriz Gómez', telefono: null });

    const esperado = ['Ana María Pérez', 'ángela Ruiz', 'Beatriz Gómez', 'Zoe Díaz'];

    const todos = await repo.todos(db);
    expect(todos.map((c) => c.nombre)).toEqual(esperado);
    expect(todos.every((c) => !c.esMostrador)).toBe(true);

    const buscados = await buscarClientes.buscar('');
    expect(buscados.map((c) => c.nombre)).toEqual(esperado);

    const conMostrador = await buscarClientes.buscar('', { incluirMostrador: true });
    expect(conMostrador.map((c) => c.nombre)).toEqual(['Mostrador', ...esperado]);
    expect(conMostrador[0].esMostrador).toBe(true);
  });

  it('breaks alphabetical ties by idCliente ascending in todos() (D10)', async () => {
    const primero = await registrarCliente.registrar({ nombre: 'María López', telefono: null });
    const segundo = await registrarCliente.registrar({ nombre: 'maria lopez', telefono: null });

    const todos = await repo.todos(db);
    expect(todos.map((c) => c.idCliente)).toEqual([primero.idCliente, segundo.idCliente]);
  });

  it('matches phone numbers even when the search query contains spaces (F15)', async () => {
    await registrarCliente.registrar({ nombre: 'Ana María Pérez', telefono: '3001234567' });
    await registrarCliente.registrar({ nombre: 'Juan Gómez', telefono: '3109876543' });

    const resultado = await buscarClientes.buscar('300 123');
    expect(resultado.map((c) => c.nombre)).toEqual(['Ana María Pérez']);
  });
});
