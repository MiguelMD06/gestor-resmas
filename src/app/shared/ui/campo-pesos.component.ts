import { Component, computed, input, model, signal } from '@angular/core';
import { IonInput, IonItem, IonNote } from '@ionic/angular';

import { formatearPesos, pesos } from '../domain/pesos';

import { MENSAJE_MONTO_SIN_DECIMALES } from './mensajes-error';

const MAX_DIGITOS_SEGUROS = 15;
const CARACTERES_PERMITIDOS = /^[\d.$ ]*$/;

/**
 * Reusable currency input for Colombian pesos (COP).
 * Formats integers with `formatearPesos` while typing and emits `number | null` (never `0` when empty).
 */
@Component({
  selector: 'app-campo-pesos',
  host: {
    '[attr.disabled]': 'disabled() ? "" : null',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
  },
  template: `
    <ion-item>
      <ion-input
        [label]="label()"
        labelPlacement="stacked"
        type="text"
        inputmode="numeric"
        [value]="textoMostrado()"
        [disabled]="disabled()"
        [attr.aria-disabled]="disabled() ? 'true' : null"
        [attr.aria-invalid]="errorMostrado() ? 'true' : null"
        [placeholder]="placeholder()"
        (ionInput)="onInput($event)"
      ></ion-input>
    </ion-item>
    @if (errorMostrado()) {
      <ion-note color="danger" class="ion-padding-start" [attr.data-testid]="errorTestId()">
        {{ errorMostrado() }}
      </ion-note>
    }
  `,
  imports: [IonInput, IonItem, IonNote],
})
export class CampoPesosComponent {
  readonly valor = model<number | null>(null);
  readonly label = input.required<string>();
  readonly placeholder = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly error = input<string | null>(null);
  readonly errorTestId = input<string | null>(null);

  private readonly errorFormato = signal<string | null>(null);
  readonly errorMostrado = computed(() => this.errorFormato() ?? this.error());

  readonly textoMostrado = computed(() => {
    const v = this.valor();
    if (v === null || v === undefined || !Number.isSafeInteger(v)) {
      return '';
    }
    return formatearPesos(pesos(v));
  });

  onInput(event: CustomEvent | Event): void {
    const detail = (event as CustomEvent).detail;
    const raw =
      detail && typeof detail === 'object' && 'value' in detail
        ? detail.value
        : (event.target as HTMLInputElement | null)?.value;

    const texto = typeof raw === 'string' ? raw : raw == null ? '' : String(raw);
    if (!CARACTERES_PERMITIDOS.test(texto)) {
      this.errorFormato.set(MENSAJE_MONTO_SIN_DECIMALES);
      this.valor.set(null);
      return;
    }

    this.errorFormato.set(null);
    const digitos = texto.replace(/\D/g, '');

    let parsed: number | null = null;
    if (digitos.length > 0) {
      const num = Number(digitos);
      parsed = Number.isSafeInteger(num) ? num : Number(digitos.slice(0, MAX_DIGITOS_SEGUROS));
    }

    const formateado = parsed === null ? '' : formatearPesos(pesos(parsed));
    this.valor.set(parsed);
    this.sincronizarElemento(event.target as HTMLElement | null, formateado);
  }

  private sincronizarElemento(target: HTMLElement | null, formateado: string): void {
    if (!target) {
      return;
    }

    const ionInput = target as HTMLElement & { value?: string | number | null };
    if (ionInput.value !== formateado) {
      ionInput.value = formateado;
    }

    const nativeInput =
      target.tagName === 'INPUT'
        ? (target as HTMLInputElement)
        : (target.querySelector('input') as HTMLInputElement | null);

    if (nativeInput) {
      if (nativeInput.value !== formateado) {
        nativeInput.value = formateado;
      }
      if (typeof nativeInput.setSelectionRange === 'function') {
        const len = formateado.length;
        nativeInput.setSelectionRange(len, len);
      }
    }
  }
}
