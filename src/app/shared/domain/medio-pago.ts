export const MEDIOS_PAGO = ['EFECTIVO', 'TRANSFERENCIA'] as const;
export type MedioPago = (typeof MEDIOS_PAGO)[number];

export function esMedioPago(valor: unknown): valor is MedioPago {
  return typeof valor === 'string' && (MEDIOS_PAGO as readonly unknown[]).includes(valor);
}
