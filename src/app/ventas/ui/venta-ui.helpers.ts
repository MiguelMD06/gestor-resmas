import type { TipoPapel } from '../../shared/domain';

/**
 * Returns the Spanish display label for a paper type.
 */
export function etiquetaPapel(tipo: TipoPapel): string {
  return tipo === 'CARTA' ? 'Carta' : 'Oficio';
}

/**
 * Extracts the string value from an Ionic or native input event.
 */
export function leerValorEvento(event: CustomEvent | Event): string {
  const detail = (event as CustomEvent).detail;
  const raw =
    detail && typeof detail === 'object' && 'value' in detail
      ? detail.value
      : (event.target as HTMLInputElement | null)?.value;
  return typeof raw === 'string' ? raw : raw == null ? '' : String(raw);
}
