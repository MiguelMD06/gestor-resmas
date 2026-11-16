import { inject, Injectable } from '@angular/core';

import { ReglaNegocioError } from '../../shared/domain';
import { SQL_DATABASE } from '../../shared/infrastructure/sqlite/sql-database.token';
import { validarNombre, validarTelefono } from '../domain/cliente';
import { ClienteRepository } from '../infrastructure/cliente.repository';

@Injectable({
  providedIn: 'root',
})
export class EditarCliente {
  private readonly db = inject(SQL_DATABASE);
  private readonly clientes = inject(ClienteRepository);

  async editar(params: { idCliente: number; nombre: string; telefono: string | null }): Promise<void> {
    const nombre = validarNombre(params.nombre);
    const telefono = validarTelefono(params.telefono);

    await this.db.transaction(async (tx) => {
      const actual = await this.clientes.porId(tx, params.idCliente);
      if (actual === null || actual.esMostrador) {
        throw new ReglaNegocioError('CLIENTE_INEXISTENTE', 'Customer does not exist or is Mostrador');
      }

      if (telefono !== null) {
        const otro = await this.clientes.porTelefono(tx, telefono);
        if (otro !== null && otro.idCliente !== params.idCliente) {
          throw new ReglaNegocioError('TELEFONO_REPETIDO', 'Phone number already belongs to another customer');
        }
      }

      await this.clientes.actualizar(tx, params.idCliente, { nombre, telefono });
    });
  }
}
