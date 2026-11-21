import { Injectable } from '@angular/core';

import {
  pesos,
  resmas,
  type FechaHora,
  type MedioPago,
  type Pesos,
  type Resmas,
  type TipoPapel,
} from '../../shared/domain';
import type { SqlDatabase, SqlExecutor } from '../../shared/infrastructure/sqlite/sql-database.port';
import type { FacturaAbierta } from '../domain';

import type { TipoAbono } from './abono.repository';

export type EstadoPago = 'PENDIENTE' | 'PARCIAL' | 'PAGADA';

export interface LineaFacturaExpediente {
  readonly cantidad: Resmas;
  readonly tipoPapel: TipoPapel;
  readonly precioUnitario: Pesos;
  readonly subtotal: Pesos;
}

export interface FacturaExpediente {
  readonly idVenta: number;
  readonly fecha: FechaHora;
  readonly total: Pesos;
  readonly costoBase: Pesos;
  readonly pagado: Pesos;
  readonly saldo: Pesos;
  readonly estado: EstadoPago;
  readonly lineas: readonly LineaFacturaExpediente[];
}

export interface AplicacionExpediente {
  readonly idVenta: number;
  readonly monto: Pesos;
}

export interface AbonoExpediente {
  readonly idAbono: number;
  readonly fecha: FechaHora;
  readonly monto: Pesos;
  readonly medio: MedioPago;
  readonly tipo: TipoAbono;
  readonly aplicaciones: readonly AplicacionExpediente[];
}

export interface ExpedienteDatos {
  readonly facturas: readonly FacturaExpediente[];
  readonly abonos: readonly AbonoExpediente[];
}

interface FacturaAbiertaRow {
  id_venta: number;
  fecha_venta: string;
  total_venta: number;
  costo_total_base: number;
  monto_pagado: number;
}

export interface DeudaCliente {
  readonly deuda: Pesos;
  readonly facturas: number;
}

interface DeudaClienteRow {
  id_cliente: number;
  deuda: number;
  facturas: number;
}

interface VentaExpedienteRow {
  id_venta: number;
  fecha_venta: string;
  total_venta: number;
  costo_total_base: number;
  monto_pagado: number;
  saldo_pendiente: number;
  estado_pago: EstadoPago;
}

interface DetalleVentaRow {
  id_venta: number;
  cantidad_resmas: number;
  tipo_papel: TipoPapel;
  precio_unitario_venta: number;
  subtotal_venta: number;
}

interface AbonoExpedienteRow {
  id_abono: number;
  fecha_abono: string;
  monto_total_abonado: number;
  medio_pago: MedioPago;
  tipo_abono: TipoAbono;
}

interface AbonoDetalleRow {
  id_abono: number;
  id_venta: number;
  monto_aplicado: number;
}

@Injectable({
  providedIn: 'root',
})
export class CarteraRepository {
  async facturasAbiertas(db: SqlDatabase | SqlExecutor, idCliente: number): Promise<FacturaAbierta[]> {
    const rows = await db.query<FacturaAbiertaRow>(
      `SELECT id_venta, fecha_venta, total_venta, costo_total_base, monto_pagado
       FROM ventas
       WHERE id_cliente = ? AND saldo_pendiente > 0
       ORDER BY fecha_venta ASC, id_venta ASC;`,
      [idCliente],
    );

    return rows.map((row) => ({
      idVenta: row.id_venta,
      fecha: row.fecha_venta as FechaHora,
      total: pesos(row.total_venta),
      costoBase: pesos(row.costo_total_base),
      pagado: pesos(row.monto_pagado),
    }));
  }

  async ventaPerteneceACliente(db: SqlDatabase | SqlExecutor, idVenta: number, idCliente: number): Promise<boolean> {
    const rows = await db.query<{ id_venta: number }>(
      `SELECT id_venta
       FROM ventas
       WHERE id_venta = ? AND id_cliente = ?;`,
      [idVenta, idCliente],
    );
    return rows.length > 0;
  }

  async deudasPorCliente(db: SqlDatabase | SqlExecutor): Promise<ReadonlyMap<number, DeudaCliente>> {
    const rows = await db.query<DeudaClienteRow>(
      `SELECT id_cliente, SUM(saldo_pendiente) AS deuda, COUNT(*) AS facturas
       FROM ventas
       WHERE saldo_pendiente > 0
       GROUP BY id_cliente;`,
    );

    const mapa = new Map<number, DeudaCliente>();
    for (const row of rows) {
      mapa.set(row.id_cliente, { deuda: pesos(row.deuda), facturas: row.facturas });
    }
    return mapa;
  }

