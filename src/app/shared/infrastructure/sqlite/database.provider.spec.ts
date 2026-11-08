import { describe, expect, it } from 'vitest';

import { DatabaseProvider } from './database.provider';

describe('DatabaseProvider', () => {
  it('throws an error if db getter is accessed before init() is called', () => {
    const provider = new DatabaseProvider();
    expect(() => provider.db).toThrow('DatabaseProvider has not been initialized. Call init() first.');
  });
});
