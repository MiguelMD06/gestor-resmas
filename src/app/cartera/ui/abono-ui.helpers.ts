import type { FechaHora, MedioPago } from '../../shared/domain';

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function formatearFechaHoraLegible(fecha: FechaHora): string {
  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/.exec(fecha);
  if (!match) {
    return fecha;
  }
  const [, anio, mesStr, diaStr, horaStr, minStr] = match;
  const mes = MESES_CORTOS[Number(mesStr) - 1] ?? mesStr;
  const dia = Number(diaStr);
  const hora24 = Number(horaStr);
  const sufijo = hora24 >= 12 ? 'p. m.' : 'a. m.';
  const hora12 = hora24 % 12 === 0 ? 12 : hora24 % 12;
  return `${dia} ${mes} ${anio} · ${hora12}:${minStr} ${sufijo}`;
}

export function formatearFechaCorta(fecha: FechaHora): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha);
  if (!match) {
    return fecha;
  }
  const [, anio, mesStr, diaStr] = match;
  const mes = MESES_CORTOS[Number(mesStr) - 1] ?? mesStr;
  return `${Number(diaStr)} ${mes} ${anio}`;
}

export function formatearFechaDiaMes(fecha: FechaHora): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha);
  if (!match) {
    return fecha;
  }
  const [, , mesStr, diaStr] = match;
  const mes = MESES_CORTOS[Number(mesStr) - 1] ?? mesStr;
  return `${Number(diaStr)} ${mes}`;
}

export function etiquetaMedioPago(medio: MedioPago): string {
  return medio === 'EFECTIVO' ? 'Efectivo' : 'Transferencia';
}
