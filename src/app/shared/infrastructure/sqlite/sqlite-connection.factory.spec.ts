import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createCapacitorSqlDatabase, DB_NAME } from './sqlite-connection.factory';

const {
  getPlatformMock,
  defineCustomElementsMock,
  initWebStoreMock,
  isConnectionMock,
  retrieveConnectionMock,
  createConnectionMock,
  saveToStoreMock,
  isDBOpenMock,
  openMock,
  executeMock,
} = vi.hoisted(() => ({
  getPlatformMock: vi.fn<() => string>(),
  defineCustomElementsMock: vi.fn(),
  initWebStoreMock: vi.fn(),
  isConnectionMock: vi.fn(),
  retrieveConnectionMock: vi.fn(),
  createConnectionMock: vi.fn(),
  saveToStoreMock: vi.fn(),
  isDBOpenMock: vi.fn(),
  openMock: vi.fn(),
  executeMock: vi.fn(),
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
    initWebStore = initWebStoreMock;
    isConnection = isConnectionMock;
    retrieveConnection = retrieveConnectionMock;
    createConnection = createConnectionMock;
    saveToStore = saveToStoreMock;
  },
}));

describe('createCapacitorSqlDatabase factory', () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    vi.spyOn(customElements, 'whenDefined').mockResolvedValue(HTMLElement);

    getPlatformMock.mockReturnValue('android');
    initWebStoreMock.mockResolvedValue(undefined);
    isConnectionMock.mockResolvedValue({ result: false });
    retrieveConnectionMock.mockResolvedValue(mockDbConnection);
    createConnectionMock.mockResolvedValue(mockDbConnection);
    saveToStoreMock.mockResolvedValue(undefined);
    isDBOpenMock.mockResolvedValue({ result: false });
    openMock.mockResolvedValue(undefined);
    executeMock.mockResolvedValue({ changes: { changes: 0 } });
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
});
