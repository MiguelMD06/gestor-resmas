import { inject, Injectable } from '@angular/core';

import { ReglaNegocioError } from '../../shared/domain';
import { CLOCK } from '../../shared/infrastructure/clock/clock.token';
import { SQL_DATABASE } from '../../shared/infrastructure/sqlite/sql-database.token';
import { validarNombre, validarTelefono } from '../domain/cliente';
import { ClienteRepository } from '../infrastructure/cliente.repository';

@Injectable({
  providedIn: 'root',
})
export class RegistrarCliente {
  private readonly db = inject(SQL_DATABASE);
  private readonly clientes = inject(ClienteRepository);
  private readonly clock = inject(CLOCK);

  async registrar(params: { nombre: string; telefono: string | null }): Promise<{ idCliente: number }> {
    const nombre = validarNombre(params.nombre);
    const telefono = validarTelefono(params.telefono);

    return this.db.transaction(async (tx) => {
      if (telefono !== null) {
        const existente = await this.clientes.porTelefono(tx, telefono);
        if (existente !== null) {
          throw new ReglaNegocioError('TELEFONO_REPETIDO', 'Phone number already belongs to another customer');
        }
      }

      const idCliente = await this.clientes.insertar(tx, { nombre, telefono }, this.clock.ahora());
      return { idCliente };
    });
  }
}
