import { Component, computed, effect, input, model, signal } from '@angular/core';
import { IonInput, IonItem, IonNote } from '@ionic/angular';

import { formatearPesos, pesos } from '../domain/pesos';

import { MENSAJE_MONTO_DEMASIADO_GRANDE, MENSAJE_MONTO_SIN_DECIMALES } from './mensajes-error';

const FORMATO_PESOS = /^(?:\d+|\d{1,3}(?:\.\d{3})+)$/;

function contarPuntos(texto: string): number {
  return (texto.match(/\./g) ?? []).length;
}

/**
 * Reusable currency input for Colombian pesos (COP).
 * Formats integers with `formatearPesos` while typing and emits `number | null` (never `0` when empty).
 */
@Component({
  selector: 'app-campo-pesos',
  host: {
    '[attr.disabled]': 'disabled() ? "" : null',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[class.app-campo-error]': 'errorMostrado() !== null',
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
        [class.ion-invalid]="errorMostrado() !== null"
        [class.ion-touched]="errorMostrado() !== null"
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
  readonly generacion = input<number>(0);

  private readonly errorFormato = signal<string | null>(null);
  private readonly textoInvalido = signal<string | null>(null);
  private cambioInterno = false;
  private ultimaGeneracion = 0;
  private ultimoTextoFormateado = '';
  readonly errorMostrado = computed(() => this.errorFormato() ?? this.error());

  readonly textoMostrado = computed(() => {
    const invalido = this.textoInvalido();
    if (invalido !== null) {
      return invalido;
    }
    const v = this.valor();
    if (v === null || v === undefined || !Number.isSafeInteger(v)) {
      return '';
    }
    return formatearPesos(pesos(v));
  });

  constructor() {
    effect(() => {
      const v = this.valor();
      const gen = this.generacion();
      const cambioGeneracion = gen !== this.ultimaGeneracion;
      this.ultimaGeneracion = gen;
      if (this.cambioInterno && !cambioGeneracion) {
        this.cambioInterno = false;
        return;
      }
      this.cambioInterno = false;
      this.errorFormato.set(null);
      this.textoInvalido.set(null);
      this.ultimoTextoFormateado =
        v !== null && v !== undefined && Number.isSafeInteger(v) ? formatearPesos(pesos(v)) : '';
    });
  }

  onInput(event: CustomEvent | Event): void {
    const detail = (event as CustomEvent).detail;
    const raw =
      detail && typeof detail === 'object' && 'value' in detail
        ? detail.value
        : (event.target as HTMLInputElement | null)?.value;

    const texto = typeof raw === 'string' ? raw : raw == null ? '' : String(raw);
    const limpio = texto.replace(/[$ ]/g, '');

    if (limpio === '') {
      this.errorFormato.set(null);
      this.textoInvalido.set(null);
      this.ultimoTextoFormateado = '';
      this.actualizarValorInterno(null);
      this.sincronizarElemento(event.target as HTMLElement | null, '');
      return;
    }

    const soloPuntosPrevios =
      this.ultimoTextoFormateado !== '' &&
      texto.startsWith('$ ') &&
      /^\d+(?:\.\d+)*$/.test(limpio) &&
      contarPuntos(limpio) <= contarPuntos(this.ultimoTextoFormateado);

    if (!FORMATO_PESOS.test(limpio) && !soloPuntosPrevios) {
      this.errorFormato.set(MENSAJE_MONTO_SIN_DECIMALES);
      this.textoInvalido.set(texto);
      this.ultimoTextoFormateado = '';
      this.actualizarValorInterno(null);
      return;
    }

    const digitos = limpio.replace(/\./g, '');
    const num = Number(digitos);
    if (!Number.isSafeInteger(num)) {
      this.errorFormato.set(MENSAJE_MONTO_DEMASIADO_GRANDE);
      this.textoInvalido.set(texto);
      this.ultimoTextoFormateado = '';
      this.actualizarValorInterno(null);
      return;
    }

    const formateado = formatearPesos(pesos(num));
    this.errorFormato.set(null);
    this.textoInvalido.set(null);
    this.ultimoTextoFormateado = formateado;
    this.actualizarValorInterno(num);
    this.sincronizarElemento(event.target as HTMLElement | null, formateado);
  }

  private actualizarValorInterno(nuevoValor: number | null): void {
    if (!Object.is(this.valor(), nuevoValor)) {
      this.cambioInterno = true;
      this.valor.set(nuevoValor);
    }
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
