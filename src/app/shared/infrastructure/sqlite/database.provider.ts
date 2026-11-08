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

  async init(): Promise<void> {
    if (!this.instance) {
      const db = await createCapacitorSqlDatabase();
      await migrar(db, MIGRACIONES);
      this.instance = db;
    }
  }

  get db(): SqlDatabase {
    if (!this.instance) {
      throw new Error('DatabaseProvider has not been initialized. Call init() first.');
    }
    return this.instance;
  }
}
