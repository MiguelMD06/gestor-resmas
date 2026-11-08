export type SqlValue = string | number | null;

export interface RunResult {
  changes: number;
  lastInsertId: number | null;
}

export interface SqlExecutor {
  query<T extends object>(sql: string, params?: readonly SqlValue[]): Promise<T[]>;
  run(sql: string, params?: readonly SqlValue[]): Promise<RunResult>;
  exec(script: string): Promise<void>; // several statements, no parameters
}

export interface SqlDatabase extends SqlExecutor {
  /**
   * Executes an atomic database transaction.
   *
   * R1: Commits if `work` completes successfully and returns its result.
   * If `work` throws an error, rolls back everything and rethrows the same error.
   *
   * R3: Only the provided `tx` executor must be used inside `work`.
   * Calling the outer `SqlDatabase` instance from inside `work` will deadlock the serial queue.
   */
  transaction<T>(work: (tx: SqlExecutor) => Promise<T>): Promise<T>;
}
