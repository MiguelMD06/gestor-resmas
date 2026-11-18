import { inject, Injectable } from '@angular/core';

import { ReglaNegocioError, type FechaHora, type MedioPago, type Pesos } from '../../shared/domain';
import { CLOCK } from '../../shared/infrastructure/clock/clock.token';
import { SQL_DATABASE } from '../../shared/infrastructure/sqlite/sql-database.token';
import { aporteCapital } from '../domain/operaciones';
import { LibroRepository } from '../infrastructure/libro.repository';

@Injectable({
  providedIn: 'root',
})
export class RegistrarAporte {
  private readonly db = inject(SQL_DATABASE);
  private readonly clock = inject(CLOCK);
  private readonly libro = inject(LibroRepository);

  async registrar(params: { fecha: FechaHora; medio: MedioPago; monto: Pesos }): Promise<number> {
    if (params.fecha > this.clock.ahora()) {
      throw new ReglaNegocioError('FECHA_FUTURA', `Contribution date ${params.fecha} cannot be in the future`);
    }

    const movimiento = aporteCapital(params.fecha, params.medio, params.monto);

    return this.db.transaction(async (tx) => {
      return this.libro.registrar(tx, movimiento);
    });
  }
}
