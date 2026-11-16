import { Injectable } from '@angular/core';

import type { FechaHora, MedioPago, Pesos } from '../../shared/domain';
import type { SqlExecutor } from '../../shared/infrastructure/sqlite/sql-database.port';

export type TipoAbono =
  'PAGO_CONTADO' | 'ABONO_INICIAL' | 'CASCADA_GLOBAL' | 'FACTURA_INDIVIDUAL' | 'LIQUIDACION_TOTAL';

export interface AplicacionAbonoInsert {
  readonly idVenta: number;
  readonly monto: Pesos;
  readonly capital: Pesos;
  readonly ganancia: Pesos;
}

export interface NuevoAbono {
  readonly idCliente: number;
  readonly fecha: FechaHora;
  readonly monto: Pesos;
  readonly medio: MedioPago;
  readonly tipo: TipoAbono;
  readonly aplicaciones: readonly AplicacionAbonoInsert[];
}

@Injectable({
  providedIn: 'root',
})
export class AbonoRepository {
  async insertar(tx: SqlExecutor, abono: NuevoAbono): Promise<number> {
    const resAbono = await tx.run(
      `INSERT INTO abonos (
        id_cliente,
        fecha_abono,
        monto_total_abonado,
        medio_pago,
        tipo_abono
      ) VALUES (?, ?, ?, ?, ?);`,
      [abono.idCliente, abono.fecha, abono.monto, abono.medio, abono.tipo],
    );

    if (resAbono.lastInsertId === null) {
      throw new Error('Failed to insert abono: no lastInsertId returned');
    }

    const idAbono = resAbono.lastInsertId;

    for (const app of abono.aplicaciones) {
      await tx.run(
        `INSERT INTO abonos_detalle_facturas (
          id_abono,
          id_venta,
          monto_aplicado,
          capital_aplicado,
          ganancia_aplicada
        ) VALUES (?, ?, ?, ?, ?);`,
        [idAbono, app.idVenta, app.monto, app.capital, app.ganancia],
      );
    }

    return idAbono;
  }
}
