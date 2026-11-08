import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from '@capacitor-community/sqlite';

import { CapacitorSqlDatabase } from './capacitor-sql-database.adapter';
import type { SqlDatabase } from './sql-database.port';

export const DB_NAME = 'gestor_resmas';

export async function createCapacitorSqlDatabase(): Promise<SqlDatabase> {
  const sqlite = new SQLiteConnection(CapacitorSQLite);
  const esWeb = Capacitor.getPlatform() === 'web';

  if (esWeb) {
    const { defineCustomElements } = await import('jeep-sqlite/loader');
    defineCustomElements(window);
    if (!document.querySelector('jeep-sqlite')) {
      const jeep = document.createElement('jeep-sqlite');
      document.body.appendChild(jeep);
    }
    await customElements.whenDefined('jeep-sqlite');
    await sqlite.initWebStore();
  }

  const isConn = await sqlite.isConnection(DB_NAME, false);
  let db: SQLiteDBConnection;
  if (isConn.result) {
    db = await sqlite.retrieveConnection(DB_NAME, false);
  } else {
    db = await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false);
  }

  const isOpen = await db.isDBOpen();
  if (!isOpen.result) {
    await db.open();
  }

  await db.execute('PRAGMA foreign_keys = ON;', false);

  return new CapacitorSqlDatabase(db, {
    esWeb,
    guardar: async () => {
      await sqlite.saveToStore(DB_NAME);
    },
  });
}
