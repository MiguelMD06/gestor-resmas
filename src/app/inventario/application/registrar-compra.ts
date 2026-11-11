import { inject, Injectable } from '@angular/core';

import { compraLote } from '../../finanzas/domain/operaciones';
import { saldoDeBolsillo } from '../../finanzas/domain/saldos';
import { LibroRepository } from '../../finanzas/infrastructure/libro.repository';
import {
  fechaHora,
  pesos,
  ReglaNegocioError,
  type FechaHora,
  type MedioPago,
  type Pesos,
  type TipoPapel,
} from '../../shared/domain';
import { SQL_DATABASE } from '../../shared/infrastructure/sqlite/sql-database.token';
import { nuevoLote } from '../domain/lote';
import { LoteRepository } from '../infrastructure/lote.repository';

// compraLote requires fecha and idLote to construct the movement, but previsualizar only reads reinversion and discards the movement.
const FECHA_PREVISUALIZACION = fechaHora('2000-01-01 00:00:00');
const ID_LOTE_PREVISUALIZACION = 0;

@Injectable({
  providedIn: 'root',
})
export class RegistrarCompra {
  private readonly db = inject(SQL_DATABASE);
  private readonly lotes = inject(LoteRepository);
  private readonly libro = inject(LibroRepository);

  async registrar(params: {
    tipoPapel: TipoPapel;
    cajas: number;
    costoPorCaja: number;
    fecha: FechaHora;
    medio: MedioPago;
  }): Promise<{ idLote: number; reinversion: Pesos }> {
    const nuevo = nuevoLote(params.tipoPapel, params.cajas, params.costoPorCaja);

    return this.db.transaction(async (tx) => {
      const saldos = await this.libro.saldos(tx);
      const idLote = await this.lotes.insertar(tx, nuevo, params.fecha, params.medio);
      const { movimiento, reinversion } = compraLote(saldos, params.fecha, params.medio, nuevo.costoTotal, idLote);
      await this.libro.registrar(tx, movimiento);
      return { idLote, reinversion };
    });
  }

  async previsualizar(params: {
    tipoPapel: TipoPapel;
    cajas: number;
    costoPorCaja: number;
    medio: MedioPago;
  }): Promise<{
    costoTotal: Pesos;
    costoUnitarioResma: Pesos;
    reinversion: Pesos;
    saldoBolsillo: Pesos;
    alcanza: boolean;
  }> {
    const nuevo = nuevoLote(params.tipoPapel, params.cajas, params.costoPorCaja);
    const saldos = await this.libro.saldos(this.db);
    const saldoBolsillo = saldoDeBolsillo(saldos, params.medio);

    let reinversion = pesos(0);
    let alcanza = true;

    try {
      const resultado = compraLote(
        saldos,
        FECHA_PREVISUALIZACION,
        params.medio,
        nuevo.costoTotal,
        ID_LOTE_PREVISUALIZACION,
      );
      reinversion = resultado.reinversion;
    } catch (error) {
      if (error instanceof ReglaNegocioError && error.codigo === 'SALDO_INSUFICIENTE') {
        alcanza = false;
      } else {
        throw error;
      }
    }

    return {
      costoTotal: nuevo.costoTotal,
      costoUnitarioResma: nuevo.costoUnitarioResma,
      reinversion,
      saldoBolsillo,
      alcanza,
    };
  }
}
