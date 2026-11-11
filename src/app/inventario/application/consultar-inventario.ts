import { inject, Injectable } from '@angular/core';

import { SQL_DATABASE } from '../../shared/infrastructure/sqlite/sql-database.token';
import { agruparPorTipo, type Lote } from '../domain/lote';
import { LoteRepository } from '../infrastructure/lote.repository';

@Injectable({
  providedIn: 'root',
})
export class ConsultarInventario {
  private readonly db = inject(SQL_DATABASE);
  private readonly lotes = inject(LoteRepository);

  async activos(): Promise<{ CARTA: Lote[]; OFICIO: Lote[] }> {
    const lista = await this.lotes.activos(this.db);
    return agruparPorTipo(lista);
  }
}
