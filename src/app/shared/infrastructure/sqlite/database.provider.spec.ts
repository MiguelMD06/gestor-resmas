import { describe, expect, it, vi } from 'vitest';

import { SqlJsDatabase } from '../../../../testing/sqljs-sql-database.adapter';

import { DatabaseProvider } from './database.provider';

describe('DatabaseProvider', () => {
  it('throws an error if db getter is accessed before init() is called', () => {
    const provider = new DatabaseProvider();
    expect(() => provider.db).toThrow('DatabaseProvider has not been initialized. Call init() first.');
  });

  it('creates and migrates only one database when init() is called concurrently', async () => {
    const provider = new DatabaseProvider();
    let transactionSpy: ReturnType<typeof vi.spyOn> | undefined;
    const createDatabase = vi.fn(async () => {
      const db = await SqlJsDatabase.create();
      transactionSpy = vi.spyOn(db, 'transaction');
      return db;
    });

    await Promise.all([provider.init(createDatabase), provider.init(createDatabase)]);

    expect(createDatabase).toHaveBeenCalledTimes(1);
    expect(transactionSpy).toHaveBeenCalledTimes(1);
    const rows = await provider.db.query<{ user_version: number }>('PRAGMA user_version;');
    expect(rows[0]?.user_version).toBe(1);
  });

  it('discards the failed promise and succeeds on a subsequent init() retry', async () => {
    const provider = new DatabaseProvider();
    const initError = new Error('Connection failed');
    const createDatabase = vi
      .fn<() => Promise<SqlJsDatabase>>()
      .mockRejectedValueOnce(initError)
      .mockImplementation(async () => SqlJsDatabase.create());

    await expect(provider.init(createDatabase)).rejects.toBe(initError);
    expect(() => provider.db).toThrow('DatabaseProvider has not been initialized. Call init() first.');

    await provider.init(createDatabase);

    expect(createDatabase).toHaveBeenCalledTimes(2);
    const rows = await provider.db.query<{ user_version: number }>('PRAGMA user_version;');
    expect(rows[0]?.user_version).toBeGreaterThan(0);
  });

  it('discards the failed promise when the factory throws synchronously and succeeds on a subsequent init() retry', async () => {
    const provider = new DatabaseProvider();
    const syncError = new Error('Synchronous factory failure');
    const failingFactory = (): Promise<SqlJsDatabase> => {
      throw syncError;
    };
    const workingFactory = vi.fn(async () => SqlJsDatabase.create());

    await expect(provider.init(failingFactory)).rejects.toBe(syncError);
    expect(() => provider.db).toThrow('DatabaseProvider has not been initialized. Call init() first.');

    await provider.init(workingFactory);

    expect(workingFactory).toHaveBeenCalledTimes(1);
    const rows = await provider.db.query<{ user_version: number }>('PRAGMA user_version;');
    expect(rows[0]?.user_version).toBeGreaterThan(0);
  });
});
