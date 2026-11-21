import { inject, Injectable } from '@angular/core';

import { ClienteRepository } from '../../clientes/infrastructure/cliente.repository';
import { cobro } from '../../finanzas/domain/operaciones';
import { LibroRepository } from '../../finanzas/infrastructure/libro.repository';
import { pesos, ReglaNegocioError, sumarPesos, type FechaHora, type MedioPago, type Pesos } from '../../shared/domain';
import { CLOCK } from '../../shared/infrastructure/clock/clock.token';
import { SQL_DATABASE } from '../../shared/infrastructure/sqlite/sql-database.token';
import {
  abonarFactura,
  distribuirCascada,
  liquidarTodo,
  validarFechaAbono,
  type AplicacionAbono,
  type FacturaAbierta,
} from '../domain';
import { AbonoRepository } from '../infrastructure/abono.repository';
import { CarteraRepository } from '../infrastructure/cartera.repository';

export type SolicitudRegistrarAbono =
  | {
      readonly modo: 'CASCADA_GLOBAL';
      readonly idCliente: number;
      readonly fecha: FechaHora;
      readonly medio: MedioPago;
      readonly monto: Pesos;
    }
  | {
      readonly modo: 'FACTURA_INDIVIDUAL';
      readonly idCliente: number;
      readonly fecha: FechaHora;
      readonly medio: MedioPago;
      readonly idVenta: number;
      readonly monto: Pesos;
    }
  | {
      readonly modo: 'LIQUIDACION_TOTAL';
      readonly idCliente: number;
      readonly fecha: FechaHora;
      readonly medio: MedioPago;
    };

export interface ResultadoRegistrarAbono {
  readonly idAbono: number;
  readonly aplicaciones: readonly AplicacionAbono[];
}

@Injectable({
  providedIn: 'root',
})
export class RegistrarAbono {
  private readonly db = inject(SQL_DATABASE);
  private readonly clock = inject(CLOCK);
  private readonly clientes = inject(ClienteRepository);
  private readonly cartera = inject(CarteraRepository);
  private readonly abonos = inject(AbonoRepository);
  private readonly libro = inject(LibroRepository);

  async registrar(s: SolicitudRegistrarAbono): Promise<ResultadoRegistrarAbono> {
    const ahora = this.clock.ahora();

    return this.db.transaction(async (tx) => {
      const cliente = await this.clientes.porId(tx, s.idCliente);
      if (cliente === null) {
        throw new ReglaNegocioError('CLIENTE_INEXISTENTE', `Customer not found with id: ${s.idCliente}`);
      }

      const abiertas = await this.cartera.facturasAbiertas(tx, s.idCliente);
      const aplicaciones = await this.calcularAplicaciones(tx, s, abiertas);

      const facturasPorId = new Map(abiertas.map((f) => [f.idVenta, f]));
      const facturasQueReciben = aplicaciones.map((app) => facturasPorId.get(app.idVenta)!);
      validarFechaAbono(s.fecha, ahora, facturasQueReciben);

      let montoTotal = pesos(0);
      let capitalTotal = pesos(0);
      let gananciaTotal = pesos(0);
      for (const app of aplicaciones) {
        montoTotal = sumarPesos(montoTotal, app.monto);
        capitalTotal = sumarPesos(capitalTotal, app.capital);
        gananciaTotal = sumarPesos(gananciaTotal, app.ganancia);
      }

      const idAbono = await this.abonos.insertar(tx, {
        idCliente: s.idCliente,
        fecha: s.fecha,
        monto: montoTotal,
        medio: s.medio,
        tipo: s.modo,
        aplicaciones,
      });

      for (const app of aplicaciones) {
        await this.cartera.aplicarPago(tx, app.idVenta, app.monto);
      }

      await this.libro.registrar(tx, cobro(s.fecha, s.medio, capitalTotal, gananciaTotal, idAbono));

      return { idAbono, aplicaciones };
    });
  }

  private async calcularAplicaciones(
    tx: Parameters<Parameters<typeof this.db.transaction>[0]>[0],
    s: SolicitudRegistrarAbono,
    abiertas: readonly FacturaAbierta[],
  ): Promise<AplicacionAbono[]> {
    switch (s.modo) {
      case 'CASCADA_GLOBAL':
        return distribuirCascada(abiertas, s.monto);
      case 'LIQUIDACION_TOTAL':
        return liquidarTodo(abiertas);
      case 'FACTURA_INDIVIDUAL': {
        const factura = abiertas.find((f) => f.idVenta === s.idVenta);
        if (factura === undefined) {
          const pertenece = await this.cartera.ventaPerteneceACliente(tx, s.idVenta, s.idCliente);
          if (pertenece) {
            throw new ReglaNegocioError('SIN_DEUDA', `Invoice ${s.idVenta} has no outstanding balance`);
          }
          throw new ReglaNegocioError(
            'FACTURA_INVALIDA',
            `Invoice ${s.idVenta} does not exist or does not belong to customer ${s.idCliente}`,
          );
        }
        return [abonarFactura(factura, s.monto)];
      }
    }
  }
}
