import { beforeEach, describe, expect, it } from 'vitest';

import { SqlJsDatabase } from '../../../../../testing/sqljs-sql-database.adapter';

import type { Migracion } from './migracion';
import { migrar } from './migration-runner';

describe('migration-runner', () => {
  let db: SqlJsDatabase;

  beforeEach(async () => {
    db = await SqlJsDatabase.create();
  });

  async function getUserVersion(): Promise<number> {
    const rows = await db.query<{ user_version: number }>('PRAGMA user_version;');
    return rows[0]?.user_version ?? 0;
  }

  it('R4: rejects non-consecutive versions [1, 3] and leaves user_version at 0', async () => {
    const migraciones: Migracion[] = [
      { version: 1, nombre: 'v1', script: 'CREATE TABLE t1 (id INT);' },
      { version: 3, nombre: 'v3', script: 'CREATE TABLE t3 (id INT);' },
    ];

    await expect(migrar(db, migraciones)).rejects.toThrow();
    expect(await getUserVersion()).toBe(0);
    const tables = await db.query<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 't1';",
    );
    expect(tables).toHaveLength(0);
  });

  it('R4: rejects duplicate versions [1, 1] and leaves user_version at 0', async () => {
    const migraciones: Migracion[] = [
      { version: 1, nombre: 'v1a', script: 'CREATE TABLE t1a (id INT);' },
      { version: 1, nombre: 'v1b', script: 'CREATE TABLE t1b (id INT);' },
    ];

    await expect(migrar(db, migraciones)).rejects.toThrow();
    expect(await getUserVersion()).toBe(0);
  });

  it('R5: throws exact message when user_version = 9 is newer than supported', async () => {
    await db.exec('PRAGMA user_version = 9;');

    const migraciones: Migracion[] = [{ version: 1, nombre: 'v1', script: 'CREATE TABLE t1 (id INT);' }];

    await expect(migrar(db, migraciones)).rejects.toThrow('Database version 9 is newer than this app supports (1)');
    expect(await getUserVersion()).toBe(9);
  });

  it('R6: rolls back the failed migration, keeps previous migrations applied, and propagates the error', async () => {
    const migraciones: Migracion[] = [
      { version: 1, nombre: 'v1', script: 'CREATE TABLE t1 (id INT);' },
      { version: 2, nombre: 'v2-invalid', script: 'INVALID SQL STATEMENT;' },
    ];

    await expect(migrar(db, migraciones)).rejects.toThrow();

    expect(await getUserVersion()).toBe(1);
    const tables = await db.query<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 't1';",
    );
    expect(tables).toHaveLength(1);
  });

  it('R7: returns the final version, and running again returns 1 without re-executing migrations', async () => {
    const migraciones: Migracion[] = [
      {
        version: 1,
        nombre: 'v1',
        script: 'CREATE TABLE t1 (id INT);',
      },
    ];

    const vFirst = await migrar(db, migraciones);
    expect(vFirst).toBe(1);
    expect(await getUserVersion()).toBe(1);

    // Spy or check that running again does not fail even if script would fail on duplicate table
    const vSecond = await migrar(db, migraciones);
    expect(vSecond).toBe(1);
    expect(await getUserVersion()).toBe(1);
  });
});
