import { describe, expect, it } from 'vitest';

import { esVacio, ROL_CANCELAR, ROL_GUARDADO, soloCierreExplicito } from './formulario';

describe('formulario helpers', () => {
  describe('esVacio', () => {
    it('returns true for null, undefined, empty string, whitespace-only string, and NaN', () => {
      expect(esVacio(null)).toBe(true);
      expect(esVacio(undefined)).toBe(true);
      expect(esVacio('')).toBe(true);
      expect(esVacio('  ')).toBe(true);
      expect(esVacio(Number.NaN)).toBe(true);
    });

    it('returns false for 0, "0", and 300000', () => {
      expect(esVacio(0)).toBe(false);
      expect(esVacio('0')).toBe(false);
      expect(esVacio(300000)).toBe(false);
    });
  });

  describe('soloCierreExplicito', () => {
    it('exports the expected role constants', () => {
      expect(ROL_GUARDADO).toBe('guardado');
      expect(ROL_CANCELAR).toBe('cancel');
    });

    it('returns true for guardado and cancel roles', async () => {
      await expect(soloCierreExplicito(undefined, 'guardado')).resolves.toBe(true);
      await expect(soloCierreExplicito(undefined, ROL_GUARDADO)).resolves.toBe(true);
      await expect(soloCierreExplicito(undefined, 'cancel')).resolves.toBe(true);
      await expect(soloCierreExplicito(undefined, ROL_CANCELAR)).resolves.toBe(true);
    });

    it('returns false for backdrop, gesture, and undefined roles', async () => {
      await expect(soloCierreExplicito(undefined, 'backdrop')).resolves.toBe(false);
      await expect(soloCierreExplicito(undefined, 'gesture')).resolves.toBe(false);
      await expect(soloCierreExplicito(undefined, undefined)).resolves.toBe(false);
      await expect(soloCierreExplicito(undefined)).resolves.toBe(false);
    });
  });
});
