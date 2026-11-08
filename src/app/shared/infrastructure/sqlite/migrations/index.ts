import { migracion001 } from './001-esquema-inicial';
import type { Migracion } from './migracion';

export type { Migracion };
export { migracion001 };
export const MIGRACIONES: readonly Migracion[] = [migracion001];
