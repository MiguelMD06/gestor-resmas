/**
 * Thrown when persisting the in-memory SQLite database to the web store fails.
 *
 * The `escrituraAplicada` flag distinguishes the two situations in which it is raised:
 * - `true`: after a write or commit. The SQL write already took effect in memory and only the
 *   persistence failed. Retrying the business operation would duplicate the write.
 * - `false`: before a write, when flushing a previously failed save fails again. The new
 *   write was NOT executed. The operation can be retried.
 *
 * A pending save is flushed automatically only before the next write (see
 * `flushPendingSaveIfWeb` in `capacitor-sql-database.adapter.ts`).
 */
export class GuardadoWebError extends Error {
  constructor(
    message: string,
    readonly escrituraAplicada: boolean,
    cause?: unknown,
  ) {
    super(message, { cause });
    this.name = 'GuardadoWebError';
  }
}
