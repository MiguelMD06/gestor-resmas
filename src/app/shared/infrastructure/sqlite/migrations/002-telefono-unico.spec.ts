import { beforeEach, describe, expect, it } from 'vitest';

import { SqlJsDatabase } from '../../../../../testing/sqljs-sql-database.adapter';

import { migracion001 } from './001-esquema-inicial';
import { migracion002 } from './002-telefono-unico';
import { MIGRACIONES } from './index';
import { migrar } from './migration-runner';

const NOW = '2026-11-15 10:00:00';

describe('002-telefono-unico migration', () => {
  let db: SqlJsDatabase;

  beforeEach(async () => {
    db = await SqlJsDatabase.create();
    await migrar(db, [migracion001]);
  });

  it('runs on top of 001 with Mostrador, rejects duplicate phone, and allows two NULL phones (D9, E3b)', async () => {
    const version = await migrar(db, [migracion001, migracion002]);
    expect(version).toBe(2);
    expect(MIGRACIONES).toEqual([migracion001, migracion002]);

    await db.run("INSERT INTO clientes (nombre, telefono, fecha_registro) VALUES ('Ana Pérez', '3001234567', ?);", [
      NOW,
    ]);

    await expect(
      db.run("INSERT INTO clientes (nombre, telefono, fecha_registro) VALUES ('Laura Ruiz', '3001234567', ?);", [NOW]),
    ).rejects.toThrow(/UNIQUE/);

    await expect(
      db.run("INSERT INTO clientes (nombre, telefono, fecha_registro) VALUES ('Carlos Sin Tel', NULL, ?);", [NOW]),
    ).resolves.toBeDefined();

    await expect(
      db.run("INSERT INTO clientes (nombre, telefono, fecha_registro) VALUES ('Marta Sin Tel', NULL, ?);", [NOW]),
    ).resolves.toBeDefined();
  });

  it('normalizes empty and whitespace-only phones to NULL before creating unique index and preserves Mostrador (R2, D9)', async () => {
    await db.run("INSERT INTO clientes (nombre, telefono, fecha_registro) VALUES ('Cliente Vacio 1', '', ?);", [NOW]);
    await db.run("INSERT INTO clientes (nombre, telefono, fecha_registro) VALUES ('Cliente Vacio 2', '', ?);", [NOW]);
    await db.run("INSERT INTO clientes (nombre, telefono, fecha_registro) VALUES ('Cliente Espacios', '   ', ?);", [
      NOW,
    ]);

    const version = await migrar(db, [migracion001, migracion002]);
    expect(version).toBe(2);

    const normalizados = await db.query<{ nombre: string; telefono: string | null }>(
      "SELECT nombre, telefono FROM clientes WHERE nombre IN ('Cliente Vacio 1', 'Cliente Vacio 2', 'Cliente Espacios') ORDER BY id_cliente;",
    );
    expect(normalizados).toEqual([
      { nombre: 'Cliente Vacio 1', telefono: null },
      { nombre: 'Cliente Vacio 2', telefono: null },
      { nombre: 'Cliente Espacios', telefono: null },
    ]);

    const mostrador = await db.query<{ nombre: string; es_mostrador: number }>(
      'SELECT nombre, es_mostrador FROM clientes WHERE es_mostrador = 1;',
    );
    expect(mostrador).toEqual([{ nombre: 'Mostrador', es_mostrador: 1 }]);
  });
});
