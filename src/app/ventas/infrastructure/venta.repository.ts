import { Injectable } from '@angular/core';

import type { FechaHora } from '../../shared/domain';
import type { SqlDatabase, SqlExecutor } from '../../shared/infrastructure/sqlite/sql-database.port';
import type { VentaArmada } from '../domain/venta';

@Injectable({
  providedIn: 'root',
})
export class VentaRepository {
  async esMostrador(db: SqlDatabase | SqlExecutor, idCliente: number): Promise<boolean | null> {
    const rows = await db.query<{ es_mostrador: number }>('SELECT es_mostrador FROM clientes WHERE id_cliente = ?;', [
      idCliente,
    ]);

    if (rows.length === 0) {
      return null;
    }

    return rows[0].es_mostrador === 1;
  }

  async insertar(tx: SqlExecutor, venta: VentaArmada, idCliente: number, fecha: FechaHora): Promise<number> {
    const resVenta = await tx.run(
      `INSERT INTO ventas (
        id_cliente,
        fecha_venta,
        total_venta,
        costo_total_base,
        monto_pagado,
        saldo_pendiente,
        estado_pago
      ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [
        idCliente,
        fecha,
        venta.totalVenta,
        venta.costoTotalBase,
        venta.montoPagado,
        venta.saldoPendiente,
        venta.estadoPago,
      ],
    );

    if (resVenta.lastInsertId === null) {
      throw new Error('Failed to insert sale: no lastInsertId returned');
    }

    const idVenta = resVenta.lastInsertId;

    for (const linea of venta.lineas) {
      await tx.run(
        `INSERT INTO detalle_ventas (
          id_venta,
          id_lote,
          cantidad_resmas,
          costo_unitario_lote,
          precio_unitario_venta,
          subtotal_venta,
          subtotal_costo
        ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [
          idVenta,
          linea.idLote,
          linea.cantidad,
          linea.costoUnitario,
          linea.precioUnitario,
          linea.subtotalVenta,
          linea.subtotalCosto,
        ],
      );
    }

    return idVenta;
  }
}
