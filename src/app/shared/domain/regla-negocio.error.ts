export type CodigoRegla =
  | 'MONTO_INVALIDO' // amount <= 0 where a positive amount is required
  | 'MONTO_SUPERA_DEUDA' // payment > customer's total debt
  | 'MONTO_SUPERA_SALDO_FACTURA' // payment > invoice balance
  | 'SIN_DEUDA' // payment or settlement with no debt
  | 'SALDO_INSUFICIENTE' // pocket balance < amount
  | 'GANANCIA_INSUFICIENTE' // free profit < withdrawal
  | 'TRASPASO_MISMO_MEDIO' // transfer with the same source and target
  | 'FACTURA_INVALIDA' // invoice data out of domain: paid < 0, paid > total or cost base < 0
  | 'CANTIDAD_INVALIDA' // boxes or reams <= 0 or not an integer
  | 'COSTO_CAJA_INVALIDO' // box cost <= 0, not an integer or not divisible by RESMAS_POR_CAJA
  | 'STOCK_INSUFICIENTE'; // reams to deduct exceed available stock

export class ReglaNegocioError extends Error {
  constructor(
    readonly codigo: CodigoRegla,
    message: string,
  ) {
    super(message);
    this.name = 'ReglaNegocioError';
  }
}
