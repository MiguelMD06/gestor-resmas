import type { FechaHora, MedioPago, Pesos } from '../../shared/domain';

export const TIPOS_MOVIMIENTO = [
  'APORTE_CAPITAL',
  'COMPRA_LOTE',
  'COBRO',
  'RETIRO_GANANCIA',
  'TRASPASO_SALIDA',
  'TRASPASO_ENTRADA',
] as const;

export type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];

export interface Movimiento {
  readonly fecha: FechaHora;
  readonly tipo: TipoMovimiento;
  readonly medio: MedioPago;
  readonly deltaBolsillo: Pesos;
  readonly deltaCapital: Pesos;
  readonly deltaGanancia: Pesos;
  readonly idLote: number | null;
  readonly idAbono: number | null;
  readonly idMovimientoOrigen: number | null;
  readonly nota: string | null;
}
