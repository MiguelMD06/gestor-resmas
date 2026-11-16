import { inject, Injectable } from '@angular/core';

import { AbonoRepository } from '../../cartera';
import { cobro } from '../../finanzas/domain/operaciones';
import { LibroRepository } from '../../finanzas/infrastructure/libro.repository';
import { LoteRepository } from '../../inventario/infrastructure/lote.repository';
import { ReglaNegocioError, type FechaHora } from '../../shared/domain';
import { CLOCK } from '../../shared/infrastructure/clock/clock.token';
import { SQL_DATABASE } from '../../shared/infrastructure/sqlite/sql-database.token';
import { armarVenta, type PagoVenta } from '../domain/venta';
import { VentaRepository } from '../infrastructure/venta.repository';

export interface LineaSolicitudVenta {
  readonly idLote: number;
  readonly cantidad: number;
  readonly precioUnitario: number;
}

export interface SolicitudRegistrarVenta {
  readonly idCliente: number;
  readonly fecha: FechaHora;
  readonly lineas: readonly LineaSolicitudVenta[];
  readonly pago: PagoVenta;
}

@Injectable({
  providedIn: 'root',
})
export class RegistrarVenta {
  private readonly db = inject(SQL_DATABASE);
  private readonly clock = inject(CLOCK);
  private readonly ventas = inject(VentaRepository);
  private readonly lotes = inject(LoteRepository);
  private readonly abonos = inject(AbonoRepository);
  private readonly libro = inject(LibroRepository);

  async registrar(params: SolicitudRegistrarVenta): Promise<{ idVenta: number }> {
    const ahora = this.clock.ahora();

    return this.db.transaction(async (tx) => {
      const esMostrador = await this.ventas.esMostrador(tx, params.idCliente);
      if (esMostrador === null) {
        throw new ReglaNegocioError('CLIENTE_INEXISTENTE', `Customer not found with id: ${params.idCliente}`);
      }

      const lineasEntrada = [];
      for (const linea of params.lineas) {
        const lote = await this.lotes.porId(tx, linea.idLote);
        if (lote === null || lote.estado === 'AGOTADO') {
          throw new ReglaNegocioError(
            'STOCK_INSUFICIENTE',
            `Lot ${linea.idLote} does not exist or is already exhausted`,
          );
        }

        lineasEntrada.push({
          idLote: linea.idLote,
          fechaCompra: lote.fechaCompra,
          costoUnitario: lote.costoUnitarioResma,
          disponibles: lote.resmasDisponibles,
          cantidad: linea.cantidad,
          precioUnitario: linea.precioUnitario,
        });
      }

      const venta = armarVenta({
        idCliente: params.idCliente,
        esMostrador,
        fecha: params.fecha,
        ahora,
        lineas: lineasEntrada,
        pago: params.pago,
      });

      for (const linea of venta.lineas) {
        await this.lotes.descontar(tx, linea.idLote, linea.cantidad);
      }

      const idVenta = await this.ventas.insertar(tx, venta, params.idCliente, params.fecha);

      if (venta.cobro !== null) {
        const idAbono = await this.abonos.insertar(tx, {
          idCliente: params.idCliente,
          fecha: params.fecha,
          monto: venta.cobro.monto,
          medio: venta.cobro.medio,
          tipo: venta.cobro.tipoAbono,
          aplicaciones: [
            {
              idVenta,
              monto: venta.cobro.monto,
              capital: venta.cobro.capital,
              ganancia: venta.cobro.ganancia,
            },
          ],
        });

        await this.libro.registrar(
          tx,
          cobro(params.fecha, venta.cobro.medio, venta.cobro.capital, venta.cobro.ganancia, idAbono),
        );
      }

      return { idVenta };
    });
  }
}
