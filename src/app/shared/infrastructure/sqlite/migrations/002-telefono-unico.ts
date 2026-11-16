import type { Migracion } from './migracion';

export const migracion002: Migracion = {
  version: 2,
  nombre: 'telefono-unico',
  script: 'CREATE UNIQUE INDEX ux_clientes_telefono ON clientes (telefono) WHERE telefono IS NOT NULL;',
};
