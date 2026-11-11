export function esVacio(val: unknown): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val === 'string' && val.trim() === '') return true;
  if (typeof val === 'number' && Number.isNaN(val)) return true;
  return false;
}
