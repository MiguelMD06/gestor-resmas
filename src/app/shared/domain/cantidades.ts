export const RESMAS_POR_CAJA = 10;

export type Resmas = number & { readonly __brand: 'Resmas' };
export type Cajas = number & { readonly __brand: 'Cajas' };

export function resmas(valor: number): Resmas {
  if (!Number.isSafeInteger(valor) || valor < 0) {
    throw new RangeError(`Resmas must be a non-negative safe integer, got: ${valor}`);
  }
  return valor as Resmas;
}

export function resmasPositivas(valor: number): Resmas {
  if (!Number.isSafeInteger(valor) || valor <= 0) {
    throw new RangeError(`Resmas must be a positive safe integer, got: ${valor}`);
  }
  return valor as Resmas;
}

export function cajas(valor: number): Cajas {
  if (!Number.isSafeInteger(valor) || valor <= 0) {
    throw new RangeError(`Cajas must be a positive safe integer, got: ${valor}`);
  }
  return valor as Cajas;
}

export function cajasAResmas(valor: Cajas): Resmas {
  return resmas(valor * RESMAS_POR_CAJA);
}
