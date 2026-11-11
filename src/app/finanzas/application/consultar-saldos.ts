import { inject, Injectable } from '@angular/core';

import { SQL_DATABASE } from '../../shared/infrastructure/sqlite/sql-database.token';
import type { Saldos } from '../domain/saldos';
import { LibroRepository } from '../infrastructure/libro.repository';

@Injectable({
  providedIn: 'root',
})
export class ConsultarSaldos {
  private readonly db = inject(SQL_DATABASE);
  private readonly libro = inject(LibroRepository);

  async saldos(): Promise<Saldos> {
    return this.libro.saldos(this.db);
  }
}
