/**
 * Computes uppercase initials from a person's name:
 * first letter of the first word and first letter of the last word
 * (or a single letter for one-word names, ignoring extra whitespace).
 */
export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) {
    return '';
  }
  if (partes.length === 1) {
    return partes[0][0].toUpperCase();
  }
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}
