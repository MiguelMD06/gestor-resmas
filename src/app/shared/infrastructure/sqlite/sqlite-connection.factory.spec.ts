import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DB_NAME, type createCapacitorSqlDatabase as CreateCapacitorSqlDatabaseFn } from './sqlite-connection.factory';

const {
  getPlatformMock,
  defineCustomElementsMock,
  initWebStoreMock,
  isConnectionMock,
  retrieveConnectionMock,
  createConnectionMock,
  closeConnectionMock,
  saveToStoreMock,
  isDBOpenMock,
  openMock,
  executeMock,
  sqliteConnectionConstructorMock,
} = vi.hoisted(() => ({
  getPlatformMock: vi.fn<() => string>(),
  defineCustomElementsMock: vi.fn(),
  initWebStoreMock: vi.fn(),
  isConnectionMock: vi.fn(),
  retrieveConnectionMock: vi.fn(),
  createConnectionMock: vi.fn(),
  closeConnectionMock: vi.fn(),
  saveToStoreMock: vi.fn(),
  isDBOpenMock: vi.fn(),
  openMock: vi.fn(),
  executeMock: vi.fn(),
  sqliteConnectionConstructorMock: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: getPlatformMock,
  },
}));

vi.mock('jeep-sqlite/loader', () => ({
  defineCustomElements: defineCustomElementsMock,
}));

vi.mock('@capacitor-community/sqlite', () => ({
  CapacitorSQLite: {},
  SQLiteConnection: class {
    constructor(...args: unknown[]) {
      sqliteConnectionConstructorMock(...args);
    }
    initWebStore = initWebStoreMock;
    isConnection = isConnectionMock;
    retrieveConnection = retrieveConnectionMock;
    createConnection = createConnectionMock;
    closeConnection = closeConnectionMock;
    saveToStore = saveToStoreMock;
  },
}));

