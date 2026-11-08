export type Pesos = number & { readonly __brand: 'Pesos' };

export function pesos(valor: number): Pesos {
  if (!Number.isSafeInteger(valor)) {
    throw new RangeError(`Value must be a safe integer, got: ${valor}`);
  }
  return valor as Pesos;
}

export function pesosPositivos(valor: number): Pesos {
  const p = pesos(valor);
  if (p <= 0) {
    throw new RangeError(`Value must be greater than zero, got: ${valor}`);
  }
  return p;
}

export function sumarPesos(a: Pesos, b: Pesos): Pesos {
  const resultado = a + b;
  if (!Number.isSafeInteger(resultado)) {
    throw new RangeError(`Sum exceeds safe integer range: ${a} + ${b}`);
  }
  return resultado as Pesos;
}

export function restarPesos(a: Pesos, b: Pesos): Pesos {
  const resultado = a - b;
  if (!Number.isSafeInteger(resultado)) {
    throw new RangeError(`Difference exceeds safe integer range: ${a} - ${b}`);
  }
  return resultado as Pesos;
}

export function formatearPesos(valor: Pesos): string {
  if (!Number.isSafeInteger(valor)) {
    throw new RangeError(`Value must be a safe integer, got: ${valor}`);
  }

  const isNegative = valor < 0;
  const absStr = Math.abs(valor).toString();
  const formattedWithDots = absStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return isNegative ? `-$ ${formattedWithDots}` : `$ ${formattedWithDots}`;
}
