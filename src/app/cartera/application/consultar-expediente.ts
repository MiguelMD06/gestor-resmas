import { inject, Injectable } from '@angular/core';

import type { Cliente } from '../../clientes/domain/cliente';
import { ClienteRepository } from '../../clientes/infrastructure/cliente.repository';
import { pesos, ReglaNegocioError, sumarPesos, type Pesos } from '../../shared/domain';
import { SQL_DATABASE } from '../../shared/infrastructure/sqlite/sql-database.token';
import { deudaTotal, porCobrar } from '../domain';
import { CarteraRepository, type AbonoExpediente, type FacturaExpediente } from '../infrastructure/cartera.repository';

export interface DeudaDesglosada {
  readonly total: Pesos;
  readonly capital: Pesos;
  readonly ganancia: Pesos;
}

export interface ExpedienteCliente {
  readonly cliente: Cliente;
  readonly deuda: DeudaDesglosada;
  readonly facturas: readonly FacturaExpediente[];
  readonly abonos: readonly AbonoExpediente[];
}

@Injectable({
  providedIn: 'root',
})
export class ConsultarExpediente {
  private readonly db = inject(SQL_DATABASE);
  private readonly clientes = inject(ClienteRepository);
  private readonly cartera = inject(CarteraRepository);

  async consultar(idCliente: number): Promise<ExpedienteCliente> {
    const cliente = await this.clientes.porId(this.db, idCliente);
    if (cliente === null) {
      throw new ReglaNegocioError('CLIENTE_INEXISTENTE', `Customer not found with id: ${idCliente}`);
    }

    const [abiertas, { facturas, abonos }] = await Promise.all([
      this.cartera.facturasAbiertas(this.db, idCliente),
      this.cartera.expediente(this.db, idCliente),
    ]);

    const total = deudaTotal(abiertas);
    let capital = pesos(0);
    let ganancia = pesos(0);
    for (const f of abiertas) {
      const pendiente = porCobrar(f);
      capital = sumarPesos(capital, pendiente.capital);
      ganancia = sumarPesos(ganancia, pendiente.ganancia);
    }

    return {
      cliente,
      deuda: { total, capital, ganancia },
      facturas,
      abonos,
    };
  }
}
