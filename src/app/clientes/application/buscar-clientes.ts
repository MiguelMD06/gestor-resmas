import { inject, Injectable } from '@angular/core';

import { SQL_DATABASE } from '../../shared/infrastructure/sqlite/sql-database.token';
import { normalizarBusqueda, type Cliente } from '../domain/cliente';
import { ClienteRepository } from '../infrastructure/cliente.repository';

@Injectable({
  providedIn: 'root',
})
export class BuscarClientes {
  private readonly db = inject(SQL_DATABASE);
  private readonly clientes = inject(ClienteRepository);

  async buscar(texto: string, opciones?: { incluirMostrador?: boolean }): Promise<Cliente[]> {
    const registrados = await this.clientes.todos(this.db);
    const lista = opciones?.incluirMostrador ? [await this.clientes.mostrador(this.db), ...registrados] : registrados;

    const termino = normalizarBusqueda(texto.trim());
    if (termino === '') {
      return lista;
    }
    const terminoTelefono = termino.replace(/\s+/g, '');

    return lista.filter(
      (cliente) =>
        normalizarBusqueda(cliente.nombre).includes(termino) ||
        (cliente.telefono !== null && normalizarBusqueda(cliente.telefono).includes(terminoTelefono)),
    );
  }
}
