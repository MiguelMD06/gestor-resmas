import { describe, expect, it } from 'vitest';

import type { AbonoExpediente, FacturaExpediente } from '../../cartera/infrastructure/cartera.repository';
import { fechaHora, pesos, resmas } from '../../shared/domain';

import { calcularAplicacionesQuePagaron, etiquetaTipoAbono } from './expediente-ui.helpers';

describe('expediente-ui.helpers', () => {
  it('maps each TipoAbono to its Spanish display label', () => {
    expect(etiquetaTipoAbono('ABONO_INICIAL')).toBe('Abono inicial');
    expect(etiquetaTipoAbono('CASCADA_GLOBAL')).toBe('A la deuda');
    expect(etiquetaTipoAbono('FACTURA_INDIVIDUAL')).toBe('A una factura');
    expect(etiquetaTipoAbono('LIQUIDACION_TOTAL')).toBe('Pagar todo');
  });

  it('marks an invoice application as paid only in the payment that completes its total (C8)', () => {
    const f1: FacturaExpediente = {
      idVenta: 1,
      fecha: fechaHora('2026-11-01 10:00:00'),
      total: pesos(30000),
      costoBase: pesos(20000),
      pagado: pesos(30000),
      saldo: pesos(0),
      estado: 'PAGADA',
      lineas: [{ cantidad: resmas(2), tipoPapel: 'CARTA', precioUnitario: pesos(15000), subtotal: pesos(30000) }],
    };
    const f2: FacturaExpediente = {
      idVenta: 2,
      fecha: fechaHora('2026-11-10 10:00:00'),
      total: pesos(15000),
      costoBase: pesos(10000),
      pagado: pesos(15000),
      saldo: pesos(0),
      estado: 'PAGADA',
      lineas: [{ cantidad: resmas(1), tipoPapel: 'OFICIO', precioUnitario: pesos(15000), subtotal: pesos(15000) }],
    };

    // Abonos in newest-first order (as returned by ConsultarExpediente)
    const abono3: AbonoExpediente = {
      idAbono: 3,
      fecha: fechaHora('2026-11-15 10:00:00'),
      monto: pesos(5000),
      medio: 'EFECTIVO',
      tipo: 'FACTURA_INDIVIDUAL',
      aplicaciones: [{ idVenta: 2, monto: pesos(5000) }],
    };
    const abono2: AbonoExpediente = {
      idAbono: 2,
      fecha: fechaHora('2026-11-12 10:00:00'),
      monto: pesos(35000),
      medio: 'TRANSFERENCIA',
      tipo: 'CASCADA_GLOBAL',
      aplicaciones: [
        { idVenta: 1, monto: pesos(30000) },
        { idVenta: 2, monto: pesos(5000) },
      ],
    };
    const abono1: AbonoExpediente = {
      idAbono: 1,
      fecha: fechaHora('2026-11-10 10:00:00'),
      monto: pesos(5000),
      medio: 'EFECTIVO',
      tipo: 'ABONO_INICIAL',
      aplicaciones: [{ idVenta: 2, monto: pesos(5000) }],
    };

    const pagadas = calcularAplicacionesQuePagaron([f2, f1], [abono3, abono2, abono1]);

    expect(pagadas.has('1:2')).toBe(false);
    expect(pagadas.has('2:1')).toBe(true);
    expect(pagadas.has('2:2')).toBe(false);
    expect(pagadas.has('3:2')).toBe(true);
  });
});
