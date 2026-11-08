export const TIPOS_PAPEL = ['CARTA', 'OFICIO'] as const;
export type TipoPapel = (typeof TIPOS_PAPEL)[number];

export function esTipoPapel(valor: unknown): valor is TipoPapel {
  return typeof valor === 'string' && (TIPOS_PAPEL as readonly unknown[]).includes(valor);
}
