import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';

import { AppComponent } from './app.component';
import { ErrorArranqueComponent } from './shell/error-arranque.component';
import { EstadoArranque, type EstadoArranqueTipo } from './shell/estado-arranque';

describe('AppComponent', () => {
  async function setupComponent(
    estadoInicial: EstadoArranqueTipo,
    reintentarSpy = vi.fn(),
  ): Promise<{
    fixture: ComponentFixture<AppComponent>;
    estadoMock: ReturnType<typeof signal<EstadoArranqueTipo>>;
    reintentarSpy: ReturnType<typeof vi.fn>;
  }> {
    const estadoMock = signal<EstadoArranqueTipo>(estadoInicial);
    const mockEstadoArranque = {
      estado: estadoMock,
      iniciar: vi.fn(),
      reintentar: reintentarSpy,
    };

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([]), { provide: EstadoArranque, useValue: mockEstadoArranque }],
    }).compileComponents();

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    return { fixture, estadoMock, reintentarSpy };
  }

  it('displays ion-router-outlet and does not display app-error-arranque when state is listo', async () => {
    const { fixture } = await setupComponent('listo');

    const routerOutlet = fixture.debugElement.query(By.css('ion-router-outlet'));
    const errorComp = fixture.debugElement.query(By.directive(ErrorArranqueComponent));

    expect(routerOutlet).toBeTruthy();
    expect(errorComp).toBeNull();
  });

  it('displays app-error-arranque when state is error, and upon retry transitions to cargando with spinner, then to listo showing router-outlet (E9)', async () => {
    let mockRef: { estadoMock: ReturnType<typeof signal<EstadoArranqueTipo>> } | null = null;
    const reintentarSpy = vi.fn(() => {
      mockRef?.estadoMock.set('cargando');
    });

    const { fixture, estadoMock } = await setupComponent('error', reintentarSpy);
    mockRef = { estadoMock };

    let routerOutlet = fixture.debugElement.query(By.css('ion-router-outlet'));
    let errorComp = fixture.debugElement.query(By.directive(ErrorArranqueComponent));

    expect(routerOutlet).toBeNull();
    expect(errorComp).toBeTruthy();

    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('No se pudo abrir la base de datos');
    expect(texto).toContain('Revisa el espacio disponible en el teléfono y vuelve a intentarlo.');

    const botonReintentar = fixture.debugElement.query(By.css('ion-button'));
    expect(botonReintentar).toBeTruthy();
    botonReintentar.nativeElement.click();

    expect(reintentarSpy).toHaveBeenCalledTimes(1);

    // After retry clicked, state changes to 'cargando' -> global spinner displayed, error component gone
    fixture.detectChanges();
    let spinner = fixture.debugElement.query(By.css('ion-spinner'));
    errorComp = fixture.debugElement.query(By.directive(ErrorArranqueComponent));
    routerOutlet = fixture.debugElement.query(By.css('ion-router-outlet'));

    expect(spinner).toBeTruthy();
    expect(errorComp).toBeNull();
    expect(routerOutlet).toBeNull();

    // State completes initialization and transitions to 'listo'
    estadoMock.set('listo');
    fixture.detectChanges();

    spinner = fixture.debugElement.query(By.css('ion-spinner'));
    errorComp = fixture.debugElement.query(By.directive(ErrorArranqueComponent));
    routerOutlet = fixture.debugElement.query(By.css('ion-router-outlet'));

    expect(routerOutlet).toBeTruthy();
    expect(errorComp).toBeNull();
    expect(spinner).toBeNull();
  });

  it('displays ion-spinner and neither router-outlet nor app-error-arranque when state is cargando', async () => {
    const { fixture } = await setupComponent('cargando');

    const routerOutlet = fixture.debugElement.query(By.css('ion-router-outlet'));
    const errorComp = fixture.debugElement.query(By.directive(ErrorArranqueComponent));
    const spinner = fixture.debugElement.query(By.css('ion-spinner'));

    expect(routerOutlet).toBeNull();
    expect(errorComp).toBeNull();
    expect(spinner).toBeTruthy();
  });
});
