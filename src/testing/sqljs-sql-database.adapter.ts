import initSqlJs, { type BindParams, type Database as SqlJsDb } from 'sql.js';

import { SerialQueue } from '../app/shared/infrastructure/sqlite/serial-queue';
import type {
  RunResult,
  SqlDatabase,
  SqlExecutor,
  SqlValue,
} from '../app/shared/infrastructure/sqlite/sql-database.port';

export class SqlJsDatabase implements SqlDatabase {
  private readonly queue = new SerialQueue();

  private constructor(private readonly db: SqlJsDb) {}

  static async create(): Promise<SqlJsDatabase> {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    db.run('PRAGMA foreign_keys = ON;');
    return new SqlJsDatabase(db);
  }

  private internalQuery<T extends object>(sql: string, params?: readonly SqlValue[]): T[] {
    const res = this.db.exec(sql, (params as BindParams) ?? undefined);
    if (!res.length) {
      return [];
    }
    const { columns, values } = res[0];
    return values.map((row) => {
      const obj: Record<string, unknown> = {};
      for (let i = 0; i < columns.length; i++) {
        obj[columns[i]] = row[i];
      }
      return obj as T;
    });
  }

  private internalRun(sql: string, params?: readonly SqlValue[]): RunResult {
    this.db.run(sql, (params as BindParams) ?? undefined);
    const changes = this.db.getRowsModified();
    const rowidRes = this.db.exec('SELECT last_insert_rowid()');
    const rawId = rowidRes[0]?.values[0]?.[0];
    const lastInsertId = typeof rawId === 'number' && rawId > 0 ? rawId : null;
    return { changes, lastInsertId };
  }

  private internalExec(script: string): void {
    this.db.exec(script);
  }

  query<T extends object>(sql: string, params?: readonly SqlValue[]): Promise<T[]> {
    return this.queue.enqueue(async () => this.internalQuery<T>(sql, params));
  }

  run(sql: string, params?: readonly SqlValue[]): Promise<RunResult> {
    return this.queue.enqueue(async () => this.internalRun(sql, params));
  }

  exec(script: string): Promise<void> {
    return this.queue.enqueue(async () => this.internalExec(script));
  }

  transaction<T>(work: (tx: SqlExecutor) => Promise<T>): Promise<T> {
    return this.queue.enqueue(async () => {
      this.db.exec('BEGIN');
      const tx: SqlExecutor = {
        query: async <R extends object>(sql: string, params?: readonly SqlValue[]): Promise<R[]> => {
          return this.internalQuery<R>(sql, params);
        },
        run: async (sql: string, params?: readonly SqlValue[]): Promise<RunResult> => {
          return this.internalRun(sql, params);
        },
        exec: async (script: string): Promise<void> => {
          this.internalExec(script);
        },
      };

      try {
        const result = await work(tx);
        this.db.exec('COMMIT');
        return result;
      } catch (err) {
        this.db.exec('ROLLBACK');
        throw err;
      }
    });
  }
}
