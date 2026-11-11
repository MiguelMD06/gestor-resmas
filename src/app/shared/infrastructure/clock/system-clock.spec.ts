import { afterEach, describe, expect, it, vi } from 'vitest';

import { fechaHora } from '../../domain/fecha-hora';

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

  it('returns a valid FechaHora matching YYYY-MM-DD HH:MM:SS format', () => {
    const clock = new SystemClock();
    const ahora = clock.ahora();

    expect(ahora).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(fechaHora(ahora)).toBe(ahora);
  });
});
