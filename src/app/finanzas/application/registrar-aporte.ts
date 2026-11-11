import { inject, Injectable } from '@angular/core';

import type { FechaHora, MedioPago, Pesos } from '../../shared/domain';
import { SQL_DATABASE } from '../../shared/infrastructure/sqlite/sql-database.token';
import { aporteCapital } from '../domain/operaciones';
import { LibroRepository } from '../infrastructure/libro.repository';

@Injectable({
  providedIn: 'root',
})
export class RegistrarAporte {
  private readonly db = inject(SQL_DATABASE);
  private readonly libro = inject(LibroRepository);

  async registrar(params: { fecha: FechaHora; medio: MedioPago; monto: Pesos }): Promise<number> {
    const movimiento = aporteCapital(params.fecha, params.medio, params.monto);

    return this.db.transaction(async (tx) => {
      return this.libro.registrar(tx, movimiento);
    });
  }
}
