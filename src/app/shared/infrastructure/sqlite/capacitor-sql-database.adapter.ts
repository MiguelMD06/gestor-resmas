import type { SQLiteDBConnection } from '@capacitor-community/sqlite';

import { GuardadoWebError } from './guardado-web.error';
import { SerialQueue } from './serial-queue';
import type { RunResult, SqlDatabase, SqlExecutor, SqlValue } from './sql-database.port';

export interface CapacitorSqlDatabaseOptions {
  esWeb: boolean;
  guardar: () => Promise<void>;
}

export class CapacitorSqlDatabase implements SqlDatabase {
  private readonly queue = new SerialQueue();
  private pendienteGuardar = false;

  constructor(
    private readonly db: SQLiteDBConnection,
    private readonly options?: CapacitorSqlDatabaseOptions,
  ) {}

  private async persistStore(escrituraAplicada: boolean): Promise<void> {
    if (!this.options?.esWeb) {
      return;
    }
    try {
      await this.options.guardar();
      this.pendienteGuardar = false;
    } catch (cause) {
      this.pendienteGuardar = true;
      const message = escrituraAplicada
        ? 'Failed to persist web database store after write.'
        : 'Failed to flush pending web database save; write was not executed.';
      throw new GuardadoWebError(message, escrituraAplicada, cause);
    }
  }

  private async saveIfWeb(): Promise<void> {
    await this.persistStore(true);
  }

  private async flushPendingSaveIfWeb(): Promise<void> {
    if (this.pendienteGuardar) {
      await this.persistStore(false);
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
      await this.flushPendingSaveIfWeb();
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
      await this.flushPendingSaveIfWeb();
      await this.db.execute(script, false);
      await this.saveIfWeb();
    });
  }

  transaction<T>(work: (tx: SqlExecutor) => Promise<T>): Promise<T> {
    return this.queue.enqueue(async () => {
      await this.flushPendingSaveIfWeb();
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

      let result: T;
      try {
        result = await work(tx);
        await this.db.commitTransaction();
      } catch (err) {
        await this.db.rollbackTransaction();
        throw err;
      }

      await this.saveIfWeb();
      return result;
    });
  }
}
