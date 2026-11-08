import type { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { describe, expect, it, vi } from 'vitest';

import { CapacitorSqlDatabase } from './capacitor-sql-database.adapter';
import { GuardadoWebError } from './guardado-web.error';

function createMockDb() {
  return {
    query: vi.fn().mockResolvedValue({ values: [] }),
    run: vi.fn().mockResolvedValue({ changes: { changes: 1, lastId: 10 } }),
    execute: vi.fn().mockResolvedValue({ changes: { changes: 0 } }),
    beginTransaction: vi.fn().mockResolvedValue({ changes: { changes: 0 } }),
    commitTransaction: vi.fn().mockResolvedValue({ changes: { changes: 0 } }),
    rollbackTransaction: vi.fn().mockResolvedValue({ changes: { changes: 0 } }),
  };
}

describe('CapacitorSqlDatabase adapter', () => {
  it('calls run and execute inside transaction with transaction = false', async () => {
    const mockDb = createMockDb();
    const db = new CapacitorSqlDatabase(mockDb as unknown as SQLiteDBConnection, {
      esWeb: false,
      guardar: vi.fn(),
    });

    await db.transaction(async (tx) => {
      await tx.run('INSERT INTO test VALUES (?)', [1]);
      await tx.exec('CREATE TABLE foo (id INT);');
    });

    expect(mockDb.beginTransaction).toHaveBeenCalledTimes(1);
    expect(mockDb.run).toHaveBeenCalledWith('INSERT INTO test VALUES (?)', [1], false);
    expect(mockDb.execute).toHaveBeenCalledWith('CREATE TABLE foo (id INT);', false);
    expect(mockDb.commitTransaction).toHaveBeenCalledTimes(1);
  });

  it('calls guardar() on commit when esWeb is true, and does not call it on native', async () => {
    const mockDbWeb = createMockDb();
    const guardarWeb = vi.fn().mockResolvedValue(undefined);
    const dbWeb = new CapacitorSqlDatabase(mockDbWeb as unknown as SQLiteDBConnection, {
      esWeb: true,
      guardar: guardarWeb,
    });

    await dbWeb.transaction(async (tx) => {
      await tx.run('UPDATE test SET a = 1', []);
    });

    expect(mockDbWeb.commitTransaction).toHaveBeenCalledTimes(1);
    expect(guardarWeb).toHaveBeenCalledTimes(1);

    const mockDbNative = createMockDb();
    const guardarNative = vi.fn().mockResolvedValue(undefined);
    const dbNative = new CapacitorSqlDatabase(mockDbNative as unknown as SQLiteDBConnection, {
      esWeb: false,
      guardar: guardarNative,
    });

    await dbNative.transaction(async (tx) => {
      await tx.run('UPDATE test SET a = 1', []);
    });

    expect(mockDbNative.commitTransaction).toHaveBeenCalledTimes(1);
    expect(guardarNative).not.toHaveBeenCalled();
  });

  it('calls rollbackTransaction (not commitTransaction) and rethrows the error when work fails', async () => {
    const mockDb = createMockDb();
    const guardar = vi.fn().mockResolvedValue(undefined);
    const db = new CapacitorSqlDatabase(mockDb as unknown as SQLiteDBConnection, {
      esWeb: true,
      guardar,
    });
    const workError = new Error('Transaction failure');

    const promise = db.transaction(async (tx) => {
      await tx.run('INSERT INTO test VALUES (?)', [2]);
      throw workError;
    });

    await expect(promise).rejects.toBe(workError);
    expect(mockDb.beginTransaction).toHaveBeenCalledTimes(1);
    expect(mockDb.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(mockDb.commitTransaction).not.toHaveBeenCalled();
    expect(guardar).not.toHaveBeenCalled();
  });

  it('calls guardar() in web after run and exec outside transaction', async () => {
    const mockDb = createMockDb();
    const guardar = vi.fn().mockResolvedValue(undefined);
    const db = new CapacitorSqlDatabase(mockDb as unknown as SQLiteDBConnection, {
      esWeb: true,
      guardar,
    });

    await db.run('INSERT INTO test VALUES (?)', [1]);
    expect(guardar).toHaveBeenCalledTimes(1);

    await db.exec('DELETE FROM test');
    expect(guardar).toHaveBeenCalledTimes(2);

    await db.query('SELECT * FROM test');
    expect(guardar).toHaveBeenCalledTimes(2);
  });

  it('throws GuardadoWebError with original cause and does not call rollbackTransaction when guardar() fails after commit in web', async () => {
    const mockDb = createMockDb();
    const cause = new Error('IndexedDB quota exceeded');
    const guardar = vi.fn().mockRejectedValue(cause);
    const db = new CapacitorSqlDatabase(mockDb as unknown as SQLiteDBConnection, {
      esWeb: true,
      guardar,
    });

    let caughtError: unknown;
    try {
      await db.transaction(async (tx) => {
        await tx.run('INSERT INTO test VALUES (?)', [1]);
      });
    } catch (err) {
      caughtError = err;
    }

    expect(mockDb.commitTransaction).toHaveBeenCalledTimes(1);
    expect(mockDb.rollbackTransaction).not.toHaveBeenCalled();
    expect(caughtError).toBeInstanceOf(GuardadoWebError);
    expect((caughtError as GuardadoWebError).name).toBe('GuardadoWebError');
    expect((caughtError as GuardadoWebError).cause).toBe(cause);
  });

  it('throws GuardadoWebError and calls db.run only once when guardar() fails after non-transactional run', async () => {
    const mockDb = createMockDb();
    const cause = new Error('IndexedDB write failed');
    const guardar = vi.fn().mockRejectedValue(cause);
    const db = new CapacitorSqlDatabase(mockDb as unknown as SQLiteDBConnection, {
      esWeb: true,
      guardar,
    });

    let caughtError: unknown;
    try {
      await db.run('INSERT INTO test VALUES (?)', [1]);
    } catch (err) {
      caughtError = err;
    }

    expect(mockDb.run).toHaveBeenCalledTimes(1);
    expect(caughtError).toBeInstanceOf(GuardadoWebError);
    expect((caughtError as GuardadoWebError).cause).toBe(cause);
  });

  it('retries guardar() before the next write when pending and executes the write if guardar() succeeds', async () => {
    const mockDb = createMockDb();
    const order: string[] = [];
    const guardar = vi
      .fn()
      .mockImplementationOnce(async () => {
        order.push('guardar-1-fail');
        throw new Error('First save failed');
      })
      .mockImplementation(async () => {
        order.push('guardar-ok');
      });
    mockDb.run.mockImplementation(async () => {
      order.push('db.run');
      return { changes: { changes: 1, lastId: 10 } };
    });

    const db = new CapacitorSqlDatabase(mockDb as unknown as SQLiteDBConnection, {
      esWeb: true,
      guardar,
    });

    await expect(db.run('INSERT INTO test VALUES (?)', [1])).rejects.toBeInstanceOf(GuardadoWebError);

    const res = await db.run('INSERT INTO test VALUES (?)', [2]);
    expect(res).toEqual({ changes: 1, lastInsertId: 10 });
    expect(order).toEqual(['db.run', 'guardar-1-fail', 'guardar-ok', 'db.run', 'guardar-ok']);
    expect(mockDb.run).toHaveBeenCalledTimes(2);
    expect(guardar).toHaveBeenCalledTimes(3);
  });

  it('throws GuardadoWebError without calling db.run when pending and guardar() fails again on the next write', async () => {
    const mockDb = createMockDb();
    const firstCause = new Error('First save failed');
    const secondCause = new Error('Second save failed');
    const guardar = vi.fn().mockRejectedValueOnce(firstCause).mockRejectedValueOnce(secondCause);

    const db = new CapacitorSqlDatabase(mockDb as unknown as SQLiteDBConnection, {
      esWeb: true,
      guardar,
    });

    await expect(db.run('INSERT INTO test VALUES (?)', [1])).rejects.toBeInstanceOf(GuardadoWebError);
    expect(mockDb.run).toHaveBeenCalledTimes(1);

    mockDb.run.mockClear();

    let secondError: unknown;
    try {
      await db.run('INSERT INTO test VALUES (?)', [2]);
    } catch (err) {
      secondError = err;
    }

    expect(secondError).toBeInstanceOf(GuardadoWebError);
    expect((secondError as GuardadoWebError).cause).toBe(secondCause);
    expect(mockDb.run).not.toHaveBeenCalled();
  });

  it('does not call guardar() on query even when a previous save is pending', async () => {
    const mockDb = createMockDb();
    mockDb.query.mockResolvedValue({ values: [{ id: 1 }] });
    const guardar = vi.fn().mockRejectedValue(new Error('Save failed'));

    const db = new CapacitorSqlDatabase(mockDb as unknown as SQLiteDBConnection, {
      esWeb: true,
      guardar,
    });

    await expect(db.exec('CREATE TABLE test (id INT);')).rejects.toBeInstanceOf(GuardadoWebError);
    expect(guardar).toHaveBeenCalledTimes(1);

    const rows = await db.query<{ id: number }>('SELECT id FROM test');
    expect(rows).toEqual([{ id: 1 }]);
    expect(guardar).toHaveBeenCalledTimes(1);
  });
});
