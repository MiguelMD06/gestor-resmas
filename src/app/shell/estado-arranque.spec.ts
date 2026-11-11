import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { DatabaseProvider } from '../shared/infrastructure/sqlite/database.provider';

import { EstadoArranque } from './estado-arranque';

describe('EstadoArranque', () => {
  it('transitions to ready if init() succeeds on the first attempt', async () => {
    const initSpy = vi.fn().mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        EstadoArranque,
        {
          provide: DatabaseProvider,
          useValue: { init: initSpy },
        },
      ],
    });

    const estadoArranque = TestBed.inject(EstadoArranque);
    expect(estadoArranque.estado()).toBe('cargando');

    await estadoArranque.iniciar();

    expect(estadoArranque.estado()).toBe('listo');
    expect(initSpy).toHaveBeenCalledTimes(1);
  });

  it('handles an init() failure by entering error state without rethrowing, and reintentar() passes through cargando and finishes in listo', async () => {
    const errorOriginal = new Error('Disk full');
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    let llamadas = 0;
    const initSpy = vi.fn().mockImplementation(async () => {
      llamadas += 1;
      if (llamadas === 1) {
        throw errorOriginal;
      }
      return undefined;
    });

    TestBed.configureTestingModule({
      providers: [
        EstadoArranque,
        {
          provide: DatabaseProvider,
          useValue: { init: initSpy },
        },
      ],
    });

    const estadoArranque = TestBed.inject(EstadoArranque);
    expect(estadoArranque.estado()).toBe('cargando');

    // First call (fails): should not rethrow, the promise resolves
    await expect(estadoArranque.iniciar()).resolves.toBeUndefined();
    expect(estadoArranque.estado()).toBe('error');
    expect(consoleErrorSpy).toHaveBeenCalledWith(errorOriginal);
    expect(initSpy).toHaveBeenCalledTimes(1);

    // Retry: passes through 'cargando' and then finishes in 'listo'
    let estadoDuranteReintento: string | undefined;
    initSpy.mockImplementationOnce(async () => {
      estadoDuranteReintento = estadoArranque.estado();
      return undefined;
    });

    const promesaReintento = estadoArranque.reintentar();
    expect(estadoArranque.estado()).toBe('cargando');

    await promesaReintento;

    expect(estadoDuranteReintento).toBe('cargando');
    expect(estadoArranque.estado()).toBe('listo');
    expect(initSpy).toHaveBeenCalledTimes(2);

    consoleErrorSpy.mockRestore();
  });
});
