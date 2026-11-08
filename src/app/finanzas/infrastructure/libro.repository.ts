import { Injectable } from '@angular/core';

import { pesos } from '../../shared/domain';
import type { SqlDatabase, SqlExecutor } from '../../shared/infrastructure/sqlite/sql-database.port';
import type { Movimiento } from '../domain/movimiento';
import type { Saldos } from '../domain/saldos';

@Injectable({
  providedIn: 'root',
})
export class LibroRepository {
  async registrar(tx: SqlExecutor, movimiento: Movimiento): Promise<number> {
    const result = await tx.run(
      `INSERT INTO movimientos_dinero (
        fecha_movimiento,
        tipo,
        medio,
        delta_bolsillo,
        delta_capital,
        delta_ganancia,
        id_lote,
        id_abono,
        id_movimiento_origen,
        nota
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        movimiento.fecha,
        movimiento.tipo,
        movimiento.medio,
        movimiento.deltaBolsillo,
        movimiento.deltaCapital,
        movimiento.deltaGanancia,
        movimiento.idLote,
        movimiento.idAbono,
        movimiento.idMovimientoOrigen,
        movimiento.nota,
      ],
    );

    if (result.lastInsertId === null) {
      throw new Error('Failed to insert movement: no lastInsertId returned');
    }

    return result.lastInsertId;
  }

  async registrarTraspaso(
    tx: SqlExecutor,
    [salida, entrada]: readonly [salida: Movimiento, entrada: Movimiento],
  ): Promise<[number, number]> {
    const idSalida = await this.registrar(tx, salida);
    const entradaConOrigen: Movimiento = {
      ...entrada,
      idMovimientoOrigen: idSalida,
    };
    const idEntrada = await this.registrar(tx, entradaConOrigen);
    return [idSalida, idEntrada];
  }

  async saldos(db: SqlDatabase | SqlExecutor): Promise<Saldos> {
    const rows = await db.query<{
      efectivo: number;
      transferencia: number;
      capitalEnCaja: number;
      gananciaLibre: number;
    }>(
      `SELECT
        COALESCE(SUM(CASE WHEN medio = 'EFECTIVO' THEN delta_bolsillo ELSE 0 END), 0) AS efectivo,
        COALESCE(SUM(CASE WHEN medio = 'TRANSFERENCIA' THEN delta_bolsillo ELSE 0 END), 0) AS transferencia,
        COALESCE(SUM(delta_capital), 0) AS capitalEnCaja,
        COALESCE(SUM(delta_ganancia), 0) AS gananciaLibre
      FROM movimientos_dinero;`,
    );

    const row = rows[0] ?? {
      efectivo: 0,
      transferencia: 0,
      capitalEnCaja: 0,
      gananciaLibre: 0,
    };

    return {
      efectivo: pesos(row.efectivo),
      transferencia: pesos(row.transferencia),
      capitalEnCaja: pesos(row.capitalEnCaja),
      gananciaLibre: pesos(row.gananciaLibre),
    };
  }
}
