import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fechaHora, type FechaHora } from '../domain';

import { HojaFechaComponent } from './hoja-fecha.component';

describe('HojaFechaComponent', () => {
  let fixture: ComponentFixture<HojaFechaComponent>;
  let component: HojaFechaComponent;

  const maximo = fechaHora('2026-11-16 15:45:00');
  const valorInicial = fechaHora('2026-11-16 14:00:00');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HojaFechaComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HojaFechaComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('titulo', 'Fecha de la venta');
    fixture.componentRef.setInput('valor', valorInicial);
    fixture.componentRef.setInput('maximo', maximo);
    fixture.componentRef.setInput('datetimeTestId', 'datetime-fecha-venta');
    fixture.detectChanges();
  });

  it('passes valor and maximo in ISO format to ion-datetime so future dates are blocked', () => {
    const datetime = fixture.debugElement.query(By.css('[data-testid="datetime-fecha-venta"]'));
    expect(datetime).toBeTruthy();
    expect(datetime.componentInstance.value).toBe('2026-11-16T14:00:00');
    expect(datetime.componentInstance.max).toBe('2026-11-16T15:45:00');
    expect(fixture.nativeElement.textContent).toContain('Fecha de la venta');
  });

  it('emits fechaChange with FechaHora when a valid past or current date is selected', () => {
    const fechas: FechaHora[] = [];
    component.fechaChange.subscribe((f) => fechas.push(f));

    const datetime = fixture.debugElement.query(By.css('[data-testid="datetime-fecha-venta"]'));
    datetime.nativeElement.value = '2026-11-15T10:30';
    datetime.nativeElement.dispatchEvent(new CustomEvent('ionChange', { detail: { value: '2026-11-15T10:30' } }));

    expect(fechas).toEqual([fechaHora('2026-11-15 10:30:00')]);
  });

  it('ignores future dates above maximo and invalid values', () => {
    const fechas: FechaHora[] = [];
    component.fechaChange.subscribe((f) => fechas.push(f));

    const datetime = fixture.debugElement.query(By.css('[data-testid="datetime-fecha-venta"]'));
    for (const value of ['2026-11-17T09:00:00', '2026-11-16T15:46:00', null]) {
      datetime.nativeElement.value = value;
      datetime.nativeElement.dispatchEvent(new CustomEvent('ionChange', { detail: { value } }));
    }

    expect(fechas).toEqual([]);
  });

  it('emits cerrar when clicking Listo', () => {
    const onCerrar = vi.fn();
    component.cerrar.subscribe(onCerrar);

    const btnListo = fixture.debugElement.query(By.css('[data-testid="btn-listo-fecha"]'));
    btnListo.triggerEventHandler('click', null);

    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it('keeps last valid value and marks help text as alert on invalid or future dates, then clears on valid date', () => {
    const fechas: FechaHora[] = [];
    component.fechaChange.subscribe((f) => fechas.push(f));

    const datetime = fixture.debugElement.query(By.css('[data-testid="datetime-fecha-venta"]'));

    for (const value of ['2026-11-17T09:00:00', '2026-11-16T15:46:00', null, 'invalida']) {
      datetime.nativeElement.value = value;
      datetime.nativeElement.dispatchEvent(new CustomEvent('ionChange', { detail: { value } }));
      fixture.detectChanges();

      expect(fechas).toEqual([]);
      expect(datetime.componentInstance.value).toBe('2026-11-16T14:00:00');

      const ayuda = fixture.debugElement.query(By.css('[data-testid="hoja-fecha-ayuda"]'));
      expect(ayuda).toBeTruthy();
      expect(ayuda.nativeElement.classList.contains('hoja-fecha-ayuda-error')).toBe(true);
      expect(ayuda.nativeElement.getAttribute('role')).toBe('alert');
    }

    datetime.nativeElement.value = '2026-11-15T10:30:00';
    datetime.nativeElement.dispatchEvent(new CustomEvent('ionChange', { detail: { value: '2026-11-15T10:30:00' } }));
    fixture.detectChanges();

    expect(fechas).toEqual([fechaHora('2026-11-15 10:30:00')]);
    const ayudaDespues = fixture.debugElement.query(By.css('[data-testid="hoja-fecha-ayuda"]'));
    expect(ayudaDespues).toBeTruthy();
    expect(ayudaDespues.nativeElement.classList.contains('hoja-fecha-ayuda-error')).toBe(false);
    expect(ayudaDespues.nativeElement.getAttribute('role')).toBeNull();
  });
});