  async aplicarPago(tx: SqlExecutor, idVenta: number, monto: Pesos): Promise<void> {
    if (monto <= 0) {
      throw new Error(`Payment amount must be greater than zero, got: ${monto}`);
    }

    const result = await tx.run(
      `UPDATE ventas
       SET
         monto_pagado = monto_pagado + ?,
         saldo_pendiente = saldo_pendiente - ?,
         estado_pago = CASE WHEN saldo_pendiente - ? = 0 THEN 'PAGADA' ELSE 'PARCIAL' END
       WHERE id_venta = ? AND saldo_pendiente >= ?;`,
      [monto, monto, monto, idVenta, monto],
    );

    if (result.changes !== 1) {
      throw new Error(`Failed to apply payment of ${monto} to invoice ${idVenta}: affected ${result.changes} rows`);
    }
  }

  async expediente(db: SqlDatabase | SqlExecutor, idCliente: number): Promise<ExpedienteDatos> {
    const [ventaRows, detalleRows, abonoRows, abonoDetalleRows] = await Promise.all([
      db.query<VentaExpedienteRow>(
        `SELECT id_venta, fecha_venta, total_venta, costo_total_base, monto_pagado, saldo_pendiente, estado_pago
         FROM ventas
         WHERE id_cliente = ?
         ORDER BY fecha_venta DESC, id_venta DESC;`,
        [idCliente],
      ),
      db.query<DetalleVentaRow>(
        `SELECT dv.id_venta, dv.cantidad_resmas, lc.tipo_papel, dv.precio_unitario_venta, dv.subtotal_venta
         FROM detalle_ventas dv
         JOIN lotes_cajas lc ON lc.id_lote = dv.id_lote
         JOIN ventas v ON v.id_venta = dv.id_venta
         WHERE v.id_cliente = ?
         ORDER BY dv.id_detalle ASC;`,
        [idCliente],
      ),
      db.query<AbonoExpedienteRow>(
        `SELECT id_abono, fecha_abono, monto_total_abonado, medio_pago, tipo_abono
         FROM abonos
         WHERE id_cliente = ? AND tipo_abono <> 'PAGO_CONTADO'
         ORDER BY fecha_abono DESC, id_abono DESC;`,
        [idCliente],
      ),
      db.query<AbonoDetalleRow>(
        `SELECT adf.id_abono, adf.id_venta, adf.monto_aplicado
         FROM abonos_detalle_facturas adf
         JOIN abonos a ON a.id_abono = adf.id_abono
         WHERE a.id_cliente = ? AND a.tipo_abono <> 'PAGO_CONTADO'
         ORDER BY adf.id_venta ASC;`,
        [idCliente],
      ),
    ]);

    const lineasPorVenta = new Map<number, LineaFacturaExpediente[]>();
    for (const row of detalleRows) {
      const lista = lineasPorVenta.get(row.id_venta) ?? [];
      lista.push({
        cantidad: resmas(row.cantidad_resmas),
        tipoPapel: row.tipo_papel,
        precioUnitario: pesos(row.precio_unitario_venta),
        subtotal: pesos(row.subtotal_venta),
      });
      lineasPorVenta.set(row.id_venta, lista);
    }

    const aplicacionesPorAbono = new Map<number, AplicacionExpediente[]>();
    for (const row of abonoDetalleRows) {
      const lista = aplicacionesPorAbono.get(row.id_abono) ?? [];
      lista.push({
        idVenta: row.id_venta,
        monto: pesos(row.monto_aplicado),
      });
      aplicacionesPorAbono.set(row.id_abono, lista);
    }

    const facturas: FacturaExpediente[] = ventaRows.map((row) => ({
      idVenta: row.id_venta,
      fecha: row.fecha_venta as FechaHora,
      total: pesos(row.total_venta),
      costoBase: pesos(row.costo_total_base),
      pagado: pesos(row.monto_pagado),
      saldo: pesos(row.saldo_pendiente),
      estado: row.estado_pago,
      lineas: lineasPorVenta.get(row.id_venta) ?? [],
    }));

    const abonos: AbonoExpediente[] = abonoRows.map((row) => ({
      idAbono: row.id_abono,
      fecha: row.fecha_abono as FechaHora,
      monto: pesos(row.monto_total_abonado),
      medio: row.medio_pago,
      tipo: row.tipo_abono,
      aplicaciones: aplicacionesPorAbono.get(row.id_abono) ?? [],
    }));

    return { facturas, abonos };
  }
}
