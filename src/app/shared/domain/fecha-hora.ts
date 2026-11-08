export type FechaHora = string & { readonly __brand: 'FechaHora' };

const FECHA_HORA_REGEX = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

export function fechaHora(valor: string): FechaHora {
  if (typeof valor !== 'string' || !FECHA_HORA_REGEX.test(valor)) {
    throw new RangeError(`Invalid FechaHora format, expected 'YYYY-MM-DD HH:mm:ss', got: ${valor}`);
  }

  const [datePart, timePart] = valor.split(' ');
  const [yearStr, monthStr, dayStr] = datePart.split('-');
  const [hourStr, minuteStr, secondStr] = timePart.split(':');

  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  const second = Number(secondStr);

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    throw new RangeError(`Date-time components out of range, got: ${valor}`);
  }

  const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() !== month - 1 ||
    utcDate.getUTCDate() !== day ||
    utcDate.getUTCHours() !== hour ||
    utcDate.getUTCMinutes() !== minute ||
    utcDate.getUTCSeconds() !== second
  ) {
    throw new RangeError(`Non-existent calendar date-time, got: ${valor}`);
  }

  return valor as FechaHora;
}

export function formatearFechaHora(fecha: Date): FechaHora {
  if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) {
    throw new RangeError(`Invalid Date object, got: ${fecha}`);
  }

  const year = String(fecha.getFullYear()).padStart(4, '0');
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  const hours = String(fecha.getHours()).padStart(2, '0');
  const minutes = String(fecha.getMinutes()).padStart(2, '0');
  const seconds = String(fecha.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}` as FechaHora;
}

export interface Clock {
  ahora(): FechaHora;
}
