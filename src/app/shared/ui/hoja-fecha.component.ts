import { Component, computed, input, output, signal } from '@angular/core';
import { IonButton, IonButtons, IonContent, IonDatetime, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

import { fechaHora, type FechaHora } from '../domain';

/**
 * Shared date-time sheet content used by Vender, Compra, and Aporte modals (D5).
 * Blocks future dates via `maximo` (from `CLOCK`) and emits the selected `FechaHora`.
 */
@Component({
  selector: 'app-hoja-fecha',
  host: { class: 'ion-page' },
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="hoja-fecha-toolbar">
        <ion-title class="hoja-fecha-titulo">{{ titulo() }}</ion-title>
        <ion-buttons slot="end">
          <ion-button color="secondary" class="hoja-fecha-listo" (click)="cerrar.emit()" data-testid="btn-listo-fecha">
            Listo
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="hoja-fecha-contenido">
      <div class="hoja-fecha-cuerpo">
        <ion-datetime
          presentation="date-time"
          locale="es-CO"
          [value]="valorIso()"
          [max]="maximoIso()"
          (ionChange)="onDatetimeChange($event)"
          [attr.data-testid]="datetimeTestId()"
          class="hoja-fecha-datetime"
        >
          <span slot="time-label">Hora</span>
        </ion-datetime>

        @if (ayuda() || fechaInvalida()) {
          <p
            class="hoja-fecha-ayuda"
            [class.hoja-fecha-ayuda-error]="fechaInvalida()"
            [attr.role]="fechaInvalida() ? 'alert' : null"
            data-testid="hoja-fecha-ayuda"
          >
            {{ ayuda() || 'No puede ser una fecha futura.' }}
          </p>
        }
      </div>
    </ion-content>
  `,
  styles: `
    .hoja-fecha-toolbar {
      --background: var(--app-tarjeta);
      --border-width: 0;
      padding: 8px 12px 0;
    }

    .hoja-fecha-titulo {
      font-size: 18px;
      font-weight: 600;
      padding-inline: 8px;
    }

    .hoja-fecha-listo {
      font-size: 15px;
      font-weight: 600;
      text-transform: none;
    }

    .hoja-fecha-contenido {
      --background: var(--app-tarjeta);
    }

    .hoja-fecha-cuerpo {
      padding: 8px 20px 28px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .hoja-fecha-datetime {
      width: 100%;
      max-width: 100%;
      --background: var(--app-tarjeta);
      --background-rgb: 15, 16, 18;
      --wheel-highlight-background: var(--app-tarjeta-elevada);
      --wheel-fade-background-rgb: 15, 16, 18;
      border-radius: 16px;
    }

    .hoja-fecha-ayuda {
      margin: 0 4px;
      font-size: 12px;
      line-height: 16px;
      color: var(--app-texto-secundario);
    }

    .hoja-fecha-ayuda-error {
      color: var(--ion-color-danger, #ff6b6b);
      font-weight: 500;
    }
  `,
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonDatetime],
})
export class HojaFechaComponent {
  readonly titulo = input<string>('Fecha');
  readonly valor = input.required<FechaHora>();
  readonly maximo = input.required<FechaHora>();
  readonly ayuda = input<string>('No puede ser una fecha futura.');
  readonly datetimeTestId = input<string>('datetime-fecha');

  readonly fechaChange = output<FechaHora>();
  readonly cerrar = output<void>();

  readonly fechaInvalida = signal(false);

  readonly valorIso = computed(() => this.valor().replace(' ', 'T'));
  readonly maximoIso = computed(() => this.maximo().replace(' ', 'T'));

  onDatetimeChange(event: CustomEvent): void {
    const nueva = this.parsearFecha(event.detail?.value);
    if (nueva === null || nueva > this.maximo()) {
      this.rechazarFecha(event);
      return;
    }
    this.fechaInvalida.set(false);
    this.fechaChange.emit(nueva);
  }

  private parsearFecha(val: unknown): FechaHora | null {
    if (typeof val !== 'string') {
      return null;
    }
    const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?/.exec(val);
    if (!match) {
      return null;
    }
    const [, datePart, hmPart, secPart] = match;
    try {
      return fechaHora(`${datePart} ${hmPart}:${secPart ?? '00'}`);
    } catch {
      return null;
    }
  }

  private rechazarFecha(event: CustomEvent): void {
    this.fechaInvalida.set(true);
    const target = event.target as { value?: string } | null;
    if (target) {
      target.value = this.valorIso();
    }
  }
}
