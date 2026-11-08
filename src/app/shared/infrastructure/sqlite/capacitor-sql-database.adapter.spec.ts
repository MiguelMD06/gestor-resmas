import type { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { describe, expect, it, vi } from 'vitest';

import { CapacitorSqlDatabase } from './capacitor-sql-database.adapter';

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
});
