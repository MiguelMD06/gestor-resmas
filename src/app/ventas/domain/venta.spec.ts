import { describe, expect, it } from 'vitest';

import { fechaHora, pesos, resmas } from '../../shared/domain';

import { armarVenta } from './venta';

describe('armarVenta', () => {
  const ahora = fechaHora('2026-11-15 12:00:00');
  const fechaValida = fechaHora('2026-11-15 12:00:00');

  const lineaBase = {
    idLote: 1,
    costoUnitario: pesos(12000),
    disponibles: resmas(20),
    cantidad: 5,
    precioUnitario: 15000,
  };

  it('rejects an empty lines list with VENTA_SIN_LINEAS', () => {
    expect(() =>
      armarVenta({
        idCliente: 2,
        esMostrador: false,
        fecha: fechaValida,
        ahora,
        lineas: [],
        pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
      }),
    ).toThrow(expect.objectContaining({ codigo: 'VENTA_SIN_LINEAS' }));
  });

  it('rejects repeated lot ids with LOTE_REPETIDO (D5, E16)', () => {
    expect(() =>
      armarVenta({
        idCliente: 2,
        esMostrador: false,
        fecha: fechaValida,
        ahora,
        lineas: [
          { ...lineaBase, idLote: 1, cantidad: 2 },
          { ...lineaBase, idLote: 1, cantidad: 3 },
        ],
        pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
      }),
    ).toThrow(expect.objectContaining({ codigo: 'LOTE_REPETIDO' }));
  });

  it('rejects non-integer or non-positive ream quantities with CANTIDAD_RESMAS_INVALIDA', () => {
    for (const cantidad of [0, -1, 1.5, Number.NaN]) {
      expect(() =>
        armarVenta({
          idCliente: 2,
          esMostrador: false,
          fecha: fechaValida,
          ahora,
          lineas: [{ ...lineaBase, cantidad }],
          pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
        }),
      ).toThrow(expect.objectContaining({ codigo: 'CANTIDAD_RESMAS_INVALIDA' }));
    }
  });

  it('rejects non-integer or non-positive unit prices with PRECIO_INVALIDO and accepts any positive integer (D14)', () => {
    for (const precioUnitario of [0, -100, 15000.5, Number.NaN]) {
      expect(() =>
        armarVenta({
          idCliente: 2,
          esMostrador: false,
          fecha: fechaValida,
          ahora,
          lineas: [{ ...lineaBase, precioUnitario }],
          pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
        }),
      ).toThrow(expect.objectContaining({ codigo: 'PRECIO_INVALIDO' }));
    }

    const ventaMinPrecio = armarVenta({
      idCliente: 2,
      esMostrador: false,
      fecha: fechaValida,
      ahora,
      lineas: [{ ...lineaBase, cantidad: 1, precioUnitario: 1 }],
      pago: { modalidad: 'FIADO' },
    });
    expect(ventaMinPrecio.totalVenta).toBe(1);
  });

  it('rejects quantity exceeding available stock with STOCK_INSUFICIENTE and accepts exact boundary', () => {
    expect(() =>
      armarVenta({
        idCliente: 2,
        esMostrador: false,
        fecha: fechaValida,
        ahora,
        lineas: [{ ...lineaBase, disponibles: resmas(20), cantidad: 21 }],
        pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
      }),
    ).toThrow(expect.objectContaining({ codigo: 'STOCK_INSUFICIENTE' }));

    const ventaExacta = armarVenta({
      idCliente: 2,
      esMostrador: false,
      fecha: fechaValida,
      ahora,
      lineas: [{ ...lineaBase, disponibles: resmas(20), cantidad: 20 }],
      pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
    });
    expect(ventaExacta.totalVenta).toBe(300000);
  });

  it('validates line rules in order: VENTA_SIN_LINEAS, LOTE_REPETIDO, CANTIDAD_RESMAS_INVALIDA, PRECIO_INVALIDO, STOCK_INSUFICIENTE', () => {
    expect(() =>
      armarVenta({
        idCliente: 2,
        esMostrador: false,
        fecha: fechaValida,
        ahora,
        lineas: [
          { ...lineaBase, idLote: 1, cantidad: 0, precioUnitario: 0 },
          { ...lineaBase, idLote: 1, cantidad: 99, precioUnitario: 15000 },
        ],
        pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
      }),
    ).toThrow(expect.objectContaining({ codigo: 'LOTE_REPETIDO' }));

    expect(() =>
      armarVenta({
        idCliente: 2,
        esMostrador: false,
        fecha: fechaValida,
        ahora,
        lineas: [{ ...lineaBase, cantidad: 0, precioUnitario: 0 }],
        pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
      }),
    ).toThrow(expect.objectContaining({ codigo: 'CANTIDAD_RESMAS_INVALIDA' }));

    expect(() =>
      armarVenta({
        idCliente: 2,
        esMostrador: false,
        fecha: fechaValida,
        ahora,
        lineas: [{ ...lineaBase, cantidad: 25, precioUnitario: 0 }],
        pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
      }),
    ).toThrow(expect.objectContaining({ codigo: 'PRECIO_INVALIDO' }));
  });

  it('accepts fecha equal to ahora and rejects fecha one second after ahora with FECHA_FUTURA (D6, E20)', () => {
    const ventaIgual = armarVenta({
      idCliente: 2,
      esMostrador: false,
      fecha: ahora,
      ahora,
      lineas: [lineaBase],
      pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
    });
    expect(ventaIgual.totalVenta).toBe(75000);

    expect(() =>
      armarVenta({
        idCliente: 2,
        esMostrador: false,
        fecha: fechaHora('2026-11-15 12:00:01'),
        ahora,
        lineas: [lineaBase],
        pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
      }),
    ).toThrow(expect.objectContaining({ codigo: 'FECHA_FUTURA' }));
  });

  it('rejects non-cash payment for Mostrador with MOSTRADOR_SOLO_CONTADO (S11, E11)', () => {
    expect(() =>
      armarVenta({
        idCliente: 1,
        esMostrador: true,
        fecha: fechaValida,
        ahora,
        lineas: [lineaBase],
        pago: { modalidad: 'FIADO' },
      }),
    ).toThrow(expect.objectContaining({ codigo: 'MOSTRADOR_SOLO_CONTADO' }));

    expect(() =>
      armarVenta({
        idCliente: 1,
        esMostrador: true,
        fecha: fechaValida,
        ahora,
        lineas: [lineaBase],
        pago: { modalidad: 'ABONO_INICIAL', monto: 10000, medio: 'EFECTIVO' },
      }),
    ).toThrow(expect.objectContaining({ codigo: 'MOSTRADOR_SOLO_CONTADO' }));
  });

  it('validates initial payment boundaries: 1 and total - 1 valid; 0, total, -1 and non-integer rejected with ABONO_INICIAL_INVALIDO (E10)', () => {
    const cuatroResmas = { ...lineaBase, cantidad: 4, precioUnitario: 15000 }; // total 60000

    for (const monto of [0, 60000, -1, 60001, 1000.5]) {
      expect(() =>
        armarVenta({
          idCliente: 2,
          esMostrador: false,
          fecha: fechaValida,
          ahora,
          lineas: [cuatroResmas],
          pago: { modalidad: 'ABONO_INICIAL', monto, medio: 'TRANSFERENCIA' },
        }),
      ).toThrow(expect.objectContaining({ codigo: 'ABONO_INICIAL_INVALIDO' }));
    }

    const abonoMin = armarVenta({
      idCliente: 2,
      esMostrador: false,
      fecha: fechaValida,
      ahora,
      lineas: [cuatroResmas],
      pago: { modalidad: 'ABONO_INICIAL', monto: 1, medio: 'EFECTIVO' },
    });
    expect(abonoMin.montoPagado).toBe(1);
    expect(abonoMin.saldoPendiente).toBe(59999);
    expect(abonoMin.estadoPago).toBe('PARCIAL');

    const abonoMax = armarVenta({
      idCliente: 2,
      esMostrador: false,
      fecha: fechaValida,
      ahora,
      lineas: [cuatroResmas],
      pago: { modalidad: 'ABONO_INICIAL', monto: 59999, medio: 'EFECTIVO' },
    });
    expect(abonoMax.montoPagado).toBe(59999);
    expect(abonoMax.saldoPendiente).toBe(1);
    expect(abonoMax.estadoPago).toBe('PARCIAL');
  });

  it('builds a cash sale (E6), a multilote sale (E7), a credit sale (E8), an initial payment sale (E9) and a below-cost sale (E14)', () => {
    const ventaE6 = armarVenta({
      idCliente: 2,
      esMostrador: false,
      fecha: fechaValida,
      ahora,
      lineas: [lineaBase],
      pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
    });
    expect(ventaE6).toEqual({
      totalVenta: 75000,
      costoTotalBase: 60000,
      montoPagado: 75000,
      saldoPendiente: 0,
      estadoPago: 'PAGADA',
      lineas: [
        {
          idLote: 1,
          costoUnitario: 12000,
          cantidad: 5,
          precioUnitario: 15000,
          subtotalVenta: 75000,
          subtotalCosto: 60000,
          margen: 15000,
          bajoCosto: false,
        },
      ],
      cobro: {
        tipoAbono: 'PAGO_CONTADO',
        monto: 75000,
        medio: 'EFECTIVO',
        capital: 60000,
        ganancia: 15000,
      },
    });

    const ventaE7 = armarVenta({
      idCliente: 2,
      esMostrador: false,
      fecha: fechaValida,
      ahora,
      lineas: [
        { idLote: 1, costoUnitario: pesos(12000), disponibles: resmas(20), cantidad: 3, precioUnitario: 15000 },
        { idLote: 2, costoUnitario: pesos(13000), disponibles: resmas(10), cantidad: 2, precioUnitario: 16000 },
      ],
      pago: { modalidad: 'CONTADO', medio: 'TRANSFERENCIA' },
    });
    expect(ventaE7.totalVenta).toBe(77000);
    expect(ventaE7.costoTotalBase).toBe(62000);
    expect(ventaE7.lineas[0].margen).toBe(9000);
    expect(ventaE7.lineas[1].margen).toBe(6000);
    expect(ventaE7.cobro).toEqual({
      tipoAbono: 'PAGO_CONTADO',
      monto: 77000,
      medio: 'TRANSFERENCIA',
      capital: 62000,
      ganancia: 15000,
    });

    const ventaE8 = armarVenta({
      idCliente: 2,
      esMostrador: false,
      fecha: fechaValida,
      ahora,
      lineas: [{ ...lineaBase, cantidad: 4 }],
      pago: { modalidad: 'FIADO' },
    });
    expect(ventaE8.estadoPago).toBe('PENDIENTE');
    expect(ventaE8.montoPagado).toBe(0);
    expect(ventaE8.saldoPendiente).toBe(60000);
    expect(ventaE8.cobro).toBeNull();

    const ventaE9 = armarVenta({
      idCliente: 2,
      esMostrador: false,
      fecha: fechaValida,
      ahora,
      lineas: [{ ...lineaBase, cantidad: 4 }],
      pago: { modalidad: 'ABONO_INICIAL', monto: 50000, medio: 'TRANSFERENCIA' },
    });
    expect(ventaE9.estadoPago).toBe('PARCIAL');
    expect(ventaE9.montoPagado).toBe(50000);
    expect(ventaE9.saldoPendiente).toBe(10000);
    expect(ventaE9.cobro).toEqual({
      tipoAbono: 'ABONO_INICIAL',
      monto: 50000,
      medio: 'TRANSFERENCIA',
      capital: 48000,
      ganancia: 2000,
    });

    const ventaE14 = armarVenta({
      idCliente: 2,
      esMostrador: false,
      fecha: fechaValida,
      ahora,
      lineas: [{ ...lineaBase, cantidad: 1, precioUnitario: 11000 }],
      pago: { modalidad: 'CONTADO', medio: 'EFECTIVO' },
    });
    expect(ventaE14.lineas[0].bajoCosto).toBe(true);
    expect(ventaE14.lineas[0].margen).toBe(-1000);
    expect(ventaE14.cobro?.capital).toBe(11000);
    expect(ventaE14.cobro?.ganancia).toBe(0);
  });
});
