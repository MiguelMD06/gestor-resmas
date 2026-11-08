import type { SQLiteDBConnection } from '@capacitor-community/sqlite';

import { SerialQueue } from './serial-queue';
import type { RunResult, SqlDatabase, SqlExecutor, SqlValue } from './sql-database.port';

export interface CapacitorSqlDatabaseOptions {
  esWeb: boolean;
  guardar: () => Promise<void>;
}

export class CapacitorSqlDatabase implements SqlDatabase {
  private readonly queue = new SerialQueue();

  constructor(
    private readonly db: SQLiteDBConnection,
    private readonly options?: CapacitorSqlDatabaseOptions,
  ) {}

  private async saveIfWeb(): Promise<void> {
    if (this.options?.esWeb) {
      await this.options.guardar();
    }
  }

  query<T extends object>(sql: string, params?: readonly SqlValue[]): Promise<T[]> {
    return this.queue.enqueue(async () => {
      const res = await this.db.query(sql, params ? [...params] : []);
      return (res.values ?? []) as T[];
    });
  }

  run(sql: string, params?: readonly SqlValue[]): Promise<RunResult> {
    return this.queue.enqueue(async () => {
      const res = await this.db.run(sql, params ? [...params] : [], false);
      await this.saveIfWeb();
      return {
        changes: res.changes?.changes ?? 0,
        lastInsertId: res.changes?.lastId ?? null,
      };
    });
  }

  exec(script: string): Promise<void> {
    return this.queue.enqueue(async () => {
      await this.db.execute(script, false);
      await this.saveIfWeb();
    });
  }

  transaction<T>(work: (tx: SqlExecutor) => Promise<T>): Promise<T> {
    return this.queue.enqueue(async () => {
      await this.db.beginTransaction();

      const tx: SqlExecutor = {
        query: async <R extends object>(sql: string, params?: readonly SqlValue[]): Promise<R[]> => {
          const res = await this.db.query(sql, params ? [...params] : []);
          return (res.values ?? []) as R[];
        },
        run: async (sql: string, params?: readonly SqlValue[]): Promise<RunResult> => {
          const res = await this.db.run(sql, params ? [...params] : [], false);
          return {
            changes: res.changes?.changes ?? 0,
            lastInsertId: res.changes?.lastId ?? null,
          };
        },
        exec: async (script: string): Promise<void> => {
          await this.db.execute(script, false);
        },
      };

      try {
        const result = await work(tx);
        await this.db.commitTransaction();
        await this.saveIfWeb();
        return result;
      } catch (err) {
        await this.db.rollbackTransaction();
        throw err;
      }
    });
  }
}
