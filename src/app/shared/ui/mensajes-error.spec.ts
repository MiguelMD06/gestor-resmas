import { describe, expect, it } from 'vitest';

import { ReglaNegocioError, type CodigoRegla } from '../domain/regla-negocio.error';

import { MENSAJE_ERROR_GENERICO, MENSAJE_MONTO_SIN_DECIMALES, MENSAJES_ERROR, mensajeDeError } from './mensajes-error';

describe('mensajes-error', () => {
  it('translates SALDO_INSUFICIENTE to the expected Spanish message', () => {
    const error = new ReglaNegocioError('SALDO_INSUFICIENTE', 'Pocket balance < amount');
    expect(mensajeDeError(error)).toBe('No hay suficiente dinero en ese medio de pago');
  });

  it('translates all CodigoRegla values defined in MENSAJES_ERROR', () => {
    const errorCantidad = new ReglaNegocioError('CANTIDAD_INVALIDA', 'invalid quantity');
    expect(mensajeDeError(errorCantidad)).toBe(MENSAJES_ERROR.CANTIDAD_INVALIDA);

    const errorCosto = new ReglaNegocioError('COSTO_CAJA_INVALIDO', 'invalid box cost');
    expect(mensajeDeError(errorCosto)).toBe(MENSAJES_ERROR.COSTO_CAJA_INVALIDO);

    const errorStock = new ReglaNegocioError('STOCK_INSUFICIENTE', 'insufficient stock');
    expect(mensajeDeError(errorStock)).toBe(MENSAJES_ERROR.STOCK_INSUFICIENTE);

    const errorMonto = new ReglaNegocioError('MONTO_INVALIDO', 'invalid amount');
    expect(mensajeDeError(errorMonto)).toBe(MENSAJES_ERROR.MONTO_INVALIDO);
  });

  it.each<[CodigoRegla, string]>([
    ['NOMBRE_INVALIDO', 'El nombre es obligatorio y puede tener hasta 80 caracteres'],
    ['TELEFONO_INVALIDO', 'El celular debe tener 10 dígitos y empezar por 3'],
    ['TELEFONO_REPETIDO', 'Ya existe un cliente con ese número de celular'],
    ['CLIENTE_INEXISTENTE', 'El cliente no existe'],
    ['PRECIO_INVALIDO', 'El precio debe ser un número entero mayor a cero'],
    ['CANTIDAD_RESMAS_INVALIDA', 'La cantidad de resmas debe ser un número entero mayor a cero'],
    ['VENTA_SIN_LINEAS', 'Agrega al menos un lote a la venta'],
    ['LOTE_REPETIDO', 'Ese lote ya está en la venta'],
    [
      'ABONO_INICIAL_INVALIDO',
      'El abono inicial debe ser mayor a cero y menor que el total. Si paga todo, elige Contado',
    ],
    ['MOSTRADOR_SOLO_CONTADO', 'Las ventas a Mostrador solo pueden ser de contado'],
    ['FECHA_FUTURA', 'La fecha de la venta no puede ser futura'],
  ])('translates %s to its exact Spanish message', (codigo, texto) => {
    expect(mensajeDeError(new ReglaNegocioError(codigo, 'detail'))).toBe(texto);
  });

  it('keeps the box quantity message of the purchase unchanged', () => {
    expect(mensajeDeError(new ReglaNegocioError('CANTIDAD_INVALIDA', 'detail'))).toBe(
      'La cantidad de cajas debe ser un número entero mayor a cero',
    );
  });

  it('returns generic error text for a standard Error', () => {
    const standardError = new Error('Database disk image is malformed');
    expect(mensajeDeError(standardError)).toBe('Ocurrió un error inesperado');
  });

  it('returns generic error text for non-Error unknown values', () => {
    expect(mensajeDeError('something went wrong')).toBe('Ocurrió un error inesperado');
    expect(mensajeDeError(null)).toBe('Ocurrió un error inesperado');
    expect(mensajeDeError(undefined)).toBe('Ocurrió un error inesperado');
    expect(mensajeDeError(42)).toBe('Ocurrió un error inesperado');
  });

  it('returns generic error text for a ReglaNegocioError with an unknown code at runtime', () => {
    expect(MENSAJE_ERROR_GENERICO).toBe('Ocurrió un error inesperado');
    const unknownError = new ReglaNegocioError('CODIGO_DESCONOCIDO' as CodigoRegla, 'x');
    expect(mensajeDeError(unknownError)).toBe(MENSAJE_ERROR_GENERICO);
  });

  it('exports the exact validation message for currency input without decimals (R1)', () => {
    expect(MENSAJE_MONTO_SIN_DECIMALES).toBe('Escribe el monto en pesos, sin decimales');
  });
});
