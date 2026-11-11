import { describe, expect, it } from 'vitest';

import { cajas, fechaHora, pesos, resmas } from '../../shared/domain';

import { agruparPorTipo, descontarResmas, nuevoLote, progreso, type Lote } from './lote';

describe('nuevoLote', () => {
  it('calculates 10 reams, $12.000 unit cost and $120.000 total cost for 1 box at $120.000', () => {
    const nuevo = nuevoLote('CARTA', 1, 120000);

    expect(nuevo).toEqual({
      tipoPapel: 'CARTA',
      cantidadCajas: 1,
      costoPorCaja: 120000,
      costoUnitarioResma: 12000,
      resmasIniciales: 10,
      costoTotal: 120000,
    });
  });

  it('calculates 20 reams, $12.000 unit cost and $240.000 total cost for 2 boxes at $120.000', () => {
    const nuevo = nuevoLote('CARTA', 2, 120000);

    expect(nuevo).toEqual({
      tipoPapel: 'CARTA',
      cantidadCajas: 2,
      costoPorCaja: 120000,
      costoUnitarioResma: 12000,
      resmasIniciales: 20,
      costoTotal: 240000,
    });
  });

  it('rejects a box cost of $120.005 with COSTO_CAJA_INVALIDO (E5)', () => {
    expect(() => nuevoLote('CARTA', 1, 120005)).toThrow(expect.objectContaining({ codigo: 'COSTO_CAJA_INVALIDO' }));
  });

  it('rejects a box cost of 0 with COSTO_CAJA_INVALIDO', () => {
    expect(() => nuevoLote('CARTA', 1, 0)).toThrow(expect.objectContaining({ codigo: 'COSTO_CAJA_INVALIDO' }));
  });

  it('rejects 0 boxes with CANTIDAD_INVALIDA (E6)', () => {
    expect(() => nuevoLote('CARTA', 0, 120000)).toThrow(expect.objectContaining({ codigo: 'CANTIDAD_INVALIDA' }));
  });

  it('rejects 1.5 boxes with CANTIDAD_INVALIDA', () => {
    expect(() => nuevoLote('CARTA', 1.5, 120000)).toThrow(expect.objectContaining({ codigo: 'CANTIDAD_INVALIDA' }));
  });
});

describe('descontarResmas', () => {
  const baseLote: Lote = {
    idLote: 1,
    tipoPapel: 'CARTA',
    fechaCompra: fechaHora('2026-11-10 10:00:00'),
    cantidadCajas: cajas(1),
    costoPorCaja: pesos(120000),
    costoUnitarioResma: pesos(12000),
    resmasIniciales: resmas(10),
    resmasDisponibles: resmas(3),
    medioPagoCompra: 'EFECTIVO',
    estado: 'ACTIVO',
  };

  it('deducting 3 reams from 3 available sets status to AGOTADO and available to 0 (E7)', () => {
    const resultado = descontarResmas(baseLote, 3);

    expect(resultado).toEqual({
      resmasDisponibles: 0,
      estado: 'AGOTADO',
    });
  });

  it('deducting 4 reams from 3 available throws STOCK_INSUFICIENTE (E7)', () => {
    expect(() => descontarResmas(baseLote, 4)).toThrow(expect.objectContaining({ codigo: 'STOCK_INSUFICIENTE' }));
  });

  it('deducting 1 ream from 3 available keeps status ACTIVO with 2 available', () => {
    const resultado = descontarResmas(baseLote, 1);

    expect(resultado).toEqual({
      resmasDisponibles: 2,
      estado: 'ACTIVO',
    });
  });

  it('deducting 0 reams throws CANTIDAD_INVALIDA', () => {
    expect(() => descontarResmas(baseLote, 0)).toThrow(expect.objectContaining({ codigo: 'CANTIDAD_INVALIDA' }));
  });
});

describe('progreso', () => {
  it('returns 0.7 for 7 available reams out of 10 initial reams', () => {
    const lote = {
      resmasDisponibles: resmas(7),
      resmasIniciales: resmas(10),
    };

    expect(progreso(lote)).toBe(0.7);
  });
});

describe('agruparPorTipo', () => {
  it('excludes exhausted lots, groups by paper type, and sorts by purchase date ascending with id tiebreak', () => {
    const lotes: Lote[] = [
      {
        idLote: 2,
        tipoPapel: 'CARTA',
        fechaCompra: fechaHora('2026-11-10 12:00:00'),
        cantidadCajas: cajas(1),
        costoPorCaja: pesos(120000),
        costoUnitarioResma: pesos(12000),
        resmasIniciales: resmas(10),
        resmasDisponibles: resmas(10),
        medioPagoCompra: 'EFECTIVO',
        estado: 'ACTIVO',
      },
      {
        idLote: 1,
        tipoPapel: 'CARTA',
        fechaCompra: fechaHora('2026-11-10 10:00:00'),
        cantidadCajas: cajas(2),
        costoPorCaja: pesos(120000),
        costoUnitarioResma: pesos(12000),
        resmasIniciales: resmas(20),
        resmasDisponibles: resmas(20),
        medioPagoCompra: 'EFECTIVO',
        estado: 'ACTIVO',
      },
      {
        idLote: 3,
        tipoPapel: 'CARTA',
        fechaCompra: fechaHora('2026-11-10 10:00:00'),
        cantidadCajas: cajas(1),
        costoPorCaja: pesos(120000),
        costoUnitarioResma: pesos(12000),
        resmasIniciales: resmas(10),
        resmasDisponibles: resmas(10),
        medioPagoCompra: 'EFECTIVO',
        estado: 'ACTIVO',
      },
      {
        idLote: 4,
        tipoPapel: 'OFICIO',
        fechaCompra: fechaHora('2026-11-10 11:00:00'),
        cantidadCajas: cajas(1),
        costoPorCaja: pesos(130000),
        costoUnitarioResma: pesos(13000),
        resmasIniciales: resmas(10),
        resmasDisponibles: resmas(7),
        medioPagoCompra: 'TRANSFERENCIA',
        estado: 'ACTIVO',
      },
      {
        idLote: 5,
        tipoPapel: 'CARTA',
        fechaCompra: fechaHora('2026-11-09 09:00:00'),
        cantidadCajas: cajas(1),
        costoPorCaja: pesos(120000),
        costoUnitarioResma: pesos(12000),
        resmasIniciales: resmas(10),
        resmasDisponibles: resmas(0),
        medioPagoCompra: 'EFECTIVO',
        estado: 'AGOTADO',
      },
    ];

    const agrupados = agruparPorTipo(lotes);

    expect(agrupados.CARTA.map((l) => l.idLote)).toEqual([1, 3, 2]);
    expect(agrupados.OFICIO.map((l) => l.idLote)).toEqual([4]);
  });
});
