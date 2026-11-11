import { inject, Injectable, signal } from '@angular/core';

import { DatabaseProvider } from '../shared/infrastructure/sqlite/database.provider';

export type EstadoArranqueTipo = 'cargando' | 'listo' | 'error';

@Injectable({
  providedIn: 'root',
})
export class EstadoArranque {
  private readonly dbProvider = inject(DatabaseProvider);

  readonly estado = signal<EstadoArranqueTipo>('cargando');

  async iniciar(): Promise<void> {
    try {
      await this.dbProvider.init();
      this.estado.set('listo');
    } catch (error) {
      console.error(error);
      this.estado.set('error');
    }
  }

  async reintentar(): Promise<void> {
    this.estado.set('cargando');
    await this.iniciar();
  }
}
