import { Injectable } from '@angular/core';

import {
  cajas,
  fechaHora,
  pesos,
  resmas,
  type FechaHora,
  type MedioPago,
  type Resmas,
  type TipoPapel,
} from '../../shared/domain';
import type { SqlDatabase, SqlExecutor } from '../../shared/infrastructure/sqlite/sql-database.port';
import { descontarResmas, type EstadoLote, type Lote, type NuevoLote } from '../domain/lote';

interface LoteRow {
  id_lote: number;
  tipo_papel: string;
  fecha_compra: string;
  cantidad_cajas: number;
  costo_por_caja: number;
  costo_unitario_resma: number;
  resmas_iniciales: number;
  resmas_disponibles: number;
  medio_pago_compra: string;
  estado: string;
}

const COLUMNAS_LOTE = `
  id_lote,
  tipo_papel,
  fecha_compra,
  cantidad_cajas,
  costo_por_caja,
  costo_unitario_resma,
  resmas_iniciales,
  resmas_disponibles,
  medio_pago_compra,
  estado
`;

function mapearFilaALote(row: LoteRow): Lote {
  return {
    idLote: row.id_lote,
    tipoPapel: row.tipo_papel as TipoPapel,
    fechaCompra: fechaHora(row.fecha_compra),
    cantidadCajas: cajas(row.cantidad_cajas),
    costoPorCaja: pesos(row.costo_por_caja),
    costoUnitarioResma: pesos(row.costo_unitario_resma),
    resmasIniciales: resmas(row.resmas_iniciales),
    resmasDisponibles: resmas(row.resmas_disponibles),
    medioPagoCompra: row.medio_pago_compra as MedioPago,
    estado: row.estado as EstadoLote,
  };
}

@Injectable({
  providedIn: 'root',
})
export class LoteRepository {
  async insertar(tx: SqlExecutor, nuevo: NuevoLote, fecha: FechaHora, medio: MedioPago): Promise<number> {
    const result = await tx.run(
      `INSERT INTO lotes_cajas (
        tipo_papel,
        fecha_compra,
        cantidad_cajas,
        costo_por_caja,
        costo_unitario_resma,
        resmas_iniciales,
        resmas_disponibles,
        medio_pago_compra,
        estado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO');`,
      [
        nuevo.tipoPapel,
        fecha,
        nuevo.cantidadCajas,
        nuevo.costoPorCaja,
        nuevo.costoUnitarioResma,
        nuevo.resmasIniciales,
        nuevo.resmasIniciales,
        medio,
      ],
    );

    if (result.lastInsertId === null) {
      throw new Error('Failed to insert lot: no lastInsertId returned');
    }

    return result.lastInsertId;
  }

  async activos(db: SqlDatabase | SqlExecutor): Promise<Lote[]> {
    const rows = await db.query<LoteRow>(
      `SELECT
        ${COLUMNAS_LOTE}
      FROM lotes_cajas
      WHERE estado = 'ACTIVO'
      ORDER BY fecha_compra ASC, id_lote ASC;`,
    );

    return rows.map(mapearFilaALote);
  }

  async porId(db: SqlDatabase | SqlExecutor, idLote: number): Promise<Lote | null> {
    const rows = await db.query<LoteRow>(
      `SELECT
        ${COLUMNAS_LOTE}
      FROM lotes_cajas
      WHERE id_lote = ?;`,
      [idLote],
    );

    if (rows.length === 0) {
      return null;
    }

    return mapearFilaALote(rows[0]);
  }

  async descontar(tx: SqlExecutor, idLote: number, cantidad: Resmas): Promise<Lote> {
    const lote = await this.porId(tx, idLote);
    if (!lote) {
      throw new Error(`Lot not found with id: ${idLote}`);
    }

    const { resmasDisponibles, estado } = descontarResmas(lote, cantidad);

    await tx.run(
      `UPDATE lotes_cajas
       SET resmas_disponibles = ?, estado = ?
       WHERE id_lote = ?;`,
      [resmasDisponibles, estado, idLote],
    );

    return {
      ...lote,
      resmasDisponibles,
      estado,
    };
  }
}
