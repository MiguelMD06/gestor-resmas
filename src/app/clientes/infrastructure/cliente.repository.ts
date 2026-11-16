import { Injectable } from '@angular/core';

import { ReglaNegocioError, type FechaHora } from '../../shared/domain';
import type { SqlDatabase, SqlExecutor } from '../../shared/infrastructure/sqlite/sql-database.port';
import type { Cliente } from '../domain/cliente';

interface ClienteRow {
  id_cliente: number;
  nombre: string;
  telefono: string | null;
  es_mostrador: number;
}

const COLUMNAS_CLIENTE = `
  id_cliente,
  nombre,
  telefono,
  es_mostrador
`;

function mapearFilaACliente(row: ClienteRow): Cliente {
  return {
    idCliente: row.id_cliente,
    nombre: row.nombre,
    telefono: row.telefono,
    esMostrador: row.es_mostrador === 1,
  };
}

function esErrorTelefonoRepetido(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const msg = error.message;
  return msg.includes('UNIQUE') && (msg.includes('clientes.telefono') || msg.includes('ux_clientes_telefono'));
}

@Injectable({
  providedIn: 'root',
})
export class ClienteRepository {
  async insertar(
    tx: SqlExecutor,
    datos: { nombre: string; telefono: string | null },
    fecha: FechaHora,
  ): Promise<number> {
    try {
      const result = await tx.run(
        `INSERT INTO clientes (nombre, telefono, es_mostrador, fecha_registro)
         VALUES (?, ?, 0, ?);`,
        [datos.nombre, datos.telefono, fecha],
      );

      if (result.lastInsertId === null) {
        throw new Error('Failed to insert customer: no lastInsertId returned');
      }

      return result.lastInsertId;
    } catch (error: unknown) {
      if (esErrorTelefonoRepetido(error)) {
        throw new ReglaNegocioError('TELEFONO_REPETIDO', 'Phone number already belongs to another customer');
      }
      throw error;
    }
  }

  async actualizar(
    tx: SqlExecutor,
    idCliente: number,
    datos: { nombre: string; telefono: string | null },
  ): Promise<void> {
    try {
      const result = await tx.run(
        `UPDATE clientes
         SET nombre = ?, telefono = ?
         WHERE id_cliente = ? AND es_mostrador = 0;`,
        [datos.nombre, datos.telefono, idCliente],
      );

      if (result.changes === 0) {
        throw new ReglaNegocioError('CLIENTE_INEXISTENTE', 'Customer does not exist or is Mostrador');
      }
    } catch (error: unknown) {
      if (esErrorTelefonoRepetido(error)) {
        throw new ReglaNegocioError('TELEFONO_REPETIDO', 'Phone number already belongs to another customer');
      }
      throw error;
    }
  }

  async porId(db: SqlDatabase | SqlExecutor, idCliente: number): Promise<Cliente | null> {
    const rows = await db.query<ClienteRow>(
      `SELECT ${COLUMNAS_CLIENTE}
       FROM clientes
       WHERE id_cliente = ?;`,
      [idCliente],
    );

    if (rows.length === 0) {
      return null;
    }

    return mapearFilaACliente(rows[0]);
  }

  async porTelefono(db: SqlDatabase | SqlExecutor, telefono: string): Promise<Cliente | null> {
    const rows = await db.query<ClienteRow>(
      `SELECT ${COLUMNAS_CLIENTE}
       FROM clientes
       WHERE telefono = ?;`,
      [telefono],
    );

    if (rows.length === 0) {
      return null;
    }

    return mapearFilaACliente(rows[0]);
  }

  async mostrador(db: SqlDatabase | SqlExecutor): Promise<Cliente> {
    const rows = await db.query<ClienteRow>(
      `SELECT ${COLUMNAS_CLIENTE}
       FROM clientes
       WHERE es_mostrador = 1;`,
    );

    if (rows.length === 0) {
      throw new Error('Mostrador customer not found in database');
    }

    return mapearFilaACliente(rows[0]);
  }

  async todos(db: SqlDatabase | SqlExecutor): Promise<Cliente[]> {
    const rows = await db.query<ClienteRow>(
      `SELECT ${COLUMNAS_CLIENTE}
       FROM clientes
       WHERE es_mostrador = 0;`,
    );

    return rows
      .map(mapearFilaACliente)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }) || a.idCliente - b.idCliente);
  }
}
