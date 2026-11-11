export const ROL_GUARDADO = 'guardado';
export const ROL_CANCELAR = 'cancel';

export function esVacio(val: unknown): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val === 'string' && val.trim() === '') return true;
  if (typeof val === 'number' && Number.isNaN(val)) return true;
  return false;
}

export async function soloCierreExplicito(_data: unknown, role?: string): Promise<boolean> {
  return role === ROL_GUARDADO || role === ROL_CANCELAR;
}
