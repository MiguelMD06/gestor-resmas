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

  async init(createDatabase: () => Promise<SqlDatabase> = createCapacitorSqlDatabase): Promise<void> {
    if (this.instance) {
      return;
    }

    if (!this.initPromise) {
      this.initPromise = (async () => {
        try {
          const db = await createDatabase();
          await migrar(db, MIGRACIONES);
          this.instance = db;
        } catch (err) {
          this.initPromise = null;
          throw err;
        }
      })();
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
