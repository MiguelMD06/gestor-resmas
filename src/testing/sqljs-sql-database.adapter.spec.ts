import { beforeEach, describe, expect, it } from 'vitest';

import { SqlJsDatabase } from './sqljs-sql-database.adapter';

describe('SqlJsDatabase adapter', () => {
  let db: SqlJsDatabase;

  beforeEach(async () => {
    db = await SqlJsDatabase.create();
    await db.exec('CREATE TABLE items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);');
  });

  it('R1: commits and returns result when work succeeds', async () => {
    const result = await db.transaction(async (tx) => {
      const runRes = await tx.run('INSERT INTO items (name) VALUES (?);', ['Item 1']);
      expect(runRes.changes).toBe(1);
      expect(runRes.lastInsertId).toBe(1);
      return 'success-result';
    });

    expect(result).toBe('success-result');
    const rows = await db.query<{ id: number; name: string }>('SELECT * FROM items;');
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Item 1');
  });

  it('R1: rolls back all statements and rethrows the exact error when work fails', async () => {
    const customError = new Error('Custom rollback failure');

    const promise = db.transaction(async (tx) => {
      await tx.run('INSERT INTO items (name) VALUES (?);', ['Item rollback']);
      throw customError;
    });

    await expect(promise).rejects.toBe(customError);

    const rows = await db.query<{ count: number }>('SELECT count(*) as count FROM items;');
    expect(rows[0].count).toBe(0);
  });

  it('R2: executes concurrent transactions in call order without interleaving', async () => {
    const order: string[] = [];

    const tx1 = db.transaction(async (tx) => {
      order.push('tx1-start');
      await new Promise((resolve) => setTimeout(resolve, 30));
      await tx.run('INSERT INTO items (name) VALUES (?);', ['first']);
      order.push('tx1-end');
      return 1;
    });

    const tx2 = db.transaction(async (tx) => {
      order.push('tx2-start');
      await tx.run('INSERT INTO items (name) VALUES (?);', ['second']);
      order.push('tx2-end');
      return 2;
    });

    const [res1, res2] = await Promise.all([tx1, tx2]);
    expect(res1).toBe(1);
    expect(res2).toBe(2);

    expect(order).toEqual(['tx1-start', 'tx1-end', 'tx2-start', 'tx2-end']);

    const rows = await db.query<{ id: number; name: string }>('SELECT name FROM items ORDER BY id ASC;');
    expect(rows.map((r) => r.name)).toEqual(['first', 'second']);
  });
});
