import { describe, expect, it } from 'vitest';

import { fechaHora, formatearFechaHora } from './fecha-hora';

describe('fecha-hora domain type and utilities', () => {
  it('accepts valid date-time string in YYYY-MM-DD HH:mm:ss format', () => {
    const valid = '2026-11-08 09:05:03';
    expect(fechaHora(valid)).toBe(valid);
  });

  it('rejects strings missing time component, ISO T format, or non-matching regex', () => {
    expect(() => fechaHora('2026-11-08')).toThrow(RangeError);
    expect(() => fechaHora('2026-11-08T09:05:03')).toThrow(RangeError);
    expect(() => fechaHora('09:05:03')).toThrow(RangeError);
    expect(() => fechaHora('')).toThrow(RangeError);
  });

  it('rejects non-existent calendar dates', () => {
    expect(() => fechaHora('2026-02-30 10:00:00')).toThrow(RangeError);
    expect(() => fechaHora('2026-02-29 00:00:00')).toThrow(RangeError);
    expect(() => fechaHora('2026-13-01 00:00:00')).toThrow(RangeError);
    expect(() => fechaHora('2026-04-31 12:00:00')).toThrow(RangeError);
    expect(() => fechaHora('2026-11-08 25:00:00')).toThrow(RangeError);
    expect(() => fechaHora('2026-11-08 12:60:00')).toThrow(RangeError);
    expect(() => fechaHora('2026-11-08 12:00:60')).toThrow(RangeError);
  });

  it('accepts leap year February 29th', () => {
    const leapDate = '2024-02-29 23:59:59';
    expect(fechaHora(leapDate)).toBe(leapDate);
  });

  it('formatearFechaHora formats a Date into local YYYY-MM-DD HH:mm:ss with zero-padding', () => {
    // In JavaScript, month 10 is November (0-indexed)
    const d = new Date(2026, 10, 8, 9, 5, 3);
    expect(formatearFechaHora(d)).toBe('2026-11-08 09:05:03');
  });

  it('formatearFechaHora throws RangeError for invalid Date objects', () => {
    expect(() => formatearFechaHora(new Date('invalid'))).toThrow(RangeError);
  });
});
