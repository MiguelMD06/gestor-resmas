import { describe, expect, it } from 'vitest';

import { fechaHora, pesos } from '../../shared/domain';

import type { FacturaAbierta } from './factura';
import { validarFechaAbono } from './fecha-abono';

function factura(idVenta: number, fecha: string): FacturaAbierta {
  return {
    idVenta,
    fecha: fechaHora(fecha),
    total: pesos(15000),
    costoBase: pesos(10000),
    pagado: pesos(0),
  };
}

describe('validarFechaAbono', () => {
  const ahora = fechaHora('2026-11-20 12:00:00');
  const f1 = factura(1, '2026-11-01 10:00:00');
  const f2 = factura(2, '2026-11-10 10:00:00');

  it('accepts a payment date equal to current clock time (C7)', () => {
    expect(() => validarFechaAbono(ahora, ahora, [f1, f2])).not.toThrow();
  });

  it('accepts a payment date equal to the latest receiving invoice date (C8)', () => {
    expect(() => validarFechaAbono(fechaHora('2026-11-10 10:00:00'), ahora, [f1, f2])).not.toThrow();
  });

  it('rejects a future payment date with FECHA_FUTURA (C7)', () => {
    const futura = fechaHora('2026-11-20 12:00:01');

    expect(() => validarFechaAbono(futura, ahora, [f1])).toThrow(expect.objectContaining({ codigo: 'FECHA_FUTURA' }));
  });

  it('rejects a payment date earlier than any receiving invoice with ABONO_ANTERIOR_A_FACTURA (C8, D14)', () => {
    const fecha = fechaHora('2026-11-05 10:00:00');

    expect(() => validarFechaAbono(fecha, ahora, [f1, f2])).toThrow(
      expect.objectContaining({ codigo: 'ABONO_ANTERIOR_A_FACTURA' }),
    );
  });

  it('accepts a payment date between invoices when only the earlier invoice receives money (C8)', () => {
    const fecha = fechaHora('2026-11-05 10:00:00');

    expect(() => validarFechaAbono(fecha, ahora, [f1])).not.toThrow();
  });
});
