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
  | 'STOCK_INSUFICIENTE' // reams to deduct exceed available stock
  | 'NOMBRE_INVALIDO' // customer name empty after trimming or longer than 80 characters
  | 'TELEFONO_INVALIDO' // phone is not a 10-digit mobile number starting with 3
  | 'TELEFONO_REPETIDO' // phone already belongs to another customer
  | 'CLIENTE_INEXISTENTE' // customer id does not exist, or is the counter customer where not allowed
  | 'PRECIO_INVALIDO' // unit sale price <= 0 or not an integer
  | 'CANTIDAD_RESMAS_INVALIDA' // reams in a sale line <= 0 or not an integer
  | 'VENTA_SIN_LINEAS' // sale without lines
  | 'LOTE_REPETIDO' // the same lot appears in two lines of a sale
  | 'ABONO_INICIAL_INVALIDO' // initial payment outside 1..total - 1
  | 'MOSTRADOR_SOLO_CONTADO' // counter customer sale on credit or with an initial payment
  | 'FECHA_FUTURA'; // sale date after the current clock time

export class ReglaNegocioError extends Error {
  constructor(
    readonly codigo: CodigoRegla,
    message: string,
  ) {
    super(message);
    this.name = 'ReglaNegocioError';
  }
}
