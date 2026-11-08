import type { SqlDatabase } from '../sql-database.port';

import type { Migracion } from './migracion';

/**
 * Applies database migrations in consecutive order.
 *
 * R4: Validates versions are 1, 2, 3, ... consecutive and unique before touching DB.
 * R5: Validates PRAGMA user_version <= max supported version.
 * R6: Applies each pending migration in its own isolated transaction.
 * R7: Returns the final version (idempotent).
 */
export async function migrar(db: SqlDatabase, migraciones: readonly Migracion[]): Promise<number> {
  for (let i = 0; i < migraciones.length; i++) {
    const expectedVersion = i + 1;
    if (migraciones[i].version !== expectedVersion) {
      throw new Error(
        `Invalid migration versions: migration at index ${i} has version ${migraciones[i].version}, expected ${expectedVersion}`,
      );
    }
  }

  const rows = await db.query<{ user_version: number }>('PRAGMA user_version;');
  const currentVersion = rows[0]?.user_version ?? 0;
  const maxVersion = migraciones.length > 0 ? migraciones[migraciones.length - 1].version : 0;

  if (currentVersion > maxVersion) {
    throw new Error(`Database version ${currentVersion} is newer than this app supports (${maxVersion})`);
  }

  let latestVersion = currentVersion;
  for (const migracion of migraciones) {
    if (migracion.version > currentVersion) {
      await db.transaction(async (tx) => {
        await tx.exec(migracion.script);
        await tx.exec(`PRAGMA user_version = ${migracion.version};`);
      });
      latestVersion = migracion.version;
    }
  }

  return latestVersion;
}