describe('createCapacitorSqlDatabase factory', () => {
  let createCapacitorSqlDatabase: typeof CreateCapacitorSqlDatabaseFn;

  const mockDbConnection = {
    isDBOpen: isDBOpenMock,
    open: openMock,
    execute: executeMock,
    query: vi.fn(),
    run: vi.fn(),
    beginTransaction: vi.fn(),
    commitTransaction: vi.fn(),
    rollbackTransaction: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    document.body.innerHTML = '';
    vi.spyOn(customElements, 'whenDefined').mockResolvedValue(HTMLElement);

    getPlatformMock.mockReturnValue('android');
    initWebStoreMock.mockResolvedValue(undefined);
    isConnectionMock.mockResolvedValue({ result: false });
    retrieveConnectionMock.mockResolvedValue(mockDbConnection);
    createConnectionMock.mockResolvedValue(mockDbConnection);
    closeConnectionMock.mockResolvedValue(undefined);
    saveToStoreMock.mockResolvedValue(undefined);
    isDBOpenMock.mockResolvedValue({ result: false });
    openMock.mockResolvedValue(undefined);
    executeMock.mockResolvedValue({ changes: { changes: 0 } });

    const mod = await import('./sqlite-connection.factory');
    createCapacitorSqlDatabase = mod.createCapacitorSqlDatabase;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('registers jeep-sqlite, appends a single <jeep-sqlite> to document.body, and calls initWebStore() before creating the connection on web', async () => {
    getPlatformMock.mockReturnValue('web');
    const callOrder: string[] = [];
    defineCustomElementsMock.mockImplementation(() => {
      callOrder.push('defineCustomElements');
    });
    initWebStoreMock.mockImplementation(async () => {
      callOrder.push('initWebStore');
    });
    createConnectionMock.mockImplementation(async () => {
      callOrder.push('createConnection');
      return mockDbConnection;
    });

    await createCapacitorSqlDatabase();
    await createCapacitorSqlDatabase();

    expect(defineCustomElementsMock).toHaveBeenCalledWith(window);
    expect(document.body.querySelectorAll('jeep-sqlite')).toHaveLength(1);
    expect(initWebStoreMock).toHaveBeenCalled();
    expect(callOrder.slice(0, 3)).toEqual(['defineCustomElements', 'initWebStore', 'createConnection']);
  });

  it('does not call defineCustomElements or initWebStore() on native platforms', async () => {
    getPlatformMock.mockReturnValue('android');

    await createCapacitorSqlDatabase();

    expect(defineCustomElementsMock).not.toHaveBeenCalled();
    expect(initWebStoreMock).not.toHaveBeenCalled();
    expect(document.body.querySelector('jeep-sqlite')).toBeNull();
  });

  it('uses retrieveConnection instead of createConnection when isConnection returns true', async () => {
    isConnectionMock.mockResolvedValue({ result: true });

    await createCapacitorSqlDatabase();

    expect(isConnectionMock).toHaveBeenCalledWith(DB_NAME, false);
    expect(retrieveConnectionMock).toHaveBeenCalledWith(DB_NAME, false);
    expect(createConnectionMock).not.toHaveBeenCalled();
  });

  it('does not call open() when the database is already open, and calls open() when it is closed', async () => {
    isDBOpenMock.mockResolvedValueOnce({ result: true });
    await createCapacitorSqlDatabase();
    expect(openMock).not.toHaveBeenCalled();

    isDBOpenMock.mockResolvedValueOnce({ result: false });
    await createCapacitorSqlDatabase();
    expect(openMock).toHaveBeenCalledTimes(1);
  });

  it('always executes PRAGMA foreign_keys = ON; with transaction = false', async () => {
    await createCapacitorSqlDatabase();

    expect(executeMock).toHaveBeenCalledWith('PRAGMA foreign_keys = ON;', false);
  });

  it('calls closeConnection(DB_NAME, false) and rethrows the original error when open() rejects on first attempt', async () => {
    const openError = new Error('Database open failed');
    openMock.mockRejectedValueOnce(openError);

    await expect(createCapacitorSqlDatabase()).rejects.toBe(openError);

    expect(closeConnectionMock).toHaveBeenCalledTimes(1);
    expect(closeConnectionMock).toHaveBeenCalledWith(DB_NAME, false);
  });

  it('calls closeConnection(DB_NAME, false) and rethrows the original error when isDBOpen() rejects', async () => {
    const isDBOpenError = new Error('isDBOpen check failed');
    isDBOpenMock.mockRejectedValueOnce(isDBOpenError);

    await expect(createCapacitorSqlDatabase()).rejects.toBe(isDBOpenError);

    expect(closeConnectionMock).toHaveBeenCalledTimes(1);
    expect(closeConnectionMock).toHaveBeenCalledWith(DB_NAME, false);
  });

  it('calls createConnection again on a second attempt when the first failed in open() and closeConnection succeeded', async () => {
    const openError = new Error('First attempt open failed');
    openMock.mockRejectedValueOnce(openError);

    await expect(createCapacitorSqlDatabase()).rejects.toBe(openError);
    expect(createConnectionMock).toHaveBeenCalledTimes(1);
    expect(closeConnectionMock).toHaveBeenCalledWith(DB_NAME, false);

    isConnectionMock.mockResolvedValue({ result: false });

    const db = await createCapacitorSqlDatabase();

    expect(isConnectionMock).toHaveBeenLastCalledWith(DB_NAME, false);
    expect(createConnectionMock).toHaveBeenCalledTimes(2);
    expect(retrieveConnectionMock).not.toHaveBeenCalled();
    expect(db).toBeDefined();
  });

  it('reuses existing connection via retrieveConnection without calling createConnection on a second attempt when closeConnection also failed', async () => {
    const openError = new Error('First attempt open failed');
    const closeError = new Error('closeConnection failed');
    openMock.mockRejectedValueOnce(openError);
    closeConnectionMock.mockRejectedValueOnce(closeError);

    await expect(createCapacitorSqlDatabase()).rejects.toBe(openError);
    expect(createConnectionMock).toHaveBeenCalledTimes(1);
    expect(closeConnectionMock).toHaveBeenCalledWith(DB_NAME, false);

    isConnectionMock.mockResolvedValue({ result: true });

    const db = await createCapacitorSqlDatabase();

    expect(isConnectionMock).toHaveBeenLastCalledWith(DB_NAME, false);
    expect(retrieveConnectionMock).toHaveBeenCalledWith(DB_NAME, false);
    expect(createConnectionMock).toHaveBeenCalledTimes(1);
    expect(db).toBeDefined();
  });

  it('closes connection and rethrows the original error when execute PRAGMA rejects, even if closeConnection also rejects', async () => {
    const pragmaError = new Error('PRAGMA failed');
    const closeError = new Error('closeConnection failed');
    executeMock.mockRejectedValueOnce(pragmaError);
    closeConnectionMock.mockRejectedValueOnce(closeError);

    await expect(createCapacitorSqlDatabase()).rejects.toBe(pragmaError);

    expect(closeConnectionMock).toHaveBeenCalledWith(DB_NAME, false);
  });

  it('reuses the same SQLiteConnection instance across multiple calls without re-instantiating', async () => {
    await createCapacitorSqlDatabase();
    await createCapacitorSqlDatabase();

    expect(sqliteConnectionConstructorMock).toHaveBeenCalledTimes(1);
  });

  it('retries initWebStore() if the first attempt failed, but calls it only once on subsequent successes', async () => {
    getPlatformMock.mockReturnValue('web');
    initWebStoreMock.mockRejectedValueOnce(new Error('initWebStore failed'));

    await expect(createCapacitorSqlDatabase()).rejects.toThrow('initWebStore failed');
    expect(initWebStoreMock).toHaveBeenCalledTimes(1);

    await createCapacitorSqlDatabase();
    expect(initWebStoreMock).toHaveBeenCalledTimes(2);

    await createCapacitorSqlDatabase();
    expect(initWebStoreMock).toHaveBeenCalledTimes(2);
  });
});
