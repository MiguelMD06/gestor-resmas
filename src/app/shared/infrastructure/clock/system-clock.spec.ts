import { afterEach, describe, expect, it, vi } from 'vitest';

import { SystemClock } from './system-clock';

describe('SystemClock infrastructure adapter', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('implements Clock and returns current local date-time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 2, 3, 4, 5));

    const clock = new SystemClock();
    expect(clock.ahora()).toBe('2026-01-02 03:04:05');
  });
});
