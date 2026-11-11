import { describe, expect, it } from 'vitest';

import { ReglaNegocioError } from '../domain/regla-negocio.error';

import { MENSAJES_ERROR, mensajeDeError } from './mensajes-error';

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
});
