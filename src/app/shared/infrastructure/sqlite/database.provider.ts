import { Injectable } from '@angular/core';

import { MIGRACIONES } from './migrations';
import { migrar } from './migrations/migration-runner';
import type { SqlDatabase } from './sql-database.port';
import { createCapacitorSqlDatabase } from './sqlite-connection.factory';

@Injectable({
  providedIn: 'root',
})
export class DatabaseProvider {
  private instance: SqlDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initializes the SQLite connection and runs pending migrations.
   * When an instance already exists or an initialization is in flight,
   * the `createDatabase` argument is ignored.
   */
  async init(createDatabase: () => Promise<SqlDatabase> = createCapacitorSqlDatabase): Promise<void> {
    if (this.instance) {
      return;
    }

    if (!this.initPromise) {
      const intento = (async () => {
        const db = await createDatabase();
        await migrar(db, MIGRACIONES);
        this.instance = db;
      })();
      this.initPromise = intento;
      intento.catch(() => {
        if (this.initPromise === intento) {
          this.initPromise = null;
        }
      });
    }

    return this.initPromise;
  }

  get db(): SqlDatabase {
    if (!this.instance) {
      throw new Error('DatabaseProvider has not been initialized. Call init() first.');
    }
    return this.instance;
  }
}
