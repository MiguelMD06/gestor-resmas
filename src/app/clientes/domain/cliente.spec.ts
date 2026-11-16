import { describe, expect, it } from 'vitest';

import { normalizarBusqueda, validarNombre, validarTelefono } from './cliente';

describe('cliente domain rules', () => {
  describe('validarNombre', () => {
    it('trims valid names up to 80 characters', () => {
      expect(validarNombre('  Ana Pérez  ')).toBe('Ana Pérez');
      const ochenta = 'A'.repeat(80);
      expect(validarNombre(ochenta)).toBe(ochenta);
    });

    it('rejects empty, whitespace-only, or names longer than 80 characters with NOMBRE_INVALIDO (E2)', () => {
      expect(() => validarNombre('')).toThrow(expect.objectContaining({ codigo: 'NOMBRE_INVALIDO' }));
      expect(() => validarNombre('   \t\n  ')).toThrow(expect.objectContaining({ codigo: 'NOMBRE_INVALIDO' }));
      expect(() => validarNombre('A'.repeat(81))).toThrow(expect.objectContaining({ codigo: 'NOMBRE_INVALIDO' }));
    });
  });

  describe('validarTelefono', () => {
    it('returns null for null, empty string, or whitespace-only string (E3)', () => {
      expect(validarTelefono(null)).toBeNull();
      expect(validarTelefono('')).toBeNull();
      expect(validarTelefono('   ')).toBeNull();
    });

    it('accepts 10-digit mobile numbers starting with 3 and strips spaces (E3, D10)', () => {
      expect(validarTelefono('3001234567')).toBe('3001234567');
      expect(validarTelefono('300 123 4567')).toBe('3001234567');
    });

    it('rejects non-mobile, wrong length, or non-digit characters with TELEFONO_INVALIDO (E3)', () => {
      expect(() => validarTelefono('300-ABC')).toThrow(expect.objectContaining({ codigo: 'TELEFONO_INVALIDO' }));
      expect(() => validarTelefono('2001234567')).toThrow(expect.objectContaining({ codigo: 'TELEFONO_INVALIDO' }));
      expect(() => validarTelefono('300123456')).toThrow(expect.objectContaining({ codigo: 'TELEFONO_INVALIDO' }));
      expect(() => validarTelefono('30012345678')).toThrow(expect.objectContaining({ codigo: 'TELEFONO_INVALIDO' }));
      expect(() => validarTelefono('+573001234567')).toThrow(expect.objectContaining({ codigo: 'TELEFONO_INVALIDO' }));
    });
  });

  describe('normalizarBusqueda', () => {
    it('lowercases and removes diacritics (E5)', () => {
      expect(normalizarBusqueda('Ana María Pérez')).toBe('ana maria perez');
      expect(normalizarBusqueda('JOSÉ ÁLVAREZ')).toBe('jose alvarez');
    });
  });
});
