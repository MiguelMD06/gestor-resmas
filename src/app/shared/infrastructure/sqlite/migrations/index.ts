import { migracion001 } from './001-esquema-inicial';
import { migracion002 } from './002-telefono-unico';
import type { Migracion } from './migracion';

export type { Migracion };
export { migracion001, migracion002 };
export const MIGRACIONES: readonly Migracion[] = [migracion001, migracion002];
