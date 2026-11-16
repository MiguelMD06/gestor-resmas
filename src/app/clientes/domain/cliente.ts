import { ReglaNegocioError } from '../../shared/domain';

export interface Cliente {
  idCliente: number;
  nombre: string;
  telefono: string | null;
  esMostrador: boolean;
}

const MAX_LONGITUD_NOMBRE = 80;
const PATRON_CELULAR = /^3\d{9}$/;

export function validarNombre(texto: string): string {
  const recortado = texto.trim();
  if (recortado.length === 0 || recortado.length > MAX_LONGITUD_NOMBRE) {
    throw new ReglaNegocioError('NOMBRE_INVALIDO', 'Customer name must be 1 to 80 characters long');
  }
  return recortado;
}

export function validarTelefono(texto: string | null): string | null {
  if (texto === null) {
    return null;
  }
  const sinEspacios = texto.replace(/\s+/g, '');
  if (sinEspacios.length === 0) {
    return null;
  }
  if (!PATRON_CELULAR.test(sinEspacios)) {
    throw new ReglaNegocioError('TELEFONO_INVALIDO', 'Phone must be a 10-digit mobile number starting with 3');
  }
  return sinEspacios;
}

export function normalizarBusqueda(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
