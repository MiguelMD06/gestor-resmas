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

  it('transaction calls guardar() on commit when esWeb is true, and does not call it on native', async () => {
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

  it('transaction calls rollbackTransaction (not commitTransaction) and rethrows the error when work fails', async () => {
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

  it('transaction throws GuardadoWebError with original cause and does not call rollbackTransaction when guardar() fails after commit in web', async () => {
    const mockDb = createMockDb();
    const cause = new Error('IndexedDB quota exceeded');
    const guardar = vi.fn().mockRejectedValue(cause);
    const db = new CapacitorSqlDatabase(mockDb as unknown as SQLiteDBConnection, {
      esWeb: true,
      guardar,
    });

    const promise = db.transaction(async (tx) => {
      await tx.run('INSERT INTO test VALUES (?)', [1]);
    });
    await expect(promise).rejects.toBeInstanceOf(GuardadoWebError);
    await expect(promise).rejects.toMatchObject({
      escrituraAplicada: true,
      cause,
    });

    expect(mockDb.commitTransaction).toHaveBeenCalledTimes(1);
    expect(mockDb.rollbackTransaction).not.toHaveBeenCalled();
  });

  it('throws GuardadoWebError and calls db.run only once when guardar() fails after non-transactional run', async () => {
    const mockDb = createMockDb();
    const cause = new Error('IndexedDB write failed');
    const guardar = vi.fn().mockRejectedValue(cause);
    const db = new CapacitorSqlDatabase(mockDb as unknown as SQLiteDBConnection, {
      esWeb: true,
      guardar,
    });

    const promise = db.run('INSERT INTO test VALUES (?)', [1]);
    await expect(promise).rejects.toBeInstanceOf(GuardadoWebError);
    await expect(promise).rejects.toMatchObject({
      escrituraAplicada: true,
      cause,
    });

    expect(mockDb.run).toHaveBeenCalledTimes(1);
  });

  it('throws GuardadoWebError and calls db.execute only once when guardar() fails after exec', async () => {
    const mockDb = createMockDb();
    const cause = new Error('IndexedDB write failed');
    const guardar = vi.fn().mockRejectedValue(cause);
    const db = new CapacitorSqlDatabase(mockDb as unknown as SQLiteDBConnection, {
      esWeb: true,
      guardar,
    });

    const promise = db.exec('CREATE TABLE test (id INT);');
    await expect(promise).rejects.toBeInstanceOf(GuardadoWebError);
    await expect(promise).rejects.toMatchObject({
      escrituraAplicada: true,
      cause,
    });

    expect(mockDb.execute).toHaveBeenCalledTimes(1);
  });

  it('run retries guardar() before the next write when pending and executes the write if guardar() succeeds', async () => {
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

    await expect(db.run('INSERT INTO test VALUES (?)', [1])).rejects.toMatchObject({
      name: 'GuardadoWebError',
      escrituraAplicada: true,
    });

    const res = await db.run('INSERT INTO test VALUES (?)', [2]);
    expect(res).toEqual({ changes: 1, lastInsertId: 10 });
    expect(order).toEqual(['db.run', 'guardar-1-fail', 'guardar-ok', 'db.run', 'guardar-ok']);
    expect(mockDb.run).toHaveBeenCalledTimes(2);
    expect(guardar).toHaveBeenCalledTimes(3);
  });

  it('retries guardar() before the next exec when pending and executes the script if guardar() succeeds', async () => {
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
    mockDb.execute.mockImplementation(async () => {
      order.push('db.execute');
      return { changes: { changes: 0 } };
    });

    const db = new CapacitorSqlDatabase(mockDb as unknown as SQLiteDBConnection, {
      esWeb: true,
      guardar,
    });

    await expect(db.exec('CREATE TABLE t1 (id INT);')).rejects.toMatchObject({
      name: 'GuardadoWebError',
      escrituraAplicada: true,
    });

    await db.exec('CREATE TABLE t2 (id INT);');
    expect(order).toEqual(['db.execute', 'guardar-1-fail', 'guardar-ok', 'db.execute', 'guardar-ok']);
    expect(mockDb.execute).toHaveBeenCalledTimes(2);
    expect(guardar).toHaveBeenCalledTimes(3);
  });

  it('retries guardar() before the next transaction when pending and executes the transaction if guardar() succeeds', async () => {
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
    mockDb.beginTransaction.mockImplementation(async () => {
      order.push('db.beginTransaction');
      return { changes: { changes: 0 } };
    });
    mockDb.run.mockImplementation(async () => {
      order.push('db.run');
      return { changes: { changes: 1, lastId: 10 } };
    });
    mockDb.commitTransaction.mockImplementation(async () => {
      order.push('db.commitTransaction');
      return { changes: { changes: 0 } };
    });

    const db = new CapacitorSqlDatabase(mockDb as unknown as SQLiteDBConnection, {
      esWeb: true,
      guardar,
    });

    await expect(
      db.transaction(async (tx) => {
        await tx.run('INSERT INTO test VALUES (?)', [1]);
      }),
    ).rejects.toMatchObject({
      name: 'GuardadoWebError',
      escrituraAplicada: true,
    });

    const res = await db.transaction(async (tx) => tx.run('INSERT INTO test VALUES (?)', [2]));
    expect(res).toEqual({ changes: 1, lastInsertId: 10 });
    expect(order).toEqual([
      'db.beginTransaction',
      'db.run',
      'db.commitTransaction',
      'guardar-1-fail',
      'guardar-ok',
      'db.beginTransaction',
      'db.run',
      'db.commitTransaction',
      'guardar-ok',
    ]);
    expect(mockDb.beginTransaction).toHaveBeenCalledTimes(2);
    expect(mockDb.run).toHaveBeenCalledTimes(2);
    expect(mockDb.commitTransaction).toHaveBeenCalledTimes(2);
    expect(guardar).toHaveBeenCalledTimes(3);
  });

  it('throws GuardadoWebError without calling db.run when pending and guardar() fails again before run', async () => {
    const mockDb = createMockDb();
    const firstCause = new Error('First save failed');
    const secondCause = new Error('Second save failed');
    const guardar = vi.fn().mockRejectedValueOnce(firstCause).mockRejectedValueOnce(secondCause);

    const db = new CapacitorSqlDatabase(mockDb as unknown as SQLiteDBConnection, {
      esWeb: true,
      guardar,
    });

    await expect(db.run('INSERT INTO test VALUES (?)', [1])).rejects.toMatchObject({
      name: 'GuardadoWebError',
      escrituraAplicada: true,
      cause: firstCause,
    });
    expect(mockDb.run).toHaveBeenCalledTimes(1);

    mockDb.run.mockClear();

    await expect(db.run('INSERT INTO test VALUES (?)', [2])).rejects.toMatchObject({
      name: 'GuardadoWebError',
      escrituraAplicada: false,
      cause: secondCause,
    });
    expect(mockDb.run).not.toHaveBeenCalled();
  });

  it('throws GuardadoWebError without calling db.execute when pending and guardar() fails again before exec', async () => {
    const mockDb = createMockDb();
    const firstCause = new Error('First save failed');
    const secondCause = new Error('Second save failed');
    const guardar = vi.fn().mockRejectedValueOnce(firstCause).mockRejectedValueOnce(secondCause);

    const db = new CapacitorSqlDatabase(mockDb as unknown as SQLiteDBConnection, {
      esWeb: true,
      guardar,
    });

    await expect(db.exec('CREATE TABLE t1 (id INT);')).rejects.toMatchObject({
      name: 'GuardadoWebError',
      escrituraAplicada: true,
      cause: firstCause,
    });
    expect(mockDb.execute).toHaveBeenCalledTimes(1);

    mockDb.execute.mockClear();

    await expect(db.exec('CREATE TABLE t2 (id INT);')).rejects.toMatchObject({
      name: 'GuardadoWebError',
      escrituraAplicada: false,
      cause: secondCause,
    });
    expect(mockDb.execute).not.toHaveBeenCalled();
  });

  it('throws GuardadoWebError without calling db.beginTransaction when pending and guardar() fails again before transaction', async () => {
    const mockDb = createMockDb();
    const firstCause = new Error('First save failed');
    const secondCause = new Error('Second save failed');
    const guardar = vi.fn().mockRejectedValueOnce(firstCause).mockRejectedValueOnce(secondCause);

    const db = new CapacitorSqlDatabase(mockDb as unknown as SQLiteDBConnection, {
      esWeb: true,
      guardar,
    });

    await expect(
      db.transaction(async (tx) => {
        await tx.run('INSERT INTO test VALUES (?)', [1]);
      }),
    ).rejects.toMatchObject({
      name: 'GuardadoWebError',
      escrituraAplicada: true,
      cause: firstCause,
    });
    expect(mockDb.beginTransaction).toHaveBeenCalledTimes(1);

    mockDb.beginTransaction.mockClear();

    await expect(
      db.transaction(async (tx) => {
        await tx.run('INSERT INTO test VALUES (?)', [2]);
      }),
    ).rejects.toMatchObject({
      name: 'GuardadoWebError',
      escrituraAplicada: false,
      cause: secondCause,
    });
    expect(mockDb.beginTransaction).not.toHaveBeenCalled();
  });

  it('does not call guardar() on query even when a previous save is pending', async () => {
    const mockDb = createMockDb();
    mockDb.query.mockResolvedValue({ values: [{ id: 1 }] });
    const guardar = vi.fn().mockRejectedValue(new Error('Save failed'));

    const db = new CapacitorSqlDatabase(mockDb as unknown as SQLiteDBConnection, {
      esWeb: true,
      guardar,
    });

    await expect(db.exec('CREATE TABLE test (id INT);')).rejects.toMatchObject({
      name: 'GuardadoWebError',
      escrituraAplicada: true,
    });
    expect(guardar).toHaveBeenCalledTimes(1);

    const rows = await db.query<{ id: number }>('SELECT id FROM test');
    expect(rows).toEqual([{ id: 1 }]);
    expect(guardar).toHaveBeenCalledTimes(1);
  });

  it('run and transaction recover from a pending save when guardar() succeeds on transaction, and a third failing run reports escrituraAplicada === true', async () => {
    const mockDb = createMockDb();
    const firstCause = new Error('First persistence failure');
    const thirdCause = new Error('Third persistence failure');

    const guardar = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(firstCause)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(thirdCause);

    const db = new CapacitorSqlDatabase(mockDb as unknown as SQLiteDBConnection, {
      esWeb: true,
      guardar,
    });

    // 1. First run: SQL write succeeds, guardar() fails -> adapter is left pending, escrituraAplicada === true
    const run1 = db.run('INSERT INTO test VALUES (?)', [1]);
    await expect(run1).rejects.toBeInstanceOf(GuardadoWebError);
    await expect(run1).rejects.toMatchObject({
      name: 'GuardadoWebError',
      escrituraAplicada: true,
      cause: firstCause,
    });
    expect(mockDb.run).toHaveBeenCalledTimes(1);
    expect(guardar).toHaveBeenCalledTimes(1);

    // 2. Following transaction with working guardar(): flushes pending save, runs work + commit, and saves after commit
    const txResult = await db.transaction(async (tx) => {
      await tx.run('INSERT INTO test VALUES (?)', [2]);
      return 'tx-completed';
    });
    expect(txResult).toBe('tx-completed');
    expect(mockDb.beginTransaction).toHaveBeenCalledTimes(1);
    expect(mockDb.run).toHaveBeenCalledTimes(2);
    expect(mockDb.commitTransaction).toHaveBeenCalledTimes(1);
    expect(mockDb.rollbackTransaction).not.toHaveBeenCalled();
    expect(guardar).toHaveBeenCalledTimes(3);

    // 3. Third run whose guardar() fails: pending flag was cleared by step 2, so SQL write executes and fails on post-write save with escrituraAplicada === true
    const run3 = db.run('INSERT INTO test VALUES (?)', [3]);
    await expect(run3).rejects.toBeInstanceOf(GuardadoWebError);
    await expect(run3).rejects.toMatchObject({
      name: 'GuardadoWebError',
      escrituraAplicada: true,
      cause: thirdCause,
    });
    expect(mockDb.run).toHaveBeenCalledTimes(3);
    expect(guardar).toHaveBeenCalledTimes(4);
  });

  it('run, exec and transaction in native mode (esWeb = false) never call guardar() and never throw GuardadoWebError', async () => {
    const mockDb = createMockDb();
    const guardar = vi.fn().mockRejectedValue(new Error('Should never be called on native'));
    const db = new CapacitorSqlDatabase(mockDb as unknown as SQLiteDBConnection, {
      esWeb: false,
      guardar,
    });

    const runRes = await db.run('INSERT INTO test VALUES (?)', [1]);
    expect(runRes).toEqual({ changes: 1, lastInsertId: 10 });

    await db.exec('CREATE TABLE t (id INT);');

    const txRes = await db.transaction(async (tx) => {
      await tx.run('UPDATE test SET id = 2', []);
      return 'native-ok';
    });
    expect(txRes).toBe('native-ok');

    expect(guardar).not.toHaveBeenCalled();
    expect(mockDb.run).toHaveBeenCalledTimes(2);
    expect(mockDb.execute).toHaveBeenCalledTimes(1);
    expect(mockDb.commitTransaction).toHaveBeenCalledTimes(1);
  });
});
