import { inject, Injectable } from '@angular/core';

import { pesos, sumarPesos, type Pesos } from '../../shared/domain';
import { SQL_DATABASE } from '../../shared/infrastructure/sqlite/sql-database.token';
import { CarteraRepository, type DeudaCliente } from '../infrastructure/cartera.repository';

export interface ResumenCartera {
  readonly total: Pesos;
  readonly porCliente: ReadonlyMap<number, DeudaCliente>;
}

@Injectable({
  providedIn: 'root',
})
export class ConsultarCartera {
  private readonly db = inject(SQL_DATABASE);
  private readonly cartera = inject(CarteraRepository);

  async consultar(): Promise<ResumenCartera> {
    const porCliente = await this.cartera.deudasPorCliente(this.db);
    let total = pesos(0);
    for (const { deuda } of porCliente.values()) {
      total = sumarPesos(total, deuda);
    }
    return { total, porCliente };
  }
}
