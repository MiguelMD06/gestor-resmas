import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';

import { AppComponent } from './app.component';
import { ErrorArranqueComponent } from './shell/error-arranque.component';
import { EstadoArranque, type EstadoArranqueTipo } from './shell/estado-arranque';

describe('AppComponent', () => {
  it('con estado listo muestra ion-router-outlet y no app-error-arranque', async () => {
    const estadoMock = signal<EstadoArranqueTipo>('listo');
    const mockEstadoArranque = {
      estado: estadoMock,
      iniciar: vi.fn(),
      reintentar: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([]), { provide: EstadoArranque, useValue: mockEstadoArranque }],
    }).compileComponents();

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const routerOutlet = fixture.debugElement.query(By.css('ion-router-outlet'));
    const errorComp = fixture.debugElement.query(By.directive(ErrorArranqueComponent));

    expect(routerOutlet).toBeTruthy();
    expect(errorComp).toBeNull();
  });

  it('con estado error muestra app-error-arranque y no ion-router-outlet; al tocar Reintentar llama a reintentar() (E9)', async () => {
    const estadoMock = signal<EstadoArranqueTipo>('error');
    const reintentarSpy = vi.fn();
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

    const routerOutlet = fixture.debugElement.query(By.css('ion-router-outlet'));
    const errorComp = fixture.debugElement.query(By.directive(ErrorArranqueComponent));

    expect(routerOutlet).toBeNull();
    expect(errorComp).toBeTruthy();

    // Verificamos el contenido de error
    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('No se pudo abrir la base de datos');
    expect(texto).toContain('Revisa el espacio disponible en el teléfono y vuelve a intentarlo.');

    // Simula tocar el botón Reintentar
    const botonReintentar = fixture.debugElement.query(By.css('ion-button'));
    expect(botonReintentar).toBeTruthy();
    botonReintentar.nativeElement.click();

    expect(reintentarSpy).toHaveBeenCalledTimes(1);
  });

  it('con estado cargando muestra ion-spinner y ni router-outlet ni app-error-arranque', async () => {
    const estadoMock = signal<EstadoArranqueTipo>('cargando');
    const mockEstadoArranque = {
      estado: estadoMock,
      iniciar: vi.fn(),
      reintentar: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([]), { provide: EstadoArranque, useValue: mockEstadoArranque }],
    }).compileComponents();

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const routerOutlet = fixture.debugElement.query(By.css('ion-router-outlet'));
    const errorComp = fixture.debugElement.query(By.directive(ErrorArranqueComponent));
    const spinner = fixture.debugElement.query(By.css('ion-spinner'));

    expect(routerOutlet).toBeNull();
    expect(errorComp).toBeNull();
    expect(spinner).toBeTruthy();
  });
});
