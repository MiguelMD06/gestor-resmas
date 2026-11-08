/**
 * Thrown when persisting the in-memory SQLite database to the web store fails.
 *
 * It is raised in two situations that callers cannot tell apart:
 * - After a write or commit: the SQL write already took effect in memory and only the
 *   persistence failed. Retrying the same business operation would duplicate the write.
 * - Before a write, when flushing a previously failed save fails again: the new write
 *   was NOT executed.
 *
 * Callers must not blindly retry the business operation. A pending save is flushed
 * automatically before the next write (see `flushPendingSaveIfWeb` in
 * `capacitor-sql-database.adapter.ts`).
 */
export class GuardadoWebError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'GuardadoWebError';
  }
}
