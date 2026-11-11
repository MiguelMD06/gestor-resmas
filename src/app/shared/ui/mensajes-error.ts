import { ReglaNegocioError, type CodigoRegla } from '../domain/regla-negocio.error';

export const MENSAJES_ERROR: Record<CodigoRegla, string> = {
  MONTO_INVALIDO: 'El monto debe ser un número entero mayor a cero',
  MONTO_SUPERA_DEUDA: 'El monto supera la deuda del cliente',
  MONTO_SUPERA_SALDO_FACTURA: 'El monto supera el saldo de la factura',
  SIN_DEUDA: 'El cliente no tiene deuda pendiente',
  SALDO_INSUFICIENTE: 'No hay suficiente dinero en ese medio de pago',
  GANANCIA_INSUFICIENTE: 'La ganancia libre no es suficiente para este retiro',
  TRASPASO_MISMO_MEDIO: 'El medio de origen y destino no pueden ser iguales',
  FACTURA_INVALIDA: 'Los datos de la factura no son válidos',
  CANTIDAD_INVALIDA: 'La cantidad de cajas debe ser un número entero mayor a cero',
  COSTO_CAJA_INVALIDO: 'El costo por caja debe ser un número entero divisible entre 10',
  STOCK_INSUFICIENTE: 'No hay suficientes resmas disponibles en el lote',
};

const MENSAJE_ERROR_GENERICO = 'Ocurrió un error inesperado';

export function mensajeDeError(error: unknown): string {
  if (error instanceof ReglaNegocioError) {
    return MENSAJES_ERROR[error.codigo];
  }
  return MENSAJE_ERROR_GENERICO;
}
