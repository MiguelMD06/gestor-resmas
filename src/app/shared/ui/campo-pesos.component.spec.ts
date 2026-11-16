import { Component, signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { beforeEach, describe, expect, it } from 'vitest';

import { CampoPesosComponent } from './campo-pesos.component';

@Component({
  selector: 'app-test-campo-pesos-host',
  template: `
    <app-campo-pesos
      [label]="label()"
      [(valor)]="valor"
      [disabled]="disabled()"
      [error]="error()"
      [errorTestId]="'error-campo'"
      [placeholder]="'Ej: 3800'"
    />
  `,
  imports: [CampoPesosComponent],
})
class TestHostComponent {
  readonly label = signal('Precio');
  readonly valor = signal<number | null>(null);
  readonly disabled = signal(false);
  readonly error = signal<string | null>(null);
}

describe('CampoPesosComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function getIonInput() {
    return fixture.debugElement.query(By.css('ion-input'));
  }

  function triggerIonInput(rawValue: string): void {
    const ionInput = getIonInput();
    ionInput.nativeElement.value = rawValue;
    ionInput.triggerEventHandler('ionInput', {
      detail: { value: rawValue },
      target: ionInput.nativeElement,
    });
    fixture.detectChanges();
  }

  it('renders ion-input with inputmode="numeric" and visible label', () => {
    const ionInput = getIonInput();
    expect(ionInput).toBeTruthy();
    expect(ionInput.attributes['inputmode']).toBe('numeric');
    expect(ionInput.nativeElement.label ?? ionInput.attributes['label']).toBe('Precio');
  });

  it('formats "3800" as "$ 3.800" and sets valor to integer 3800 (E21)', () => {
    triggerIonInput('3800');

    expect(host.valor()).toBe(3800);
    expect(getIonInput().nativeElement.value).toBe('$ 3.800');
  });

  it('sets valor to null (never 0) when cleared (E21)', () => {
    triggerIonInput('3800');
    expect(host.valor()).toBe(3800);

    triggerIonInput('');
    expect(host.valor()).toBeNull();
    expect(getIonInput().nativeElement.value).toBe('');
  });

  it('parses "3800", "3.800", "$3.800" and "$ 3.800" as 3800 without error (E21, R1)', () => {
    for (const entrada of ['3800', '3.800', '$3.800', '$ 3.800']) {
      triggerIonInput('');
      triggerIonInput(entrada);
      expect(host.valor()).toBe(3800);
      expect(getIonInput().nativeElement.value).toBe('$ 3.800');
      expect(fixture.debugElement.query(By.css('[data-testid="error-campo"]'))).toBeNull();
      expect(getIonInput().attributes['aria-invalid']).toBeUndefined();
    }
  });

  it('sets valor to null, shows decimal error, and marks aria-invalid for disallowed characters, then clears on valid input (E21, R1)', () => {
    for (const invalido of ['3800,50', '3.800,5', '38a0', '-3800']) {
      triggerIonInput(invalido);
      expect(host.valor()).toBeNull();
      const note = fixture.debugElement.query(By.css('[data-testid="error-campo"]'));
      expect(note).toBeTruthy();
      expect(note.nativeElement.textContent).toContain('Escribe el monto en pesos, sin decimales');
      expect(getIonInput().attributes['aria-invalid']).toBe('true');

      triggerIonInput('3800');
      expect(host.valor()).toBe(3800);
      expect(getIonInput().nativeElement.value).toBe('$ 3.800');
      expect(fixture.debugElement.query(By.css('[data-testid="error-campo"]'))).toBeNull();
      expect(getIonInput().attributes['aria-invalid']).toBeUndefined();
    }
  });

  it('disables ion-input and reflects disabled state for screen readers', () => {
    host.disabled.set(true);
    fixture.detectChanges();

    const campo = fixture.debugElement.query(By.css('app-campo-pesos'));
    const ionInput = getIonInput();
    expect(ionInput.nativeElement.disabled || ionInput.attributes['disabled'] !== undefined).toBe(true);
    expect(ionInput.attributes['aria-disabled'] === 'true' || campo.attributes['aria-disabled'] === 'true').toBe(true);

    host.disabled.set(false);
    fixture.detectChanges();
    expect(ionInput.nativeElement.disabled).toBe(false);
    expect(ionInput.attributes['aria-disabled']).toBeUndefined();
  });

  it('displays error message next to the field when error is set', () => {
    expect(fixture.debugElement.query(By.css('[data-testid="error-campo"]'))).toBeNull();

    host.error.set('El precio debe ser mayor a cero');
    fixture.detectChanges();

    const note = fixture.debugElement.query(By.css('[data-testid="error-campo"]'));
    expect(note).toBeTruthy();
    expect(note.nativeElement.textContent).toContain('El precio debe ser mayor a cero');
  });

  it('moves cursor to the end on native input after formatting', () => {
    const ionInputEl = getIonInput().nativeElement as HTMLElement & { value?: string };
    const nativeInput =
      (ionInputEl.querySelector('input') as HTMLInputElement | null) ??
      ionInputEl.appendChild(document.createElement('input'));

    let selectionStart: number | null = null;
    let selectionEnd: number | null = null;
    nativeInput.setSelectionRange = (start: number | null, end: number | null) => {
      selectionStart = start;
      selectionEnd = end;
    };

    triggerIonInput('3800');

    expect(nativeInput.value).toBe('$ 3.800');
    expect(selectionStart).toBe('$ 3.800'.length);
    expect(selectionEnd).toBe('$ 3.800'.length);
  });

  it('accepts valid thousands-separated inputs and rejects invalid dot placements with decimal error (F1)', () => {
    for (const [entrada, esperado] of [
      ['3800', 3800],
      ['3.800', 3800],
      ['120.000', 120000],
      ['$ 1.250.000', 1250000],
    ] as const) {
      triggerIonInput('');
      triggerIonInput(entrada);
      expect(host.valor()).toBe(esperado);
      expect(fixture.debugElement.query(By.css('[data-testid="error-campo"]'))).toBeNull();
      expect(getIonInput().attributes['aria-invalid']).toBeUndefined();
    }

    for (const invalido of ['3800.50', '3.80', '38.00', '3..800', '.800']) {
      triggerIonInput('3800');
      triggerIonInput(invalido);
      expect(host.valor()).toBeNull();
      const note = fixture.debugElement.query(By.css('[data-testid="error-campo"]'));
      expect(note).toBeTruthy();
      expect(note.nativeElement.textContent.trim()).toBe('Escribe el monto en pesos, sin decimales');
      expect(getIonInput().attributes['aria-invalid']).toBe('true');
    }
  });

  it('sets valor to null and shows oversized message without truncating when amount is not a safe integer (F2)', () => {
    triggerIonInput('9999999999999999');

    expect(host.valor()).toBeNull();
    const note = fixture.debugElement.query(By.css('[data-testid="error-campo"]'));
    expect(note).toBeTruthy();
    expect(note.nativeElement.textContent.trim()).toBe('El monto es demasiado grande');
    expect(getIonInput().attributes['aria-invalid']).toBe('true');
    expect(getIonInput().nativeElement.value).toBe('9999999999999999');
  });

  it('preserves the exact invalid text typed by the user even after a prior valid value (F3)', () => {
    triggerIonInput('3800');
    expect(host.valor()).toBe(3800);
    expect(getIonInput().nativeElement.value).toBe('$ 3.800');

    triggerIonInput('3800,50');
    expect(host.valor()).toBeNull();
    expect(getIonInput().nativeElement.value).toBe('3800,50');

    triggerIonInput('3800.50');
    expect(host.valor()).toBeNull();
    expect(getIonInput().nativeElement.value).toBe('3800.50');
  });

  it('clears format error and aria-invalid and formats new value when valor changes externally (F4)', () => {
    triggerIonInput('3800');
    triggerIonInput('3800,50');
    expect(fixture.debugElement.query(By.css('[data-testid="error-campo"]'))).toBeTruthy();
    expect(getIonInput().attributes['aria-invalid']).toBe('true');

    host.valor.set(5000);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="error-campo"]'))).toBeNull();
    expect(getIonInput().attributes['aria-invalid']).toBeUndefined();
    expect(getIonInput().nativeElement.value).toBe('$ 5.000');

    triggerIonInput('38a0');
    expect(fixture.debugElement.query(By.css('[data-testid="error-campo"]'))).toBeTruthy();
    host.valor.set(0);
    fixture.detectChanges();
    host.valor.set(null);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="error-campo"]'))).toBeNull();
    expect(getIonInput().attributes['aria-invalid']).toBeUndefined();
    expect(getIonInput().nativeElement.value).toBe('');
  });
});
