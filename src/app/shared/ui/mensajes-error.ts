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
  NOMBRE_INVALIDO: 'El nombre es obligatorio y puede tener hasta 80 caracteres',
  TELEFONO_INVALIDO: 'El celular debe tener 10 dígitos y empezar por 3',
  TELEFONO_REPETIDO: 'Ya existe un cliente con ese número de celular',
  CLIENTE_INEXISTENTE: 'El cliente no existe',
  PRECIO_INVALIDO: 'El precio debe ser un número entero mayor a cero',
  CANTIDAD_RESMAS_INVALIDA: 'La cantidad de resmas debe ser un número entero mayor a cero',
  VENTA_SIN_LINEAS: 'Agrega al menos un lote a la venta',
  LOTE_REPETIDO: 'Ese lote ya está en la venta',
  ABONO_INICIAL_INVALIDO: 'El abono inicial debe ser mayor a cero y menor que el total. Si paga todo, elige Contado',
  MOSTRADOR_SOLO_CONTADO: 'Las ventas a Mostrador solo pueden ser de contado',
  FECHA_FUTURA: 'La fecha de la venta no puede ser futura',
};

export const MENSAJE_ERROR_GENERICO = 'Ocurrió un error inesperado';

export function mensajeDeError(error: unknown): string {
  if (error instanceof ReglaNegocioError) {
    return MENSAJES_ERROR[error.codigo] ?? MENSAJE_ERROR_GENERICO;
  }
  return MENSAJE_ERROR_GENERICO;
}
