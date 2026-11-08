import { describe, expect, it } from 'vitest';

import {
  cajas,
  cajasAResmas,
  esMedioPago,
  esTipoPapel,
  fechaHora,
  formatearFechaHora,
  formatearPesos,
  MEDIOS_PAGO,
  pesos,
  pesosPositivos,
  resmas,
  resmasPositivas,
  RESMAS_POR_CAJA,
  restarPesos,
  sumarPesos,
  TIPOS_PAPEL,
} from './index';

describe('domain barrel index', () => {
  it('re-exports all domain public functions, constants, and types', () => {
    expect(typeof pesos).toBe('function');
    expect(typeof pesosPositivos).toBe('function');
    expect(typeof sumarPesos).toBe('function');
    expect(typeof restarPesos).toBe('function');
    expect(typeof formatearPesos).toBe('function');

    expect(RESMAS_POR_CAJA).toBe(10);
    expect(typeof resmas).toBe('function');
    expect(typeof resmasPositivas).toBe('function');
    expect(typeof cajas).toBe('function');
    expect(typeof cajasAResmas).toBe('function');

    expect(MEDIOS_PAGO).toEqual(['EFECTIVO', 'TRANSFERENCIA']);
    expect(typeof esMedioPago).toBe('function');

    expect(TIPOS_PAPEL).toEqual(['CARTA', 'OFICIO']);
    expect(typeof esTipoPapel).toBe('function');

    expect(typeof fechaHora).toBe('function');
    expect(typeof formatearFechaHora).toBe('function');
  });
});
